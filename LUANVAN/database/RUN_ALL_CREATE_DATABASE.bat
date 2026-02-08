@echo off
chcp 65001 >nul
echo ========================================
echo   TẠO DATABASE TTS SYSTEM - ĐÚNG THỨ TỰ
echo ========================================
echo.

set MYSQL_CMD=mysql -u root -p
REM Sửa dòng trên nếu cần: mysql -u root -pYourPassword
REM Hoặc dùng: mysql -u root (nếu không đặt mật khẩu)

cd /d "%~dp0"

echo [1/5] Chạy tts_database.sql ...
%MYSQL_CMD% < tts_database.sql
if errorlevel 1 ( echo LỖI tại bước 1. & pause & exit /b 1 )

echo [2/5] Chạy custom_voices_schema.sql ...
%MYSQL_CMD% tts_system < custom_voices_schema.sql
if errorlevel 1 ( echo LỖI tại bước 2. & pause & exit /b 1 )

echo [3/5] Chạy payment_schema.sql ...
%MYSQL_CMD% tts_system < payment_schema.sql
if errorlevel 1 ( echo LỖI tại bước 3. & pause & exit /b 1 )

echo [4/5] Chạy custom_voices_update_v2.sql ...
%MYSQL_CMD% tts_system < custom_voices_update_v2.sql
if errorlevel 1 ( echo LỖI tại bước 4 - thử custom_voices_add_v2_columns.sql. & %MYSQL_CMD% tts_system < custom_voices_add_v2_columns.sql )

echo [5/5] Chạy custom_voices_zero_shot.sql ...
%MYSQL_CMD% tts_system < custom_voices_zero_shot.sql
if errorlevel 1 ( echo LỖI tại bước 5. & pause & exit /b 1 )

echo.
echo ========================================
echo   HOÀN TẤT. Database tts_system đã sẵn sàng.
echo ========================================
pause
