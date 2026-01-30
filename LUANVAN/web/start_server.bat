@echo off
chcp 65001 >nul
echo ============================================================
echo [TTS] Starting Flask Server...
echo ============================================================
echo.

cd /d "%~dp0"

echo [INFO] Current directory: %CD%
echo [INFO] Checking Python...
python --version
echo.

echo [INFO] Starting Flask app on port 5000...
echo [INFO] Press Ctrl+C to stop the server
echo ============================================================
echo.

python app.py

pause
