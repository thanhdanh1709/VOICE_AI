# Hướng dẫn sử dụng VietVoice

> Dành cho người dùng cuối  
> Phiên bản: Beta | Cập nhật: Tháng 6 năm 2026

---

## Mục lục

1. [Giới thiệu & yêu cầu](#1-giới-thiệu--yêu-cầu)
2. [Đăng ký, đăng nhập & bảo mật tài khoản](#2-đăng-ký-đăng-nhập--bảo-mật-tài-khoản)
3. [Giao diện & điều hướng](#3-giao-diện--điều-hướng)
4. [Workspace — Chuyển văn bản thành giọng nói](#4-workspace--chuyển-văn-bản-thành-giọng-nói)
5. [Emotional TTS (viXTTS)](#5-emotional-tts-vixtts)
6. [Điều chỉnh giọng sau TTS (RVC)](#6-điều-chỉnh-giọng-sau-tts-rvc)
7. [Xuất & tải file âm thanh](#7-xuất--tải-file-âm-thanh)
8. [Clone giọng cá nhân](#8-clone-giọng-cá-nhân)
9. [Thư viện âm thanh](#9-thư-viện-âm-thanh)
10. [Lịch sử chuyển đổi](#10-lịch-sử-chuyển-đổi)
11. [Bảng giá & hạn mức ký tự](#11-bảng-giá--hạn-mức-ký-tự)
12. [Thanh toán SePay & hóa đơn](#12-thanh-toán-sepay--hóa-đơn)
13. [Hồ sơ, avatar & xóa tài khoản](#13-hồ-sơ-avatar--xóa-tài-khoản)
14. [Hỗ trợ, liên hệ & FAQ](#14-hỗ-trợ-liên-hệ--faq)
15. [Trang pháp lý & đa ngôn ngữ](#15-trang-pháp-lý--đa-ngôn-ngữ)
16. [Ứng dụng Android](#16-ứng-dụng-android)
17. [Mẹo nâng cao](#17-mẹo-nâng cao)
18. [Xử lý lỗi thường gặp](#18-xử-lý-lỗi-thường-gặp)
19. [Chuẩn hóa văn bản (Text Normalization)](#19-chuẩn-hóa-văn-bản-text-normalization)

---

## 1. Giới thiệu & yêu cầu

VietVoice là nền tảng **Text-to-Speech (TTS)** tiếng Việt dùng AI, kết hợp VieNeu-TTS (giọng hệ thống), viXTTS (cảm xúc), RVC (điều chỉnh giọng) và clone giọng cá nhân.

### Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **TTS cơ bản** | Giọng hệ thống từ thư viện DB + giọng clone của bạn |
| **Emotional TTS** | Giọng đọc theo cảm xúc (viXTTS), tag tiếng Việt trong văn bản |
| **Voice Clone** | 3 chế độ: RVC, Zero-shot, viXTTS Clone |
| **RVC sau convert** | Pitch / Index / Protect trên file WAV đã tạo |
| **Xuất audio** | WAV, MP3, OGG — bitrate 64–320 kbps |
| **Thư viện** | Lưu, tìm, đặt tên, chia sẻ link công khai |
| **Đa ngôn ngữ** | Giao diện VI/EN; nhiều trang nội dung tự dịch |
| **Theme** | Chế độ sáng / tối (lưu `localStorage`) |

### Yêu cầu người dùng

| Mục | Chi tiết |
|---|---|
| **Trình duyệt** | Chrome, Edge, Cốc Cốc, Firefox (phiên bản mới) |
| **Kết nối** | Internet ổn định tới server VietVoice |
| **Tài khoản** | Đăng ký email hoặc Google (một email = một tài khoản) |
| **Android app** | Android 6.0+ (WebView bọc web) |

### URL mặc định (local)

| Trang | URL |
|---|---|
| Workspace (đã login) | `http://127.0.0.1:5000/` |
| Landing (chưa login) | `http://127.0.0.1:5000/landing` |
| Đăng nhập | `/login` |
| Đăng ký | `/register` |

---

## 2. Đăng ký, đăng nhập & bảo mật tài khoản

### 2.1 Đăng ký (`/register`)

**POST JSON** với các trường:

| Trường | Yêu cầu |
|---|---|
| `username` | Không trùng, không dấu |
| `email` | Hợp lệ, không trùng |
| `password` | Tối thiểu **6** ký tự |
| `full_name` | Tên hiển thị |
| `accept_terms` | **Bắt buộc** — đồng ý điều khoản |

**Sau đăng ký thành công:**

- Tạo bản ghi `user_subscriptions`: **100.000 ký tự**, thời hạn **30 ngày**
- Chuyển về trang đăng nhập

### 2.2 Đăng nhập (`/login`)

- Nhập **username hoặc email** + mật khẩu
- Hoặc **Đăng nhập với Google** (`/auth/google`)

**Tài khoản Google mới:** Tự tạo user, gán **100.000 ký tự / 30 ngày**, lưu `google_id` và avatar Google.

**Phiên đăng nhập:** Lưu **24 giờ** (`PERMANENT_SESSION_LIFETIME = 86400`).

**Tài khoản bị vô hiệu hóa / xóa:** Đăng nhập bị chặn với mã lỗi i18n (`account_deactivated_grace`, `account_deleted`, …).

### 2.3 Quên mật khẩu (`/forgot-password`)

1. Nhập email đã đăng ký → gửi yêu cầu
2. Server gửi email chứa link reset (cần **SMTP** cấu hình trên server)
3. Link có hiệu lực **1 giờ** (`PASSWORD_RESET_EXPIRY_HOURS = 1`)
4. Mở link → `/reset-password/<token>` → nhập mật khẩu mới (≥ 6 ký tự)

**Đăng nhập trên nhiều thiết bị:**

- Email có thể yêu cầu **xác nhận trên điện thoại** (`/reset-password/confirm/<token>`)
- Frontend poll trạng thái qua `/api/forgot-password/status/<wait_id>`

### 2.4 Đăng xuất

`/logout` — xóa session, chuyển về `/login`.

---

## 3. Giao diện & điều hướng

### 3.1 Sau đăng nhập — menu chính

| Mục | URL | Mô tả |
|---|---|---|
| Workspace / Tạo audio | `/` | Chuyển văn bản → giọng nói |
| Thư viện âm thanh | `/audio-library` | File đã tạo |
| Giọng của tôi | `/my-voices` | Clone giọng (9 giọng/trang) |
| Thêm giọng | `/add-voice` | Upload mẫu giọng |
| Lịch sử | `/history` | Metadata các lần convert |
| Bảng giá | `/pricing` | Mua gói ký tự |
| Hồ sơ | `/profile` | Thông tin, avatar, xóa TK |
| Liên hệ | `/contact` | Form gửi tin |
| Quản trị | `/admin` | Chỉ role `admin` |

**Mobile:** Bottom navigation + drawer — cùng các mục trên.

### 3.2 Navbar sau đăng nhập

- **Badge ký tự còn lại** — từ `/api/user/characters` hoặc `/api/subscription/status`
- **VI | EN** — `localStorage` key `language`; reload UI qua `i18n.js`
- **Theme sáng/tối** — `localStorage` key `tts-theme`
- **Avatar / menu user** — profile, logout

### 3.3 Landing Page (`/landing`)

- Trang giới thiệu cho khách chưa đăng nhập
- Đã login truy cập `/landing` → redirect `/`
- Nội dung do admin chỉnh tại **Admin → Landing Page**

---

## 4. Workspace — Chuyển văn bản thành giọng nói

Workspace là trang `/` với **3 tab nhập liệu:**

| Tab | Mô tả |
|---|---|
| **Nhập văn bản** | Gõ / paste trực tiếp |
| **Tải file lên** | TXT, PDF, DOCX |
| **Emotional TTS** | viXTTS + emotion tags |

### 4.1 Tab Nhập văn bản

1. Gõ hoặc dán văn bản — **đếm ký tự realtime**
2. Cảnh báo nếu phát hiện nhiều ký tự Latin (không phải tiếng Việt)
3. Chọn giọng trong dropdown **Giọng hệ thống** hoặc **Giọng của tôi**
4. Nhấn **Chuyển đổi ngay** → `POST /api/convert`

**Body API:**

```json
{ "text": "...", "voice_id": "Binh" }
```

hoặc `"voice_id": "custom_123"` cho giọng clone.

**Mặc định nếu không chọn:** giọng `Binh` / `BinhHM`.

### 4.2 Tab Tải file lên

| Định dạng | Xử lý |
|---|---|
| `.txt` | Đọc trong trình duyệt (client) |
| `.pdf`, `.docx` | `POST /api/upload/extract` — server trích text |

- Giới hạn cấu hình: **10 MB** (`MAX_FILE_SIZE` trong `config.py`)
- PDF scan/ảnh **không** được hỗ trợ — chỉ text layer
- Text trích xuất tự điền vào ô nhập (và tab Emotional nếu có)

### 4.3 Voice Gallery — Nghe thử giọng

- Nút **Nghe thử** mở modal `#voiceGalleryModal`
- Dữ liệu từ `GET /api/voices`
- Mỗi giọng: mô tả, vùng miền, icon giới tính
- Sample: `/static/voice-samples/{voice_id}_sample.wav` (nếu `has_sample`)
- **Chọn giọng này** → cập nhật dropdown

Admin có thể tạo sample: `POST /api/admin/generate-voice-samples`.

### 4.4 Giọng clone trong dropdown

- ID format: `custom_<id>` (id là số trong bảng `custom_voices`)
- Chỉ giọng `status = completed`
- Hiển thị **quality score** (sao) nếu có
- URL `/?custom_voice=<id>` tự chọn giọng khi mở trang

### 4.5 Hạn mức ký tự khi convert

- Mỗi lần convert trừ `len(text)` khỏi `user_subscriptions.characters_remaining` (**tính trên văn bản gốc**, không phải bản đã chuẩn hóa)
- **Không có** giới hạn cứng mỗi request — chỉ giới hạn theo gói
- Free mặc định: **100.000** ký tự / 30 ngày

### 4.6 Chuẩn hóa văn bản trước TTS (TN)

Ngay trên Studio TTS có:

- **Toggle “Chuẩn hóa văn bản (TN)”** — mặc định **bật**; preference lưu trong `user_settings.enable_text_normalization`
- **“Xem text sau chuẩn hóa”** — gọi `POST /api/text/normalize-preview` (chỉ xem, không tạo audio lần 2)

TN áp dụng cho cả 3 engine: Basic Vieneu, Emotional viXTTS, OmniVoice.

**Ví dụ chuyển đổi:**

| Trước | Sau (rút gọn) |
|---|---|
| `support@vietvoice.app` | `support a còng vietvoice chấm app` |
| `https://vietvoice-ai.online` | `h t t p s … vietvoice gạch ngang ai chấm online` |
| `Giá $100` | `giá 100 đô la` |
| `5 × 8 m²` | `5 nhân 8 mét vuông` |

Chi tiết pipeline và gap analysis: `web/docs/TEXT_NORMALIZATION_GAPS.md`.
- Hết quota → lỗi *"Bạn đã hết giới hạn ký tự..."*

### 4.6 Kết quả sau convert

- Player nghe inline — stream `GET /api/audio/<filename>`
- File lưu: `audio_outputs/{uuid}.wav`
- Bản ghi `conversions` — status `completed` / `failed`
- Ô **đặt tên audio** (`display_name`, tối đa **200** ký tự)
- Panel **Điều chỉnh giọng** (RVC) — mục 6
- Chọn **định dạng xuất** — mục 7

---

## 5. Emotional TTS (viXTTS)

Tab **Emotional TTS** — model **viXTTS** (~1.8 GB RAM khi load).

### 5.1 Kiểm tra sẵn sàng

- `GET /api/emotional-tts/status` → `{ ready, message }`
- Workspace **poll mỗi 5 giây** cho đến khi `ready = true`
- Lần đầu khởi động server: load model **30–60 giây**

### 5.2 Convert cảm xúc

`POST /api/convert-emotional`:

```json
{ "text": "...", "custom_voice_id": 123 }
```

- `custom_voice_id` (tuỳ chọn): chỉ giọng loại **viXTTS Clone**
- Không chọn → dùng ref mặc định `base_voice.wav` + ref theo cảm xúc

**Billing:** Trừ ký tự giống TTS cơ bản.

### 5.3 Emotion tags (tiếng Việt)

Hệ thống **phát hiện cảm xúc** từ tag trong ngoặc `(...)` hoặc từ khóa:

| Cảm xúc | Tag / từ khóa gợi ý | Ref audio |
|---|---|---|
| **Cheerful (Vui)** | `(tươi sáng)`, `(vui)`, `(nụ cười)`, `haha` | `cheerful_ref.wav` |
| **Excited** | `(hào hứng)`, `(phấn khích)`, `(wow)`, `tuyệt vời` | `excited_ref.wav` |
| **Calm** | `(chậm)`, `(ấm áp)`, `(nhẹ nhàng)`, `(bình tĩnh)` | `calm_ref.wav` |
| **Sad** | `(buồn)`, `(tiếc)`, `đau`, `thương` | `calm_ref.wav` |
| **Neutral** | Không tag | `base_voice.wav` |

**Cách viết nhiều cảm xúc:** Đặt tag trên **dòng riêng** trước đoạn văn:

```
(tươi sáng)
Chào buổi sáng! Hôm nay trời đẹp quá!

(buồn)
Thật tiếc vì chúng ta phải chia tay.
```

Text được **chia chunk** theo emotion — mỗi chunk synth riêng rồi ghép.

### 5.4 Dropdown giọng Emotional

- Chỉ liệt kê giọng **viXTTS Clone** (`/api/custom-voices/list` lọc type)
- Mặc định: giọng hệ thống ref

### 5.5 Lưu ý

- Emotional TTS **không** dùng panel RVC sau convert (khác pipeline)
- Voice ID lưu: `viXTTS-Emotional` hoặc `viXTTS-Emotional (tên giọng)`
- Nên dùng đoạn **< 500 ký tự** mỗi lần để ổn định

---

## 6. Điều chỉnh giọng sau TTS (RVC)

Sau **TTS cơ bản** thành công, panel **Điều chỉnh giọng nói** xuất hiện.

`POST /api/voice-conversion`:

```json
{
  "audio_filename": "abc.wav",
  "pitch": 0,
  "index_rate": 0.75,
  "protect": 0.33
}
```

| Tham số | Phạm vi | Mặc định | Ý nghĩa |
|---|---|---|---|
| `pitch` | **-12 … +12** | 0 | Cao / thấp hơn |
| `index_rate` | **0 … 1** | 0.75 | Pha trộn giọng |
| `protect` | **0 … 0.5** | 0.33 | Bảo vệ phụ âm |

**Preset nhanh trên UI:** Nam→Nữ (+8), Nữ→Nam (-8), Cao hơn (+4), Thấp hơn (-4), Reset.

- **Không trừ thêm ký tự** — chỉ xử lý lại file hiện có
- Cần RVC (`RVC_AVAILABLE`) — `GET /api/voice-conversion/check`
- Cập nhật bản ghi `conversions` với file mới

**Lưu ý:** Giọng clone loại **RVC** đã áp pitch/speed tại bước convert — panel này dùng cho output TTS hệ thống.

---

## 7. Xuất & tải file âm thanh

### 7.1 Định dạng

`GET /api/audio/formats` trả:

- `formats`: **wav**, **mp3**, **ogg**
- `bitrates`: **64, 96, 128, 192, 256, 320** kbps (mặc định **192**)
- `ffmpeg`: có / không

### 7.2 Tải xuống

`GET /api/audio/<filename>/export?format=mp3&bitrate=192`

| Format | Yêu cầu |
|---|---|
| **WAV** | Luôn hoạt động — file gốc |
| **MP3 / OGG** | Server cần **ffmpeg** trong PATH |

Nếu ffmpeg không có, UI fallback tải WAV.

### 7.3 Nghe trực tiếp

`GET /api/audio/<filename>` — yêu cầu đăng nhập, stream WAV.

---

## 8. Clone giọng cá nhân

### 8.1 Ba chế độ clone

| Loại (`voice_type`) | Thời lượng mẫu | Huấn luyện | Dùng ở |
|---|---|---|---|
| **RVC** (`rvc`) | **30 s – 15 phút** (900 s) | Background worker 1–5 phút | TTS cơ bản (base voice + pitch/speed) |
| **Zero-shot** (`zero_shot`) | **30 s – 15 phút** | Ngay lập tức (`completed`) | TTS cơ bản (ref audio + **ref_transcript**) |
| **viXTTS Clone** (`vixtts_clone`) | **6 s – 120 s** (2 phút) | Ngay lập tức | TTS cơ bản + **Emotional TTS** |

**Định dạng file mẫu:** WAV, MP3, M4A (UI); server chấp nhận thêm OGG, FLAC.

**Gợi ý chất lượng:** Phòng yên tĩnh, không nhạc nền, mic ổn định 15–20 cm; viXTTS Clone nên **10–60 giây** rõ ràng.

### 8.2 Thêm giọng (`/add-voice`)

Form gửi `POST /api/custom-voice/upload` (multipart):

| Trường | Mô tả |
|---|---|
| `voice_name` | Tên hiển thị |
| `description` | Tuỳ chọn |
| `audio_file` | File mẫu |
| `voice_type` | `rvc` / `zero_shot` / `vixtts_clone` |
| `base_voice_id` | RVC: giọng nền (mặc định `ly`) |
| `pitch_adjustment` | RVC: int |
| `speed_adjustment` | RVC: float (mặc định 1.0) |
| `energy_adjustment` | RVC: float (mặc định 1.0) |
| `ref_transcript` | **Bắt buộc** với Zero-shot — văn bản khớp audio |

**viXTTS Clone:** Cần Emotional TTS model sẵn sàng trên server.

### 8.3 Quản lý giọng (`/my-voices`)

- **9 giọng / trang**, phân trang URL `?page=`
- **Kiểm tra:** `POST /api/custom-voice/<id>/test` — text test tối đa **300** ký tự
- **Tiến trình RVC:** `GET /api/custom-voice/<id>/progress` — `status`, `progress`, `error`
- **Xóa:** `DELETE /api/custom-voice/<id>/delete`
- Trạng thái: `pending` → `processing` → `completed` / `failed`

### 8.4 Dùng giọng clone

- Dropdown Workspace: prefix `custom_<id>`
- Emotional: chỉ `vixtts_clone` trong dropdown riêng
- Usage được ghi `voice_usage_logs`

---

## 9. Thư viện âm thanh

**Trang:** `/audio-library`  
**API:** `GET /api/audio-library`

### 9.1 Tham số lọc

| Param | Mặc định | Mô tả |
|---|---|---|
| `page` | 1 | Trang |
| `per_page` | **12** | Số item |
| `search` | — | Tìm trong `text_input` hoặc `display_name` |
| `voice` | — | Lọc `voice_id` |
| `date_from`, `date_to` | — | Khoảng ngày |
| `sort_by` | `newest` | `newest`, `oldest`, `duration`, `size` |

### 9.2 Thao tác

| Thao tác | API | Chi tiết |
|---|---|---|
| Phát lại | `/api/audio/<filename>` | Stream WAV |
| Tải về | Export API | WAV/MP3/OGG |
| Đặt tên | `PATCH /api/audio-library/<id>/rename` | `display_name` ≤ **200** ký tự |
| Chia sẻ | `POST /api/audio-library/<id>/share` | Bật/tắt `is_public` + `share_token` |
| Xóa | `DELETE /api/audio-library/<id>` | Xóa file + DB |

### 9.3 Chia sẻ công khai

- Link trang: `/audio/share/<token>` (32 ký tự URL-safe)
- API file: `GET /api/audio/share/<token>` — **không** cần login
- Thu hồi: tắt share hoặc xóa file

---

## 10. Lịch sử chuyển đổi

**Trang:** `/history`  
**API:** `GET /api/history?page=1&per_page=10&search=`

| Hiển thị | Ghi chú |
|---|---|
| Tổng số lần convert | |
| Trạng thái | `completed`, `processing`, `failed`, `pending` |
| Nội dung rút gọn | `text_input` |
| Giọng, số ký tự, thời gian | |
| Tìm kiếm | Theo nội dung văn bản |

- Mặc định **10** bản ghi / trang
- **Không** lưu file audio trong lịch sử — dùng Thư viện để tải lại WAV

---

## 11. Bảng giá & hạn mức ký tự

**Trang:** `/pricing` (yêu cầu login)  
**API gói:** `GET /api/packages`

### 11.1 Gói mặc định (có thể thay bằng Admin)

| Gói | Ký tự | Giá (VND) | Thời hạn |
|---|---|---|---|
| Free Plan | 100.000 | 0 | 30 ngày |
| Basic Plan | 1.500.000 | 500.000 | 30 ngày |
| Standard Plan | 4.000.000 | 1.000.000 | 30 ngày |
| Premium Plan | 10.000.000 | 2.000.000 | 30 ngày |
| Enterprise Plan | 27.000.000 | 5.000.000 | 30 ngày |

Admin chỉnh gói: **Admin → Cấu hình Site → Gói cước** hoặc API `/api/admin/packages`.

### 11.2 Cách tính hạn mức

- **Đăng ký / Google mới:** 100.000 ký tự, 30 ngày
- **Mua gói:** Cộng `characters_limit` gói vào subscription; gia hạn `end_date` thêm `duration_days`
- **Hiển thị:** Navbar badge + Profile + `GET /api/user/characters`

### 11.3 Lịch sử thanh toán cá nhân

`GET /api/user/payments?page=1&per_page=8` (per_page 5–50)

---

## 12. Thanh toán SePay & hóa đơn

### 12.1 Luồng thanh toán

1. `/pricing` → chọn gói → **Nâng cấp**
2. `POST /api/payment/create` `{ "package_id": N }`
3. Tạo `payments` — status `pending`, `transaction_id` = **`TTS` + 16 ký tự hex** (VD: `TTSA1B2C3D4E5F67890`)
4. Chuyển tới `/payment/confirm?id=<payment_id>` — hiển thị **QR VietQR**
5. Chuyển khoản ngân hàng — **nội dung CK phải chứa `transaction_id`**
6. Xác nhận qua:
   - Webhook SePay: `POST /api/payment/sepay/webhook`
   - Polling frontend: `GET /api/payment/status/<payment_id>` (~5 giây)
7. Thành công → cập nhật subscription ngay

**Khớp giao dịch SePay:** Nội dung chứa mã + số tiền ≥ **99%** số tiền gói.

**Timeout SePay:** `SEPAY_TIMEOUT` mặc định **300 giây** (5 phút).

### 12.2 Lưu ý chuyển khoản

- **Sai nội dung** → hệ thống không tự nhận
- Chờ quá **10 phút** → liên hệ support + ảnh biên lai + `transaction_id`

### 12.3 Hóa đơn PDF

Sau thanh toán thành công: tải **`/invoice/<payment_id>`**  
File: `VietVoice_Invoice_VV-{id:05d}.pdf` (reportlab).

---

## 13. Hồ sơ, avatar & xóa tài khoản

**Trang:** `/profile`

### 13.1 Thông tin & avatar

| Thao tác | API / giới hạn |
|---|---|
| Cập nhật họ tên | `POST /api/user/update-profile` |
| Upload avatar | `POST /api/user/upload-avatar` — JPG/PNG/WebP, max **2 MB** → `/uploads/avatars/user_{id}.ext` |
| Đổi mật khẩu | `POST /api/user/change-password` — MK cũ + mới ≥ **6** ký tự |
| Thống kê | Tổng convert, ký tự đã dùng |
| Gói hiện tại | Tên gói, hết hạn, ký tự còn lại |

### 13.2 Yêu cầu xóa tài khoản

1. `POST /api/user/request-account-deletion` — lý do tuỳ chọn (≤ **2000** ký tự)
2. `delete_status` → `pending`; email thông báo admin
3. Admin duyệt tại **Admin → Yêu cầu xóa tài khoản**

**Sau khi admin duyệt:**

- `is_active = 0`, `status = deactivated`
- **Grace period 30 ngày** (`ACCOUNT_DELETION_GRACE_DAYS`)
- Trong grace: **không đăng nhập**; có thể **khôi phục** qua form công khai
- Sau 30 ngày: `status = deleted` (vĩnh viễn)

**Khôi phục:** `POST /api/public/request-account-restore` (email) → admin **Restore** tại dashboard.

**Trạng thái:** `GET /api/user/account-deletion-status`

---

## 14. Hỗ trợ, liên hệ & FAQ

### 14.1 Trang Hỗ trợ (`/support`)

- Kênh liên hệ (icon, email, hotline)
- Hướng dẫn nhanh theo bước
- FAQ (câu hỏi + trả lời HTML)
- Nội dung từ `support_content.json` — admin chỉnh tại **Cấu hình chính sách → Hỗ trợ & FAQ**
- Chọn **EN** → nội dung dịch tự động (cache `support_content_en.json`)

### 14.2 Trang Liên hệ (`/contact`)

`POST /api/contact` — JSON:

```json
{ "name": "", "email": "", "subject": "", "message": "" }
```

- Tất cả trường bắt buộc, email hợp lệ
- Ghi log server (không lưu DB mặc định)
- Phản hồi cam kết trong **24 giờ**

Email hiển thị trên trang: từ `site_settings.json` (`support_email`, `contact_email`).

---

## 15. Trang pháp lý & đa ngôn ngữ

### 15.1 Danh sách trang

| Trang | URL |
|---|---|
| Điều khoản sử dụng | `/terms` |
| Chính sách quyền riêng tư | `/privacy` |
| Chính sách xóa dữ liệu | `/data-deletion` |
| Điều khoản thanh toán | `/payment-terms` |
| Hướng dẫn sử dụng | `/user-guide` |
| Hướng dẫn cài đặt | `/installation-guide` |

Footer website liên kết tất cả trang trên.

### 15.2 Đa ngôn ngữ (VI / EN)

- Nút **VI | EN** trên navbar
- UI: file `static/i18n/vi.json`, `en.json` + `i18n.js`
- Trang pháp lý / support / landing: `GET /api/legal/display/<key>?lang=en`, `/api/support/display`, `/api/landing/display`
- Dịch tự động: OpenAI (nếu có key) hoặc **Google fallback**
- **Không dịch** văn bản người dùng nhập cho TTS

### 15.3 Cập nhật nội dung hướng dẫn

Hai trang hướng dẫn đọc từ file Markdown trong `web/`:

- `USER_GUIDE.md` → `/user-guide`
- `INSTALLATION_GUIDE.md` → `/installation-guide`

Có thể sửa file trực tiếp hoặc **Admin → Cấu hình chính sách → tab Hướng dẫn** (editor Markdown).

---

## 16. Ứng dụng Android

Flutter WebView app (`app_web_view/`) bọc toàn bộ web.

### 16.1 Cài APK

1. Nhận `app-release.apk` từ nhà phát triển
2. Bật **Cài từ nguồn không rõ**
3. Cài và mở app

### 16.2 Cấu hình server

File `app_web_view/lib/config.dart`:

- `webBaseUrl` / `apiBaseUrl` — URL server (không dấu `/` cuối)
- Emulator: `http://10.0.2.2:5000`
- Thiết bị thật: IP LAN server (VD: `http://192.168.1.x:5000`)

### 16.3 Đăng nhập Google trên app

- OAuth qua Chrome Custom Tab
- Callback scheme: **`petai`** → `petai://callback?mobile_token=...`
- Token mobile TTL **5 phút** → `/auth/mobile/callback`

### 16.4 Tính năng

- Giống trình duyệt web đầy đủ
- `usesCleartextTraffic="true"` cho HTTP local — tắt khi production HTTPS

---

## 17. Mẹo nâng cao

### 17.1 Chọn giọng theo mục đích

| Mục đích | Gợi ý |
|---|---|
| Truyện, tiểu thuyết | Giọng Nam Bắc, tốc độ chậm |
| Tin tức | Nữ miền Nam |
| Podcast sáng tạo | Emotional — Cheerful / Excited |
| Thiền, thư giãn | Emotional — Calm |
| Giọng “của tôi” | viXTTS Clone + Emotional tags |

### 17.2 Viết văn bản cho TTS

- Dấu câu đầy đủ — quyết định nhịp nghỉ
- Chia đoạn **< 2000 ký tự** mỗi request
- Số viết thành chữ khi cần phát âm đúng
- Viết tắt nên giải thích lần đầu

### 17.3 Tiết kiệm quota

- Tái dùng file Thư viện — không convert lại
- Test đoạn ngắn trước
- Đặt tên file để tìm nhanh

### 17.4 Clone giọng chất lượng

- RVC / Zero-shot: **30–60 giây** đọc đa ngữ điệu
- viXTTS Clone: **10–60 giây**, không tạp âm
- Zero-shot: `ref_transcript` phải **khớp** nội dung audio

---

## 18. Xử lý lỗi thường gặp

| Lỗi / tình huống | Nguyên nhân | Cách xử lý |
|---|---|---|
| Hết quota ký tự | `characters_remaining < len(text)` | Nâng cấp `/pricing` |
| Đang tải model Emotional | viXTTS chưa `ready` | Chờ 30–60s; xem `/api/emotional-tts/status` |
| Server không phản hồi | Flask chưa chạy / mạng | Kiểm tra `http://127.0.0.1:5000` |
| Upload file text lỗi | > 10 MB hoặc sai định dạng | Dùng TXT hoặc chia nhỏ |
| PDF không có text | PDF scan/ảnh | OCR ngoài hoặc copy thủ công |
| Clone RVC failed | Audio < 30s hoặc nhiễu | Ghi lại 30–60s, yên tĩnh |
| viXTTS Clone quá ngắn/dài | Ngoài 6–120s | Cắt/chỉnh file mẫu |
| Zero-shot lỗi | Thiếu `ref_transcript` | Nhập transcript khớp audio |
| Không nhận gói sau CK | Sai nội dung CK | Gửi support: `transaction_id` + ảnh |
| Không nhận email reset MK | SMTP chưa cấu hình | Liên hệ admin |
| RVC panel không hiện | `RVC_AVAILABLE = false` | Liên hệ admin cài RVC/faiss |
| MP3/OGG không tải | Không có ffmpeg | Tải WAV hoặc admin cài ffmpeg |
| Đăng nhập bị chặn grace | TK đang xóa 30 ngày | Form khôi phục hoặc liên hệ admin |
| EN không hiển thị | Cache / API dịch lỗi | Chuyển VI; admin kiểm tra OpenAI |

---

## Liên hệ

| Kênh | URL |
|---|---|
| Hỗ trợ & FAQ | `/support` |
| Liên hệ | `/contact` |
| Hướng dẫn kỹ thuật | `/installation-guide` |

Email hiển thị trên website do admin cấu hình (**Cấu hình Site → Email**).

---

## 19. Chuẩn hóa văn bản (Text Normalization)

### Pipeline

```
Văn bản gốc → URL → Email → Toán học → Core (số, tiền, SĐT, ngày giờ, đơn vị) → TTS
```

### Admin

Tại **Cấu hình Site → Chuẩn hóa văn bản** có thể bật/tắt từng nhóm rule và chạy bộ test 40 câu (phục vụ đánh giá luận ván).

### So sánh có / không TN (luận ván)

1. Ghi **cùng văn bản**, **cùng giọng**, một lần TN bật và một lần tắt
2. Ghi nhận WER hoặc điểm cảm nhận ( MOS / 1–5 )
3. Bảng ví dụ lưu trong `web/docs/TEXT_NORMALIZATION_GAPS.md`

---

*© 2026 VietVoice. Tài liệu dành cho người dùng cuối.*
