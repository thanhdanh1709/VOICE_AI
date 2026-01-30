# Hướng dẫn chạy TTS Web trên Web Server (XAMPP)

## Có 3 cách để chạy ứng dụng trên web server:

### **Cách 1: Chạy Flask trên Port 80 (Đơn giản nhất) ⭐**

1. **Tắt Apache trong XAMPP Control Panel** (nếu đang chạy)

2. **Mở terminal/CMD với quyền Administrator**:
   - Click chuột phải vào Terminal/CMD → "Run as Administrator"

3. **Chạy ứng dụng**:
   ```bash
   cd D:\LUANVAN\web
   python run_web.py
   ```

4. **Truy cập**: http://localhost

**Lưu ý**: Nếu không có quyền Administrator, sử dụng port khác (8080):
```bash
# Sửa port trong run_web.py thành 8080
python run_web.py  # Sẽ chạy trên port 8080
# Truy cập: http://localhost:8080
```

---

### **Cách 2: Cấu hình Apache làm Reverse Proxy (Nâng cao)**

Apache sẽ nhận requests và chuyển tiếp đến Flask app.

1. **Cài đặt mod_proxy trong Apache**:
   - Mở file: `C:\xampp\apache\conf\httpd.conf`
   - Tìm và bỏ comment (xóa dấu #):
     ```apache
     LoadModule proxy_module modules/mod_proxy.so
     LoadModule proxy_http_module modules/mod_proxy_http.so
     ```

2. **Cấu hình Virtual Host**:
   - Mở file: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`
   - Thêm nội dung từ file `apache_config.conf`
   - **Sửa đường dẫn** trong `<Directory>` thành đường dẫn thực tế của bạn

3. **Chạy Flask app** (ở terminal khác):
   ```bash
   cd D:\LUANVAN\web
   python run.py  # Chạy trên port 5000
   ```

4. **Restart Apache** trong XAMPP Control Panel

5. **Truy cập**: http://localhost

---

### **Cách 3: Chạy trên Port khác (Không cần quyền Admin)**

Bạn có thể chạy Flask trên port 8080, 8000, hoặc bất kỳ port nào:

1. **Sửa file `run.py`**:
   ```python
   app.run(debug=True, host='0.0.0.0', port=8080)
   ```

2. **Chạy ứng dụng**:
   ```bash
   python run.py
   ```

3. **Truy cập**: http://localhost:8080

---

## So sánh các cách:

| Cách | Ưu điểm | Nhược điểm |
|------|---------|------------|
| Port 80 | URL đẹp (http://localhost), không cần cấu hình | Cần quyền Admin, phải tắt Apache |
| Reverse Proxy | Dùng Apache, có thể chạy nhiều app | Cấu hình phức tạp |
| Port khác | Dễ nhất, không cần quyền | URL có số port |

## Khuyến nghị:

- **Development**: Dùng **Cách 3** (port 8080 hoặc 5000)
- **Production**: Dùng **Cách 1** (port 80) hoặc **Cách 2** (Apache reverse proxy)
