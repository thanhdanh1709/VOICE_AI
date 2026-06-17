# Hướng dẫn sử dụng VietVoice

> **VietVoice** — Nền tảng chuyển văn bản thành giọng nói AI tiếng Việt  
> Phiên bản: Beta | Cập nhật: Tháng 6/2026

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Đăng ký & Đăng nhập](#2-đăng-ký--đăng-nhập)
3. [Workspace — Chuyển văn bản thành giọng nói](#3-workspace--chuyển-văn-bản-thành-giọng-nói)
4. [Emotional TTS — Giọng đọc cảm xúc](#4-emotional-tts--giọng-đọc-cảm-xúc)
5. [Điều chỉnh giọng (RVC)](#5-điều-chỉnh-giọng-rvc)
6. [Clone giọng cá nhân](#6-clone-giọng-cá-nhân)
7. [Thư viện âm thanh (Library)](#7-thư-viện-âm-thanh-library)
8. [Lịch sử chuyển đổi (History)](#8-lịch-sử-chuyển-đổi-history)
9. [Hồ sơ & Quota ký tự](#9-hồ-sơ--quota-ký-tự)
10. [Bảng giá & Nâng cấp](#10-bảng-giá--nâng-cấp)
11. [Thanh toán qua SePay](#11-thanh-toán-qua-sepay)
12. [Ứng dụng di động](#12-ứng-dụng-di-động)
13. [Mẹo sử dụng](#13-mẹo-sử-dụng)
14. [Xử lý lỗi thường gặp](#14-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng quan hệ thống

VietVoice chuyển văn bản tiếng Việt thành giọng nói tự nhiên bằng AI. Các trang chính sau khi đăng nhập:

| Trang | Đường dẫn | Chức năng |
|---|---|---|
| **Workspace** | `/` | TTS cơ bản + Emotional TTS |
| **Giọng của tôi** | `/my_voices` | Quản lý giọng clone |
| **Library** | `/audio_library` | Thư viện file âm thanh |
| **History** | `/history` | Lịch sử chuyển đổi |
| **Pricing** | `/pricing` | Bảng giá & nâng cấp |
| **Hồ sơ** | `/profile` | Thông tin tài khoản |
| **Liên hệ** | `/contact` | Form hỗ trợ |

Giao diện hỗ trợ **song ngữ Việt / Anh** — nhấn nút **VI | EN** trên thanh điều hướng để chuyển đổi.

---

## 2. Đăng ký & Đăng nhập

### 2.1 Đăng ký tài khoản mới

1. Truy cập trang **Landing** (`/landing`) hoặc nhấn **Bắt đầu miễn phí**
2. Điền thông tin:
   - **Họ và tên** *(bắt buộc)*
   - **Tên đăng nhập** *(bắt buộc, không dấu, không khoảng trắng)*
   - **Email** *(bắt buộc)*
   - **Mật khẩu** *(tối thiểu 6 ký tự)*
3. Nhấn **Đăng ký**

> Mỗi email chỉ đăng ký được một tài khoản.

### 2.2 Đăng nhập

- **Tài khoản thường:** Tên đăng nhập + mật khẩu
- **Google:** Nhấn **Đăng nhập với Google** → chọn tài khoản → tự động tạo hoặc đăng nhập

### 2.3 Quên mật khẩu

Hệ thống **chưa có** chức năng tự đặt lại mật khẩu. Liên hệ hỗ trợ qua:

- Trang **Liên hệ** (`/contact`)
- Email: **danhvt388@gmail.com**
- Hotline: **0866 005 541**

---

## 3. Workspace — Chuyển văn bản thành giọng nói

### 3.1 Giao diện

Workspace gồm hai khu vực:

- **Trái:** Nhập văn bản, chọn giọng, chuyển đổi
- **Phải:** Kết quả âm thanh, đặt tên file, tải về, điều chỉnh RVC

Có hai tab: **TTS Cơ bản** và **Emotional TTS**.

### 3.2 Các bước TTS cơ bản

**Bước 1 — Nhập văn bản**
- Gõ hoặc dán văn bản vào ô nhập
- Số ký tự còn lại hiển thị ở thanh điều hướng (badge ⚡)
- Tải file **TXT / PDF / DOCX** bằng nút **Tải file**

**Bước 2 — Chọn giọng đọc**
- Dropdown **Chọn giọng đọc** gồm:
  - **Giọng hệ thống:** Bình, Tuyên, Vĩnh, Đoan, Ly, Ngọc…
  - **Giọng cá nhân:** Giọng bạn đã tạo tại *Giọng của tôi*
- Nhấn **Nghe thử** để nghe preview trước khi chuyển đổi

**Bước 3 — Chuyển đổi**
- Nhấn **Chuyển đổi ngay**
- Thời gian xử lý: vài giây đến vài chục giây tuỳ độ dài văn bản
- Kết quả hiện bên phải với trình phát âm thanh

**Bước 4 — Đặt tên & tải về**
- Sau khi chuyển đổi thành công, nhập tên tùy chọn (VD: *Bài thuyết trình Q3*) → **Lưu tên**
- Nhấn **Tải xuống** để lưu file WAV
- Nhấn biểu tượng **Library** để mở thư viện âm thanh

> **Lưu ý:** Workspace **không có** thanh trượt tốc độ hay âm lượng khi chuyển đổi. Điều chỉnh cao độ giọng thực hiện **sau khi** có file âm thanh qua panel RVC (mục 5).

### 3.3 Định dạng file đầu vào

| Định dạng | Mô tả |
|---|---|
| `.txt` | Văn bản thuần |
| `.pdf` | Chỉ đọc được text (không OCR ảnh) |
| `.docx` | Microsoft Word |

---

## 4. Emotional TTS — Giọng đọc cảm xúc

Emotional TTS dùng mô hình **viXTTS** — giọng thay đổi cảm xúc theo nội dung văn bản.

### 4.1 Cách sử dụng

1. Trong Workspace, chọn tab **Emotional TTS**
2. Chọn **giọng đọc Emotional** (chỉ hỗ trợ giọng **viXTTS Clone** — tạo tại *Thêm giọng mới*)
3. Nhập văn bản kèm **emotion tags** trong ngoặc
4. Nhấn **Chuyển đổi với cảm xúc**

### 4.2 Emotion tags (không phải nút bấm)

AI đọc theo tag bạn chèn trực tiếp vào văn bản:

| Nhóm cảm xúc | Ví dụ tags |
|---|---|
| Vui / Cheerful | `(tươi sáng)`, `(nụ cười)`, `(vui vẻ)` |
| Phấn khích | `(hào hứng)`, `(wow)` |
| Bình tĩnh | `(chậm)`, `(ấm áp)`, `(nhẹ nhàng)` |
| Buồn | `(buồn)`, `(tiếc thương)` |

**Ví dụ:**
```
(tươi sáng) Xin chào các bạn! Hôm nay là một ngày tuyệt vời.
(buồn) Nhưng đôi khi chúng ta cũng cần một chút im lặng.
```

### 4.3 Yêu cầu

- Cần đăng nhập
- Server phải có mô hình viXTTS (`vixtts_model/`) — trạng thái hiển thị khi khởi động server
- Nên dùng đoạn văn ngắn (< 500 ký tự) để kết quả tốt nhất

---

## 5. Điều chỉnh giọng (RVC)

Sau khi TTS hoàn tất, panel **Điều chỉnh giọng nói** xuất hiện bên phải Workspace.

### 5.1 Các thông số

| Thông số | Mô tả |
|---|---|
| **Cao độ (Pitch)** | -12 đến +12 (âm thấp hơn ↔ cao hơn) |
| **Độ pha trộn (Index Rate)** | Mức độ áp dụng model RVC |
| **Bảo vệ phụ âm (Protect)** | Giữ phụ âm tự nhiên |

### 5.2 Cài đặt nhanh

Các preset có sẵn: **Nam→Nữ**, **Nữ→Nam**, **Cao hơn**, **Thấp hơn**, **Reset**

Nhấn **Áp dụng hiệu ứng** → chờ xử lý → nghe lại và tải file mới.

---

## 6. Clone giọng cá nhân

Trang **Giọng của tôi** (`/my_voices`) cho phép tạo giọng đọc từ mẫu âm thanh của bạn.

### 6.1 Yêu cầu file mẫu

| Tiêu chí | Yêu cầu |
|---|---|
| **Định dạng** | WAV, MP3, M4A |
| **Thời lượng** | 6 giây – 2 phút (tối ưu 10–60 giây) |
| **Chất lượng** | Phòng yên tĩnh, ít tạp âm |
| **Dung lượng** | Tối đa 10 MB |

### 6.2 Ba loại giọng

| Loại | Mô tả |
|---|---|
| **RVC** | Huấn luyện model RVC từ mẫu giọng |
| **Zero-shot** | Clone từ mẫu + transcript (bản ghi nội dung đọc) |
| **viXTTS Clone** | Dùng cho Emotional TTS — cần file rõ, 10–60 giây |

### 6.3 Các bước

1. Vào **Giọng của tôi** → **Thêm giọng mới**
2. Đặt tên giọng
3. Tải lên file âm thanh mẫu
4. Chọn loại giọng (RVC / Zero-shot / viXTTS Clone)
5. Chờ xử lý — giọng xuất hiện trong dropdown Workspace khi hoàn tất

### 6.4 Mẹo chất lượng cao

- Đọc đa dạng ngữ điệu: câu hỏi, khẳng định, cảm thán
- Tránh nhạc nền, tiếng ồn, gió
- Giữ khoảng cách micro ổn định (15–20 cm)

---

## 7. Thư viện âm thanh (Library)

Trang **Library** (`/audio_library`) lưu tất cả file âm thanh đã tạo.

### 7.1 Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Xem dạng lưới / danh sách** | Chuyển đổi bằng nút Lưới / Danh sách |
| **Nghe lại** | Phát trực tiếp trong thư viện |
| **Tải về** | Tải file WAV |
| **Đặt tên** | Đặt `display_name` cho từng file (modal chỉnh sửa) |
| **Chia sẻ công khai** | Tạo link `/audio/share/<token>` — ai có link đều nghe được |
| **Tìm kiếm** | Theo nội dung văn bản hoặc tên đã đặt |
| **Lọc** | Theo giọng đọc, khoảng ngày |
| **Sắp xếp** | Mới nhất, Cũ nhất, Thời lượng, Kích thước |
| **Phân trang** | 12 file mỗi trang |
| **Xóa** | Xóa file khỏi thư viện |

### 7.2 Chia sẻ công khai

1. Nhấn **Chia sẻ** trên card audio
2. Bật chia sẻ → hệ thống tạo link dạng:
   ```
   https://your-domain.com/audio/share/abc123...
   ```
3. Sao chép link và gửi cho người khác
4. Nhấn lại để **tắt chia sẻ** — link sẽ không còn hoạt động

### 7.3 Thông tin hiển thị

Mỗi audio hiển thị: tên (nếu có), nội dung văn bản, giọng đọc, thời lượng, kích thước, ngày tạo, badge **Đã chia sẻ** (nếu public).

---

## 8. Lịch sử chuyển đổi (History)

Trang **History** (`/history`) hiển thị **bảng danh sách** các lần chuyển đổi.

### 8.1 Nội dung hiển thị

| Cột | Mô tả |
|---|---|
| ID | Mã bản ghi |
| Văn bản | Nội dung rút gọn |
| Giọng đọc | Tên giọng đã dùng |
| Trạng thái | Thành công / Chờ xử lý / Đang xử lý / Thất bại |
| Thời gian | Ngày giờ tạo |
| Thao tác | Tải xuống, Xóa |

### 8.2 Tìm kiếm & phân trang

- Tìm theo nội dung văn bản hoặc ID
- **10 bản ghi mỗi trang**
- Badge tổng số bản ghi ở góc phải thanh công cụ

> History **không có** biểu đồ thống kê hay bảng xếp hạng giọng đọc — chỉ là danh sách có tìm kiếm và phân trang.

---

## 9. Hồ sơ & Quota ký tự

### 9.1 Trang Hồ sơ (`/profile`)

Xem và cập nhật: họ tên, email, thông tin tài khoản.

### 9.2 Quota ký tự

- Badge **⚡ số ký tự còn lại** hiển thị trên thanh điều hướng (mọi trang)
- Khi gần hết (< 10.000 ký tự), hệ thống hiển thị cảnh báo
- Quota theo gói đăng ký, reset theo chu kỳ gói (thường 30 ngày)

---

## 10. Bảng giá & Nâng cấp

Trang **Pricing** (`/pricing`) hiển thị các gói từ database:

| Gói | Ký tự/tháng | Giá (VND) |
|---|---|---|
| **Free Plan** | 100.000 | Miễn phí |
| **Basic Plan** | 1.500.000 | 500.000 |
| **Standard Plan** | 4.000.000 | 1.000.000 |
| **Premium Plan** | 10.000.000 | 2.000.000 |
| **Enterprise Plan** | 27.000.000 | 5.000.000 |

Nhấn **Nâng cấp** trên gói mong muốn → chuyển sang bước thanh toán.

---

## 11. Thanh toán qua SePay

### 11.1 Quy trình

1. Chọn gói tại **Pricing** → **Nâng cấp**
2. Hệ thống hiển thị **mã QR chuyển khoản** (VietQR)
3. Mở app ngân hàng → quét QR hoặc chuyển khoản thủ công
4. **Nhập đúng nội dung chuyển khoản** hiển thị trên màn hình
5. Hệ thống tự kiểm tra mỗi ~5 giây
6. Tài khoản được nâng cấp khi giao dịch xác nhận (thường 1–5 phút)

### 11.2 Lưu ý

> **Nội dung chuyển khoản phải khớp chính xác** — đây là mã định danh giao dịch của bạn.

- Số tiền phải đúng với giá niêm yết
- Nếu chờ quá 10 phút: liên hệ qua `/contact` kèm ảnh chụp giao dịch

---

## 12. Ứng dụng di động

VietVoice có app **Flutter WebView** — bọc toàn bộ giao diện web cho màn hình điện thoại.

### 12.1 Cách cài đặt

> App **chưa có** trên Google Play hay App Store.

Để dùng trên điện thoại:

1. Developer build file **APK** từ thư mục `app_web_view/`
2. Cài APK trực tiếp trên Android (bật *Cài từ nguồn không xác định*)
3. App kết nối tới server đã cấu hình trong `lib/config.dart`

### 12.2 Đặc điểm

- Đầy đủ tính năng web (Workspace, Library, Pricing…)
- Đăng nhập Google qua Chrome Custom Tab
- Giao diện responsive cho màn hình nhỏ
- File tải về lưu trong thư mục **Downloads**

### 12.3 Lưu ý

- Cần internet ổn định
- Server phải truy cập được từ điện thoại (cùng WiFi hoặc domain public)
- iOS cần build qua Xcode trên macOS

---

## 13. Mẹo sử dụng

### 13.1 Tối ưu chất lượng giọng đọc

```
✅ Dùng dấu câu đầy đủ: phẩy, chấm, chấm than, chấm hỏi
✅ Tách đoạn dài thành nhiều phần nhỏ
✅ Viết số thành chữ: "1000" → "một nghìn"
✅ Viết tắt thành đầy đủ: "TP.HCM" → "Thành phố Hồ Chí Minh"
✅ Dùng "..." để tạo khoảng dừng dài hơn
```

### 13.2 Chọn giọng phù hợp

| Mục đích | Gợi ý |
|---|---|
| Truyện, tiểu thuyết | Giọng Nam miền Bắc (Bình, Tuyên) |
| Tin tức, báo cáo | Giọng Nữ miền Nam (Đoan) |
| Nội dung sáng tạo | Emotional TTS + tags `(tươi sáng)`, `(hào hứng)` |
| Thiền, thư giãn | Emotional TTS + tags `(nhẹ nhàng)`, `(chậm)` |

### 13.3 Tiết kiệm quota

- Dùng **Nghe thử** trước khi chuyển đổi đoạn dài
- Tải lại file từ **Library** thay vì chuyển đổi lại
- Đặt tên file ngay tại Workspace để dễ tìm sau này

---

## 14. Xử lý lỗi thường gặp

### "Không thể kết nối server"
- Kiểm tra internet
- Refresh trang (F5)
- Server có thể đang khởi động — thử lại sau 1 phút

### "Hết quota ký tự"
- Quota đã hết trong chu kỳ hiện tại
- Nâng cấp tại **Pricing** hoặc đợi gói mới

### "Model chưa sẵn sàng" (Emotional TTS)
- Server đang load viXTTS (30–60 giây sau restart)
- Chờ 1 phút rồi thử lại

### "File âm thanh không hợp lệ" (khi tạo giọng)
- Định dạng: WAV, MP3, M4A
- Thời lượng: tối thiểu 6 giây
- Dung lượng: tối đa 10 MB

### "Thanh toán chưa được xác nhận"
- Kiểm tra nội dung chuyển khoản
- Chờ thêm 5–10 phút
- Liên hệ qua `/contact` kèm ảnh giao dịch

---

## Liên hệ hỗ trợ

| Kênh | Thông tin |
|---|---|
| Form liên hệ | Trang **Liên hệ** (`/contact`) |
| Email | danhvt388@gmail.com |
| Hotline | 0866 005 541 |
| Văn phòng | 146/MO Long Tuyền, Bình Thủy, Cần Thơ |
| Giờ làm việc | T2–T6: 9:00–18:00 · T7: 9:00–12:00 |

---

*© 2026 VietVoice. Tài liệu này được cập nhật theo phiên bản hệ thống hiện tại.*
