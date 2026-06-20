/**
 * Sidebar Collapse — shared utility for all pages with a sidebar.
 * Requires: element with id="mainSidebar" and id="content" (or legacy id="sidebarMainContent")
 * Toggle button: id="sidebarCollapseBtn"
 */
(function () {
  const STORAGE_KEY = 'vv_sidebar_collapsed';

  function getMainContent() {
    return document.getElementById('content') || document.getElementById('sidebarMainContent');
  }

  function isCollapsed() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  function getSidebarWidth(collapsed) {
    return collapsed ? 64 : 240;
  }

  function applyState(collapsed, animate) {
    const sidebar = document.getElementById('mainSidebar');
    const content = getMainContent();
    const btn     = document.getElementById('sidebarCollapseBtn');
    if (!sidebar) return;

    const width = getSidebarWidth(collapsed);

    if (window.innerWidth < 768) {
      if (content) {
        content.style.marginLeft = '0';
        content.style.maxWidth   = '100%';
      }
      return;
    }

    if (!animate) {
      sidebar.style.transition = 'none';
      if (content) content.style.transition = 'none';
    } else {
      sidebar.style.transition  = 'width 0.22s ease';
      if (content) content.style.transition = 'margin-left 0.22s ease';
    }

    sidebar.style.width = width + 'px';
    if (content) {
      content.style.marginLeft = width + 'px';
      content.style.maxWidth   = 'calc(100% - ' + width + 'px)';
    }

    if (collapsed) {
      sidebar.style.overflow = 'hidden';
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-logo-text').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = 'none'; });
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">chevron_right</span>';
    } else {
      sidebar.style.overflow = '';
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-logo-text').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = ''; });
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">chevron_left</span>';
    }

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
    applyState(isCollapsed(), false);

    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) btn.addEventListener('click', toggle);

    window.addEventListener('resize', function () {
      applyState(isCollapsed(), false);
    });
  });

  window.VVSidebar = {
    reapply: function () {
      applyState(isCollapsed(), false);
    },
  };
})();
