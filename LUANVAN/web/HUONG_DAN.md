# Hướng dẫn chạy ứng dụng TTS Web

## ⚠️ QUAN TRỌNG: Phải chạy qua Flask Server

**KHÔNG** mở file HTML trực tiếp từ file system!
**PHẢI** chạy Flask server để template và CSS hoạt động.

## Cách chạy đúng:

### Bước 1: Cài đặt dependencies
```bash
cd web
pip install -r requirements.txt
```

### Bước 2: Chạy Flask server
```bash
python run.py
```
hoặc
```bash
python app.py
```

### Bước 3: Mở trình duyệt
Truy cập: **http://localhost:5000**

**KHÔNG** mở file HTML trực tiếp!
**KHÔNG** dùng Live Server (port 5500)!

## Lý do:

- File HTML sử dụng Flask template syntax: `{% %}` và `{{ }}`
- Cú pháp này chỉ hoạt động khi chạy qua Flask server
- CSS/JS sử dụng `url_for()` của Flask, chỉ hoạt động trong Flask context
- Khi mở trực tiếp, bạn sẽ thấy code template thay vì HTML đã render

## Test CSS:

Nếu muốn test CSS mà không chạy Flask, mở file `test.html` (có đường dẫn tương đối)
