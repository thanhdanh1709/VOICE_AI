"""
Configuration file for TTS Web Application
Secrets duoc doc tu environment variables - KHONG hardcode.
"""
import os
from pathlib import Path

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