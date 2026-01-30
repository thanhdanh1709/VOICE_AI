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

# Bank Transfer QR Code Configuration
BANK_NAME = os.environ.get('BANK_NAME') or 'TpBank'  # Tên ngân hàng
BANK_ACCOUNT_NUMBER = os.environ.get('BANK_ACCOUNT_NUMBER') or '07083380401'  # Số tài khoản
BANK_ACCOUNT_NAME = os.environ.get('BANK_ACCOUNT_NAME') or 'VO THANH DANH'  # Tên chủ TK
BANK_BRANCH = os.environ.get('BANK_BRANCH') or 'Cần Thơ'  # Chi nhánh ngân hàng
