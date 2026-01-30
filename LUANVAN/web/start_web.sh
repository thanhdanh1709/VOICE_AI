#!/bin/bash
# Shell script để chạy Flask web server trên Linux/Mac

echo "========================================"
echo "TTS Web Application - Web Server"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Chọn port
echo "Chọn port để chạy:"
echo "1. Port 5000 (mặc định - http://localhost:5000)"
echo "2. Port 8080 (web server - http://localhost:8080)"
echo "3. Port 80 (web server chuẩn - http://localhost - CẦN QUYỀN ROOT)"
echo ""
read -p "Nhập lựa chọn (1/2/3): " choice

case $choice in
    1)
        PORT=5000
        ;;
    2)
        PORT=8080
        ;;
    3)
        PORT=80
        echo ""
        echo "Chạy trên port 80 cần quyền root!"
        echo "Chạy với sudo nếu cần"
        echo ""
        ;;
    *)
        PORT=5000
        ;;
esac

echo ""
echo "Đang khởi động server trên port $PORT..."
echo "URL: http://localhost:$PORT"
echo ""
echo "Nhấn Ctrl+C để dừng server"
echo ""

python3 app.py $PORT
