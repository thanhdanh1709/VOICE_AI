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
7. [Cài đặt ffmpeg (xuất MP3/OGG)](#7-cài-đặt-ffmpeg-xuất-mp3ogg)
8. [Chạy server local](#8-chạy-server-local)
9. [Deploy lên môi trường production](#9-deploy-lên-môi-trường-production)
10. [Cấu hình Google OAuth](#10-cấu-hình-google-oauth)
11. [Cấu hình SePay thanh toán](#11-cấu-hình-sepay-thanh-toán)
12. [Cài đặt ứng dụng Flutter Mobile](#12-cài-đặt-ứng-dụng-flutter-mobile)
13. [Khắc phục sự cố](#13-khắc-phục-sự-cố)

---

## 1. Yêu cầu hệ thống

### 1.1 Server / máy tính chạy backend

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| **OS** | Windows 10, Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Python** | 3.10 | 3.10.x |
| **RAM** | 4 GB | 8 GB+ (viXTTS ~3 GB) |
| **Dung lượng** | 10 GB | 25 GB+ (có viXTTS ~1.8 GB) |
| **CPU** | 4 nhân | 8 nhân+ |
| **GPU** | Không bắt buộc | NVIDIA CUDA (Emotional TTS nhanh hơn ~5×) |

### 1.2 Phần mềm bên ngoài

| Phần mềm | Bắt buộc | Ghi chú |
|---|---|---|
| **MySQL 8.0+** | ✅ | Local (XAMPP) hoặc cloud |
| **ffmpeg** | Xuất MP3/OGG | Cài qua `winget` hoặc `apt` |
| **Google Cloud Console** | Tuỳ chọn | OAuth đăng nhập Google |
| **SePay** | Tuỳ chọn | Thanh toán chuyển khoản QR |

---

## 2. Cấu trúc thư mục

```
LUANVAN/
├── web/                            # Flask app chính
│   ├── app.py                      # Entry point (~5400 dòng)
│   ├── config.py                   # Đọc biến môi trường
│   ├── .env.local                  # Cấu hình local (không commit)
│   ├── requirements.txt            # Dependencies cơ bản
│   ├── requirements_vixtts.txt     # Dependencies Emotional TTS
│   ├── start_server.bat            # Script khởi động Windows
│   ├── audio_export.py             # Xuất WAV/MP3/OGG qua ffmpeg
│   ├── emotional_tts_vixtts.py     # Module Emotional TTS (viXTTS)
│   ├── voice_training.py           # Huấn luyện / tạo giọng custom
│   ├── audio_processor.py          # Xử lý âm thanh
│   ├── rvc_wrapper.py              # RVC — điều chỉnh giọng sau TTS
│   ├── background_worker.py        # Background jobs (training)
│   ├── templates/                  # HTML (Jinja2)
│   │   ├── index.html              # Workspace chính
│   │   ├── base.html               # Layout base
│   │   ├── admin.html              # Trang quản trị
│   │   ├── pricing.html            # Bảng giá
│   │   ├── audio_library.html      # Thư viện âm thanh
│   │   ├── my_voices.html          # Quản lý giọng clone
│   │   ├── user_guide.html         # Hướng dẫn sử dụng (web)
│   │   ├── installation_guide.html # Hướng dẫn cài đặt (web)
│   │   └── ...                     # login, register, history, profile...
│   ├── static/
│   │   ├── js/
│   │   │   ├── i18n.js             # Đa ngôn ngữ VI/EN
│   │   │   ├── index.js            # Logic Workspace
│   │   │   └── sidebar-collapse.js # Sidebar responsive
│   │   └── css/ images/ ...
│   ├── uploads/                    # File upload tạm
│   ├── audio_outputs/              # File âm thanh đầu ra
│   ├── vixtts_model/               # Mô hình viXTTS (~1.8 GB)
│   ├── base_voice.wav              # Giọng tham chiếu mặc định Emotional TTS
│   ├── calm_ref.wav                # Ref audio — cảm xúc calm/sad
│   ├── cheerful_ref.wav            # Ref audio — cảm xúc cheerful
│   ├── excited_ref.wav             # Ref audio — cảm xúc excited
│   ├── INSTALLATION_GUIDE.md       # File này
│   └── USER_GUIDE.md               # Hướng dẫn người dùng
├── database/                       # Script SQL
│   ├── tts_database.sql            # Bước 1: DB chính
│   ├── custom_voices_schema.sql    # Bước 2: Clone giọng
│   ├── payment_schema.sql          # Bước 3: Thanh toán
│   ├── custom_voices_update_v2.sql # Bước 4: Update giọng v2
│   ├── custom_voices_zero_shot.sql # Bước 5: Zero-shot
│   ├── add_share_and_name_columns.sql # (tuỳ chọn — tự migration)
│   └── THU_TU_TAO_DATABASE.md      # Thứ tự chạy SQL
├── VieNeu-TTS-main/                # Engine TTS cơ bản
└── tool/                           # Công cụ RVC

app_web_view/                       # Flutter WebView (cùng cấp LUANVAN/)
├── lib/
│   ├── main.dart                   # Entry point Flutter
│   └── config.dart                 # URL server + OAuth scheme
└── android/ ios/
```

---

## 3. Cài đặt môi trường Python

### 3.1 Yêu cầu Python 3.10

**Windows:**
```powershell
python --version   # Cần: Python 3.10.x
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
cd "LUANVAN\web"
python -m venv venv310
venv310\Scripts\activate

# Linux/Mac
python3.10 -m venv venv310
source venv310/bin/activate
```

### 3.3 Cài dependencies

**Bắt buộc (TTS cơ bản + Flask):**
```bash
pip install -r requirements.txt
```

Nội dung `requirements.txt`:
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

**Emotional TTS (viXTTS) — tuỳ chọn nhưng cần cho tab "Emotional TTS":**
```bash
pip install -r requirements_vixtts.txt
```

Nội dung `requirements_vixtts.txt`:
```
TTS>=0.22.0
vinorm>=2.0.7
underthesea>=6.8.0
pydub>=0.25.1
torch>=2.0.0
torchaudio>=2.0.0
```

> **Windows CPU:** Nếu lỗi khi cài torch, dùng:
> ```bash
> pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
> ```

---

## 4. Cấu hình cơ sở dữ liệu MySQL

### 4.1 Cài MySQL

**Windows (XAMPP):** Cài XAMPP → khởi động module MySQL → mở phpMyAdmin tại `http://localhost/phpmyadmin`

**Ubuntu:**
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 4.2 Tạo database

Database hệ thống là **`tts_system`**. Chạy các file SQL **theo đúng thứ tự** trong `database/`:

| Bước | File | Nội dung |
|------|------|----------|
| 1 | `tts_database.sql` | DB `tts_system`, bảng `users`, `conversions`, `voices`, `sessions`, `statistics` |
| 2 | `custom_voices_schema.sql` | `custom_voices`, `training_queue`, `voice_usage_logs` |
| 3 | `payment_schema.sql` | `subscription_packages`, `user_subscriptions`, `payments` |
| 4 | `custom_voices_update_v2.sql` | Thêm cột `base_voice_id`, `pitch/speed/energy_adjustment` |
| 5 | `custom_voices_zero_shot.sql` | Thêm cột `voice_type`, `ref_transcript` |

**Chạy qua phpMyAdmin:** Tab SQL → dán nội dung từng file → Execute.

**Chạy qua command line:**
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

> **Bảo mật:** Đổi mật khẩu admin ngay sau khi cài đặt xong.

### 4.4 Migration tự động

`app.py` gọi `run_db_migrations()` mỗi lần khởi động server. Hàm này **tự thêm** 3 cột sau vào `conversions` nếu chưa có:

- `display_name` — tên audio do người dùng đặt
- `is_public` — trạng thái chia sẻ công khai
- `share_token` — token link chia sẻ

Vì vậy file `add_share_and_name_columns.sql` **không bắt buộc** nếu server đã chạy ít nhất một lần.

### 4.5 Schema `conversions` (tham khảo)

```sql
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

File này được `config.py` / `app.py` tự động load khi khởi động. **Không commit lên git.**

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

# ═══ THÔNG TIN NGÂN HÀNG (hiển thị QR) ═══
BANK_NAME=MBBank
BANK_ACCOUNT_NUMBER=your-account-number
BANK_ACCOUNT_NAME=TTS SYSTEM
BANK_BRANCH=Can Tho

# ═══ PRODUCTION (tuỳ chọn) ═══
# PORT=5000
# FLASK_ENV=production
```

> **Quan trọng:** Biến Flask secret key là `SECRET_KEY` (không phải `FLASK_SECRET_KEY`). `config.py` đọc trực tiếp từ `os.environ`.

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

Engine TTS cơ bản nằm trong `VieNeu-TTS-main/`. Đảm bảo thư mục tồn tại **cùng cấp** với `web/`:

```
LUANVAN/
├── web/
└── VieNeu-TTS-main/
    └── main.py
```

Thư viện từ điển phát âm nằm trong `VieNeu-TTS-main/vieneu_utils/` — `app.py` tự load khi khởi động.

### 6.2 viXTTS (Emotional TTS)

Tải model vào `web/vixtts_model/` (kích thước ~1.8 GB):

```bash
pip install huggingface_hub
python -c "
from huggingface_hub import snapshot_download
snapshot_download(repo_id='capleaf/viXTTS', local_dir='LUANVAN/web/vixtts_model')
"
```

Cấu trúc thư mục sau khi tải:
```
web/vixtts_model/
├── config.json
├── model.pth
├── vocab.json
└── speakers_xtts.pth
```

### 6.3 File giọng tham chiếu (Emotional TTS)

Các file WAV trong `web/` — **bắt buộc** để Emotional TTS hoạt động:

| File | Cảm xúc |
|---|---|
| `base_voice.wav` | Giọng tham chiếu mặc định |
| `cheerful_ref.wav` | Vui vẻ / Hứng khởi |
| `calm_ref.wav` | Bình tĩnh / Buồn |
| `excited_ref.wav` | Phấn khích |

Nếu thiếu file, hệ thống fallback về `base_voice.wav` cho tất cả cảm xúc.

---

## 7. Cài đặt ffmpeg (xuất MP3/OGG)

ffmpeg là thư viện bắt buộc để chuyển đổi WAV sang **MP3** hoặc **OGG Vorbis**. Nếu không cài, tính năng xuất MP3/OGG sẽ bị vô hiệu — người dùng chỉ tải được WAV.

### 7.1 Windows

```powershell
# Cài qua winget (Windows Package Manager)
winget install Gyan.FFmpeg

# Hoặc tải thủ công tại https://ffmpeg.org/download.html
# Giải nén → thêm thư mục bin/ vào PATH
```

Kiểm tra sau khi cài:
```powershell
ffmpeg -version
```

### 7.2 Ubuntu/Debian

```bash
sudo apt update && sudo apt install ffmpeg -y
ffmpeg -version
```

### 7.3 macOS

```bash
brew install ffmpeg
```

> `audio_export.py` gọi `ffmpeg` thông qua `subprocess`. ffmpeg cần có trong `PATH` hệ thống khi Flask chạy.

---

## 8. Chạy server local

### 8.1 Khởi động thủ công

```bash
cd LUANVAN/web
venv310\Scripts\activate      # Windows
# hoặc: source venv310/bin/activate   # Linux/Mac
python app.py
```

### 8.2 Dùng script Windows

```batch
# Chạy file start_server.bat trong thư mục web/
start_server.bat
```

Script tự động `cd` vào `web/`, set encoding UTF-8, rồi chạy `python app.py` trên port 5000.

### 8.3 Output khi khởi động thành công

```
[MIGRATION] ✓  Cột 'display_name' trong 'conversions' đã tồn tại
[MIGRATION] ✓  Cột 'is_public' trong 'conversions' đã tồn tại
...
[viXTTS] 🔄 ĐANG LOAD EMOTIONAL TTS MODEL...
[viXTTS] ✅ Model ready!
...
[TTS] 🎉 SERVER READY - SẴN SÀNG PHỤC VỤ!
[TTS] URL: http://127.0.0.1:5000
[TTS] Emotional TTS: ✅ Sẵn sàng
```

> Lần đầu load viXTTS mất **30–60 giây** (download model ~1.8 GB nếu chưa có). Từ lần sau model đã cache trong RAM.

### 8.4 Các URL truy cập

| Môi trường | URL |
|---|---|
| Local (loopback) | `http://127.0.0.1:5000` |
| LAN (cùng mạng WiFi) | `http://YOUR_IP:5000` |
| Landing (chưa đăng nhập) | `http://127.0.0.1:5000/landing` |
| Admin | `http://127.0.0.1:5000/admin` |
| Hướng dẫn sử dụng | `http://127.0.0.1:5000/user-guide` |
| Hướng dẫn cài đặt | `http://127.0.0.1:5000/installation-guide` |

---

## 9. Deploy lên môi trường production

### 9.1 Gunicorn (Linux / VPS)

```bash
pip install gunicorn
gunicorn app:app \
  --bind 0.0.0.0:5000 \
  --workers 1 \
  --timeout 120 \
  --chdir LUANVAN/web
```

> Dùng `--workers 1` vì viXTTS giữ model trong RAM — nhiều worker sẽ load model nhiều lần.

### 9.2 Nginx reverse proxy (tuỳ chọn)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
```

### 9.3 Biến môi trường production

```env
FLASK_ENV=production
SECRET_KEY=<chuỗi-ngẫu-nhiên-dài-ít-nhất-32-ký-tự>
DB_HOST=<host-mysql>
DB_NAME=tts_system
DB_USER=<user>
DB_PASSWORD=<password>
```

### 9.4 Lưu ý deploy cloud

- **Emotional TTS** cần RAM ~3–4 GB khi load model. Free tier thường không đủ.
- Thư mục `vixtts_model/` (~1.8 GB) cần được upload hoặc tải lúc build (dùng `huggingface_hub`).
- Cấu hình **HTTPS** trước khi bật Google OAuth production.
- Endpoint webhook SePay: `POST /api/payment/sepay/webhook` và `POST /webhook/sepay`
- Thư mục `audio_outputs/` và `uploads/` phải có quyền ghi.

---

## 10. Cấu hình Google OAuth

### 10.1 Tạo OAuth 2.0 credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Thêm **Authorized redirect URIs**:
   ```
   http://localhost:5000/auth/google/callback
   https://your-domain.com/auth/google/callback
   ```
5. Copy **Client ID** và **Client Secret** → đặt vào `.env.local`

### 10.2 OAuth cho Flutter app

Flutter dùng endpoint riêng: `GET /auth/google/login/flutter?callback_scheme=petai`

**Android** — deep link scheme `petai://oauth` (cấu hình tại `app_web_view/android/`)

**Cấu hình URL** trong `app_web_view/lib/config.dart`:
```dart
static const String webBaseUrl = 'https://your-domain.com';
static const String callbackScheme = 'petai';
```

---

## 11. Cấu hình SePay thanh toán

### 11.1 Đăng ký và lấy token

1. Đăng ký tại [https://sepay.vn/](https://sepay.vn/)
2. Thêm tài khoản ngân hàng của bạn
3. Lấy **API Token** từ dashboard → đặt vào `SEPAY_TOKEN` trong `.env.local`

### 11.2 Luồng thanh toán trong hệ thống

1. User chọn gói tại `/pricing` → hệ thống tạo bản ghi payment `pending`
2. Hiển thị **QR VietQR** (tạo qua `img.vietqr.io`) + nội dung chuyển khoản định danh
3. User chuyển khoản đúng nội dung
4. Xác nhận qua hai đường:
   - **Webhook:** `POST /api/payment/sepay/webhook` (SePay gọi về server)
   - **Polling frontend:** `GET /api/payment/status/<payment_id>` mỗi ~5 giây
5. Khi xác nhận → kích hoạt gói, trừ ký tự tương ứng

### 11.3 Các gói mặc định (từ `payment_schema.sql`)

| Gói | Ký tự / tháng | Giá (VND) |
|---|---|---|
| Free Plan | 100.000 | 0 |
| Basic Plan | 1.500.000 | 500.000 |
| Standard Plan | 4.000.000 | 1.000.000 |
| Premium Plan | 10.000.000 | 2.000.000 |
| Enterprise Plan | 27.000.000 | 5.000.000 |

---

## 12. Cài đặt ứng dụng Flutter Mobile

> Ứng dụng **chưa phát hành** trên Google Play / App Store. Cần build APK thủ công.

### 12.1 Yêu cầu

- Flutter SDK 3.x+
- Android Studio + JDK 17+
- (iOS) Xcode 14+

### 12.2 Cấu hình server URL

Sửa `app_web_view/lib/config.dart`:

```dart
// Thiết bị thật, cùng WiFi với server
static const String apiBaseUrl = 'http://192.168.1.X:5000';
static const String webBaseUrl = 'http://192.168.1.X:5000';

// Android emulator
// static const String webBaseUrl = 'http://10.0.2.2:5000';

// OAuth callback scheme
static const String callbackScheme = 'petai';
```

### 12.3 Build

```bash
cd app_web_view
flutter pub get
flutter run                    # Chạy debug (thiết bị kết nối)
flutter build apk --release    # Build APK release
```

File APK xuất ra tại: `app_web_view/build/app/outputs/flutter-apk/app-release.apk`

### 12.4 Lưu ý

- `android:usesCleartextTraffic="true"` đã bật trong `AndroidManifest.xml` để test HTTP local
- Tắt flag này khi deploy production với HTTPS
- Deep link scheme `petai` phải khớp với OAuth callback URI trong Google Console

---

## 13. Khắc phục sự cố

### `ModuleNotFoundError: No module named 'flask'`
```bash
venv310\Scripts\activate
pip install -r requirements.txt
```

### `pymysql.err.OperationalError: Can't connect to MySQL`
- Kiểm tra MySQL đang chạy (XAMPP / `systemctl status mysql`)
- Kiểm tra `DB_HOST`, `DB_NAME=tts_system`, `DB_USER`, `DB_PASSWORD` trong `.env.local`

### `Unknown column 'is_public'` hoặc `display_name`
- Khởi động lại server — `run_db_migrations()` tự thêm cột
- Hoặc chạy thủ công: `database/add_share_and_name_columns.sql`

### Port 5000 đã được dùng (Windows)
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Emotional TTS không sẵn sàng / "Đang load model"
- Kiểm tra `web/vixtts_model/` đã có đủ 4 file (`config.json`, `model.pth`, `vocab.json`, `speakers_xtts.pth`)
- Lần đầu load mất 30–60 giây — chờ server báo `✅ Model ready!`
- RAM < 4 GB có thể gây lỗi khi load model viXTTS

### Emotional TTS trả về lỗi 500 / "Unknown error"
- Kiểm tra console terminal server để xem traceback đầy đủ
- Văn bản có ký tự đặc biệt (`<`, `>`, `&`) có thể gây lỗi — thử đoạn văn bản đơn giản trước
- Kiểm tra `base_voice.wav` tồn tại trong thư mục `web/`

### Xuất MP3/OGG không hoạt động
```powershell
ffmpeg -version   # Kiểm tra ffmpeg có trong PATH chưa
winget install Gyan.FFmpeg   # Windows
```

### Lỗi upload file giọng clone
- File phải là WAV, MP3, M4A, OGG, FLAC — tối đa 50 MB
- Kiểm tra thư mục `web/uploads/` có quyền ghi

### Lỗi UTF-8 / ký tự lạ trên Windows
- `start_server.bat` đã set `chcp 65001`
- `emotional_tts_vixtts.py` đã monkey-patch encoding stdout/stderr

### Google OAuth redirect không khớp
- Kiểm tra URI trong Google Cloud Console khớp chính xác với `http://localhost:5000/auth/google/callback`
- Không thêm dấu `/` cuối

---

## Checklist triển khai

- [ ] Python 3.10 + virtual environment đã tạo
- [ ] `pip install -r requirements.txt` thành công
- [ ] `pip install -r requirements_vixtts.txt` thành công (nếu dùng Emotional TTS)
- [ ] MySQL chạy, database `tts_system` đã tạo đủ 5 file SQL
- [ ] File `web/.env.local` đã cấu hình (`SECRET_KEY`, DB credentials)
- [ ] Thư mục `web/uploads/` và `web/audio_outputs/` tồn tại
- [ ] `web/base_voice.wav` có mặt
- [ ] (Emotional TTS) `web/vixtts_model/` đã tải model
- [ ] (Emotional TTS) `cheerful_ref.wav`, `calm_ref.wav`, `excited_ref.wav` có mặt
- [ ] (MP3/OGG) `ffmpeg` đã cài và có trong PATH
- [ ] Server khởi động tại `http://127.0.0.1:5000`
- [ ] Đăng nhập `admin` / `admin123` thành công
- [ ] TTS cơ bản chuyển đổi 1 đoạn văn bản thành công
- [ ] (Tuỳ chọn) Google OAuth callback hoạt động
- [ ] (Tuỳ chọn) SePay webhook nhận được

---

## Liên hệ kỹ thuật

| Kênh | Thông tin |
|---|---|
| **Email** | danhvt388@gmail.com |
| **Hotline** | 0866 005 541 |
| **Trang liên hệ** | `/contact` trong ứng dụng |
| **Hướng dẫn người dùng** | `USER_GUIDE.md` |

---

*© 2026 VietVoice. Tài liệu kỹ thuật nội bộ.*
