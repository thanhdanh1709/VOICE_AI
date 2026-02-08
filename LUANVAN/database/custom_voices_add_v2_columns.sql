-- ===================================================
-- Thêm cột cho Custom Voices (V2 - base voice + chỉnh pitch/speed)
-- Chạy file này 1 lần nếu bảng custom_voices thiếu các cột sau.
-- Nếu cột đã tồn tại, MySQL báo lỗi "Duplicate column" -> bỏ qua dòng đó.
-- ===================================================
USE tts_system;

-- Chất lượng audio (0-10), dùng khi upload
ALTER TABLE custom_voices 
ADD COLUMN quality_score FLOAT NULL COMMENT 'Quality rating (0-10)' 
AFTER usage_count;

-- Giọng nền TTS (Ly, Binh, ...)
ALTER TABLE custom_voices 
ADD COLUMN base_voice_id VARCHAR(50) DEFAULT 'ly' COMMENT 'Base TTS voice for hybrid mode' 
AFTER quality_score;

-- Chỉnh pitch (semi-tones)
ALTER TABLE custom_voices 
ADD COLUMN pitch_adjustment INT DEFAULT 0 COMMENT 'Pitch adjustment in semi-tones' 
AFTER base_voice_id;

-- Chỉnh tốc độ (1.0 = bình thường)
ALTER TABLE custom_voices 
ADD COLUMN speed_adjustment FLOAT DEFAULT 1.0 COMMENT 'Speed adjustment factor' 
AFTER pitch_adjustment;

-- Chỉnh năng lượng (1.0 = bình thường)
ALTER TABLE custom_voices 
ADD COLUMN energy_adjustment FLOAT DEFAULT 1.0 COMMENT 'Energy adjustment factor' 
AFTER speed_adjustment;
