# Thứ tự tạo database TTS System

Chạy các file SQL **theo đúng thứ tự** dưới đây (trong phpMyAdmin tab SQL hoặc MySQL command line).

---

## 1. Tạo database và bảng nền

**File:** `tts_database.sql`

- Tạo database `tts_system` (xóa cũ nếu có)
- Tạo bảng: `users`, `conversions`, `voices`, `sessions`, `statistics`
- Chèn dữ liệu mẫu: danh sách giọng (Bình, Tuyên, Ly, …) và tài khoản admin

---

## 2. Bảng Custom Voices

**File:** `custom_voices_schema.sql`

- Tạo bảng: `custom_voices`, `training_queue`, `voice_usage_logs`
- Phụ thuộc: bảng `users` đã có (từ bước 1)

---

## 3. Bảng thanh toán

**File:** `payment_schema.sql`

- Tạo bảng: `subscription_packages`, `user_subscriptions`, `payments`
- Chèn các gói: Free, Basic, Standard, Premium, Enterprise
- Phụ thuộc: bảng `users` đã có (từ bước 1)

---

## 4. Cột V2 cho Custom Voices (giọng nền + pitch/speed)

**File:** `custom_voices_update_v2.sql`

- Thêm cột: `base_voice_id`, `pitch_adjustment`, `speed_adjustment`, `energy_adjustment`
- Dùng cú pháp `ADD COLUMN IF NOT EXISTS` (MySQL 8.0.12+)

**Nếu MySQL báo lỗi** (phiên bản cũ không hỗ trợ `IF NOT EXISTS`):  
dùng file `custom_voices_add_v2_columns.sql` thay thế. Nếu báo “Duplicate column” với cột nào thì bỏ qua dòng ALTER của cột đó.

---

## 5. Cột Zero-shot

**File:** `custom_voices_zero_shot.sql`

- Thêm cột: `voice_type`, `ref_transcript`
- Cần cho tính năng giọng Zero-shot (clone từ mẫu + transcript)

---

## Tóm tắt thứ tự

| Bước | File | Nội dung chính |
|------|------|----------------|
| 1 | `tts_database.sql` | DB + users, conversions, voices, sessions, statistics |
| 2 | `custom_voices_schema.sql` | custom_voices, training_queue, voice_usage_logs |
| 3 | `payment_schema.sql` | subscription_packages, user_subscriptions, payments |
| 4 | `custom_voices_update_v2.sql` | base_voice_id, pitch/speed/energy_adjustment |
| 5 | `custom_voices_zero_shot.sql` | voice_type, ref_transcript |

---

## Tạo tài khoản admin (nếu cần)

Sau khi chạy xong, đăng nhập với tài khoản mặc định:

- **Username:** `admin`
- **Password:** `admin123` (nếu chưa đổi trong `tts_database.sql`)

Hoặc chạy script: `create_admin.py` (sửa thông tin DB trong file trước khi chạy).
