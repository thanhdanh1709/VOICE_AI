# Công nghệ & Tích hợp sử dụng trong dự án VietVoice AI

Bảng dưới liệt kê toàn bộ công nghệ, thư viện và dịch vụ bên thứ ba mà **VietVoice AI** sử dụng —
kèm vai trò và nơi cấu hình (nếu có).

---

## 1. Nền tảng & Backend

| Công nghệ | Phiên bản / Ghi chú | Vai trò trong dự án |
|---|---|---|
| Python | 3.10 | Ngôn ngữ chính |
| Flask | 3.0.0 (`requirements.txt`) | Web framework, routing, template |
| Werkzeug | 3.0.1 | HTTP utilities, hash mật khẩu, upload file |
| Gunicorn | 21.2.0 | WSGI server production (`--workers 1` để viXTTS giữ nguyên trong RAM) |
| PyMySQL | 1.1.0 | Driver Python ↔ MySQL (raw SQL, DictCursor) |
| Authlib | ≥1.3.0 | Client OAuth Flask, metadata Google OIDC |
| Pillow | ≥10.0.0 | Xử lý ảnh (avatar, QR, thumbnail) |
| requests | ≥2.31.0 | HTTP client (gọi SePay API, VietQR) |
| PyPDF2 | 3.0.1 | Trích xuất văn bản từ PDF |
| python-docx | 1.1.0 | Trích xuất văn bản từ DOCX |
| qrcode[pil] | 7.4.2 | Sinh mã QR thanh toán |
| ProxyFix (Werkzeug) | — | Đọc header HTTPS/host từ ngrok / Nginx reverse proxy |
| Jinja2 (kèm Flask) | — | Template HTML server-side |

**File liên quan:** `app.py`, `config.py`, `requirements.txt`

---

## 2. Cơ sở dữ liệu

| Công nghệ | Vai trò | Cấu hình |
|---|---|---|
| MySQL 8.0+ | Database chính (`utf8mb4_unicode_ci`) | `.env.local` → `DB_HOST`, `DB_PORT`, `DB_NAME` |
| PyMySQL | Driver Python ↔ MySQL | `requirements.txt` |
| Bảng `users` | Tài khoản người dùng, vai trò, Google OAuth | `database/tts_database.sql` |
| Bảng `conversions` | Lịch sử chuyển đổi TTS, file audio | `database/tts_database.sql` |
| Bảng `voices` | Danh sách giọng đọc hệ thống | `database/tts_database.sql` |
| Bảng `sessions` | Phiên đăng nhập lưu DB | `database/tts_database.sql` |
| Bảng `statistics` | Thống kê lượt sử dụng | `database/tts_database.sql` |
| Bảng `subscription_packages`, `user_subscriptions` | Gói thuê bao & hạn mức ký tự | `database/payment_schema.sql` |
| Bảng `payments` | Lịch sử thanh toán | `database/payment_schema.sql` |
| Bảng `custom_voices`, `training_queue`, `voice_usage_logs` | Clone giọng cá nhân & hàng đợi training | `database/custom_voices_schema.sql` |

**File liên quan:** `database/tts_database.sql`, `database/payment_schema.sql`, `database/custom_voices_schema.sql`, `database/THU_TU_TAO_DATABASE.md`

---

## 3. Giao diện người dùng (Frontend)

| Công nghệ | Nguồn | Vai trò |
|---|---|---|
| HTML / CSS / JavaScript thuần | `templates/`, `static/` | Workspace, landing, admin, các trang chức năng |
| Jinja2 (kèm Flask) | — | Template server-side render |
| Google Fonts | CDN | Font Inter cho toàn bộ giao diện |
| Custom CSS Design System | `static/css/` | `variables.css`, `base.css`, `components.css`, `style.css`, `mobile_app.css` |
| i18n tự viết | `static/js/i18n.js` | Song ngữ Việt/Anh — toggle VI \| EN |
| Dark/Light Theme | `localStorage` (`tts-theme`) | Chủ đề tối/sáng |
| Fetch API (vanilla JS) | `static/js/` | Gọi API không cần React/Vue |

**File liên quan:** `templates/base.html`, `templates/landing.html`, `templates/index.html`, `static/js/index.js`, `static/js/i18n.js`, `landing_content.json`

---

## 4. Trí tuệ nhân tạo (AI / Mô hình TTS)

| Công nghệ | Vai trò | Ghi chú |
|---|---|---|
| **VieNeu-TTS** (`pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf`) | TTS cơ bản — tiếng Việt đa vùng miền, nhanh, tối ưu CPU | Preset voices: Bình, Tuyên, Vĩnh, Đoan, Ly, Ngọc… |
| **viXTTS** (`capleaf/viXTTS`) | Emotional TTS — giọng nói cảm xúc (vui, buồn, hào hứng, bình thản) | HuggingFace Hub, ~1.8 GB, cần RAM 3–4 GB |
| **Coqui TTS / XTTS-v2** (`coqui/XTTS-v2`) | Backbone cho viXTTS (speakers weights) | `TTS>=0.22.0` |
| **RVC** (Retrieval-based Voice Conversion) | Chuyển đổi giọng sau TTS, điều chỉnh pitch/timbre | `tool/Retrieval-based-Voice-Conversion-develop/` |
| Zero-shot Voice Clone | Clone giọng không cần training — dùng ref audio + transcript | `custom_voices.voice_type = 'zero_shot'` |
| RVC Voice Training | Training mô hình giọng riêng từ dữ liệu người dùng (background worker) | `voice_training.py`, `background_worker.py` |
| vinorm | Chuẩn hóa văn bản tiếng Việt trước khi TTS | `requirements_vixtts.txt` |
| underthesea | NLP tiếng Việt (tách từ, phân tích văn bản) | `requirements_vixtts.txt` |

**File liên quan:** `app.py` (route `/api/convert`, `/api/convert-emotional`, `/api/voice-conversion`), `emotional_tts_vixtts.py`, `rvc_wrapper.py`, `voice_training.py`, `background_worker.py`, `VieNeu-TTS-main/vieneu/core.py`

> 💡 Hệ thống hỗ trợ đồng thời cả ba engine TTS; người dùng chọn giọng và chế độ khi chuyển đổi.

---

## 5. Xử lý văn bản & Audio

| Công nghệ | Vai trò | Ghi chú |
|---|---|---|
| PyPDF2 | Trích xuất văn bản từ PDF | `requirements.txt` |
| python-docx | Trích xuất văn bản từ DOCX | `requirements.txt` |
| ffmpeg | Chuyển đổi định dạng audio WAV → MP3 / OGG | Cài hệ thống, gọi qua subprocess |
| pydub | Xử lý audio Python (ghép, cắt, điều chỉnh tốc độ) | `requirements_vixtts.txt` |
| librosa | Fallback pitch-shift khi RVC không khả dụng | `VieNeu-TTS-main/requirements.txt` |
| torch / torchaudio | Deep learning runtime cho viXTTS & VieNeu | `torch>=2.0.0`, tùy chọn GPU (CUDA) |
| VietnameseTTSNormalizer | Chuẩn hóa text trước khi đưa vào mô hình | Tự viết trong `emotional_tts_vixtts.py` |

**File liên quan:** `app.py` (route `/api/upload/extract`, `/api/audio/<filename>/export`), `audio_export.py`, `audio_processor.py`, `emotional_tts_vixtts.py`

---

## 6. Xác thực & Bảo mật

| Công nghệ | Loại | Vai trò | Cấu hình |
|---|---|---|---|
| Đăng nhập email/mật khẩu | Nội bộ | Werkzeug `generate_password_hash` / `check_password_hash` (scrypt) | — |
| Flask Session | Nội bộ | Cookie phiên (`user_id`, `username`, `user_role`, `full_name`) | `SECRET_KEY` trong `.env.local` |
| Google OAuth 2.0 / OpenID Connect | Bên thứ ba | Đăng nhập bằng tài khoản Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Authlib | Thư viện | Client OAuth Flask, metadata Google OIDC | — |
| `@login_required` | Nội bộ | Decorator bảo vệ route | `app.py` |
| `is_admin()` | Nội bộ | Kiểm tra quyền admin | `app.py` |
| Mobile OAuth bridge | Nội bộ | One-time token → deep link `petai://callback` (Flutter) | `_mobile_tokens` dict |

**File liên quan:** `app.py` (`/auth/google`, `/auth/mobile/callback`, `/login`, `/register`), `templates/login.html`, `templates/register.html`

---

## 7. Email (SMTP)

| Công nghệ | Vai trò | Cấu hình |
|---|---|---|
| smtplib (Python chuẩn) | Gửi email qua SMTP TLS | `.env.local` → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| Gmail / Outlook / SMTP riêng | Nhà cung cấp mail | Server, Port (587), User, App Password |

Dùng cho: quên mật khẩu, thông báo đơn hàng.

**File liên quan:** `app.py` → hàm gửi email

---

## 8. Thanh toán & Gói thuê bao

| Công nghệ | Loại | Vai trò | Cấu hình |
|---|---|---|---|
| Chuyển khoản ngân hàng (thủ công) | Nội bộ | Tạo đơn pending, admin duyệt hoặc chờ webhook | `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`, `BANK_BRANCH` (mặc định MBBank) |
| VietQR (`img.vietqr.io`) | API ảnh QR | Hiển thị mã QR chuyển khoản | BIN ngân hàng + số TK |
| SePay | Bên thứ ba | Webhook tự động xác nhận chuyển khoản, cộng ký tự | `SEPAY_API_URL`, `SEPAY_TOKEN` |
| `qrcode[pil]` | Thư viện Python | Sinh QR code thanh toán | `requirements.txt` |

**Luồng ký tự:** `payments` → `status=paid` → `user_subscriptions.characters_remaining` tăng theo gói.

**Gói thuê bao mặc định:**

| Gói | Ký tự/tháng | Giá (VND) |
|---|---|---|
| Free | 100.000 | 0 |
| Basic | 1.500.000 | 500.000 |
| Standard | 4.000.000 | 1.000.000 |
| Premium | 10.000.000 | 2.000.000 |
| Enterprise | 27.000.000 | 5.000.000 |

**File liên quan:** `app.py` (`/api/payment/create`, `/api/payment/sepay/webhook`, `/api/payment/status/<id>`), `database/payment_schema.sql`, `auto_approve_payments.py`

---

## 9. Quản trị & Cấu hình hệ thống

| Thành phần | Vai trò |
|---|---|
| Admin Panel (`/admin`) | Dashboard, quản lý user, giao dịch, thống kê, phản hồi, cài đặt |
| `.env.local` | DB URI, secret key, OAuth, SePay, SMTP (không commit Git) |
| `config.py` | Đọc biến môi trường, cấu hình app |
| `database/create_admin.py` | Tạo tài khoản admin CLI |
| `database/RUN_ALL_CREATE_DATABASE.bat` | Script tạo toàn bộ schema tự động |
| `landing_content.json` | Nội dung landing page — chỉnh qua Admin Landing |
| `auto_approve_payments.py` | Script tự động duyệt thanh toán |
| `start_server.bat`, `start_web.bat` | Script khởi động server |

---

## 10. Ứng dụng di động (Mobile)

| Công nghệ | Phiên bản / Ghi chú | Vai trò |
|---|---|---|
| Flutter | SDK ^3.10.7 | Framework ứng dụng di động cross-platform |
| webview_flutter | ^4.10.0 | Nhúng toàn bộ web app vào native shell |
| flutter_web_auth_2 | ^4.0.0 | Google OAuth qua Chrome Custom Tab |
| http | ^1.2.0 | HTTP client Flutter |
| shared_preferences | ^2.3.0 | Lưu trữ local (token, cài đặt) |
| Deep link scheme | `petai://callback` | Nhận callback OAuth từ trình duyệt |

**File liên quan:** `app_web_view/lib/main.dart`, `app_web_view/lib/config.dart`, `app_web_view/pubspec.yaml`

---

## 11. Triển khai & Môi trường dev

| Công nghệ | Vai trò |
|---|---|
| Git / GitHub | Quản lý mã nguồn |
| Gunicorn | Chạy production (`--workers 1`, giữ viXTTS trong RAM) |
| Nginx / Apache | Reverse proxy tới Flask port 5000 (`apache_config.conf`) |
| ngrok | Expose localhost ra HTTPS (test OAuth mobile, demo) |
| Python venv | Môi trường ảo `venv310` (Python 3.10) |
| ffmpeg | Cần cài hệ thống (convert audio) |
| GPU CUDA (tùy chọn) | Tăng tốc viXTTS ~5× so với CPU |

**Yêu cầu hệ thống tối thiểu:**
- Python 3.10 · MySQL 8.0+ · ffmpeg
- RAM: 4 GB (min), 8 GB+ (khuyến nghị cho viXTTS)
- GPU: tùy chọn, CUDA giảm thời gian inference viXTTS đáng kể

---

## 12. Tóm tắt — Cấu hình qua `.env.local`

| Nhóm | Biến môi trường | Dịch vụ |
|---|---|---|
| Database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL |
| Bảo mật | `SECRET_KEY` | Flask Session |
| OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 |
| Thanh toán | `SEPAY_API_URL`, `SEPAY_TOKEN` | SePay |
| Ngân hàng | `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`, `BANK_BRANCH` | VietQR / Chuyển khoản |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Gmail / SMTP |

> 💡 **Nguyên tắc cấu hình:** tất cả secret và tích hợp được khai báo trong `.env.local` (không commit Git); runtime sử dụng `config.py` đọc biến môi trường. Không hardcode trong mã nguồn.

---

## Kiến trúc tổng quan

```
Clients                 Backend (Flask :5000)          AI Engines
─────────               ────────────────────           ──────────
Web Browser  ──────►    app.py                ──────►  VieNeu-TTS (CPU)
Flutter App  ──────►    ├── Auth (Session +             viXTTS / XTTS (Emotional)
                        │   Google OAuth)               RVC (Voice Conversion)
                        ├── SePay + VietQR              background_worker (Training)
                        └── Admin Panel
                               │
                        MySQL (tts_system)     HuggingFace Hub
                        ├── users                (models download)
                        ├── conversions
                        ├── custom_voices
                        └── payments
```

---

*VietVoice AI — Beta, tháng 6/2026*  
*Công ty TNHH Một Thành Viên Công Nghệ Kỹ Thuật Tiên Phong · MST: 1801526082*
