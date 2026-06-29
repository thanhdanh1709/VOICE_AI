"""
Configuration file for TTS Web Application
Secrets duoc doc tu environment variables - KHONG hardcode.
"""
import os
from pathlib import Path

# Load env files nếu tồn tại (ưu tiên .env.local, rồi .env)
def _load_env_file(path):
    """Đọc file .env thủ công, không ghi đè biến đã có."""
    try:
        with open(path, 'r', encoding='utf-8') as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    _v = _v.strip()
                    if ' #' in _v:
                        _v = _v.split(' #', 1)[0].strip()
                    os.environ.setdefault(_k.strip(), _v)
    except Exception:
        pass

_base = Path(__file__).resolve().parent
for _env_name in ('.env.local', '.env'):
    _env_path = _base / _env_name
    if _env_path.exists():
        _load_env_file(_env_path)
        break

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration
DB_CONFIG = {
    'host':     os.environ.get('DB_HOST', 'localhost'),
    'port':     int(os.environ.get('DB_PORT', 3306)),
    'user':     os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'tts_system'),
    'charset':  'utf8mb4'
}


def mysql_connect_kwargs(**extra):
    """Tham so pymysql.connect — tu dong bat SSL cho Azure MySQL."""
    import ssl

    kwargs = {
        'host': DB_CONFIG['host'],
        'port': DB_CONFIG['port'],
        'user': DB_CONFIG['user'],
        'password': DB_CONFIG['password'],
        'database': DB_CONFIG['database'],
        'charset': DB_CONFIG['charset'],
    }
    kwargs.update(extra)

    host = kwargs.get('host') or ''
    use_ssl = os.environ.get('DB_SSL', 'auto').strip().lower()
    needs_ssl = (
        use_ssl in ('1', 'true', 'yes', 'required')
        or (use_ssl == 'auto' and 'database.azure.com' in host)
    )
    if needs_ssl:
        ctx = ssl.create_default_context()
        ca_path = os.environ.get('DB_SSL_CA', '').strip()
        if ca_path and Path(ca_path).is_file():
            ctx.load_verify_locations(ca_path)
        else:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        kwargs['ssl'] = ctx
    return kwargs

# Flask configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.environ.get('FLASK_ENV', 'development') != 'production'

# File paths
UPLOAD_DIR       = BASE_DIR / 'web' / 'uploads'
AUDIO_OUTPUT_DIR = BASE_DIR / 'web' / 'audio_outputs'
TTS_SCRIPT_PATH  = BASE_DIR / 'VieNeu-TTS-main' / 'main.py'

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_TEXT_EXTENSIONS  = {'txt', 'pdf', 'docx'}
ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3'}

# Session configuration
SESSION_TYPE = 'filesystem'
PERMANENT_SESSION_LIFETIME = 86400  # 24 hours

# Google OAuth - set via environment variables
GOOGLE_CLIENT_ID     = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

# SePay Payment Gateway - set via environment variables
SEPAY_API_URL        = os.environ.get('SEPAY_API_URL', 'https://my.sepay.vn/userapi/transactions')
SEPAY_TOKEN          = os.environ.get('SEPAY_TOKEN', '')
SEPAY_ACCOUNT_NUMBER = os.environ.get('SEPAY_ACCOUNT_NUMBER', '')
SEPAY_BANK_ID        = os.environ.get('SEPAY_BANK_ID', 'MBBank')
SEPAY_TIMEOUT        = int(os.environ.get('SEPAY_TIMEOUT', '300'))

# QR Code API
SEPAY_QR_API = 'https://img.vietqr.io/image'

# Bank Transfer Configuration
BANK_NAME           = os.environ.get('BANK_NAME', 'MBBank')
BANK_ACCOUNT_NUMBER = os.environ.get('BANK_ACCOUNT_NUMBER', '')
BANK_ACCOUNT_NAME   = os.environ.get('BANK_ACCOUNT_NAME', 'TTS SYSTEM')
BANK_BRANCH         = os.environ.get('BANK_BRANCH', 'Can Tho')

# Email (SMTP) — quên mật khẩu, yêu cầu xóa tài khoản
SMTP_HOST     = os.environ.get('SMTP_HOST', os.environ.get('MAIL_SERVER', ''))
SMTP_PORT     = int(os.environ.get('SMTP_PORT', os.environ.get('MAIL_PORT', 587)))
SMTP_USER     = os.environ.get('SMTP_USER', os.environ.get('MAIL_USERNAME', ''))
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', os.environ.get('MAIL_PASSWORD', ''))
SMTP_FROM     = os.environ.get('SMTP_FROM', os.environ.get('MAIL_DEFAULT_SENDER', SMTP_USER))
_smtp_use_tls = os.environ.get('SMTP_USE_TLS', os.environ.get('MAIL_USE_TLS', '')).lower()
_smtp_use_ssl = os.environ.get('SMTP_USE_SSL', os.environ.get('MAIL_USE_SSL', '')).lower()
SMTP_USE_SSL  = _smtp_use_ssl in ('1', 'true', 'yes') or (_smtp_use_tls not in ('1', 'true', 'yes') and SMTP_PORT == 465)
ADMIN_EMAIL   = os.environ.get('ADMIN_EMAIL', '')
APP_BASE_URL  = os.environ.get('APP_BASE_URL', '')

# LLM translation (UI i18n — key only on backend)
OPENAI_API_KEY  = os.environ.get('OPENAI_API_KEY', '')
OPENAI_API_BASE = os.environ.get('OPENAI_API_BASE', 'https://api.openai.com')
OPENAI_MODEL    = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')