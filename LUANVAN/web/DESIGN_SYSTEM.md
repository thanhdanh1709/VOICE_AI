# 🎨 TTS System - Design System

## 📐 Design Principles

1. **Consistency** - Thống nhất trong toàn bộ ứng dụng
2. **Clarity** - Rõ ràng, dễ hiểu
3. **Efficiency** - Hiệu quả, nhanh chóng
4. **Accessibility** - Dễ tiếp cận, thân thiện với người dùng
5. **Modern** - Hiện đại, chuyên nghiệp

---

## 🎨 Brand Identity

### Logo & Name
- **Brand Name**: VoiceAI TTS
- **Tagline**: "Biến văn bản thành giọng nói tự nhiên"
- **Icon**: 🎤 hoặc tạo logo SVG

### Brand Colors

#### Primary Colors
```css
--primary: #667eea        /* Purple - Main brand color */
--primary-dark: #5a67d8   /* Darker purple for hover */
--primary-light: #7f9cf5  /* Lighter purple for backgrounds */
```

#### Secondary Colors
```css
--secondary: #48bb78      /* Green - Success, completed */
--accent: #f6ad55         /* Orange - Warnings, highlights */
--danger: #fc8181         /* Red - Errors, delete */
```

#### Neutral Colors
```css
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827
```

#### Semantic Colors
```css
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

---

## 📝 Typography

### Font Families
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-heading: 'Inter', sans-serif
--font-mono: 'Fira Code', 'Courier New', monospace
```

### Font Sizes
```css
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.875rem     /* 14px */
--text-base: 1rem       /* 16px */
--text-lg: 1.125rem     /* 18px */
--text-xl: 1.25rem      /* 20px */
--text-2xl: 1.5rem      /* 24px */
--text-3xl: 1.875rem    /* 30px */
--text-4xl: 2.25rem     /* 36px */
--text-5xl: 3rem        /* 48px */
```

### Font Weights
```css
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

### Line Heights
```css
--leading-none: 1
--leading-tight: 1.25
--leading-snug: 1.375
--leading-normal: 1.5
--leading-relaxed: 1.625
--leading-loose: 2
```

---

## 📏 Spacing System

### Spacing Scale (8px base)
```css
--space-0: 0
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
--space-20: 5rem     /* 80px */
```

---

## 🔘 Border Radius

```css
--radius-none: 0
--radius-sm: 0.125rem    /* 2px */
--radius-base: 0.375rem  /* 6px */
--radius-md: 0.5rem      /* 8px */
--radius-lg: 0.75rem     /* 12px */
--radius-xl: 1rem        /* 16px */
--radius-2xl: 1.5rem     /* 24px */
--radius-full: 9999px    /* Circle */
```

---

## 🌑 Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

---

## 🎯 Components

### 1. Buttons

#### Button Sizes
- **Small**: 32px height, 12px 16px padding
- **Medium** (default): 40px height, 12px 24px padding
- **Large**: 48px height, 16px 32px padding

#### Button Variants
- **Primary**: Purple gradient, white text
- **Secondary**: Green background, white text
- **Outline**: Border only, purple text
- **Ghost**: Transparent, purple text
- **Danger**: Red background, white text

#### Button States
- **Normal**: Default appearance
- **Hover**: Slightly darker, scale(1.02)
- **Active**: Pressed, scale(0.98)
- **Disabled**: Opacity 0.6, no hover
- **Loading**: Spinner icon

### 2. Cards

#### Card Types
- **Default**: White background, shadow
- **Elevated**: Larger shadow, hover lift
- **Outlined**: Border, no shadow
- **Featured**: Gradient border

#### Card Sections
- **Header**: Title + actions
- **Body**: Main content
- **Footer**: Buttons + metadata

### 3. Forms

#### Input Styles
- **Text/Number**: Border, focus ring
- **Textarea**: Resizable, min-height
- **Select**: Custom dropdown arrow
- **Checkbox/Radio**: Custom styled
- **File Upload**: Drag & drop zone

#### Form Layout
- **Label**: Above input, semibold
- **Helper Text**: Below input, gray
- **Error Text**: Below input, red
- **Success Text**: Below input, green

### 4. Navigation

#### Navbar
- **Height**: 64px
- **Logo**: Left side
- **Menu**: Right side, horizontal
- **Mobile**: Hamburger menu

#### Sidebar (Admin)
- **Width**: 240px
- **Collapsible**: Toggle button
- **Icons**: With labels

### 5. Modals

#### Modal Sizes
- **Small**: 400px max-width
- **Medium**: 600px max-width
- **Large**: 800px max-width
- **Full**: 90% width

#### Modal Structure
- **Overlay**: Semi-transparent black
- **Container**: White, rounded, shadow
- **Header**: Title + close button
- **Body**: Scrollable content
- **Footer**: Action buttons

---

## 📱 Responsive Breakpoints

```css
--breakpoint-sm: 640px   /* Phone landscape */
--breakpoint-md: 768px   /* Tablet portrait */
--breakpoint-lg: 1024px  /* Tablet landscape */
--breakpoint-xl: 1280px  /* Desktop */
--breakpoint-2xl: 1536px /* Large desktop */
```

---

## ⚡ Animations & Transitions

### Durations
```css
--duration-fast: 150ms
--duration-base: 200ms
--duration-slow: 300ms
--duration-slower: 500ms
```

### Easings
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Common Animations
- **Fade In**: opacity 0 → 1
- **Slide Up**: translateY(20px) → 0
- **Scale**: scale(0.95) → scale(1)
- **Bounce**: Slight bounce effect on hover

---

## 🎭 Dark Mode

### Dark Mode Colors
```css
[data-theme="dark"] {
  --bg-primary: #111827
  --bg-secondary: #1f2937
  --bg-tertiary: #374151
  
  --text-primary: #f9fafb
  --text-secondary: #e5e7eb
  --text-tertiary: #9ca3af
  
  --border: #374151
}
```

---

## ♿ Accessibility

### Focus States
- **Visible**: Always show focus ring
- **Color**: Primary color, 2px offset
- **Keyboard**: Tab navigation

### Contrast Ratios
- **Normal Text**: 4.5:1 minimum
- **Large Text**: 3:1 minimum
- **UI Components**: 3:1 minimum

### Screen Reader
- **Labels**: All inputs have labels
- **ARIA**: Proper ARIA attributes
- **Alt Text**: All images have alt text

---

## 📊 Usage Examples

### Button Example
```html
<button class="btn btn-primary btn-md">
  <span class="btn-icon">✨</span>
  <span class="btn-text">Chuyển đổi ngay</span>
</button>
```

### Card Example
```html
<div class="card card-elevated">
  <div class="card-header">
    <h3 class="card-title">Giọng của tôi</h3>
    <button class="btn btn-ghost btn-sm">Xem tất cả</button>
  </div>
  <div class="card-body">
    <!-- Content -->
  </div>
  <div class="card-footer">
    <span class="text-sm text-gray-500">3 giọng</span>
  </div>
</div>
```

### Form Example
```html
<div class="form-group">
  <label for="voiceName" class="form-label">
    Tên giọng <span class="required">*</span>
  </label>
  <input 
    type="text" 
    id="voiceName" 
    class="form-input" 
    placeholder="VD: Giọng của tôi"
  >
  <span class="form-hint">Đặt tên dễ nhớ để phân biệt các giọng</span>
</div>
```

---

## 🚀 Implementation Checklist

- [ ] Import Google Font (Inter)
- [ ] Create CSS variables
- [ ] Build component library
- [ ] Update all templates
- [ ] Test responsive design
- [ ] Test dark mode
- [ ] Test accessibility
- [ ] Optimize performance

---

**Last Updated**: 2026-01-30
**Version**: 2.0.0
**Status**: ✅ Ready for Implementation
