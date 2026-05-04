/**
 * Main JavaScript - TTS System
 * JavaScript chung cho toàn bộ ứng dụng
 */

// ========================================
// DARK MODE HANDLER
// ========================================
const ThemeManager = {
    STORAGE_KEY: 'tts-theme',
    THEME_LIGHT: 'light',
    THEME_DARK: 'dark',
    
    init() {
        // Landing page luôn dark, không phụ thuộc theme toggle
        const path = window.location.pathname;
        const isLanding = (path === '/' || path === '/landing');
        const savedTheme = this.getSavedTheme();
        const theme = isLanding ? this.THEME_DARK : (savedTheme || this.THEME_DARK);
        this.setTheme(theme);

        // Setup toggle button — ẩn trên landing page
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            if (isLanding) {
                toggleBtn.style.display = 'none';
            } else {
                toggleBtn.addEventListener('click', () => this.toggleTheme());
            }
        }
        
        // Listen for system theme changes
        this.watchSystemTheme();
    },
    
    getSavedTheme() {
        return localStorage.getItem(this.STORAGE_KEY);
    },
    
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.THEME_DARK;
        }
        return this.THEME_LIGHT;
    },
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === this.THEME_DARK ? this.THEME_LIGHT : this.THEME_DARK;
        this.setTheme(newTheme);
    },
    
    watchSystemTheme() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                // Only auto-switch if user hasn't manually set a theme
                if (!this.getSavedTheme()) {
                    const newTheme = e.matches ? this.THEME_DARK : this.THEME_LIGHT;
                    this.setTheme(newTheme);
                }
            });
        }
    }
};

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
const utils = {
    showMessage: (message, type = 'success') => {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    },
    
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    },
    
    // Get current theme
    getCurrentTheme: () => {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },
    
    // Check if dark mode is active
    isDarkMode: () => {
        return utils.getCurrentTheme() === 'dark';
    }
};

// Export for use in other scripts
window.utils = utils;
window.ThemeManager = ThemeManager;
