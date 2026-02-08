# Hướng dẫn cấu hình SePay.vn

## Giới thiệu
Ứng dụng TTS đã được cập nhật để sử dụng SePay.vn thay vì chuyển khoản ngân hàng thủ công. SePay.vn cho phép tự động xác thực thanh toán qua API.

## Các bước cấu hình

### 1. Đăng ký tài khoản SePay.vn
- Truy cập https://sepay.vn
- Đăng ký tài khoản doanh nghiệp
- Xác thực tài khoản và thông tin doanh nghiệp

### 2. Lấy thông tin cần thiết
Sau khi đăng ký, bạn sẽ cần:
- **SePay Token**: Token để gọi API SePay
- **Số tài khoản**: Số tài khoản ngân hàng liên kết với SePay
- **Bank ID**: ID ngân hàng (ví dụ: MBBank, VietcomBank, v.v.)

### 3. Cấu hình Environment Variables

Thêm các biến môi trường sau:

```bash
# SePay Configuration
SEPAY_TOKEN=your_sepay_token_here
SEPAY_ACCOUNT_NUMBER=your_account_number
SEPAY_BANK_ID=your_bank_id
SEPAY_API_URL=https://my.sepay.vn/userapi/transactions
SEPAY_TIMEOUT=300
```

### 4. Cập nhật trong config.py

Nếu không sử dụng environment variables, bạn có thể cập nhật trực tiếp trong file config.py:

```python
# SePay.vn Payment Gateway Configuration
SEPAY_API_URL = 'https://my.sepay.vn/userapi/transactions'
SEPAY_TOKEN = 'your_sepay_token_here'
SEPAY_ACCOUNT_NUMBER = '0363547910'
SEPAY_BANK_ID = 'MBBank'
SEPAY_TIMEOUT = 300
```

## Cách hoạt động

### 1. Tạo thanh toán
- Người dùng chọn gói dịch vụ
- Hệ thống tạo QR code VietQR cho tài khoản SePay
- Người dùng quét mã QR và chuyển tiền

### 2. Xác thực thanh toán
- **Tự động**: SePay API sẽ kiểm tra giao dịch
- **Fallback**: Nếu SePay không khả dụng, chuyển về chuyển khoản ngân hàng thủ công

### 3. Webhook (tuỳ chọn)
- SePay có thể gửi webhook khi có giao dịch
- URL webhook: `http://your-domain.com/api/payment/sepay/webhook`

## API Endpoints mới

### Tạo thanh toán SePay
```
POST /api/payment/create
{
  "package_id": 1
}
```

### Xác minh thanh toán SePay
```
POST /api/payment/sepay/verify
{
  "payment_id": 123
}
```

### Webhook SePay
```
POST /api/payment/sepay/webhook
{
  "orderCode": "TTS_ABC123",
  "amount": 50000,
  "status": "completed"
}
```

## Test mode

Để test, bạn có thể:
1. Sử dụng SePay sandbox environment
2. Cấu hình `SEPAY_API_URL` thành URL sandbox
3. Sử dụng test token từ SePay developer console

## Troubleshooting

### SePay API không phản hồi
- Kiểm tra token có đúng không
- Kiểm tra tài khoản SePay có hoạt động không
- Kiểm tra kết nối Internet

### Fallback sang chuyển khoản ngân hàng
- Nếu SePay thất bại, hệ thống sẽ tự động chuyển về chuyển khoản QR code thủ công
- Admin vẫn có thể duyệt thanh toán thủ công

## Bảo mật

- **KHÔNG** commit SePay token vào git
- Sử dụng environment variables
- Định kỳ thay đổi token
- Kiểm tra webhook signature (nếu có)

## Lưu ý

- SePay có thể có phí giao dịch
- Cần đọc kỹ Terms of Service của SePay
- Có thể cần KYC (Know Your Customer) cho tài khoản doanh nghiệp