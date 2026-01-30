# 📞 Trang Liên Hệ - TTS System

## 🎯 Mục tiêu

Tạo trang liên hệ chuyên nghiệp với form gửi tin nhắn, thông tin liên hệ, FAQ và social media.

---

## ✨ Các tính năng chính

### **1. Contact Form - Form liên hệ**
- ✅ Họ và tên
- ✅ Email (with validation)
- ✅ Chủ đề (dropdown select)
- ✅ Nội dung (textarea với character counter)
- ✅ Button gửi với loading state
- ✅ Success/Error alerts

### **2. Contact Info - Thông tin liên hệ**
- ✅ Email card
- ✅ Phone card
- ✅ Address card
- ✅ Working hours card

### **3. FAQ Section**
- ✅ 4 câu hỏi thường gặp
- ✅ Grid layout responsive

### **4. Social Media**
- ✅ Facebook, Twitter, LinkedIn, YouTube
- ✅ Hover effects với brand colors

---

## 📐 Bố cục trang

```
┌────────────────────────────────────────────────────┐
│              HERO SECTION                          │
│         Liên hệ với chúng tôi                     │
└────────────────────────────────────────────────────┘

┌──────────────────────────┬─────────────────────────┐
│  CONTACT FORM (Trái)     │  CONTACT INFO (Phải)    │
│                          │                         │
│  ┌────────────────────┐  │  ┌──────────────────┐  │
│  │ 👤 Họ và tên       │  │  │ 📧 Email         │  │
│  │ 📧 Email           │  │  │ support@...      │  │
│  │ 📝 Chủ đề          │  │  │ [Gửi email]      │  │
│  │ 💬 Nội dung        │  │  └──────────────────┘  │
│  │                    │  │                         │
│  │ [Gửi tin nhắn]     │  │  ┌──────────────────┐  │
│  └────────────────────┘  │  │ 📞 Điện thoại    │  │
│                          │  │ +84 123...       │  │
│  [Success/Error Alert]   │  │ [Gọi ngay]       │  │
│                          │  └──────────────────┘  │
│                          │                         │
│                          │  ┌──────────────────┐  │
│                          │  │ 📍 Địa chỉ       │  │
│                          │  │ 123 ABC...       │  │
│                          │  │ [Xem bản đồ]     │  │
│                          │  └──────────────────┘  │
│                          │                         │
│                          │  ┌──────────────────┐  │
│                          │  │ ⏰ Giờ làm việc  │  │
│                          │  │ T2-T6: 9-18h     │  │
│                          │  └──────────────────┘  │
└──────────────────────────┴─────────────────────────┘

┌────────────────────────────────────────────────────┐
│              FAQ SECTION                           │
│  [Câu hỏi 1]  [Câu hỏi 2]  [Câu hỏi 3]  [CÂU 4]  │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│         KẾT NỐI VỚI CHÚNG TÔI                      │
│  [Facebook] [Twitter] [LinkedIn] [YouTube]         │
└────────────────────────────────────────────────────┘
```

---

## 🎨 Components

### **1. Contact Form**

#### HTML Structure:
```html
<div class="contact-form-card card-elevated">
    <div class="card-header">
        <h2>Gửi tin nhắn</h2>
    </div>
    <div class="card-body">
        <form id="contactForm">
            <!-- Form fields with icons -->
            <div class="form-group-modern">
                <label class="form-label-icon">
                    <span class="label-icon">👤</span>
                    Họ và tên
                </label>
                <input type="text" class="form-input-modern" required>
            </div>
            <!-- More fields... -->
            <button type="submit" class="btn-submit-contact">
                Gửi tin nhắn
            </button>
        </form>
        <!-- Success/Error alerts -->
    </div>
</div>
```

#### Features:
- ✅ Icon labels cho mỗi field
- ✅ Modern input styling
- ✅ Character counter (0/1000)
- ✅ Hover & focus effects
- ✅ Required validation
- ✅ Email format validation

#### Subject Options:
1. Hỗ trợ kỹ thuật
2. Câu hỏi về giá
3. Yêu cầu tính năng
4. Báo lỗi
5. Hợp tác
6. Khác

---

### **2. Contact Info Cards**

#### Card Structure:
```html
<div class="contact-info-card card-elevated">
    <div class="contact-info-icon">📧</div>
    <h3>Email</h3>
    <p>support@ttssystem.com</p>
    <a href="mailto:..." class="contact-link">Gửi email</a>
</div>
```

#### 4 Cards:
1. **📧 Email**
   - support@ttssystem.com
   - Link: mailto

2. **📞 Điện thoại**
   - +84 123 456 789
   - Link: tel

3. **📍 Địa chỉ**
   - 123 Đường ABC, Quận XYZ
   - Thành phố Hồ Chí Minh
   - Link: Google Maps

4. **⏰ Giờ làm việc**
   - T2-T6: 9:00 - 18:00
   - T7: 9:00 - 12:00
   - CN: Nghỉ

#### Styling:
- ✅ Icon 80x80px với gradient background
- ✅ Hover effect: translateY(-4px)
- ✅ Link button hover với gradient
- ✅ Box shadow transitions

---

### **3. FAQ Section**

#### Grid Layout:
```css
.faq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
}
```

#### 4 Questions:
1. ❓ Làm sao để bắt đầu sử dụng?
2. 💳 Các phương thức thanh toán nào được hỗ trợ?
3. 🎤 Có bao nhiêu giọng đọc?
4. 📱 Có ứng dụng mobile không?

#### Card Style:
- ✅ card-subtle background
- ✅ Hover: translateY(-4px) + shadow
- ✅ Icon emoji trong tiêu đề
- ✅ Responsive grid

---

### **4. Social Media Buttons**

#### Buttons:
```html
<a href="#" class="social-btn facebook">
    <span class="social-icon">f</span>
    Facebook
</a>
```

#### Brand Colors (on hover):
- **Facebook**: #1877f2
- **Twitter**: #1da1f2
- **LinkedIn**: #0077b5
- **YouTube**: #ff0000

#### Effects:
- ✅ Hover: translateY(-4px) + shadow
- ✅ Background color change
- ✅ Text color white
- ✅ Smooth transitions

---

## 🔧 API Endpoint

### **POST /api/contact**

#### Request:
```json
{
    "name": "Nguyễn Văn A",
    "email": "email@example.com",
    "subject": "support",
    "message": "Nội dung tin nhắn..."
}
```

#### Validation:
- ✅ Tất cả fields required
- ✅ Email format validation (regex)
- ✅ Message max 1000 chars

#### Response (Success):
```json
{
    "success": true,
    "message": "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong vòng 24 giờ."
}
```

#### Response (Error):
```json
{
    "success": false,
    "message": "Email không hợp lệ"
}
```

#### Current Implementation:
- Console log contact info
- Có thể mở rộng:
  - Lưu vào database
  - Gửi email notification
  - Tích hợp CRM

---

## 📱 JavaScript Features

### **1. Character Counter**

```javascript
messageTextarea.addEventListener('input', () => {
    const count = messageTextarea.value.length;
    charCount.textContent = count;
    
    if (count > 1000) {
        // Cắt text và đổi màu đỏ
        charCount.style.color = '#e53e3e';
        messageTextarea.value = messageTextarea.value.substring(0, 1000);
    } else if (count > 900) {
        charCount.style.color = '#f6ad55'; // Orange warning
    } else {
        charCount.style.color = '#667eea'; // Blue normal
    }
});
```

### **2. Form Submit**

- ✅ Prevent default
- ✅ Validate all fields
- ✅ Disable button during submit
- ✅ Show loading state
- ✅ API call with fetch
- ✅ Show success/error alert
- ✅ Reset form on success
- ✅ Scroll to alert
- ✅ Auto-hide after 5s

### **3. Alert System**

```javascript
function showSuccess(message) {
    // Show success alert
    // Scroll into view
    // Auto hide after 5s
}

function showError(message) {
    // Show error alert
    // Scroll into view
    // Auto hide after 5s
}
```

---

## 🎨 CSS Highlights

### **Color Scheme:**
```css
/* Success */
background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
color: #22543d;
border: 2px solid #48bb78;

/* Error */
background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
color: #742a2a;
border: 2px solid #f56565;

/* Form elements */
border: 2px solid #e2e8f0;
focus: border-color: #667eea;
focus: box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
```

### **Hover Effects:**
```css
/* Cards */
transform: translateY(-4px);
box-shadow: var(--shadow-xl);

/* Buttons */
transform: translateY(-2px);
box-shadow: var(--shadow-lg);

/* Links */
background: var(--primary-gradient);
color: var(--text-white);
```

### **Animations:**
```css
/* Alerts slide in */
animation: slideInDown 0.3s ease;

/* Smooth transitions */
transition: all var(--transition-base);
```

---

## 📂 Files đã tạo/cập nhật

### **1. Backend:**
- ✅ `app.py` - Thêm routes:
  - `@app.route('/contact')` - Render template
  - `@app.route('/api/contact', methods=['POST'])` - Submit form

### **2. Frontend:**
- ✅ `templates/contact.html` - Template đầy đủ
- ✅ `static/js/contact.js` - Form handling
- ✅ `static/css/style.css` - Thêm ~350 dòng CSS

### **3. Navigation:**
- ✅ `templates/base.html` - Thêm link "Liên hệ"

### **4. Documentation:**
- ✅ `TRANG_LIEN_HE.md` - Tài liệu này

---

## 📱 Responsive Design

### **Desktop (> 1024px)**
- Contact grid: 2 columns (1.2fr / 0.8fr)
- FAQ grid: auto-fit minmax(280px, 1fr)
- Social links: horizontal

### **Tablet (768px - 1024px)**
- Contact grid: 1 column (stacked)
- FAQ grid: auto-fit
- Social links: horizontal

### **Mobile (< 768px)**
- Contact grid: 1 column
- FAQ grid: 1 column
- Social links: vertical (full width)
- Icon size: 60x60px

---

## 🚀 Cách sử dụng

### **Truy cập trang:**
```
http://localhost:5000/contact
```

### **Navigation:**
- Link "Liên hệ" trong navbar
- Có sẵn cho cả logged in và logged out users

### **Gửi tin nhắn:**
1. Điền đầy đủ form
2. Chọn chủ đề
3. Nhập nội dung (tối đa 1000 ký tự)
4. Click "Gửi tin nhắn"
5. Xem thông báo success/error

---

## 🔮 Tính năng có thể mở rộng

### **Database:**
```sql
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Email Notification:**
- Gửi email cho admin khi có contact mới
- Gửi auto-reply cho người gửi
- Template email đẹp

### **Admin Panel:**
- Xem danh sách contacts
- Đánh dấu đã đọc/đã reply
- Trả lời trực tiếp

### **Attachments:**
- Upload file đính kèm
- Screenshot, logs, etc.

### **Live Chat:**
- Tích hợp chat real-time
- WebSocket support

---

## ✅ Checklist

- [x] Tạo route `/contact` trong app.py
- [x] Tạo API endpoint `/api/contact`
- [x] Tạo template contact.html
- [x] Tạo contact.js với form handling
- [x] Thêm CSS (~350 dòng)
- [x] Thêm link vào navigation
- [x] Form validation (client-side)
- [x] Form validation (server-side)
- [x] Character counter real-time
- [x] Success/Error alerts
- [x] Loading states
- [x] Responsive design
- [x] FAQ section
- [x] Social media buttons
- [x] Documentation đầy đủ

---

**🎉 Trang liên hệ đã hoàn thành! Refresh trình duyệt để xem!**

Giờ người dùng có thể dễ dàng liên hệ với bạn qua form chuyên nghiệp! 📞✨
