-- ============================================================
-- Migration: Thêm tính năng Chia sẻ Audio & Đặt tên Audio
-- Chạy file này một lần duy nhất sau khi deploy code mới.
-- ============================================================

USE tts_system;

-- 1. Tên hiển thị do user đặt (NULL = chưa đặt tên)
ALTER TABLE conversions
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(200) NULL DEFAULT NULL
    AFTER voice_name;

-- 2. Trạng thái chia sẻ công khai
ALTER TABLE conversions
    ADD COLUMN IF NOT EXISTS is_public TINYINT(1) NOT NULL DEFAULT 0
    AFTER display_name;

-- 3. Token chia sẻ duy nhất (NULL khi chưa bật chia sẻ)
ALTER TABLE conversions
    ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) NULL DEFAULT NULL
    AFTER is_public;

-- Index để tìm kiếm nhanh qua token
ALTER TABLE conversions
    ADD INDEX IF NOT EXISTS idx_share_token (share_token);

-- Xác nhận
SELECT
    COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'tts_system'
  AND TABLE_NAME   = 'conversions'
  AND COLUMN_NAME IN ('display_name', 'is_public', 'share_token')
ORDER BY ORDINAL_POSITION;
