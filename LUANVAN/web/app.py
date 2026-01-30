"""
TTS Web Application - Flask Backend
Ung dung web chuyen van ban thanh giong noi su dung Flask
"""
import os
import sys
import traceback
import time

# Set UTF-8 encoding for console output on Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
from pathlib import Path
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pymysql
import uuid

# Thêm đường dẫn VieNeu-TTS-main vào sys.path để import Vieneu
BASE_DIR = Path(__file__).resolve().parent.parent
VieNeu_TTS_DIR = BASE_DIR / 'VieNeu-TTS-main'
if str(VieNeu_TTS_DIR) not in sys.path:
    sys.path.insert(0, str(VieNeu_TTS_DIR))

from config import DB_CONFIG, UPLOAD_DIR, AUDIO_OUTPUT_DIR, BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME, BANK_BRANCH
import qrcode
import io
import base64

# Import RVC wrapper for voice conversion
try:
    from rvc_wrapper import get_rvc_processor
    RVC_AVAILABLE = True
    print("[INFO] RVC voice conversion is available")
except ImportError as e:
    RVC_AVAILABLE = False
    print(f"[WARNING] RVC not available: {e}")

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
app.secret_key = 'dev-secret-key-change-in-production'

# Request logging
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
            cursorclass=pymysql.cursors.DictCursor
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

def get_user_characters_limit(user_id):
    """Lấy giới hạn ký tự của user"""
    conn = get_db_connection()
    if not conn:
        return None
    
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
        return None
    finally:
        conn.close()

def check_characters_limit(user_id, text_length):
    """Kiểm tra xem user có đủ ký tự để convert không"""
    limit_info = get_user_characters_limit(user_id)
    if not limit_info:
        return False, "Không thể kiểm tra giới hạn ký tự"
    
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
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Đăng nhập"""
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE username = %s AND is_active = 1", (username,))
                user = cursor.fetchone()
                
                if user and check_password_hash(user['password'], password):
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['user_role'] = user['role']
                    session['full_name'] = user['full_name']
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
    
    return render_template('login.html')

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
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    """Đăng xuất"""
    session.clear()
    return redirect(url_for('login'))

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
        
        # Save conversion to database
        conn = get_db_connection()
        if conn:
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
            voice_data = tts.get_preset_voice(voice_id) if voice_id else None
            print(f"[CONVERT] Voice data obtained: {voice_id}")
        except Exception as voice_error:
            print(f"[WARNING] Could not get preset voice {voice_id}, using None: {voice_error}")
            voice_data = None
        
        print(f"[CONVERT] Converting text to speech (length: {len(text)} chars)...")
        try:
            audio = tts.infer(text=text, voice=voice_data if voice_data else None)
            
            # Calculate duration from audio shape
            duration_seconds = 0
            sample_rate = getattr(tts, 'sample_rate', 24000)
            
            # Log audio information
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
                    cursor.execute("SELECT voice_name FROM voices WHERE voice_id = %s", (voice_id,))
                    result = cursor.fetchone()
                    if result:
                        voice_name = result['voice_name']
            except Exception as e:
                print(f"[ERROR] Error getting voice name: {e}")
        
        # Update conversion in database
        if conn and conversion_id:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """UPDATE conversions SET 
                           audio_file_path = %s, audio_file_size = %s, voice_name = %s,
                           duration_seconds = %s, status = 'completed', completed_at = NOW()
                           WHERE id = %s""",
                        (str(output_path), file_size, voice_name, duration_seconds, conversion_id)
                    )
                    conn.commit()
                    print(f"[CONVERT] Updated conversion record: ID={conversion_id}, duration={duration_seconds:.2f}s, size={file_size} bytes")
                    
                    # Cập nhật số ký tự đã sử dụng
                    update_characters_used(session['user_id'], text_length)
            except Exception as e:
                print(f"[ERROR] Error updating conversion: {e}")
        
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
        
        # Update status to failed
        if conn and conversion_id:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("UPDATE conversions SET status = 'failed' WHERE id = %s", (conversion_id,))
                    conn.commit()
            except Exception as db_error:
                print(f"[ERROR] Error updating failed status: {db_error}")
        
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

@app.route('/pricing')
def pricing():
    """Trang thanh toán"""
    if not is_logged_in():
        return redirect(url_for('login'))
    return render_template('pricing.html')

@app.route('/contact')
def contact():
    """Trang liên hệ"""
    return render_template('contact.html')

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
    return render_template('audio_library.html')

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
            
            # Search filter
            if search:
                query += " AND text_input LIKE %s"
                params.append(f'%{search}%')
            
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
            
            # Convert datetime to string
            for audio in audios:
                if audio['created_at']:
                    audio['created_at'] = audio['created_at'].isoformat()
                if audio['completed_at']:
                    audio['completed_at'] = audio['completed_at'].isoformat()
            
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
    """Tạo payment request"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    package_id = data.get('package_id')
    payment_method = 'bank_qr'  # Chỉ hỗ trợ chuyển khoản ngân hàng QR
    
    if not package_id:
        return jsonify({'success': False, 'message': 'Thiếu thông tin thanh toán'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            # Lấy thông tin package
            cursor.execute("""
                SELECT id, package_name, characters_limit, price_vnd, duration_days
                FROM subscription_packages
                WHERE id = %s AND is_active = 1
            """, (package_id,))
            package = cursor.fetchone()
            
            if not package:
                return jsonify({'success': False, 'message': 'Gói thanh toán không tồn tại'}), 404
            
            # Tạo payment record
            transaction_id = f"TTS_{uuid.uuid4().hex[:16].upper()}"
            cursor.execute("""
                INSERT INTO payments (user_id, package_id, amount_vnd, payment_method, payment_status, transaction_id)
                VALUES (%s, %s, %s, %s, 'pending', %s)
            """, (session['user_id'], package_id, package['price_vnd'], payment_method, transaction_id))
            payment_id = cursor.lastrowid
            conn.commit()
            
            # Lấy thông tin user để tạo nội dung chuyển khoản
            cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (session['user_id'],))
            user = cursor.fetchone()
            user_name = user['full_name'] or user['username'] if user else 'User'
            
            # Tạo QR code cho chuyển khoản ngân hàng
            qr_data = create_bank_transfer_qr(
                package['price_vnd'], 
                transaction_id, 
                package['package_name'],
                user_name
            )
            return jsonify({
                'success': True,
                'payment_id': payment_id,
                'transaction_id': transaction_id,
                'qr_code': qr_data['qr_image'],
                'bank_info': qr_data['bank_info'],
                'payment_type': 'qr'
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
    """Xác nhận đã chuyển khoản (manual verification)"""
    if not is_logged_in():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    payment_id = data.get('payment_id')
    transaction_proof = data.get('transaction_proof', '')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.id = %s AND p.user_id = %s AND p.payment_method = 'bank_qr'
            """, (payment_id, session['user_id']))
            payment = cursor.fetchone()
            
            if not payment:
                return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
            if payment['payment_status'] == 'completed':
                return jsonify({'success': False, 'message': 'Payment đã được xác nhận'}), 400
            
            # Cập nhật payment với thông tin xác nhận (chờ admin duyệt)
            cursor.execute("""
                UPDATE payments
                SET payment_status = 'pending',
                    bank_transaction_id = %s,
                    description = %s
                WHERE id = %s
            """, (transaction_proof, f'Đã chuyển khoản - Tham chiếu: {transaction_proof}', payment_id))
            conn.commit()
            
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

# ==================== CUSTOM VOICE ROUTES ====================

@app.route('/my-voices')
@login_required
def my_voices():
    """Page: My custom voices"""
    user_id = session.get('user_id')
    
    try:
        conn = get_db_connection()
        if not conn:
            return render_template('my_voices.html', voices=[], error="Database connection failed")
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM custom_voices 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """, (user_id,))
        voices = cursor.fetchall()
        conn.close()
        
        return render_template('my_voices.html', voices=voices)
    except Exception as e:
        print(f"[ERROR] My voices page error: {e}")
        import traceback
        traceback.print_exc()
        return render_template('my_voices.html', voices=[], error=str(e))

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
        
        # Get file
        if 'audio_file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        audio_file = request.files['audio_file']
        voice_name = request.form.get('voice_name', 'Untitled Voice')
        description = request.form.get('description', '')
        
        # Validate file
        if not audio_file.filename:
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Save file
        filename = f"{user_id}_{int(time.time())}_{secure_filename(audio_file.filename)}"
        upload_dir = os.path.join("uploads", "custom_voices", f"user_{user_id}")
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, filename)
        audio_file.save(audio_path)
        
        # Validate audio
        audio_processor = get_audio_processor()
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
        cursor.execute("""
            INSERT INTO custom_voices 
            (user_id, voice_name, description, sample_audio_path, sample_duration, 
             sample_file_size, quality_score, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
        """, (user_id, voice_name, description, audio_path, int(duration), file_size, quality_score))
        conn.commit()
        custom_voice_id = cursor.lastrowid
        conn.close()
        
        # Start training
        training_service = get_training_service()
        result = training_service.start_training(custom_voice_id, user_id, audio_path)
        
        return jsonify({
            'success': True,
            'custom_voice_id': custom_voice_id,
            'training_mode': result.get('mode'),
            'message': result.get('message'),
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
        cursor.execute("""
            SELECT model_file_path, status, voice_name
            FROM custom_voices 
            WHERE id = %s AND user_id = %s
        """, (voice_id, user_id))
        voice = cursor.fetchone()
        conn.close()
        
        if not voice:
            return jsonify({'error': 'Voice not found'}), 404
        
        if voice['status'] != 'completed':
            return jsonify({'error': 'Voice is not ready yet'}), 400
        
        # TODO: Integrate with TTS to generate audio
        # For now, return success
        
        return jsonify({
            'success': True,
            'message': f'Test thành công với giọng: {voice["voice_name"]}',
            'audio_url': '#'  # TODO: Generate actual audio
        })
        
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
                'usage_count': voice['usage_count']
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

# Start background worker when app starts
@app.before_first_request
def start_background_worker():
    """Start background worker for training queue"""
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

# ==================== END CUSTOM VOICE ROUTES ====================

if __name__ == '__main__':
    print("=" * 60)
    print("[TTS] TTS Web Application dang khoi dong...")
    print("[TTS] URL: http://localhost:5000")
    print("[TTS] Port: 5000")
    print("=" * 60)
    
    # Không pre-initialize TTS để khởi động nhanh hơn
    # TTS sẽ được khởi tạo lazy khi có request đầu tiên cần dùng
    print("[TTS] Server ready!")
    print("[TTS] TTS engine se duoc khoi tao tu dong khi can")
    print("[TTS] Nhan Ctrl+C de dung server")
    print("=" * 60)
    print()
    
    # Chạy Flask với cấu hình tối ưu
    # use_reloader=False để tránh reload loop với PyTorch
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
