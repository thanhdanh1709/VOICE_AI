"""
TTS Web Application - Flask Backend
Ung dung web chuyen van ban thanh giong noi su dung Flask
"""
import os
import sys
import traceback
import time

# Load .env.local for local development (not pushed to GitHub)
_env_file = os.path.join(os.path.dirname(__file__), '.env.local')
if os.path.exists(_env_file):
    with open(_env_file, encoding='utf-8') as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip())

# Set UTF-8 encoding for console output on Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
from pathlib import Path
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file, abort
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pymysql
import uuid
import secrets

# Thêm đường dẫn VieNeu-TTS-main vào sys.path để import Vieneu
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = Path(__file__).resolve().parent   # d:/.../LUANVAN/web/
VieNeu_TTS_DIR = BASE_DIR / 'VieNeu-TTS-main'
if str(VieNeu_TTS_DIR) not in sys.path:
    sys.path.insert(0, str(VieNeu_TTS_DIR))

def resolve_audio_path(path: str) -> str:
    """Convert relative sample_audio_path stored in DB to absolute path.
    Tries multiple base directories to handle files uploaded from different working directories.
    """
    if not path:
        return path
    p = Path(path)
    if p.is_absolute():
        return str(p)
    # Try 1: resolve from WEB_DIR (app.py directory) — the canonical location
    candidate1 = WEB_DIR / p
    if candidate1.exists():
        return str(candidate1)
    # Try 2: resolve from WEB_DIR's parent (LUANVAN/) — app may have been run from there
    candidate2 = WEB_DIR.parent / p
    if candidate2.exists():
        return str(candidate2)
    # Try 3: current working directory
    candidate3 = Path.cwd() / p
    if candidate3.exists():
        return str(candidate3)
    # Default: return WEB_DIR-based path (caller will check existence and report error)
    return str(candidate1)

from config import DB_CONFIG, UPLOAD_DIR, AUDIO_OUTPUT_DIR, BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME, BANK_BRANCH
from config import SEPAY_API_URL, SEPAY_TOKEN, SEPAY_ACCOUNT_NUMBER, SEPAY_BANK_ID, SEPAY_TIMEOUT, SEPAY_QR_API
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SECRET_KEY
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, APP_BASE_URL, DEBUG, SMTP_USE_SSL
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from audio_export import export_audio, ffmpeg_available, SUPPORTED_FORMATS, ALLOWED_BITRATES

# Deep link scheme cho Flutter mobile OAuth callback (phải khớp AndroidManifest & config.dart)
MOBILE_CALLBACK_SCHEME = 'petai'

ALLOWED_AVATAR_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_UPLOAD_DIR = UPLOAD_DIR / 'avatars'
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
from authlib.integrations.flask_client import OAuth
import qrcode
import io
import base64
import requests
import json
import hashlib
import hmac
from datetime import datetime, timedelta

# Import RVC wrapper for voice conversion
try:
    from rvc_wrapper import get_rvc_processor
    RVC_AVAILABLE = True
    print("[INFO] RVC voice conversion is available")
except ImportError as e:
    RVC_AVAILABLE = False
    print(f"[WARNING] RVC not available: {e}")

# Import viXTTS Emotional TTS
VIXTTS_EMOTIONAL_AVAILABLE = False
VIXTTS_INSTANCE = None  # Store the instance globally
try:
    from emotional_tts_vixtts import get_vixtts_emotional_instance
    VIXTTS_EMOTIONAL_AVAILABLE = True
    print("[INFO] viXTTS Emotional TTS is available")
except ImportError as e:
    VIXTTS_EMOTIONAL_AVAILABLE = False
    print(f"[WARNING] viXTTS Emotional TTS not available: {e}")

# Import custom voice training modules
try:
    from voice_training import get_training_service
    from audio_processor import get_audio_processor
    from background_worker import start_worker, get_worker_status
    CUSTOM_VOICE_AVAILABLE = True
    print("[INFO] Custom voice training is available")
except ImportError as e:
    CUSTOM_VOICE_AVAILABLE = False
    print(f"[WARNING] Custom voice training not available: {e}")

# Flask app configuration
app = Flask(__name__, 
            static_folder='static',
            static_url_path='/static',
            template_folder='templates')
app.secret_key = SECRET_KEY

# Hỗ trợ reverse proxy (ngrok, nginx...) - đọc X-Forwarded headers
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# ── Google OAuth ──────────────────────────────────────────
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# ── Mobile Auth Token Store ────────────────────────────────
# Token một lần (5 phút) dùng để kết nối CCT OAuth → WebView session.
# Tạo sau khi Google OAuth thành công trong CCT, tiêu thụ khi WebView gọi /auth/mobile/callback.
import threading as _threading

_mobile_tokens: dict = {}
_mobile_tokens_lock = _threading.Lock()

def _create_mobile_token(user_id: int) -> str:
    """Tạo token một lần (5 phút) cho mobile auth."""
    token = str(uuid.uuid4()).replace('-', '')
    expires = time.time() + 300
    with _mobile_tokens_lock:
        expired_keys = [k for k, v in _mobile_tokens.items() if v['expires'] < time.time()]
        for k in expired_keys:
            del _mobile_tokens[k]
        _mobile_tokens[token] = {'user_id': user_id, 'expires': expires}
    return token

def _consume_mobile_token(token: str):
    """Xác thực và tiêu thụ mobile token (dùng một lần). Trả về user_id hoặc None."""
    with _mobile_tokens_lock:
        data = _mobile_tokens.pop(token, None)
    if data and data['expires'] > time.time():
        return data['user_id']
    return None

PASSWORD_RESET_EXPIRY_HOURS = 1

_password_reset_waits: dict = {}
_password_reset_waits_lock = _threading.Lock()

def _create_password_reset_wait(token):
    """Phiên chờ laptop — điện thoại xác nhận qua email."""
    wait_id = secrets.token_urlsafe(16)
    expires = time.time() + PASSWORD_RESET_EXPIRY_HOURS * 3600
    with _password_reset_waits_lock:
        expired = [k for k, v in _password_reset_waits.items() if v['expires'] < time.time()]
        for k in expired:
            del _password_reset_waits[k]
        _password_reset_waits[wait_id] = {
            'token': token,
            'confirmed': False,
            'expires': expires,
        }
    return wait_id

def _confirm_password_reset_on_phone(token):
    with _password_reset_waits_lock:
        for data in _password_reset_waits.values():
            if data['token'] == token and data['expires'] > time.time():
                data['confirmed'] = True
                return True
    return False

def _get_password_reset_wait_status(wait_id):
    with _password_reset_waits_lock:
        data = _password_reset_waits.get(wait_id)
        if not data:
            return {'status': 'not_found'}
        if data['expires'] < time.time():
            del _password_reset_waits[wait_id]
            return {'status': 'expired'}
        if data['confirmed']:
            return {'status': 'confirmed', 'token': data['token']}
        return {'status': 'pending'}

def ensure_password_reset_table():
    """Tạo bảng password_reset_tokens nếu chưa có."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    token VARCHAR(64) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used TINYINT(1) NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_token (token),
                    KEY idx_user_id (user_id),
                    KEY idx_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"[ERROR] ensure_password_reset_table: {e}")
        return False
    finally:
        conn.close()

def _get_app_base_url():
    if APP_BASE_URL:
        return APP_BASE_URL.rstrip('/')
    try:
        return request.host_url.rstrip('/')
    except RuntimeError:
        return 'http://127.0.0.1:5000'

def _share_audio_url(token):
    """URL công khai để chia sẻ audio (ưu tiên APP_BASE_URL / ngrok)."""
    if not token:
        return None
    return f"{_get_app_base_url()}/audio/share/{token}"

def send_email(to_email, subject, html_body, text_body=None):
    """Gửi email qua SMTP. Trả về True nếu thành công."""
    if not to_email:
        return False

    if not SMTP_HOST or not SMTP_USER:
        print(f"[EMAIL] SMTP chưa cấu hình — gửi tới {to_email}: {subject}")
        if text_body:
            print(f"[EMAIL] {text_body}")
        elif html_body:
            print(f"[EMAIL] (html body omitted)")
        return DEBUG

    from_addr = SMTP_FROM or SMTP_USER
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_addr
        msg['To'] = to_email
        if text_body:
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        payload = msg.as_string()

        use_ssl = SMTP_USE_SSL or SMTP_PORT == 465
        if use_ssl:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                if SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], payload)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], payload)

        print(f"[EMAIL] Đã gửi tới {to_email}: {subject}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[ERROR] send_email auth failed: {e}")
        print("[EMAIL] Gmail/Outlook: dùng App Password, không dùng mật khẩu đăng nhập thường.")
        return False
    except Exception as e:
        print(f"[ERROR] send_email failed: {e}")
        return False

def _create_password_reset_token(user_id):
    ensure_password_reset_table()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)

    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE user_id = %s AND used = 0",
                (user_id,),
            )
            cursor.execute(
                "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, token, expires_at),
            )
            conn.commit()
        return token
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] _create_password_reset_token: {e}")
        return None
    finally:
        conn.close()

def _validate_password_reset_token(token):
    if not token:
        return None
    ensure_password_reset_table()
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT user_id FROM password_reset_tokens
                WHERE token = %s AND used = 0 AND expires_at > NOW()
            """, (token,))
            row = cursor.fetchone()
            return row['user_id'] if row else None
    except Exception as e:
        print(f"[ERROR] _validate_password_reset_token: {e}")
        return None
    finally:
        conn.close()

def _mark_password_reset_token_used(token):
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE token = %s",
                (token,),
            )
            conn.commit()
    except Exception as e:
        print(f"[ERROR] _mark_password_reset_token_used: {e}")
    finally:
        conn.close()

def _send_password_reset_email(user, token):
    confirm_url = f"{_get_app_base_url()}/reset-password/confirm/{token}"
    name = user.get('full_name') or user.get('username') or 'bạn'
    subject = 'VietVoice — Xác nhận đặt lại mật khẩu'
    text_body = (
        f"Xin chào {name},\n\n"
        f"Bạn vừa yêu cầu đặt lại mật khẩu VietVoice.\n"
        f"Mở email này trên ĐIỆN THOẠI và nhấn xác nhận (hiệu lực {PASSWORD_RESET_EXPIRY_HOURS} giờ):\n{confirm_url}\n\n"
        f"Sau khi xác nhận, quay lại MÁY TÍNH để nhập mật khẩu mới.\n\n"
        f"Nếu bạn không yêu cầu, hãy bỏ qua email này.\n\n— VietVoice"
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#7c3aed;margin:0 0 12px">VietVoice</h2>
      <p>Xin chào <strong>{name}</strong>,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu trên máy tính.</p>
      <p><strong>📱 Mở email này trên điện thoại</strong> và nhấn nút xác nhận bên dưới (hiệu lực {PASSWORD_RESET_EXPIRY_HOURS} giờ):</p>
      <p style="text-align:center;margin:28px 0">
        <a href="{confirm_url}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px">
          ✅ Xác nhận trên điện thoại
        </a>
      </p>
      <p style="font-size:12px;color:#94a3b8;text-align:center">Sau khi xác nhận, quay lại <strong>máy tính</strong> — trang web sẽ tự chuyển sang đặt mật khẩu mới.</p>
      <p style="font-size:13px;color:#64748b">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  """
    sent = send_email(user['email'], subject, html_body, text_body)
    if not sent and DEBUG:
        print(f"[DEV] Phone confirm link: {confirm_url}")
    return sent

def _mobile_cct_response(callback_url: str):
    """Trả về HTML tối giản để Chrome Custom Tab kích hoạt deep link và tự đóng.
    Page này user hầu như không thấy vì app sẽ tự kéo lên foreground.
    Thông báo đăng nhập thành công sẽ hiện trong Flutter app (SnackBar).
    """
    safe_url = callback_url.replace('"', '%22').replace("'", '%27')
    html = f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VietVoice</title>
</head>
<body style="margin:0;background:#0f172a">
  <script>
  (function() {{
    var u = "{safe_url}";
    try {{
      var a = document.createElement("a");
      a.href = u; document.body.appendChild(a); a.click();
    }} catch(e) {{ window.location.replace(u); }}
    setTimeout(function() {{ window.close(); }}, 500);
  }})();
  </script>
</body>
</html>'''
    from flask import make_response
    resp = make_response(html, 200)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp

# Request logging
@app.after_request
def add_ngrok_skip_warning(response):
    """Bỏ trang cảnh báo ngrok khi mở link từ Gmail/điện thoại."""
    response.headers['ngrok-skip-browser-warning'] = 'true'
    return response

@app.before_request
def sync_session_avatar():
    """Đồng bộ avatar_url vào session nếu thiếu (phiên đăng nhập cũ)."""
    if 'user_id' not in session or session.get('avatar_url'):
        return
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT avatar_url FROM users WHERE id = %s", (session['user_id'],))
            row = cursor.fetchone()
            session['avatar_url'] = (row.get('avatar_url') or '') if row else ''
    except Exception as e:
        print(f'[WARN] sync_session_avatar: {e}')
    finally:
        conn.close()

@app.before_request
def log_request_info():
    """Log request information"""
    try:
        if hasattr(request, 'path') and request.path and request.path.startswith('/api/'):
            print(f"[REQUEST] {request.method} {request.path}")
            if request.is_json:
                try:
                    print(f"[REQUEST] JSON data: {request.get_json()}")
                except:
                    pass
    except:
        pass  # Ignore errors in logging

# Global error handler for unhandled exceptions (chỉ catch những exception chưa được handle)
@app.errorhandler(500)
def handle_500_error(e):
    """Handle 500 errors"""
    error_trace = traceback.format_exc()
    print(f"[ERROR] Unhandled 500 error: {e}")
    print(f"[ERROR] Traceback: {error_trace}")
    
    # Return JSON response for API routes
    try:
        if hasattr(request, 'path') and request.path and request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'message': f'Lỗi server nội bộ: {str(e)}'
            }), 500
    except:
        pass
    
    # For other routes, let Flask handle it
    return "Internal Server Error", 500

# Global TTS instance (khởi tạo một lần, tái sử dụng)
_tts_instance = None

def get_tts_instance():
    """Lấy TTS instance (khởi tạo một lần)"""
    global _tts_instance
    if _tts_instance is None:
        try:
            from vieneu import Vieneu
            print("[TTS] Initializing TTS engine...")
            _tts_instance = Vieneu()
            print("[TTS] TTS engine initialized successfully")
        except ImportError as e:
            print(f"[ERROR] Error importing Vieneu: {e}")
            raise Exception(f"Không thể import Vieneu: {str(e)}")
        except Exception as e:
            print(f"[ERROR] Error initializing TTS: {e}")
            raise Exception(f"Lỗi khởi tạo TTS: {str(e)}")
    return _tts_instance

# Database connection helper
def get_db_connection():
    """Kết nối database MySQL"""
    try:
        connection = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset'],
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10
        )
        return connection
    except Exception as e:
        print(f"[ERROR] Database connection error: {e}")
        return None

# Check if user is logged in
def is_logged_in():
    """Kiểm tra người dùng đã đăng nhập chưa"""
    return 'user_id' in session

def is_admin():
    """Kiểm tra người dùng có phải admin không"""
    return session.get('user_role') == 'admin'

# Login required decorator
def login_required(f):
    """Decorator to require login for routes"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_user_characters_limit(user_id):
    """Lấy giới hạn ký tự của user"""
    conn = get_db_connection()
    if not conn:
        # Không kết nối được DB: trả về giới hạn mặc định để app vẫn chạy
        print("[WARNING] DB connection failed in get_user_characters_limit, using default limit")
        return {'limit': 100000, 'used': 0, 'remaining': 100000, 'end_date': None}
    
    try:
        with conn.cursor() as cursor:
            # Lấy subscription active hiện tại
            cursor.execute("""
                SELECT characters_limit, characters_used, end_date
                FROM user_subscriptions
                WHERE user_id = %s AND is_active = 1 AND end_date >= CURDATE()
                ORDER BY end_date DESC
                LIMIT 1
            """, (user_id,))
            subscription = cursor.fetchone()
            
            if subscription:
                return {
                    'limit': subscription['characters_limit'],
                    'used': subscription['characters_used'] or 0,
                    'remaining': subscription['characters_limit'] - (subscription['characters_used'] or 0),
                    'end_date': subscription['end_date']
                }
            else:
                # Nếu không có subscription, tạo free plan mặc định
                cursor.execute("""
                    INSERT INTO user_subscriptions (user_id, characters_limit, characters_used, start_date, end_date)
                    VALUES (%s, 100000, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
                """, (user_id,))
                conn.commit()
                return {
                    'limit': 100000,
                    'used': 0,
                    'remaining': 100000,
                    'end_date': None
                }
    except Exception as e:
        print(f"[ERROR] Error getting user characters limit: {e}")
        # Fallback: trả về giới hạn mặc định khi DB lỗi hoặc thiếu bảng (sau khi tạo lại DB)
        return {
            'limit': 100000,
            'used': 0,
            'remaining': 100000,
            'end_date': None
        }
    finally:
        conn.close()

def check_characters_limit(user_id, text_length):
    """Kiểm tra xem user có đủ ký tự để convert không"""
    limit_info = get_user_characters_limit(user_id)
    if not limit_info:
        # Khi không kết nối được DB: dùng giới hạn mặc định để không chặn convert
        print(f"[WARNING] Using default character limit for user {user_id} (DB unavailable)")
        limit_info = {'remaining': 100000}
    
    if limit_info['remaining'] < text_length:
        return False, f"Bạn đã hết giới hạn ký tự. Còn lại: {limit_info['remaining']:,} ký tự. Vui lòng mua thêm gói để tiếp tục sử dụng."
    
    return True, None

def update_characters_used(user_id, text_length):
    """Cập nhật số ký tự đã sử dụng"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE user_subscriptions
                SET characters_used = characters_used + %s,
                    updated_at = NOW()
                WHERE user_id = %s AND is_active = 1 AND end_date >= CURDATE()
                ORDER BY end_date DESC
                LIMIT 1
            """, (text_length, user_id))
            conn.commit()
            return True
    except Exception as e:
        print(f"[ERROR] Error updating characters used: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

# Routes
@app.route('/')
def index():
    """Trang chủ"""
    if not is_logged_in():
        return redirect(url_for('landing'))
    return render_template('index.html')

@app.route('/landing')
def landing():
    """Landing page - trang giới thiệu dành cho người chưa đăng nhập"""
    if is_logged_in():
        return redirect(url_for('index'))
    content = load_landing_content()
    return render_template('landing.html', lp=content)

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Đăng nhập"""
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        
        username = (data.get('username') or '').strip()
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Vui lòng nhập tên đăng nhập và mật khẩu'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT * FROM users WHERE is_active = 1 AND (
                        username = %s OR LOWER(TRIM(email)) = %s
                    )""",
                    (username, username.lower()),
                )
                user = cursor.fetchone()
                
                if user and check_password_hash(user['password'], password):
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['user_role'] = user['role']
                    session['full_name'] = user['full_name']
                    session['avatar_url'] = user.get('avatar_url') or ''
                    session.permanent = True
                    
                    return jsonify({
                        'success': True,
                        'message': 'Đăng nhập thành công',
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'role': user['role'],
                            'full_name': user['full_name']
                        }
                    })
                else:
                    return jsonify({'success': False, 'message': 'Tên đăng nhập hoặc mật khẩu không đúng'}), 401
        except Exception as e:
            print(f"[ERROR] Login error: {e}")
            return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
        finally:
            conn.close()
    
    return render_template('login.html', auth_page=True)

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Quên mật khẩu — gửi link đặt lại qua email."""
    if request.method == 'POST':
        data = request.get_json() or {}
        identifier = (data.get('email') or '').strip().lower()
        generic_msg = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả thư mục spam).'

        if not identifier:
            return jsonify({'success': False, 'message': 'Vui lòng nhập email'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT id, email, username, full_name FROM users
                       WHERE is_active = 1 AND (
                           LOWER(TRIM(email)) = %s
                           OR (username = %s AND %s NOT LIKE '%%@%%')
                       )""",
                    (identifier, identifier, identifier),
                )
                user = cursor.fetchone()

            if user and not user.get('email'):
                if DEBUG:
                    print(f"[FORGOT] User '{user.get('username')}' has no email on file — cannot send")
                user = None

            wait_id = None
            if user:
                token = _create_password_reset_token(user['id'])
                if token:
                    wait_id = _create_password_reset_wait(token)
                    sent = _send_password_reset_email(user, token)
                    if DEBUG:
                        print(f"[FORGOT] Reset email → {user['email']} (wait_id={wait_id}, sent={sent})")
                elif DEBUG:
                    print(f"[FORGOT] Failed to create token for user_id={user['id']}")
            elif DEBUG:
                print(f"[FORGOT] No account for '{identifier}' — no email sent (by design)")

            payload = {'success': True, 'message': generic_msg}
            if wait_id:
                payload['wait_id'] = wait_id
                payload['message'] = (
                    'Đã gửi email. Mở email trên điện thoại và nhấn Xác nhận. '
                    'Trang máy tính này sẽ tự chuyển sang đặt mật khẩu mới.'
                )
            return jsonify(payload)
        except Exception as e:
            print(f"[ERROR] forgot_password: {e}")
            return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
        finally:
            conn.close()

    return render_template('forgot_password.html', auth_page=True)

@app.route('/api/forgot-password/status/<wait_id>')
def forgot_password_status(wait_id):
    """Laptop poll — chờ điện thoại xác nhận qua email."""
    status = _get_password_reset_wait_status(wait_id)
    if status['status'] == 'not_found':
        return jsonify({'success': False, 'status': 'not_found'}), 404
    if status['status'] == 'expired':
        return jsonify({'success': False, 'status': 'expired', 'message': 'Phiên đặt lại mật khẩu đã hết hạn'})
    if status['status'] == 'confirmed':
        return jsonify({
            'success': True,
            'status': 'confirmed',
            'redirect': url_for('reset_password', token=status['token']),
        })
    return jsonify({'success': True, 'status': 'pending'})

@app.route('/reset-password/confirm/<token>')
def reset_password_confirm(token):
    """Điện thoại: chỉ xác nhận, không nhập mật khẩu tại đây."""
    user_id = _validate_password_reset_token(token)
    if not user_id:
        return render_template('reset_confirm.html', invalid=True, auth_page=True)
    _confirm_password_reset_on_phone(token)
    return render_template('reset_confirm.html', invalid=False, auth_page=True)

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Đặt lại mật khẩu bằng token từ email."""
    user_id = _validate_password_reset_token(token)

    if request.method == 'POST':
        if not user_id:
            return jsonify({'success': False, 'message': 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'}), 400

        data = request.get_json() or {}
        new_pw = data.get('new_password', '')
        confirm_pw = data.get('confirm_password', '')

        if not new_pw:
            return jsonify({'success': False, 'message': 'Vui lòng nhập mật khẩu mới'}), 400
        if new_pw != confirm_pw:
            return jsonify({'success': False, 'message': 'Mật khẩu xác nhận không khớp'}), 400
        if len(new_pw) < 6:
            return jsonify({'success': False, 'message': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            new_hash = generate_password_hash(new_pw)
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE users SET password = %s WHERE id = %s AND is_active = 1",
                    (new_hash, user_id),
                )
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
                conn.commit()
            _mark_password_reset_token_used(token)
            return jsonify({'success': True, 'message': 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.'})
        except Exception as e:
            conn.rollback()
            print(f"[ERROR] reset_password: {e}")
            return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
        finally:
            conn.close()

    return render_template('reset_password.html', token=token, invalid=not user_id, auth_page=True)

@app.route('/reset-password', methods=['GET'])
def reset_password_link():
    """Hỗ trợ link dạng ?token=... (một số app email mở kiểu này)."""
    token = (request.args.get('token') or '').strip()
    if token:
        return redirect(url_for('reset_password', token=token))
    return redirect(url_for('forgot_password'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Đăng ký"""
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', '')
        if email:
            email = email.strip().lower()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        try:
            with conn.cursor() as cursor:
                # Check if username exists
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'Tên đăng nhập đã tồn tại'}), 400
                
                # Check if email exists
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'Email đã tồn tại'}), 400
                
                # Create new user
                hashed_password = generate_password_hash(password)
                cursor.execute(
                    "INSERT INTO users (username, email, password, full_name) VALUES (%s, %s, %s, %s)",
                    (username, email, hashed_password, full_name)
                )
                user_id = cursor.lastrowid
                
                # Tạo free subscription cho user mới (100,000 ký tự/tháng)
                cursor.execute("""
                    INSERT INTO user_subscriptions (user_id, characters_limit, characters_used, start_date, end_date)
                    VALUES (%s, 100000, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
                """, (user_id,))
                
                conn.commit()
                
                return jsonify({'success': True, 'message': 'Đăng ký thành công. Bạn có 100,000 ký tự miễn phí/tháng'})
        except Exception as e:
            conn.rollback()
            print(f"[ERROR] Register error: {e}")
            return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
        finally:
            conn.close()
    
    return render_template('register.html', auth_page=True)

@app.route('/logout')
def logout():
    """Đăng xuất"""
    session.clear()
    return redirect(url_for('login'))

# ══════════════════════════════════════════════════════════
# GOOGLE OAUTH
# ══════════════════════════════════════════════════════════

@app.route('/auth/google')
def google_login():
    """Bắt đầu luồng đăng nhập Google (Web)"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect(url_for('login') + '?error=google_not_configured')
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)


@app.route('/auth/google/login/flutter')
def google_login_flutter():
    """Bắt đầu luồng đăng nhập Google cho Flutter mobile qua Chrome Custom Tab.
    
    Flutter mở URL này bằng FlutterWebAuth2 (Chrome Custom Tab, không phải WebView).
    Sau khi Google OAuth xong, backend redirect về petai://callback?mobile_token=...
    Flutter nhận callback rồi load /auth/mobile/callback?mobile_token=... trong WebView.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=google_not_configured')
    session['google_login_source'] = 'flutter'
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)


@app.route('/auth/google/callback')
def google_callback():
    """Callback sau khi Google xác thực (dùng chung cho Web và Flutter mobile)"""
    source = session.pop('google_login_source', 'web')

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        if source == 'flutter':
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=google_not_configured')
        return redirect(url_for('login') + '?error=google_not_configured')

    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo') or google.userinfo()
    except Exception as e:
        print(f"[GOOGLE AUTH] Error: {e}")
        if source == 'flutter':
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=google_auth_failed')
        return redirect(url_for('login') + '?error=google_auth_failed')

    google_id  = user_info.get('sub')
    email      = user_info.get('email', '')
    full_name  = user_info.get('name', '')
    avatar_url = user_info.get('picture', '')

    if not google_id or not email:
        if source == 'flutter':
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=google_no_email')
        return redirect(url_for('login') + '?error=google_no_email')

    conn = get_db_connection()
    if not conn:
        if source == 'flutter':
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=db_error')
        return redirect(url_for('login') + '?error=db_error')

    try:
        with conn.cursor() as cursor:
            # 1. Tìm user theo google_id
            cursor.execute("SELECT * FROM users WHERE google_id = %s", (google_id,))
            user = cursor.fetchone()

            # 2. Tìm theo email nếu chưa có google_id
            if not user:
                cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
                user = cursor.fetchone()
                if user:
                    cursor.execute(
                        "UPDATE users SET google_id = %s, avatar_url = %s WHERE id = %s",
                        (google_id, avatar_url, user['id'])
                    )
                    conn.commit()

            # 3. Tạo tài khoản mới nếu chưa có
            if not user:
                base_username = email.split('@')[0].lower()
                base_username = ''.join(c for c in base_username if c.isalnum() or c == '_')[:30]
                username = base_username

                counter = 1
                while True:
                    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                    if not cursor.fetchone():
                        break
                    username = f"{base_username}{counter}"
                    counter += 1

                cursor.execute(
                    """INSERT INTO users (username, email, password, full_name, google_id, avatar_url, is_active)
                       VALUES (%s, %s, %s, %s, %s, %s, 1)""",
                    (username, email, '', full_name, google_id, avatar_url)
                )
                user_id = cursor.lastrowid

                cursor.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, characters_limit, characters_used, start_date, end_date)
                    VALUES (%s, 100000, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
                """, (user_id,))
                conn.commit()

                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cursor.fetchone()

        if source == 'flutter':
            # Mobile: tạo one-time token, trả về HTML để CCT tự đóng
            mobile_token = _create_mobile_token(user['id'])
            print(f"[GOOGLE AUTH] Mobile login OK: {user['username']} ({email})")
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?mobile_token={mobile_token}')
        else:
            # Web: tạo Flask session bình thường
            session['user_id']   = user['id']
            session['username']  = user['username']
            session['user_role'] = user.get('role', 'user')
            session['full_name'] = user.get('full_name', '')
            session['avatar_url'] = user.get('avatar_url') or ''
            session.permanent    = True
            print(f"[GOOGLE AUTH] Web login OK: {user['username']} ({email})")
            return redirect(url_for('index'))

    except Exception as e:
        conn.rollback()
        print(f"[GOOGLE AUTH] DB error: {e}")
        print(traceback.format_exc())
        if source == 'flutter':
            return _mobile_cct_response(f'{MOBILE_CALLBACK_SCHEME}://callback?error=db_error')
        return redirect(url_for('login') + '?error=db_error')
    finally:
        conn.close()


@app.route('/auth/mobile/callback')
def mobile_auth_callback():
    """Flutter WebView: Đổi mobile_token → Flask session để WebView đăng nhập.
    
    Flutter load URL này trong WebView sau khi nhận được mobile_token từ deep link.
    Backend xác thực token, tạo session cho WebView, redirect về trang chủ.
    """
    mobile_token = request.args.get('mobile_token', '').strip()
    if not mobile_token:
        return redirect(url_for('login') + '?error=invalid_token')

    user_id = _consume_mobile_token(mobile_token)
    if not user_id:
        print(f"[MOBILE AUTH] Token không hợp lệ hoặc đã hết hạn")
        return redirect(url_for('login') + '?error=token_expired')

    conn = get_db_connection()
    if not conn:
        return redirect(url_for('login') + '?error=db_error')

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s AND is_active = 1", (user_id,))
            user = cursor.fetchone()

        if not user:
            return redirect(url_for('login') + '?error=user_not_found')

        session['user_id']   = user['id']
        session['username']  = user['username']
        session['user_role'] = user.get('role', 'user')
        session['full_name'] = user.get('full_name', '')
        session['avatar_url'] = user.get('avatar_url') or ''
        session.permanent    = True

        print(f"[MOBILE AUTH] WebView session tạo thành công: {user['username']}")
        return redirect(url_for('index'))
    finally:
        conn.close()

@app.route('/api/voices')
def get_voices():
    """Lấy danh sách giọng nói"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM voices WHERE is_active = 1 ORDER BY voice_id")
            voices = cursor.fetchall()
            
            # Add sample file path
            for voice in voices:
                sample_filename = f"{voice['voice_id']}_sample.wav"
                sample_path = BASE_DIR / 'web' / 'static' / 'voice-samples' / sample_filename
                voice['has_sample'] = sample_path.exists()
                voice['sample_url'] = f"/static/voice-samples/{sample_filename}" if voice['has_sample'] else None
            
            return jsonify({'success': True, 'voices': voices})
    except Exception as e:
        print(f"[ERROR] Get voices error: {e}")
        return jsonify({'success': False, 'message': f'Loi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/generate-voice-samples', methods=['POST'])
def generate_voice_samples():
    """Tao file mau cho tat ca giong doc (Admin only)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    sample_text = "Xin chào, tôi là giọng đọc bản Việt. Đây là giọng mẫu để bạn thử nghe. Cảm ơn bạn đã sử dụng hệ thống của chúng tôi."
    
    # Create samples directory if not exists
    samples_dir = BASE_DIR / 'web' / 'static' / 'voice-samples'
    samples_dir.mkdir(parents=True, exist_ok=True)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT voice_id, voice_name FROM voices WHERE is_active = 1")
            voices = cursor.fetchall()
        
        # Get TTS instance
        tts = get_tts_instance()
        
        generated = []
        failed = []
        
        for voice in voices:
            try:
                voice_id = voice['voice_id']
                output_filename = f"{voice_id}_sample.wav"
                output_path = samples_dir / output_filename
                
                print(f"[SAMPLE] Generating sample for voice: {voice_id}")
                
                # Get voice data
                voice_data = tts.get_preset_voice(voice_id)
                
                # Generate audio
                audio = tts.infer(text=sample_text, voice=voice_data if voice_data else None)
                
                # Save audio
                tts.save(audio, str(output_path))
                
                generated.append(voice_id)
                print(f"[SAMPLE] Generated: {output_path}")
                
            except Exception as e:
                failed.append({'voice_id': voice_id, 'error': str(e)})
                print(f"[ERROR] Failed to generate sample for {voice_id}: {e}")
        
        return jsonify({
            'success': True,
            'message': f'Da tao {len(generated)} file mau thanh cong',
            'generated': generated,
            'failed': failed,
            'total': len(voices)
        })
        
    except Exception as e:
        print(f"[ERROR] Generate voice samples error: {e}")
        return jsonify({'success': False, 'message': f'Loi: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/convert', methods=['POST'])
def convert_text_to_speech():
    """Chuyển văn bản thành giọng nói"""
    conn = None
    conversion_id = None
    
    try:
        # Kiểm tra đăng nhập
        if not is_logged_in():
            return jsonify({'success': False, 'message': 'Vui lòng đăng nhập'}), 401
        
        # Lấy dữ liệu từ request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        
        text = data.get('text', '').strip()
        voice_id = data.get('voice_id', 'Binh')
        
        # V2: Check if custom voice
        is_custom_voice = voice_id.startswith('custom_')
        custom_voice_data = None
        base_voice_id = voice_id
        pitch_adjustment = 0
        speed_adjustment = 1.0
        
        if is_custom_voice:
            # Extract custom voice ID
            try:
                custom_voice_id = int(voice_id.replace('custom_', ''))
                
                # Fetch custom voice details (include voice_type, sample_audio_path, ref_transcript for zero_shot)
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    try:
                        cursor.execute("""
                            SELECT base_voice_id, pitch_adjustment, speed_adjustment, 
                                   energy_adjustment, voice_name, voice_type, sample_audio_path, ref_transcript
                            FROM custom_voices 
                            WHERE id = %s AND user_id = %s AND status = 'completed'
                        """, (custom_voice_id, session['user_id']))
                    except Exception:
                        cursor.execute("""
                            SELECT base_voice_id, pitch_adjustment, speed_adjustment, 
                                   energy_adjustment, voice_name, sample_audio_path
                            FROM custom_voices 
                            WHERE id = %s AND user_id = %s AND status = 'completed'
                        """, (custom_voice_id, session['user_id']))
                    custom_voice_data = cursor.fetchone()
                    if custom_voice_data and 'voice_type' not in custom_voice_data:
                        custom_voice_data['voice_type'] = 'rvc'
                        custom_voice_data['ref_transcript'] = None
                    conn.close()
                    
                    if custom_voice_data:
                        voice_type_cv = (custom_voice_data.get('voice_type') or 'rvc').strip().lower()
                        if voice_type_cv == 'zero_shot':
                            # Zero-shot: use ref_audio + ref_transcript at infer time
                            print(f"[CONVERT Zero-shot] Using custom voice: {custom_voice_data['voice_name']}")
                        else:
                            # RVC/V2: base voice + pitch/speed
                            base_voice_id = custom_voice_data.get('base_voice_id') or base_voice_id
                            pitch_adjustment = custom_voice_data.get('pitch_adjustment', 0)
                            speed_adjustment = custom_voice_data.get('speed_adjustment', 1.0)
                            print(f"[CONVERT V2] Using custom voice: {custom_voice_data['voice_name']}")
                            print(f"[CONVERT V2] Base voice from DB: {base_voice_id}, Pitch: {pitch_adjustment}, Speed: {speed_adjustment}")
                            
                            # Remove 'HM' suffix if present (TTS doesn't use it)
                            tts_voice_id = base_voice_id
                            if tts_voice_id and str(tts_voice_id).endswith('HM'):
                                tts_voice_id = tts_voice_id[:-2]
                            if tts_voice_id:
                                tts_voice_id = str(tts_voice_id).capitalize()
                            print(f"[CONVERT V2] TTS voice ID: {tts_voice_id}")
                            voice_id = tts_voice_id
                    else:
                        print(f"[WARNING] Custom voice {custom_voice_id} not found, using default")
                        voice_id = 'BinhHM'
            except Exception as e:
                print(f"[ERROR] Error loading custom voice: {e}")
                voice_id = 'BinhHM'
        
        if not text:
            return jsonify({'success': False, 'message': 'Vui lòng nhập văn bản'}), 400
        
        # Kiểm tra giới hạn ký tự
        text_length = len(text)
        can_convert, error_message = check_characters_limit(session['user_id'], text_length)
        if not can_convert:
            return jsonify({'success': False, 'message': error_message}), 403
        
        print(f"[CONVERT] Converting text: {text[:50]}... (length: {text_length})")
        print(f"[CONVERT] Voice ID: {voice_id}")
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.wav"
        output_path = AUDIO_OUTPUT_DIR / filename
        
        # Save conversion to database (bắt buộc để lịch sử thư viện cập nhật)
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Không thể kết nối database. Vui lòng thử lại.'}), 500
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO conversions (user_id, text_input, text_length, voice_id, status)
                       VALUES (%s, %s, %s, %s, 'processing')""",
                    (session['user_id'], text, len(text), voice_id)
                )
                conn.commit()
                conversion_id = cursor.lastrowid
                print(f"[CONVERT] Saved conversion record: ID={conversion_id}")
        except Exception as e:
            print(f"[ERROR] Error saving conversion: {e}")
            conn.close()
            return jsonify({'success': False, 'message': 'Không thể lưu bản ghi chuyển đổi. Kiểm tra database.'}), 500
        conn.close()
        conn = None  # Dùng kết nối mới khi UPDATE sau (tránh timeout sau TTS)
        
        # Lấy TTS instance và chuyển đổi
        print(f"[CONVERT] Getting TTS instance...")
        try:
            tts = get_tts_instance()
            print(f"[CONVERT] TTS instance obtained successfully")
        except Exception as tts_error:
            error_trace = traceback.format_exc()
            print(f"[ERROR] Failed to get TTS instance: {tts_error}")
            print(f"[ERROR] Traceback: {error_trace}")
            raise Exception(f"Không thể khởi tạo TTS engine: {str(tts_error)}")
        
        try:
            _cv_type = (custom_voice_data.get('voice_type') or 'rvc').strip().lower() if (is_custom_voice and custom_voice_data) else 'rvc'
            voice_data = tts.get_preset_voice(voice_id) if voice_id and _cv_type not in ('zero_shot', 'vixtts_clone') else None
            print(f"[CONVERT] Voice data obtained: {voice_id}")
        except Exception as voice_error:
            print(f"[WARNING] Could not get preset voice {voice_id}, using None: {voice_error}")
            voice_data = None
        
        print(f"[CONVERT] Converting text to speech (length: {len(text)} chars)...")
        duration_seconds = 0
        sample_rate = 24000

        # viXTTS Clone: synthesize directly with user's voice reference
        use_vixtts_clone = is_custom_voice and custom_voice_data and (custom_voice_data.get('voice_type') or 'rvc').strip().lower() == 'vixtts_clone'

        if use_vixtts_clone:
            try:
                if not VIXTTS_EMOTIONAL_AVAILABLE or VIXTTS_INSTANCE is None or VIXTTS_INSTANCE.model is None:
                    raise Exception("viXTTS model chưa được tải. Vui lòng thử lại sau vài phút.")
                ref_audio_path = resolve_audio_path(custom_voice_data.get('sample_audio_path'))
                if not ref_audio_path or not os.path.exists(ref_audio_path):
                    raise Exception(f"Không tìm thấy file audio mẫu của giọng viXTTS Clone: {ref_audio_path}")
                print(f"[CONVERT viXTTS-Clone] Using voice ref: {ref_audio_path}")
                output_path.parent.mkdir(parents=True, exist_ok=True)
                VIXTTS_INSTANCE.synthesize_with_voice(text, ref_audio_path, str(output_path))
                import librosa as _librosa
                _y, _sr = _librosa.load(str(output_path), sr=None)
                duration_seconds = len(_y) / _sr
                print(f"[CONVERT viXTTS-Clone] Audio generated, duration: {duration_seconds:.2f}s")
            except Exception as vixtts_err:
                error_trace = traceback.format_exc()
                print(f"[ERROR] viXTTS Clone failed: {vixtts_err}")
                print(f"[ERROR] Traceback: {error_trace}")
                raise Exception(f"Lỗi tạo âm thanh viXTTS Clone: {str(vixtts_err)}")
        else:
            try:
                # Zero-shot: use ref_audio + ref_text; otherwise preset voice or ref from voice_data
                use_zero_shot = is_custom_voice and custom_voice_data and (custom_voice_data.get('voice_type') or 'rvc').strip().lower() == 'zero_shot'
                if use_zero_shot:
                    ref_audio_path = resolve_audio_path(custom_voice_data.get('sample_audio_path'))
                    ref_text_zs = custom_voice_data.get('ref_transcript') or ''
                    if ref_audio_path and os.path.exists(ref_audio_path) and ref_text_zs:
                        print(f"[CONVERT Zero-shot] ref_audio={ref_audio_path}, ref_text length={len(ref_text_zs)}")
                        audio = tts.infer(text=text, ref_audio=ref_audio_path, ref_text=ref_text_zs)
                    else:
                        print(f"[WARNING] Zero-shot missing ref_audio/ref_text, using default voice")
                        audio = tts.infer(text=text, voice=voice_data if voice_data else None)
                else:
                    audio = tts.infer(text=text, voice=voice_data if voice_data else None)
                
                # Calculate duration from audio shape
                sample_rate = getattr(tts, 'sample_rate', sample_rate)
                
                if hasattr(audio, 'shape'):
                    audio_shape = audio.shape
                    audio_dtype = audio.dtype
                    if len(audio_shape) > 0:
                        duration_seconds = audio_shape[0] / sample_rate
                        print(f"[CONVERT] Audio generated: shape={audio_shape}, dtype={audio_dtype}, duration={duration_seconds:.2f}s")
                    else:
                        print(f"[CONVERT] Audio generated: shape={audio_shape}, dtype={audio_dtype}")
                else:
                    audio_length = len(audio) if hasattr(audio, '__len__') else 'unknown'
                    print(f"[CONVERT] Text inference completed: audio length={audio_length}")
                
            except Exception as infer_error:
                error_trace = traceback.format_exc()
                print(f"[ERROR] Failed to infer audio: {infer_error}")
                print(f"[ERROR] Traceback: {error_trace}")
                raise Exception(f"Lỗi tạo âm thanh: {str(infer_error)}")
            
            print(f"[CONVERT] Saving audio to: {output_path}")
            try:
                # Ensure output directory exists
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                tts.save(audio, str(output_path))
                print(f"[CONVERT] Audio saved successfully")
                
                # V2: Apply speed adjustment if custom voice (before pitch)
                if is_custom_voice and speed_adjustment != 1.0:
                    try:
                        import librosa
                        import soundfile as sf
                        print(f"[CONVERT V2] Applying speed adjustment: {speed_adjustment}x")
                        
                        # Load audio
                        audio_data, sr = librosa.load(str(output_path), sr=None)
                        
                        # Change speed
                        audio_adjusted = librosa.effects.time_stretch(audio_data, rate=speed_adjustment)
                        
                        # Save adjusted audio
                        sf.write(str(output_path), audio_adjusted, sr)
                        print(f"[CONVERT V2] Speed adjustment applied successfully")
                    except Exception as speed_error:
                        print(f"[WARNING] Could not apply speed adjustment: {speed_error}")
                
                # V2: Apply pitch adjustment if custom voice
                if is_custom_voice and pitch_adjustment != 0:
                    try:
                        print(f"[CONVERT V2] Applying pitch adjustment: {pitch_adjustment}")
                        rvc_processor = get_rvc_processor()
                        if rvc_processor.is_available():
                            adjusted_filename = f"{uuid.uuid4()}_adjusted.wav"
                            adjusted_path = AUDIO_OUTPUT_DIR / adjusted_filename
                            
                            success, msg, result_path = rvc_processor.adjust_voice(
                                str(output_path), 
                                str(adjusted_path), 
                                pitch=pitch_adjustment
                            )
                            
                            if success and result_path:
                                # Delete original, use adjusted
                                os.remove(output_path)
                                output_path = Path(adjusted_path)
                                filename = adjusted_filename
                                print(f"[CONVERT V2] Pitch adjustment applied successfully")
                            else:
                                print(f"[WARNING] Pitch adjustment failed: {msg}")
                        else:
                            print(f"[WARNING] RVC not available for pitch adjustment")
                    except Exception as pitch_error:
                        print(f"[WARNING] Could not apply pitch adjustment: {pitch_error}")
                        # Continue with original audio
                    
            except Exception as save_error:
                error_trace = traceback.format_exc()
                print(f"[ERROR] Failed to save audio: {save_error}")
                print(f"[ERROR] Traceback: {error_trace}")
                raise Exception(f"Lỗi lưu file âm thanh: {str(save_error)}")
        
        # Kiểm tra file đã được tạo chưa
        if not output_path.exists():
            raise Exception("File âm thanh không được tạo thành công")
        
        file_size = os.path.getsize(output_path)
        
        # Nếu chưa có duration từ audio shape, tính từ file size
        if duration_seconds == 0:
            # Estimate duration from file size (WAV format: 44 bytes header + 2 bytes per sample at 24kHz)
            # For mono 16-bit PCM: duration ≈ (file_size - 44) / (sample_rate * 2)
            estimated_duration = max(0, (file_size - 44) / (sample_rate * 2)) if file_size > 44 else 0
            if estimated_duration > 0:
                duration_seconds = estimated_duration
        
        print(f"[CONVERT] Audio file created: {filename}")
        print(f"[CONVERT] File size: {file_size} bytes ({file_size / (1024*1024):.2f} MB), duration: {duration_seconds:.2f}s ({duration_seconds/3600:.2f} hours)")
        
        # Get voice name
        voice_name = voice_id
        if conn:
            try:
                with conn.cursor() as cursor:
                    if is_custom_voice and custom_voice_data:
                        # Use custom voice name
                        voice_name = custom_voice_data['voice_name']
                    else:
                        cursor.execute("SELECT voice_name FROM voices WHERE voice_id = %s", (voice_id,))
                        result = cursor.fetchone()
                        if result:
                            voice_name = result['voice_name']
            except Exception as e:
                print(f"[ERROR] Error getting voice name: {e}")
        
        # Update conversion in database (dùng kết nối mới để tránh timeout sau TTS)
        if conversion_id:
            conn_update = get_db_connection()
            if conn_update:
                try:
                    with conn_update.cursor() as cursor:
                        cursor.execute(
                            """UPDATE conversions SET 
                               audio_file_path = %s, audio_file_size = %s, voice_name = %s,
                               duration_seconds = %s, status = 'completed', completed_at = NOW()
                               WHERE id = %s""",
                            (str(output_path), file_size, voice_name, duration_seconds, conversion_id)
                        )
                        conn_update.commit()
                        print(f"[CONVERT] Updated conversion record: ID={conversion_id}, duration={duration_seconds:.2f}s, size={file_size} bytes")
                        
                        # Cập nhật số ký tự đã sử dụng
                        update_characters_used(session['user_id'], text_length)
                        
                        # V2: Log custom voice usage
                        if is_custom_voice and custom_voice_data:
                            try:
                                original_voice_id = data.get('voice_id', '')
                                custom_voice_id = int(original_voice_id.replace('custom_', ''))
                                cursor.execute("""
                                    INSERT INTO voice_usage_logs 
                                    (custom_voice_id, user_id, text_input, text_length, audio_duration)
                                    VALUES (%s, %s, %s, %s, %s)
                                """, (custom_voice_id, session['user_id'], text[:500], text_length, duration_seconds))
                                cursor.execute("""
                                    UPDATE custom_voices 
                                    SET usage_count = usage_count + 1 
                                    WHERE id = %s
                                """, (custom_voice_id,))
                                conn_update.commit()
                                print(f"[CONVERT V2] Logged custom voice usage: ID={custom_voice_id}")
                            except Exception as log_error:
                                print(f"[WARNING] Could not log custom voice usage: {log_error}")
                except Exception as e:
                    print(f"[ERROR] Error updating conversion: {e}")
                finally:
                    conn_update.close()
            else:
                print(f"[WARNING] Could not get DB connection to update conversion {conversion_id}")
        
        return jsonify({
            'success': True,
            'message': 'Chuyển đổi thành công',
            'audio_url': f'/api/audio/{filename}',
            'audio_filename': filename,  # Add filename for voice conversion
            'conversion_id': conversion_id
        }), 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] TTS conversion error: {e}")
        print(f"[ERROR] Traceback: {error_trace}")
        
        # Update status to failed (dùng kết nối mới)
        if conversion_id:
            conn_fail = get_db_connection()
            if conn_fail:
                try:
                    with conn_fail.cursor() as cursor:
                        cursor.execute("UPDATE conversions SET status = 'failed' WHERE id = %s", (conversion_id,))
                        conn_fail.commit()
                except Exception as db_error:
                    print(f"[ERROR] Error updating failed status: {db_error}")
                finally:
                    conn_fail.close()
        
        error_message = str(e)
        return jsonify({
            'success': False, 
            'message': f'Lỗi chuyển đổi: {error_message}'
        }), 500
        
    finally:
        if conn:
            conn.close()

@app.route('/api/audio/<filename>')
def get_audio(filename):
    """Lấy file âm thanh với hỗ trợ streaming"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    file_path = AUDIO_OUTPUT_DIR / secure_filename(filename)
    if not file_path.exists() or not file_path.is_file():
        return jsonify({'success': False, 'message': 'File not found'}), 404
    
    # send_file tự động hỗ trợ range requests cho streaming
    response = send_file(
        file_path,
        mimetype='audio/wav',
        as_attachment=False,
        download_name=filename
    )
    
    # Thêm headers để tối ưu streaming
    response.headers['Accept-Ranges'] = 'bytes'
    response.headers['Cache-Control'] = 'public, max-age=3600'
    
    return response

@app.route('/api/audio/<filename>/export')
def export_audio_file(filename):
    """Xuất audio sang MP3/OGG với bitrate tùy chọn (WAV trả file gốc)."""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    fmt = request.args.get('format', 'mp3').lower()
    try:
        bitrate = int(request.args.get('bitrate', 192))
    except (TypeError, ValueError):
        bitrate = 192

    safe_name = secure_filename(filename)
    file_path = AUDIO_OUTPUT_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        return jsonify({'success': False, 'message': 'File not found'}), 404

    if fmt == 'wav':
        return send_file(file_path, mimetype='audio/wav', as_attachment=True, download_name=safe_name)

    if fmt not in SUPPORTED_FORMATS:
        return jsonify({'success': False, 'message': f'Định dạng không hỗ trợ: {fmt}'}), 400

    if not ffmpeg_available():
        return jsonify({
            'success': False,
            'message': 'ffmpeg chưa được cài đặt trên server. Chỉ hỗ trợ tải WAV.'
        }), 503

    tmp_path = None
    try:
        out_path, download_name, mimetype = export_audio(file_path, fmt, bitrate)
        tmp_path = out_path if out_path != file_path else None
        return send_file(out_path, mimetype=mimetype, as_attachment=True, download_name=download_name)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except RuntimeError as e:
        return jsonify({'success': False, 'message': f'Lỗi chuyển đổi: {e}'}), 500
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass

@app.route('/api/audio/formats')
def audio_formats_info():
    """Thông tin định dạng xuất được hỗ trợ."""
    return jsonify({
        'success': True,
        'formats': ['wav', 'mp3', 'ogg'],
        'bitrates': sorted(ALLOWED_BITRATES),
        'ffmpeg': ffmpeg_available(),
    })

@app.route('/api/emotional-tts/status', methods=['GET'])
def check_emotional_tts_status():
    """
    Check if Emotional TTS is ready to use
    """
    try:
        if not VIXTTS_EMOTIONAL_AVAILABLE:
            return jsonify({
                'success': True,
                'ready': False,
                'message': 'Emotional TTS không được cài đặt (import failed)'
            }), 200
        
        # Check instance và model
        if VIXTTS_INSTANCE is None:
            return jsonify({
                'success': True,
                'ready': False,
                'message': 'Model chưa được khởi tạo'
            }), 200
        
        # Check if model is loaded
        is_ready = VIXTTS_INSTANCE.model is not None
        
        return jsonify({
            'success': True,
            'ready': is_ready,
            'message': 'Sẵn sàng' if is_ready else 'Model đang load...'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'ready': False,
            'message': str(e)
        }), 500

@app.route('/api/convert-emotional', methods=['POST'])
def convert_text_to_speech_emotional():
    """
    Chuyển văn bản thành giọng nói VỚI EMOTION CONTROL
    Sử dụng viXTTS với tự động phát hiện emotion từ text tags
    """
    conn = None
    conversion_id = None
    
    try:
        # Kiểm tra viXTTS có available không
        if not VIXTTS_EMOTIONAL_AVAILABLE or VIXTTS_INSTANCE is None:
            return jsonify({
                'success': False,
                'message': 'Tính năng Emotional TTS chưa được cài đặt. Vui lòng liên hệ admin.'
            }), 503

        # Check model đã load chưa
        if VIXTTS_INSTANCE.model is None:
            return jsonify({
                'success': False,
                'message': 'Emotional TTS đang khởi động. Vui lòng đợi 30 giây và thử lại.'
            }), 503
        
        emotional_tts = VIXTTS_INSTANCE
        
        # Kiểm tra đăng nhập
        if not is_logged_in():
            return jsonify({'success': False, 'message': 'Vui lòng đăng nhập'}), 401
        
        # Lấy dữ liệu từ request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        
        text = data.get('text', '').strip()
        custom_voice_id_emotional = data.get('custom_voice_id')  # optional vixtts_clone voice
        voice_id = 'viXTTS-Emotional'  # Fixed voice ID for emotional TTS
        
        if not text:
            return jsonify({'success': False, 'message': 'Vui lòng nhập văn bản'}), 400
        
        # Look up custom voice reference audio if provided
        ref_audio_for_emotional = None
        if custom_voice_id_emotional:
            try:
                conn_cv = get_db_connection()
                if conn_cv:
                    with conn_cv.cursor() as cur_cv:
                        cur_cv.execute("""
                            SELECT sample_audio_path, voice_type, voice_name
                            FROM custom_voices
                            WHERE id = %s AND user_id = %s AND status = 'completed'
                        """, (int(custom_voice_id_emotional), session['user_id']))
                        cv_row = cur_cv.fetchone()
                    conn_cv.close()
                    if cv_row and (cv_row.get('voice_type') or '').strip().lower() == 'vixtts_clone':
                        ref_path = resolve_audio_path(cv_row.get('sample_audio_path'))
                        print(f"[CONVERT EMOTIONAL] Resolved ref_path: {ref_path}")
                        if ref_path and os.path.exists(ref_path):
                            ref_audio_for_emotional = ref_path
                            voice_id = f"viXTTS-Emotional ({cv_row['voice_name']})"
                            print(f"[CONVERT EMOTIONAL] Using custom voice: {cv_row['voice_name']}, ref={ref_path}")
                        else:
                            print(f"[ERROR] Custom voice ref audio not found at: {ref_path}")
                            return jsonify({
                                'success': False,
                                'message': f'Không tìm thấy file audio mẫu của giọng "{cv_row["voice_name"]}". '
                                           f'Vui lòng xóa giọng này và tải lại file mẫu.'
                            }), 400
                    elif cv_row:
                        print(f"[WARNING] Custom voice {custom_voice_id_emotional} has wrong type: {cv_row.get('voice_type')}")
                        return jsonify({
                            'success': False,
                            'message': 'Giọng này không phải viXTTS Clone. Chỉ giọng viXTTS Clone mới được dùng ở đây.'
                        }), 400
                    else:
                        print(f"[WARNING] Custom voice {custom_voice_id_emotional} not found in DB")
                        return jsonify({
                            'success': False,
                            'message': 'Không tìm thấy giọng clone. Vui lòng thử lại.'
                        }), 404
            except Exception as cv_err:
                print(f"[ERROR] Could not load custom voice for emotional: {cv_err}")
                return jsonify({
                    'success': False,
                    'message': f'Lỗi tải thông tin giọng clone: {str(cv_err)}'
                }), 500
        
        # Kiểm tra giới hạn ký tự
        text_length = len(text)
        can_convert, error_message = check_characters_limit(session['user_id'], text_length)
        if not can_convert:
            return jsonify({'success': False, 'message': error_message}), 403
        
        print(f"[CONVERT EMOTIONAL] Text length: {text_length} chars")
        print(f"[CONVERT EMOTIONAL] Text preview: {text[:100]}...")
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}_emotional.wav"
        output_path = AUDIO_OUTPUT_DIR / filename
        
        # Save conversion to database
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Không thể kết nối database'}), 500
        
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO conversions (user_id, text_input, text_length, voice_id, status)
                       VALUES (%s, %s, %s, %s, 'processing')""",
                    (session['user_id'], text, len(text), voice_id)
                )
                conn.commit()
                conversion_id = cursor.lastrowid
                print(f"[CONVERT EMOTIONAL] Conversion ID: {conversion_id}")
        except Exception as e:
            print(f"[ERROR] Error saving conversion: {e}")
            conn.close()
            return jsonify({'success': False, 'message': 'Không thể lưu bản ghi chuyển đổi'}), 500
        
        conn.close()
        conn = None
        
        # Use the pre-loaded VIXTTS_INSTANCE (already checked at start of function)
        print(f"[CONVERT EMOTIONAL] Using pre-loaded viXTTS instance")
        
        # Generate audio with emotion control
        print(f"[CONVERT EMOTIONAL] Generating audio with emotion control...")
        try:
            if ref_audio_for_emotional:
                print(f"[CONVERT EMOTIONAL] Using custom voice ref for emotional synthesis")
                emotional_tts.synthesize_emotional_with_voice(text, ref_audio_for_emotional, str(output_path))
            else:
                emotional_tts.synthesize(text, str(output_path))
            
            if not output_path.exists():
                raise Exception("File audio không được tạo thành công")
            
            file_size = os.path.getsize(output_path)
            print(f"[CONVERT EMOTIONAL] Audio created: {file_size} bytes")
            
            # Calculate duration
            import librosa
            y, sr = librosa.load(str(output_path), sr=None)
            duration_seconds = len(y) / sr
            print(f"[CONVERT EMOTIONAL] Duration: {duration_seconds:.2f}s")
            
        except Exception as gen_error:
            error_trace = traceback.format_exc()
            print(f"[ERROR] Failed to generate audio: {gen_error}")
            print(f"[ERROR] Traceback: {error_trace}")
            raise Exception(f"Lỗi tạo âm thanh: {str(gen_error)}")
        
        # Update conversion record
        if conversion_id:
            conn_update = get_db_connection()
            if conn_update:
                try:
                    with conn_update.cursor() as cursor:
                        cursor.execute(
                            """UPDATE conversions SET 
                               audio_file_path = %s, audio_file_size = %s, voice_name = %s,
                               duration_seconds = %s, status = 'completed', completed_at = NOW()
                               WHERE id = %s""",
                            (str(output_path), file_size, 'Emotional Voice (viXTTS)', duration_seconds, conversion_id)
                        )
                        conn_update.commit()
                        
                        # Update characters used
                        update_characters_used(session['user_id'], text_length)
                        
                except Exception as e:
                    print(f"[ERROR] Error updating conversion: {e}")
                finally:
                    conn_update.close()
        
        # Return success response
        return jsonify({
            'success': True,
            'message': 'Chuyển đổi thành công với emotion control!',
            'audio_url': f'/api/audio/{filename}',
            'audio_filename': filename,
            'conversion_id': conversion_id,
            'file_size': file_size,
            'duration': round(duration_seconds, 2)
        }), 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] Emotional conversion error: {e}")
        print(f"[ERROR] Traceback: {error_trace}")
        
        # Mark conversion as failed
        if conversion_id:
            try:
                conn_err = get_db_connection()
                if conn_err:
                    with conn_err.cursor() as cursor:
                        cursor.execute(
                            "UPDATE conversions SET status = 'failed', completed_at = NOW() WHERE id = %s",
                            (conversion_id,)
                        )
                        conn_err.commit()
                    conn_err.close()
            except:
                pass
        
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500
    
    finally:
        if conn:
            conn.close()

@app.route('/api/upload/extract', methods=['POST'])
def extract_text_from_file():
    """Extract text from uploaded file (.txt, .pdf, .docx)"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Vui lòng đăng nhập'}), 401
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Không có file được tải lên'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Không có file được chọn'}), 400
    
    # Check file extension
    filename = secure_filename(file.filename)
    file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if file_ext not in ['txt', 'pdf', 'docx']:
        return jsonify({'success': False, 'message': f'Định dạng file .{file_ext} không được hỗ trợ. Chỉ hỗ trợ .txt, .pdf, .docx'}), 400
    
    try:
        # Save file temporarily
        temp_filename = f"{uuid.uuid4()}.{file_ext}"
        temp_path = UPLOAD_DIR / temp_filename
        file.save(temp_path)
        
        text_content = None
        
        # Extract text based on file type
        if file_ext == 'txt':
            with open(temp_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
        
        elif file_ext == 'docx':
            try:
                from docx import Document
                doc = Document(temp_path)
                paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
                text_content = '\n'.join(paragraphs)
            except ImportError:
                # Clean up temp file
                if temp_path.exists():
                    temp_path.unlink()
                return jsonify({
                    'success': False, 
                    'message': 'Thư viện python-docx chưa được cài đặt. Chạy: pip install python-docx'
                }), 500
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink()
                print(f"[ERROR] Error reading DOCX file: {e}")
                return jsonify({'success': False, 'message': f'Lỗi đọc file Word: {str(e)}'}), 500
        
        elif file_ext == 'pdf':
            try:
                import PyPDF2
                with open(temp_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    paragraphs = []
                    for page in pdf_reader.pages:
                        text = page.extract_text()
                        if text.strip():
                            paragraphs.append(text)
                    text_content = '\n'.join(paragraphs)
            except ImportError:
                if temp_path.exists():
                    temp_path.unlink()
                return jsonify({
                    'success': False, 
                    'message': 'Thư viện PyPDF2 chưa được cài đặt. Chạy: pip install PyPDF2'
                }), 500
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink()
                print(f"[ERROR] Error reading PDF file: {e}")
                return jsonify({'success': False, 'message': f'Lỗi đọc file PDF: {str(e)}'}), 500
        
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()
        
        if not text_content or not text_content.strip():
            return jsonify({'success': False, 'message': 'Không tìm thấy văn bản trong file'}), 400
        
        return jsonify({
            'success': True,
            'text': text_content,
            'message': f'Đã đọc {len(text_content)} ký tự từ file {filename}'
        })
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] Error extracting text from file: {e}")
        print(f"[ERROR] Traceback: {error_trace}")
        
        # Clean up temp file if exists
        temp_path = UPLOAD_DIR / temp_filename if 'temp_filename' in locals() else None
        if temp_path and temp_path.exists():
            temp_path.unlink()
        
        return jsonify({'success': False, 'message': f'Lỗi xử lý file: {str(e)}'}), 500

@app.route('/api/history')
def get_history():
    """Lấy lịch sử chuyển đổi"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', '')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            query = "SELECT * FROM conversions WHERE user_id = %s"
            params = [session['user_id']]
            
            if search:
                query += " AND text_input LIKE %s"
                params.append(f'%{search}%')
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([per_page, (page - 1) * per_page])
            
            cursor.execute(query, params)
            conversions = cursor.fetchall()
            
            # Get total count
            count_query = "SELECT COUNT(*) as total FROM conversions WHERE user_id = %s"
            count_params = [session['user_id']]
            if search:
                count_query += " AND text_input LIKE %s"
                count_params.append(f'%{search}%')
            
            cursor.execute(count_query, count_params)
            total = cursor.fetchone()['total']
            
            return jsonify({
                'success': True,
                'conversions': conversions,
                'total': total,
                'page': page,
                'per_page': per_page
            })
    except Exception as e:
        print(f"[ERROR] Get history error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/statistics')
def get_statistics():
    """Lấy thống kê tổng quan mở rộng"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # If admin, show system-wide statistics
            if is_admin():
                # Total users
                cursor.execute("SELECT COUNT(*) as total FROM users")
                total_users = cursor.fetchone()['total']
                
                # Total conversions
                cursor.execute("SELECT COUNT(*) as total FROM conversions")
                total_conversions = cursor.fetchone()['total']
                
                # Total voices
                cursor.execute("SELECT COUNT(*) as total FROM voices")
                total_voices = cursor.fetchone()['total']
                
                # Total characters processed
                cursor.execute("SELECT SUM(text_length) as total FROM conversions WHERE text_length IS NOT NULL")
                result = cursor.fetchone()
                total_characters = result['total'] or 0
                
                # Total audio file size (MB)
                cursor.execute("SELECT SUM(audio_file_size) as total FROM conversions WHERE audio_file_size IS NOT NULL")
                result = cursor.fetchone()
                total_audio_size_bytes = result['total'] or 0
                total_audio_size_mb = round(total_audio_size_bytes / (1024 * 1024), 2)
                
                # Total duration (seconds -> hours)
                cursor.execute("SELECT SUM(duration_seconds) as total FROM conversions WHERE duration_seconds IS NOT NULL")
                result = cursor.fetchone()
                total_duration_seconds = result['total'] or 0
                total_duration_hours = round(total_duration_seconds / 3600, 2)
                
                # Average text length
                cursor.execute("SELECT AVG(text_length) as avg FROM conversions WHERE text_length IS NOT NULL")
                result = cursor.fetchone()
                avg_text_length = round(result['avg'] or 0, 0)
                
                # Success rate
                cursor.execute("SELECT COUNT(*) as total FROM conversions WHERE status = 'completed'")
                completed = cursor.fetchone()['total']
                success_rate = round((completed / total_conversions * 100) if total_conversions > 0 else 0, 1)
                
                # Active users (users with at least 1 conversion)
                cursor.execute("SELECT COUNT(DISTINCT user_id) as total FROM conversions")
                active_users = cursor.fetchone()['total']
                
                return jsonify({
                    'success': True,
                    'statistics': {
                        'total_users': total_users,
                        'active_users': active_users,
                        'total_conversions': total_conversions,
                        'total_voices': total_voices,
                        'total_characters': total_characters,
                        'total_audio_size_mb': total_audio_size_mb,
                        'total_duration_hours': total_duration_hours,
                        'avg_text_length': int(avg_text_length),
                        'success_rate': success_rate
                    }
                })
            else:
                # Regular user statistics
                cursor.execute("SELECT COUNT(*) as total FROM conversions WHERE user_id = %s", (session['user_id'],))
                total_conversions = cursor.fetchone()['total']
                
                cursor.execute("SELECT SUM(text_length) as total FROM conversions WHERE user_id = %s AND text_length IS NOT NULL", (session['user_id'],))
                result = cursor.fetchone()
                total_characters = result['total'] or 0
                
                cursor.execute("SELECT SUM(audio_file_size) as total FROM conversions WHERE user_id = %s AND audio_file_size IS NOT NULL", (session['user_id'],))
                result = cursor.fetchone()
                total_audio_size_bytes = result['total'] or 0
                total_audio_size_mb = round(total_audio_size_bytes / (1024 * 1024), 2)
                
                cursor.execute("SELECT SUM(duration_seconds) as total FROM conversions WHERE user_id = %s AND duration_seconds IS NOT NULL", (session['user_id'],))
                result = cursor.fetchone()
                total_duration_seconds = result['total'] or 0
                total_duration_hours = round(total_duration_seconds / 3600, 2)
                
                return jsonify({
                    'success': True,
                    'statistics': {
                        'total_conversions': total_conversions,
                        'total_characters': total_characters,
                        'total_audio_size_mb': total_audio_size_mb,
                        'total_duration_hours': total_duration_hours
                    }
                })
    except Exception as e:
        print(f"[ERROR] Get statistics error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/statistics/time-based')
def get_time_based_statistics():
    """Lấy thống kê theo thời gian (hôm nay/tuần/tháng)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        from datetime import datetime, timedelta
        
        with conn.cursor() as cursor:
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=now.weekday())
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Today statistics
            cursor.execute("""
                SELECT COUNT(*) as conversions,
                       SUM(text_length) as characters,
                       SUM(audio_file_size) as audio_size,
                       SUM(duration_seconds) as duration
                FROM conversions
                WHERE created_at >= %s AND created_at < %s
            """, (today_start, today_start + timedelta(days=1)))
            today = cursor.fetchone()
            
            # This week statistics
            cursor.execute("""
                SELECT COUNT(*) as conversions,
                       SUM(text_length) as characters,
                       SUM(audio_file_size) as audio_size,
                       SUM(duration_seconds) as duration
                FROM conversions
                WHERE created_at >= %s
            """, (week_start,))
            week = cursor.fetchone()
            
            # This month statistics
            cursor.execute("""
                SELECT COUNT(*) as conversions,
                       SUM(text_length) as characters,
                       SUM(audio_file_size) as audio_size,
                       SUM(duration_seconds) as duration
                FROM conversions
                WHERE created_at >= %s
            """, (month_start,))
            month = cursor.fetchone()
            
            # Last 7 days for chart
            chart_data = []
            for i in range(6, -1, -1):
                day_start = today_start - timedelta(days=i)
                day_end = day_start + timedelta(days=1)
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM conversions
                    WHERE created_at >= %s AND created_at < %s
                """, (day_start, day_end))
                result = cursor.fetchone()
                chart_data.append({
                    'date': day_start.strftime('%Y-%m-%d'),
                    'label': day_start.strftime('%d/%m'),
                    'conversions': result['count'] or 0
                })
            
            return jsonify({
                'success': True,
                'today': {
                    'conversions': today['conversions'] or 0,
                    'characters': today['characters'] or 0,
                    'audio_size_mb': round((today['audio_size'] or 0) / (1024 * 1024), 2),
                    'duration_hours': round((today['duration'] or 0) / 3600, 2)
                },
                'week': {
                    'conversions': week['conversions'] or 0,
                    'characters': week['characters'] or 0,
                    'audio_size_mb': round((week['audio_size'] or 0) / (1024 * 1024), 2),
                    'duration_hours': round((week['duration'] or 0) / 3600, 2)
                },
                'month': {
                    'conversions': month['conversions'] or 0,
                    'characters': month['characters'] or 0,
                    'audio_size_mb': round((month['audio_size'] or 0) / (1024 * 1024), 2),
                    'duration_hours': round((month['duration'] or 0) / 3600, 2)
                },
                'chart_data': chart_data
            })
    except Exception as e:
        print(f"[ERROR] Get time-based statistics error: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/statistics/top-rankings')
def get_top_rankings():
    """Lấy top rankings (users, voices)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Top 5 users by conversions
            cursor.execute("""
                SELECT u.id, u.username, u.full_name, u.email,
                       COUNT(c.id) as conversion_count,
                       SUM(c.text_length) as total_characters,
                       SUM(c.duration_seconds) as total_duration
                FROM users u
                LEFT JOIN conversions c ON u.id = c.user_id
                GROUP BY u.id, u.username, u.full_name, u.email
                ORDER BY conversion_count DESC
                LIMIT 5
            """)
            top_users = cursor.fetchall()
            
            # Top 5 voices by usage - chỉ lấy các giọng đã được sử dụng
            cursor.execute("""
                SELECT voice_id, voice_name,
                       COUNT(*) as usage_count,
                       SUM(text_length) as total_characters,
                       SUM(duration_seconds) as total_duration
                FROM conversions
                WHERE voice_id IS NOT NULL 
                  AND voice_name IS NOT NULL 
                  AND voice_name != 'null'
                  AND voice_name != ''
                GROUP BY voice_id, voice_name
                HAVING COUNT(*) > 0
                ORDER BY usage_count DESC
                LIMIT 5
            """)
            top_voices = cursor.fetchall()
            
            # Voice distribution (for pie chart) - chỉ các giọng đã được sử dụng
            cursor.execute("""
                SELECT voice_name, COUNT(*) as count
                FROM conversions
                WHERE voice_name IS NOT NULL 
                  AND voice_name != 'null'
                  AND voice_name != ''
                GROUP BY voice_name
                HAVING COUNT(*) > 0
                ORDER BY count DESC
            """)
            voice_distribution = cursor.fetchall()
            
            return jsonify({
                'success': True,
                'top_users': [
                    {
                        'id': u['id'],
                        'username': u['username'],
                        'full_name': u['full_name'] or '',
                        'email': u['email'],
                        'conversion_count': u['conversion_count'] or 0,
                        'total_characters': u['total_characters'] or 0,
                        'total_duration_hours': round((u['total_duration'] or 0) / 3600, 2)
                    }
                    for u in top_users
                ],
                'top_voices': [
                    {
                        'voice_id': v['voice_id'],
                        'voice_name': v['voice_name'],
                        'usage_count': v['usage_count'] or 0,
                        'total_characters': v['total_characters'] or 0,
                        'total_duration_hours': round((v['total_duration'] or 0) / 3600, 2)
                    }
                    for v in top_voices
                ],
                'voice_distribution': [
                    {
                        'voice_name': v['voice_name'],
                        'count': v['count']
                    }
                    for v in voice_distribution
                ]
            })
    except Exception as e:
        print(f"[ERROR] Get top rankings error: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """Lấy danh sách tất cả người dùng (chỉ admin)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, username, email, full_name, role, is_active, 
                       created_at, updated_at,
                       (SELECT COUNT(*) FROM conversions WHERE user_id = users.id) as total_conversions
                FROM users
                ORDER BY id ASC
            """)
            users = cursor.fetchall()
            
            # Convert to list of dicts
            users_list = []
            for user in users:
                users_list.append({
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'] or '',
                    'role': user['role'],
                    'is_active': bool(user['is_active']),
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                    'updated_at': user['updated_at'].isoformat() if user['updated_at'] else None,
                    'total_conversions': user['total_conversions'] or 0
                })
            
            return jsonify({
                'success': True,
                'users': users_list
            })
    except Exception as e:
        print(f"[ERROR] Get all users error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    """Cập nhật vai trò của người dùng (chỉ admin)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    new_role = data.get('role')
    
    if new_role not in ['admin', 'user']:
        return jsonify({'success': False, 'message': 'Vai trò không hợp lệ'}), 400
    
    # Không cho phép tự thay đổi role của chính mình
    if user_id == session['user_id']:
        return jsonify({'success': False, 'message': 'Không thể thay đổi vai trò của chính mình'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
            
            # Update role
            cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Đã cập nhật vai trò thành {new_role}'
            })
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Update user role error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users/<int:user_id>/status', methods=['PUT'])
def update_user_status(user_id):
    """Cập nhật trạng thái (khóa/mở khóa) của người dùng (chỉ admin)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    is_active = data.get('is_active')
    
    if is_active not in [True, False]:
        return jsonify({'success': False, 'message': 'Trạng thái không hợp lệ'}), 400
    
    # Không cho phép tự khóa tài khoản của chính mình
    if user_id == session['user_id']:
        return jsonify({'success': False, 'message': 'Không thể khóa tài khoản của chính mình'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
            
            # Update status
            cursor.execute("UPDATE users SET is_active = %s WHERE id = %s", (is_active, user_id))
            conn.commit()
            
            status_text = 'kích hoạt' if is_active else 'khóa'
            return jsonify({
                'success': True,
                'message': f'Đã {status_text} tài khoản'
            })
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Update user status error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Xóa người dùng (chỉ admin)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    # Không cho phép tự xóa tài khoản của chính mình
    if user_id == session['user_id']:
        return jsonify({'success': False, 'message': 'Không thể xóa tài khoản của chính mình'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id, username FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
            
            # Delete user (cascade will delete conversions)
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Đã xóa người dùng {user["username"]}'
            })
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Delete user error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/history')
def history():
    """Trang lịch sử"""
    if not is_logged_in():
        return redirect(url_for('login'))
    return render_template('history.html')

@app.route('/admin')
def admin():
    """Trang quản trị"""
    if not is_logged_in() or not is_admin():
        return redirect(url_for('index'))
    return render_template('admin.html')


# ── LANDING PAGE CONTENT ──────────────────────────────────────────
LANDING_CONTENT_FILE = os.path.join(os.path.dirname(__file__), 'landing_content.json')

def load_landing_content():
    """Đọc nội dung landing page từ JSON"""
    try:
        with open(LANDING_CONTENT_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_landing_content(data):
    """Lưu nội dung landing page vào JSON"""
    with open(LANDING_CONTENT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/admin/landing', methods=['GET'])
def admin_landing():
    """Trang chỉnh sửa nội dung landing page"""
    if not is_logged_in() or not is_admin():
        return redirect(url_for('index'))
    content = load_landing_content()
    return render_template('admin_landing.html', content=content)

@app.route('/admin/landing/save', methods=['POST'])
def admin_landing_save():
    """Lưu nội dung landing page"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        save_landing_content(data)
        return jsonify({'success': True, 'message': 'Đã lưu nội dung landing page thành công!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# SePay.vn Integration Functions
def create_sepay_payment(amount, transaction_id, description, user_name):
    """Tạo thanh toán qua SePay.vn"""
    try:
        # Tạo nội dung chuyển khoản cho SePay
        content = f"{transaction_id}"
        
        # Tạo QR code bằng VietQR (SePay tương thích với VietQR)
        qr_data = create_sepay_qr_code(amount, content, description)
        
        return {
            'success': True,
            'qr_code': qr_data['qr_image'],
            'bank_info': {
                'bank_name': SEPAY_BANK_ID,
                'account_number': SEPAY_ACCOUNT_NUMBER,
                'account_name': 'TTS SYSTEM',
                'amount': amount,
                'content': content,
                'transaction_id': transaction_id
            },
            'sepay_info': {
                'account_number': SEPAY_ACCOUNT_NUMBER,
                'bank_id': SEPAY_BANK_ID,
                'api_url': SEPAY_API_URL
            }
        }
    except Exception as e:
        print(f"[ERROR] SePay payment creation failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def create_sepay_qr_code(amount, content, description):
    """Tạo QR code cho SePay bằng VietQR API"""
    try:
        # Sử dụng VietQR API để tạo QR code cho MBBank (SePay)
        # MBBank BIN code
        mbbank_bin = "970422"
        
        # API VietQR URL
        vietqr_url = f"{SEPAY_QR_API}/{mbbank_bin}-{SEPAY_ACCOUNT_NUMBER}-compact2.jpg?amount={amount}&addInfo={content}&accountName=TTS%20SYSTEM"
        
        print(f"[INFO] Creating SePay QR with URL: {vietqr_url}")
        
        # Download QR image
        response = requests.get(vietqr_url, timeout=10)
        if response.status_code == 200:
            # Convert to base64
            img_base64 = base64.b64encode(response.content).decode()
            return {
                'qr_image': f"data:image/jpeg;base64,{img_base64}",
                'api_url': vietqr_url
            }
        else:
            raise Exception(f"VietQR API returned status {response.status_code}")
            
    except Exception as e:
        print(f"[WARNING] SePay QR generation failed, using fallback: {e}")
        # Fallback to manual QR generation
        return create_manual_qr_code(amount, content)

def create_manual_qr_code(amount, content):
    """Tạo QR code thủ công cho SePay khi API thất bại"""
    try:
        # Tạo QR code đơn giản với thông tin chuyển khoản
        qr_content = f"Account: {SEPAY_ACCOUNT_NUMBER}\\nBank: {SEPAY_BANK_ID}\\nAmount: {amount:,} VND\\nContent: {content}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_content)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            'qr_image': f"data:image/png;base64,{img_str}",
            'fallback': True
        }
    except Exception as e:
        print(f"[ERROR] Manual QR generation failed: {e}")
        return {
            'qr_image': None,
            'error': str(e)
        }

def verify_sepay_transaction(transaction_id, amount):
    """Xác minh giao dịch qua SePay API - dùng endpoint /transactions/list"""
    try:
        headers = {
            'Authorization': f'Bearer {SEPAY_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        print(f"[INFO] Verifying SePay transaction: {transaction_id}, amount: {amount}")
        
        # SePay correct endpoint: /transactions/list with transaction_content filter
        response = requests.get(
            f"{SEPAY_API_URL}/list",
            params={
                'account_number': SEPAY_ACCOUNT_NUMBER,
                'transaction_content': transaction_id,
                'limit': 5
            },
            headers=headers,
            timeout=8
        )
        
        print(f"[INFO] SePay API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[INFO] SePay API response: {data}")
            
            transactions = data.get('transactions', [])
            
            # Tìm giao dịch khớp: nội dung chứa transaction_id VÀ số tiền đúng
            txn_id_upper = transaction_id.upper()
            txn_id_normalized = ''.join(c for c in txn_id_upper if c.isalnum())
            # Phần hex thuần (bỏ TTS_ prefix)
            hex_part = txn_id_upper.replace('TTS_', '').replace('TTS', '').strip('_- ')

            for txn in transactions:
                content = str(txn.get('transaction_content', '') or '').upper()
                content_normalized = ''.join(c for c in content if c.isalnum())
                txn_amount = int(txn.get('amount_in', 0) or 0)

                content_match = (
                    txn_id_upper in content or
                    txn_id_normalized in content_normalized or
                    (len(hex_part) >= 8 and hex_part in content_normalized)
                )

                if content_match and txn_amount >= int(amount) * 0.99:
                    print(f"[INFO] SePay transaction MATCHED: {txn}")
                    return {
                        'success': True,
                        'verified': True,
                        'transaction_data': txn,
                        'source': 'sepay_api'
                    }
            
            print(f"[INFO] No matching SePay transaction found for {transaction_id}")
            return {'success': True, 'verified': False, 'source': 'sepay_api'}
        else:
            print(f"[WARNING] SePay API returned status {response.status_code}: {response.text}")
            return {'success': True, 'verified': False, 'error': f'SePay API status {response.status_code}'}
            
    except Exception as e:
        print(f"[ERROR] SePay verification failed: {e}")
        return {'success': False, 'verified': False, 'error': str(e)}

def auto_approve_by_time(transaction_id, amount):
    """Auto-approve payment sau một khoảng thời gian (fallback method)"""
    try:
        # Kiểm tra thời gian tạo payment
        conn = get_db_connection()
        if not conn:
            return {'success': False, 'error': 'Database connection failed'}
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT created_at, TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_ago
                FROM payments 
                WHERE transaction_id = %s AND amount_vnd = %s
            """, (transaction_id, amount))
            payment_time = cursor.fetchone()
            
            if payment_time:
                minutes_ago = payment_time['minutes_ago']
                
                # Auto-approve nếu đã quá 5 phút (có thể điều chỉnh)
                AUTO_APPROVE_MINUTES = 5
                
                if minutes_ago >= AUTO_APPROVE_MINUTES:
                    print(f"[INFO] Auto-approving payment after {minutes_ago} minutes")
                    return {
                        'success': True,
                        'verified': True,
                        'auto_approved': True,
                        'reason': f'Auto-approved after {minutes_ago} minutes'
                    }
                else:
                    return {
                        'success': True,
                        'verified': False,
                        'pending_minutes': AUTO_APPROVE_MINUTES - minutes_ago
                    }
            else:
                return {'success': False, 'error': 'Payment not found'}
                
    except Exception as e:
        print(f"[ERROR] Auto-approve by time failed: {e}")
        return {'success': False, 'error': str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/pricing')
def pricing():
    """Trang thanh toán"""
    if not is_logged_in():
        return redirect(url_for('login'))
    return render_template('pricing.html')

@app.route('/payment/confirm')
def payment_confirm():
    """Trang xác nhận thanh toán"""
    if not is_logged_in():
        return redirect(url_for('login'))

    payment_id = request.args.get('id', type=int)
    if not payment_id:
        return redirect(url_for('pricing'))

    conn = get_db_connection()
    if not conn:
        return redirect(url_for('pricing'))

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id AS payment_id, p.transaction_id, p.amount_vnd,
                       p.payment_status, p.created_at,
                       pk.package_name, pk.characters_limit, pk.duration_days
                FROM payments p
                JOIN subscription_packages pk ON p.package_id = pk.id
                WHERE p.id = %s AND p.user_id = %s
            """, (payment_id, session.get('user_id')))
            row = cursor.fetchone()

        if not row:
            return redirect(url_for('pricing'))

        # Generate (or regenerate) QR code for this payment
        from config import SEPAY_BANK_ID, SEPAY_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME
        qr_result = create_sepay_qr_code(
            row['amount_vnd'],
            row['transaction_id'],
            f"Thanh toan {row['package_name']}"
        )

        payment = {
            'payment_id':       row['payment_id'],
            'transaction_id':   row['transaction_id'],
            'amount_vnd':       row['amount_vnd'],
            'payment_status':   row['payment_status'],
            'package_name':     row['package_name'],
            'characters_limit': row['characters_limit'],
            'duration_days':    row['duration_days'],
            'qr_code':          qr_result.get('qr_image', ''),
            'bank_name':        SEPAY_BANK_ID,
            'account_number':   SEPAY_ACCOUNT_NUMBER,
            'account_name':     BANK_ACCOUNT_NAME,
        }
        return render_template('payment_confirmation.html', payment=payment)

    except Exception as e:
        print(f"[ERROR] payment_confirm: {e}")
        return redirect(url_for('pricing'))
    finally:
        conn.close()

@app.route('/profile')
@login_required
def profile():
    """Trang hồ sơ cá nhân"""
    conn = get_db_connection()
    user_data = {}
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, username, email, full_name, avatar_url, role, created_at FROM users WHERE id = %s",
                    (session['user_id'],)
                )
                row = cursor.fetchone()
                if row:
                    user_data = {
                        'id':         row['id'],
                        'username':   row['username'],
                        'email':      row['email'] or '',
                        'full_name':  row['full_name'] or '',
                        'avatar_url': row.get('avatar_url') or '',
                        'role':       row['role'],
                        'created_at': row['created_at'].strftime('%d/%m/%Y') if row.get('created_at') else '',
                    }
        except Exception as e:
            print(f'[ERROR] profile: {e}')
        finally:
            conn.close()
    if user_data:
        session['avatar_url'] = user_data.get('avatar_url') or ''
    return render_template('profile.html', user=user_data)


@app.route('/api/user/update-profile', methods=['POST'])
@login_required
def update_profile():
    """Cập nhật thông tin cá nhân (full_name)"""
    data = request.get_json() or {}
    full_name = (data.get('full_name') or '').strip()
    if not full_name:
        return jsonify({'success': False, 'message': 'Tên không được để trống'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET full_name = %s WHERE id = %s",
                (full_name, session['user_id'])
            )
            conn.commit()
        session['full_name'] = full_name
        return jsonify({'success': True, 'message': 'Cập nhật thành công'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/uploads/<path:subpath>')
def serve_upload(subpath):
    """Phục vụ file tải lên (avatar, v.v.)"""
    base = UPLOAD_DIR.resolve()
    file_path = (UPLOAD_DIR / subpath).resolve()
    if not str(file_path).startswith(str(base)) or not file_path.is_file():
        abort(404)
    return send_file(file_path)


@app.route('/api/user/upload-avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Upload / thay ảnh đại diện"""
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'message': 'Không có file ảnh'}), 400

    file = request.files['avatar']
    if not file or not file.filename:
        return jsonify({'success': False, 'message': 'Không có file ảnh'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        return jsonify({'success': False, 'message': 'Chỉ chấp nhận JPG, PNG hoặc WEBP'}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_AVATAR_BYTES:
        return jsonify({'success': False, 'message': 'Ảnh tối đa 2MB'}), 400

    user_id = session['user_id']
    filename = f'user_{user_id}.{ext}'
    save_path = AVATAR_UPLOAD_DIR / filename
    avatar_url = f'/uploads/avatars/{filename}'

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500

    try:
        old_url = ''
        with conn.cursor() as cursor:
            cursor.execute("SELECT avatar_url FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            if row:
                old_url = (row.get('avatar_url') or '').split('?')[0]

        for old_file in AVATAR_UPLOAD_DIR.glob(f'user_{user_id}.*'):
            try:
                old_file.unlink()
            except OSError:
                pass

        file.save(str(save_path))

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET avatar_url = %s WHERE id = %s",
                (avatar_url, user_id)
            )
            conn.commit()

        session['avatar_url'] = avatar_url
        return jsonify({
            'success': True,
            'message': 'Cập nhật ảnh đại diện thành công',
            'avatar_url': f'{avatar_url}?t={int(time.time())}'
        })
    except Exception as e:
        print(f'[ERROR] upload_avatar: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/user/change-password', methods=['POST'])
@login_required
def change_password():
    """Đổi mật khẩu"""
    data = request.get_json() or {}
    current_pw  = data.get('current_password', '')
    new_pw      = data.get('new_password', '')
    confirm_pw  = data.get('confirm_password', '')

    if not current_pw or not new_pw:
        return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin'}), 400
    if new_pw != confirm_pw:
        return jsonify({'success': False, 'message': 'Mật khẩu xác nhận không khớp'}), 400
    if len(new_pw) < 6:
        return jsonify({'success': False, 'message': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT password FROM users WHERE id = %s", (session['user_id'],))
            row = cursor.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
            if not check_password_hash(row['password'], current_pw):
                return jsonify({'success': False, 'message': 'Mật khẩu hiện tại không đúng'}), 400
            new_hash = generate_password_hash(new_pw)
            cursor.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (new_hash, session['user_id'])
            )
            conn.commit()
        return jsonify({'success': True, 'message': 'Đổi mật khẩu thành công'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/contact')
def contact():
    """Trang liên hệ"""
    return render_template('contact.html')

@app.route('/privacy')
def privacy():
    """Chính sách quyền riêng tư"""
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    """Điều khoản sử dụng"""
    return render_template('terms.html')

@app.route('/data-deletion')
def data_deletion():
    """Chính sách xóa dữ liệu"""
    return render_template('data_deletion.html')

@app.route('/support')
def support():
    """Trang hỗ trợ và FAQ"""
    return render_template('support.html')

@app.route('/user-guide')
def user_guide():
    """Hướng dẫn sử dụng"""
    return render_template('user_guide.html')

@app.route('/installation-guide')
def installation_guide():
    """Hướng dẫn cài đặt hệ thống"""
    return render_template('installation_guide.html')

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    """Submit contact form"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()
        
        # Validate
        if not all([name, email, subject, message]):
            return jsonify({
                'success': False,
                'message': 'Vui lòng điền đầy đủ thông tin'
            }), 400
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({
                'success': False,
                'message': 'Email không hợp lệ'
            }), 400
        
        # Log contact (có thể lưu vào database nếu muốn)
        print(f"[CONTACT] From: {name} ({email})")
        print(f"[CONTACT] Subject: {subject}")
        print(f"[CONTACT] Message: {message}")
        
        return jsonify({
            'success': True,
            'message': 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong vòng 24 giờ.'
        })
        
    except Exception as e:
        print(f"Error submitting contact: {e}")
        return jsonify({
            'success': False,
            'message': 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
        }), 500

@app.route('/api/voice-conversion', methods=['POST'])
def voice_conversion():
    """
    Voice Conversion API
    Điều chỉnh giọng nói sử dụng RVC
    """
    try:
        # Check if user is logged in
        if not is_logged_in():
            return jsonify({
                'success': False,
                'message': 'Vui lòng đăng nhập để sử dụng tính năng này'
            }), 401
        
        # Check if voice conversion is available (RVC or librosa fallback)
        if RVC_AVAILABLE:
            rvc_processor = get_rvc_processor()
            if not rvc_processor.is_available():
                return jsonify({
                    'success': False,
                    'message': 'Tính năng điều chỉnh giọng tạm thời không khả dụng'
                }), 503
        else:
            return jsonify({
                'success': False,
                'message': 'Tính năng điều chỉnh giọng tạm thời không khả dụng'
            }), 503
        
        # Get request data
        data = request.get_json()
        audio_filename = data.get('audio_filename', '').strip()
        pitch = int(data.get('pitch', 0))
        index_rate = float(data.get('index_rate', 0.75))
        protect = float(data.get('protect', 0.33))
        
        # Validate
        if not audio_filename:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy file audio'
            }), 400
        
        # Validate pitch range
        if pitch < -12 or pitch > 12:
            return jsonify({
                'success': False,
                'message': 'Pitch phải trong khoảng -12 đến +12'
            }), 400
        
        # Validate index_rate
        if index_rate < 0 or index_rate > 1:
            return jsonify({
                'success': False,
                'message': 'Index rate phải trong khoảng 0 đến 1'
            }), 400
        
        # Validate protect
        if protect < 0 or protect > 0.5:
            return jsonify({
                'success': False,
                'message': 'Protect phải trong khoảng 0 đến 0.5'
            }), 400
        
        # Get input audio path
        input_path = os.path.join(AUDIO_OUTPUT_DIR, audio_filename)
        
        if not os.path.exists(input_path):
            return jsonify({
                'success': False,
                'message': 'File audio không tồn tại'
            }), 404
        
        # Get RVC processor
        rvc_processor = get_rvc_processor()
        
        # Process audio
        print(f"[VOICE CONVERSION] Processing: {audio_filename}")
        print(f"[VOICE CONVERSION] Pitch: {pitch}, Index Rate: {index_rate}, Protect: {protect}")
        
        success, output_path, message = rvc_processor.adjust_voice(
            input_audio_path=input_path,
            model_path=None,  # Use simple pitch shift for now
            f0_up_key=pitch,
            index_rate=index_rate,
            protect=protect
        )
        
        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 500
        
        # Get output filename
        output_filename = os.path.basename(output_path)
        
        # Update original conversion record (don't create new one to avoid double counting)
        user_id = session.get('user_id')
        try:
            connection = get_db_connection()
            if connection:
                with connection.cursor() as cursor:
                    # Find original conversion to update
                    # Note: audio_file_path in DB is full path, audio_filename is just filename
                    cursor.execute("""
                        SELECT id, text_input, voice_id, voice_name 
                        FROM conversions 
                        WHERE audio_file_path LIKE %s AND user_id = %s
                        ORDER BY created_at DESC LIMIT 1
                    """, (f'%{audio_filename}', user_id))
                    
                    original = cursor.fetchone()
                    
                    if original:
                        # UPDATE original record with adjusted audio file
                        # This keeps statistics correct (1 TTS = 1 conversion)
                        original_id = original['id']
                        original_text = original['text_input']
                        
                        # Get adjusted audio file info
                        adjusted_path = os.path.join(AUDIO_OUTPUT_DIR, output_filename)
                        file_size = os.path.getsize(adjusted_path) if os.path.exists(adjusted_path) else 0
                        
                        # Update with adjusted file, append adjustment info to text
                        cursor.execute("""
                            UPDATE conversions 
                            SET audio_file_path = %s,
                                audio_file_size = %s,
                                text_input = %s,
                                completed_at = NOW()
                            WHERE id = %s
                        """, (
                            adjusted_path,
                            file_size,
                            f"[Đã điều chỉnh: Pitch {pitch:+d}, Index {index_rate:.2f}] {original_text}",
                            original_id
                        ))
                        
                        connection.commit()
                        print(f"[VOICE CONVERSION] Updated conversion ID {original_id} with adjusted file: {output_filename}")
                    else:
                        # If original not found (shouldn't happen), log warning
                        print(f"[WARNING] Original conversion not found for {audio_filename}, skipping database update")
                    
        except Exception as db_error:
            print(f"[WARNING] Could not update database: {db_error}")
            import traceback
            traceback.print_exc()
        finally:
            if connection:
                connection.close()
        
        print(f"[VOICE CONVERSION] Success: {output_filename}")
        
        return jsonify({
            'success': True,
            'message': message,
            'audio_filename': output_filename,
            'audio_url': url_for('get_audio', filename=output_filename)
        })
        
    except ValueError as e:
        print(f"[ERROR] Invalid parameters: {e}")
        return jsonify({
            'success': False,
            'message': f'Tham số không hợp lệ: {str(e)}'
        }), 400
    except Exception as e:
        print(f"[ERROR] Voice conversion error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Đã xảy ra lỗi khi xử lý. Vui lòng thử lại sau.'
        }), 500

@app.route('/api/voice-conversion/check')
def check_voice_conversion():
    """Check if voice conversion feature is available"""
    try:
        if not RVC_AVAILABLE:
            return jsonify({
                'available': False,
                'message': 'Voice conversion module not loaded'
            })
        
        rvc_processor = get_rvc_processor()
        is_available = rvc_processor.is_available()
        
        return jsonify({
            'available': is_available,
            'message': 'Voice conversion is ready (using librosa fallback)' if is_available else 'Voice conversion not available'
        })
    except Exception as e:
        return jsonify({
            'available': False,
            'message': f'Error checking availability: {str(e)}'
        })

@app.route('/audio-library')
def audio_library():
    """Trang thư viện audio"""
    if not is_logged_in():
        return redirect(url_for('login'))
    return render_template('audio_library.html', app_base_url=APP_BASE_URL.rstrip('/') if APP_BASE_URL else '')

@app.route('/api/audio-library')
def get_audio_library():
    """Lấy danh sách audio với pagination và filter"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 12))
    search = request.args.get('search', '')
    voice_filter = request.args.get('voice', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    sort_by = request.args.get('sort_by', 'newest')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Build query
            query = """
                SELECT * FROM conversions 
                WHERE user_id = %s AND status = 'completed' AND audio_file_path IS NOT NULL
            """
            params = [session['user_id']]
            
            # Search filter (tìm theo nội dung hoặc tên đặt)
            if search:
                query += " AND (text_input LIKE %s OR display_name LIKE %s)"
                params.extend([f'%{search}%', f'%{search}%'])
            
            # Voice filter
            if voice_filter:
                query += " AND voice_id = %s"
                params.append(voice_filter)
            
            # Date filters
            if date_from:
                query += " AND DATE(created_at) >= %s"
                params.append(date_from)
            if date_to:
                query += " AND DATE(created_at) <= %s"
                params.append(date_to)
            
            # Sorting
            if sort_by == 'newest':
                query += " ORDER BY created_at DESC"
            elif sort_by == 'oldest':
                query += " ORDER BY created_at ASC"
            elif sort_by == 'duration':
                query += " ORDER BY duration_seconds DESC"
            elif sort_by == 'size':
                query += " ORDER BY audio_file_size DESC"
            
            # Get total count
            count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
            cursor.execute(count_query, params)
            total = cursor.fetchone()['total']
            
            # Pagination
            query += " LIMIT %s OFFSET %s"
            params.extend([per_page, (page - 1) * per_page])
            
            cursor.execute(query, params)
            audios = cursor.fetchall()
            
            # Convert datetime to string + share URL công khai
            for audio in audios:
                if audio['created_at']:
                    audio['created_at'] = audio['created_at'].isoformat()
                if audio['completed_at']:
                    audio['completed_at'] = audio['completed_at'].isoformat()
                if audio.get('is_public') and audio.get('share_token'):
                    audio['share_url'] = _share_audio_url(audio['share_token'])
                else:
                    audio['share_url'] = None
            
            return jsonify({
                'success': True,
                'audios': audios,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            })
    except Exception as e:
        print(f"[ERROR] Get audio library error: {e}")
        return jsonify({'success': False, 'message': f'Loi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/audio-library/<int:audio_id>', methods=['DELETE'])
def delete_audio(audio_id):
    """Xoa audio file va record trong DB"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Get audio info and verify ownership
            cursor.execute("""
                SELECT audio_file_path FROM conversions 
                WHERE id = %s AND user_id = %s
            """, (audio_id, session['user_id']))
            audio = cursor.fetchone()
            
            if not audio:
                return jsonify({'success': False, 'message': 'Audio khong tim thay hoac ban khong co quyen'}), 404
            
            # Delete physical file
            if audio['audio_file_path']:
                file_path = Path(audio['audio_file_path'])
                if file_path.exists():
                    file_path.unlink()
                    print(f"[DELETE] Deleted audio file: {file_path}")
            
            # Delete DB record
            cursor.execute("DELETE FROM conversions WHERE id = %s", (audio_id,))
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'Da xoa audio thanh cong'
            })
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Delete audio error: {e}")
        return jsonify({'success': False, 'message': f'Loi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/audio-library/<int:audio_id>/rename', methods=['PATCH'])
def rename_audio(audio_id):
    """Đặt tên hiển thị cho audio"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    display_name = data.get('display_name', '').strip()[:200]

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database error'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE conversions SET display_name = %s
                WHERE id = %s AND user_id = %s
            """, (display_name or None, audio_id, session['user_id']))
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Không tìm thấy audio'}), 404
            conn.commit()
            return jsonify({'success': True, 'display_name': display_name})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/audio-library/<int:audio_id>/share', methods=['POST'])
def toggle_share_audio(audio_id):
    """Bật/tắt chia sẻ công khai cho audio"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database error'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT is_public, share_token FROM conversions
                WHERE id = %s AND user_id = %s
            """, (audio_id, session['user_id']))
            audio = cursor.fetchone()
            if not audio:
                return jsonify({'success': False, 'message': 'Không tìm thấy audio'}), 404

            if audio['is_public']:
                # Tắt chia sẻ
                cursor.execute("UPDATE conversions SET is_public = 0 WHERE id = %s", (audio_id,))
                conn.commit()
                return jsonify({'success': True, 'is_public': False, 'share_token': None, 'share_url': None})
            else:
                # Bật chia sẻ — tạo token nếu chưa có
                token = audio['share_token'] or secrets.token_urlsafe(32)
                cursor.execute(
                    "UPDATE conversions SET is_public = 1, share_token = %s WHERE id = %s",
                    (token, audio_id)
                )
                conn.commit()
                return jsonify({
                    'success': True,
                    'is_public': True,
                    'share_token': token,
                    'share_url': _share_audio_url(token),
                })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/audio/share/<token>')
def share_audio_page(token):
    """Trang xem audio công khai — không cần đăng nhập"""
    conn = get_db_connection()
    if not conn:
        return "Lỗi kết nối server", 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.id, c.text_input, c.display_name, c.voice_name, c.voice_id,
                       c.duration_seconds, c.audio_file_size, c.created_at, c.share_token,
                       u.full_name, u.username
                FROM conversions c
                JOIN users u ON c.user_id = u.id
                WHERE c.share_token = %s AND c.is_public = 1
            """, (token,))
            audio = cursor.fetchone()
            if not audio:
                return render_template('share_audio.html', audio=None, token=token), 404
            if audio['created_at']:
                audio['created_at'] = audio['created_at'].isoformat()
            return render_template('share_audio.html', audio=audio, token=token)
    except Exception as e:
        print(f"[ERROR] share_audio_page: {e}")
        return "Lỗi server", 500
    finally:
        conn.close()


@app.route('/api/audio/share/<token>')
def get_shared_audio_file(token):
    """Phục vụ file âm thanh công khai — không cần đăng nhập"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT audio_file_path FROM conversions
                WHERE share_token = %s AND is_public = 1
            """, (token,))
            row = cursor.fetchone()
            if not row or not row['audio_file_path']:
                return jsonify({'success': False, 'message': 'File not found'}), 404
            file_path = Path(row['audio_file_path'])
            if not file_path.exists():
                return jsonify({'success': False, 'message': 'File not found on disk'}), 404
            resp = send_file(file_path, mimetype='audio/wav', as_attachment=False)
            resp.headers['Accept-Ranges'] = 'bytes'
            resp.headers['Cache-Control'] = 'public, max-age=86400'
            return resp
    except Exception as e:
        print(f"[ERROR] get_shared_audio_file: {e}")
        return jsonify({'success': False}), 500
    finally:
        conn.close()


@app.route('/api/subscription/status')
def get_subscription_status():
    """Lấy trạng thái subscription của user"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    limit_info = get_user_characters_limit(session['user_id'])
    if not limit_info:
        return jsonify({'success': False, 'message': 'Không thể lấy thông tin subscription'}), 500
    
    return jsonify({
        'success': True,
        'subscription': limit_info
    })

@app.route('/api/packages')
def get_packages():
    """Lấy danh sách các gói thanh toán"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, package_name, characters_limit, price_vnd, duration_days
                FROM subscription_packages
                WHERE is_active = 1
                ORDER BY characters_limit ASC
            """)
            packages = cursor.fetchall()
            
            return jsonify({
                'success': True,
                'packages': [
                    {
                        'id': p['id'],
                        'name': p['package_name'],
                        'characters': p['characters_limit'],
                        'price': p['price_vnd'],
                        'duration_days': p['duration_days']
                    }
                    for p in packages
                ]
            })
    except Exception as e:
        print(f"[ERROR] Get packages error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/payment/create', methods=['POST'])
def create_payment():
    """Tạo payment request với SePay.vn"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    package_id = data.get('package_id')
    payment_method = 'bank_qr'  # Sử dụng bank_qr cho cả SePay và bank transfer
    
    if not package_id:
        return jsonify({'success': False, 'message': 'Thiếu thông tin thanh toán'}), 400
    
    # Debug: Log user info
    current_user_id = session.get('user_id')
    current_username = session.get('username', 'Unknown')
    print(f"[DEBUG] Create payment - User ID: {current_user_id}, Username: {current_username}, Package ID: {package_id}")
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Kiểm tra user tồn tại trong DB (tránh lỗi FK khi DB mới tạo lại / session cũ)
            cursor.execute("SELECT id, username FROM users WHERE id = %s", (current_user_id,))
            user_check = cursor.fetchone()
            if not user_check:
                print(f"[ERROR] User {current_user_id} not found in database")
                return jsonify({
                    'success': False,
                    'message': 'Phiên đăng nhập không còn hợp lệ (tài khoản không tồn tại trong hệ thống). Vui lòng đăng xuất và đăng nhập lại.'
                }), 401
            
            print(f"[DEBUG] User verified: {user_check['username']} (ID: {user_check['id']})")
            
            # Lấy thông tin package
            cursor.execute("""
                SELECT id, package_name, characters_limit, price_vnd, duration_days
                FROM subscription_packages
                WHERE id = %s AND is_active = 1
            """, (package_id,))
            package = cursor.fetchone()
            
            if not package:
                return jsonify({'success': False, 'message': 'Gói thanh toán không tồn tại'}), 404
            
            print(f"[DEBUG] Package: {package['package_name']} - {package['characters_limit']:,} chars - {package['price_vnd']:,}đ")
            
            # Tạo payment record  
            transaction_id = f"TTS{uuid.uuid4().hex[:16].upper()}"
            cursor.execute("""
                INSERT INTO payments (user_id, package_id, amount_vnd, payment_method, payment_status, transaction_id)
                VALUES (%s, %s, %s, %s, 'pending', %s)
            """, (current_user_id, package_id, package['price_vnd'], payment_method, transaction_id))
            payment_id = cursor.lastrowid
            conn.commit()
            
            print(f"[DEBUG] Payment created: ID {payment_id}, Transaction: {transaction_id}")
            
            # Tạo thanh toán SePay
            sepay_result = create_sepay_payment(
                package['price_vnd'], 
                transaction_id, 
                f"Thanh toán {package['package_name']}",
                current_username
            )
            
            if sepay_result['success']:
                return jsonify({
                    'success': True,
                    'payment_id': payment_id,
                    'transaction_id': transaction_id,
                    'qr_code': sepay_result['qr_code'],
                    'bank_info': sepay_result['bank_info'],
                    'sepay_info': sepay_result.get('sepay_info'),
                    'payment_type': 'sepay',
                    'package_info': {
                        'name': package['package_name'],
                        'characters': package['characters_limit'],
                        'price': package['price_vnd'],
                        'duration': package['duration_days']
                    },
                    'user_info': {
                        'username': current_username,
                        'user_id': current_user_id
                    }
                })
            else:
                # Fallback to bank transfer if SePay fails
                print(f"[WARNING] SePay failed, falling back to bank transfer: {sepay_result.get('error')}")
                
                # Create bank QR as fallback
                qr_data = create_bank_transfer_qr(
                    package['price_vnd'], 
                    transaction_id, 
                    package['package_name'],
                    current_username
                )
                return jsonify({
                    'success': True,
                    'payment_id': payment_id,
                    'transaction_id': transaction_id,
                    'qr_code': qr_data['qr_image'],
                    'bank_info': qr_data['bank_info'],
                    'payment_type': 'bank_qr',
                    'fallback': True,
                    'message': 'SePay không khả dụng, sử dụng chuyển khoản ngân hàng',
                    'package_info': {
                        'name': package['package_name'],
                        'characters': package['characters_limit'],
                        'price': package['price_vnd'],
                        'duration': package['duration_days']
                    },
                    'user_info': {
                        'username': current_username,
                        'user_id': current_user_id
                    }
                })
                
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Create payment error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

def create_bank_transfer_qr(amount, transaction_id, package_name, user_name):
    """Tạo QR code cho chuyển khoản ngân hàng sử dụng API VietQR chính thức"""
    import unicodedata
    import requests
    
    def remove_accents(text):
        """Chuyển đổi tiếng Việt có dấu sang không dấu"""
        if not text:
            return ''
        # Chuyển sang NFD (Normalization Form Decomposed)
        nfd = unicodedata.normalize('NFD', text)
        # Loại bỏ các ký tự dấu
        return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    
    def to_uppercase_no_accent(text, max_length=None):
        """Chuyển sang chữ hoa, không dấu, giới hạn độ dài"""
        result = remove_accents(str(text).upper().strip())
        if max_length and len(result) > max_length:
            result = result[:max_length]
        return result
    
    # Tạo nội dung chuyển khoản
    content = f"{transaction_id}"
    content = remove_accents(content)
    if len(content) > 25:
        content = content[:25]
    
    # Làm sạch số tài khoản
    account_number = str(BANK_ACCOUNT_NUMBER).strip().replace(' ', '').replace('-', '')
    
    # BIN code của TPBank
    tpbank_bin = "970423"
    
    # Thử sử dụng API VietQR (https://api.vietqr.io)
    try:
        vietqr_url = "https://img.vietqr.io/image/{}-{}-compact2.jpg?amount={}&addInfo={}&accountName={}"
        qr_url = vietqr_url.format(
            tpbank_bin,
            account_number,
            amount,
            content,
            to_uppercase_no_accent(BANK_ACCOUNT_NAME, 50)
        )
        
        # Download QR image
        response = requests.get(qr_url, timeout=10)
        if response.status_code == 200:
            # Convert to base64
            img_base64 = base64.b64encode(response.content).decode()
            return {
                'qr_image': f"data:image/jpeg;base64,{img_base64}",
                'bank_info': {
                    'bank_name': BANK_NAME,
                    'account_number': account_number,
                    'account_name': BANK_ACCOUNT_NAME,
                    'branch': BANK_BRANCH,
                    'amount': amount,
                    'content': content,
                    'transaction_id': transaction_id
                },
                'qr_format': 'VietQR API',
                'api_url': qr_url
            }
    except Exception as e:
        print(f"[WARNING] VietQR API failed, falling back to manual generation: {e}")
    
    # Fallback: Tạo QR thủ công nếu API thất bại
    
    def add_field(id_code, value):
        """Thêm field vào EMV QR payload"""
        if value is None or value == '':
            return ''
        value_str = str(value)
        length = len(value_str)
        return f"{id_code:02d}{length:02d}{value_str}"
    
    # Build EMV QR Code payload đầy đủ theo chuẩn VietQR
    payload = ""
    
    # 00: Payload Format Indicator - luôn là "01"
    payload += add_field(0, "01")
    
    # 01: Point of Initiation Method - "12" = dynamic QR
    payload += add_field(1, "12")
    
    # 38: Merchant Account Information theo chuẩn VietQR
    merchant_info = ""
    merchant_info += add_field(0, "A000000727")  # GUID for VietQR
    # 01: Acquirer - BIN code của ngân hàng
    merchant_info += add_field(1, tpbank_bin)
    # 02: Merchant ID - Số tài khoản
    merchant_info += add_field(2, account_number)
    payload += add_field(38, merchant_info)
    
    # 52: Merchant Category Code - "0000" = không phân loại
    payload += add_field(52, "0000")
    
    # 53: Transaction Currency - "704" = VND
    payload += add_field(53, "704")
    
    # 54: Transaction Amount
    payload += add_field(54, str(amount))
    
    # 58: Country Code - "VN"
    payload += add_field(58, "VN")
    
    # 59: Merchant Name - Viết hoa, không dấu, tối đa 50 ký tự
    merchant_name = to_uppercase_no_accent(BANK_ACCOUNT_NAME, 50)
    payload += add_field(59, merchant_name)
    
    # 60: Merchant City - Viết hoa, không dấu
    merchant_city = to_uppercase_no_accent(BANK_BRANCH, 15)
    payload += add_field(60, merchant_city)
    
    # 62: Additional Data Field Template
    additional_data = ""
    # 05: Purpose of Transaction (nội dung chuyển khoản)
    additional_data += add_field(5, content)
    # 08: Reference Label (transaction_id)
    additional_data += add_field(8, transaction_id)
    payload += add_field(62, additional_data)
    
    # Tính CRC16-CCITT checksum
    def crc16_ccitt(data):
        """Tính CRC16-CCITT cho EMV QR Code"""
        crc = 0xFFFF
        polynomial = 0x1021
        for byte in data.encode('utf-8'):
            crc ^= (byte << 8)
            for _ in range(8):
                if crc & 0x8000:
                    crc = (crc << 1) ^ polynomial
                else:
                    crc <<= 1
                crc &= 0xFFFF
        return format(crc, '04X')
    
    # 63: CRC16 checksum
    checksum = crc16_ccitt(payload)
    qr_data = payload + "6304" + checksum
    
    # Tạo QR code với chất lượng cao theo chuẩn VietQR
    qr = qrcode.QRCode(
        version=None,  # Tự động chọn version phù hợp
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # Mức sửa lỗi trung bình
        box_size=15,  # Tăng kích thước để dễ quét hơn
        border=4,  # Border rõ ràng (quiet zone theo chuẩn)
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Tạo image với độ phân giải cao
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Resize để đảm bảo chất lượng tốt (tối thiểu 500x500)
    from PIL import Image
    if img.size[0] < 500:
        img = img.resize((500, 500), Image.Resampling.LANCZOS)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', optimize=False)  # Không optimize để giữ chất lượng
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        'qr_image': f"data:image/png;base64,{img_str}",
        'bank_info': {
            'bank_name': BANK_NAME,
            'account_number': account_number,  # Sử dụng số tài khoản đã làm sạch
            'account_name': BANK_ACCOUNT_NAME,
            'branch': BANK_BRANCH,
            'amount': amount,
            'content': content,
            'transaction_id': transaction_id
        },
        'qr_format': 'VietQR/EMV',
        'merchant_name': merchant_name,
        'merchant_city': merchant_city
    }

@app.route('/payment/bank/verify', methods=['POST'])
def verify_bank_transfer():
    """Xác nhận đã chuyển khoản (manual verification cho bank_qr)"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    payment_id = data.get('payment_id')
    transaction_proof = data.get('transaction_proof', '')
    
    # Debug: Log user info
    current_user_id = session.get('user_id')
    current_username = session.get('username', 'Unknown')
    print(f"[DEBUG] Verify payment - User ID: {current_user_id}, Username: {current_username}, Payment ID: {payment_id}")
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days, sp.package_name
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.id = %s AND p.user_id = %s AND p.payment_method = 'bank_qr'
            """, (payment_id, current_user_id))
            payment = cursor.fetchone()
            
            if not payment:
                print(f"[ERROR] Payment not found - ID: {payment_id}, User ID: {current_user_id}")
                return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
            if payment['payment_status'] == 'completed':
                return jsonify({'success': False, 'message': 'Payment đã được xác nhận'}), 400
            
            print(f"[DEBUG] Payment found: {payment}")
            
            # Thử verify qua SePay trước
            verification = verify_sepay_transaction(
                payment['transaction_id'], 
                payment['amount_vnd']
            )
            
            print(f"[DEBUG] SePay verification: {verification}")
            
            if verification['success'] and verification['verified']:
                # Thanh toán thành công qua SePay
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'completed',
                        bank_transaction_id = %s,
                        description = %s,
                        completed_at = NOW()
                    WHERE id = %s
                """, (
                    payment['transaction_id'], 
                    'Thanh toán SePay thành công (auto verified)', 
                    payment_id
                ))
                
                # Cập nhật subscription
                print(f"[DEBUG] Updating subscription for user {current_user_id}")
                success = update_user_subscription(
                    current_user_id,
                    payment['characters_limit'],
                    payment['duration_days']
                )
                
                print(f"[DEBUG] Subscription update result: {success}")
                
                conn.commit()
                
                if success:
                    return jsonify({
                        'success': True,
                        'message': f'🎉 THANH TOÁN THÀNH CÔNG!\n\n✅ Đã mua gói {payment.get("package_name", "Basic Plan")} thành công!\n💰 Số tiền: {payment["amount_vnd"]:,}đ\n📝 Ký tự được thêm: +{payment["characters_limit"]:,}\n⏰ Thời hạn: +{payment["duration_days"]} ngày\n\n🚀 Bạn có thể sử dụng dịch vụ ngay bây giờ!',
                        'auto_verified': True,
                        'purchase_info': {
                            'package_name': payment.get('package_name', 'Basic Plan'),
                            'amount': payment['amount_vnd'],
                            'characters_added': payment['characters_limit'],
                            'duration_days': payment['duration_days']
                        }
                    })
                else:
                    return jsonify({
                        'success': True, 
                        'message': '✅ Thanh toán thành công nhưng có lỗi cập nhật gói dịch vụ. Vui lòng liên hệ admin để được hỗ trợ.',
                        'auto_verified': True
                    })
            else:
                # Không tìm thấy giao dịch SePay, chuyển sang manual verification
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'pending',
                        bank_transaction_id = %s,
                        description = %s
                    WHERE id = %s
                """, (transaction_proof, f'Chờ admin duyệt - Tham chiếu: {transaction_proof}', payment_id))
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': f'✅ Đã ghi nhận yêu cầu thanh toán!\n\n📋 Gói: {payment.get("package_name", "Basic Plan")}\n💰 Số tiền: {payment["amount_vnd"]:,}đ\n🏦 Mã tham chiếu: {transaction_proof}\n\n⏳ Admin sẽ duyệt thanh toán trong vòng 24 giờ.\nBạn sẽ nhận được thông báo khi gói dịch vụ được kích hoạt.',
                    'manual_verification': True,
                    'pending_info': {
                        'package_name': payment.get('package_name', 'Basic Plan'),
                        'amount': payment['amount_vnd'],
                        'reference': transaction_proof
                    }
                })
            
            return jsonify({
                'success': True,
                'message': 'Đã gửi yêu cầu xác nhận. Admin sẽ duyệt trong vòng 24 giờ.'
            })
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Verify bank transfer error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/payment/sepay/verify', methods=['POST'])
def verify_sepay_payment():
    """Xác minh thanh toán SePay"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    payment_id = data.get('payment_id')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.id = %s AND p.user_id = %s AND p.payment_method = 'sepay'
            """, (payment_id, session['user_id']))
            payment = cursor.fetchone()
            
            if not payment:
                return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
            if payment['payment_status'] == 'completed':
                return jsonify({'success': False, 'message': 'Payment đã được xác nhận'}), 400
            
            # Xác minh qua SePay API
            verification = verify_sepay_transaction(
                payment['transaction_id'], 
                payment['amount_vnd']
            )
            
            if verification['success'] and verification['verified']:
                # Thanh toán thành công, cập nhật database
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'completed',
                        bank_transaction_id = %s,
                        description = %s,
                        completed_at = NOW()
                    WHERE id = %s
                """, (
                    payment['transaction_id'], 
                    'Thanh toán SePay thành công', 
                    payment_id
                ))
                
                # Cập nhật subscription cho user
                update_user_subscription(
                    session['user_id'],
                    payment['characters_limit'],
                    payment['duration_days']
                )
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Thanh toán thành công! Đã cập nhật gói dịch vụ.',
                    'verified': True
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Chưa tìm thấy giao dịch. Vui lòng thử lại sau.',
                    'verified': False
                })
                
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Verify SePay payment error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/payment/debug/sub')
def debug_subscription():
    """DEBUG ONLY - xem subscription hiện tại"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB failed'})
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT us.*, u.username FROM user_subscriptions us
                JOIN users u ON us.user_id = u.id
                ORDER BY us.created_at DESC LIMIT 5
            """)
            rows = cursor.fetchall()
            # Serialize dates
            result = []
            for r in rows:
                d = dict(r)
                for k, v in d.items():
                    if hasattr(v, 'isoformat'):
                        d[k] = v.isoformat()
                result.append(d)
            return jsonify({'subscriptions': result})
    except Exception as e:
        return jsonify({'error': str(e)})
    finally:
        conn.close()

@app.route('/api/payment/debug/pending')
def debug_pending_payments():
    """DEBUG ONLY - xem pending payments trong DB"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB connection failed'})
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id, p.transaction_id, p.amount_vnd, p.payment_status, p.created_at,
                       u.username
                FROM payments p
                JOIN users u ON p.user_id = u.id
                WHERE p.payment_status IN ('pending', 'completed')
                ORDER BY p.created_at DESC LIMIT 10
            """)
            rows = cursor.fetchall()
            return jsonify({'payments': [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({'error': str(e)})
    finally:
        conn.close()

@app.route('/api/payment/sepay/webhook', methods=['POST'])
@app.route('/webhook/sepay', methods=['POST'])
def sepay_webhook():
    """
    Xử lý webhook từ SePay - tự động duyệt thanh toán và cộng ký tự.
    SePay webhook format:
    {
      "id": 123456,
      "gateway": "MBBank",
      "transactionDate": "2024-01-15 10:30:00",
      "accountNumber": "0866005541",
      "content": "TXN12345ABC",
      "transferType": "in",
      "amount": 50000,
      "accumulated": 100000,
      "referenceCode": "...",
      "code": null
    }
    """
    try:
        data = request.get_json(force=True) or {}
        print(f"[WEBHOOK] ===== SePay webhook received =====")
        print(f"[WEBHOOK] Full data: {data}")
        
        # Chỉ xử lý giao dịch tiền VÀO tài khoản
        transfer_type = str(data.get('transferType', '') or data.get('transfer_type', '') or '').strip()
        print(f"[WEBHOOK] transferType='{transfer_type}'")
        if transfer_type and transfer_type.lower() not in ('in', 'credit', 'receive'):
            print(f"[WEBHOOK] Ignored - transfer type is outgoing: {transfer_type}")
            return jsonify({'success': True, 'message': 'Ignored (not incoming)'})
        
        # SePay gửi số tiền ở field 'transferAmount' (không phải 'amount')
        webhook_amount = int(float(
            data.get('transferAmount') or
            data.get('transfer_amount') or
            data.get('amount') or
            0
        ))
        # SePay có thể gửi content ở nhiều field khác nhau
        raw_content = (
            data.get('content') or
            data.get('transaction_content') or
            data.get('description') or
            data.get('memo') or
            data.get('reference') or ''
        )
        webhook_content = str(raw_content).upper().strip()
        
        print(f"[WEBHOOK] transferAmount={data.get('transferAmount')}, amount={data.get('amount')}, "
              f"resolved_amount={webhook_amount}")
        print(f"[WEBHOOK] raw_content='{raw_content}', content_upper='{webhook_content}'")
        
        if not webhook_content or webhook_amount <= 0:
            print(f"[WEBHOOK] Missing content or amount — cannot match")
            return jsonify({'success': True, 'message': 'No content/amount'})
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'DB error'}), 500
        
        try:
            with conn.cursor() as cursor:
                # Lấy TẤT CẢ pending payments (bỏ filter amount ở SQL để debug)
                cursor.execute("""
                    SELECT p.*, sp.characters_limit, sp.duration_days, sp.package_name,
                           u.username
                    FROM payments p
                    JOIN subscription_packages sp ON p.package_id = sp.id
                    JOIN users u ON p.user_id = u.id
                    WHERE p.payment_status = 'pending'
                      AND UPPER(p.transaction_id) != ''
                    ORDER BY p.created_at DESC
                    LIMIT 50
                """)
                
                pending_payments = cursor.fetchall()
                print(f"[WEBHOOK] Found {len(pending_payments)} pending payments")
                matched_payment = None
                
                # Chuẩn hóa: chỉ giữ alphanum, chuyển uppercase
                def normalize(s):
                    return ''.join(c for c in str(s).upper() if c.isalnum())
                
                webhook_norm = normalize(webhook_content)
                print(f"[WEBHOOK] webhook_norm='{webhook_norm}'")

                for pmt in pending_payments:
                    txn_id      = str(pmt['transaction_id']).upper().strip()
                    txn_norm    = normalize(txn_id)
                    # Bỏ prefix TTS (có hoặc không có gạch dưới)
                    hex_part    = txn_norm
                    for pfx in ('TTS_', 'TTS'):
                        if hex_part.startswith(pfx):
                            hex_part = hex_part[len(pfx):]
                            break
                    
                    amount_ok = abs(webhook_amount - int(pmt['amount_vnd'])) <= 2000

                    # So khớp linh hoạt: full match HOẶC hex part match
                    content_match = (
                        txn_norm    in webhook_norm or
                        webhook_norm in txn_norm   or
                        (len(hex_part) >= 8 and hex_part in webhook_norm)
                    )

                    print(f"[WEBHOOK] Check pmt#{pmt['id']}: txn={txn_id}, txn_norm={txn_norm}, hex={hex_part}, "
                          f"content_match={content_match}, amount_ok={amount_ok} "
                          f"(pmt_amount={pmt['amount_vnd']}, webhook_amount={webhook_amount})")

                    if content_match and amount_ok:
                        matched_payment = pmt
                        print(f"[WEBHOOK] ✅ MATCHED payment #{pmt['id']} for user {pmt['username']}")
                        break
                
                if not matched_payment:
                    print(f"[WEBHOOK] ❌ No matching pending payment. content='{webhook_content}', amount={webhook_amount}")
                    return jsonify({'success': True, 'message': 'No matching payment found'})
                
                print(f"[WEBHOOK] Matched payment ID={matched_payment['id']} for user={matched_payment['username']}")
                
                # Cập nhật payment thành completed
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'completed',
                        bank_transaction_id = %s,
                        description = %s,
                        completed_at = NOW()
                    WHERE id = %s AND payment_status = 'pending'
                """, (
                    str(data.get('id', '') or data.get('referenceCode', '')),
                    f"SePay webhook auto-approved: {webhook_content}",
                    matched_payment['id']
                ))
                
                if cursor.rowcount == 0:
                    # Đã được duyệt bởi request khác (race condition)
                    print(f"[WEBHOOK] Payment {matched_payment['id']} already processed")
                    conn.commit()
                    return jsonify({'success': True, 'message': 'Already processed'})
                
                conn.commit()
                
                # Cộng ký tự cho user
                sub_success = update_user_subscription(
                    matched_payment['user_id'],
                    matched_payment['characters_limit'],
                    matched_payment['duration_days']
                )
                
                if sub_success:
                    print(f"[WEBHOOK] ✅ Auto-approved payment {matched_payment['id']} for user {matched_payment['username']}: +{matched_payment['characters_limit']:,} chars")
                else:
                    print(f"[WEBHOOK] ⚠️ Payment approved but subscription update failed for user {matched_payment['username']}")
                
                return jsonify({
                    'success': True,
                    'message': 'Payment auto-approved',
                    'payment_id': matched_payment['id'],
                    'user': matched_payment['username'],
                    'characters_added': matched_payment['characters_limit']
                })
                
        except Exception as e:
            import traceback
            conn.rollback()
            print(f"[WEBHOOK ERROR] {e}")
            print(traceback.format_exc())
            return jsonify({'success': False, 'message': f'DB error: {str(e)}'}), 500
        finally:
            conn.close()
            
    except Exception as e:
        import traceback
        print(f"[WEBHOOK FATAL] {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

def update_user_subscription(user_id, characters_limit, duration_days):
    """Cập nhật subscription cho user"""
    print(f"[DEBUG] update_user_subscription called - User ID: {user_id}, Characters: {characters_limit}, Days: {duration_days}")
    
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Database connection failed in update_user_subscription")
        return False
        
    try:
        with conn.cursor() as cursor:
            # Kiểm tra user tồn tại
            cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                print(f"[ERROR] User {user_id} not found")
                return False
            
            print(f"[DEBUG] Updating subscription for user: {user['username']}")
            
            # Kiểm tra subscription hiện tại
            cursor.execute("""
                SELECT * FROM user_subscriptions 
                WHERE user_id = %s AND is_active = 1
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            current_sub = cursor.fetchone()
            
            if current_sub:
                print(f"[DEBUG] Found existing subscription: {current_sub}")
                
                # Gia hạn subscription hiện tại
                new_end_date = datetime.now() + timedelta(days=duration_days)
                new_characters_used = max(0, current_sub['characters_used'] - characters_limit)  # Giảm characters_used
                new_characters_limit = current_sub['characters_limit'] + characters_limit  # Tăng limit
                
                print(f"[DEBUG] Updating - New limit: {new_characters_limit}, New used: {new_characters_used}, New end date: {new_end_date}")
                
                cursor.execute("""
                    UPDATE user_subscriptions
                    SET characters_used = %s,
                        characters_limit = %s,
                        end_date = %s
                    WHERE id = %s
                """, (new_characters_used, new_characters_limit, new_end_date, current_sub['id']))
                
                print(f"[DEBUG] Updated existing subscription for user {user['username']}")
            else:
                print(f"[DEBUG] No existing subscription, creating new one")
                
                # Tạo subscription mới
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=duration_days)
                cursor.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, characters_limit, characters_used, start_date, end_date, is_active)
                    VALUES (%s, %s, 0, %s, %s, 1)
                """, (user_id, characters_limit, start_date, end_date))
                
                print(f"[DEBUG] Created new subscription for user {user['username']}")
            
            conn.commit()
            print(f"[SUCCESS] Subscription updated successfully for user {user['username']}")
            return True
    except Exception as e:
        print(f"[ERROR] Update subscription error: {e}")
        print(f"[ERROR] Error details: {traceback.format_exc()}")
        conn.rollback()
        return False
    finally:
        conn.close()

@app.route('/api/admin/payment/approve', methods=['POST'])
def admin_approve_payment():
    """Admin duyệt thanh toán thủ công — bắt buộc verify SePay.
    Nếu SePay không tìm thấy giao dịch → đánh dấu FAILED, không cộng ký tự.
    """
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data       = request.get_json()
    payment_id = data.get('payment_id')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days, sp.package_name,
                       u.username
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = %s AND p.payment_status = 'pending'
            """, (payment_id,))
            payment = cursor.fetchone()
            
            if not payment:
                return jsonify({'success': False, 'message': 'Không tìm thấy thanh toán hoặc đã được xử lý'}), 404
            
            # ── Verify SePay bắt buộc ──
            verified    = False
            verify_note = ''
            try:
                verification = verify_sepay_transaction(
                    payment['transaction_id'],
                    payment['amount_vnd']
                )
                verified    = verification.get('verified', False)
                verify_note = verification.get('note', '')
                print(f"[ADMIN-APPROVE] SePay verify: verified={verified}, note={verify_note}")
            except Exception as ve:
                print(f"[ADMIN-APPROVE] SePay verify error: {ve}")
                verified    = False
                verify_note = str(ve)
            
            if not verified:
                # ── Không verify được → đánh dấu FAILED, kết thúc thanh toán ──
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'failed',
                        description    = CONCAT(IFNULL(description,''), ' - Admin verify failed: không tìm thấy giao dịch SePay'),
                        completed_at   = NOW()
                    WHERE id = %s AND payment_status = 'pending'
                """, (payment_id,))
                conn.commit()
                print(f"[ADMIN-APPROVE] Payment {payment_id} marked FAILED — no SePay transaction found")
                return jsonify({
                    'success': False,
                    'failed': True,
                    'message': (
                        f'❌ Thanh toán #{payment_id} không thể xác minh qua SePay.\n\n'
                        f'Lý do: {verify_note or "Không có giao dịch nào khớp với mã giao dịch và số tiền"}\n\n'
                        f'⚠️ Người dùng CHƯA chuyển khoản hoặc số tiền không khớp.\n\n'
                        f'Thanh toán đã bị đánh dấu THẤT BẠI. Người dùng cần tạo đơn thanh toán mới.'
                    )
                })
            
            # ── SePay xác nhận → tiến hành duyệt ──
            cursor.execute("""
                UPDATE payments
                SET payment_status = 'completed',
                    description    = CONCAT(IFNULL(description,''), ' - SePay verified + Admin approved'),
                    completed_at   = NOW()
                WHERE id = %s AND payment_status = 'pending'
            """, (payment_id,))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return jsonify({'success': False, 'message': 'Thanh toán đã được xử lý bởi request khác'}), 409
            
            conn.commit()
            
            # Cộng ký tự cho user
            success = update_user_subscription(
                payment['user_id'],
                payment['characters_limit'],
                payment['duration_days']
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'verified': True,
                    'message': (
                        f'🎉 Đã duyệt thanh toán thành công! ✅ (Đã xác minh SePay)\n\n'
                        f'👤 User: {payment["username"]}\n'
                        f'📋 Gói: {payment.get("package_name","Custom")}\n'
                        f'💰 Số tiền: {payment["amount_vnd"]:,}đ\n'
                        f'📝 Ký tự thêm: +{payment["characters_limit"]:,}\n'
                        f'⏰ Thời hạn thêm: +{payment["duration_days"]} ngày\n\n'
                        f'✅ Gói dịch vụ đã được kích hoạt cho user.'
                    ),
                    'approval_info': {
                        'user': payment["username"],
                        'package_name': payment.get("package_name", "Custom"),
                        'amount': payment["amount_vnd"],
                        'characters_added': payment["characters_limit"],
                        'duration_days': payment["duration_days"]
                    }
                })
            else:
                return jsonify({
                    'success': True,
                    'message': f'⚠️ Đã duyệt cho user {payment["username"]} nhưng có lỗi cập nhật gói. Kiểm tra lại DB.',
                    'warning': True
                })
                
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Admin approve payment error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/user/subscription/status', methods=['GET'])
def get_user_subscription_status():
    """Lấy trạng thái subscription hiện tại của user"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT us.*, sp.package_name
                FROM user_subscriptions us
                LEFT JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.user_id = %s AND us.is_active = 1
                ORDER BY us.created_at DESC LIMIT 1
            """, (session['user_id'],))
            subscription = cursor.fetchone()
            
            if subscription:
                characters_remaining = max(0, subscription['characters_limit'] - subscription['characters_used'])
                days_remaining = (subscription['end_date'] - datetime.now().date()).days
                
                # Tạo message status dựa trên subscription
                if characters_remaining > 1000000:  # > 1M chars
                    status_message = f'🚀 Bạn đang có gói {subscription["package_name"] or "VIP"}! Còn {characters_remaining:,} ký tự và {days_remaining} ngày.'
                elif characters_remaining > 100000:  # > 100K chars  
                    status_message = f'✅ Gói {subscription["package_name"] or "Active"} còn {characters_remaining:,} ký tự và {days_remaining} ngày.'
                elif days_remaining <= 7:  # Sắp hết hạn
                    status_message = f'⚠️ Gói {subscription["package_name"] or "Current"} sắp hết hạn ({days_remaining} ngày). Hãy gia hạn sớm!'
                elif characters_remaining <= 10000:  # Sắp hết ký tự
                    status_message = f'⚠️ Gói {subscription["package_name"] or "Current"} còn ít ký tự ({characters_remaining:,}). Hãy nâng cấp!'
                else:
                    status_message = f'📋 Gói {subscription["package_name"] or "Active"}: {characters_remaining:,} ký tự, {days_remaining} ngày.'
                
                return jsonify({
                    'success': True,
                    'subscription': {
                        'package_name': subscription['package_name'] or 'Custom',
                        'characters_limit': subscription['characters_limit'],
                        'characters_used': subscription['characters_used'],
                        'characters_remaining': characters_remaining,
                        'end_date': subscription['end_date'].strftime('%Y-%m-%d'),
                        'days_remaining': days_remaining,
                        'is_active': subscription['is_active'],
                        'status_message': status_message
                    }
                })
            else:
                return jsonify({
                    'success': True,
                    'subscription': {
                        'package_name': 'Chưa có gói',
                        'characters_limit': 0,
                        'characters_used': 0,
                        'characters_remaining': 0,
                        'end_date': None,
                        'days_remaining': 0,
                        'is_active': False,
                        'status_message': '📭 Bạn chưa có gói dịch vụ nào. Hãy mua gói để sử dụng!'
                    }
                })
                
    except Exception as e:
        print(f"[ERROR] Get subscription status error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/payments', methods=['GET'])
def admin_get_payments():
    """Admin xem danh sách payments (có phân trang)"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    page = max(request.args.get('page', 1, type=int), 1)
    per_page = request.args.get('per_page', 15, type=int)
    per_page = min(max(per_page, 5), 100)

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM payments")
            total_row = cursor.fetchone()
            total = total_row['total'] if total_row else 0
            total_pages = max(1, (total + per_page - 1) // per_page) if total > 0 else 1

            if page > total_pages and total > 0:
                page = total_pages

            offset = (page - 1) * per_page
            cursor.execute("""
                SELECT p.*, u.username, sp.package_name
                FROM payments p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset))
            payments = cursor.fetchall()

            for payment in payments:
                if payment['created_at']:
                    payment['created_at'] = payment['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if payment['updated_at']:
                    payment['updated_at'] = payment['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                if payment['completed_at']:
                    payment['completed_at'] = payment['completed_at'].strftime('%Y-%m-%d %H:%M:%S')

            return jsonify({
                'success': True,
                'payments': payments,
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
            })

    except Exception as e:
        print(f"[ERROR] Admin get payments error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/auto-approve', methods=['POST'])
def admin_bulk_auto_approve():
    """Admin kích hoạt auto-approve cho tất cả pending payments"""
    if not is_logged_in() or not is_admin():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    force_approve = data.get('force', False)  # Force approve even without verification
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Get all pending payments
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days, u.username
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.payment_status = 'pending'
                ORDER BY p.created_at ASC
            """)
            pending_payments = cursor.fetchall()
            
            approved_count = 0
            failed_count = 0
            results = []
            
            for payment in pending_payments:
                try:
                    payment_id = payment['id']
                    
                    # Try SePay verification first
                    verification = verify_sepay_transaction(
                        payment['transaction_id'], 
                        payment['amount_vnd']
                    )
                    
                    should_approve = force_approve or (verification.get('success') and verification.get('verified'))
                    
                    if should_approve:
                        # Approve payment
                        cursor.execute("""
                            UPDATE payments
                            SET payment_status = 'completed',
                                description = CONCAT(IFNULL(description, ''), ' - Bulk auto-approved'),
                                completed_at = NOW()
                            WHERE id = %s
                        """, (payment_id,))
                        
                        # Update user subscription
                        success = update_user_subscription(
                            payment['user_id'],
                            payment['characters_limit'],
                            payment['duration_days']
                        )
                        
                        if success:
                            approved_count += 1
                            results.append({
                                'payment_id': payment_id,
                                'user': payment['username'],
                                'amount': payment['amount_vnd'],
                                'status': 'approved',
                                'method': 'sepay_verified' if verification.get('verified') else 'force_approved'
                            })
                        else:
                            failed_count += 1
                            results.append({
                                'payment_id': payment_id,
                                'user': payment['username'],
                                'amount': payment['amount_vnd'],
                                'status': 'failed',
                                'error': 'Subscription update failed'
                            })
                    else:
                        results.append({
                            'payment_id': payment_id,
                            'user': payment['username'],
                            'amount': payment['amount_vnd'],
                            'status': 'skipped',
                            'reason': 'Not verified'
                        })
                        
                except Exception as e:
                    failed_count += 1
                    results.append({
                        'payment_id': payment.get('id', 'unknown'),
                        'user': payment.get('username', 'unknown'),  
                        'status': 'error',
                        'error': str(e)
                    })
            
            conn.commit()
            
            success_message = f'🎉 BULK AUTO-APPROVE HOÀN THÀNH!\n\n📊 Kết quả:\n✅ Đã duyệt: {approved_count} payments\n❌ Thất bại: {failed_count} payments\n📋 Tổng xử lý: {len(pending_payments)} payments'
            
            if approved_count > 0:
                success_message += f'\n\n💫 {approved_count} user đã được kích hoạt gói dịch vụ!'
            
            return jsonify({
                'success': True,
                'message': success_message,
                'approved_count': approved_count,
                'failed_count': failed_count,
                'total_processed': len(pending_payments),
                'results': results,
                'summary': f'Processed {len(pending_payments)} payments: {approved_count} approved, {failed_count} failed'
            })
            
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Bulk auto-approve error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/payment/status/<int:payment_id>', methods=['GET'])
def get_payment_status(payment_id):
    """Kiểm tra trạng thái thanh toán cụ thể"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.package_name, sp.characters_limit, sp.duration_days
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.id = %s AND p.user_id = %s
            """, (payment_id, session['user_id']))
            payment = cursor.fetchone()
            
            if not payment:
                return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
            # Tạo message dựa trên trạng thái
            if payment['payment_status'] == 'completed':
                message = f'🎉 THANH TOÁN THÀNH CÔNG!\n\n✅ Gói {payment["package_name"]} đã được kích hoạt!\n💰 Số tiền: {payment["amount_vnd"]:,}đ\n📝 Ký tự: +{payment["characters_limit"]:,}\n⏰ Thời hạn: +{payment["duration_days"]} ngày\n\n🚀 Bạn có thể sử dụng dịch vụ ngay!'
                status_icon = '✅'
            elif payment['payment_status'] == 'pending':
                message = f'⏳ Đang chờ xác nhận thanh toán\n\n📋 Gói: {payment["package_name"]}\n💰 Số tiền: {payment["amount_vnd"]:,}đ\n🏦 Mã giao dịch: {payment["transaction_id"]}\n\n⏰ Admin sẽ duyệt trong vòng 24 giờ.'
                status_icon = '⏳'
            elif payment['payment_status'] == 'failed':
                message = f'❌ Thanh toán thất bại\n\n📋 Gói: {payment["package_name"]}\n💰 Số tiền: {payment["amount_vnd"]:,}đ\n\n💡 Vui lòng thử lại hoặc liên hệ support.'
                status_icon = '❌'
            else:
                message = f'📋 Trạng thái: {payment["payment_status"]}\nGói: {payment["package_name"]}\nSố tiền: {payment["amount_vnd"]:,}đ'
                status_icon = '📋'
            
            return jsonify({
                'success': True,
                'payment': {
                    'id': payment['id'],
                    'status': payment['payment_status'],
                    'status_icon': status_icon,
                    'message': message,
                    'package_name': payment['package_name'],
                    'amount': payment['amount_vnd'],
                    'transaction_id': payment['transaction_id'],
                    'created_at': payment['created_at'].strftime('%Y-%m-%d %H:%M:%S') if payment['created_at'] else None,
                    'completed_at': payment['completed_at'].strftime('%Y-%m-%d %H:%M:%S') if payment['completed_at'] else None
                }
            })
            
    except Exception as e:
        print(f"[ERROR] Get payment status error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# INVOICE / HÓA ĐƠN
# ─────────────────────────────────────────────────────────────────────────────

def _build_invoice_pdf(payment, user_info):
    """Generate PDF invoice bytes using reportlab."""
    from io import BytesIO
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    buffer = BytesIO()
    W, H = A4  # 595 x 842 pt

    # ── Font registration (try Windows Arial for Vietnamese support) ──
    font_reg  = 'Helvetica'
    font_bold = 'Helvetica-Bold'
    _win_fonts = [
        ('C:/Windows/Fonts/arial.ttf',   'C:/Windows/Fonts/arialbd.ttf'),
        ('C:/Windows/Fonts/verdana.ttf', 'C:/Windows/Fonts/verdanab.ttf'),
    ]
    for reg_path, bold_path in _win_fonts:
        if os.path.exists(reg_path):
            try:
                pdfmetrics.registerFont(TTFont('VV_Reg',  reg_path))
                font_reg  = 'VV_Reg'
                if os.path.exists(bold_path):
                    pdfmetrics.registerFont(TTFont('VV_Bold', bold_path))
                    font_bold = 'VV_Bold'
                break
            except Exception:
                pass

    c = rl_canvas.Canvas(buffer, pagesize=A4)

    # ── Palette ──
    COL_BG        = (0.020, 0.082, 0.122)   # #051424
    COL_PRIMARY   = (0.439, 0.471, 1.000)   # purplish-blue
    COL_TEXT      = (0.831, 0.894, 0.980)   # #d4e4fa
    COL_MUTED     = (0.592, 0.557, 0.627)
    COL_ACCENT    = (0.188, 0.851, 0.957)   # tertiary teal
    COL_WHITE     = (1, 1, 1)
    COL_SURFACE   = (0.071, 0.133, 0.192)

    def rgb(col): c.setFillColorRGB(*col)
    def stroke(col): c.setStrokeColorRGB(*col)

    # ── Background ──
    rgb(COL_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── Header band ──
    rgb(COL_SURFACE)
    c.rect(0, H - 90, W, 90, fill=1, stroke=0)

    # Logo / brand
    rgb(COL_PRIMARY)
    c.setFont(font_bold, 22)
    c.drawString(40, H - 55, 'VietVoice AI')
    rgb(COL_MUTED)
    c.setFont(font_reg, 10)
    c.drawString(40, H - 72, 'Ho tro: support@vietvoice.ai')

    # Invoice label (right side)
    rgb(COL_WHITE)
    c.setFont(font_bold, 28)
    c.drawRightString(W - 40, H - 52, 'HOA DON / INVOICE')
    rgb(COL_MUTED)
    c.setFont(font_reg, 10)
    inv_no = f'VV-{payment["id"]:05d}'
    c.drawRightString(W - 40, H - 68, f'So: {inv_no}')

    # ── Invoice meta ──
    y = H - 115
    rgb(COL_TEXT)
    c.setFont(font_bold, 11)
    c.drawString(40, y, 'THONG TIN HOA DON')
    rgb(COL_PRIMARY)
    c.setLineWidth(1.5)
    stroke(COL_PRIMARY)
    c.line(40, y - 5, W - 40, y - 5)

    y -= 28
    meta_rows = [
        ('Khach hang:', user_info.get('username', '—')),
        ('Ma giao dich:', payment.get('transaction_id', '—')),
        ('Ngay tao:', str(payment.get('created_at', '—'))[:19]),
        ('Ngay thanh toan:', str(payment.get('completed_at', '—'))[:19] if payment.get('completed_at') else '—'),
        ('Phuong thuc:', payment.get('payment_method', 'bank_qr').replace('_', ' ').upper()),
        ('Trang thai:', 'DA THANH TOAN' if payment.get('payment_status') == 'completed' else payment.get('payment_status', '').upper()),
    ]
    for label, val in meta_rows:
        rgb(COL_MUTED)
        c.setFont(font_reg, 10)
        c.drawString(40, y, label)
        rgb(COL_TEXT)
        c.setFont(font_bold if label in ('Trang thai:', 'Khach hang:') else font_reg, 10)
        c.drawString(200, y, val)
        y -= 20

    # ── Items table ──
    y -= 18
    rgb(COL_TEXT)
    c.setFont(font_bold, 11)
    c.drawString(40, y, 'CHI TIET DICH VU')
    stroke(COL_PRIMARY)
    c.line(40, y - 5, W - 40, y - 5)

    # Table header
    y -= 28
    rgb(COL_SURFACE)
    c.rect(38, y - 6, W - 76, 24, fill=1, stroke=0)
    rgb(COL_PRIMARY)
    c.setFont(font_bold, 10)
    c.drawString(46, y + 4, 'Dich vu / Goi')
    c.drawString(280, y + 4, 'Ky tu')
    c.drawString(380, y + 4, 'Thoi han')
    c.drawRightString(W - 46, y + 4, 'So tien (VND)')

    # Table row
    y -= 30
    rgb(COL_TEXT)
    c.setFont(font_reg, 10)
    pkg_name = payment.get('package_name', 'Goi dich vu')
    chars    = f'{payment.get("characters_limit", 0):,}'.replace(',', '.')
    days     = f'{payment.get("duration_days", 0)} ngay'
    amount_s = f'{payment.get("amount_vnd", 0):,}'.replace(',', '.') + ' d'
    c.drawString(46, y, pkg_name)
    c.drawString(280, y, chars)
    c.drawString(380, y, days)
    c.drawRightString(W - 46, y, amount_s)

    # Total row
    y -= 20
    stroke(COL_MUTED)
    c.setLineWidth(0.5)
    c.line(38, y, W - 38, y)
    y -= 22
    rgb(COL_ACCENT)
    c.setFont(font_bold, 13)
    c.drawString(46, y, 'TONG CONG:')
    c.drawRightString(W - 46, y, amount_s)

    # ── Footer ──
    stroke(COL_SURFACE)
    c.setLineWidth(1)
    c.line(40, 60, W - 40, 60)
    rgb(COL_MUTED)
    c.setFont(font_reg, 9)
    c.drawCentredString(W / 2, 44, 'Cam on ban da su dung VietVoice AI  |  vietvoice.ai  |  support@vietvoice.ai')
    c.drawCentredString(W / 2, 30, f'Tai lieu nay duoc tao tu dong - Invoice #{inv_no}')

    c.save()
    buffer.seek(0)
    return buffer


@app.route('/invoice/<int:payment_id>')
@login_required
def download_invoice(payment_id):
    """Tải hóa đơn PDF cho một payment đã hoàn thành"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id, p.transaction_id, p.amount_vnd, p.payment_method,
                       p.payment_status, p.created_at, p.completed_at,
                       sp.package_name, sp.characters_limit, sp.duration_days,
                       u.username, u.email, u.full_name
                FROM payments p
                JOIN subscription_packages sp ON p.package_id = sp.id
                JOIN users u ON p.user_id = u.id
                WHERE p.id = %s AND p.user_id = %s
            """, (payment_id, session['user_id']))
            payment = cursor.fetchone()

        if not payment:
            return jsonify({'error': 'Không tìm thấy hóa đơn'}), 404

        if payment['payment_status'] != 'completed':
            return jsonify({'error': 'Hóa đơn chỉ khả dụng sau khi thanh toán thành công'}), 403

        user_info = {
            'username':  payment.get('full_name') or payment.get('username', ''),
            'email':     payment.get('email', ''),
        }

        pdf_buffer = _build_invoice_pdf(payment, user_info)
        filename = f'VietVoice_Invoice_VV-{payment_id:05d}.pdf'

        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f'[ERROR] Invoice generation: {e}')
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/user/payments')
@login_required
def get_user_payments():
    """Lịch sử thanh toán của user hiện tại (có phân trang)"""
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = request.args.get('per_page', 8, type=int)
    per_page = min(max(per_page, 5), 50)

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'payments': []}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM payments WHERE user_id = %s",
                (session['user_id'],),
            )
            total_row = cursor.fetchone()
            total = total_row['total'] if total_row else 0
            total_pages = max(1, (total + per_page - 1) // per_page) if total > 0 else 1

            if page > total_pages and total > 0:
                page = total_pages

            offset = (page - 1) * per_page
            cursor.execute("""
                SELECT p.id, p.transaction_id, p.amount_vnd, p.payment_method,
                       p.payment_status, p.created_at, p.completed_at,
                       sp.package_name, sp.characters_limit, sp.duration_days
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.user_id = %s
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s
            """, (session['user_id'], per_page, offset))
            rows = cursor.fetchall()

        payments = []
        for r in rows:
            payments.append({
                'id':              r['id'],
                'transaction_id':  r['transaction_id'],
                'amount_vnd':      r['amount_vnd'],
                'payment_method':  r['payment_method'],
                'payment_status':  r['payment_status'],
                'package_name':    r.get('package_name', '—'),
                'characters_limit': r.get('characters_limit', 0),
                'duration_days':   r.get('duration_days', 0),
                'created_at':      r['created_at'].strftime('%d/%m/%Y %H:%M') if r['created_at'] else '—',
                'completed_at':    r['completed_at'].strftime('%d/%m/%Y %H:%M') if r['completed_at'] else None,
            })

        return jsonify({
            'success': True,
            'payments': payments,
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
        })

    except Exception as e:
        print(f'[ERROR] get_user_payments: {e}')
        return jsonify({'success': False, 'payments': []}), 500
    finally:
        conn.close()


def _fetch_my_voices_page(user_id, page=1, per_page=9):
    """Lấy danh sách giọng có phân trang."""
    if page < 1:
        page = 1

    conn = get_db_connection()
    if not conn:
        return None

    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) AS total FROM custom_voices WHERE user_id = %s",
        (user_id,),
    )
    total_row = cursor.fetchone()
    total = total_row['total'] if total_row else 0
    total_pages = max(1, (total + per_page - 1) // per_page) if total > 0 else 1

    if page > total_pages and total > 0:
        page = total_pages

    offset = (page - 1) * per_page
    cursor.execute("""
        SELECT * FROM custom_voices
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """, (user_id, per_page, offset))
    voices = cursor.fetchall()
    conn.close()

    return {
        'voices': voices,
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
    }


@app.route('/my-voices')
@login_required
def my_voices():
    """Page: My custom voices"""
    user_id = session.get('user_id')
    per_page = 9
    page = request.args.get('page', 1, type=int)

    try:
        result = _fetch_my_voices_page(user_id, page, per_page)
        if result is None:
            return render_template(
                'my_voices.html',
                voices=[],
                error="Database connection failed",
                page=1,
                per_page=per_page,
                total=0,
                total_pages=1,
            )

        return render_template('my_voices.html', error=None, **result)
    except Exception as e:
        print(f"[ERROR] My voices page error: {e}")
        import traceback
        traceback.print_exc()
        return render_template(
            'my_voices.html',
            voices=[],
            error=str(e),
            page=1,
            per_page=per_page,
            total=0,
            total_pages=1,
        )
@app.route('/add-voice')
@login_required
def add_voice_page():
    """Page: Add custom voice"""
    return render_template('add_voice.html')

@app.route('/api/custom-voice/upload', methods=['POST'])
@login_required
def upload_custom_voice():
    """Upload audio for custom voice"""
    try:
        if not CUSTOM_VOICE_AVAILABLE:
            return jsonify({'success': False, 'error': 'Custom voice feature not available'}), 503
        
        user_id = session.get('user_id')
        
        # Kiểm tra user tồn tại trong DB (tránh lỗi FK khi DB mới tạo lại / session cũ)
        conn_check = get_db_connection()
        if conn_check:
            try:
                with conn_check.cursor() as cur:
                    cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                    if not cur.fetchone():
                        return jsonify({
                            'success': False,
                            'error': 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng xuất và đăng nhập lại.'
                        }), 401
            finally:
                conn_check.close()
        
        # Get file
        if 'audio_file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        audio_file = request.files['audio_file']
        voice_name = request.form.get('voice_name', 'Untitled Voice')
        description = request.form.get('description', '')
        
        # Voice type: 'rvc' (training), 'zero_shot' (clone from audio + transcript), or 'vixtts_clone' (viXTTS clone)
        voice_type = (request.form.get('voice_type') or 'rvc').strip().lower()
        if voice_type not in ('rvc', 'zero_shot', 'vixtts_clone'):
            voice_type = 'rvc'
        ref_transcript = (request.form.get('ref_transcript') or '').strip()
        if voice_type == 'zero_shot' and not ref_transcript:
            return jsonify({'success': False, 'error': 'Zero-shot cần nhập transcript (nội dung nói) của file mẫu'}), 400
        if voice_type == 'vixtts_clone' and (not VIXTTS_EMOTIONAL_AVAILABLE or VIXTTS_INSTANCE is None):
            return jsonify({'success': False, 'error': 'viXTTS model chưa sẵn sàng. Vui lòng thử lại sau vài phút.'}), 503
        
        # V2: Get base voice and adjustments (with defaults) - for RVC mode
        base_voice_id = request.form.get('base_voice_id', 'ly')
        pitch_adjustment = int(request.form.get('pitch_adjustment', 0))
        speed_adjustment = float(request.form.get('speed_adjustment', 1.0))
        energy_adjustment = float(request.form.get('energy_adjustment', 1.0))
        
        # Capitalize first letter (e.g., 'ly' -> 'Ly', 'binh' -> 'Binh')
        if base_voice_id:
            base_voice_id = base_voice_id.capitalize()
        
        # Validate file
        if not audio_file.filename:
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Save file — use absolute path so the file is always at WEB_DIR/uploads/...
        filename = f"{user_id}_{int(time.time())}_{secure_filename(audio_file.filename)}"
        upload_dir = str(WEB_DIR / "uploads" / "custom_voices" / f"user_{user_id}")
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, filename)
        audio_file.save(audio_path)
        
        # Validate audio
        audio_processor = get_audio_processor()
        if voice_type == 'vixtts_clone':
            # viXTTS Clone only needs 6–120 seconds of reference audio
            import librosa as _lb
            try:
                duration = _lb.get_duration(path=audio_path)
            except Exception:
                duration = 0
            if duration < 6:
                os.remove(audio_path)
                return jsonify({'success': False, 'error': 'Audio quá ngắn cho viXTTS Clone. Cần ít nhất 6 giây.'}), 400
            if duration > 120:
                os.remove(audio_path)
                return jsonify({'success': False, 'error': 'Audio quá dài cho viXTTS Clone. Tối đa 120 giây (2 phút).'}), 400
            is_valid, message = True, 'Audio hợp lệ'
        else:
            is_valid, message, duration = audio_processor.validate_audio(audio_path)
        
        if not is_valid:
            os.remove(audio_path)  # Remove invalid file
            return jsonify({'success': False, 'error': message}), 400
        
        # Check quality
        quality_score, quality_msg = audio_processor.check_audio_quality(audio_path)
        
        # Get file size
        file_size = os.path.getsize(audio_path)
        
        # Create voice record
        conn = get_db_connection()
        if not conn:
            os.remove(audio_path)
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        # Zero-shot / vixtts_clone: status='completed' immediately; RVC: status='pending' then training
        initial_status = 'completed' if voice_type in ('zero_shot', 'vixtts_clone') else 'pending'
        try:
            cursor.execute("""
                INSERT INTO custom_voices 
                (user_id, voice_name, description, sample_audio_path, sample_duration, 
                 sample_file_size, quality_score, status, base_voice_id, pitch_adjustment, 
                 speed_adjustment, energy_adjustment, voice_type, ref_transcript)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, voice_name, description, audio_path, int(duration), file_size, 
                  quality_score, initial_status, base_voice_id, pitch_adjustment, speed_adjustment, 
                  energy_adjustment, voice_type, ref_transcript if voice_type == 'zero_shot' else None))
        except Exception as db_err:
            # Fallback if voice_type/ref_transcript columns don't exist yet
            if 'voice_type' in str(db_err) or 'ref_transcript' in str(db_err):
                if voice_type == 'zero_shot':
                    conn.close()
                    os.remove(audio_path)
                    return jsonify({'success': False, 'error': 'Cần chạy migration Zero-shot (file custom_voices_zero_shot.sql) trong database để dùng chế độ Zero-shot.'}), 400
                cursor.execute("""
                    INSERT INTO custom_voices 
                    (user_id, voice_name, description, sample_audio_path, sample_duration, 
                     sample_file_size, quality_score, status, base_voice_id, pitch_adjustment, 
                     speed_adjustment, energy_adjustment)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s)
                """, (user_id, voice_name, description, audio_path, int(duration), file_size, 
                      quality_score, base_voice_id, pitch_adjustment, speed_adjustment, energy_adjustment))
                initial_status = 'pending'
            else:
                raise
        conn.commit()
        custom_voice_id = cursor.lastrowid
        conn.close()
        
        # Start training only for RVC mode
        if voice_type == 'rvc':
            training_service = get_training_service()
            result = training_service.start_training(custom_voice_id, user_id, audio_path)
            return jsonify({
                'success': True,
                'custom_voice_id': custom_voice_id,
                'voice_type': 'rvc',
                'training_mode': result.get('mode'),
                'message': result.get('message'),
                'quality_score': quality_score,
                'quality_message': quality_msg,
                'duration': duration
            })
        elif voice_type == 'vixtts_clone':
            return jsonify({
                'success': True,
                'custom_voice_id': custom_voice_id,
                'voice_type': 'vixtts_clone',
                'message': 'Giọng viXTTS Clone đã sẵn sàng. Bạn có thể dùng ngay.',
                'quality_score': quality_score,
                'quality_message': quality_msg,
                'duration': duration
            })
        else:
            return jsonify({
                'success': True,
                'custom_voice_id': custom_voice_id,
                'voice_type': 'zero_shot',
                'message': 'Giọng Zero-shot đã sẵn sàng. Bạn có thể dùng ngay.',
                'quality_score': quality_score,
                'quality_message': quality_msg,
                'duration': duration
            })
        
    except Exception as e:
        print(f"[ERROR] Upload custom voice failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/custom-voice/<int:voice_id>/progress')
@login_required
def get_training_progress(voice_id):
    """Get training progress (for realtime updates)"""
    user_id = session.get('user_id')
    
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, training_progress, error_message, quality_score
            FROM custom_voices 
            WHERE id = %s AND user_id = %s
        """, (voice_id, user_id))
        voice = cursor.fetchone()
        conn.close()
        
        if not voice:
            return jsonify({'error': 'Voice not found'}), 404
        
        return jsonify({
            'status': voice['status'],
            'progress': voice['training_progress'],
            'error': voice['error_message'],
            'quality_score': voice['quality_score']
        })
    except Exception as e:
        print(f"[ERROR] Get training progress failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-voice/<int:voice_id>/test', methods=['POST'])
@login_required
def test_custom_voice(voice_id):
    """Test custom voice with sample text"""
    user_id = session.get('user_id')
    
    try:
        data = request.get_json()
        text = data.get('text', 'Xin chào, đây là giọng custom của tôi.')
        
        # Verify ownership
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT model_file_path, status, voice_name, sample_audio_path,
                       base_voice_id, pitch_adjustment, speed_adjustment, energy_adjustment,
                       voice_type, ref_transcript
                FROM custom_voices 
                WHERE id = %s AND user_id = %s
            """, (voice_id, user_id))
        except Exception:
            cursor.execute("""
                SELECT model_file_path, status, voice_name, sample_audio_path,
                       base_voice_id, pitch_adjustment, speed_adjustment, energy_adjustment
                FROM custom_voices 
                WHERE id = %s AND user_id = %s
            """, (voice_id, user_id))
        voice = cursor.fetchone()
        if voice and 'voice_type' not in voice:
            voice['voice_type'] = 'rvc'
            voice['ref_transcript'] = None
        conn.close()
        
        if not voice:
            return jsonify({'error': 'Voice not found'}), 404
        
        if voice['status'] != 'completed':
            return jsonify({'error': 'Voice is not ready yet'}), 400
        
        # Test = Play sample audio OR generate with base/zero-shot
        test_text = (request.json.get('test_text') or request.json.get('text') or '').strip()
        
        # Giới hạn độ dài để không vượt context window (2048 tokens) của TTS
        TEST_TEXT_MAX_CHARS = 300
        if len(test_text) > TEST_TEXT_MAX_CHARS:
            test_text = test_text[:TEST_TEXT_MAX_CHARS]
            print(f"[TEST VOICE] Truncated test text to {TEST_TEXT_MAX_CHARS} chars")
        
        if not test_text:
            # No test text provided, just return sample audio URL
            sample_audio_path = voice.get('sample_audio_path', '')
            if sample_audio_path and os.path.exists(sample_audio_path):
                audio_url = '/' + sample_audio_path.replace('\\', '/')
                return jsonify({
                    'success': True,
                    'message': f'Đây là sample audio gốc của giọng: {voice["voice_name"]}',
                    'audio_url': audio_url,
                    'is_sample': True
                })
            else:
                return jsonify({'error': 'Sample audio not found'}), 404
        
        # Generate test audio: Zero-shot (ref_audio+ref_text) or RVC (base voice + adjustments)
        try:
            tts = get_tts_instance()
            if not tts:
                return jsonify({'error': 'TTS model not loaded'}), 500
            
            voice_type_cv = (voice.get('voice_type') or 'rvc').strip().lower()
            audio_filename = f"{uuid.uuid4()}_test.wav"
            audio_path = os.path.join(AUDIO_OUTPUT_DIR, audio_filename)
            
            if voice_type_cv == 'vixtts_clone':
                # viXTTS Clone: synthesize with user's voice reference directly to file
                pitch_adj, speed_adj = 0, 1.0
                ref_audio_path = resolve_audio_path(voice.get('sample_audio_path'))
                if not ref_audio_path or not os.path.exists(ref_audio_path):
                    return jsonify({'error': f'Không tìm thấy file audio mẫu của giọng viXTTS Clone: {ref_audio_path}'}), 400
                if not VIXTTS_EMOTIONAL_AVAILABLE or VIXTTS_INSTANCE is None or VIXTTS_INSTANCE.model is None:
                    return jsonify({'error': 'viXTTS model chưa sẵn sàng. Vui lòng thử lại sau vài phút.'}), 503
                print(f"[TEST VOICE viXTTS-Clone] ref_audio={ref_audio_path}")
                VIXTTS_INSTANCE.synthesize_with_voice(test_text, ref_audio_path, str(audio_path))
            else:
                try:
                    if voice_type_cv == 'zero_shot':
                        ref_audio_path = voice.get('sample_audio_path')
                        ref_text_zs = (voice.get('ref_transcript') or '').strip()
                        pitch_adj, speed_adj = 0, 1.0  # no adjustment for zero_shot
                        if ref_audio_path and os.path.exists(ref_audio_path) and ref_text_zs:
                            # Giới hạn ref_transcript
                            REF_TEXT_MAX_CHARS = 250
                            if len(ref_text_zs) > REF_TEXT_MAX_CHARS:
                                ref_text_zs = ref_text_zs[:REF_TEXT_MAX_CHARS]
                                print(f"[TEST VOICE Zero-shot] Truncated ref_transcript to {REF_TEXT_MAX_CHARS} chars")
                            # Mã hóa ref rồi cắt ref_codes để không vượt context 2048 (audio mẫu dài = rất nhiều token)
                            REF_CODES_MAX_FRAMES = 40
                            ref_codes_full = tts.encode_reference(ref_audio_path)
                            import numpy as np
                            if hasattr(ref_codes_full, 'cpu'):
                                ref_codes_full = ref_codes_full.cpu().numpy()
                            ref_codes_full = np.asarray(ref_codes_full).flatten()
                            ref_codes_short = ref_codes_full[:REF_CODES_MAX_FRAMES].tolist()
                            print(f"[TEST VOICE Zero-shot] ref_audio={ref_audio_path}, ref_codes frames: {len(ref_codes_full)} -> {len(ref_codes_short)}")
                            audio = tts.infer(text=test_text, ref_codes=ref_codes_short, ref_text=ref_text_zs, max_chars=150)
                        else:
                            return jsonify({'error': 'Zero-shot thiếu ref_audio hoặc ref_transcript'}), 400
                    else:
                        base_voice_id = voice.get('base_voice_id', 'ly')
                        pitch_adj = voice.get('pitch_adjustment', 0)
                        speed_adj = voice.get('speed_adjustment', 1.0)
                        tts_voice_id = base_voice_id
                        if tts_voice_id and str(tts_voice_id).endswith('HM'):
                            tts_voice_id = tts_voice_id[:-2]
                        if tts_voice_id:
                            tts_voice_id = str(tts_voice_id).capitalize()
                        voice_data = tts.get_preset_voice(tts_voice_id) if tts_voice_id else None
                        audio = tts.infer(text=test_text, voice=voice_data, max_chars=256)
                except ValueError as ve:
                    if 'context window' in str(ve) or 'exceed' in str(ve).lower():
                        return jsonify({
                            'error': 'Giới hạn model (2048 token) bị vượt. Với Zero-shot: dùng file mẫu ngắn (vài giây) và transcript ngắn; văn bản test giữ dưới 300 ký tự.'
                        }), 400
                    raise
                
                tts.save(audio, str(audio_path))
            
            # Apply speed adjustment if needed
            if speed_adj != 1.0:
                try:
                    import librosa
                    import soundfile as sf
                    print(f"[TEST VOICE] Applying speed adjustment: {speed_adj}x")
                    
                    # Load audio
                    audio_data, sr = librosa.load(audio_path, sr=None)
                    
                    # Change speed
                    audio_adjusted = librosa.effects.time_stretch(audio_data, rate=speed_adj)
                    
                    # Save adjusted audio
                    sf.write(audio_path, audio_adjusted, sr)
                    print(f"[TEST VOICE] Speed adjustment applied successfully")
                except Exception as e:
                    print(f"[WARNING] Could not apply speed adjustment: {e}")
            
            # Apply pitch adjustment if needed
            if pitch_adj != 0:
                try:
                    rvc_processor = get_rvc_processor()
                    if rvc_processor.is_available():
                        adjusted_path = audio_path.replace('.wav', '_adjusted.wav')
                        success, msg, output_path = rvc_processor.adjust_voice(
                            audio_path, adjusted_path, pitch=pitch_adj
                        )
                        if success and output_path:
                            os.remove(audio_path)
                            audio_path = output_path
                            audio_filename = os.path.basename(audio_path)
                except Exception as e:
                    print(f"[WARNING] Could not apply pitch adjustment: {e}")
            
            audio_url = url_for('get_audio', filename=audio_filename)
            
            return jsonify({
                'success': True,
                'message': f'Test thành công với giọng: {voice["voice_name"]}',
                'audio_url': audio_url,
                'is_sample': False
            })
            
        except Exception as e:
            print(f"[ERROR] Test voice generation failed: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Lỗi tạo audio test: {str(e)}'}), 500
        
    except Exception as e:
        print(f"[ERROR] Test custom voice failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-voice/<int:voice_id>/delete', methods=['DELETE'])
@login_required
def delete_custom_voice(voice_id):
    """Delete custom voice"""
    user_id = session.get('user_id')
    
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Verify ownership
        cursor.execute("""
            SELECT sample_audio_path, model_file_path, index_file_path
            FROM custom_voices 
            WHERE id = %s AND user_id = %s
        """, (voice_id, user_id))
        voice = cursor.fetchone()
        
        if not voice:
            conn.close()
            return jsonify({'error': 'Voice not found'}), 404
        
        # Delete files
        for file_path in [voice.get('sample_audio_path'), voice.get('model_file_path'), voice.get('index_file_path')]:
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"[WARNING] Could not delete file {file_path}: {e}")
        
        # Delete from database
        cursor.execute("DELETE FROM custom_voices WHERE id = %s", (voice_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Voice deleted successfully'})
        
    except Exception as e:
        print(f"[ERROR] Delete custom voice failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-voices/list')
@login_required
def list_custom_voices():
    """List user's custom voices"""
    user_id = session.get('user_id')
    
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id, voice_name, status, quality_score, created_at, usage_count, voice_type
                FROM custom_voices 
                WHERE user_id = %s AND status = 'completed'
                ORDER BY created_at DESC
            """, (user_id,))
        except Exception:
            cursor.execute("""
                SELECT id, voice_name, status, quality_score, created_at, usage_count
                FROM custom_voices 
                WHERE user_id = %s AND status = 'completed'
                ORDER BY created_at DESC
            """, (user_id,))
        voices = cursor.fetchall()
        conn.close()
        
        # Convert to JSON-serializable format
        voices_list = []
        for voice in voices:
            voices_list.append({
                'id': voice['id'],
                'name': voice['voice_name'],
                'status': voice['status'],
                'quality_score': float(voice['quality_score']) if voice['quality_score'] else 0,
                'created_at': voice['created_at'].isoformat() if voice['created_at'] else None,
                'usage_count': voice['usage_count'],
                'voice_type': (voice.get('voice_type') or 'rvc').strip().lower()
            })
        
        return jsonify({'success': True, 'voices': voices_list})
        
    except Exception as e:
        print(f"[ERROR] List custom voices failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/worker/status')
@login_required
def worker_status():
    """Get background worker status (admin only)"""
    user_role = session.get('user_role')
    
    if user_role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        if not CUSTOM_VOICE_AVAILABLE:
            return jsonify({'error': 'Custom voice feature not available'}), 503
        
        status = get_worker_status()
        return jsonify(status)
        
    except Exception as e:
        print(f"[ERROR] Get worker status failed: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== END CUSTOM VOICE ROUTES ====================

# ==================== PAYMENT STATUS & NOTIFICATION ROUTES ====================

@app.route('/api/payment/status/<int:payment_id>')
def check_payment_status(payment_id):
    """
    Kiểm tra trạng thái thanh toán - có auto-verify qua SePay API nếu còn pending.
    Frontend polls endpoint này mỗi 5 giây.
    """
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.package_name, sp.characters_limit, sp.price_vnd, sp.duration_days,
                       u.username, u.full_name
                FROM payments p
                JOIN subscription_packages sp ON p.package_id = sp.id
                JOIN users u ON p.user_id = u.id
                WHERE p.id = %s AND p.user_id = %s
            """, (payment_id, session['user_id']))
            
            payment = cursor.fetchone()
            if not payment:
                return jsonify({'success': False, 'message': 'Không tìm thấy thanh toán'}), 404
            
            # Nếu PENDING → thử auto-verify qua SePay API ngay
            if payment['payment_status'] == 'pending':
                verification = verify_sepay_transaction(
                    payment['transaction_id'],
                    payment['amount_vnd']
                )
                
                if verification.get('verified'):
                    # Tìm thấy giao dịch trên SePay → auto-approve
                    cursor.execute("""
                        UPDATE payments
                        SET payment_status = 'completed',
                            bank_transaction_id = %s,
                            description = 'Auto-verified via SePay API polling',
                            completed_at = NOW()
                        WHERE id = %s AND payment_status = 'pending'
                    """, (payment['transaction_id'], payment_id))
                    
                    conn.commit()
                    
                    # Cộng ký tự cho user
                    update_user_subscription(
                        session['user_id'],
                        payment['characters_limit'],
                        payment['duration_days']
                    )
                    
                    print(f"[POLL-AUTO] Payment {payment_id} auto-approved for user {session.get('username')}")
                    
                    # Re-fetch updated status
                    payment['payment_status'] = 'completed'
            
            # Lấy thông tin ký tự nếu đã completed
            characters_info = None
            if payment['payment_status'] == 'completed':
                cursor.execute("""
                    SELECT characters_limit, characters_used,
                           (characters_limit - COALESCE(characters_used, 0)) AS characters_remaining,
                           end_date
                    FROM user_subscriptions
                    WHERE user_id = %s AND is_active = 1
                    ORDER BY created_at DESC LIMIT 1
                """, (session['user_id'],))
                sub_info = cursor.fetchone()
                
                if sub_info:
                    characters_info = {
                        'characters_remaining': int(sub_info['characters_remaining'] or 0),
                        'subscription_expires_at': sub_info['end_date'].isoformat() if sub_info['end_date'] else None
                    }
            
            return jsonify({
                'success': True,
                'payment': {
                    'id': payment['id'],
                    'transaction_id': payment['transaction_id'],
                    'status': payment['payment_status'],
                    'amount': payment['amount_vnd'],
                    'created_at': payment['created_at'].isoformat(),
                    'package_info': {
                        'name': payment['package_name'],
                        'characters': payment['characters_limit'],
                        'price': payment['price_vnd'],
                        'duration': payment['duration_days']
                    }
                },
                'user_characters': characters_info
            })
            
    except Exception as e:
        print(f"[ERROR] Check payment status error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()


@app.route('/api/user/characters')
def get_user_characters():
    """Lấy thông tin ký tự còn lại của user"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT characters_limit, characters_used,
                       (characters_limit - COALESCE(characters_used, 0)) AS characters_remaining,
                       end_date, created_at, updated_at
                FROM user_subscriptions
                WHERE user_id = %s AND is_active = 1
                ORDER BY created_at DESC LIMIT 1
            """, (session['user_id'],))
            
            subscription = cursor.fetchone()
            
            if subscription:
                return jsonify({
                    'success': True,
                    'characters_remaining': int(subscription['characters_remaining'] or 0),
                    'subscription_expires_at': subscription['end_date'].isoformat() if subscription['end_date'] else None,
                    'last_updated': subscription['updated_at'].isoformat() if subscription['updated_at'] else None
                })
            else:
                return jsonify({
                    'success': True,
                    'characters_remaining': 0,
                    'subscription_expires_at': None,
                    'last_updated': None
                })
                
    except Exception as e:
        print(f"[ERROR] Get user characters error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()


@app.route('/api/payment/verify/<transaction_id>')
def manual_verify_payment(transaction_id):
    """Manual verification endpoint for payment"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Kiểm tra payment thuộc về user hiện tại
            cursor.execute("""
                SELECT id, payment_status, user_id, package_id, amount_vnd
                FROM payments
                WHERE transaction_id = %s AND user_id = %s
            """, (transaction_id, session['user_id']))
            
            payment = cursor.fetchone()
            if not payment:
                return jsonify({'success': False, 'message': 'Không tìm thấy thanh toán'}), 404
            
            if payment['payment_status'] == 'completed':
                return jsonify({
                    'success': True,
                    'already_verified': True,
                    'message': 'Thanh toán đã được xác nhận thành công'
                })
            
            # Verify với SePay
            verify_result = verify_sepay_transaction(transaction_id, payment['amount_vnd'])
            
            if verify_result['verified']:
                # Update payment status và user subscription
                update_result = update_user_subscription(payment['id'], payment['user_id'], payment['package_id'])
                
                if update_result['success']:
                    return jsonify({
                        'success': True,
                        'verified': True,
                        'message': '🎉 Thanh toán đã được xác nhận! Bạn đã nhận thêm ký tự vào tài khoản.',
                        'characters_added': update_result.get('characters_added'),
                        'total_characters': update_result.get('total_characters')
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': f'Lỗi cập nhật tài khoản: {update_result.get("error")}'
                    })
            else:
                return jsonify({
                    'success': True,
                    'verified': False,
                    'message': 'Thanh toán chưa được xác nhận. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.'
                })
                
    except Exception as e:
        print(f"[ERROR] Manual verify payment error: {e}")
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        conn.close()

# ==================== END PAYMENT STATUS & NOTIFICATION ROUTES ====================

def run_db_migrations():
    """Tự động thêm các cột mới vào DB nếu chưa tồn tại (idempotent)."""
    migrations = [
        # (table, column, definition)
        ('conversions', 'display_name', 'VARCHAR(200) NULL DEFAULT NULL AFTER voice_name'),
        ('conversions', 'is_public',    'TINYINT(1) NOT NULL DEFAULT 0'),
        ('conversions', 'share_token',  'VARCHAR(64) NULL DEFAULT NULL'),
    ]
    conn = get_db_connection()
    if not conn:
        print("[MIGRATION] ⚠️  Không kết nối được DB — bỏ qua migration")
        return
    try:
        with conn.cursor() as cursor:
            db_name = DB_CONFIG['database']
            for table, column, definition in migrations:
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
                """, (db_name, table, column))
                exists = cursor.fetchone()['cnt'] > 0
                if not exists:
                    cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {definition}")
                    conn.commit()
                    print(f"[MIGRATION] ✅ Đã thêm cột '{column}' vào bảng '{table}'")
                else:
                    print(f"[MIGRATION] ✓  Cột '{column}' trong '{table}' đã tồn tại")

            # Thêm index cho share_token nếu chưa có
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'conversions' AND INDEX_NAME = 'idx_share_token'
            """, (db_name,))
            if cursor.fetchone()['cnt'] == 0:
                cursor.execute("ALTER TABLE conversions ADD INDEX idx_share_token (share_token)")
                conn.commit()
                print("[MIGRATION] ✅ Đã thêm index 'idx_share_token'")
    except Exception as e:
        print(f"[MIGRATION] ❌ Lỗi migration: {e}")
    finally:
        conn.close()


if __name__ == '__main__':
    print("=" * 60)
    print("[TTS] TTS Web Application dang khoi dong...")
    print("[TTS] URL: http://localhost:5000")
    print("[TTS] Port: 5000")
    print("=" * 60)

    # Chạy DB migration tự động
    print("[MIGRATION] Kiểm tra và cập nhật cấu trúc database...")
    run_db_migrations()
    
    # Start background worker for custom voice training
    try:
        if CUSTOM_VOICE_AVAILABLE:
            from background_worker import start_worker
            success = start_worker()
            if success:
                print("[WORKER] ✅ Background training worker started")
            else:
                print("[WORKER] ⚠️ Worker already running")
    except Exception as e:
        print(f"[WORKER] ❌ Failed to start worker: {e}")
    
    # Pre-load viXTTS Emotional TTS để user không phải chờ lần đầu
    if VIXTTS_EMOTIONAL_AVAILABLE:
        try:
            print("\n" + "=" * 60)
            print("[viXTTS] 🚀 ĐANG LOAD EMOTIONAL TTS MODEL...")
            print("[viXTTS] Vui lòng đợi, server sẽ sẵn sàng sau 30-45 giây")
            print("[viXTTS] (Lần đầu tiên sẽ download model ~2GB)")
            print("=" * 60 + "\n")
            
            VIXTTS_INSTANCE = get_vixtts_emotional_instance()
            VIXTTS_INSTANCE.load_model()  # Load model ngay
            
            print("\n" + "=" * 60)
            print("[viXTTS] ✅ MODEL ĐÃ SẴN SÀNG!")
            print("[viXTTS] User có thể sử dụng ngay không cần chờ")
            print("[viXTTS] Model sẽ được giữ trong RAM cho đến khi restart")
            print("=" * 60 + "\n")
        except Exception as e:
            import traceback
            VIXTTS_INSTANCE = None
            print(f"\n[viXTTS] ❌ Pre-load FAILED: {e}")
            print(f"[viXTTS] Traceback:\n{traceback.format_exc()}")
            print("[viXTTS] Model sẽ được load khi có request đầu tiên\n")
    
    # Check readiness status
    is_ready = VIXTTS_INSTANCE is not None and VIXTTS_INSTANCE.model is not None if VIXTTS_EMOTIONAL_AVAILABLE else False
    
    print("=" * 60)
    print("[TTS] 🎉 SERVER READY - SẴN SÀNG PHỤC VỤ!")
    print("[TTS] URL: http://127.0.0.1:5000")
    print("[TTS] Emotional TTS: " + ("✅ Sẵn sàng" if is_ready else "❌ Không khả dụng"))
    if SMTP_HOST and SMTP_USER:
        print(f"[EMAIL] SMTP: ✅ {SMTP_USER} @ {SMTP_HOST}:{SMTP_PORT}")
    else:
        print("[EMAIL] SMTP: ❌ Chưa cấu hình (thêm SMTP_* vào .env.local để gửi email thật)")
    print("[TTS] Nhấn Ctrl+C để dừng server")
    print("=" * 60)
    print()
    
    # Chạy Flask với cấu hình tối ưu
    # use_reloader=False để tránh reload loop với PyTorch
    port = int(os.environ.get('PORT', 5000))
    is_production = os.environ.get('FLASK_ENV') == 'production'
    app.run(debug=not is_production, host='0.0.0.0', port=port, use_reloader=False, threaded=True)
