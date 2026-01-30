-- ===================================================
-- CUSTOM VOICES DATABASE SCHEMA
-- Voice Cloning/Custom Voice Feature
-- ===================================================
USE tts_system;
-- Table 1: Custom Voices
-- Stores information about user-created custom voices
CREATE TABLE IF NOT EXISTS custom_voices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    voice_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Audio files
    sample_audio_path TEXT NOT NULL COMMENT 'Path to uploaded audio sample',
    sample_duration INT COMMENT 'Duration in seconds',
    sample_file_size BIGINT COMMENT 'File size in bytes',
    
    -- Model files
    model_file_path TEXT COMMENT 'Path to trained RVC model (.pth)',
    index_file_path TEXT COMMENT 'Path to feature index file',
    
    -- Training info
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    training_progress INT DEFAULT 0 COMMENT 'Progress percentage (0-100)',
    training_mode ENUM('realtime', 'background') COMMENT 'Training mode used',
    training_started_at TIMESTAMP NULL,
    training_completed_at TIMESTAMP NULL,
    error_message TEXT,
    
    -- Metadata
    is_public BOOLEAN DEFAULT FALSE COMMENT 'Share with other users?',
    quality_score FLOAT COMMENT 'Quality rating (0-10)',
    usage_count INT DEFAULT 0 COMMENT 'Number of times used',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_status (user_id, status),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Training Queue
-- Manages background training jobs
CREATE TABLE IF NOT EXISTS training_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    custom_voice_id INT NOT NULL,
    
    -- Queue info
    priority INT DEFAULT 5 COMMENT 'Lower number = higher priority',
    status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
    
    -- Retry logic
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (custom_voice_id) REFERENCES custom_voices(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_status_priority (status, priority, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Voice Usage Logs
-- Tracks usage of custom voices for statistics
CREATE TABLE IF NOT EXISTS voice_usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    custom_voice_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Usage details
    text_input TEXT,
    text_length INT,
    audio_duration FLOAT COMMENT 'Generated audio duration in seconds',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (custom_voice_id) REFERENCES custom_voices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_custom_voice (custom_voice_id, created_at),
    INDEX idx_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================
-- SAMPLE QUERIES FOR TESTING
-- ===================================================

-- Get all custom voices for a user
-- SELECT * FROM custom_voices WHERE user_id = ? ORDER BY created_at DESC;

-- Get training queue status
-- SELECT * FROM training_queue WHERE status = 'queued' ORDER BY priority ASC, created_at ASC;

-- Get voice usage statistics
-- SELECT cv.voice_name, COUNT(*) as usage_count, SUM(vul.audio_duration) as total_duration
-- FROM custom_voices cv
-- LEFT JOIN voice_usage_logs vul ON cv.id = vul.custom_voice_id
-- WHERE cv.user_id = ?
-- GROUP BY cv.id;

-- ===================================================
-- NOTES
-- ===================================================
-- 1. Run this SQL file on your MySQL database
-- 2. Make sure 'users' table exists first
-- 3. Adjust file paths in application to match your system
-- 4. Set up proper backup strategy for model files
