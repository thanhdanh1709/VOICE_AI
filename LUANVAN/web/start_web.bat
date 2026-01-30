@echo off
REM Batch file để chạy Flask web server trên Windows
REM Double-click file này để chạy ứng dụng

echo ========================================
echo TTS Web Application - Web Server
echo ========================================
echo.

cd /d "%~dp0"

REM Kiểm tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Loi: Python chua duoc cai dat hoac khong trong PATH
    pause
    exit /b 1
)

REM Chọn port
echo Chon port de chay:
echo 1. Port 5000 (mac dinh - http://localhost:5000)
echo 2. Port 8080 (web server - http://localhost:8080)
echo 3. Port 80 (web server chuan - http://localhost - CAN QUYEN ADMIN)
echo.
set /p choice="Nhap lua chon (1/2/3): "

if "%choice%"=="1" (
    set PORT=5000
) else if "%choice%"=="2" (
    set PORT=8080
) else if "%choice%"=="3" (
    set PORT=80
    echo.
    echo Chay tren port 80 can quyen Administrator!
    echo Neu co loi, click chuot phai vao file .bat -> Run as Administrator
    echo.
) else (
    set PORT=5000
)

echo.
echo Dang khoi dong server tren port %PORT%...
echo URL: http://localhost:%PORT%
echo.
echo Nhan Ctrl+C de dung server
echo.

python app.py %PORT%

pause
