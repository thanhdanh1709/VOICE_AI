@echo off
echo =====================================
echo    Auto Payment Approver Service
echo =====================================
echo.

cd /d "%~dp0"

REM Activate virtual environment
if exist "..\venv310\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call ..\venv310\Scripts\activate.bat
) else (
    echo [WARNING] Virtual environment not found, using system Python
)

echo.
echo [INFO] Starting Auto Payment Approver...
echo [INFO] Press Ctrl+C to stop
echo.

python auto_approve_payments.py

pause