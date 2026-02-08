@echo off
echo =====================================
echo      TTS Payment Debug Tool
echo =====================================
echo.

cd /d "%~dp0"

REM Kich hoat virtual environment
if exist "..\venv310\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call ..\venv310\Scripts\activate.bat
) else (
    echo [WARNING] Virtual environment not found, using system Python
)

echo.
echo [INFO] Starting debug tool...
python debug_payment.py

pause