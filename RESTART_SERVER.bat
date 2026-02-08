@echo off
echo ========================================
echo RESTART SERVER - VoiceAI TTS
echo ========================================
echo.

cd /d "d:\LUANVAN (2)\LUANVAN\web"

echo [1] Stopping current server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Administrator*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2] Starting server with venv...
start "VoiceAI TTS Server" "d:\LUANVAN (2)\venv310\Scripts\python.exe" app.py

echo.
echo ========================================
echo Server restarted!
echo ========================================
echo.
echo Open: http://localhost:5000
echo.
pause
