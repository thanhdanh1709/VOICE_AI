"""
OmniVoice TTS wrapper — multilingual zero-shot TTS (600+ languages).
https://huggingface.co/k2-fsa/OmniVoice

Luu y: OmniVoice can transformers>=5.3, viXTTS/Coqui TTS can transformers==4.44.
Hai goi KHONG cung ton tai trong 1 Python env. Mac dinh:
  - Env chinh: viXTTS + VieNeu (transformers 4.44)
  - venv_omnivoice/: OmniVoice (transformers 5.x) — daemon giu model trong RAM/VRAM
"""
import atexit
import gc
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

WEB_DIR = Path(__file__).resolve().parent
DAEMON_SCRIPT = WEB_DIR / "scripts" / "omnivoice_daemon.py"
DEFAULT_VENV = WEB_DIR / "venv_omnivoice"
SAMPLE_RATE = 24000
DEFAULT_MODEL = os.environ.get("OMNIVOICE_MODEL", "k2-fsa/OmniVoice")
DAEMON_STARTUP_TIMEOUT = int(os.environ.get("OMNIVOICE_DAEMON_TIMEOUT", "600"))
DEFAULT_MAX_CHARS = int(os.environ.get("OMNIVOICE_MAX_CHARS", "1000"))
DEFAULT_GPU_MAX_CHARS = int(os.environ.get("OMNIVOICE_GPU_MAX_CHARS", "150"))
INFERENCE_TIMEOUT = int(os.environ.get("OMNIVOICE_INFERENCE_TIMEOUT", "900"))

_CUDA_MEMORY_ERROR_MARKERS = (
    "out of memory",
    "cuda out of memory",
    "cublas_status_alloc_failed",
    "alloc_failed",
    "cuda error",
    "cannot allocate",
    "failed to allocate",
)


def _is_cuda_memory_error(msg):
    s = str(msg).lower()
    return any(m in s for m in _CUDA_MEMORY_ERROR_MARKERS)


def _venv_python():
    custom = os.environ.get("OMNIVOICE_PYTHON", "").strip()
    if custom and Path(custom).exists():
        return Path(custom)
    candidate = DEFAULT_VENV / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    return candidate if candidate.exists() else None


def _can_import_omnivoice_in(python_exe):
    try:
        r = subprocess.run(
            [str(python_exe), "-c", "import omnivoice"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        return r.returncode == 0
    except Exception:
        return False


def is_omnivoice_available():
    try:
        import omnivoice  # noqa: F401
        return True
    except ImportError:
        pass
    py = _venv_python()
    return py is not None and _can_import_omnivoice_in(py)


def _cuda_free_gb(device_index=0):
    if not torch.cuda.is_available():
        return 0.0
    try:
        free, _ = torch.cuda.mem_get_info(device_index)
        return free / (1024 ** 3)
    except Exception:
        return 0.0


def _release_cuda_cache(context=""):
    """Giai phong RAM Python + VRAM cache PyTorch giua cac chunk."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    if context:
        free_gb = _cuda_free_gb()
        print(f"[OmniVoice] Da giai phong bo nho ({context}), VRAM con ~{free_gb:.2f}GB", flush=True)


def _resolve_device():
    forced = (os.environ.get("OMNIVOICE_DEVICE") or "auto").strip().lower()
    min_vram_gb = float(os.environ.get("OMNIVOICE_MIN_VRAM_GB", "2.5"))

    if forced and forced not in ("auto", ""):
        return forced, torch.float16 if forced.startswith("cuda") else torch.float32

    if torch.cuda.is_available() and _cuda_free_gb() >= min_vram_gb:
        return "cuda:0", torch.float16
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps", torch.float32
    return "cpu", torch.float32


def split_text_for_omnivoice(text, max_chars=None):
    if max_chars is None:
        max_chars = DEFAULT_MAX_CHARS
    text = (text or "").strip()
    if len(text) <= max_chars:
        return [text]
    chunks = []
    sentences = re.split(r"(?<=[.!?;])\s+|(?<=\n)", text)
    current = ""
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        if len(current) + len(sent) + 1 <= max_chars:
            current = (current + " " + sent).strip() if current else sent
        else:
            if current:
                chunks.append(current)
            if len(sent) <= max_chars:
                current = sent
            else:
                while len(sent) > max_chars:
                    chunks.append(sent[:max_chars])
                    sent = sent[max_chars:]
                current = sent
    if current:
        chunks.append(current)
    return [c for c in chunks if c.strip()]


class OmniVoiceDaemonClient:
    """Persistent subprocess — model loaded once in venv_omnivoice."""

    def __init__(self, python_exe, model_id=None):
        self.python_exe = python_exe
        self.model_id = model_id or DEFAULT_MODEL
        self._proc = None
        self._lock = threading.Lock()
        self._ready = False
        self._device = None

    @property
    def is_ready(self):
        return self._ready and self._proc is not None and self._proc.poll() is None

    def start(self, force_device=None):
        if self.is_ready:
            return
        if self._proc is not None:
            self.stop()

        env = os.environ.copy()
        env["OMNIVOICE_MODEL"] = self.model_id
        env.setdefault("PYTHONUNBUFFERED", "1")
        env.setdefault("PYTHONIOENCODING", "utf-8")
        env.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
        if force_device:
            env["OMNIVOICE_DEVICE"] = force_device

        target = force_device or env.get("OMNIVOICE_DEVICE", "auto")
        print(f"[OmniVoice Daemon] Starting worker ({self.python_exe}), device={target}...")

        self._proc = subprocess.Popen(
            [str(self.python_exe), str(DAEMON_SCRIPT)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            env=env,
            cwd=str(WEB_DIR),
        )

        ready_line = None

        def _read_ready():
            nonlocal ready_line
            ready_line = self._proc.stdout.readline()

        t = threading.Thread(target=_read_ready, daemon=True)
        t.start()
        t.join(timeout=DAEMON_STARTUP_TIMEOUT)

        if not t.is_alive() and ready_line:
            msg = json.loads(ready_line.strip())
            if msg.get("status") == "ready":
                self._ready = True
                self._device = msg.get("device", "unknown")
                print(f"[OmniVoice Daemon] Ready on {self._device}")
                return

            err = msg.get("error") or str(msg)
            is_oom = _is_cuda_memory_error(err)
            forced_cuda = str(target).startswith("cuda")
            if is_oom and forced_cuda and force_device != "cpu":
                print("[OmniVoice Daemon] GPU het VRAM (viXTTS dang dung GPU?) — thu lai tren CPU...")
                self.stop()
                self.start(force_device="cpu")
                return

            raise RuntimeError(f"Daemon unexpected startup: {msg}")

        self.stop()
        raise RuntimeError(
            f"OmniVoice daemon failed to start within {DAEMON_STARTUP_TIMEOUT}s."
        )

    def stop(self):
        self._ready = False
        if self._proc is None:
            return
        try:
            if self._proc.stdin:
                self._proc.stdin.close()
        except Exception:
            pass
        try:
            self._proc.terminate()
            self._proc.wait(timeout=10)
        except Exception:
            try:
                self._proc.kill()
            except Exception:
                pass
        self._proc = None

    def generate_to_file(
        self,
        text,
        output_path,
        ref_audio=None,
        ref_text=None,
        instruct=None,
        speed=1.0,
        voice_session=None,
        save_voice_session=None,
        save_ref_voice_session=None,
    ):
        if not self.is_ready:
            self.start()

        job = {
            "id": str(uuid.uuid4()),
            "text": text,
            "output": str(output_path),
            "speed": speed,
        }
        if voice_session:
            job["voice_session"] = voice_session
        if save_voice_session:
            job["save_voice_session"] = save_voice_session
        if save_ref_voice_session:
            job["save_ref_voice_session"] = save_ref_voice_session
        if ref_audio:
            job["ref_audio"] = ref_audio
            if ref_text:
                job["ref_text"] = ref_text
        elif instruct:
            job["instruct"] = instruct

        with self._lock:
            if not self.is_ready:
                self.start()
            self._proc.stdin.write(json.dumps(job, ensure_ascii=False) + "\n")
            self._proc.stdin.flush()
            resp_line = None

            def _read_resp():
                nonlocal resp_line
                resp_line = self._proc.stdout.readline()

            rt = threading.Thread(target=_read_resp, daemon=True)
            rt.start()
            rt.join(timeout=INFERENCE_TIMEOUT)

        proc = self._proc
        if not resp_line:
            err = ""
            if proc is not None and proc.stderr is not None:
                try:
                    err = proc.stderr.read(4000)
                except Exception:
                    pass
            if proc is not None and proc.poll() is not None:
                self._ready = False
                raise RuntimeError(f"OmniVoice daemon exited (code {proc.returncode}). {err}")
            raise RuntimeError(f"OmniVoice inference timeout ({INFERENCE_TIMEOUT}s). {err}")

        resp = json.loads(resp_line.strip())
        if not resp.get("ok"):
            detail = resp.get("error") or "OmniVoice daemon inference failed"
            trace = (resp.get("trace") or "")[:800]
            err = RuntimeError(f"{detail}\n{trace}" if trace else detail)
            if _is_cuda_memory_error(detail):
                _release_cuda_cache("daemon inference loi VRAM")
            raise err

        out = resp.get("output") or output_path
        if not Path(out).exists():
            raise RuntimeError("Daemon did not create output file")
        return out


_daemon_client = None
_daemon_reload_lock = threading.Lock()
_omnivoice_progress = {}
_omnivoice_progress_lock = threading.Lock()


def set_omnivoice_progress(conversion_id, **kwargs):
    if conversion_id is None:
        return
    with _omnivoice_progress_lock:
        key = str(conversion_id)
        prev = _omnivoice_progress.get(key, {})
        prev.update(kwargs)
        _omnivoice_progress[key] = prev


def get_omnivoice_progress(conversion_id):
    with _omnivoice_progress_lock:
        return dict(_omnivoice_progress.get(str(conversion_id), {}))


def clear_omnivoice_progress(conversion_id):
    if conversion_id is None:
        return
    with _omnivoice_progress_lock:
        _omnivoice_progress.pop(str(conversion_id), None)


def _get_daemon_client(python_exe, model_id=None, force_device=None):
    global _daemon_client
    want_device = force_device or _resolve_device()[0]
    if _daemon_client is not None and _daemon_client.is_ready:
        if force_device or _daemon_client._device != want_device:
            if force_device:
                print(f"[OmniVoice Daemon] Restart de doi device {_daemon_client._device} -> {force_device}")
            _daemon_client.stop()
            _daemon_client = None
    if _daemon_client is None or not _daemon_client.is_ready:
        _daemon_client = OmniVoiceDaemonClient(python_exe, model_id)
        _daemon_client.start(force_device=force_device)
    return _daemon_client


def shutdown_omnivoice_daemon():
    global _daemon_client
    if _daemon_client is not None:
        _daemon_client.stop()
        _daemon_client = None


atexit.register(shutdown_omnivoice_daemon)


class OmniVoiceTTS:
    """OmniVoice engine — in-process hoac daemon subprocess (venv rieng)."""

    def __init__(self, model_id=None):
        self.model_id = model_id or DEFAULT_MODEL
        self.model = None
        self.device_map, self.dtype = _resolve_device()
        self._use_daemon = False
        self._venv_python = None
        self._daemon = None

        try:
            import omnivoice  # noqa: F401
            print(f"[OmniVoice] In-process mode, device={self.device_map}")
        except ImportError:
            py = _venv_python()
            if py and _can_import_omnivoice_in(py):
                self._use_daemon = True
                self._venv_python = py
                print(f"[OmniVoice] Daemon mode via {py}, target device={self.device_map}")
            else:
                raise ImportError(
                    "OmniVoice chua san sang. Chay scripts\\setup_omnivoice_venv.bat "
                    "de tao venv rieng (xung dot transformers voi viXTTS)."
                )

    @property
    def is_loaded(self):
        if self._use_daemon:
            return self._daemon is not None and self._daemon.is_ready
        return self.model is not None

    def load_model(self):
        if self._use_daemon:
            if self._daemon is None or not self._daemon.is_ready:
                self._daemon = _get_daemon_client(self._venv_python, self.model_id)
            return
        if self.model is not None:
            return
        print(f"[OmniVoice] Loading model {self.model_id} on {self.device_map}...")
        from omnivoice import OmniVoice

        self.model = OmniVoice.from_pretrained(
            self.model_id,
            device_map=self.device_map,
            dtype=self.dtype,
        )
        print("[OmniVoice] Model loaded successfully")

    @staticmethod
    def _is_oom_error(exc):
        return _is_cuda_memory_error(exc)

    def _is_cuda_daemon(self):
        return (
            self._use_daemon
            and self._daemon is not None
            and self._daemon.is_ready
            and str(self._daemon._device or "").startswith("cuda")
        )

    def _effective_max_chars(self, max_chars):
        if max_chars is not None:
            return max_chars
        if self._is_cuda_daemon():
            return DEFAULT_GPU_MAX_CHARS
        return DEFAULT_MAX_CHARS

    def _reload_daemon_on_cpu(self):
        print("[OmniVoice] GPU OOM khi inference — restart daemon tren CPU...", flush=True)
        with _daemon_reload_lock:
            shutdown_omnivoice_daemon()
            self._daemon = None
            self._daemon = _get_daemon_client(self._venv_python, self.model_id, force_device="cpu")
            if not self._daemon.is_ready:
                raise RuntimeError("Khong the khoi dong OmniVoice daemon tren CPU")

    def _do_synthesize(
        self,
        text,
        output_file,
        ref_audio=None,
        ref_text=None,
        instruct=None,
        speed=1.0,
        max_chars=None,
    ):
        max_chars = self._effective_max_chars(max_chars)
        chunks = split_text_for_omnivoice(text, max_chars=max_chars)
        device_label = self._daemon._device if self._use_daemon and self._daemon else self.device_map
        print(
            f"[OmniVoice] Synthesizing {len(chunks)} chunk(s) on {device_label} "
            f"(max {max_chars} chars/chunk)",
            flush=True,
        )

        if self._is_cuda_daemon():
            _release_cuda_cache("truoc khi synthesize")

        auto_session = str(uuid.uuid4()) if len(chunks) > 1 and ref_audio is None else None
        clone_session = str(uuid.uuid4()) if len(chunks) > 1 and ref_audio else None
        parts = []
        for i, chunk in enumerate(chunks):
            print(f"[OmniVoice] Chunk {i + 1}/{len(chunks)} ({len(chunk)} chars)", flush=True)
            use_ref = ref_audio if not clone_session or i == 0 else None
            use_ref_text = ref_text if not clone_session or i == 0 else None
            parts.append(
                self._generate_chunk(
                    chunk,
                    use_ref,
                    use_ref_text,
                    instruct if not ref_audio else None,
                    speed,
                    voice_session=(
                        clone_session if clone_session and i > 0
                        else (auto_session if auto_session and i > 0 else None)
                    ),
                    save_voice_session=auto_session if auto_session and i == 0 else None,
                    save_ref_voice_session=clone_session if clone_session and i == 0 else None,
                )
            )
            if i == 0 and auto_session:
                print("[OmniVoice] Giu giong chunk 1 cho cac chunk tiep theo (voice session)", flush=True)
            if i == 0 and clone_session:
                print("[OmniVoice] Cache ref audio cho cac chunk tiep theo (clone session)", flush=True)
            _release_cuda_cache(f"sau chunk {i + 1}/{len(chunks)}")

        combined = parts[0] if len(parts) == 1 else np.concatenate(parts)
        del parts
        out_path = Path(output_file)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out_path), combined, SAMPLE_RATE)
        duration_s = len(combined) / SAMPLE_RATE
        del combined
        _release_cuda_cache("sau khi ghep file")
        print(f"[OmniVoice] Saved: {out_path} ({duration_s:.2f}s)", flush=True)
        return str(out_path)

    def _generate_chunk(
        self,
        text,
        ref_audio=None,
        ref_text=None,
        instruct=None,
        speed=1.0,
        voice_session=None,
        save_voice_session=None,
        save_ref_voice_session=None,
    ):
        if self._use_daemon:
            if self._daemon is None or not self._daemon.is_ready:
                self.load_model()
            tmp_out = tempfile.mktemp(suffix=".wav")
            try:
                self._daemon.generate_to_file(
                    text, tmp_out,
                    ref_audio=ref_audio, ref_text=ref_text,
                    instruct=instruct, speed=speed,
                    voice_session=voice_session,
                    save_voice_session=save_voice_session,
                    save_ref_voice_session=save_ref_voice_session,
                )
                arr, _ = sf.read(tmp_out)
                return np.asarray(arr, dtype=np.float32).flatten()
            finally:
                try:
                    os.unlink(tmp_out)
                except OSError:
                    pass

        kwargs = {"text": text, "speed": speed}
        if ref_audio:
            kwargs["ref_audio"] = ref_audio
            if ref_text:
                kwargs["ref_text"] = ref_text
        if instruct:
            kwargs["instruct"] = instruct

        audio_list = self.model.generate(**kwargs)
        if not audio_list:
            raise RuntimeError("OmniVoice returned empty audio")
        return np.asarray(audio_list[0], dtype=np.float32).flatten()

    def synthesize(
        self,
        text,
        output_file,
        ref_audio=None,
        ref_text=None,
        instruct=None,
        speed=1.0,
        max_chars=None,
    ):
        if self.model is None and not (self._use_daemon and self._daemon and self._daemon.is_ready):
            self.load_model()

        text = (text or "").strip()
        if not text:
            raise ValueError("Text is empty")

        try:
            return self._do_synthesize(
                text, output_file, ref_audio, ref_text, instruct, speed, max_chars
            )
        except RuntimeError as e:
            if self._is_oom_error(e) and self._is_cuda_daemon():
                print(f"[OmniVoice] GPU het VRAM ({e}) — fallback CPU...", flush=True)
                self._reload_daemon_on_cpu()
                return self._do_synthesize(
                    text, output_file, ref_audio, ref_text, instruct, speed, max_chars=None
                )
            raise

    def _do_synthesize_emotional(
        self,
        text,
        output_file,
        ref_audio=None,
        ref_text=None,
        speed=1.0,
        max_chars=None,
        progress_callback=None,
    ):
        from emotion_parser import plan_emotional_chunks

        max_chars = self._effective_max_chars(max_chars)
        jobs = plan_emotional_chunks(text, max_chars=max_chars)
        if not jobs:
            raise ValueError("Không có đoạn văn bản sau khi phân tích cảm xúc")

        device_label = self._daemon._device if self._use_daemon and self._daemon else self.device_map
        emotions_used = list(dict.fromkeys(j["emotion"] for j in jobs))
        print(
            f"[OmniVoice Emotional] {len(jobs)} chunk(s), emotions={emotions_used}, device={device_label}",
            flush=True,
        )

        if self._is_cuda_daemon():
            _release_cuda_cache("truoc emotional synthesize")

        clone_session = str(uuid.uuid4()) if len(jobs) > 1 and ref_audio else None
        auto_session = str(uuid.uuid4()) if len(jobs) > 1 and ref_audio is None else None
        parts = []
        prev_emotion = None

        for i, job in enumerate(jobs):
            emotion = job["emotion"]
            instruct = job.get("instruct")
            chunk_text = job["text"]

            if progress_callback:
                progress_callback(i + 1, len(jobs), emotion, chunk_text)

            print(
                f"[OmniVoice Emotional] Chunk {i + 1}/{len(jobs)} [{emotion}] "
                f"({len(chunk_text)} chars)",
                flush=True,
            )

            if prev_emotion is not None and emotion != prev_emotion:
                parts.append(np.zeros(int(SAMPLE_RATE * 0.3), dtype=np.float32))

            use_ref = ref_audio if not clone_session or i == 0 else None
            use_ref_text = ref_text if not clone_session or i == 0 else None

            parts.append(
                self._generate_chunk(
                    chunk_text,
                    use_ref,
                    use_ref_text,
                    instruct,
                    speed,
                    voice_session=(
                        clone_session if clone_session and i > 0
                        else (auto_session if auto_session and i > 0 else None)
                    ),
                    save_voice_session=auto_session if auto_session and i == 0 else None,
                    save_ref_voice_session=clone_session if clone_session and i == 0 else None,
                )
            )

            if i == 0 and clone_session:
                print("[OmniVoice Emotional] Cache ref audio cho cac chunk tiep theo", flush=True)

            prev_emotion = emotion
            _release_cuda_cache(f"sau emotional chunk {i + 1}/{len(jobs)}")

        combined = parts[0] if len(parts) == 1 else np.concatenate(parts)
        del parts
        out_path = Path(output_file)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out_path), combined, SAMPLE_RATE)
        duration_s = len(combined) / SAMPLE_RATE
        del combined
        _release_cuda_cache("sau emotional ghep file")
        print(f"[OmniVoice Emotional] Saved: {out_path} ({duration_s:.2f}s)", flush=True)
        return str(out_path), emotions_used

    def synthesize_emotional(
        self,
        text,
        output_file,
        ref_audio=None,
        ref_text=None,
        speed=1.0,
        max_chars=None,
        progress_callback=None,
    ):
        if self.model is None and not (self._use_daemon and self._daemon and self._daemon.is_ready):
            self.load_model()

        text = (text or "").strip()
        if not text:
            raise ValueError("Text is empty")

        try:
            path, _emotions = self._do_synthesize_emotional(
                text, output_file, ref_audio, ref_text, speed, max_chars, progress_callback
            )
            return path
        except RuntimeError as e:
            if self._is_oom_error(e) and self._is_cuda_daemon():
                print(f"[OmniVoice Emotional] GPU het VRAM ({e}) — fallback CPU...", flush=True)
                self._reload_daemon_on_cpu()
                path, _emotions = self._do_synthesize_emotional(
                    text, output_file, ref_audio, ref_text, speed, max_chars=None, progress_callback=progress_callback
                )
                return path
            raise

    def synthesize_with_voice(self, text, ref_audio_path, output_file, ref_text=None, speed=1.0):
        return self.synthesize(
            text=text,
            output_file=output_file,
            ref_audio=ref_audio_path,
            ref_text=ref_text or None,
            speed=speed,
        )


_omnivoice_instance = None


def get_omnivoice_instance():
    global _omnivoice_instance
    if _omnivoice_instance is None:
        _omnivoice_instance = OmniVoiceTTS()
    return _omnivoice_instance
