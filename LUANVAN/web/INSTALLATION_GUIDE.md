# Hướng dẫn cài đặt hệ thống VietVoice

> Tài liệu kỹ thuật dành cho developer / sysadmin  
> Phiên bản: Beta | Cập nhật: Tháng 6/2026

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Cài đặt môi trường Python](#3-cài-đặt-môi-trường-python)
4. [Cấu hình cơ sở dữ liệu MySQL](#4-cấu-hình-cơ-sở-dữ-liệu-mysql)
5. [Cấu hình file môi trường](#5-cấu-hình-file-môi-trường)
6. [Cài đặt mô hình AI](#6-cài-đặt-mô-hình-ai)
7. [Chạy server local](#7-chạy-server-local)
8. [Deploy lên môi trường production](#8-deploy-lên-môi-trường-production)
9. [Cấu hình Google OAuth](#9-cấu-hình-google-oauth)
10. [Cấu hình SePay thanh toán](#10-cấu-hình-sepay-thanh-toán)
11. [Cài đặt ứng dụng Flutter Mobile](#11-cài-đặt-ứng-dụng-flutter-mobile)
12. [Khắc phục sự cố](#12-khắc-phục-sự-cố)

---

## 1. Yêu cầu hệ thống

### 1.1 Server / máy tính chạy backend

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| **OS** | Windows 10, Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Python** | 3.10 | 3.10.x |
| **RAM** | 4 GB | 8 GB+ |
| **Dung lượng** | 10 GB | 20 GB+ (có viXTTS) |
| **CPU** | 4 nhân | 8 nhân+ |
| **GPU** | Không bắt buộc | NVIDIA CUDA (Emotional TTS nhanh hơn) |

### 1.2 Dịch vụ bên ngoài (tuỳ chọn)

- **MySQL** 8.0+ (local hoặc cloud)
- **Google Cloud Console** — OAuth đăng nhập Google
- **SePay** — thanh toán chuyển khoản QR
- **Hosting cloud** — Railway, VPS, v.v. (nếu deploy public)

---

## 2. Cấu trúc thư mục

```
LUANVAN/
├── web/                          # Flask app chính
│   ├── app.py                    # Entry point (~5400 dòng)
│   ├── config.py                 # Đọc biến môi trường
│   ├── .env.local                # Cấu hình local (không commit)
│   ├── requirements.txt          # Dependencies cơ bản
│   ├── requirements_vixtts.txt   # Dependencies Emotional TTS
│   ├── start_server.bat          # Script khởi động Windows
│   ├── emotional_tts_vixtts.py   # Module Emotional TTS
│   ├── voice_training.py         # Huấn luyện / tạo giọng custom
│   ├── audio_processor.py        # Xử lý âm thanh
│   ├── rvc_wrapper.py            # RVC — điều chỉnh giọng sau TTS
│   ├── background_worker.py      # Background jobs
│   ├── templates/                # HTML (Jinja2)
│   ├── static/                   # CSS, JS, images
│   ├── uploads/                  # File upload
│   ├── audio_outputs/            # File âm thanh đầu ra
│   ├── vixtts_model/             # Mô hình viXTTS (~1.8 GB)
│   └── base_voice.wav            # Giọng tham chiếu mặc định
├── database/                     # Script SQL
│   ├── tts_database.sql
│   ├── custom_voices_schema.sql
│   ├── payment_schema.sql
│   ├── custom_voices_update_v2.sql
│   ├── custom_voices_zero_shot.sql
│   ├── add_share_and_name_columns.sql
│   └── THU_TU_TAO_DATABASE.md    # Thứ tự chạy SQL
├── VieNeu-TTS-main/              # Engine TTS cơ bản
└── tool/                         # Công cụ RVC

app_web_view/                     # Flutter WebView (thư mục gốc repo)
├── lib/config.dart               # URL server + OAuth scheme
└── android/ / ios/
```

---

## 3. Cài đặt môi trường Python

### 3.1 Cài Python 3.10

**Windows:**
```powershell
python --version   # Kiểm tra: Python 3.10.x
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv python3.10-dev -y
python3.10 --version
```

### 3.2 Tạo virtual environment

```bash
# Windows
cd "d:\banduphong\LUANVAN (2) - Copy\LUANVAN (2) - Copy\LUANVAN\web"
python -m venv venv310
venv310\Scripts\activate

# Linux/Mac
python3.10 -m venv venv310
source venv310/bin/activate
```

### 3.3 Cài dependencies

```bash
# Bắt buộc
pip install -r requirements.txt

# Emotional TTS (viXTTS) — tuỳ chọn nhưng cần cho tab Emotional TTS
pip install -r requirements_vixtts.txt

# Nếu lỗi torch trên Windows CPU:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

**`requirements.txt` hiện tại:**
```
Flask==3.0.0
gunicorn==21.2.0
pymysql==1.1.0
werkzeug==3.0.1
python-docx==1.1.0
PyPDF2==3.0.1
qrcode[pil]==7.4.2
requests>=2.31.0
Authlib>=1.3.0
Pillow>=10.0.0
```

---

## 4. Cấu hình cơ sở dữ liệu MySQL

### 4.1 Cài MySQL

**Windows (XAMPP):** Cài XAMPP → khởi động MySQL → mở phpMyAdmin tại `http://localhost/phpmyadmin`

**Ubuntu:**
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
```

### 4.2 Tạo database

Database mặc định của hệ thống là **`tts_system`** (không phải `vietvoice`).

Cách nhanh nhất: chạy các file SQL **theo đúng thứ tự** trong thư mục `database/` (xem `database/THU_TU_TAO_DATABASE.md`):

| Bước | File | Nội dung |
|------|------|----------|
| 1 | `tts_database.sql` | DB `tts_system`, bảng `users`, `conversions`, `voices`, `sessions`, `statistics` |
| 2 | `custom_voices_schema.sql` | `custom_voices`, `training_queue`, `voice_usage_logs` |
| 3 | `payment_schema.sql` | `subscription_packages`, `user_subscriptions`, `payments` |
| 4 | `custom_voices_update_v2.sql` | `base_voice_id`, pitch/speed/energy adjustment |
| 5 | `custom_voices_zero_shot.sql` | `voice_type`, `ref_transcript` |
| 6 | `add_share_and_name_columns.sql` | `display_name`, `is_public`, `share_token` *(tuỳ chọn — xem mục 4.4)* |

**phpMyAdmin:** Tab SQL → dán nội dung từng file → Execute.

**Command line:**
```bash
mysql -u root -p < database/tts_database.sql
mysql -u root -p < database/custom_voices_schema.sql
mysql -u root -p < database/payment_schema.sql
mysql -u root -p < database/custom_voices_update_v2.sql
mysql -u root -p < database/custom_voices_zero_shot.sql
```

### 4.3 Tài khoản admin mặc định

Sau khi chạy `tts_database.sql`:

| Trường | Giá trị |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> Nên đổi mật khẩu ngay sau khi cài đặt. Có thể dùng script `create_admin.py` nếu cần tạo lại admin.

### 4.4 Migration tự động khi khởi động server

`app.py` gọi `run_db_migrations()` mỗi lần start server. Hàm này **tự thêm** các cột sau vào bảng `conversions` nếu chưa có:

- `display_name` — tên hiển thị do người dùng đặt
- `is_public` — trạng thái chia sẻ công khai
- `share_token` — token link chia sẻ

Vì vậy bước 6 (`add_share_and_name_columns.sql`) **không bắt buộc** nếu server đã chạy ít nhất một lần sau khi cập nhật code.

### 4.5 Schema `conversions` (tham khảo)

```sql
-- id là INT AUTO_INCREMENT (không phải UUID)
CREATE TABLE conversions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    text_input TEXT NOT NULL,
    text_length INT,
    voice_id VARCHAR(50) NOT NULL,
    voice_name VARCHAR(100),
    display_name VARCHAR(200) NULL,      -- thêm bởi migration
    is_public TINYINT(1) DEFAULT 0,      -- thêm bởi migration
    share_token VARCHAR(64) NULL,        -- thêm bởi migration
    audio_file_path VARCHAR(255),
    audio_file_size INT,
    duration_seconds FLOAT,
    status ENUM('pending','processing','completed','failed'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);
```

---

## 5. Cấu hình file môi trường

### 5.1 Tạo `web/.env.local`

File này được `app.py` tự động load khi khởi động (không commit lên git):

```env
# ═══ DATABASE ═══
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tts_system
DB_USER=root
DB_PASSWORD=

# ═══ FLASK ═══
SECRET_KEY=your-very-long-random-secret-key-min-32-chars
FLASK_ENV=development

# ═══ GOOGLE OAUTH ═══
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ═══ SEPAY ═══
SEPAY_API_URL=https://my.sepay.vn/userapi/transactions
SEPAY_TOKEN=your-sepay-api-token
SEPAY_ACCOUNT_NUMBER=your-account-number
SEPAY_BANK_ID=MBBank
SEPAY_TIMEOUT=300

# ═══ CHUYỂN KHOẢN (hiển thị QR) ═══
BANK_NAME=MBBank
BANK_ACCOUNT_NUMBER=your-account-number
BANK_ACCOUNT_NAME=TTS SYSTEM
BANK_BRANCH=Can Tho

# ═══ PRODUCTION (tuỳ chọn) ═══
# PORT=5000
# FLASK_ENV=production
```

> **Lưu ý:** Biến môi trường là `SECRET_KEY`, không phải `FLASK_SECRET_KEY`. `config.py` đọc trực tiếp từ `os.environ`.

### 5.2 Các giá trị mặc định trong `config.py`

| Biến | Mặc định |
|---|---|
| `DB_NAME` | `tts_system` |
| `DB_USER` | `root` |
| `MAX_FILE_SIZE` | 10 MB |
| `ALLOWED_TEXT_EXTENSIONS` | `txt`, `pdf`, `docx` |
| `ALLOWED_AUDIO_EXTENSIONS` | `wav`, `mp3` |

---

## 6. Cài đặt mô hình AI

### 6.1 VieNeu TTS (TTS cơ bản)

Engine TTS cơ bản nằm trong `VieNeu-TTS-main/`. Đảm bảo thư mục tồn tại cùng cấp với `web/`:

```
LUANVAN/
├── web/
└── VieNeu-TTS-main/
    └── main.py
```

### 6.2 viXTTS (Emotional TTS)

Tải model vào `web/vixtts_model/` (~1.8 GB):

```bash
pip install huggingface_hub
python -c "
from huggingface_hub import snapshot_download
snapshot_download(repo_id='capleaf/viXTTS', local_dir='web/vixtts_model')
"
```

Cấu trúc sau khi tải:
```
web/vixtts_model/
├── config.json
├── model.pth
├── vocab.json
└── speakers_xtts.pth
```

### 6.3 File giọng tham chiếu

Các file WAV trong `web/`:

```
web/
├── base_voice.wav      # Giọng mặc định Emotional TTS
├── calm_ref.wav
├── cheerful_ref.wav
└── excited_ref.wav
```

---

## 7. Chạy server local

### 7.1 Khởi động thủ công

```bash
cd LUANVAN/web
venv310\Scripts\activate      # Windows
python app.py
```

### 7.2 Dùng script Windows

```batch
# Chạy file start_server.bat trong thư mục web/
start_server.bat
```

Script sẽ `cd` vào thư mục `web/` và chạy `python app.py` trên **port 5000**.

### 7.3 Output khi thành công

```
[MIGRATION] ✓  Cột 'display_name' trong 'conversions' đã tồn tại
...
[TTS] 🎉 SERVER READY - SẴN SÀNG PHỤC VỤ!
[TTS] URL: http://127.0.0.1:5000
```

### 7.4 Truy cập

| Môi trường | URL |
|---|---|
| Local | http://127.0.0.1:5000 |
| LAN | http://YOUR_IP:5000 |
| Landing (chưa đăng nhập) | http://127.0.0.1:5000/landing |

---

## 8. Deploy lên môi trường production

Repo hiện tại **không có sẵn** `Procfile` hay `railway.json`. Bạn có thể deploy thủ công lên VPS hoặc PaaS.

### 8.1 Gunicorn (Linux / VPS)

```bash
pip install gunicorn
gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --timeout 120
```

### 8.2 Biến môi trường production

Đặt tất cả biến trong mục 5.1 trên hosting, đặc biệt:

```env
FLASK_ENV=production
SECRET_KEY=<chuỗi-ngẫu-nhiên-dài>
DB_HOST=<host-mysql>
DB_NAME=tts_system
```

### 8.3 Lưu ý deploy cloud

- **Emotional TTS** cần RAM cao (~4 GB khi load model). Free tier có thể không đủ.
- File model `vixtts_model/` (~1.8 GB) cần được upload hoặc tải khi build.
- Cấu hình HTTPS trước khi bật Google OAuth production.
- Endpoint webhook SePay: `POST /api/payment/sepay/webhook`

---

## 9. Cấu hình Google OAuth

### 9.1 Tạo OAuth 2.0 credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Thêm **Authorized redirect URIs**:
   ```
   http://localhost:5000/auth/google/callback
   https://your-domain.com/auth/google/callback
   ```
5. Copy **Client ID** và **Client Secret** vào `.env.local`

### 9.2 OAuth cho Flutter app

Flutter dùng endpoint riêng: `/auth/google/login/flutter?callback_scheme=petai`

**Android** — deep link scheme `petai://oauth` (xem `app_web_view/android/`)

**Cấu hình URL** trong `app_web_view/lib/config.dart`:
```dart
static const String webBaseUrl = 'https://your-domain.com';
static const String callbackScheme = 'petai';
```

---

## 10. Cấu hình SePay thanh toán

### 10.1 Đăng ký và lấy token

1. Đăng ký tại https://sepay.vn/
2. Thêm tài khoản ngân hàng
3. Lấy **API Token** từ dashboard → đặt vào `SEPAY_TOKEN`

### 10.2 Luồng thanh toán trong hệ thống

1. User chọn gói tại `/pricing` → tạo payment pending
2. Hiển thị **QR VietQR** (tạo qua `img.vietqr.io`)
3. User chuyển khoản với **đúng nội dung** (mã định danh)
4. Xác nhận qua:
   - Webhook: `POST /api/payment/sepay/webhook`
   - Polling frontend: `GET /api/payment/status/<payment_id>` (mỗi ~5 giây)

### 10.3 Các gói mặc định (từ `payment_schema.sql`)

| Gói | Ký tự/tháng | Giá (VND) |
|---|---|---|
| Free Plan | 100.000 | 0 |
| Basic Plan | 1.500.000 | 500.000 |
| Standard Plan | 4.000.000 | 1.000.000 |
| Premium Plan | 10.000.000 | 2.000.000 |
| Enterprise Plan | 27.000.000 | 5.000.000 |

---

## 11. Cài đặt ứng dụng Flutter Mobile

> Ứng dụng **chưa phát hành** trên Google Play / App Store. Cần build APK/IPA thủ công.

### 11.1 Yêu cầu

- Flutter SDK 3.x+
- Android Studio (Android) hoặc Xcode (iOS)
- JDK 17+

### 11.2 Build

```bash
cd app_web_view
flutter pub get
flutter run                    # Development
flutter build apk --release    # APK Android
```

### 11.3 Cấu hình server

Sửa `app_web_view/lib/config.dart`:

```dart
static const String apiBaseUrl = 'http://YOUR_IP:5000';   // thiết bị thật, cùng WiFi
static const String webBaseUrl = 'http://YOUR_IP:5000';

// Android emulator dùng:
// static const String webBaseUrl = 'http://10.0.2.2:5000';
```

### 11.4 OAuth trên mobile

- Scheme: `petai` (khớp `callbackScheme` trong `config.dart`)
- App dùng WebView + Chrome Custom Tab cho đăng nhập Google
- `android:usesCleartextTraffic="true"` đã bật để test HTTP local

---

## 12. Khắc phục sự cố

### `ModuleNotFoundError: No module named 'flask'`
```bash
venv310\Scripts\activate
pip install -r requirements.txt
```

### `pymysql.err.OperationalError: Can't connect to MySQL`
- Kiểm tra MySQL đang chạy (XAMPP / `systemctl status mysql`)
- Kiểm tra `DB_HOST`, `DB_NAME=tts_system`, `DB_USER`, `DB_PASSWORD` trong `.env.local`

### `Unknown column 'is_public'` (hoặc `display_name`)
- Khởi động lại server — `run_db_migrations()` sẽ tự thêm cột
- Hoặc chạy thủ công: `database/add_share_and_name_columns.sql`

### Port 5000 đã được sử dụng (Windows)
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Emotional TTS không sẵn sàng
- Kiểm tra thư mục `web/vixtts_model/` đã có model
- Lần đầu load model mất 30–60 giây
- RAM < 4 GB có thể gây lỗi — thử dùng CPU hoặc tăng RAM

### Lỗi UTF-8 trên Windows
Đã xử lý trong `app.py` — `start_server.bat` cũng set `chcp 65001`.

---

## Checklist triển khai

- [ ] Python 3.10 + virtual environment
- [ ] `pip install -r requirements.txt`
- [ ] MySQL chạy, database `tts_system` đã tạo (5 file SQL)
- [ ] File `web/.env.local` đã cấu hình (`SECRET_KEY`, DB, OAuth, SePay)
- [ ] Thư mục `uploads/`, `audio_outputs/` tồn tại
- [ ] `base_voice.wav` có trong `web/`
- [ ] (Tuỳ chọn) `vixtts_model/` đã tải
- [ ] Server chạy tại http://127.0.0.1:5000
- [ ] Đăng nhập `admin` / `admin123` thành công
- [ ] TTS cơ bản hoạt động
- [ ] (Tuỳ chọn) Google OAuth, SePay đã cấu hình

---

## Liên hệ kỹ thuật

| Kênh | Thông tin |
|---|---|
| Email | danhvt388@gmail.com |
| Hotline | 0866 005 541 |
| Trang liên hệ | `/contact` trong ứng dụng |
| Hướng dẫn người dùng | `USER_GUIDE.md` |

---

*© 2026 VietVoice. Tài liệu kỹ thuật nội bộ.*
