# Hướng dẫn cài đặt VietVoice AI

> Tài liệu dành cho developer / sysadmin triển khai backend web VietVoice AI  
> Phiên bản: Beta | Cập nhật: Tháng 6 năm 2026

Hướng dẫn này mô tả **đầy đủ các bước** từ clone repository trên GitHub đến chạy server local, bao gồm: cài phần mềm nền, tạo môi trường Python, import database, tạo file cấu hình và kiểm tra hoạt động.

---

## Mục lục

1. [Giới thiệu nhanh](#1-giới-thiệu-nhanh)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Bước 1 — Clone dự án từ GitHub](#3-bước-1--clone-dự-án-từ-github)
4. [Bước 2 — Cài phần mềm nền](#4-bước-2--cài-phần-mềm-nền)
5. [Bước 3 — Hiểu cấu trúc thư mục](#5-bước-3--hiểu-cấu-trúc-thư-mục)
6. [Bước 4 — Tạo môi trường Python (venv)](#6-bước-4--tạo-môi-trường-python-venv)
7. [Bước 5 — Cài thư viện Python](#7-bước-5--cài-thư-viện-python)
8. [Bước 6 — Cài đặt và import MySQL](#8-bước-6--cài-đặt-và-import-mysql)
9. [Bước 7 — Tạo file cấu hình `.env.local`](#9-bước-7--tạo-file-cấu-hình-envlocal)
10. [Bước 8 — Model AI & file tham chiếu (tuỳ chọn)](#10-bước-8--model-ai--file-tham-chiếu-tuỳ-chọn)
11. [Bước 9 — Cài ffmpeg](#11-bước-9--cài-ffmpeg)
12. [Bước 10 — Khởi chạy server](#12-bước-10--khởi-chạy-server)
13. [Bước 11 — Đăng nhập và kiểm tra](#13-bước-11--đăng-nhập-và-kiểm-tra)
14. [Cấu hình bổ sung (tuỳ chọn)](#14-cấu-hình-bổ-sung-tuỳ-chọn)
15. [Triển khai production](#15-triển-khai-production)
16. [Ứng dụng Flutter (WebView)](#16-ứng-dụng-flutter-webview)
17. [Admin CMS & file JSON](#17-admin-cms--file-json)
18. [Khắc phục sự cố](#18-khắc-phục-sự-cố)
19. [Checklist cài đặt](#19-checklist-cài-đặt)

---

## 1. Giới thiệu nhanh

VietVoice AI là ứng dụng web **Flask** (`LUANVAN/web/app.py`) cung cấp:

| Thành phần | Mô tả |
|---|---|
| TTS cơ bản | VieNeu-TTS (`LUANVAN/VieNeu-TTS-main/`) |
| Emotional TTS | viXTTS (`emotional_tts_vixtts.py`, model ~1.8 GB) |
| Clone giọng | RVC, Zero-shot, viXTTS Clone |
| Database | MySQL `tts_system` |
| Giao diện | Jinja2 templates + JavaScript (`static/js/`) |
| Admin | Dashboard, cấu hình site, chính sách, landing |

**Điểm bắt đầu chạy server:** thư mục `LUANVAN/web/` — lệnh `python app.py`.

**Repository GitHub:**

```
https://github.com/thanhdanh1709/VOICE_AI.git
```

---

## 2. Yêu cầu hệ thống

### 2.1 Phần cứng

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| OS | Windows 10, Ubuntu 20.04+ | Ubuntu 22.04 LTS / Windows 11 |
| Python | **3.10.x** | 3.10.x (không dùng 3.12+ nếu chưa test) |
| RAM | 4 GB | **8 GB+** (viXTTS ~3 GB RAM) |
| Ổ cứng | 10 GB trống | **25 GB+** (model viXTTS) |
| CPU | 4 nhân | 8 nhân+ |
| GPU | Không bắt buộc | NVIDIA + CUDA (Emotional TTS nhanh hơn) |

### 2.2 Phần mềm cần cài

| Phần mềm | Mục đích | Bắt buộc |
|---|---|---|
| **Git** | Clone repository | ✅ |
| **Python 3.10** | Backend Flask | ✅ |
| **MySQL 8.0+** (hoặc XAMPP) | Database | ✅ |
| **ffmpeg** | Xuất MP3/OGG | Khuyến nghị |
| SMTP (Gmail, v.v.) | Email reset MK, xóa TK | Tuỳ chọn |
| Google Cloud OAuth | Đăng nhập Google | Tuỳ chọn |
| SePay | Thanh toán QR | Tuỳ chọn |

---

## 3. Bước 1 — Clone dự án từ GitHub

### 3.1 Clone bằng Git

**Windows (PowerShell):**

```powershell
cd D:\projects
git clone https://github.com/thanhdanh1709/VOICE_AI.git
cd VOICE_AI
```

**Linux / macOS:**

```bash
cd ~/projects
git clone https://github.com/thanhdanh1709/VOICE_AI.git
cd VOICE_AI
```

### 3.2 Clone bằng GitHub Desktop

1. Mở **GitHub Desktop** → **File** → **Clone repository**
2. Tab **URL**: `https://github.com/thanhdanh1709/VOICE_AI.git`
3. Chọn thư mục lưu → **Clone**

### 3.3 Kiểm tra sau khi clone

Sau clone, cấu trúc chính phải có thư mục `LUANVAN/`:

```powershell
# Windows
dir LUANVAN

# Linux/macOS
ls LUANVAN
```

Kết quả mong đợi:

```
LUANVAN/
├── database/          # Script SQL
├── web/               # Flask app — CHẠY SERVER TẠI ĐÂY
├── VieNeu-TTS-main/   # Engine TTS cơ bản
└── tool/              # Công cụ RVC (clone giọng)
```

> **Lưu ý:** Nếu bạn clone vào thư mục có tên khác (ví dụ `LUANVAN (2) - Copy`), đường dẫn tuyệt đối sẽ khác nhưng **cấu trúc bên trong `LUANVAN/` giống hệt**.

### 3.4 Cập nhật code sau này

```bash
cd VOICE_AI
git pull origin main
```

---

## 4. Bước 2 — Cài phần mềm nền

### 4.1 Git

- Windows: https://git-scm.com/download/win  
- Ubuntu: `sudo apt install git`

Kiểm tra:

```bash
git --version
```

### 4.2 Python 3.10

- Windows: https://www.python.org/downloads/ — chọn **3.10.x**, bật **Add Python to PATH**
- Ubuntu:

```bash
sudo apt update
sudo apt install python3.10 python3.10-venv python3.10-dev
```

Kiểm tra:

```bash
python --version
# hoặc trên Linux: python3.10 --version
# Kết quả: Python 3.10.x
```

### 4.3 MySQL

**Cách 1 — XAMPP (Windows, dễ cho dev):**

1. Cài XAMPP: https://www.apachefriends.org/
2. Mở **XAMPP Control Panel** → Start **MySQL**
3. Mặc định: user `root`, password rỗng, port `3306`

**Cách 2 — MySQL Server:**

- Windows: MySQL Installer  
- Ubuntu: `sudo apt install mysql-server`

Kiểm tra kết nối:

```bash
mysql -u root -p -e "SELECT VERSION();"
```

### 4.4 ffmpeg (khuyến nghị)

**Windows:**

```powershell
winget install Gyan.FFmpeg
```

**Ubuntu:**

```bash
sudo apt install ffmpeg
```

Kiểm tra:

```bash
ffmpeg -version
```

---

## 5. Bước 3 — Hiểu cấu trúc thư mục

```
VOICE_AI/                              # Root repository (sau clone)
└── LUANVAN/                           # BASE_DIR trong config.py
    ├── web/                           # ★ Flask application
    │   ├── app.py                     # Entry point — chạy file này
    │   ├── config.py                  # Đọc biến môi trường
    │   ├── .env.local                 # ★ File cấu hình local (tự tạo, không commit)
    │   ├── requirements.txt           # Thư viện Python cốt lõi
    │   ├── requirements_vixtts.txt    # Thư viện Emotional TTS
    │   ├── templates/                 # HTML Jinja2
    │   ├── static/                    # CSS, JS, i18n
    │   ├── uploads/                   # Upload tạm (tự tạo khi chạy)
    │   ├── audio_outputs/             # File audio sau convert
    │   ├── vixtts_model/              # Model viXTTS (~1.8 GB, tải sau)
    │   ├── site_settings.json         # Cấu hình site (admin)
    │   ├── legal_content.json         # Nội dung pháp lý
    │   ├── USER_GUIDE.md              # Nguồn trang /user-guide
    │   └── INSTALLATION_GUIDE.md      # Nguồn trang /installation-guide
    ├── database/                      # ★ Script SQL
    │   ├── tts_database.sql
    │   ├── custom_voices_schema.sql
    │   ├── payment_schema.sql
    │   ├── RUN_ALL_CREATE_DATABASE.bat
    │   └── THU_TU_TAO_DATABASE.md
    ├── VieNeu-TTS-main/               # Engine TTS cơ bản
    │   └── main.py
    └── tool/
        └── Retrieval-based-Voice-Conversion-develop/   # RVC
```

### Đường dẫn quan trọng (`config.py`)

| Biến | Đường dẫn |
|---|---|
| `BASE_DIR` | `LUANVAN/` (cha của `web/`) |
| `UPLOAD_DIR` | `LUANVAN/web/uploads/` |
| `AUDIO_OUTPUT_DIR` | `LUANVAN/web/audio_outputs/` |
| `TTS_SCRIPT_PATH` | `LUANVAN/VieNeu-TTS-main/main.py` |

### Lệnh `cd` đúng trước khi chạy server

```powershell
# Thay VOICE_AI bằng đường dẫn thực tế của bạn
cd D:\projects\VOICE_AI\LUANVAN\web
```

---

## 6. Bước 4 — Tạo môi trường Python (venv)

Luôn dùng **virtual environment** để tránh xung đột thư viện.

### Windows (PowerShell)

```powershell
cd D:\projects\VOICE_AI\LUANVAN\web

# Tạo venv (có thể đặt cạnh LUANVAN hoặc trong web/)
python -m venv ..\..\venv310

# Kích hoạt
..\..\venv310\Scripts\Activate.ps1

# Nếu PowerShell chặn script:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

python --version   # Phải là 3.10.x
```

### Linux / macOS

```bash
cd ~/projects/VOICE_AI/LUANVAN/web
python3.10 -m venv ../../venv310
source ../../venv310/bin/activate
python --version
```

> Sau khi activate, prompt hiển thị `(venv310)` — mọi lệnh `pip`/`python` sau đó dùng môi trường này.

---

## 7. Bước 5 — Cài thư viện Python

Đảm bảo venv đã được kích hoạt, rồi chạy:

### 7.1 Thư viện cốt lõi (bắt buộc)

```bash
cd LUANVAN/web
pip install --upgrade pip
pip install -r requirements.txt
pip install markdown reportlab
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

| Gói | Mục đích |
|---|---|
| `markdown` | Trang hướng dẫn từ file `.md` |
| `reportlab` | Xuất PDF hóa đơn |

### 7.2 Emotional TTS (tuỳ chọn, cần RAM lớn)

```bash
pip install -r requirements_vixtts.txt
```

### 7.3 PyTorch (Windows CPU — nếu cài viXTTS)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 7.4 Kiểm tra cài đặt

```bash
python -c "import flask, pymysql; print('OK')"
```

---

## 8. Bước 6 — Cài đặt và import MySQL

Database mặc định: **`tts_system`**.

### 8.1 Tạo database bằng script Windows

1. Mở `LUANVAN/database/RUN_ALL_CREATE_DATABASE.bat`
2. Sửa dòng `MYSQL_CMD` nếu MySQL có mật khẩu:

```bat
set MYSQL_CMD=mysql -u root -pYourPassword
```

3. Double-click file `.bat` hoặc chạy trong CMD

### 8.2 Tạo database bằng lệnh thủ công

**Linux / macOS / Windows CMD:**

```bash
cd LUANVAN/database

mysql -u root -p < tts_database.sql
mysql -u root -p tts_system < custom_voices_schema.sql
mysql -u root -p tts_system < payment_schema.sql
mysql -u root -p tts_system < custom_voices_update_v2.sql
mysql -u root -p tts_system < custom_voices_zero_shot.sql
```

### 8.3 Tạo bằng phpMyAdmin (XAMPP)

1. Mở http://localhost/phpmyadmin  
2. Tab **SQL** → import hoặc paste nội dung từng file theo **thứ tự**:

| Bước | File | Nội dung |
|---|---|---|
| 1 | `tts_database.sql` | DB + users, conversions, voices, … |
| 2 | `custom_voices_schema.sql` | custom_voices, training_queue |
| 3 | `payment_schema.sql` | gói cước, payments |
| 4 | `custom_voices_update_v2.sql` | pitch/speed/energy |
| 5 | `custom_voices_zero_shot.sql` | voice_type, ref_transcript |

Chi tiết: `LUANVAN/database/THU_TU_TAO_DATABASE.md`.

### 8.4 Nếu bước 4 báo lỗi MySQL cũ

Dùng file thay thế:

```bash
mysql -u root -p tts_system < custom_voices_add_v2_columns.sql
```

### 8.5 Tài khoản admin mặc định

| Trường | Giá trị |
|---|---|
| Username | `admin` |
| Password | `admin123` |

**Đổi mật khẩu ngay sau khi cài.**

Tạo/cập nhật admin thủ công:

```bash
cd LUANVAN/database
python create_admin.py
# Sửa DB_CONFIG trong file nếu MySQL có mật khẩu khác
```

### 8.6 Migration tự động khi chạy server

Mỗi lần `python app.py`, hàm `run_db_migrations()` tự thêm cột mới (share_token, display_name, password_reset_tokens, …). Không cần chạy thêm nếu đã import đủ 5 file SQL trên.

---

## 9. Bước 7 — Tạo file cấu hình `.env.local`

File này **không được đẩy lên GitHub**. Ứng dụng đọc nó khi khởi động (`app.py` đọc trực tiếp, không dùng thư viện `python-dotenv`).

### 9.1 Tạo file

```powershell
cd LUANVAN\web
notepad .env.local
```

Hoặc:

```bash
touch .env.local
```

### 9.2 Nội dung mẫu — development local

Sao chép và **sửa các giá trị** cho máy của bạn:

```env
# ── DATABASE (bắt buộc) ──
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tts_system
DB_USER=root
DB_PASSWORD=

# ── FLASK (bắt buộc) ──
SECRET_KEY=thay-bang-chuoi-ngau-nhan-32-ky-tu-hoac-hon
FLASK_ENV=development
APP_BASE_URL=http://127.0.0.1:5000

# ── GOOGLE OAUTH (tuỳ chọn) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── SEPAY — thanh toán (tuỳ chọn) ──
SEPAY_API_URL=https://my.sepay.vn/userapi/transactions
SEPAY_TOKEN=
SEPAY_ACCOUNT_NUMBER=
SEPAY_BANK_ID=MBBank
SEPAY_TIMEOUT=300

# ── Hiển thị VietQR (tuỳ chọn) ──
BANK_NAME=MBBank
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_NAME=TTS SYSTEM
BANK_BRANCH=Can Tho

# ── SMTP — email (tuỳ chọn) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=app-password-16-chars
SMTP_FROM=your@gmail.com
SMTP_USE_TLS=1
ADMIN_EMAIL=admin@example.com

# ── Dịch UI / pháp lý EN (tuỳ chọn) ──
OPENAI_API_KEY=
OPENAI_API_BASE=https://api.openai.com
OPENAI_MODEL=gpt-4o-mini
```

### 9.3 Tạo SECRET_KEY ngẫu nhiên

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy kết quả vào `SECRET_KEY=...`.

### 9.4 Giải thích biến quan trọng

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | ✅ | Phải khớp MySQL |
| `SECRET_KEY` | ✅ | Session Flask — **không** dùng tên `FLASK_SECRET_KEY` |
| `FLASK_ENV` | Khuyến nghị | `development` → debug; `production` → tắt debug |
| `APP_BASE_URL` | Khuyến nghị | Link trong email reset mật khẩu |
| `GOOGLE_CLIENT_ID/SECRET` | Tuỳ chọn | Đăng nhập Google |
| `SEPAY_*`, `BANK_*` | Tuỳ chọn | Thanh toán QR |
| `SMTP_*`, `ADMIN_EMAIL` | Tuỳ chọn | Quên MK, xóa tài khoản |
| `OPENAI_*` | Tuỳ chọn | Dịch EN; không có → fallback Google |

`config.py` map tất cả biến trên; `DEBUG=True` khi `FLASK_ENV != production`.

### 9.5 Quy tắc file `.env.local`

- Mỗi dòng: `KEY=value` (không có khoảng trắng quanh `=`)
- Dòng `#` là comment
- Không commit file này lên Git

---

## 10. Bước 8 — Model AI & file tham chiếu (tuỳ chọn)

### 10.1 VieNeu TTS (cơ bản)

Đã có trong repo: `LUANVAN/VieNeu-TTS-main/`. Không cần tải thêm để chạy TTS cơ bản.

### 10.2 viXTTS — Emotional TTS

Model đặt tại `LUANVAN/web/vixtts_model/`.

**Tải bằng Hugging Face** (trong venv, tại `LUANVAN/web/`):

```bash
pip install huggingface_hub
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='capleaf/viXTTS', local_dir='vixtts_model')"
```

Cần có: `config.json`, `model.pth`, `vocab.json`, `speakers_xtts.pth`.

Lần đầu chạy server, model load ~30–60 giây, RAM ~3 GB.

### 10.3 File WAV tham chiếu cảm xúc (`web/`)

| File | Cảm xúc |
|---|---|
| `base_voice.wav` | neutral |
| `cheerful_ref.wav` | cheerful |
| `calm_ref.wav` | calm / sad |
| `excited_ref.wav` | excited |

Thiếu file → fallback `base_voice.wav`.

### 10.4 Chạy không có viXTTS

Nếu không cài `requirements_vixtts.txt` hoặc không có model, server vẫn chạy; chỉ tính năng **Emotional TTS** và **viXTTS clone** bị tắt.

---

## 11. Bước 9 — Cài ffmpeg

Cần cho xuất **MP3/OGG** (`audio_export.py`).

Đã cài ở [Bước 2](#44-ffmpeg-khuyến-nghị). Kiểm tra lại:

```bash
ffmpeg -version
```

API: `GET /api/audio/<file>/export?format=mp3&bitrate=192`

Bitrates hỗ trợ: `64, 96, 128, 192, 256, 320` kbps.

---

## 12. Bước 10 — Khởi chạy server

### 12.1 Lệnh chạy

```powershell
# Kích hoạt venv (nếu chưa)
cd D:\projects\VOICE_AI\LUANVAN\web
..\..\venv310\Scripts\Activate.ps1

python app.py
```

Linux/macOS:

```bash
cd ~/projects/VOICE_AI/LUANVAN/web
source ../../venv310/bin/activate
python app.py
```

### 12.2 Log khởi động thành công

```
============================================================
[TTS] TTS Web Application dang khoi dong...
[TTS] URL: http://localhost:5000
============================================================
[MIGRATION] Kiểm tra và cập nhật cấu trúc database...
[viXTTS] ✅ Model ready!          # nếu có model
[TTS] 🎉 SERVER READY
```

### 12.3 Thông số mặc định

| Thông số | Giá trị |
|---|---|
| Host | `0.0.0.0` (truy cập từ LAN) |
| Port | `5000` |
| URL local | http://127.0.0.1:5000 |

### 12.4 Dừng server

`Ctrl + C` trong terminal.

---

## 13. Bước 11 — Đăng nhập và kiểm tra

### 13.1 Trang web

| URL | Mô tả |
|---|---|
| http://127.0.0.1:5000/landing | Landing page |
| http://127.0.0.1:5000/login | Đăng nhập |
| http://127.0.0.1:5000/ | Workspace TTS (cần login) |
| http://127.0.0.1:5000/admin | Admin dashboard |
| http://127.0.0.1:5000/admin/settings | Cấu hình site |
| http://127.0.0.1:5000/admin/policies | Chính sách & FAQ |
| http://127.0.0.1:5000/installation-guide | Trang hướng dẫn cài đặt (từ file này) |
| http://127.0.0.1:5000/user-guide | Hướng dẫn sử dụng |

### 13.2 Đăng nhập admin

1. Mở http://127.0.0.1:5000/login  
2. Username: `admin`  
3. Password: `admin123`  
4. Vào http://127.0.0.1:5000/admin  

### 13.3 Kiểm tra TTS nhanh

1. Đăng nhập user thường hoặc admin  
2. Nhập văn bản ngắn trên workspace  
3. Chọn giọng → **Chuyển đổi**  
4. Kiểm tra file trong `LUANVAN/web/audio_outputs/`

### 13.4 Kiểm tra database

```bash
mysql -u root -p -e "USE tts_system; SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM voices;"
```

---

## 14. Cấu hình bổ sung (tuỳ chọn)

### 14.1 Google OAuth (web)

1. Google Cloud Console → **APIs & Services** → **Credentials**  
2. Tạo **OAuth 2.0 Client ID** (Web application)  
3. Authorized redirect URIs:

```
http://127.0.0.1:5000/auth/google/callback
http://localhost:5000/auth/google/callback
```

4. Copy Client ID / Secret vào `.env.local`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 14.2 SMTP (Gmail)

1. Bật 2FA trên Gmail  
2. Tạo **App Password**  
3. Cấu hình:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_USE_TLS=1
SMTP_FROM=your@gmail.com
APP_BASE_URL=http://127.0.0.1:5000
```

### 14.3 SePay (thanh toán)

1. Đăng ký SePay, lấy API token  
2. Cấu hình `.env.local`: `SEPAY_TOKEN`, `SEPAY_ACCOUNT_NUMBER`, `BANK_*`  
3. Webhook URL (production): `https://your-domain.com/api/payment/sepay/webhook`

### 14.4 OpenAI (dịch EN)

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Không có key → hệ thống thử fallback Google Translate.

---

## 15. Triển khai production

### 15.1 Biến môi trường production

```env
FLASK_ENV=production
SECRET_KEY=<chuoi-manh-64-ky-tu>
APP_BASE_URL=https://your-domain.com
DB_HOST=...
DB_PASSWORD=...
```

### 15.2 Gunicorn

```bash
cd LUANVAN/web
gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --timeout 120
```

**workers = 1** — model viXTTS singleton trong RAM.

### 15.3 Nginx (reverse proxy)

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_read_timeout 120s;
    client_max_body_size 50M;
}
```

### 15.4 Lưu ý cloud

- RAM ≥ 4 GB (8 GB nếu dùng viXTTS)  
- Upload hoặc build-time tải `vixtts_model/`  
- HTTPS bắt buộc cho Google OAuth production  
- Thư mục ghi: `uploads/`, `audio_outputs/`, file JSON CMS  
- SePay webhook phải truy cập được từ internet  

---

## 16. Ứng dụng Flutter (WebView)

App mobile Flutter (`app_web_view/`) có thể nằm **ngoài** repo `VOICE_AI` (thư mục sibling). Nếu có:

```bash
cd app_web_view
flutter pub get
```

Sửa `lib/config.dart`:

```dart
static const String webBaseUrl = 'http://YOUR_SERVER_IP:5000';
static const String callbackScheme = 'petai';
```

Build APK:

```bash
flutter build apk --release
```

OAuth mobile: route `GET /auth/google/login/flutter?callback_scheme=petai`.

---

## 17. Admin CMS & file JSON

Admin có thể chỉnh không cần sửa code:

| File | Nội dung |
|---|---|
| `site_settings.json` | Logo, email, gói cước hiển thị |
| `legal_content.json` / `legal_content_en.json` | Terms, Privacy, … |
| `support_content.json` / `support_content_en.json` | FAQ, hỗ trợ |
| `landing_content.json` / `landing_content_en.json` | Landing page |
| `USER_GUIDE.md` | Trang /user-guide |
| `INSTALLATION_GUIDE.md` | Trang /installation-guide |

Placeholder trong nội dung pháp lý: `__SUPPORT_EMAIL__`, `__CONTACT_EMAIL__`, `__CONTACT_URL__`, … — được thay khi hiển thị.

---

## 18. Khắc phục sự cố

### `ModuleNotFoundError: flask` / `pymysql`

```bash
# Kích hoạt venv trước
pip install -r requirements.txt
```

### `Can't connect to MySQL`

- XAMPP: MySQL đã **Start**  
- Kiểm tra `DB_HOST`, `DB_USER`, `DB_PASSWORD` trong `.env.local`  
- Database phải là `tts_system`  
- Test: `mysql -u root -p -e "SHOW DATABASES;"`

### `Access denied for user`

Mật khẩu MySQL trong `.env.local` không khớp. Sửa `DB_PASSWORD` hoặc reset password MySQL.

### `Unknown column is_public` / `display_name`

Restart server — `run_db_migrations()` tự thêm cột.

### Emotional TTS không sẵn sàng

- Kiểm tra `web/vixtts_model/` đủ file  
- RAM ≥ 4 GB  
- Đợi log `[viXTTS] ✅ Model ready!`  
- Hoặc tạm bỏ viXTTS, chỉ dùng TTS cơ bản

### Upload clone giọng bị từ chối

| Loại | Thời lượng audio |
|---|---|
| viXTTS clone | 6–120 giây |
| RVC | 30–900 giây (15 phút) |

### Xuất MP3/OGG lỗi

```bash
ffmpeg -version
```

Cài ffmpeg và restart server.

### Email không gửi (reset MK)

- Cấu hình đủ `SMTP_*`  
- Gmail: dùng App Password, `SMTP_USE_TLS=1`  
- `APP_BASE_URL` phải đúng domain

### Port 5000 đã dùng

```powershell
# Windows — tìm process
netstat -ano | findstr :5000
```

Đổi port tạm (sửa cuối `app.py`) hoặc tắt process chiếm port.

### Clone repo nhưng thiếu `VieNeu-TTS-main`

Kiểm tra repo đầy đủ; nếu thiếu submodule, liên hệ maintainer hoặc copy từ bản release đầy đủ.

---

## 19. Checklist cài đặt

Đánh dấu khi hoàn tất:

- [ ] Clone `https://github.com/thanhdanh1709/VOICE_AI.git`
- [ ] Cài Git, Python **3.10**, MySQL
- [ ] `cd LUANVAN/web` — đúng thư mục
- [ ] Tạo và kích hoạt `venv310`
- [ ] `pip install -r requirements.txt` (+ `markdown`, `reportlab`)
- [ ] Import 5 file SQL → database `tts_system`
- [ ] Tạo `LUANVAN/web/.env.local` (DB + SECRET_KEY + APP_BASE_URL)
- [ ] (Tuỳ chọn) Cài viXTTS + tải model
- [ ] (Tuỳ chọn) Cài ffmpeg
- [ ] `python app.py` → log SERVER READY
- [ ] Đăng nhập admin, đổi mật khẩu mặc định
- [ ] Test TTS cơ bản trên workspace
- [ ] (Production) `FLASK_ENV=production`, HTTPS, Gunicorn, Nginx

---

## Tóm tắt lệnh nhanh (copy-paste)

```powershell
# 1. Clone
git clone https://github.com/thanhdanh1709/VOICE_AI.git
cd VOICE_AI\LUANVAN\web

# 2. Venv
python -m venv ..\..\venv310
..\..\venv310\Scripts\Activate.ps1

# 3. Dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install markdown reportlab

# 4. Database — chạy RUN_ALL_CREATE_DATABASE.bat hoặc mysql thủ công

# 5. Config
notepad .env.local
# (điền DB_*, SECRET_KEY, APP_BASE_URL)

# 6. Run
python app.py
# Mở http://127.0.0.1:5000
```

---

*Tài liệu này được render tại `/installation-guide` qua `guide_content_loader.py`. Khi cập nhật file, restart server hoặc hard refresh trình duyệt để thấy thay đổi.*
