# Auto Payment Approval System

## Tổng quan
Hệ thống tự động duyệt thanh toán giúp tự động xác nhận và cập nhật subscription mà không cần admin can thiệp thủ công.

## Các phương pháp auto-approve

### 1. 🔄 Realtime Auto-Approve (Recommended)
Tự động verify và approve thông qua SePay API + fallback theo thời gian.

**Cách hoạt động:**
- User chuyển tiền → SePay nhận tiền
- System gọi SePay API để verify
- Nếu verify thành công → Auto approve ngay lập tức
- Nếu API lỗi → Auto approve sau 5 phút

**Sử dụng:**
```bash
# Trong route verify payment, system tự động kiểm tra
POST /payment/bank/verify
{
  "payment_id": 123
}
```

### 2. 🤖 Background Worker 
Chạy một service liên tục kiểm tra và duyệt payments.

**Chạy background worker:**
```bash
# Cách 1: Double-click file
start_auto_approve.bat

# Cách 2: Command line
python auto_approve_payments.py
```

**Tính năng:**
- Kiểm tra mỗi 60 giây
- Auto-approve sau 5 phút
- SePay verification trước
- Log chi tiết

### 3. 🎯 Bulk Auto-Approve
Admin duyệt hàng loạt tất cả pending payments.

**API Endpoint:**
```bash
POST /api/admin/auto-approve
{
  "force": true  # Bỏ qua verification, approve tất cả
}
```

**Script nhanh:**
```bash
# Approve tất cả payments ngay lập tức
python auto_approve_all.py
```

## Cấu hình

### Thời gian auto-approve
Trong `auto_approve_payments.py`:
```python
self.auto_approve_minutes = 5  # Auto-approve sau 5 phút
self.check_interval = 60      # Kiểm tra mỗi 60 giây
```

### SePay verification
Trong `app.py`:
```python
AUTO_APPROVE_MINUTES = 5  # Fallback time
```

## Workflow Auto-Approve

```
1. User chuyển tiền
   ↓
2. Payment tạo với status 'pending'
   ↓
3. User click "Xác nhận đã chuyển"
   ↓
4. System kiểm tra:
   ├─ SePay API verify → ✅ Auto approve
   ├─ Quá 5 phút → ✅ Auto approve  
   └─ Còn sớm → ⏳ Chờ admin
   ↓
5. Subscription cập nhật tự động
```

## Scripts có sẵn

### Chạy background worker
```bash
# Windows
start_auto_approve.bat

# Linux/Mac  
python auto_approve_payments.py
```

### Debug payments
```bash
python debug_payment.py
```

### Approve manual
```bash
# Approve một payment cụ thể
python quick_approve.py <payment_id>

# Approve tất cả payments
python auto_approve_all.py
```

### Check subscription
```bash
python check_subscription.py
```

## API Endpoints

### Admin APIs
| Endpoint | Method | Mô tả |
|----------|---------|--------|
| `/api/admin/payments` | GET | Xem danh sách payments |
| `/api/admin/auto-approve` | POST | Bulk auto-approve |
| `/api/admin/payment/approve` | POST | Approve từng payment |

### User APIs  
| Endpoint | Method | Mô tả |
|----------|---------|--------|
| `/payment/bank/verify` | POST | Verify payment (auto-approve) |
| `/api/user/subscription/status` | GET | Check subscription status |

## Monitoring

### Logs quan trọng
```
✅ SePay verified payment 123
⏰ Time-based auto-approve for payment 123  
🔄 Auto-approving payment 123 for user admin
✅ Payment 123 auto-approved successfully!
```

### Kiểm tra status
```bash
# Check pending payments
python debug_payment.py

# Check subscription
python check_subscription.py
```

## Troubleshooting

### SePay API không hoạt động
- ✅ Fallback: Auto-approve theo thời gian
- ✅ Manual: Admin có thể force approve

### Background worker bị crash
- ✅ Restart: `start_auto_approve.bat`
- ✅ Manual: `python auto_approve_all.py`

### Payment không được approve
```bash
# Debug
python debug_payment.py

# Force approve specific payment
python quick_approve.py <payment_id>

# Force approve all
python auto_approve_all.py
```

## Bảo mật

- ✅ Admin authentication required cho bulk operations
- ✅ SePay API token secured
- ✅ Database transactions với rollback
- ✅ Detailed logging cho audit trail

## Khuyến nghị

1. **Production**: Chạy background worker như Windows Service
2. **Development**: Sử dụng manual scripts để test
3. **Monitoring**: Setup alerts nếu có quá nhiều failed approvals
4. **Backup**: Backup database trước khi chạy bulk operations