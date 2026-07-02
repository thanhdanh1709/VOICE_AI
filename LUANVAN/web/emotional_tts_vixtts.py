"""
Emotional TTS using viXTTS - STANDALONE
HỖ TRỢ TIẾNG VIỆT 100% + EMOTION CONTROL
"""
import sys
import codecs
import os
import re
import torch
import warnings
from pathlib import Path
from pydub import AudioSegment
import traceback

# Khoảng lặng giữa các chunk audio (ms) — giảm để nghe liền hơn
VIXTTS_CHUNK_PAUSE_MS = int(os.environ.get('VIXTTS_CHUNK_PAUSE_MS', '50'))
# time_stretch (librosa) tạo tiếng “vang/ướt” — mặc định tắt; bật bằng VIXTTS_EMOTION_SPEED=1
VIXTTS_EMOTION_SPEED_ENABLED = os.environ.get('VIXTTS_EMOTION_SPEED', '0').strip().lower() in (
    '1', 'true', 'yes',
)
# Tham số inference — khớp viXTTS demo (temp thấp = ít vang/artifact)
VIXTTS_BASE_TEMPERATURE = float(os.environ.get('VIXTTS_BASE_TEMPERATURE', '0.3'))
VIXTTS_REPETITION_PENALTY = float(os.environ.get('VIXTTS_REPETITION_PENALTY', '10.0'))
VIXTTS_TOP_K = int(os.environ.get('VIXTTS_TOP_K', '30'))
VIXTTS_MAX_CHUNK_CHARS = int(os.environ.get('VIXTTS_MAX_CHUNK_CHARS', '250'))

# Fix encoding for Windows console (only if not already set)
if sys.platform == 'win32' and hasattr(sys.stdout, 'buffer'):
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except AttributeError:
        pass  # Already set

# Fix PyTorch 2.6+ weights_only issue
warnings.filterwarnings('ignore', message='.*weights_only.*')
_original_torch_load = torch.load
def patched_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = patched_torch_load

from TTS.tts.configs.xtts_config import XttsConfig  # type: ignore
from TTS.tts.models.xtts import Xtts  # type: ignore
from huggingface_hub import snapshot_download, hf_hub_download
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent.parent / 'VieNeu-TTS-main'))
from vieneu_utils.normalize_text import VietnameseTTSNormalizer
from emotion_parser import detect_emotion as parse_emotion_from_text
from emotion_parser import split_by_emotion as parse_split_by_emotion

# Monkey-patch torchaudio.load to use soundfile (avoid torchcodec issues on Windows)
import torchaudio
_original_torchaudio_load = torchaudio.load
def patched_torchaudio_load(filepath, *args, **kwargs):
    """Load audio using soundfile instead of torchcodec"""
    audio, sr = sf.read(filepath)
    if len(audio.shape) > 1:
        audio = audio.T  # soundfile returns (samples, channels), torch needs (channels, samples)
    else:
        audio = audio.reshape(1, -1)  # Mono: (samples,) -> (1, samples)
    return torch.FloatTensor(audio), sr
torchaudio.load = patched_torchaudio_load


class ViXTTSEmotionalTTS:
    """
    TTS Engine với emotion control dùng viXTTS
    - 100% TIẾNG VIỆT
    - Giọng cố định từ base_voice / clone (latents tính một lần)
    - Cảm xúc chỉnh qua tham số inference (tốc độ, nhiệt độ) — không clone giọng từ ref cảm xúc
    """
    
    def __init__(self, base_dir=None):
        """Initialize viXTTS"""
        print("[viXTTS] Initializing viXTTS...")
        
        if base_dir is None:
            base_dir = Path(__file__).parent
        else:
            base_dir = Path(base_dir)
        
        self.base_dir = base_dir
        self.model_dir = base_dir / "vixtts_model"
        self.model = None
        
        # Emotion references mapping
        # User có: base_voice.wav, cheerful_ref.wav, calm_ref.wav, excited_ref.wav
        # calm_ref.wav sẽ dùng cho CẢ calm VÀ sad
        self.emotion_refs = {
            'cheerful': base_dir / 'cheerful_ref.wav',
            'excited': base_dir / 'excited_ref.wav',
            'calm': base_dir / 'calm_ref.wav',
            'sad': base_dir / 'calm_ref.wav',      # Dùng chung calm_ref
            'neutral': base_dir / 'base_voice.wav'  # Base voice cho neutral
        }
        
        # Base voice for cloning
        self.base_voice = base_dir / 'base_voice.wav'
        
        # Text normalizer using enhanced VietnameseTTSNormalizer
        self.text_normalizer = VietnameseTTSNormalizer()
        
        # Verify emotion refs exist
        missing = []
        for emotion, path in self.emotion_refs.items():
            if not path.exists():
                missing.append(f"{emotion}: {path}")
        
        if missing:
            print(f"[viXTTS] ⚠️ Missing emotion refs:")
            for m in missing:
                print(f"   - {m}")

    def _resolve_emotion_ref(self, emotion: str) -> Path:
        """Map emotion id → WAV mẫu (fallback neutral/base nếu thiếu file)."""
        ref = self.emotion_refs.get(emotion, self.emotion_refs["neutral"])
        if emotion == "sad":
            sad_path = self.base_dir / "sad_ref.wav"
            if sad_path.exists():
                ref = sad_path
        if not ref.exists():
            print(f"[viXTTS] Emotion ref missing for {emotion}: {ref} — using neutral")
            ref = self.emotion_refs["neutral"]
        return ref

    # Cảm xúc: lệch nhẹ quanh base temp 0.3 (demo viXTTS) — temp cao gây tiếng vang
    EMOTION_INFERENCE_PARAMS = {
        "cheerful": {"temperature": 0.35, "length_penalty": 0.98, "speed": 1.00},
        "excited": {"temperature": 0.40, "length_penalty": 0.95, "speed": 1.00},
        "calm": {"temperature": 0.25, "length_penalty": 1.05, "speed": 1.00},
        "sad": {"temperature": 0.28, "length_penalty": 1.03, "speed": 1.00},
        "neutral": {"temperature": VIXTTS_BASE_TEMPERATURE, "length_penalty": 1.00, "speed": 1.00},
    }

    def _cond_latent_kwargs(self):
        """Dùng gpt_cond_len / max_ref_len từ config model (12s/10s), không hard-code 30/120."""
        cfg = self.model.config
        return {
            "gpt_cond_len": int(getattr(cfg, "gpt_cond_len", 12)),
            "gpt_cond_chunk_len": int(getattr(cfg, "gpt_cond_chunk_len", 4)),
            "max_ref_length": int(getattr(cfg, "max_ref_len", 10)),
            "sound_norm_refs": bool(getattr(cfg, "sound_norm_refs", False)),
        }

    def _get_identity_latents(self, identity_path=None, cache=None):
        """
        Tính (gpt_cond_latent, speaker_embedding) MỘT LẦN từ giọng identity.
        File tham chiếu chỉ xác định giọng nói — không đổi theo từng chunk/cảm xúc.
        """
        if cache is None:
            cache = {}
        identity = Path(identity_path or self.base_voice).resolve()
        id_key = str(identity)
        if id_key in cache:
            return cache[id_key]

        gpt_cond_latent, speaker_embedding = self.model.get_conditioning_latents(
            audio_path=[id_key],
            **self._cond_latent_kwargs(),
        )
        cache[id_key] = (gpt_cond_latent, speaker_embedding)
        return gpt_cond_latent, speaker_embedding

    def _emotion_inference_params(self, emotion):
        return self.EMOTION_INFERENCE_PARAMS.get(
            emotion, self.EMOTION_INFERENCE_PARAMS["neutral"]
        )

    def _apply_emotion_speed(self, wav, speed):
        if not VIXTTS_EMOTION_SPEED_ENABLED or abs(speed - 1.0) < 0.01:
            return wav
        try:
            import librosa
            return librosa.effects.time_stretch(wav, rate=speed)
        except Exception as e:
            print(f"[viXTTS] Warning: emotion speed adjust skipped: {e}")
            return wav

    @staticmethod
    def _trim_wav_edges(wav, top_db=28):
        """Cắt im lặng đầu/cuối chunk — giảm cảm giác vang khi ghép nhiều đoạn."""
        try:
            import librosa
            import numpy as np
            arr = np.asarray(wav, dtype=np.float32).squeeze()
            if arr.size == 0:
                return wav
            trimmed, _ = librosa.effects.trim(arr, top_db=top_db)
            return trimmed if trimmed.size > 0 else arr
        except Exception as e:
            print(f"[viXTTS] Warning: trim skipped: {e}")
            return wav

    @staticmethod
    def _concat_wav_chunks(temp_files, output_file, pause_ms=VIXTTS_CHUNK_PAUSE_MS):
        """Ghép chunk WAV; không chèn pause sau chunk cuối."""
        if len(temp_files) == 1:
            import shutil
            shutil.move(temp_files[0], output_file)
            return
        print(f"[viXTTS] Concatenating {len(temp_files)} chunks...")
        combined = AudioSegment.empty()
        for i, f in enumerate(temp_files):
            combined += AudioSegment.from_wav(f)
            if i < len(temp_files) - 1 and pause_ms > 0:
                combined += AudioSegment.silent(duration=pause_ms)
        combined.export(output_file, format="wav")

    @staticmethod
    def _truncate_reverb_tail(wav, text):
        """
        Cắt đuôi audio XTTS hay sinh thêm (nghe như vang) — logic từ viXTTS demo.
        """
        import numpy as np
        text = text or ""
        word_count = len(text.split())
        num_punct = sum(text.count(c) for c in ".!?,")
        if word_count < 5:
            keep_len = 15000 * word_count + 2000 * num_punct
        elif word_count < 10:
            keep_len = 13000 * word_count + 2000 * num_punct
        else:
            return wav
        arr = np.asarray(wav, dtype=np.float32).squeeze()
        if keep_len > 0 and arr.size > keep_len:
            return arr[:keep_len]
        return arr

    def _postprocess_chunk_wav(self, wav, text, speed=1.0):
        wav = self._truncate_reverb_tail(wav, text)
        wav = self._trim_wav_edges(wav)
        wav = self._apply_emotion_speed(wav, speed)
        return wav

    def _infer_chunk(self, text, gpt_cond_latent, speaker_embedding, emotion="neutral"):
        params = self._emotion_inference_params(emotion)
        out = self.model.inference(
            text=text,
            language="vi",
            gpt_cond_latent=gpt_cond_latent,
            speaker_embedding=speaker_embedding,
            temperature=params["temperature"],
            length_penalty=params["length_penalty"],
            repetition_penalty=VIXTTS_REPETITION_PENALTY,
            top_k=VIXTTS_TOP_K,
            top_p=0.85,
            enable_text_splitting=False,
        )
        out["wav"] = self._postprocess_chunk_wav(out["wav"], text, params["speed"])
        return out

    def load_model(self):
        """Load viXTTS model from HuggingFace"""
        if self.model is not None:
            print("[viXTTS] Model already loaded!")
            return
        
        print("[viXTTS] Loading viXTTS model...")
        
        # Download model if not exists
        self.model_dir.mkdir(exist_ok=True)
        required_files = ["model.pth", "config.json", "vocab.json", "speakers_xtts.pth"]
        files_in_dir = os.listdir(self.model_dir) if self.model_dir.exists() else []
        
        if not all(file in files_in_dir for file in required_files):
            print("[viXTTS] Downloading model from HuggingFace (first time, ~2GB)...")
            snapshot_download(
                repo_id="capleaf/viXTTS",
                repo_type="model",
                local_dir=str(self.model_dir),
            )
            hf_hub_download(
                repo_id="coqui/XTTS-v2",
                filename="speakers_xtts.pth",
                local_dir=str(self.model_dir),
            )
            print("[viXTTS] Model downloaded!")
        
        # Load config
        config_path = self.model_dir / "config.json"
        config = XttsConfig()
        config.load_json(str(config_path))
        
        # Init model
        self.model = Xtts.init_from_config(config)
        self.model.load_checkpoint(
            config, 
            checkpoint_dir=str(self.model_dir), 
            vocab_path=str(self.model_dir / "vocab.json"),  # Explicitly load vocab
            use_deepspeed=False
        )
        
        # Move to GPU if available
        if torch.cuda.is_available():
            self.model.cuda()
            print("[viXTTS] Model loaded on GPU!")
        else:
            print("[viXTTS] Model loaded on CPU (slower)")
        
        # CRITICAL FIX: Monkey-patch tokenizer to support 'vi'
        original_preprocess = self.model.tokenizer.preprocess_text
        def patched_preprocess(txt, lang):
            if lang == 'vi':
                # Bypass language check for Vietnamese
                return txt
            return original_preprocess(txt, lang)
        self.model.tokenizer.preprocess_text = patched_preprocess
        if not getattr(self.model.tokenizer, 'char_limits', None):
            self.model.tokenizer.char_limits = {}
        if 'vi' not in self.model.tokenizer.char_limits:
            self.model.tokenizer.char_limits['vi'] = VIXTTS_MAX_CHUNK_CHARS
        print("[viXTTS] ✅ Vietnamese tokenizer patched!")
        
        print("[viXTTS] ✅ Model ready!")
    
    def detect_emotion(self, text):
        """Phát hiện emotion từ tag (buồn), (vui vẻ) — dùng bảng alias chung."""
        return parse_emotion_from_text(text)

    @staticmethod
    def _split_text_chunks(text, max_chars=None):
        """Tách theo câu trước, rồi theo độ dài — giảm cắt giữa câu gây artifact."""
        if max_chars is None:
            max_chars = VIXTTS_MAX_CHUNK_CHARS
        text = (text or '').strip()
        if not text:
            return []
        if len(text) <= max_chars:
            return [text]

        sentences = re.split(r'(?<=[.!?…])\s+', text)
        parts = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            if len(sentence) <= max_chars:
                parts.append(sentence)
            else:
                parts.extend(ViXTTSEmotionalTTS._split_long_text(sentence, max_chars))
        return parts if parts else ViXTTSEmotionalTTS._split_long_text(text, max_chars)

    @staticmethod
    def _split_long_text(text, max_chars=None):
        """Chia văn bản dài thành các đoạn nhỏ cho viXTTS."""
        if max_chars is None:
            max_chars = VIXTTS_MAX_CHUNK_CHARS
        text = (text or '').strip()
        if not text:
            return []
        if len(text) <= max_chars:
            return [text]

        words = text.split()
        parts = []
        current = ''
        for word in words:
            if len(current) + len(word) + 1 > max_chars and current:
                parts.append(current.strip())
                current = word
            else:
                current = (current + ' ' + word).strip()
        if current.strip():
            parts.append(current.strip())
        return parts if parts else [text]

    @staticmethod
    def _expand_emotional_chunks(chunks, max_chars=None):
        """Tách thêm theo câu/độ dài, giữ nguyên emotion từng đoạn."""
        if max_chars is None:
            max_chars = VIXTTS_MAX_CHUNK_CHARS
        expanded = []
        for chunk in chunks:
            emotion = chunk.get('emotion') or 'neutral'
            for piece in ViXTTSEmotionalTTS._split_text_chunks(chunk.get('text') or '', max_chars):
                if piece.strip():
                    expanded.append({'text': piece, 'emotion': emotion})
        return expanded

    def clean_text(self, text, skip_normalize=False):
        """Xóa emotion tags; chuẩn hóa qua service chung trừ khi route đã normalize."""
        text = re.sub(r'\([^)]*\)', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if skip_normalize:
            return text
        try:
            text = self.text_normalizer.normalize(text)
        except (UnicodeEncodeError, Exception) as e:
            print(f"[viXTTS] Warning: Text normalization skipped due to: {e}")
        return text

    def split_by_emotion(self, text, skip_normalize=False):
        """Chia text theo tag (vui)/(bình tĩnh)/(buồn) — dùng parser chung."""
        normalizer = None if skip_normalize else self.text_normalizer.normalize
        return parse_split_by_emotion(text, normalizer=normalizer)

    def synthesize_with_voice(self, text, voice_audio_path, output_file="output.wav", skip_text_normalize=False):
        """
        Generate speech using a custom voice reference (viXTTS clone)
        
        Args:
            text: Vietnamese text to synthesize
            voice_audio_path: Path to reference audio file for voice cloning
            output_file: Output file path
        
        Returns:
            Path to generated audio file
        """
        try:
            if self.model is None:
                self.load_model()
            
            print(f"[viXTTS-Clone] Processing ({len(text)} chars) with voice: {voice_audio_path}...")
            
            # Normalize text (unless route already applied shared TN service)
            clean = text
            if not skip_text_normalize:
                try:
                    clean = self.text_normalizer.normalize(text)
                except Exception:
                    pass
            
            if not clean.strip():
                raise Exception("No text to process after normalization")

            chunks_text = self._split_text_chunks(clean)
            print(f"[viXTTS-Clone] {len(chunks_text)} text chunk(s)")

            latent_cache = {}
            gpt_cond_latent, speaker_embedding = self._get_identity_latents(
                voice_audio_path, cache=latent_cache
            )
            
            temp_files = []
            for i, chunk_text in enumerate(chunks_text):
                print(f"[viXTTS-Clone] Chunk {i+1}/{len(chunks_text)}: {chunk_text[:50]}...")
                try:
                    temp_file = f"temp_vixtts_clone_{i}_{os.getpid()}.wav"
                    out = self._infer_chunk(
                        chunk_text, gpt_cond_latent, speaker_embedding, "neutral"
                    )
                    import soundfile as sf
                    sf.write(temp_file, out["wav"], 24000)
                    if os.path.exists(temp_file):
                        temp_files.append(temp_file)
                        print(f"[viXTTS-Clone]   ✅ Generated: {os.path.getsize(temp_file)} bytes")
                except Exception as e:
                    print(f"[viXTTS-Clone] ❌ Error on chunk {i}: {e}")
                    traceback.print_exc()
            
            if not temp_files:
                raise Exception("No audio chunks generated")
            
            if len(temp_files) > 1:
                self._concat_wav_chunks(temp_files, output_file)
            else:
                import shutil
                shutil.move(temp_files[0], output_file)
            
            for f in temp_files:
                if os.path.exists(f):
                    try:
                        os.remove(f)
                    except Exception:
                        pass
            
            print(f"[viXTTS-Clone] ✅ Done: {output_file}")
            return output_file
            
        except Exception as e:
            print(f"[viXTTS-Clone] ❌ Error: {e}")
            traceback.print_exc()
            raise

    def synthesize_emotional_with_voice(self, text, voice_audio_path, output_file="output.wav", skip_text_normalize=False):
        """
        Emotion-aware synthesis using a CUSTOM voice reference.
        Combines emotion detection/text-chunking from synthesize()
        with the custom speaker identity from synthesize_with_voice().

        Args:
            text: Vietnamese text với emotion tags
            voice_audio_path: Path to user's reference audio (voice identity)
            output_file: Output file path
        """
        try:
            if self.model is None:
                self.load_model()

            print(f"[viXTTS-Emotional-Clone] Processing ({len(text)} chars) with voice: {voice_audio_path}...")

            # Split text into emotional chunks (same as synthesize())
            chunks = self.split_by_emotion(text, skip_normalize=skip_text_normalize)
            chunks = self._expand_emotional_chunks(chunks)
            print(f"[viXTTS-Emotional-Clone] {len(chunks)} emotional chunk(s)")

            if not chunks:
                raise Exception("No text to process")

            latent_cache = {}
            gpt_cond_latent, speaker_embedding = self._get_identity_latents(
                voice_audio_path, cache=latent_cache
            )
            print(
                f"[viXTTS-Emotional-Clone] Identity latents from: "
                f"{Path(voice_audio_path).name} (fixed for all chunks)"
            )

            temp_files = []
            for i, chunk in enumerate(chunks):
                emotion = chunk["emotion"]
                params = self._emotion_inference_params(emotion)
                print(
                    f"[viXTTS-Emotional-Clone] Chunk {i+1}/{len(chunks)}: [{emotion}] "
                    f"temp={params['temperature']} speed={params['speed']}x — "
                    f"{chunk['text'][:50]}..."
                )
                try:
                    temp_file = f"temp_vixtts_emoclone_{i}_{os.getpid()}.wav"
                    out = self._infer_chunk(
                        chunk["text"], gpt_cond_latent, speaker_embedding, emotion
                    )
                    import soundfile as sf
                    sf.write(temp_file, out["wav"], 24000)
                    if os.path.exists(temp_file):
                        temp_files.append(temp_file)
                        print(f"[viXTTS-Emotional-Clone]   ✅ {os.path.getsize(temp_file)} bytes")
                except Exception as e:
                    print(f"[viXTTS-Emotional-Clone] ❌ Error on chunk {i}: {e}")
                    traceback.print_exc()

            if not temp_files:
                raise Exception("No audio chunks generated")

            if len(temp_files) > 1:
                self._concat_wav_chunks(temp_files, output_file)
            else:
                import shutil
                shutil.move(temp_files[0], output_file)

            for f in temp_files:
                if os.path.exists(f):
                    try:
                        os.remove(f)
                    except Exception:
                        pass

            print(f"[viXTTS-Emotional-Clone] ✅ Done: {output_file}")
            return output_file

        except Exception as e:
            print(f"[viXTTS-Emotional-Clone] ❌ Error: {e}")
            traceback.print_exc()
            raise

    def synthesize(self, text, output_file="output.wav", skip_text_normalize=False):
        """
        Generate speech với emotion control
        
        Args:
            text: Vietnamese text với emotion tags
            output_file: Output file path
        
        Returns:
            Path to generated audio file
        """
        try:
            # Load model if not loaded
            if self.model is None:
                self.load_model()
            
            print(f"[viXTTS] Processing ({len(text)} chars)...")
            
            # Chia text thành chunks theo emotion
            chunks = self.split_by_emotion(text, skip_normalize=skip_text_normalize)
            chunks = self._expand_emotional_chunks(chunks)
            print(f"[viXTTS] {len(chunks)} emotional chunks detected")
            
            if not chunks:
                raise Exception("No text to process")

            latent_cache = {}
            gpt_cond_latent, speaker_embedding = self._get_identity_latents(
                self.base_voice, cache=latent_cache
            )
            print(
                f"[viXTTS] Identity latents from: {self.base_voice.name} "
                f"(fixed for all chunks; emotion via inference params only)"
            )

            temp_files = []
            for i, chunk in enumerate(chunks):
                emotion = chunk["emotion"]
                params = self._emotion_inference_params(emotion)
                print(
                    f"[viXTTS] Chunk {i+1}/{len(chunks)}: [{emotion}] "
                    f"temp={params['temperature']} speed={params['speed']}x — "
                    f"{chunk['text'][:50]}..."
                )

                try:
                    temp_file = f"temp_vixtts_{i}_{os.getpid()}.wav"
                    out = self._infer_chunk(
                        chunk["text"], gpt_cond_latent, speaker_embedding, emotion
                    )
                    
                    # Save temp file
                    import soundfile as sf
                    sf.write(temp_file, out["wav"], 24000)
                    
                    if os.path.exists(temp_file):
                        temp_files.append(temp_file)
                        print(f"[viXTTS]   ✅ Generated: {os.path.getsize(temp_file)} bytes")
                    
                except Exception as e:
                    print(f"[viXTTS] ❌ Error generating chunk {i}: {e}")
                    traceback.print_exc()
            
            if not temp_files:
                raise Exception("No audio chunks generated")
            
            # Concatenate tất cả chunks
            if len(temp_files) > 1:
                self._concat_wav_chunks(temp_files, output_file)
            else:
                # Chỉ 1 chunk
                import shutil
                shutil.move(temp_files[0], output_file)
            
            # Cleanup temp files
            for f in temp_files:
                if os.path.exists(f):
                    try:
                        os.remove(f)
                    except:
                        pass
            
            print(f"[viXTTS] ✅ Done: {output_file}")
            return output_file
            
        except Exception as e:
            print(f"[viXTTS] ❌ Error: {e}")
            traceback.print_exc()
            raise


# Singleton instance
_vixtts_emotional_instance = None

def get_vixtts_emotional_instance():
    """Get singleton instance"""
    global _vixtts_emotional_instance
    if _vixtts_emotional_instance is None:
        _vixtts_emotional_instance = ViXTTSEmotionalTTS()
    return _vixtts_emotional_instance
