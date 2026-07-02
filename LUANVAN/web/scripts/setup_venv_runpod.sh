#!/usr/bin/env bash
# Cài lại venv chính (VieNeu + viXTTS) — chạy từ LUANVAN/web
set -euo pipefail

cd "$(dirname "$0")/.."
WEB_DIR="$(pwd)"

echo "[setup] Web dir: $WEB_DIR"
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate

pip install --upgrade pip wheel

echo "[setup] 1/5 Flask + web"
pip install -r requirements.txt
pip install markdown reportlab

echo "[setup] 2/5 numpy 1.26 (trước pandas/sklearn)"
pip install "numpy==1.26.4"

echo "[setup] 3/5 viXTTS stack (transformers 4.44)"
pip install -r requirements_vixtts.txt

echo "[setup] 4/5 VieNeu codec (không kéo transformers 5.x)"
pip install -r requirements_vieneu.txt --no-deps
pip install neucodec==0.0.4 --no-deps
pip install librosa soundfile phonemizer huggingface-hub accelerate einops vector-quantize-pytorch

echo "[setup] 5/5 Pin lại transformers + numpy"
pip install "numpy==1.26.4" "transformers==4.44.0" "tokenizers==0.19.1"

echo "[setup] Verify..."
python -c "import numpy; print('numpy', numpy.__version__)"
python -c "import transformers; print('transformers', transformers.__version__)"
python -c "from neucodec import NeuCodec; print('neucodec OK')"
python -c "from TTS.tts.configs.xtts_config import XttsConfig; print('viXTTS OK')"

echo "[setup] Done. Chay: source venv/bin/activate && python app.py"
