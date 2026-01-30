# Hướng dẫn lấy VNPAY_TMN_CODE và Hash Secret

## Bước 1: Đăng ký tài khoản VNPAY Sandbox

1. Truy cập trang đăng ký: **https://sandbox.vnpayment.vn/devreg/**
   - Đây là trang đăng ký chính thức cho sandbox
   - Hoặc truy cập: https://sandbox.vnpayment.vn/ và click "Đăng ký" hoặc "Register"
2. Điền thông tin đăng ký:
   - Email
   - Mật khẩu
   - Thông tin cá nhân
3. Kiểm tra email để xác nhận tài khoản
4. Đăng nhập vào sandbox: https://sandbox.vnpayment.vn/

## Bước 2: Tạo Website/App trong VNPAY

1. Sau khi đăng nhập vào sandbox, vào **Dashboard**
2. Tìm phần **"Quản lý Website"** hoặc **"Website/App"** hoặc **"Merchant"**
3. Click **"Thêm Website/App mới"** hoặc **"Create New Website"**
4. Điền thông tin:
   - **Tên Website/App**: TTS System (hoặc tên bạn muốn)
   - **Domain**: `localhost` (cho test) hoặc domain thực tế
   - **Return URL**: `http://localhost:5000/payment/vnpay/return`
   - **IPN URL**: `http://localhost:5000/payment/vnpay/ipn`
5. Lưu thông tin

## Bước 3: Lấy thông tin TMN Code và Hash Secret

Sau khi tạo Website/App thành công, bạn sẽ nhận được thông tin qua **email** hoặc xem trong **Dashboard**:

### Cách 1: Kiểm tra Email
- VNPAY sẽ gửi email xác nhận với:
  - **TMN Code** (Terminal Code): Mã website của bạn
  - **Hash Secret**: Chuỗi bí mật để tạo chữ ký

### Cách 2: Xem trong Dashboard
1. Vào **Dashboard** → **Website/App** → Chọn website vừa tạo
2. Tìm phần **"Thông tin kết nối"** hoặc **"API Information"**
3. Copy các thông tin:
   - **TMN Code**: Ví dụ `2QXUI4J4` hoặc `YOUR_TMN_CODE`
   - **Hash Secret**: Ví dụ `RAOCTKRURSFXMEYHZUIZVMFWYSKQMSZT`

### Lưu ý quan trọng:
- **TMN Code** và **Hash Secret** là thông tin bảo mật, không chia sẻ công khai
- Mỗi Website/App sẽ có một bộ TMN Code và Hash Secret riêng

## Bước 4: Cập nhật config.py

```python
VNPAY_TMN_CODE = '2QXUI4J4'  # Thay bằng TMN Code của bạn
VNPAY_HASH_SECRET = 'RAOCTKRURSFXMEYHZUIZVMFWYSKQMSZT'  # Thay bằng Hash Secret của bạn
```

## Bước 5: Test thanh toán

1. VNPAY Sandbox cung cấp thẻ test:
   - **Thẻ thành công**: 9704198526191432198
   - **Ngày hết hạn**: 03/07
   - **OTP**: 123456
   - **Tên chủ thẻ**: NGUYEN VAN A

2. Hoặc dùng thẻ test khác từ VNPAY sandbox

## Lưu ý

- **Sandbox**: Dùng để test, không tính phí
- **Production**: Sau khi test xong, đăng ký tài khoản production tại https://vnpayment.vn/
- **Return URL và IPN URL**: Phải là URL công khai (không thể dùng localhost cho production)

## Tài liệu tham khảo

- VNPAY Sandbox: https://sandbox.vnpayment.vn/
- Tài liệu API: https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/
- Download code mẫu: https://sandbox.vnpayment.vn/apis/downloads/
