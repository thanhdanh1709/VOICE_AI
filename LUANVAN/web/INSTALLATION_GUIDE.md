# Hướng dẫn cài đặt hệ thống VietVoice

> Tài liệu kỹ thuật — developer / sysadmin / admin triển khai  
> Phiên bản: Beta | Cập nhật: Tháng 6 năm 2026

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cài đặt Python & dependencies](#4-cài-đặt-python--dependencies)
5. [MySQL & schema](#5-mysql--schema)
6. [Biến môi trường (.env.local)](#6-biến-môi-trường-envlocal)
7. [Mô hình AI & file tham chiếu](#7-mô-hình-ai--file-tham-chiếu)
8. [ffmpeg & xuất audio](#8-ffmpeg--xuất-audio)
9. [Chạy server local](#9-chạy-server-local)
10. [Deploy production](#10-deploy-production)
11. [Google OAuth & Flutter mobile](#11-google-oauth--flutter-mobile)
12. [SePay & thanh toán](#12-sepay--thanh-toán)
13. [Admin CMS & file JSON](#13-admin-cms--file-json)
14. [Hướng dẫn Markdown (guide_content_loader)](#14-hướng-dẫn-markdown-guide_content_loader)
15. [API tham chiếu nhanh](#15-api-tham-chiếu-nhanh)
16. [Khắc phục sự cố](#16-khắc-phục-sự-cố)
17. [Checklist triển khai](#17-checklist-triển-khai)

---

## 1. Tổng quan kiến trúc

VietVoice là **Flask monolith** (`web/app.py`) phục vụ:

- **Frontend:** Jinja2 templates + Tailwind (CDN) + vanilla JS (`index.js`, `i18n.js`)
- **TTS cơ bản:** VieNeu-TTS (`VieNeu-TTS-main/main.py`)
- **Emotional TTS:** viXTTS (`emotional_tts_vixtts.py`, model ~1.8 GB)
- **Voice clone:** RVC training (`voice_training.py`, `background_worker.py`), Zero-shot, viXTTS Clone
- **Post-process:** RVC pitch (`rvc_wrapper.py`), export (`audio_export.py` + ffmpeg)
- **DB:** MySQL `tts_system` — users, conversions, voices, payments, custom_voices
- **CMS:** JSON files + 2 file Markdown hướng dẫn (không lưu guide trong DB)
- **Mobile:** Flutter WebView (`app_web_view/`) + deep link OAuth `petai://`

**Luồng request TTS cơ bản:**

```
Client POST /api/convert
  → check login + character quota
  → INSERT conversions (processing)
  → VieNeu / viXTTS clone / zero_shot / RVC custom
  → WAV → audio_outputs/
  → UPDATE conversions (completed) + deduct characters_used
```

---

## 2. Yêu cầu hệ thống

### 2.1 Server backend

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| OS | Windows 10, Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| Python | **3.10** | 3.10.x |
| RAM | 4 GB | **8 GB+** (viXTTS ~3 GB RAM) |
| Disk | 10 GB | **25 GB+** (model viXTTS) |
| CPU | 4 nhân | 8 nhân+ |
| GPU | Không bắt buộc | NVIDIA CUDA (Emotional nhanh ~5×) |

### 2.2 Phần mềm bên ngoài

| Phần mềm | Mục đích | Bắt buộc |
|---|---|---|
| MySQL 8.0+ | Database | ✅ |
| ffmpeg | MP3/OGG export | Cho xuất MP3/OGG |
| SMTP server | Reset MK, xóa TK, email admin | Cho email tự động |
| Google Cloud OAuth | Login Google | Tuỳ chọn |
| SePay API | Thanh toán QR | Tuỳ chọn |
| OpenAI API | Dịch UI/pháp lý EN | Tuỳ chọn (có Google fallback) |

### 2.3 Giới hạn hệ thống (code)

| Giới hạn | Giá trị | Nguồn |
|---|---|---|
| Free tier ký tự | 100.000 / 30 ngày | `user_subscriptions` |
| Upload text (config) | 10 MB | `config.MAX_FILE_SIZE` |
| Text extensions | txt, pdf, docx | `ALLOWED_TEXT_EXTENSIONS` |
| Avatar | 2 MB, jpg/png/webp | `upload-avatar` handler |
| Logo site | 2 MB, png/jpg/webp/svg | `MAX_LOGO_BYTES` |
| RVC sample audio | 30 s – 900 s (15 ph) | `audio_processor.py` |
| viXTTS clone sample | 6 s – 120 s | `upload_custom_voice` |
| Test voice text | 300 ký tự | `custom-voice/test` |
| Zero-shot test transcript | 250 ký tự | truncate in test |
| display_name (library) | 200 ký tự | rename API |
| deletion reason | 2000 ký tự | request deletion |
| Password min | 6 ký tự | register/reset/change |
| RVC pitch | -12 … +12 | voice-conversion API |
| index_rate | 0 … 1 | default 0.75 |
| protect | 0 … 0.5 | default 0.33 |
| MP3 bitrates | 64,96,128,192,256,320 | `audio_export.ALLOWED_BITRATES` |
| Password reset TTL | 1 giờ | `PASSWORD_RESET_EXPIRY_HOURS` |
| Mobile OAuth token | 5 phút | `_mobile_tokens` |
| Account deletion grace | 30 ngày | `ACCOUNT_DELETION_GRACE_DAYS` |
| Session lifetime | 86400 s (24 h) | `PERMANENT_SESSION_LIFETIME` |
| SePay verify timeout | 300 s | `SEPAY_TIMEOUT` |
| History per_page | 10 (default) | `/api/history` |
| Library per_page | 12 (default) | `/api/audio-library` |
| My voices per_page | 9 | `my_voices()` |
| Admin payments per_page | 15 (5–100) | admin payments API |
| User payments per_page | 8 (5–50) | user payments API |
| Flask port (default) | 5000 | `app.py` `__main__` |

---

## 3. Cấu trúc thư mục

> **Lưu ý đường dẫn:** Repo của bạn thường nằm trong  
> `...\LUANVAN (2) - Copy\LUANVAN (2) - Copy\` (workspace).  
> Thư mục code chính là **`LUANVAN/`** bên trong — `config.py` coi đó là `BASE_DIR` (cha của `web/`).

```
<workspace>/                          # VD: LUANVAN (2) - Copy\LUANVAN (2) - Copy\
├── LUANVAN/                          # BASE_DIR — cha của web/
│   ├── web/                          # Flask app (chạy python app.py TẠI ĐÂY)
│   │   ├── app.py                    # Entry point (~7900 dòng)
│   │   ├── config.py                 # Đọc .env.local, đường dẫn UPLOAD/AUDIO/TTS
│   │   ├── .env.local                # Cấu hình local (không commit)
│   │   ├── requirements.txt
│   │   ├── requirements_vixtts.txt
│   │   ├── start_server.bat | start_web.bat
│   │   ├── audio_export.py           # Xuất WAV/MP3/OGG (ffmpeg)
│   │   ├── emotional_tts_vixtts.py # Emotional TTS (viXTTS)
│   │   ├── audio_processor.py        # Kiểm tra audio mẫu clone
│   │   ├── background_worker.py    # Worker huấn luyện RVC nền
│   │   ├── rvc_wrapper.py            # Điều chỉnh pitch sau TTS
│   │   ├── rvc_trainer.py            # Huấn luyện RVC
│   │   ├── translate_service.py      # Dịch UI / pháp lý (LLM + Google)
│   │   ├── guide_content_loader.py   # Đọc USER_GUIDE.md → HTML
│   │   ├── USER_GUIDE.md             # Nguồn trang /user-guide
│   │   ├── INSTALLATION_GUIDE.md     # Nguồn trang /installation-guide
│   │   ├── site_settings.json        # Logo, email (admin)
│   │   ├── legal_content.json (+ legal_content_en.json)
│   │   ├── support_content.json (+ support_content_en.json)
│   │   ├── landing_content.json (+ landing_content_en.json)
│   │   ├── legal_defaults.py, support_defaults.py (+ bản EN)
│   │   ├── data/translate_cache.json
│   │   ├── templates/                # HTML Jinja2 (+ partials/)
│   │   ├── static/
│   │   │   ├── css/                  # admin-console, legal-pages, auth-pages...
│   │   │   ├── js/                   # index.js, i18n.js, admin_*.js
│   │   │   ├── i18n/                 # vi.json, en.json
│   │   │   └── voice-samples/        # {voice_id}_sample.wav
│   │   ├── uploads/                  # Upload tạm, avatar
│   │   ├── audio_outputs/            # File WAV sau convert
│   │   ├── vixtts_model/             # Model viXTTS (~1.8 GB)
│   │   ├── models/                   # Model phụ (nếu có)
│   │   ├── processed/                # Xử lý audio tạm
│   │   ├── rvc_training/             # Dữ liệu huấn luyện RVC
│   │   ├── base_voice.wav            # Ref Emotional TTS
│   │   ├── cheerful_ref.wav, calm_ref.wav, excited_ref.wav
│   │   └── scripts/                  # Script tiện ích
│   ├── database/                     # Script SQL — trong LUANVAN/, KHÔNG ở repo root
│   │   ├── tts_database.sql
│   │   ├── custom_voices_schema.sql
│   │   ├── payment_schema.sql
│   │   ├── custom_voices_update_v2.sql
│   │   ├── custom_voices_zero_shot.sql
│   │   ├── add_share_and_name_columns.sql   # Tuỳ chọn (migration runtime cũng tự thêm)
│   │   ├── THU_TU_TAO_DATABASE.md
│   │   └── RUN_ALL_CREATE_DATABASE.bat
│   ├── VieNeu-TTS-main/              # Engine TTS cơ bản (cùng cấp web/)
│   │   ├── main.py
│   │   └── vieneu_utils/
│   └── tool/
│       └── Retrieval-based-Voice-Conversion-develop/   # Công cụ RVC
├── app_web_view/                     # Flutter Android — CÙNG CẤP LUANVAN/, KHÔNG trong LUANVAN/
│   ├── lib/config.dart               # webBaseUrl, callbackScheme petai
│   ├── lib/main.dart
│   └── android/
├── venv310/                          # Virtualenv Python (thường ở workspace root)
├── models/                           # Model / dữ liệu phụ (repo level)
├── processed/                        # File xử lý tạm (repo level)
├── rvc_training/                     # Training output (repo level)
├── uploads/                          # Upload legacy (repo level, nếu có)
└── 100_giong/                        # Mẫu giọng / dataset (nếu có)
```

### Đường dẫn quan trọng (`config.py`)

| Biến | Đường dẫn thực tế |
|---|---|
| `BASE_DIR` | `LUANVAN/` (cha của `web/`) |
| `UPLOAD_DIR` | `LUANVAN/web/uploads/` |
| `AUDIO_OUTPUT_DIR` | `LUANVAN/web/audio_outputs/` |
| `TTS_SCRIPT_PATH` | `LUANVAN/VieNeu-TTS-main/main.py` |

### Lệnh `cd` trên máy bạn (Windows)

```powershell
cd "d:\banduphong\LUANVAN (2) - Copy\LUANVAN (2) - Copy\LUANVAN\web"
# hoặc tương đương: cd <workspace>\LUANVAN\web
python app.py
```

**Sai lầm thường gặp:**

| Sai | Đúng |
|---|---|
| `database/` ở repo root | `LUANVAN/database/` |
| `app_web_view/` trong `LUANVAN/` | `app_web_view/` cùng cấp `LUANVAN/` |
| `venv310` trong `web/` | Thường ở workspace root hoặc tự tạo trong `LUANVAN/web/` |

---

## 4. Cài đặt Python & dependencies

### 4.1 Virtual environment

```powershell
cd "<workspace>\LUANVAN\web"
# VD: cd "d:\banduphong\LUANVAN (2) - Copy\LUANVAN (2) - Copy\LUANVAN\web"
python -m venv ..\..\venv310
..\..\venv310\Scripts\activate
python --version   # 3.10.x
```

### 4.2 Pip install

```bash
pip install -r requirements.txt
pip install markdown          # Bắt buộc cho trang hướng dẫn MD
pip install reportlab         # PDF hóa đơn /invoice (nếu chưa có)
```

**requirements.txt:**

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

**Emotional TTS (tuỳ chọn):**

```bash
pip install -r requirements_vixtts.txt
```

**Windows CPU — PyTorch:**

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 4.3 Load env

`app.py` load `web/.env.local` at startup via `dotenv` — tạo file trước khi chạy.

---

## 5. MySQL & schema

### 5.1 Tạo database

Database name: **`tts_system`** (`config.DB_NAME`).

Chạy SQL theo thứ tự:

| # | File | Nội dung chính |
|---|---|---|
| 1 | `tts_database.sql` | `users`, `conversions`, `voices`, `sessions`, `statistics` |
| 2 | `custom_voices_schema.sql` | `custom_voices`, `training_queue`, `voice_usage_logs` |
| 3 | `payment_schema.sql` | `subscription_packages`, `user_subscriptions`, `payments` |
| 4 | `custom_voices_update_v2.sql` | `pitch/speed/energy_adjustment`, `base_voice_id` |
| 5 | `custom_voices_zero_shot.sql` | `voice_type`, `ref_transcript` |

```bash
cd LUANVAN/database
mysql -u root -p < tts_database.sql
mysql -u root -p < custom_voices_schema.sql
mysql -u root -p < payment_schema.sql
mysql -u root -p < custom_voices_update_v2.sql
mysql -u root -p < custom_voices_zero_shot.sql
```

Hoặc Windows: chạy `LUANVAN\database\RUN_ALL_CREATE_DATABASE.bat`

### 5.2 Admin mặc định

| Field | Value |
|---|---|
| username | `admin` |
| password | `admin123` |

**Đổi mật khẩu ngay sau deploy.**

### 5.3 Migration runtime (`run_db_migrations()`)

Tự chạy mỗi lần `app.py` start:

**Bảng `users`:** cột xóa tài khoản, grace period, `delete_status`, …

**Bảng `conversions`:**

- `display_name` VARCHAR(200)
- `is_public` TINYINT
- `share_token` VARCHAR(64) + index

**Bảng `password_reset_tokens`:** tạo nếu chưa có.

### 5.4 Bảng quan trọng

| Bảng | Mục đích |
|---|---|
| `users` | Account, `role` (admin/user), OAuth, deletion state |
| `conversions` | Mọi TTS job + audio library rows |
| `voices` | System preset voices cho `/api/voices` |
| `custom_voices` | User clones (`voice_type`, `status`, paths) |
| `user_subscriptions` | `characters_limit`, `characters_used`, `end_date` |
| `subscription_packages` | Pricing tiers (admin editable) |
| `payments` | SePay transactions, `transaction_id` |
| `voice_usage_logs` | Custom voice usage tracking |
| `training_queue` | RVC training jobs |

### 5.5 Gói mặc định (`payment_schema.sql`)

| package_name | characters_limit | price_vnd | duration_days |
|---|---|---|---|
| Free Plan | 100,000 | 0 | 30 |
| Basic Plan | 1,500,000 | 500,000 | 30 |
| Standard Plan | 4,000,000 | 1,000,000 | 30 |
| Premium Plan | 10,000,000 | 2,000,000 | 30 |
| Enterprise Plan | 27,000,000 | 5,000,000 | 30 |

Admin có thể thay qua `/api/admin/packages`.

---

## 6. Biến môi trường (.env.local)

Tạo `web/.env.local`:

```env
# ── DATABASE ──
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tts_system
DB_USER=root
DB_PASSWORD=

# ── FLASK ──
SECRET_KEY=<random-32+chars>
FLASK_ENV=development
APP_BASE_URL=http://127.0.0.1:5000

# ── GOOGLE OAUTH ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── SEPAY ──
SEPAY_API_URL=https://my.sepay.vn/userapi/transactions
SEPAY_TOKEN=
SEPAY_ACCOUNT_NUMBER=
SEPAY_BANK_ID=MBBank
SEPAY_TIMEOUT=300

# ── BANK DISPLAY (VietQR) ──
BANK_NAME=MBBank
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_NAME=TTS SYSTEM
BANK_BRANCH=Can Tho

# ── SMTP ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_USE_TLS=1
ADMIN_EMAIL=admin@example.com

# ── LLM TRANSLATE (optional) ──
OPENAI_API_KEY=
OPENAI_API_BASE=https://api.openai.com
OPENAI_MODEL=gpt-4o-mini
```

| Biến | Ghi chú |
|---|---|
| `SECRET_KEY` | Flask session — **không** dùng `FLASK_SECRET_KEY` |
| `APP_BASE_URL` | Link reset password trong email |
| `ADMIN_EMAIL` | Nhận thông báo xóa/khôi phục TK |
| `SMTP_*` | Forgot password, deletion emails |
| `OPENAI_*` | Dịch EN; không có → Google fallback |

`config.py` đọc tất cả biến trên; `DEBUG=True` khi `FLASK_ENV != production`.

---

## 7. Mô hình AI & file tham chiếu

### 7.1 VieNeu TTS (cơ bản)

```
LUANVAN/VieNeu-TTS-main/main.py   # Sibling of web/
```

`app.py` import `Vieneu` và load dictionary từ `vieneu_utils/`.

Default voice: `Binh` / `BinhHM`.

### 7.2 viXTTS (Emotional)

Download vào `web/vixtts_model/`:

```python
from huggingface_hub import snapshot_download
snapshot_download(repo_id='capleaf/viXTTS', local_dir='web/vixtts_model')
```

Cần: `config.json`, `model.pth`, `vocab.json`, `speakers_xtts.pth`.

Preload at startup → `VIXTTS_INSTANCE` global (RAM ~3 GB).

### 7.3 Emotional reference WAV (`web/`)

| File | Emotion |
|---|---|
| `base_voice.wav` | neutral |
| `cheerful_ref.wav` | cheerful |
| `calm_ref.wav` | calm / sad |
| `excited_ref.wav` | excited |

Missing ref → fallback `base_voice.wav`.

### 7.4 Emotion detection (code)

`emotional_tts_vixtts.py` — keywords trong text/tag:

- cheerful: `tươi sáng`, `vui`, `nụ cười`, …
- excited: `hào hứng`, `wow`, `tuyệt vời`, …
- calm: `chậm`, `ấm`, `nhẹ nhàng`, …
- sad: `buồn`, `tiếc`, …

Tags `(...)` trên dòng → `split_by_emotion()`.

### 7.5 Custom voice types (DB `voice_type`)

| Type | Training | TTS path |
|---|---|---|
| `rvc` | Background worker | Base preset + pitch/speed RVC |
| `zero_shot` | Instant completed | ref_audio + ref_transcript |
| `vixtts_clone` | Instant completed | viXTTS synthesize_with_voice |

Upload API: `POST /api/custom-voice/upload` (multipart).

---

## 8. ffmpeg & xuất audio

```powershell
winget install Gyan.FFmpeg
ffmpeg -version
```

`audio_export.py`:

- Formats: `wav`, `mp3`, `ogg`
- Bitrates: `{64, 96, 128, 192, 256, 320}` kbps
- Default bitrate: **192**

API: `GET /api/audio/<file>/export?format=mp3&bitrate=192`

`GET /api/audio/formats` → `{ formats, bitrates, ffmpeg: bool }`

---

## 9. Chạy server local

```powershell
cd LUANVAN\web
venv310\Scripts\activate
python app.py
```

Hoặc `start_server.bat` (UTF-8 code page 65001).

### 9.1 Log khởi động thành công

```
[MIGRATION] ✓ ...
[viXTTS] ✅ Model ready!
[TTS] 🎉 SERVER READY
[TTS] URL: http://127.0.0.1:5000
```

Lần đầu viXTTS: 30–60 giây load model.

### 9.2 URL map

| URL | Mô tả |
|---|---|
| `/` | Workspace (login required) |
| `/landing` | Marketing |
| `/admin` | Dashboard |
| `/admin/settings` | Site config |
| `/admin/policies` | Legal + support + MD guides |
| `/admin/landing` | Landing editor |
| `/support` | Help & FAQ |
| `/user-guide` | User guide (from MD) |
| `/installation-guide` | This doc (from MD) |
| `/forgot-password` | Password reset request |

---

## 10. Deploy production

### 10.1 Gunicorn

```bash
gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --timeout 120 --chdir LUANVAN/web
```

**workers = 1** — viXTTS singleton in RAM.

### 10.2 Nginx reverse proxy

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_read_timeout 120s;
    client_max_body_size 50M;
}
```

### 10.3 Production env

```env
FLASK_ENV=production
SECRET_KEY=<strong-secret>
APP_BASE_URL=https://your-domain.com
DB_HOST=...
```

### 10.4 Lưu ý cloud

- RAM ≥ 4 GB (viXTTS)
- Upload `vixtts_model/` hoặc download at build
- HTTPS trước Google OAuth production
- Writable: `uploads/`, `audio_outputs/`, JSON CMS files
- Webhook SePay phải reachable từ internet

---

## 11. Google OAuth & Flutter mobile

### 11.1 Web OAuth

Google Console → OAuth 2.0 Client → Web:

```
http://localhost:5000/auth/google/callback
https://your-domain.com/auth/google/callback
```

Routes:

- `GET /auth/google` — start
- `GET /auth/google/callback` — session login

### 11.2 Flutter OAuth

- `GET /auth/google/login/flutter?callback_scheme=petai`
- Callback: `petai://callback?mobile_token=<token>` (TTL **5 min**)
- WebView: `GET /auth/mobile/callback?mobile_token=...`

`MOBILE_CALLBACK_SCHEME = 'petai'` in `app.py`.

### 11.3 Flutter config

`app_web_view/lib/config.dart`:

```dart
static const String webBaseUrl = 'https://your-domain.com';
static const String callbackScheme = 'petai';
```

Android: `usesCleartextTraffic="true"` for HTTP dev only.

Build: `flutter build apk --release` → `build/app/outputs/flutter-apk/app-release.apk`

---

## 12. SePay & thanh toán

### 12.1 Setup

1. Đăng ký [sepay.vn](https://sepay.vn/)
2. `SEPAY_TOKEN` + tài khoản ngân hàng trong `.env.local`

### 12.2 Payment flow

```
POST /api/payment/create { package_id }
  → transaction_id = "TTS" + uuid.hex[:16].upper()
  → payments.status = pending
  → QR via img.vietqr.io or manual EMV QR
User transfers with transaction_id in content
  → POST /api/payment/sepay/webhook
  → OR GET /api/payment/status/<id> (poll + auto verify)
  → update_user_subscription(): add chars + extend end_date
```

### 12.3 SePay matching logic

- `transaction_content` contains `transaction_id` (normalized alphanumeric)
- Amount ≥ **99%** of `amount_vnd`

### 12.4 Admin payment tools

- `GET /api/admin/payments` — list all
- `POST /api/admin/payment/approve` — manual approve
- `POST /api/admin/auto-approve` — bulk pending
- `GET /invoice/<payment_id>` — PDF invoice

---

## 13. Admin CMS & file JSON

### 13.1 Admin navigation (`/admin`)

| Section | URL / anchor | Chức năng |
|---|---|---|
| Dashboard | `/admin` | Stats, charts, top rankings |
| Xóa tài khoản | `#section-account-deletions` | Approve/reject/restore |
| Users | `#section-users` | Role, lock, delete |
| Giọng đọc | `#section-voices` | Samples, worker status |
| Thanh toán | `#section-payments` | Approve, auto-approve |
| Landing | `/admin/landing` | Hero, features, CTA |
| Cấu hình Site | `/admin/settings` | Logo, email, packages |
| Cấu hình chính sách | `/admin/policies` | Legal, support, guides |

### 13.2 Cấu hình Site (`/admin/settings`)

**Tabs:** Thương hiệu | Email & Liên hệ | Gói cước

| API | Mô tả |
|---|---|
| `GET/POST /api/admin/settings` | `site_settings.json` |
| `POST /api/admin/settings/logo` | Upload logo → `static/img/site_logo.{ext}` |
| `GET/POST/PUT/DELETE /api/admin/packages` | CRUD `subscription_packages` |

**`site_settings.json` fields:**

```json
{
  "site_name": "VietVoice",
  "logo_url": "",
  "support_email": "support@vietvoice.app",
  "contact_email": "support@vietvoice.app",
  "smtp_from_display": "",
  "company_name": "",
  "company_phone": ""
}
```

Injected to all templates: `site_settings`, `support_email_addr`, `contact_email_addr`.

### 13.3 Cấu hình chính sách (`/admin/policies`)

**Tab Trang pháp lý** — Quill HTML editor:

| Key | Public URL |
|---|---|
| `terms` | `/terms` |
| `privacy` | `/privacy` |
| `data_deletion` | `/data-deletion` |
| `payment` | `/payment-terms` |

Lưu `legal_content.json`. EN cache: `legal_content_en.json` (hash-based).

**Hướng dẫn SD / Cài đặt** — Markdown editor (marked.js preview):

- Đọc/ghi `USER_GUIDE.md`, `INSTALLATION_GUIDE.md`
- **Không** lưu nội dung guide trong `legal_content.json`

**Tab Hỗ trợ & FAQ:**

- `support_content.json` — cards, guides, FAQs
- EN: `support_content_en.json`

API: `GET/POST /api/admin/legal`, `GET/POST /api/admin/support`

### 13.4 Landing editor

- Page: `/admin/landing`
- Save: `POST /admin/landing/save` → `landing_content.json`
- Display: `GET /api/landing/display?lang=`
- EN cache: `landing_content_en.json`

### 13.5 Account deletion admin

| API | Action |
|---|---|
| `GET /api/admin/account-deletions` | Pending requests |
| `POST .../<user_id>/approve` | Deactivate + 30-day grace |
| `POST .../<user_id>/reject` | Reject request |
| `GET .../grace-period` | Accounts in grace |
| `POST .../<user_id>/restore` | Restore account |
| `POST /api/public/request-account-restore` | Public restore request |

### 13.6 JSON files summary

| File | Content |
|---|---|
| `site_settings.json` | Brand, emails |
| `landing_content.json` | Landing VI |
| `landing_content_en.json` | Landing EN cache |
| `legal_content.json` | Legal pages VI (not guides) |
| `legal_content_en.json` | Legal EN cache |
| `support_content.json` | Support VI |
| `support_content_en.json` | Support EN cache |
| `data/translate_cache.json` | LLM translate cache |

Legal placeholders in content: `__SUPPORT_EMAIL__`, `__CONTACT_EMAIL__`, `__PRICING_URL__`, …

---

## 14. Hướng dẫn Markdown (guide_content_loader)

### 14.1 Nguồn duy nhất

| File | Web page | Audience |
|---|---|---|
| `web/USER_GUIDE.md` | `/user-guide` | End users |
| `web/INSTALLATION_GUIDE.md` | `/installation-guide` | Developers |

`get_legal_for_display()` và admin **luôn đọc MD** — `legal_content.json` không chứa guide keys.

### 14.2 Cập nhật nội dung

**Cách 1:** Sửa file `.md` trực tiếp → F5 trang web / admin.

**Cách 2:** Admin → Cấu hình chính sách → tab Hướng dẫn → Markdown editor → **Lưu tất cả trang pháp lý**.

`POST /api/admin/legal` với `guide_markdown: { user_guide: "...", installation_guide: "..." }`.

### 14.3 Định dạng Markdown

Parser: `guide_content_loader.parse_markdown_guide()`

- Section = heading `## Tiêu đề` (regex `^## (.+)$`)
- HTML via `markdown` lib: tables, fenced_code, nl2br
- Classes: `legal-md-table`, `legal-md-pre`, `legal-md-quote`
- Date line: `Cập nhật: Tháng 6/2026` trong header

### 14.4 EN translation

Guide VI → `_translate_legal_page_to_en()` khi user chọn EN.

Cache in `legal_content_en.json` keyed by content hash.

### 14.5 Dependencies

```bash
pip install markdown
```

---

## 15. API tham chiếu nhanh

### Auth

| Method | Path | Auth |
|---|---|---|
| POST | `/login`, `/register` | Public |
| POST | `/forgot-password` | Public |
| GET | `/auth/google` | Public |

### TTS core

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/voices` | System voices + samples |
| POST | `/api/convert` | `{text, voice_id}` |
| POST | `/api/convert-emotional` | `{text, custom_voice_id?}` |
| GET | `/api/emotional-tts/status` | Model ready |
| POST | `/api/upload/extract` | multipart file |
| POST | `/api/voice-conversion` | RVC post-process |

### User data

| Method | Path |
|---|---|
| GET | `/api/history` |
| GET | `/api/audio-library` |
| PATCH | `/api/audio-library/<id>/rename` |
| POST | `/api/audio-library/<id>/share` |
| GET | `/api/user/characters` |
| POST | `/api/custom-voice/upload` |

### Payment

| Method | Path |
|---|---|
| GET | `/api/packages` |
| POST | `/api/payment/create` |
| GET | `/api/payment/status/<id>` |
| POST | `/api/payment/sepay/webhook` |

### Display (i18n)

| Method | Path |
|---|---|
| GET | `/api/legal/display/<page_key>?lang=` |
| GET | `/api/support/display?lang=` |
| GET | `/api/landing/display?lang=` |
| POST | `/api/translate` |

---

## 16. Khắc phục sự cố

### ModuleNotFoundError: flask / pymysql

```bash
venv310\Scripts\activate
pip install -r requirements.txt
```

### Can't connect to MySQL

- XAMPP MySQL running / `systemctl status mysql`
- Check `.env.local` DB_* values
- Database name must be `tts_system`

### Unknown column is_public / display_name

Restart server — `run_db_migrations()` auto-adds.

### Emotional TTS not ready

- Check `web/vixtts_model/` complete
- RAM ≥ 4 GB
- Wait for log `[viXTTS] ✅ Model ready!`

### viXTTS clone upload rejected

- Duration must be **6–120 seconds**
- Emotional model must be loaded

### RVC clone upload rejected

- Duration **30–900 seconds** via `audio_processor.validate_audio()`

### Zero-shot error on upload

- `ref_transcript` required
- Run `custom_voices_zero_shot.sql` migration if column missing

### MP3/OGG export fails

```bash
ffmpeg -version
```

### Email not sent (reset password / deletion)

- Configure SMTP in `.env.local`
- Gmail: App Password + `SMTP_USE_TLS=1`
- Set `APP_BASE_URL` for correct reset links

### EN content stale

Delete cache files: `legal_content_en.json`, `support_content_en.json`, `landing_content_en.json`

Or change VI content to invalidate hash.

### Guide page not updating

- Edit `web/USER_GUIDE.md` (not copy elsewhere)
- `pip install markdown`
- Hard refresh browser

### Port 5000 in use (Windows)

```powershell
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

### Google OAuth redirect mismatch

URI must match exactly — no trailing slash:

`http://localhost:5000/auth/google/callback`

### SePay payment not detected

- Transfer content must include full `transaction_id` (e.g. `TTSA1B2C3...`)
- Amount must match ≥ 99%
- Check `SEPAY_TOKEN` and webhook URL reachable

---

## 17. Checklist triển khai

- [ ] Python 3.10 + `venv310` activated
- [ ] `pip install -r requirements.txt`
- [ ] `pip install markdown` (+ `reportlab` for invoices)
- [ ] `pip install -r requirements_vixtts.txt` (Emotional TTS)
- [ ] MySQL running, `tts_system` created (5 SQL files)
- [ ] `web/.env.local` — SECRET_KEY, DB, SMTP, APP_BASE_URL
- [ ] `web/uploads/`, `web/audio_outputs/` writable
- [ ] `VieNeu-TTS-main/` sibling of `web/`
- [ ] `web/base_voice.wav` + emotion refs present
- [ ] `web/vixtts_model/` complete (if Emotional TTS)
- [ ] ffmpeg in PATH (if MP3/OGG)
- [ ] Server at `http://127.0.0.1:5000`
- [ ] Login `admin` / `admin123` — change password
- [ ] Test `POST /api/convert` with short text
- [ ] Test `/user-guide` and `/installation-guide` render MD
- [ ] (Optional) Google OAuth callback works
- [ ] (Optional) SePay webhook receives test event
- [ ] (Optional) SMTP sends test reset email
- [ ] (Optional) Flutter APK points to correct `webBaseUrl`

---

## Liên hệ kỹ thuật

| Resource | Location |
|---|---|
| User guide | `USER_GUIDE.md` / `/user-guide` |
| Support | `/support` |
| Contact form | `/contact` |

---

*© 2026 VietVoice. Tài liệu kỹ thuật nội bộ.*
