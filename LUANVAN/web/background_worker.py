"""
Background Worker for Custom Voice Training
Processes training queue in background thread
"""

import time
import threading
import logging
from datetime import datetime
import pymysql

from voice_training import get_training_service
from config import DB_CONFIG

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BackgroundTrainingWorker:
    """Background worker for processing training queue"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.training_service = get_training_service()
        self.check_interval = 10  # Check queue every 10 seconds
        self.max_retry_delay = 60  # Max delay between retries
        
    def start(self):
        """Start background worker thread"""
        if self.running:
            logger.warning("[WORKER] Worker already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()
        logger.info("[WORKER] ✅ Background training worker started")
    
    def stop(self):
        """Stop background worker"""
        if not self.running:
            return
        
        logger.info("[WORKER] Stopping worker...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("[WORKER] ❌ Worker stopped")
    
    def is_running(self):
        """Check if worker is running"""
        return self.running and self.thread and self.thread.is_alive()
    
    def _worker_loop(self):
        """Main worker loop - processes training queue"""
        logger.info("[WORKER] Worker loop started")
        
        while self.running:
            try:
                # Get next job from queue
                job = self._get_next_job()
                
                if job:
                    logger.info(f"[WORKER] 📋 Processing job {job['id']} for voice {job['custom_voice_id']}")
                    
                    # Mark as processing
                    self._update_queue_status(job['id'], 'processing')
                    
                    # Get voice info
                    voice = self._get_voice_info(job['custom_voice_id'])
                    
                    if not voice:
                        logger.error(f"[WORKER] Voice {job['custom_voice_id']} not found")
                        self._update_queue_status(job['id'], 'failed')
                        continue
                    
                    # Train model
                    result = self.training_service._train_realtime(
                        voice['id'],
                        voice['user_id'],
                        voice['sample_audio_path']
                    )
                    
                    if result['success']:
                        # Success
                        logger.info(f"[WORKER] ✅ Job {job['id']} completed successfully")
                        self._update_queue_status(job['id'], 'completed')
                        self._mark_queue_completed(job['id'])
                        
                        # TODO: Send notification to user
                        self._notify_user(voice['user_id'], 'training_complete', voice['id'])
                    else:
                        # Failed
                        logger.error(f"[WORKER] ❌ Job {job['id']} failed: {result.get('error')}")
                        self._handle_job_failure(job['id'], result.get('error', 'Unknown error'))
                else:
                    # No jobs in queue, sleep
                    time.sleep(self.check_interval)
                    
            except Exception as e:
                logger.error(f"[WORKER] Error in worker loop: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(5)  # Sleep before retry
        
        logger.info("[WORKER] Worker loop ended")
    
    def _get_next_job(self):
        """Get next job from queue (prioritized)"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Get queued jobs, ordered by priority and creation time
            cursor.execute("""
                SELECT * FROM training_queue 
                WHERE status = 'queued'
                ORDER BY priority ASC, created_at ASC
                LIMIT 1
            """)
            
            job = cursor.fetchone()
            conn.close()
            return job
            
        except Exception as e:
            logger.error(f"[WORKER] Error getting next job: {e}")
            return None
    
    def _get_voice_info(self, voice_id: int):
        """Get voice information"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM custom_voices 
                WHERE id = %s
            """, (voice_id,))
            
            voice = cursor.fetchone()
            conn.close()
            return voice
            
        except Exception as e:
            logger.error(f"[WORKER] Error getting voice info: {e}")
            return None
    
    def _update_queue_status(self, job_id: int, status: str):
        """Update queue job status"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE training_queue 
                SET status = %s,
                    started_at = CASE WHEN status = 'queued' THEN NOW() ELSE started_at END
                WHERE id = %s
            """, (status, job_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"[WORKER] Error updating queue status: {e}")
    
    def _mark_queue_completed(self, job_id: int):
        """Mark queue job as completed"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE training_queue 
                SET status = 'completed',
                    completed_at = NOW()
                WHERE id = %s
            """, (job_id,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"[WORKER] Error marking queue as completed: {e}")
    
    def _handle_job_failure(self, job_id: int, error_message: str):
        """Handle job failure with retry logic"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Get current retry count
            cursor.execute("""
                SELECT retry_count, max_retries 
                FROM training_queue 
                WHERE id = %s
            """, (job_id,))
            
            result = cursor.fetchone()
            if not result:
                conn.close()
                return
            
            retry_count = result['retry_count']
            max_retries = result['max_retries']
            
            if retry_count < max_retries:
                # Retry
                new_retry_count = retry_count + 1
                logger.info(f"[WORKER] Retrying job {job_id} (attempt {new_retry_count}/{max_retries})")
                
                cursor.execute("""
                    UPDATE training_queue 
                    SET status = 'queued',
                        retry_count = %s,
                        started_at = NULL
                    WHERE id = %s
                """, (new_retry_count, job_id))
                
                # Also reset voice status
                cursor.execute("""
                    SELECT custom_voice_id FROM training_queue WHERE id = %s
                """, (job_id,))
                voice_result = cursor.fetchone()
                
                if voice_result:
                    cursor.execute("""
                        UPDATE custom_voices 
                        SET status = 'pending',
                            training_progress = 0,
                            error_message = NULL
                        WHERE id = %s
                    """, (voice_result['custom_voice_id'],))
            else:
                # Max retries exceeded, mark as failed
                logger.error(f"[WORKER] Job {job_id} failed after {max_retries} retries")
                
                cursor.execute("""
                    UPDATE training_queue 
                    SET status = 'failed',
                        completed_at = NOW()
                    WHERE id = %s
                """, (job_id,))
                
                # Update voice status
                cursor.execute("""
                    SELECT custom_voice_id FROM training_queue WHERE id = %s
                """, (job_id,))
                voice_result = cursor.fetchone()
                
                if voice_result:
                    cursor.execute("""
                        UPDATE custom_voices 
                        SET status = 'failed',
                            error_message = %s
                        WHERE id = %s
                    """, (f"Training failed after {max_retries} retries: {error_message}", 
                          voice_result['custom_voice_id']))
                    
                    # Notify user of failure
                    cursor.execute("""
                        SELECT user_id FROM custom_voices WHERE id = %s
                    """, (voice_result['custom_voice_id'],))
                    user_result = cursor.fetchone()
                    
                    if user_result:
                        self._notify_user(user_result['user_id'], 'training_failed', 
                                        voice_result['custom_voice_id'])
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"[WORKER] Error handling job failure: {e}")
    
    def _notify_user(self, user_id: int, event_type: str, voice_id: int):
        """
        Send notification to user
        Can be: email, push notification, in-app notification
        """
        try:
            # For now, just log the notification
            # TODO: Implement actual notification system
            
            if event_type == 'training_complete':
                logger.info(f"[NOTIFICATION] 📧 User {user_id}: Voice {voice_id} training completed!")
            elif event_type == 'training_failed':
                logger.info(f"[NOTIFICATION] 📧 User {user_id}: Voice {voice_id} training failed!")
            
            # Future implementations:
            # - WebSocket to frontend for real-time updates
            # - Email notification
            # - In-app notification bell
            # - SMS notification (optional)
            
        except Exception as e:
            logger.error(f"[WORKER] Error sending notification: {e}")
    
    def _get_db_connection(self):
        """Get database connection"""
        return pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def get_queue_stats(self):
        """Get training queue statistics"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    status,
                    COUNT(*) as count
                FROM training_queue
                GROUP BY status
            """)
            
            stats = cursor.fetchall()
            conn.close()
            
            return {row['status']: row['count'] for row in stats}
            
        except Exception as e:
            logger.error(f"[WORKER] Error getting queue stats: {e}")
            return {}


# Global worker instance
_worker_instance = None
_worker_lock = threading.Lock()

def get_worker():
    """Get singleton instance of BackgroundTrainingWorker"""
    global _worker_instance
    
    with _worker_lock:
        if _worker_instance is None:
            _worker_instance = BackgroundTrainingWorker()
        return _worker_instance

def start_worker():
    """Start the background worker"""
    worker = get_worker()
    if not worker.is_running():
        worker.start()
        return True
    return False

def stop_worker():
    """Stop the background worker"""
    worker = get_worker()
    worker.stop()

def get_worker_status():
    """Get worker status"""
    worker = get_worker()
    return {
        'running': worker.is_running(),
        'queue_stats': worker.get_queue_stats() if worker.is_running() else {}
    }


if __name__ == "__main__":
    # Test worker
    print("Testing Background Worker...")
    
    worker = get_worker()
    print(f"Worker created: {worker}")
    
    # Start worker
    worker.start()
    print("Worker started")
    
    # Check status
    time.sleep(2)
    print(f"Worker running: {worker.is_running()}")
    print(f"Queue stats: {worker.get_queue_stats()}")
    
    # Stop worker
    time.sleep(5)
    worker.stop()
    print("Worker stopped")
