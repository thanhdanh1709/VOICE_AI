"""
Audio Processor for Custom Voice Training
Handles audio preprocessing, validation, and feature extraction
"""

import os
import librosa
import soundfile as sf
import numpy as np
from typing import Tuple, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AudioProcessor:
    """Process audio files for voice training"""
    
    def __init__(self):
        self.target_sr = 16000  # Target sample rate
        self.max_duration = 900  # Max 15 minutes in seconds
        self.min_duration = 30   # Min 30 seconds
        
    def validate_audio(self, audio_path: str) -> Tuple[bool, str, Optional[float]]:
        """
        Validate audio file
        Returns: (is_valid, message, duration)
        """
        try:
            if not os.path.exists(audio_path):
                return False, "File không tồn tại", None
            
            # Get duration without loading full audio
            duration = librosa.get_duration(path=audio_path)
            
            # Check duration
            if duration < self.min_duration:
                return False, f"Audio quá ngắn. Cần ít nhất {self.min_duration} giây", duration
            
            if duration > self.max_duration:
                return False, f"Audio quá dài. Tối đa {self.max_duration/60:.1f} phút", duration
            
            # Try to load audio to check if it's valid
            audio, sr = librosa.load(audio_path, sr=None, duration=5)  # Load first 5 seconds
            
            if len(audio) == 0:
                return False, "File audio rỗng hoặc bị lỗi", duration
            
            return True, "Audio hợp lệ", duration
            
        except Exception as e:
            logger.error(f"Error validating audio: {e}")
            return False, f"Lỗi kiểm tra file: {str(e)}", None
    
    def preprocess_audio(self, input_path: str, output_path: str) -> Tuple[bool, str]:
        """
        Preprocess audio for training:
        - Resample to 16kHz
        - Remove silence
        - Normalize volume
        - Save as WAV
        
        Returns: (success, message)
        """
        try:
            logger.info(f"Preprocessing audio: {input_path}")
            
            # Load audio
            audio, sr = librosa.load(input_path, sr=self.target_sr)
            
            # Remove silence at start and end
            audio_trimmed, _ = librosa.effects.trim(audio, top_db=20)
            
            # Normalize volume
            audio_normalized = librosa.util.normalize(audio_trimmed)
            
            # Create output directory if needed
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Save as WAV
            sf.write(output_path, audio_normalized, self.target_sr)
            
            logger.info(f"Audio preprocessed successfully: {output_path}")
            return True, "Preprocessing thành công"
            
        except Exception as e:
            logger.error(f"Error preprocessing audio: {e}")
            return False, f"Lỗi preprocessing: {str(e)}"
    
    def split_audio_chunks(self, audio_path: str, chunk_duration: int = 30) -> list:
        """
        Split audio into chunks for training
        Returns: List of audio chunks (numpy arrays)
        """
        try:
            audio, sr = librosa.load(audio_path, sr=self.target_sr)
            
            chunk_samples = chunk_duration * sr
            chunks = []
            
            for i in range(0, len(audio), chunk_samples):
                chunk = audio[i:i + chunk_samples]
                if len(chunk) >= sr:  # At least 1 second
                    chunks.append(chunk)
            
            logger.info(f"Split audio into {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Error splitting audio: {e}")
            return []
    
    def extract_features(self, audio_path: str) -> Optional[dict]:
        """
        Extract features from audio for RVC training
        Returns: Dictionary of features
        """
        try:
            audio, sr = librosa.load(audio_path, sr=self.target_sr)
            
            # Extract pitch (F0)
            f0, voiced_flag, voiced_probs = librosa.pyin(
                audio,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                sr=sr
            )
            
            # Extract MFCCs
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
            
            # Extract mel spectrogram
            mel_spec = librosa.feature.melspectrogram(y=audio, sr=sr)
            
            features = {
                'audio': audio,
                'sr': sr,
                'f0': f0,
                'voiced_flag': voiced_flag,
                'mfccs': mfccs,
                'mel_spec': mel_spec,
                'duration': len(audio) / sr
            }
            
            logger.info(f"Extracted features from audio (duration: {features['duration']:.2f}s)")
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return None
    
    def check_audio_quality(self, audio_path: str) -> Tuple[float, str]:
        """
        Check audio quality
        Returns: (quality_score 0-10, message)
        """
        try:
            audio, sr = librosa.load(audio_path, sr=None)
            
            quality_score = 10.0
            issues = []
            
            # Check signal-to-noise ratio (simplified)
            rms = librosa.feature.rms(y=audio)[0]
            avg_rms = np.mean(rms)
            
            if avg_rms < 0.01:
                quality_score -= 3
                issues.append("Volume quá nhỏ")
            elif avg_rms > 0.9:
                quality_score -= 2
                issues.append("Volume quá lớn (có thể bị distortion)")
            
            # Check for clipping
            clipping_ratio = np.sum(np.abs(audio) > 0.99) / len(audio)
            if clipping_ratio > 0.001:
                quality_score -= 4
                issues.append(f"Có {clipping_ratio*100:.2f}% samples bị clipping")
            
            # Check zero crossing rate (for voice detection)
            zcr = librosa.feature.zero_crossing_rate(audio)[0]
            avg_zcr = np.mean(zcr)
            
            if avg_zcr < 0.01 or avg_zcr > 0.3:
                quality_score -= 2
                issues.append("Audio có thể không phải giọng nói")
            
            # Generate message
            if quality_score >= 8:
                message = "✅ Chất lượng tốt"
            elif quality_score >= 6:
                message = "⚠️ Chất lượng trung bình: " + ", ".join(issues)
            else:
                message = "❌ Chất lượng kém: " + ", ".join(issues)
            
            return max(0, quality_score), message
            
        except Exception as e:
            logger.error(f"Error checking audio quality: {e}")
            return 5.0, "Không thể đánh giá chất lượng"
    
    def get_audio_info(self, audio_path: str) -> dict:
        """Get detailed audio information"""
        try:
            audio, sr = librosa.load(audio_path, sr=None)
            duration = len(audio) / sr
            
            # Get file size
            file_size = os.path.getsize(audio_path)
            
            # Calculate RMS energy
            rms = librosa.feature.rms(y=audio)[0]
            avg_energy = np.mean(rms)
            
            info = {
                'duration': duration,
                'sample_rate': sr,
                'file_size': file_size,
                'num_samples': len(audio),
                'avg_energy': float(avg_energy),
                'max_amplitude': float(np.max(np.abs(audio))),
                'format': os.path.splitext(audio_path)[1]
            }
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            return {}


# Singleton instance
_audio_processor = None

def get_audio_processor():
    """Get singleton instance of AudioProcessor"""
    global _audio_processor
    if _audio_processor is None:
        _audio_processor = AudioProcessor()
    return _audio_processor


if __name__ == "__main__":
    # Test audio processor
    processor = get_audio_processor()
    
    # Example usage
    test_file = "test_audio.wav"
    if os.path.exists(test_file):
        print("Testing audio processor...")
        
        # Validate
        is_valid, message, duration = processor.validate_audio(test_file)
        print(f"Validation: {message} (duration: {duration}s)")
        
        # Check quality
        quality, quality_msg = processor.check_audio_quality(test_file)
        print(f"Quality: {quality}/10 - {quality_msg}")
        
        # Get info
        info = processor.get_audio_info(test_file)
        print(f"Info: {info}")
    else:
        print(f"Test file not found: {test_file}")
