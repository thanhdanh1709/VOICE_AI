-- Payment System Schema
-- Schema cho hệ thống thanh toán TTS

USE tts_system;

-- Bảng gói thanh toán (Subscription Packages)
CREATE TABLE IF NOT EXISTS subscription_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL,
    characters_limit BIGINT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    price_vnd INT NOT NULL,
    duration_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng subscription của user (User Subscriptions)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT,
    characters_limit BIGINT NOT NULL DEFAULT 100000,
    characters_used BIGINT DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_end_date (end_date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng thanh toán (Payments)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT,
    amount DECIMAL(15, 2) NOT NULL,
    amount_vnd INT NOT NULL,
    payment_method ENUM('vnpay', 'mono', 'bank_transfer', 'bank_qr') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_code VARCHAR(255),
    vnpay_transaction_id VARCHAR(255),
    mono_transaction_id VARCHAR(255),
    bank_transaction_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm các gói thanh toán mặc định
INSERT INTO subscription_packages (package_name, characters_limit, price, price_vnd, duration_days) VALUES
('Free Plan', 100000, 0, 0, 30),
('Basic Plan', 1500000, 500000, 500000, 30),
('Standard Plan', 4000000, 1000000, 1000000, 30),
('Premium Plan', 10000000, 2000000, 2000000, 30),
('Enterprise Plan', 27000000, 5000000, 5000000, 30)
ON DUPLICATE KEY UPDATE package_name=VALUES(package_name);
