"""Chạy inference OmniVoice trong venv riêng (tránh xung đột transformers với viXTTS)."""
import argparse
import json
import sys

import soundfile as sf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="JSON file with inference params")
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)

    import torch
    from omnivoice import OmniVoice

    device = cfg.get("device", "cpu")
    dtype = torch.float16 if str(device).startswith("cuda") else torch.float32

    model = OmniVoice.from_pretrained(
        cfg.get("model", "k2-fsa/OmniVoice"),
        device_map=device,
        dtype=dtype,
    )

    kwargs = {"text": cfg["text"], "speed": float(cfg.get("speed", 1.0))}
    if cfg.get("ref_audio"):
        kwargs["ref_audio"] = cfg["ref_audio"]
        if cfg.get("ref_text"):
            kwargs["ref_text"] = cfg["ref_text"]
    elif cfg.get("instruct"):
        kwargs["instruct"] = cfg["instruct"]

    audio_list = model.generate(**kwargs)
    if not audio_list:
        raise RuntimeError("OmniVoice returned empty audio")

    import numpy as np
    arr = np.asarray(audio_list[0], dtype=np.float32).flatten()
    sf.write(cfg["output"], arr, 24000)
    print(cfg["output"])


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
