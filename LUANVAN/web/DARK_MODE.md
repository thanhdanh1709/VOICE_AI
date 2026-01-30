# 🌙 Dark Mode - Chế Độ Tối

## 🎯 Tổng quan

Đã thêm **chế độ tối (Dark Mode)** hoàn chỉnh cho toàn bộ website với:
- ✅ Toggle button đẹp trong navbar
- ✅ Lưu preference vào localStorage
- ✅ Tự động theo system preference
- ✅ Smooth transitions
- ✅ Apply cho tất cả components

---

## 🎨 Features

### **1. Theme Toggle Button**
- **Vị trí**: Navbar (bên cạnh menu)
- **Icon**: ☀️ (Light) / 🌙 (Dark)
- **Animation**: Rotate + Scale effect
- **Hover**: Glow effect

### **2. Auto Theme Detection**
- **System Preference**: Tự động detect OS theme
- **Save Preference**: Lưu vào localStorage
- **Remember**: Ghi nhớ lựa chọn của user

### **3. Smooth Transitions**
- **Duration**: 0.3s
- **Easing**: ease
- **Apply to**: Background, text, borders

---

## 📂 Files đã tạo/cập nhật

### **1. HTML - base.html**
```html
<!-- Thêm data-theme attribute -->
<html lang="vi" data-theme="light">

<!-- Theme toggle button -->
<button id="themeToggle" class="theme-toggle">
    <span class="theme-icon sun">☀️</span>
    <span class="theme-icon moon">🌙</span>
</button>
```

### **2. CSS - style.css**

#### **Dark Mode Variables:**
```css
[data-theme="dark"] {
    /* Backgrounds - Dark */
    --bg-gradient: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
    --bg-light: #2d3748;
    --bg-white: #1a202c;
    --bg-glass: rgba(26, 32, 44, 0.7);
    
    /* Text - Light */
    --text-primary: #e2e8f0;
    --text-secondary: #cbd5e0;
    --text-light: #a0aec0;
    
    /* Shadows - Darker */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.6);
}
```

#### **Toggle Button Styles:**
```css
.theme-toggle {
    background: transparent;
    border: 2px solid var(--primary-blue);
    border-radius: 50%;
    width: 45px;
    height: 45px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.theme-toggle:hover {
    transform: scale(1.1) rotate(10deg);
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
}
```

#### **Dark Mode Component Styles:**
- Cards: `rgba(45, 55, 72, 0.8)`
- Inputs: `rgba(26, 32, 44, 0.6)`
- Borders: `rgba(255, 255, 255, 0.1)`
- Navbar: `rgba(26, 32, 44, 0.8)`
- Tables, modals, alerts...

### **3. JavaScript - main.js**

#### **ThemeManager Class:**
```javascript
const ThemeManager = {
    STORAGE_KEY: 'tts-theme',
    THEME_LIGHT: 'light',
    THEME_DARK: 'dark',
    
    init() {
        const savedTheme = this.getSavedTheme();
        const theme = savedTheme || this.getSystemTheme();
        this.setTheme(theme);
        
        // Setup toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        this.watchSystemTheme();
    },
    
    getSavedTheme() {
        return localStorage.getItem(this.STORAGE_KEY);
    },
    
    getSystemTheme() {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.THEME_DARK;
        }
        return this.THEME_LIGHT;
    },
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },
    
    watchSystemTheme() {
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', e => {
                if (!this.getSavedTheme()) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    this.setTheme(newTheme);
                }
            });
    }
};

// Initialize on load
ThemeManager.init();
```

---

## 🎨 Color Scheme

### **Light Mode (Default):**
| Element | Color |
|---------|-------|
| Background | `#f5f7fa` → `#c3cfe2` (gradient) |
| Card | `#ffffff` |
| Text Primary | `#2d3748` |
| Text Secondary | `#4a5568` |
| Border | `rgba(0,0,0,0.1)` |

### **Dark Mode:**
| Element | Color |
|---------|-------|
| Background | `#1a202c` → `#2d3748` (gradient) |
| Card | `rgba(45, 55, 72, 0.8)` |
| Text Primary | `#e2e8f0` |
| Text Secondary | `#cbd5e0` |
| Border | `rgba(255,255,255,0.1)` |

---

## 🚀 Cách sử dụng

### **User Perspective:**

1. **Toggle Manual:**
   - Click nút ☀️/🌙 trong navbar
   - Theme switch ngay lập tức
   - Preference được lưu

2. **Auto Detection:**
   - Lần đầu: Theo OS theme
   - Sau khi manual toggle: Theo preference
   - OS thay đổi: Không tự động switch (respect user choice)

### **Developer Perspective:**

#### **Get current theme:**
```javascript
const theme = utils.getCurrentTheme(); // 'light' or 'dark'
const isDark = utils.isDarkMode(); // true/false
```

#### **Listen for theme changes:**
```javascript
window.addEventListener('themeChanged', (e) => {
    console.log('Theme changed to:', e.detail.theme);
    // Do something when theme changes
});
```

#### **Manually set theme:**
```javascript
ThemeManager.setTheme('dark');
ThemeManager.setTheme('light');
```

#### **Toggle theme:**
```javascript
ThemeManager.toggleTheme();
```

---

## 📱 Components với Dark Mode

### **✅ Styled Components:**

1. **Navbar**
   - Background: Glass effect dark
   - Border: Light opacity

2. **Cards**
   - All card types: `.card`, `.card-elevated`, `.card-subtle`
   - Input/Output cards
   - Voice selection cards
   - Stats cards
   - Pricing cards
   - Contact cards
   - FAQ cards

3. **Forms**
   - All inputs: `input`, `textarea`, `select`
   - Form groups
   - Labels
   - Placeholders

4. **Tables**
   - Headers: Dark background
   - Rows: Dark with hover
   - Borders: Light opacity

5. **Modals**
   - Background overlay
   - Content card

6. **Buttons**
   - Primary gradient (unchanged)
   - Secondary: Dark background
   - Link buttons

7. **Alerts**
   - Success: Green with dark overlay
   - Error: Red with dark overlay
   - Info: Blue with dark overlay

8. **Special Components**
   - Audio player
   - Status badges
   - Charts/graphs
   - Loading spinners
   - Empty states
   - Social buttons
   - Quick links

9. **Footer**
   - Dark background
   - Light text

10. **Scrollbar**
    - Track: Dark
    - Thumb: Primary blue

---

## 🎭 Toggle Button Animation

### **States:**

**Light Mode (Default):**
```
┌─────────┐
│   ☀️   │  ← Sun visible, rotated 0°
│         │     Moon hidden, rotated 180°
└─────────┘
```

**Dark Mode:**
```
┌─────────┐
│   🌙   │  ← Moon visible, rotated 0°
│         │     Sun hidden, rotated -180°
└─────────┘
```

### **Hover Effect:**
```css
transform: scale(1.1) rotate(10deg);
box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
border-color: var(--primary-purple);
```

---

## 📊 LocalStorage

### **Key:** `tts-theme`

### **Values:**
- `"light"` - Light mode
- `"dark"` - Dark mode
- `null` - Follow system preference

### **Example:**
```javascript
// Get
const theme = localStorage.getItem('tts-theme');

// Set
localStorage.setItem('tts-theme', 'dark');

// Remove (revert to system)
localStorage.removeItem('tts-theme');
```

---

## 🔧 Customization

### **Thêm dark mode cho component mới:**

```css
[data-theme="dark"] .your-component {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
}
```

### **Thêm hover cho dark mode:**

```css
[data-theme="dark"] .your-component:hover {
    background: rgba(45, 55, 72, 0.9);
}
```

### **Override gradient trong dark mode:**

```css
[data-theme="dark"] .gradient-element {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Gradient không đổi, vẫn vibrant */
}
```

---

## 🎯 Best Practices

### **1. Contrast:**
- Light mode: Dark text on light bg
- Dark mode: Light text on dark bg
- Min contrast ratio: 4.5:1 (WCAG AA)

### **2. Gradients:**
- Keep primary gradients vibrant
- Don't dim too much
- Use opacity overlays for cards

### **3. Shadows:**
- Light mode: Subtle (0.05-0.15 opacity)
- Dark mode: Darker (0.3-0.6 opacity)
- Use black shadows only

### **4. Borders:**
- Light mode: `rgba(0,0,0,0.1)`
- Dark mode: `rgba(255,255,255,0.1)`
- Keep opacity low for subtle effect

### **5. Transitions:**
- Apply to all theme-dependent properties
- Duration: 0.3s
- Easing: ease
- Avoid jarring changes

---

## 🐛 Troubleshooting

### **Issue: Theme không lưu**
**Solution:** Check localStorage permissions, console errors

### **Issue: Toggle button không hoạt động**
**Solution:** Check if `main.js` loaded, check button ID

### **Issue: Một số element không đổi màu**
**Solution:** Add `[data-theme="dark"]` selector for that element

### **Issue: Transition quá nhanh/chậm**
**Solution:** Adjust `transition` duration in CSS

### **Issue: Flash of wrong theme on load**
**Solution:** ThemeManager.init() runs early, check script loading order

---

## 📈 Performance

### **Impact:**
- ✅ Minimal: Only CSS variables change
- ✅ No re-render: Pure CSS transitions
- ✅ LocalStorage: Instant read
- ✅ No API calls

### **Optimization:**
- Theme applied before paint (no FOUC)
- CSS transitions hardware-accelerated
- localStorage cached by browser

---

## ✅ Testing Checklist

- [ ] Toggle button visible in navbar
- [ ] Click toggle switches theme
- [ ] Theme persists after refresh
- [ ] System preference detected on first visit
- [ ] All cards have dark background
- [ ] All text is readable (contrast)
- [ ] Inputs have dark background
- [ ] Tables styled correctly
- [ ] Modals work in dark mode
- [ ] Buttons visible and clickable
- [ ] Gradients still vibrant
- [ ] Shadows visible
- [ ] Borders visible but subtle
- [ ] Transitions smooth (0.3s)
- [ ] No flash on page load
- [ ] Works on all pages:
  - [ ] Login/Register
  - [ ] Home/Index
  - [ ] Audio Library
  - [ ] History
  - [ ] Pricing
  - [ ] Contact
  - [ ] Admin (if applicable)

---

## 🎉 Kết quả

**Light Mode:**
- ✅ Sáng, tươi, professional
- ✅ High contrast
- ✅ Dễ đọc ban ngày

**Dark Mode:**
- ✅ Tối, sang trọng, modern
- ✅ Giảm mỏi mắt ban đêm
- ✅ Tiết kiệm pin (OLED screens)

---

**Bây giờ website có dark mode hoàn chỉnh!** 🌙✨

Click nút ☀️/🌙 trong navbar để thử! 🎨
