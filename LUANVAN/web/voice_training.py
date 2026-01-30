"""
Voice Training Service for Custom Voices
Handles RVC model training with hybrid mode (realtime/background)
"""

import os
import time
import logging
from datetime import datetime
from typing import Tuple, Optional
import pymysql

from audio_processor import get_audio_processor
from rvc_wrapper import get_rvc_processor
from config import DB_CONFIG

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VoiceTrainingService:
    """Service for training custom voice models"""
    
    def __init__(self):
        self.REALTIME_THRESHOLD = 5 * 60  # 5 minutes in seconds
        self.audio_processor = get_audio_processor()
        self.rvc_processor = get_rvc_processor()
        
        # Training directories
        self.uploads_dir = "uploads/custom_voices"
        self.models_dir = "models/custom_voices"
        self.processed_dir = "processed/custom_voices"
        
        # Create directories
        for directory in [self.uploads_dir, self.models_dir, self.processed_dir]:
            os.makedirs(directory, exist_ok=True)
    
    def start_training(self, custom_voice_id: int, user_id: int, audio_path: str) -> dict:
        """
        Main entry point for training
        Decides realtime or background based on audio duration
        
        Returns: dict with success, mode, message
        """
        try:
            logger.info(f"[TRAINING] Starting training for voice {custom_voice_id}")
            
            # 1. Validate audio
            is_valid, message, duration = self.audio_processor.validate_audio(audio_path)
            if not is_valid:
                self._fail_training(custom_voice_id, message)
                return {'success': False, 'error': message}
            
            # 2. Check audio quality
            quality_score, quality_msg = self.audio_processor.check_audio_quality(audio_path)
            self._update_voice_quality(custom_voice_id, quality_score)
            
            if quality_score < 5:
                logger.warning(f"[TRAINING] Low quality audio: {quality_msg}")
            
            # 3. Update status to processing
            self._update_voice_status(custom_voice_id, 'processing', 0)
            
            # 4. Decide training mode
            if duration <= self.REALTIME_THRESHOLD:
                # REALTIME: Train immediately (blocking)
                logger.info(f"[TRAINING] Realtime mode for voice {custom_voice_id} (duration: {duration:.1f}s)")
                self._update_training_mode(custom_voice_id, 'realtime')
                return self._train_realtime(custom_voice_id, user_id, audio_path)
            else:
                # BACKGROUND: Add to queue
                logger.info(f"[TRAINING] Background mode for voice {custom_voice_id} (duration: {duration:.1f}s)")
                self._update_training_mode(custom_voice_id, 'background')
                return self._train_background(custom_voice_id, user_id, audio_path)
                
        except Exception as e:
            logger.error(f"[TRAINING] Error starting training: {e}")
            import traceback
            traceback.print_exc()
            self._fail_training(custom_voice_id, str(e))
            return {'success': False, 'error': str(e)}
    
    def _train_realtime(self, voice_id: int, user_id: int, audio_path: str) -> dict:
        """Training for short audio (<5 min) - Realtime"""
        try:
            start_time = time.time()
            self._set_training_started(voice_id)
            
            # Step 1: Preprocess audio (10%)
            logger.info(f"[TRAINING] Step 1/5: Preprocessing audio...")
            self._update_progress(voice_id, 10)
            
            processed_path = os.path.join(
                self.processed_dir,
                f"user_{user_id}",
                f"voice_{voice_id}_processed.wav"
            )
            os.makedirs(os.path.dirname(processed_path), exist_ok=True)
            
            success, msg = self.audio_processor.preprocess_audio(audio_path, processed_path)
            if not success:
                raise Exception(f"Preprocessing failed: {msg}")
            
            # Step 2: Extract features (30%)
            logger.info(f"[TRAINING] Step 2/5: Extracting features...")
            self._update_progress(voice_id, 30)
            
            features = self.audio_processor.extract_features(processed_path)
            if features is None:
                raise Exception("Feature extraction failed")
            
            # Step 3: Train RVC model (60%)
            # NOTE: For now, we'll use a simplified approach
            # In production, you'd integrate with full RVC training pipeline
            logger.info(f"[TRAINING] Step 3/5: Training model...")
            self._update_progress(voice_id, 60)
            
            model_path = self._train_rvc_model_simple(voice_id, user_id, processed_path)
            
            # Step 4: Create index (80%)
            logger.info(f"[TRAINING] Step 4/5: Creating index...")
            self._update_progress(voice_id, 80)
            
            index_path = self._create_index(voice_id, user_id, features)
            
            # Step 5: Complete (100%)
            logger.info(f"[TRAINING] Step 5/5: Finalizing...")
            self._update_progress(voice_id, 100)
            
            # Save to database
            self._complete_training(voice_id, model_path, index_path)
            
            elapsed_time = time.time() - start_time
            logger.info(f"[TRAINING] Training completed in {elapsed_time:.1f}s")
            
            return {
                'success': True,
                'mode': 'realtime',
                'model_path': model_path,
                'message': f'Training hoàn tất trong {elapsed_time:.1f}s!',
                'elapsed_time': elapsed_time
            }
            
        except Exception as e:
            logger.error(f"[TRAINING] Realtime training failed: {e}")
            import traceback
            traceback.print_exc()
            self._fail_training(voice_id, str(e))
            return {'success': False, 'error': str(e)}
    
    def _train_background(self, voice_id: int, user_id: int, audio_path: str) -> dict:
        """Training for long audio (>5 min) - Background queue"""
        try:
            # Add to training queue
            queue_id = self._add_to_training_queue(voice_id)
            
            logger.info(f"[TRAINING] Added voice {voice_id} to queue (queue_id: {queue_id})")
            
            return {
                'success': True,
                'mode': 'background',
                'queue_id': queue_id,
                'message': 'Đã thêm vào hàng đợi training. Bạn sẽ nhận thông báo khi hoàn tất.'
            }
            
        except Exception as e:
            logger.error(f"[TRAINING] Failed to add to queue: {e}")
            return {'success': False, 'error': str(e)}
    
    def _train_rvc_model_simple(self, voice_id: int, user_id: int, audio_path: str) -> str:
        """
        Simplified RVC training
        NOTE: This is a placeholder. In production, integrate with full RVC training
        """
        # For now, we'll just copy the processed audio as a "model"
        # In production, this would call actual RVC training code
        
        model_dir = os.path.join(self.models_dir, f"user_{user_id}")
        os.makedirs(model_dir, exist_ok=True)
        
        model_path = os.path.join(model_dir, f"voice_{voice_id}.pth")
        
        # Simulate training time
        logger.info("[TRAINING] Simulating model training...")
        time.sleep(2)  # Simulate training
        
        # Create a dummy model file for now
        with open(model_path, 'w') as f:
            f.write(f"# RVC Model for voice {voice_id}\n")
            f.write(f"# Source audio: {audio_path}\n")
            f.write(f"# Created: {datetime.now()}\n")
        
        logger.info(f"[TRAINING] Model saved to {model_path}")
        return model_path
    
    def _create_index(self, voice_id: int, user_id: int, features: dict) -> str:
        """Create feature index for retrieval"""
        index_dir = os.path.join(self.models_dir, f"user_{user_id}")
        os.makedirs(index_dir, exist_ok=True)
        
        index_path = os.path.join(index_dir, f"voice_{voice_id}.index")
        
        # Create dummy index
        with open(index_path, 'w') as f:
            f.write(f"# Feature index for voice {voice_id}\n")
            f.write(f"# Features: {list(features.keys())}\n")
            f.write(f"# Created: {datetime.now()}\n")
        
        logger.info(f"[TRAINING] Index created: {index_path}")
        return index_path
    
    # Database operations
    
    def _get_db_connection(self):
        """Get database connection"""
        return pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def _update_voice_status(self, voice_id: int, status: str, progress: int):
        """Update voice training status"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET status = %s, training_progress = %s
                WHERE id = %s
            """, (status, progress, voice_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating status: {e}")
    
    def _update_progress(self, voice_id: int, progress: int):
        """Update training progress"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET training_progress = %s
                WHERE id = %s
            """, (progress, voice_id))
            conn.commit()
            conn.close()
            logger.info(f"[TRAINING] Progress: {progress}%")
        except Exception as e:
            logger.error(f"Error updating progress: {e}")
    
    def _set_training_started(self, voice_id: int):
        """Set training start timestamp"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET training_started_at = NOW()
                WHERE id = %s
            """, (voice_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error setting training started: {e}")
    
    def _complete_training(self, voice_id: int, model_path: str, index_path: str):
        """Mark training as completed"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET status = 'completed',
                    training_progress = 100,
                    training_completed_at = NOW(),
                    model_file_path = %s,
                    index_file_path = %s
                WHERE id = %s
            """, (model_path, index_path, voice_id))
            conn.commit()
            conn.close()
            logger.info(f"[TRAINING] Voice {voice_id} training completed")
        except Exception as e:
            logger.error(f"Error completing training: {e}")
    
    def _fail_training(self, voice_id: int, error_message: str):
        """Mark training as failed"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET status = 'failed',
                    error_message = %s
                WHERE id = %s
            """, (error_message, voice_id))
            conn.commit()
            conn.close()
            logger.error(f"[TRAINING] Voice {voice_id} training failed: {error_message}")
        except Exception as e:
            logger.error(f"Error marking training as failed: {e}")
    
    def _update_training_mode(self, voice_id: int, mode: str):
        """Update training mode"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET training_mode = %s
                WHERE id = %s
            """, (mode, voice_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating training mode: {e}")
    
    def _update_voice_quality(self, voice_id: int, quality_score: float):
        """Update voice quality score"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE custom_voices 
                SET quality_score = %s
                WHERE id = %s
            """, (quality_score, voice_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating quality score: {e}")
    
    def _add_to_training_queue(self, voice_id: int) -> int:
        """Add voice to training queue"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO training_queue (custom_voice_id, status)
                VALUES (%s, 'queued')
            """, (voice_id,))
            conn.commit()
            queue_id = cursor.lastrowid
            conn.close()
            return queue_id
        except Exception as e:
            logger.error(f"Error adding to queue: {e}")
            raise


# Singleton instance
_training_service = None

def get_training_service():
    """Get singleton instance of VoiceTrainingService"""
    global _training_service
    if _training_service is None:
        _training_service = VoiceTrainingService()
    return _training_service


if __name__ == "__main__":
    # Test training service
    service = get_training_service()
    print("Voice Training Service initialized")
    print(f"Realtime threshold: {service.REALTIME_THRESHOLD}s")
    print(f"Directories: {service.uploads_dir}, {service.models_dir}")
