# Khắc phục lỗi VNPAY

## Lỗi 404 khi truy cập VNPAY Sandbox

### Nguyên nhân:
1. **Chưa đăng ký tài khoản**: Bạn cần đăng ký tài khoản sandbox trước
2. **URL không đúng**: Đang truy cập URL không tồn tại
3. **Tài khoản chưa được kích hoạt**: Cần xác nhận email

### Giải pháp:

#### 1. Đăng ký tài khoản đúng cách:
```
Bước 1: Truy cập https://sandbox.vnpayment.vn/devreg/
Bước 2: Điền form đăng ký
Bước 3: Kiểm tra email và xác nhận
Bước 4: Đăng nhập tại https://sandbox.vnpayment.vn/
```

#### 2. Kiểm tra URL đúng:
- ✅ **Đăng ký**: https://sandbox.vnpayment.vn/devreg/
- ✅ **Đăng nhập**: https://sandbox.vnpayment.vn/
- ✅ **Dashboard**: https://sandbox.vnpayment.vn/ (sau khi đăng nhập)
- ✅ **Tài liệu**: https://sandbox.vnpayment.vn/apis/docs/
- ❌ **Không truy cập**: Các URL không có trong danh sách trên

#### 3. Nếu vẫn gặp lỗi 404:
- Kiểm tra kết nối internet
- Thử trình duyệt khác (Chrome, Firefox, Edge)
- Xóa cache và cookies
- Liên hệ support VNPAY: support@vnpayment.vn

## Lỗi khi tạo Payment URL

### Lỗi: "Invalid TMN Code"
**Nguyên nhân**: TMN Code không đúng hoặc chưa được cấu hình

**Giải pháp**:
1. Kiểm tra lại TMN Code trong `config.py`
2. Đảm bảo đã copy đúng từ VNPAY Dashboard
3. Không có khoảng trắng thừa

### Lỗi: "Invalid Hash Secret"
**Nguyên nhân**: Hash Secret không đúng

**Giải pháp**:
1. Kiểm tra lại Hash Secret trong `config.py`
2. Đảm bảo copy đầy đủ (thường là chuỗi 32-64 ký tự)
3. Không có khoảng trắng thừa

### Lỗi: "Payment URL không hoạt động"
**Nguyên nhân**: URL thanh toán không đúng hoặc thiếu tham số

**Giải pháp**:
1. Kiểm tra `VNPAY_PAYMENT_URL` trong `config.py`:
   ```python
   VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
   ```
2. Kiểm tra log để xem URL được tạo ra như thế nào
3. Đảm bảo tất cả tham số đều được truyền đúng

## Debug Payment Flow

### 1. Kiểm tra log trong console:
```python
# Trong app.py, hàm create_vnpay_payment sẽ in ra payment_url
print(f"[PAYMENT] VNPAY URL: {payment_url}")
```

### 2. Test với thẻ test:
- **Thẻ thành công**: 9704198526191432198
- **Ngày hết hạn**: 03/07
- **OTP**: 123456
- **Tên chủ thẻ**: NGUYEN VAN A

### 3. Kiểm tra Return URL:
- Đảm bảo server đang chạy tại `http://localhost:5000`
- Route `/payment/vnpay/return` phải tồn tại
- Kiểm tra log khi VNPAY redirect về

## Liên hệ hỗ trợ

- **VNPAY Support**: support@vnpayment.vn
- **Hotline**: 1900 545426
- **Tài liệu**: https://sandbox.vnpayment.vn/apis/docs/
