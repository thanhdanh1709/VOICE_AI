# Hướng dẫn sử dụng VietVoice

> Dành cho người dùng cuối  
> Phiên bản: Beta | Cập nhật: Tháng 6/2026

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Đăng ký & Đăng nhập](#2-đăng-ký--đăng-nhập)
3. [Giao diện Workspace](#3-giao-diện-workspace)
4. [Chuyển văn bản thành giọng nói (TTS cơ bản)](#4-chuyển-văn-bản-thành-giọng-nói-tts-cơ-bản)
5. [Emotional TTS — Giọng đọc cảm xúc](#5-emotional-tts--giọng-đọc-cảm-xúc)
6. [Điều chỉnh giọng nói (RVC Pitch)](#6-điều-chỉnh-giọng-nói-rvc-pitch)
7. [Xuất file âm thanh (WAV / MP3 / OGG)](#7-xuất-file-âm-thanh-wav--mp3--ogg)
8. [Clone giọng cá nhân](#8-clone-giọng-cá-nhân)
9. [Thư viện âm thanh](#9-thư-viện-âm-thanh)
10. [Lịch sử chuyển đổi](#10-lịch-sử-chuyển-đổi)
11. [Bảng giá & Nâng cấp gói](#11-bảng-giá--nâng-cấp-gói)
12. [Thanh toán qua SePay](#12-thanh-toán-qua-sepay)
13. [Hồ sơ cá nhân](#13-hồ-sơ-cá-nhân)
14. [Ứng dụng di động](#14-ứng-dụng-di-động)
15. [Mẹo sử dụng nâng cao](#15-mẹo-sử-dụng-nâng-cao)
16. [Xử lý lỗi thường gặp](#16-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng quan hệ thống

VietVoice là nền tảng **Text-to-Speech (TTS)** tiếng Việt sử dụng công nghệ AI, cung cấp:

| Tính năng | Mô tả |
|---|---|
| **TTS Cơ bản** | 10+ giọng hệ thống Nam/Nữ, Bắc/Nam/Trung với chất lượng cao |
| **Emotional TTS** | Giọng đọc cảm xúc (Neutral, Vui, Phấn khích, Bình tĩnh, Buồn) nhờ mô hình viXTTS |
| **Voice Clone** | Tạo giọng AI từ 10–60 giây mẫu giọng của chính bạn |
| **Điều chỉnh giọng** | Thay đổi pitch, index rate, protect sau khi tạo âm thanh |
| **Xuất đa định dạng** | Tải về WAV (gốc), MP3 (128/192/256/320 kbps), OGG Vorbis |
| **Thư viện âm thanh** | Lưu trữ, tìm kiếm, đặt tên, chia sẻ tất cả file đã tạo |
| **Đa ngôn ngữ UI** | Giao diện hỗ trợ Tiếng Việt / English (nút VI\|EN góc trên) |

**Giao diện:** Trình duyệt web tại `http://127.0.0.1:5000` hoặc qua ứng dụng Android (Flutter WebView).

---

## 2. Đăng ký & Đăng nhập

### 2.1 Đăng ký tài khoản mới

1. Vào trang chủ → nhấn **"Bắt đầu miễn phí"** (hoặc `/register`)
2. Điền thông tin:
   - **Họ tên** (tên hiển thị)
   - **Tên đăng nhập** (không dấu, không khoảng trắng)
   - **Email** (hợp lệ, dùng để liên hệ)
   - **Mật khẩu** (≥ 6 ký tự)
3. Nhấn **"Đăng ký"** — tài khoản được tạo ngay, chuyển về trang đăng nhập

### 2.2 Đăng nhập

- **Bằng tài khoản:** Nhập username/email + mật khẩu → nhấn **"Đăng nhập"**
- **Bằng Google:** Nhấn **"Đăng nhập với Google"** → chọn tài khoản Google (hệ thống tự tạo tài khoản nếu lần đầu)

> **Lưu ý:** Mỗi email chỉ đăng ký được một tài khoản. Nếu quên mật khẩu, liên hệ admin qua trang `/contact`.

### 2.3 Đăng xuất

Nhấn nút **"Logout"** ở góc trên bên phải navbar.

---

## 3. Giao diện Workspace

Workspace (`/`) là trang chính sau khi đăng nhập, gồm các khu vực:

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: Logo | Menu | Ký tự còn lại | VI|EN | User │
├──────────────┬──────────────────────────────────────┤
│              │  Hero: tiêu đề                        │
│  SIDEBAR     ├──────────────────────────────────────┤
│  - Tạo Audio │  Bento Grid (2 cột):                 │
│  - Thư viện  │  ┌──────────────┐ ┌────────────────┐ │
│  - Giọng     │  │  INPUT CARD  │ │  STATS CARD    │ │
│  - Lịch sử   │  │  (Text/File/ │ │  RESULT CARD   │ │
│  - Bảng giá  │  │  Emotional)  │ │  RVC PANEL     │ │
│  - Hồ sơ     │  └──────────────┘ │  TIPS / GALLERY│ │
│  - Liên hệ   │  [CONVERT BTN]    └────────────────┘ │
└──────────────┴──────────────────────────────────────┘
```

**Chuyển đổi ngôn ngữ UI:** Nhấn nút **VI | EN** để chuyển giao diện sang tiếng Anh hoặc tiếng Việt.

---

## 4. Chuyển văn bản thành giọng nói (TTS cơ bản)

### 4.1 Nhập liệu từ văn bản

1. Trong tab **"Nhập văn bản"**, gõ hoặc dán văn bản vào ô nhập liệu
2. Số ký tự hiển thị ở góc dưới phải ô nhập
3. Chọn **giọng đọc** từ dropdown (nhóm *Giọng hệ thống* hoặc *Giọng của tôi*)
4. Nhấn **"⊙ Chuyển đổi ngay"**

### 4.2 Nhập liệu từ file

1. Nhấn tab **"Tải file lên"**
2. Kéo thả hoặc click để chọn file:

| Định dạng | Ghi chú |
|---|---|
| `.txt` | Đọc trực tiếp trong trình duyệt |
| `.pdf` | Server trích xuất text (không hỗ trợ PDF scan/ảnh) |
| `.docx` | Microsoft Word, giữ nội dung thuần túy |

3. Giới hạn file: **10 MB**
4. Sau khi tải lên, văn bản tự động điền vào ô nhập liệu
5. Chọn giọng → nhấn **"Chuyển đổi ngay"**

### 4.3 Chọn giọng từ thư viện

Nhấn nút **"Nghe thử"** (bên cạnh dropdown) để mở cửa sổ Voice Gallery — nghe thử từng giọng rồi nhấn **"Chọn giọng này"**.

### 4.4 Đặt tên cho audio vừa tạo

Sau khi chuyển đổi thành công, hộp **"Đặt tên cho audio"** xuất hiện trong phần kết quả:

1. Gõ tên mô tả (VD: *Bài thuyết trình Q3*)
2. Nhấn **"Lưu tên"** hoặc Enter
3. Tên sẽ hiển thị trong Thư viện âm thanh

---

## 5. Emotional TTS — Giọng đọc cảm xúc

Sử dụng mô hình **viXTTS** — giọng đọc thay đổi cảm xúc theo nội dung.

### 5.1 Các cảm xúc hỗ trợ

| Cảm xúc | Emoji tag | Ghi chú |
|---|---|---|
| Neutral | *(không tag)* | Giọng chuẩn, bình thường |
| Cheerful (Vui) | `(tươi sáng)`, `(nụ cười)` | Giọng tươi vui, hứng khởi |
| Excited (Phấn khích) | `(hào hứng)`, `(wow)` | Năng động, sôi nổi |
| Calm (Bình tĩnh) | `(chậm)`, `(ấm áp)`, `(nhẹ nhàng)` | Chậm rãi, nhẹ nhàng |
| Sad (Buồn) | `(buồn)`, `(tiếc thương)` | Trầm lắng, buồn bã |

### 5.2 Cách sử dụng Emotional TTS

1. Trong Workspace, nhấn tab **"Emotional TTS"**
2. Nhập văn bản kèm **emotion tags** (đặt tag trên dòng riêng hoặc đầu đoạn):

```
(tươi sáng)
Xin chào mọi người! Hôm nay là một ngày tuyệt vời!

(buồn)
Thật tiếc vì chúng ta phải chia tay ở đây.

(hào hứng)
Wow! Chúng tôi vừa đạt mốc 1 triệu người dùng!
```

3. (Tuỳ chọn) Chọn **giọng clone cá nhân** trong dropdown *"Giọng đọc (Emotional)"* — chỉ dùng được giọng loại viXTTS Clone
4. Nhấn **"🎭 Chuyển đổi với cảm xúc"**
5. Chờ xử lý (lâu hơn TTS cơ bản — ~10–60 giây tuỳ độ dài)

> **Mẹo:** Emotional TTS hoạt động tốt nhất với đoạn văn ngắn dưới 500 ký tự/lần. Với văn bản dài, hãy chia thành nhiều đoạn.

> **Lưu ý:** Lần đầu dùng sau khi khởi động server, model viXTTS cần 30–60 giây để load vào RAM.

---

## 6. Điều chỉnh giọng nói (RVC Pitch)

Sau khi chuyển đổi thành công (TTS cơ bản), panel **"Điều chỉnh giọng nói"** xuất hiện:

| Thông số | Phạm vi | Ý nghĩa |
|---|---|---|
| **Pitch** | -12 đến +12 | Âm cao hơn (+) hoặc thấp hơn (-) |
| **Index Rate** | 0.0 – 1.0 | Mức độ pha trộn giọng gốc / giọng clone |
| **Protect** | 0.0 – 0.5 | Bảo vệ âm phụ âm tránh nhiễu |

**Cài đặt nhanh:**
- **Nam → Nữ**: Pitch +8, Index 0.75
- **Nữ → Nam**: Pitch -8, Index 0.75
- **Cao hơn**: Pitch +4
- **Thấp hơn**: Pitch -4
- **↺ Reset**: Về giá trị mặc định

Nhấn **"Áp dụng hiệu ứng"** để xử lý.

> **Lưu ý:** Tính năng này yêu cầu `faiss` (RVC). Nếu `faiss` chưa cài, hệ thống dùng `librosa` fallback — chức năng pitch vẫn hoạt động nhưng giới hạn hơn.

---

## 7. Xuất file âm thanh (WAV / MP3 / OGG)

Sau khi kết quả âm thanh xuất hiện trong phần *Kết quả*:

1. Chọn **Định dạng xuất**: `WAV` (nguyên bản), `MP3`, `OGG Vorbis`
2. Nếu chọn MP3 hoặc OGG, chọn thêm **Bitrate**: 128 / 192 / 256 / 320 kbps
3. Nhấn **"⬇ Tải xuống"**

| Định dạng | Ưu điểm | Khi nào dùng |
|---|---|---|
| WAV | Chất lượng lossless, không mất dữ liệu | Chỉnh sửa chuyên nghiệp, lưu trữ gốc |
| MP3 | Phổ biến, file nhỏ | Podcast, chia sẻ, phát online |
| OGG Vorbis | Nguồn mở, chất lượng tốt | Game, ứng dụng, web |

> **Yêu cầu:** Xuất MP3/OGG cần **ffmpeg** được cài sẵn trên server. WAV luôn hoạt động mà không cần ffmpeg.

---

## 8. Clone giọng cá nhân

### 8.1 Yêu cầu file mẫu

| Tiêu chí | Yêu cầu |
|---|---|
| **Định dạng** | WAV, MP3, M4A, OGG, FLAC |
| **Thời lượng** | Tối thiểu 10 giây — tốt nhất 30–60 giây |
| **Chất lượng** | Phòng yên tĩnh, không tạp âm, rõ ràng |
| **Dung lượng** | Tối đa 50 MB |

### 8.2 Tạo giọng clone

1. Vào menu **Voices** (Giọng của tôi) → nhấn **"+ Thêm giọng mới"**
2. Đặt **tên giọng** (VD: *Giọng Minh*, *Narrator 1*)
3. Tải lên file âm thanh mẫu (kéo thả hoặc chọn file)
4. Chọn **loại giọng**:
   - **VieNeu Zero-shot**: Nhập thêm đoạn văn bản phiên âm mẫu
   - **viXTTS Clone**: Chỉ cần file audio — dùng được ở Emotional TTS
5. Nhấn **"Tạo giọng"** — chờ 1–5 phút hệ thống xử lý
6. Trạng thái: *Chờ xử lý → Đang xử lý → Hoàn thành*

### 8.3 Sử dụng giọng clone

- **TTS cơ bản:** Giọng clone xuất hiện trong nhóm *"Giọng của tôi"* trong dropdown Workspace
- **Emotional TTS:** Chỉ giọng loại **viXTTS Clone** mới dùng được tại dropdown *"Giọng đọc (Emotional)"*

### 8.4 Kiểm tra & Xóa giọng

- Tại trang Voices, nhấn **"Kiểm tra"** để nghe thử giọng clone
- Nhấn **"Xóa"** để xóa giọng không còn dùng

> **Mẹo chất lượng:** Đọc đa dạng ngữ điệu, tránh nền nhạc và tiếng ồn, giữ khoảng cách mic ổn định 15–20 cm.

---

## 9. Thư viện âm thanh

Trang **Library** (`/audio-library`) lưu trữ tất cả file âm thanh đã tạo.

### 9.1 Tính năng

| Tính năng | Mô tả |
|---|---|
| **Phát lại** | Nghe trực tiếp trong trình duyệt |
| **Tải về** | Tải lại file WAV bất kỳ lúc nào |
| **Đặt tên** | Đổi tên hiển thị cho dễ tìm (tại Workspace sau convert hoặc tại Library) |
| **Chia sẻ** | Tạo link chia sẻ công khai (`/audio/share/<token>`) |
| **Tìm kiếm** | Tìm theo tên hoặc nội dung văn bản |
| **Lọc** | Theo giọng đọc, khoảng ngày |
| **Sắp xếp** | Mới nhất, cũ nhất, thời lượng, kích thước |
| **Xóa** | Xóa vĩnh viễn file không cần thiết |

### 9.2 Chia sẻ audio

1. Nhấn icon **chia sẻ** bên cạnh file
2. Hệ thống tạo **link công khai** — ai có link đều nghe được
3. Để thu hồi: xóa file hoặc liên hệ admin

---

## 10. Lịch sử chuyển đổi

Trang **History** (`/history`) hiển thị toàn bộ các lần chuyển đổi:

- Tổng số lần đã chuyển đổi
- Trạng thái từng bản ghi: *Hoàn thành* / *Đang xử lý* / *Thất bại*
- Thông tin: nội dung văn bản, giọng đọc, số ký tự, thời gian tạo
- Tìm kiếm theo nội dung văn bản
- Phân trang — mỗi trang 20 bản ghi

> **Lưu ý:** Lịch sử chỉ ghi thông tin metadata — không lưu lại file âm thanh (dùng Thư viện âm thanh để truy cập file).

---

## 11. Bảng giá & Nâng cấp gói

Xem trang **Pricing** (`/pricing`) để biết thông tin đầy đủ.

| Gói | Ký tự / tháng | Ghi chú |
|---|---|---|
| **Free Plan** | 100.000 | Miễn phí, TTS cơ bản |
| **Basic Plan** | 1.500.000 | 1000 VND/tháng |
| **Standard Plan** | 4.000.000 | 5000 VND/tháng |
| **Premium Plan** | 10.000.000 | 10.000 VND/tháng |
| **Enterprise Plan** | 27.000.000 | 15.000 VND/tháng |

**Số ký tự còn lại** hiển thị ở **badge góc trên phải navbar** sau khi đăng nhập.

Gói được kích hoạt **ngay sau khi SePay xác nhận giao dịch** (thường 1–5 phút).

---

## 12. Thanh toán qua SePay

1. Vào **Pricing** → chọn gói → nhấn **"Nâng cấp"**
2. Hệ thống hiển thị **mã QR chuyển khoản** (VietQR)
3. Quét QR bằng app ngân hàng (MB, Vietcombank, Techcombank...)
4. Nhập **đúng nội dung chuyển khoản** hiển thị trên màn hình *(quan trọng — đây là mã định danh giao dịch)*
5. Hệ thống xác nhận tự động trong **1–5 phút** — tài khoản nâng cấp ngay

> **Cảnh báo:** Sai nội dung chuyển khoản = hệ thống không nhận ra giao dịch. Nếu chờ quá 10 phút, liên hệ support kèm ảnh chụp biên lai.

---

## 13. Hồ sơ cá nhân

Trang **Profile** (`/profile`):

- **Thông tin cá nhân:** Cập nhật họ tên, email
- **Đổi mật khẩu:** Nhập mật khẩu cũ → mật khẩu mới → xác nhận
- **Thống kê:** Tổng số lần chuyển đổi, ký tự đã dùng
- **Thông tin gói:** Gói đang dùng, ngày hết hạn, ký tự còn lại

---

## 14. Ứng dụng di động

VietVoice cung cấp ứng dụng **Android** xây dựng bằng **Flutter WebView** — bọc toàn bộ giao diện web trong ứng dụng native.

### 14.1 Cài đặt APK

1. Nhận file APK từ nhà phát triển (chưa có trên Google Play)
2. Bật **Cài đặt không xác định** trên Android: *Cài đặt → Bảo mật → Cho phép cài từ nguồn không rõ*
3. Cài file `.apk`
4. Mở app → đăng nhập bình thường

### 14.2 Tính năng trên mobile

- Toàn bộ tính năng giống trình duyệt web
- Hỗ trợ đăng nhập Google qua Chrome Custom Tab
- Phiên đăng nhập được lưu tự động

> **Yêu cầu:** Android 6.0+, kết nối Internet ổn định đến server VietVoice.

---

## 15. Mẹo sử dụng nâng cao

### 15.1 Tối ưu chất lượng giọng đọc

| Mục đích | Giọng khuyến nghị |
|---|---|
| Truyện, tiểu thuyết | Nam miền Bắc, tốc độ chậm |
| Tin tức, báo cáo | Nữ miền Nam, giọng chuẩn |
| Học tiếng Việt | Giọng chuẩn Hà Nội |
| Podcast sáng tạo | Emotional TTS — Cheerful |
| Thiền, thư giãn | Emotional TTS — Calm |
| Thông báo hệ thống | Giọng ngắn gọn, trung tính |

### 15.2 Kỹ thuật viết văn bản cho TTS

- **Dùng dấu câu đầy đủ** — dấu chấm `.` tạo nghỉ ngắn, dấu `...` tạo nghỉ dài
- **Chia đoạn dài < 2000 ký tự** mỗi lần chuyển đổi
- **Viết số thành chữ** khi cần: `1000` → *một nghìn*; `12/05` → *mười hai tháng năm*
- **Viết tắt** nên giải thích: `TPHCM` → *Thành phố Hồ Chí Minh*
- **Tiếng nước ngoài** trong văn bản tiếng Việt: thêm chú thích phát âm nếu cần

### 15.3 Tiết kiệm quota ký tự

- Tái sử dụng file từ **Thư viện âm thanh** thay vì convert lại
- Thử với đoạn văn ngắn trước khi convert toàn bộ
- Dùng tính năng **đặt tên** để dễ tìm lại file trong thư viện

### 15.4 Emotional TTS — Kỹ thuật viết emotion tags

```
(tươi sáng)
Chào buổi sáng! Hôm nay trời đẹp quá!

(chậm)
Hãy dừng lại và hít thở sâu...

(hào hứng)
Wow! Đây là kết quả tuyệt vời nhất từ trước đến nay!

Văn bản không có tag sẽ đọc theo cảm xúc neutral.
```

---

## 16. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| **"Hết quota ký tự"** | Đã dùng hết giới hạn gói hiện tại | Nâng cấp gói tại `/pricing` |
| **"Đang tải model..."** | Emotional TTS chưa load xong | Chờ 30–60 giây rồi thử lại |
| **"Server không phản hồi"** | Flask server chưa chạy hoặc lỗi kết nối | Liên hệ admin hoặc kiểm tra kết nối mạng |
| **File không tải lên được** | File quá lớn (> 10 MB) hoặc sai định dạng | Chuyển sang TXT hoặc nén file |
| **Giọng clone chất lượng kém** | File mẫu có tiếng ồn hoặc quá ngắn | Ghi lại mẫu trong môi trường yên tĩnh, > 30 giây |
| **Không nhận được gói sau thanh toán** | Sai nội dung chuyển khoản | Liên hệ support kèm ảnh biên lai chuyển khoản |
| **Điều chỉnh giọng không hoạt động** | RVC/faiss chưa cài đặt | Tính năng có thể bị giới hạn — liên hệ admin |
| **"Unknown error" khi Emotional TTS** | Lỗi xử lý phía server | Kiểm tra text có ký tự đặc biệt không; thử đoạn ngắn hơn |

---

## Liên hệ hỗ trợ

| Kênh | Thông tin |
|---|---|
| **Trang liên hệ** | `/contact` trong ứng dụng |
| **Email** | danhvt388@gmail.com |
| **Hotline** | 0866 005 541 |
| **Hướng dẫn kỹ thuật** | `INSTALLATION_GUIDE.md` |

---

*© 2026 VietVoice. Tài liệu dành cho người dùng cuối.*
