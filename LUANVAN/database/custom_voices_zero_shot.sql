-- ===================================================
-- CUSTOM VOICES - ZERO-SHOT VOICE CLONING
-- Add voice_type and ref_transcript for Zero-shot mode
-- Idempotent: safe to run multiple times (skips if columns exist)
-- ===================================================
USE tts_system;

DELIMITER //
DROP PROCEDURE IF EXISTS add_zero_shot_columns //
CREATE PROCEDURE add_zero_shot_columns()
BEGIN
  -- Add voice_type if not exists
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_voices' AND COLUMN_NAME = 'voice_type') = 0 THEN
    ALTER TABLE custom_voices ADD COLUMN voice_type VARCHAR(20) DEFAULT 'rvc' COMMENT 'rvc=training, zero_shot=clone from audio';
  END IF;
  
  -- Add ref_transcript if not exists
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_voices' AND COLUMN_NAME = 'ref_transcript') = 0 THEN
    ALTER TABLE custom_voices ADD COLUMN ref_transcript TEXT COMMENT 'Transcript of sample audio (required for zero-shot)';
  END IF;
END //
DELIMITER ;

CALL add_zero_shot_columns();
DROP PROCEDURE add_zero_shot_columns;

-- Update existing records
UPDATE custom_voices SET voice_type = 'rvc' WHERE voice_type IS NULL;

SELECT 'Zero-shot voice cloning schema updated!' AS status;
