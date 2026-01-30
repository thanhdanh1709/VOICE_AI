# TTS Web Application

Ứng dụng web chuyển văn bản thành giọng nói sử dụng Flask, HTML, CSS, JavaScript và MySQL.

## Cài đặt

### 1. Cài đặt Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Tạo database MySQL (XAMPP)
1. Mở phpMyAdmin trong XAMPP (http://localhost/phpmyadmin)
2. Import file `database/tts_database.sql`
3. Hoặc chạy SQL script để tạo database và các bảng

### 3. Cấu hình
Chỉnh sửa file `config.py` nếu cần:
- Database credentials (mặc định XAMPP: user=root, password='')
- Đường dẫn đến TTS script

### 4. Chạy ứng dụng
```bash
cd web
python app.py
```

Ứng dụng sẽ chạy tại: http://localhost:5000

## Cấu trúc thư mục

```
web/
├── app.py                 # Flask backend chính
├── config.py              # Cấu hình
├── templates/             # HTML templates
│   ├── base.html
│   ├── login.html
│   ├── register.html
│   ├── index.html
│   ├── history.html
│   └── admin.html
├── static/
│   ├── css/
│   │   └── style.css     # CSS chính
│   └── js/
│       ├── main.js       # JS chung
│       ├── auth.js       # Xử lý đăng nhập/đăng ký
│       ├── index.js      # Trang chủ (chuyển đổi TTS)
│       ├── history.js    # Lịch sử
│       └── admin.js      # Quản trị
├── uploads/              # Thư mục upload file
└── audio_outputs/        # Thư mục lưu audio đã chuyển đổi
```

## Chức năng

- ✅ Đăng ký / Đăng nhập
- ✅ Phân quyền (Admin/User)
- ✅ Nhập văn bản hoặc tải file
- ✅ Lựa chọn giọng đọc
- ✅ Chuyển văn bản thành giọng nói
- ✅ Tải file âm thanh
- ✅ Lưu lịch sử chuyển đổi
- ✅ Tìm kiếm lịch sử
- ✅ Thống kê
- 🔄 Quản trị (đang phát triển)

## Tài khoản mặc định

Sau khi import database, bạn cần tạo mật khẩu hash cho admin:
- Username: admin
- Password: (cần tạo hash bằng Python)

```python
from werkzeug.security import generate_password_hash
print(generate_password_hash('admin123'))
```

Sau đó cập nhật vào database.
