# 🔐 Hướng dẫn Setup Google Cloud OAuth - Từng bước chi tiết

## 📋 Tổng quan

Bạn sẽ setup Google OAuth để users có thể đăng nhập bằng tài khoản Google. Quá trình gồm 3 bước chính:

1. **Tạo Google Cloud Project**
2. **Enable API & Tạo OAuth Consent Screen**
3. **Tạo OAuth 2.0 Credentials**

**Thời gian:** ~10-15 phút

---

## 🚀 Bước 1: Tạo Google Cloud Project

### **1.1. Truy cập Google Cloud Console:**

Mở trình duyệt và truy cập:
```
https://console.cloud.google.com
```

- Đăng nhập bằng tài khoản Google của bạn
- Nếu lần đầu sử dụng, đồng ý với Terms of Service

### **1.2. Tạo Project mới:**

**Option A: Nếu chưa có project nào:**
- Màn hình sẽ tự động hiện "Create Project"
- Click vào đó

**Option B: Nếu đã có project:**
- Click vào **dropdown project** ở góc trên bên trái (bên cạnh logo "Google Cloud")
- Click **"New Project"**

### **1.3. Điền thông tin Project:**

```
Project Name: TTS System OAuth
Organization: (để trống nếu không có)
Location: (để trống hoặc chọn nếu có)
```

- Click **"Create"**
- Đợi 10-30 giây để Google tạo project
- Sau khi tạo xong, chọn project vừa tạo từ dropdown

---

## 🔓 Bước 2: Enable APIs & Configure OAuth Consent

### **2.1. Enable Google+ API:**

1. Trong Google Cloud Console, click menu **☰** (góc trên trái)
2. Chọn **"APIs & Services"** → **"Library"**
3. Trong search box, gõ: **"Google+ API"** hoặc **"People API"**
4. Click vào kết quả **"Google+ API"** hoặc **"People API"**
5. Click nút **"Enable"**
6. Đợi vài giây để enable

### **2.2. Cấu hình OAuth Consent Screen:**

1. Trong menu **"APIs & Services"**, chọn **"OAuth consent screen"** (bên trái)

2. **Chọn User Type:**
   - **External** ✓ (cho phép bất kỳ Google account nào)
   - **Internal** (chỉ cho organization - yêu cầu Google Workspace)
   - Chọn **"External"**
   - Click **"Create"**

3. **App Information (Trang 1/4):**

   ```
   App name: TTS System
   
   User support email: [email của bạn]
   
   App logo: (có thể bỏ qua)
   
   Application home page: (để trống hoặc http://localhost:5000)
   
   Application privacy policy: (để trống tạm thời)
   
   Application terms of service: (để trống tạm thời)
   
   Authorized domains:
   - localhost (nếu test local)
   - yourdomain.com (nếu có domain)
   
   Developer contact information:
   - [email của bạn]
   ```

   Click **"Save and Continue"**

4. **Scopes (Trang 2/4):**
   
   - Click **"Add or Remove Scopes"**
   - Tìm và chọn các scopes sau:
     - ☑ `.../auth/userinfo.email` - View email address
     - ☑ `.../auth/userinfo.profile` - View basic profile info
     - ☑ `openid` - Authenticate using OpenID Connect
   
   - Click **"Update"**
   - Click **"Save and Continue"**

5. **Test Users (Trang 3/4):**
   
   - Click **"+ Add Users"**
   - Thêm email Google của bạn (để test)
   - Thêm email của users khác nếu cần
   - Click **"Add"**
   - Click **"Save and Continue"**

6. **Summary (Trang 4/4):**
   
   - Review thông tin
   - Click **"Back to Dashboard"**

---

## 🔑 Bước 3: Tạo OAuth 2.0 Credentials

### **3.1. Navigate to Credentials:**

1. Trong menu **"APIs & Services"**, chọn **"Credentials"** (bên trái)
2. Click nút **"+ Create Credentials"** (ở trên)
3. Chọn **"OAuth client ID"**

### **3.2. Configure OAuth Client:**

1. **Application type:**
   - Chọn **"Web application"**

2. **Name:**
   ```
   TTS System Web Client
   ```

3. **Authorized JavaScript origins:**
   
   Click **"+ Add URI"** và thêm:
   ```
   http://localhost:5000
   http://127.0.0.1:5000
   ```
   
   *(Nếu có domain production, thêm: `https://yourdomain.com`)*

4. **Authorized redirect URIs:**
   
   Click **"+ Add URI"** và thêm:
   ```
   http://localhost:5000/login/google/callback
   http://127.0.0.1:5000/login/google/callback
   ```
   
   *(Nếu có domain production, thêm: `https://yourdomain.com/login/google/callback`)*

5. Click **"Create"**

### **3.3. Lấy Credentials:**

Sau khi create, một popup sẽ hiện:

```
Your Client ID:
1234567890-abc123def456.apps.googleusercontent.com

Your Client Secret:
GOCSPX-abc123def456xyz789
```

**QUAN TRỌNG:**
- ✅ Copy **Client ID** 
- ✅ Copy **Client Secret**
- ✅ Lưu vào notepad tạm thời
- ⚠️ **KHÔNG SHARE** Client Secret với ai!

Bạn cũng có thể:
- Click **"Download JSON"** để tải file credentials
- Hoặc xem lại sau tại **APIs & Services → Credentials**

---

## 💾 Bước 4: Lưu Credentials vào Project

### **4.1. Tạo file `.env`:**

Trong thư mục `d:\LUANVAN (2)\LUANVAN\web\`, tạo file `.env`:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=1234567890-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456xyz789

# Flask Secret (tạo random string)
SECRET_KEY=your-random-secret-key-here-change-this-in-production

# Session Config
SESSION_COOKIE_SECURE=False
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
```

**Thay thế:**
- `GOOGLE_CLIENT_ID` = Client ID bạn vừa copy
- `GOOGLE_CLIENT_SECRET` = Client Secret bạn vừa copy
- `SECRET_KEY` = Tạo random string dài (hoặc giữ nguyên tạm thời)

### **4.2. Thêm `.env` vào `.gitignore`:**

Tạo hoặc update file `.gitignore`:

```gitignore
# Environment variables (IMPORTANT!)
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Virtual environment
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

**⚠️ QUAN TRỌNG:** 
- KHÔNG commit file `.env` lên Git!
- File `.env` chứa credentials nhạy cảm!

---

## ✅ Bước 5: Verify Setup

### **5.1. Checklist:**

- [x] Google Cloud Project đã tạo
- [x] OAuth Consent Screen đã configure
- [x] OAuth 2.0 Client ID đã tạo
- [x] Client ID & Secret đã copy
- [x] File `.env` đã tạo với credentials
- [x] `.env` đã thêm vào `.gitignore`

### **5.2. Test trong Console:**

Quay lại Google Cloud Console:
- **APIs & Services → Credentials**
- Bạn sẽ thấy OAuth 2.0 Client ID của bạn
- Status: ✓ (màu xanh)

---

## 🎯 Next Steps

Bây giờ bạn đã có:
✅ Google Cloud Project  
✅ OAuth 2.0 Credentials  
✅ File `.env` configured  

**Tiếp theo, tôi sẽ:**
1. Install dependencies cần thiết
2. Update database schema
3. Implement backend OAuth routes
4. Thêm Google login button vào UI
5. Test toàn bộ flow

---

## 🔧 Troubleshooting

### **Lỗi: "Access blocked: This app's request is invalid"**

**Nguyên nhân:** Redirect URI không khớp

**Giải pháp:**
- Kiểm tra **Authorized redirect URIs** trong Credentials
- Phải chính xác: `http://localhost:5000/login/google/callback`
- Không có trailing slash `/` ở cuối
- Check port (5000) có đúng không

### **Lỗi: "Error 400: redirect_uri_mismatch"**

**Nguyên nhân:** URI trong code khác với URI đã config

**Giải pháp:**
- Code: `redirect_uri='http://localhost:5000/login/google/callback'`
- Credentials: Phải có exact same URI
- Kiểm tra `http` vs `https`
- Kiểm tra `localhost` vs `127.0.0.1`

### **Lỗi: "This app hasn't been verified"**

**Nguyên nhân:** App đang ở Publishing status "Testing"

**Giải pháp:**
- Click **"Continue"** (if you're testing)
- Hoặc thêm email vào **Test users**
- Hoặc publish app (nếu production)

### **Không tìm thấy Client ID/Secret:**

**Giải pháp:**
- Google Cloud Console
- **APIs & Services → Credentials**
- Click vào **OAuth 2.0 Client ID** name
- View Client ID và Secret

---

## 📚 Resources

- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google Sign-In Docs](https://developers.google.com/identity/sign-in/web)

---

## ✉️ Liên hệ Support

Nếu gặp vấn đề:
1. Check **Troubleshooting** section trên
2. Google error message cụ thể
3. Check Google Cloud Console logs

---

**🎉 Xong! Bạn đã setup xong Google Cloud OAuth!**

Bây giờ cho tôi biết để tôi tiếp tục implement phần code! 🚀
