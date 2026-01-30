-- ===================================================
-- CUSTOM VOICES V2 - HYBRID APPROACH UPDATE
-- Add columns for base voice + voice adjustments
-- ===================================================
USE tts_system;

-- Add new columns to custom_voices table
ALTER TABLE custom_voices
ADD COLUMN IF NOT EXISTS base_voice_id VARCHAR(50) COMMENT 'Base system voice (binh, ly, ngoc, etc)',
ADD COLUMN IF NOT EXISTS pitch_adjustment INT DEFAULT 0 COMMENT 'Pitch adjustment (-12 to +12)',
ADD COLUMN IF NOT EXISTS speed_adjustment FLOAT DEFAULT 1.0 COMMENT 'Speed multiplier (0.5 to 2.0)',
ADD COLUMN IF NOT EXISTS energy_adjustment FLOAT DEFAULT 1.0 COMMENT 'Energy/volume adjustment (0.5 to 1.5)';

-- Update existing records to use default base voice
UPDATE custom_voices 
SET base_voice_id = 'ly', 
    pitch_adjustment = 0, 
    speed_adjustment = 1.0, 
    energy_adjustment = 1.0
WHERE base_voice_id IS NULL;

-- Add index for faster queries
ALTER TABLE custom_voices
ADD INDEX idx_base_voice (base_voice_id);

-- ===================================================
-- NOTES:
-- ===================================================
-- Custom voice now = Base system voice + Adjustments
-- Training is instant (just save preset)
-- No need for model files (.pth, .index)
-- ===================================================

SELECT '✅ Custom Voices V2 schema updated successfully!' as status;
