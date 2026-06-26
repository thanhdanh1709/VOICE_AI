@echo off
REM Tao venv rieng cho OmniVoice (transformers 5.x) — khong xung dot voi viXTTS (transformers 4.44)
cd /d "%~dp0.."
if exist venv_omnivoice (
    echo [OmniVoice] venv_omnivoice da ton tai.
) else (
    echo [OmniVoice] Tao venv_omnivoice...
    python -m venv venv_omnivoice
)
call venv_omnivoice\Scripts\activate.bat
python -m pip install --upgrade pip
REM PyTorch CUDA 11.8 (tuong thich driver CUDA 11.2+)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements_omnivoice.txt
echo.
echo [OmniVoice] Venv san sang (daemon mode, GPU neu co). Restart Flask server.
pause
