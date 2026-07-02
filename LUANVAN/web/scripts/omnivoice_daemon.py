"""
OmniVoice daemon — load model once, serve many inference requests via stdin/stdout JSON lines.

Protocol:
  Startup: prints {"status":"ready","device":"cuda:0"} after model loaded
  Request: one JSON object per line on stdin
  Response: one JSON object per line on stdout
  voice_session / save_voice_session: giu giong dong nhat giua nhieu chunk (auto mode)
  save_ref_voice_session: cache ref_audio prompt cho voice clone nhieu chunk
"""
import gc
import json
import os
import sys
import traceback

import numpy as np
import soundfile as sf

_voice_sessions = {}

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


def _cuda_free_gb(device_index=0):
    import torch
    if not torch.cuda.is_available():
        return 0.0
    try:
        free, _ = torch.cuda.mem_get_info(device_index)
        return free / (1024 ** 3)
    except Exception:
        return 0.0


def _resolve_device():
    forced = (os.environ.get("OMNIVOICE_DEVICE") or "auto").strip().lower()
    import torch
    min_vram_gb = float(os.environ.get("OMNIVOICE_MIN_VRAM_GB", "2.5"))

    if forced and forced not in ("auto", ""):
        dev = forced
    elif torch.cuda.is_available() and _cuda_free_gb() >= min_vram_gb:
        dev = "cuda:0"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        dev = "mps"
    else:
        dev = "cpu"

    dtype = torch.float16 if str(dev).startswith("cuda") else torch.float32
    return dev, dtype


def _load_model(model_id, device, dtype):
    import torch
    from omnivoice import OmniVoice

    print(f"[OmniVoice Daemon] Loading {model_id} on {device}...", file=sys.stderr, flush=True)
    try:
        model = OmniVoice.from_pretrained(model_id, device_map=device, dtype=dtype)
        print(f"[OmniVoice Daemon] Model ready on {device}", file=sys.stderr, flush=True)
        return model, device, dtype
    except torch.cuda.OutOfMemoryError:
        if not str(device).startswith("cuda"):
            raise
        print("[OmniVoice Daemon] GPU het VRAM khi load — chuyen sang CPU...", file=sys.stderr, flush=True)
        gc.collect()
        torch.cuda.empty_cache()
        model = OmniVoice.from_pretrained(model_id, device_map="cpu", dtype=torch.float32)
        print("[OmniVoice Daemon] Model ready on cpu", file=sys.stderr, flush=True)
        return model, "cpu", torch.float32


def _build_kwargs(job):
    text = (job.get("text") or "").strip()
    kwargs = {"text": text, "speed": float(job.get("speed", 1.0))}

    session_id = job.get("voice_session")
    if session_id and session_id in _voice_sessions:
        kwargs["voice_clone_prompt"] = _voice_sessions[session_id]
    elif job.get("ref_audio"):
        kwargs["ref_audio"] = job["ref_audio"]
        if job.get("ref_text"):
            kwargs["ref_text"] = job["ref_text"]

    if job.get("instruct"):
        kwargs["instruct"] = job["instruct"]

    return kwargs


def _ensure_ref_voice_session(model, job, text):
    sid = job.get("save_ref_voice_session")
    if not sid or sid in _voice_sessions:
        return
    ref_path = job.get("ref_audio")
    if not ref_path:
        return
    ref_txt = (job.get("ref_text") or "").strip()
    try:
        # ref_text phải là transcript file mẫu — không dùng text cần đọc (có thể chứa tag cảm xúc)
        if ref_txt:
            prompt = model.create_voice_clone_prompt(ref_path, ref_text=ref_txt)
        else:
            prompt = model.create_voice_clone_prompt(ref_path)
        _voice_sessions[sid] = prompt
        print(f"[OmniVoice Daemon] Ref voice session saved: {sid}", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"[OmniVoice Daemon] Ref voice session save failed: {e}", file=sys.stderr, flush=True)


def _apply_ref_session_to_kwargs(job, kwargs):
    sid = job.get("save_ref_voice_session")
    if sid and sid in _voice_sessions and job.get("ref_audio"):
        kwargs["voice_clone_prompt"] = _voice_sessions[sid]
        kwargs.pop("ref_audio", None)
        kwargs.pop("ref_text", None)


def _generate(model, kwargs, device):
    import torch

    if str(device).startswith("cuda"):
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    try:
        return model.generate(**kwargs)
    except torch.cuda.OutOfMemoryError:
        gc.collect()
        torch.cuda.empty_cache()
        raise
    except RuntimeError as e:
        if _is_cuda_memory_error(e):
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise
        raise


def main():
    model_id = os.environ.get("OMNIVOICE_MODEL", "k2-fsa/OmniVoice")
    device, dtype = _resolve_device()
    if device == "cpu" and os.environ.get("OMNIVOICE_DEVICE", "auto").strip().lower() == "auto":
        free = _cuda_free_gb()
        print(
            f"[OmniVoice Daemon] auto: GPU con {free:.2f}GB VRAM — dung CPU cho OmniVoice",
            file=sys.stderr,
            flush=True,
        )

    model, device, _dtype = _load_model(model_id, device, dtype)
    print(json.dumps({"status": "ready", "device": device}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        job_id = None
        try:
            job = json.loads(line)
            job_id = job.get("id")
            text = (job.get("text") or "").strip()
            if not text:
                raise ValueError("text is empty")

            _ensure_ref_voice_session(model, job, text)
            kwargs = _build_kwargs(job)
            _apply_ref_session_to_kwargs(job, kwargs)
            audio_list = _generate(model, kwargs, device)
            if not audio_list:
                raise RuntimeError("OmniVoice returned empty audio")

            arr = np.asarray(audio_list[0], dtype=np.float32).flatten()
            out_path = job["output"]
            sf.write(out_path, arr, 24000)

            import torch
            if str(device).startswith("cuda") and torch.cuda.is_available():
                gc.collect()
                torch.cuda.empty_cache()
                torch.cuda.synchronize()

            save_sid = job.get("save_voice_session")
            if save_sid:
                try:
                    prompt = model.create_voice_clone_prompt(out_path, ref_text=text)
                    _voice_sessions[save_sid] = prompt
                    print(f"[OmniVoice Daemon] Voice session saved: {save_sid}", file=sys.stderr, flush=True)
                except Exception as e:
                    print(f"[OmniVoice Daemon] Voice session save failed: {e}", file=sys.stderr, flush=True)

            print(json.dumps({"id": job_id, "ok": True, "output": out_path}), flush=True)
        except Exception as e:
            print(json.dumps({
                "id": job_id,
                "ok": False,
                "error": str(e),
                "trace": traceback.format_exc(),
            }), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e), "trace": traceback.format_exc()}), flush=True)
        sys.exit(1)
