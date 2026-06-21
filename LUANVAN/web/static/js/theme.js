/**
 * VietVoice — Theme manager (sáng / tối toàn hệ thống)
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'tts-theme';
  var DEFAULT = 'dark';

  function normalize(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  function getTheme() {
    return normalize(localStorage.getItem(STORAGE_KEY) || DEFAULT);
  }

  function updateToggleUIs(theme) {
    var isDark = theme === 'dark';
    global.querySelectorAll('[data-vv-theme-icon]').forEach(function (el) {
      el.textContent = isDark ? 'light_mode' : 'dark_mode';
    });
  }

  function applyTheme(theme, persist) {
    var t = normalize(theme);
    var root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.classList.toggle('dark', t === 'dark');
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch (e) { /* ignore */ }
    }
    updateToggleUIs(t);
    try {
      global.dispatchEvent(new CustomEvent('vv-theme-change', { detail: { theme: t } }));
    } catch (e) { /* ignore */ }
  }

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
  }

  function bindToggles() {
    var ids = ['themeToggleBtn', 'themeToggle', 'themeToggleMobile', 'themeToggleCard'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.vvThemeBound) {
        el.dataset.vvThemeBound = '1';
        el.addEventListener('click', function (e) {
          if (id === 'themeToggleCard') e.preventDefault();
          toggleTheme();
        });
      }
    });
  }

  // Chạy sau anti-flash inline — đồng bộ UI
  applyTheme(getTheme(), false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggles);
  } else {
    bindToggles();
  }

  global.VVTheme = {
    get: getTheme,
    apply: applyTheme,
    toggle: toggleTheme,
  };
  global.toggleTheme = toggleTheme;
})(window);
