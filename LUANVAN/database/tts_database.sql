-- Database: TTS (Text to Speech) System
-- Tạo database cho hệ thống chuyển văn bản thành giọng nói
DROP DATABASE IF EXISTS tts_system;

CREATE DATABASE IF NOT EXISTS tts_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tts_system;

-- Bảng người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lịch sử chuyển đổi (Conversion History)
CREATE TABLE IF NOT EXISTS conversions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    text_input TEXT NOT NULL,
    text_length INT,
    voice_id VARCHAR(50) NOT NULL,
    voice_name VARCHAR(100),
    audio_file_path VARCHAR(255),
    audio_file_size INT,
    duration_seconds FLOAT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status),
    FULLTEXT idx_text_input (text_input)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng giọng nói (Voices) - Danh sách các giọng có sẵn
CREATE TABLE IF NOT EXISTS voices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voice_id VARCHAR(50) UNIQUE NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    gender ENUM('male', 'female') NOT NULL,
    region VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng tài khoản phiên đăng nhập (Sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng thống kê (Statistics)
CREATE TABLE IF NOT EXISTS statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    conversion_id INT,
    date DATE NOT NULL,
    total_conversions INT DEFAULT 0,
    total_characters INT DEFAULT 0,
    total_duration FLOAT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu cho giọng nói
INSERT INTO voices (voice_id, voice_name, description, gender, region) VALUES
('Binh', 'Bình', 'Nam miền Bắc', 'male', 'North'),
('Tuyen', 'Tuyên', 'Nam miền Bắc', 'male', 'North'),
('Vinh', 'Vĩnh', 'Nam miền Nam', 'male', 'South'),
('Doan', 'Đoan', 'Nữ miền Nam', 'female', 'South'),
('Ly', 'Ly', 'Nữ miền Bắc', 'female', 'North'),
('Ngoc', 'Ngọc', 'Nữ miền Bắc', 'female', 'North')
ON DUPLICATE KEY UPDATE voice_name=VALUES(voice_name);

-- Tạo admin mặc định (password: admin123)
-- Password hash được tạo bằng: werkzeug.security.generate_password_hash('admin123')
-- CẬP NHẬT: Để đăng nhập thành công, bạn cần cập nhật password hash này trong database
-- Chạy Python script sau để tạo hash mới:
-- python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('admin123'))"
INSERT INTO users (username, email, password, full_name, role) VALUES
('admin', 'admin@tts.com', 'scrypt:32768:8:1$tIBxbjaPrGsDcOzk$9d85b63cfa231667159ce4829f773a828b708017b15814502357beb591463961fdd5875dda7ac53400f3946106877954857e17815e53d02dc1751d0582f25d8f', 'Administrator', 'admin')
ON DUPLICATE KEY UPDATE username=username;
