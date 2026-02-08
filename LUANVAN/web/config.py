"""
Configuration file for TTS Web Application
Cấu hình cho ứng dụng web TTS
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration (XAMPP MySQL)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # XAMPP mặc định không có password
    'database': 'tts_system',
    'charset': 'utf8mb4'
}

# Flask configuration
SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
DEBUG = True

# File paths
UPLOAD_DIR = BASE_DIR / 'web' / 'uploads'
AUDIO_OUTPUT_DIR = BASE_DIR / 'web' / 'audio_outputs'
TTS_SCRIPT_PATH = BASE_DIR / 'VieNeu-TTS-main' / 'main.py'

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_TEXT_EXTENSIONS = {'txt', 'pdf', 'docx'}
ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3'}

# Session configuration
SESSION_TYPE = 'filesystem'
PERMANENT_SESSION_LIFETIME = 86400  # 24 hours

# SePay.vn Payment Gateway Configuration
SEPAY_API_URL = os.environ.get('SEPAY_API_URL') or 'https://my.sepay.vn/userapi/transactions'
SEPAY_TOKEN = os.environ.get('SEPAY_TOKEN') or '8A4IL0IHUPITRUESGNYGR1FPQ9HELNB5E6YZKUJYRYOWWVHDXOQJLOKAABEFT7SK'  # Token từ SePay
SEPAY_ACCOUNT_NUMBER = os.environ.get('SEPAY_ACCOUNT_NUMBER') or '0866005541'  # Số tài khoản SePay
SEPAY_BANK_ID = os.environ.get('SEPAY_BANK_ID') or 'MBBank'  # ID ngân hàng trong SePay
SEPAY_TIMEOUT = int(os.environ.get('SEPAY_TIMEOUT') or '300')  # Timeout thanh toán (giây)

# SePay QR Code Generation
SEPAY_QR_API = 'https://img.vietqr.io/image'

# Bank Transfer QR Code Configuration (Backup method)
BANK_NAME = os.environ.get('BANK_NAME') or 'MBBank'  # Tên ngân hàng
BANK_ACCOUNT_NUMBER = os.environ.get('BANK_ACCOUNT_NUMBER') or '0866005541'  # Số tài khoản
BANK_ACCOUNT_NAME = os.environ.get('BANK_ACCOUNT_NAME') or 'TTS SYSTEM'  # Tên chủ TK
BANK_BRANCH = os.environ.get('BANK_BRANCH') or 'Cần Thơ'  # Chi nhánh ngân hàng
