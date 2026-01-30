# 🔐 Google OAuth Login - Kế hoạch triển khai

## 🎯 Mục tiêu

Thêm tính năng **Đăng nhập bằng Google** để users có thể login nhanh chóng mà không cần tạo tài khoản riêng.

---

## 📋 Yêu cầu

### **1. Google Cloud Setup:**
- Tạo project trên Google Cloud Console
- Enable Google+ API
- Tạo OAuth 2.0 credentials
- Config authorized redirect URIs

### **2. Backend:**
- Install `google-auth`, `google-auth-oauthlib`
- Tạo OAuth flow routes
- Verify Google tokens
- Auto-create user accounts

### **3. Frontend:**
- Button "Đăng nhập bằng Google"
- Google branding guidelines
- Error handling

### **4. Database:**
- Thêm `google_id` column
- Link Google accounts to existing users

---

## 🏗️ Implementation Steps

### **Phase 1: Google Cloud Setup**

1. **Tạo Google Cloud Project:**
   - Truy cập: https://console.cloud.google.com
   - Create new project hoặc chọn existing
   - Enable **Google+ API** hoặc **Google Sign-In API**

2. **Tạo OAuth 2.0 Credentials:**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     http://localhost:5000/login/google/callback
     http://127.0.0.1:5000/login/google/callback
     https://yourdomain.com/login/google/callback  (production)
     ```

3. **Lấy Client ID & Client Secret:**
   - Download JSON hoặc copy values
   - Lưu vào `.env` file

---

### **Phase 2: Install Dependencies**

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2
```

Add to `requirements.txt`:
```txt
google-auth>=2.25.0
google-auth-oauthlib>=1.2.0
google-auth-httplib2>=0.2.0
```

---

### **Phase 3: Database Schema Update**

**Add columns to `users` table:**

```sql
ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) UNIQUE,
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN profile_picture VARCHAR(500);

CREATE INDEX idx_google_id ON users(google_id);
```

**Or create separate OAuth table:**

```sql
CREATE TABLE oauth_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_oauth (provider, provider_user_id)
);
```

---

### **Phase 4: Backend Implementation**

#### **4.1. Config (`config.py`):**

```python
import os
from dotenv import load_dotenv

load_dotenv()

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
```

#### **4.2. OAuth Helper (`oauth_helper.py`):**

```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
import os

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# OAuth 2.0 client config
CLIENT_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:5000/login/google/callback"]
    }
}

def get_google_auth_flow(redirect_uri=None):
    """Create Google OAuth flow"""
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=[
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        redirect_uri=redirect_uri or 'http://localhost:5000/login/google/callback'
    )
    return flow

def verify_google_token(token):
    """Verify Google ID token"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        return idinfo
    except ValueError:
        return None
```

#### **4.3. Routes (`app.py`):**

```python
from oauth_helper import get_google_auth_flow, verify_google_token

@app.route('/login/google')
def login_google():
    """Initiate Google OAuth flow"""
    try:
        flow = get_google_auth_flow(
            redirect_uri=url_for('google_callback', _external=True)
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        # Save state in session for security
        session['oauth_state'] = state
        
        return redirect(authorization_url)
        
    except Exception as e:
        print(f"[ERROR] Google OAuth init error: {e}")
        flash('Không thể kết nối Google. Vui lòng thử lại.', 'error')
        return redirect(url_for('login'))

@app.route('/login/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Verify state
        state = session.get('oauth_state')
        if not state or state != request.args.get('state'):
            flash('Phiên đăng nhập không hợp lệ', 'error')
            return redirect(url_for('login'))
        
        # Exchange code for token
        flow = get_google_auth_flow(
            redirect_uri=url_for('google_callback', _external=True)
        )
        flow.fetch_token(authorization_response=request.url)
        
        # Get user info
        credentials = flow.credentials
        id_info = verify_google_token(credentials.id_token)
        
        if not id_info:
            flash('Không thể xác thực Google', 'error')
            return redirect(url_for('login'))
        
        # Extract user info
        google_id = id_info['sub']
        email = id_info['email']
        full_name = id_info.get('name', '')
        picture = id_info.get('picture', '')
        
        # Check if user exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM users WHERE google_id = %s OR email = %s",
            (google_id, email)
        )
        user = cursor.fetchone()
        
        if user:
            # User exists - login
            if not user['google_id']:
                # Link Google account to existing user
                cursor.execute(
                    "UPDATE users SET google_id = %s, profile_picture = %s WHERE id = %s",
                    (google_id, picture, user['id'])
                )
                conn.commit()
            
            # Set session
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['full_name'] = user['full_name']
            session['user_role'] = user['role']
            
            flash(f'Chào mừng trở lại, {user["full_name"]}!', 'success')
            
        else:
            # Create new user
            username = email.split('@')[0]
            
            # Ensure unique username
            base_username = username
            counter = 1
            while True:
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                if not cursor.fetchone():
                    break
                username = f"{base_username}{counter}"
                counter += 1
            
            cursor.execute("""
                INSERT INTO users 
                (username, email, password, full_name, google_id, profile_picture, role)
                VALUES (%s, %s, %s, %s, %s, %s, 'user')
            """, (
                username,
                email,
                '',  # No password for OAuth users
                full_name,
                google_id,
                picture
            ))
            conn.commit()
            
            user_id = cursor.lastrowid
            
            # Set session
            session['user_id'] = user_id
            session['username'] = username
            session['full_name'] = full_name
            session['user_role'] = 'user'
            
            flash(f'Chào mừng {full_name}! Tài khoản đã được tạo.', 'success')
        
        conn.close()
        return redirect(url_for('index'))
        
    except Exception as e:
        print(f"[ERROR] Google OAuth callback error: {e}")
        import traceback
        traceback.print_exc()
        flash('Đăng nhập Google thất bại. Vui lòng thử lại.', 'error')
        return redirect(url_for('login'))
```

---

### **Phase 5: Frontend UI**

#### **Update `templates/login.html`:**

```html
<!-- Existing login form -->
<form id="loginForm" class="auth-form">
    <!-- ... existing fields ... -->
    <button type="submit" class="btn-primary">Đăng nhập</button>
</form>

<!-- Add separator -->
<div class="auth-separator">
    <span>hoặc</span>
</div>

<!-- Google Login Button -->
<a href="{{ url_for('login_google') }}" class="btn-google-login">
    <svg class="google-icon" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    <span>Đăng nhập bằng Google</span>
</a>

<!-- Privacy note -->
<p class="oauth-privacy-note">
    Bằng cách đăng nhập bằng Google, bạn đồng ý với 
    <a href="#">Điều khoản sử dụng</a> và 
    <a href="#">Chính sách bảo mật</a> của chúng tôi.
</p>
```

---

### **Phase 6: CSS Styling**

```css
/* OAuth Separator */
.auth-separator {
    display: flex;
    align-items: center;
    text-align: center;
    margin: var(--spacing-lg) 0;
}

.auth-separator::before,
.auth-separator::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e2e8f0;
}

.auth-separator span {
    padding: 0 var(--spacing-md);
    color: var(--text-light);
    font-size: 0.9rem;
}

/* Google Login Button */
.btn-google-login {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: all var(--transition-base);
    cursor: pointer;
}

.btn-google-login:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.btn-google-login:active {
    transform: translateY(0);
}

.google-icon {
    width: 20px;
    height: 20px;
}

/* OAuth Privacy Note */
.oauth-privacy-note {
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-light);
    margin-top: var(--spacing-md);
}

.oauth-privacy-note a {
    color: var(--primary-blue);
    text-decoration: none;
}

.oauth-privacy-note a:hover {
    text-decoration: underline;
}

/* Dark mode */
[data-theme="dark"] .btn-google-login {
    background: #2d3748;
    border-color: #4a5568;
    color: var(--text-primary);
}

[data-theme="dark"] .btn-google-login:hover {
    background: #1a202c;
    border-color: #667eea;
}
```

---

## 🔒 Security Considerations

### **1. State Parameter:**
- Always verify OAuth state parameter
- Store in session, compare on callback
- Prevents CSRF attacks

### **2. Token Verification:**
- Verify Google ID token signature
- Check token audience (client_id)
- Check token expiry

### **3. HTTPS:**
- Use HTTPS in production
- Google requires HTTPS for OAuth

### **4. Secure Session:**
- Use secure session cookies
- Set `SESSION_COOKIE_SECURE = True` in production
- Set `SESSION_COOKIE_HTTPONLY = True`

---

## 📝 Environment Variables

Create `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Flask
SECRET_KEY=your_secret_key_here
SESSION_COOKIE_SECURE=False  # True in production
```

**IMPORTANT:** Add `.env` to `.gitignore`!

---

## 🧪 Testing

### **Test Cases:**

1. **New User:**
   - Click "Đăng nhập bằng Google"
   - Select Google account
   - → New user created
   - → Logged in successfully

2. **Existing User (Email Match):**
   - User exists with same email
   - Login with Google
   - → Google ID linked to existing account
   - → Logged in successfully

3. **Existing Google User:**
   - User already linked Google
   - Login with Google
   - → Logged in successfully

4. **Cancel OAuth:**
   - Click "Đăng nhập bằng Google"
   - Cancel on Google consent screen
   - → Redirect to login with message

5. **Invalid Token:**
   - Tamper with callback parameters
   - → Error, redirect to login

---

## 🚀 Deployment Checklist

- [ ] Google Cloud project created
- [ ] OAuth credentials created
- [ ] Redirect URIs configured (including production URL)
- [ ] Dependencies installed
- [ ] Database schema updated
- [ ] Environment variables set
- [ ] HTTPS enabled (production)
- [ ] Error handling tested
- [ ] User flow tested

---

## 📚 References

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In Branding Guidelines](https://developers.google.com/identity/branding-guidelines)
- [Flask OAuth](https://flask-oauthlib.readthedocs.io/)

---

**Ready to implement!** Bắt đầu với Phase 1: Google Cloud Setup 🚀
