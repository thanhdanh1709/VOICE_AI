@echo off
echo ========================================
echo START SERVER WITH PYTHON 3.10
echo ========================================
echo.

cd /d "d:\LUANVAN (2)"

echo [1] Activating Python 3.10 virtual environment...
call venv310\Scripts\activate.bat

echo.
echo [2] Checking Python version...
python --version

echo.
echo [3] Starting Flask server...
cd LUANVAN\web
python app.py

pause
