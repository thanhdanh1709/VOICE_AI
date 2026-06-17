/**
 * Sidebar Collapse — shared utility for all pages with a sidebar.
 * Requires: element with id="mainSidebar" and id="sidebarMainContent"
 * Toggle button: id="sidebarCollapseBtn"
 */
(function () {
  const STORAGE_KEY = 'vv_sidebar_collapsed';

  function isCollapsed() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  function applyState(collapsed, animate) {
    const sidebar = document.getElementById('mainSidebar');
    const content = document.getElementById('sidebarMainContent');
    const btn     = document.getElementById('sidebarCollapseBtn');
    if (!sidebar) return;
    // On mobile (< 768px) always ignore collapse
    if (window.innerWidth < 768) return;

    if (!animate) {
      sidebar.style.transition = 'none';
      if (content) content.style.transition = 'none';
    } else {
      sidebar.style.transition  = 'width 0.22s ease';
      if (content) content.style.transition = 'margin-left 0.22s ease';
    }

    if (collapsed) {
      sidebar.style.width    = '64px';
      sidebar.style.overflow = 'hidden';
      if (content) {
        content.style.marginLeft = '64px';
        content.style.maxWidth   = 'calc(100% - 64px)';
      }
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-logo-text').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = 'none'; });
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">chevron_right</span>';
    } else {
      sidebar.style.width    = '240px';
      sidebar.style.overflow = '';
      if (content) {
        content.style.marginLeft = '240px';
        content.style.maxWidth   = 'calc(100% - 240px)';
      }
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-logo-text').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = ''; });
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">chevron_left</span>';
    }

    // Restore transition after brief delay to prevent initial flash
    if (!animate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (sidebar) sidebar.style.transition = 'width 0.22s ease';
          if (content) content.style.transition = 'margin-left 0.22s ease';
        });
      });
    }
  }

  function toggle() {
    const next = !isCollapsed();
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    applyState(next, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Apply saved state immediately (no animation on load)
    applyState(isCollapsed(), false);

    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) btn.addEventListener('click', toggle);
  });
})();
