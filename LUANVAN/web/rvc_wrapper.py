"""
RVC (Retrieval-based Voice Conversion) Wrapper
Wrapper để gọi RVC từ tool folder để điều chỉnh giọng nói
"""

import sys
import os
from pathlib import Path
import tempfile
import logging
from typing import Optional, Tuple

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add RVC to Python path
RVC_PATH = Path(__file__).parent.parent / "tool" / "Retrieval-based-Voice-Conversion-develop"
if RVC_PATH.exists():
    sys.path.insert(0, str(RVC_PATH))
    logger.info(f"Added RVC path: {RVC_PATH}")
else:
    logger.warning(f"RVC path not found: {RVC_PATH}")


class RVCProcessor:
    """
    RVC Voice Conversion Processor
    Điều chỉnh giọng nói sử dụng RVC
    """
    
    def __init__(self):
        """Initialize RVC processor"""
        self.vc = None
        self.initialized = False
        self._check_rvc_available()
    
    def _check_rvc_available(self) -> bool:
        """Kiểm tra xem RVC có available không"""
        try:
            from rvc.modules.vc.modules import VC
            self.vc = VC()
            self.initialized = True
            logger.info("RVC initialized successfully")
            return True
        except ImportError as e:
            logger.error(f"Cannot import RVC: {e}")
            logger.warning("RVC features will be disabled. Using librosa fallback instead.")
            self.initialized = False
            return False
        except Exception as e:
            logger.error(f"Error initializing RVC: {e}")
            self.initialized = False
            return False
    
    def is_available(self) -> bool:
        """
        Check if voice conversion is available
        Returns True if RVC OR librosa is available (fallback)
        """
        # Always return True because we have librosa fallback
        try:
            import librosa
            import soundfile
            return True  # Fallback to librosa pitch shift
        except ImportError:
            return self.initialized  # Only return RVC status if librosa not available
    
    def adjust_voice(
        self,
        input_audio_path: str,
        model_path: Optional[str] = None,
        f0_up_key: int = 0,
        f0_method: str = "rmvpe",
        index_rate: float = 0.75,
        protect: float = 0.33,
        filter_radius: int = 3,
        resample_sr: int = 0,
        rms_mix_rate: float = 0.25
    ) -> Tuple[bool, str, str]:
        """
        Điều chỉnh giọng nói
        
        Args:
            input_audio_path: Path to input audio file
            model_path: Path to RVC model (.pth file)
            f0_up_key: Pitch adjustment (-12 to +12 semitones)
            f0_method: F0 detection method (pm, harvest, dio, rmvpe)
            index_rate: Model blend ratio (0-1)
            protect: Protect voiceless consonants (0-0.5)
            filter_radius: Median filtering radius
            resample_sr: Output sample rate (0 = same as input)
            rms_mix_rate: Volume envelope mix (0-1)
        
        Returns:
            Tuple[success, output_path, message]
        """
        
        if not os.path.exists(input_audio_path):
            return False, "", f"Input audio file not found: {input_audio_path}"
        
        try:
            # If RVC not initialized or no model, use simple pitch shift fallback
            if not self.initialized or not model_path or not os.path.exists(model_path):
                logger.warning("RVC not available or no model provided, using librosa pitch shift fallback")
                return self._simple_pitch_shift(input_audio_path, f0_up_key)
            
            # Load model
            self.vc.get_vc(model_path)
            logger.info(f"Loaded model: {model_path}")
            
            # Process audio
            input_path = Path(input_audio_path)
            tgt_sr, audio_opt, times, _ = self.vc.vc_inference(
                sid=0,  # Speaker ID
                input_audio_path=input_path,
                f0_up_key=f0_up_key,
                f0_method=f0_method,
                file_index="",  # Index file path (optional)
                index_rate=index_rate,
                filter_radius=filter_radius,
                resample_sr=resample_sr,
                rms_mix_rate=rms_mix_rate,
                protect=protect
            )
            
            # Save output
            output_path = self._generate_output_path(input_audio_path)
            
            from scipy.io import wavfile
            wavfile.write(output_path, tgt_sr, audio_opt)
            
            logger.info(f"Voice conversion completed: {output_path}")
            logger.info(f"Processing times: {times}")
            
            return True, output_path, "Voice conversion successful"
            
        except Exception as e:
            logger.error(f"Error in voice conversion: {e}")
            return False, "", f"Error: {str(e)}"
    
    def _simple_pitch_shift(
        self,
        input_audio_path: str,
        semitones: int
    ) -> Tuple[bool, str, str]:
        """
        Simple pitch shift without model (fallback)
        Sử dụng librosa để shift pitch đơn giản
        """
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            y, sr = librosa.load(input_audio_path, sr=None)
            
            # Pitch shift
            if semitones != 0:
                y_shifted = librosa.effects.pitch_shift(
                    y=y,
                    sr=sr,
                    n_steps=semitones
                )
            else:
                y_shifted = y
            
            # Save output
            output_path = self._generate_output_path(input_audio_path, suffix="_pitch")
            sf.write(output_path, y_shifted, sr)
            
            logger.info(f"Simple pitch shift completed: {output_path}")
            return True, output_path, f"Pitch shifted by {semitones} semitones"
            
        except ImportError:
            return False, "", "librosa not installed. Cannot perform pitch shift."
        except Exception as e:
            logger.error(f"Error in simple pitch shift: {e}")
            return False, "", f"Error: {str(e)}"
    
    def _generate_output_path(
        self,
        input_path: str,
        suffix: str = "_rvc"
    ) -> str:
        """Generate output path for converted audio"""
        input_path = Path(input_path)
        output_dir = input_path.parent
        output_name = f"{input_path.stem}{suffix}{input_path.suffix}"
        return str(output_dir / output_name)
    
    def get_available_models(self, models_dir: Optional[str] = None) -> list:
        """
        Get list of available RVC models
        
        Args:
            models_dir: Directory containing .pth model files
        
        Returns:
            List of model file paths
        """
        if models_dir is None:
            # Default models directory
            models_dir = Path(__file__).parent / "rvc_models"
        else:
            models_dir = Path(models_dir)
        
        if not models_dir.exists():
            logger.warning(f"Models directory not found: {models_dir}")
            return []
        
        # Find all .pth files
        models = list(models_dir.glob("*.pth"))
        logger.info(f"Found {len(models)} models in {models_dir}")
        
        return [str(m) for m in models]


class SimplePitchShifter:
    """
    Simple pitch shifter using librosa
    Fallback khi RVC không available
    """
    
    @staticmethod
    def shift_pitch(
        input_path: str,
        output_path: str,
        semitones: int
    ) -> Tuple[bool, str]:
        """
        Shift pitch of audio file
        
        Args:
            input_path: Input audio file
            output_path: Output audio file
            semitones: Pitch shift in semitones (-12 to +12)
        
        Returns:
            Tuple[success, message]
        """
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            y, sr = librosa.load(input_path, sr=None)
            
            # Pitch shift
            if semitones != 0:
                y_shifted = librosa.effects.pitch_shift(
                    y=y,
                    sr=sr,
                    n_steps=semitones
                )
            else:
                y_shifted = y
            
            # Save output
            sf.write(output_path, y_shifted, sr)
            
            return True, f"Pitch shifted by {semitones} semitones"
            
        except ImportError:
            return False, "librosa or soundfile not installed"
        except Exception as e:
            return False, f"Error: {str(e)}"


# Global RVC processor instance
_rvc_processor = None


def get_rvc_processor() -> RVCProcessor:
    """Get global RVC processor instance (singleton)"""
    global _rvc_processor
    if _rvc_processor is None:
        _rvc_processor = RVCProcessor()
    return _rvc_processor


# Test function
def test_rvc():
    """Test RVC wrapper"""
    processor = get_rvc_processor()
    print(f"RVC Available: {processor.is_available()}")
    
    models = processor.get_available_models()
    print(f"Available models: {len(models)}")
    for model in models:
        print(f"  - {model}")


if __name__ == "__main__":
    test_rvc()
