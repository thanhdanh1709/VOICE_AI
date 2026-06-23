/**
 * Sidebar Collapse - shared utility for all pages with a sidebar.
 * Requires: element with id="mainSidebar" and id="content" (or legacy id="sidebarMainContent")
 * Toggle button: id="sidebarCollapseBtn" (floating, outside sidebar)
 */
(function () {
  const STORAGE_KEY = 'vv_sidebar_collapsed';
  const W_EXPANDED = 240;
  const W_COLLAPSED = 64;

  function getMainContent() {
    return document.getElementById('content') || document.getElementById('sidebarMainContent');
  }
  function getFooter() {
    return document.querySelector('.zf-site-footer');
  }

  function isCollapsed() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  function applyState(collapsed, animate) {
    const sidebar = document.getElementById('mainSidebar');
    const content = getMainContent();
    const footer  = getFooter();
    const btn     = document.getElementById('sidebarCollapseBtn');
    if (!sidebar) return;

    const width = collapsed ? W_COLLAPSED : W_EXPANDED;
    const isMobile = window.innerWidth < 768;

    /* ── Transitions ── */
    const dur = animate ? '0.22s ease' : 'none';
    sidebar.style.transition = 'width ' + dur;
    if (content) content.style.transition = 'margin-left ' + dur + ', max-width ' + dur;
    if (footer)  footer.style.transition  = 'margin-left ' + dur + ', max-width ' + dur;
    if (btn)     btn.style.transition     = 'color 0.15s ease, background 0.15s ease';

    /* ── Sidebar width ── */
    sidebar.style.overflow = 'hidden';
    sidebar.style.width = isMobile ? '0' : width + 'px';

    /* ── Content & Footer margin ── */
    const ml = isMobile ? '0' : width + 'px';
    const mw = isMobile ? '100%' : 'calc(100% - ' + width + 'px)';
    if (content) { content.style.marginLeft = ml; content.style.maxWidth = mw; }
    if (footer)  { footer.style.marginLeft  = ml; footer.style.maxWidth  = mw; }

    /* ── Toggle button icon ── */
    if (btn) {
      btn.querySelector('.material-symbols-outlined').textContent = collapsed
        ? 'left_panel_open' : 'left_panel_close';
    }

    /* ── Show/hide text labels ── */
    if (collapsed) {
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-logo-text:not(#sidebarLogoText)').forEach(el => { el.style.display = 'none'; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = 'none'; });
      /* Brand collapsed: icon căn giữa, ẩn text + collapse btn */
      const brand = document.getElementById('sidebarBrand');
      if (brand) { brand.style.padding = '14px 0'; brand.style.justifyContent = 'center'; }
      const logoText = document.getElementById('sidebarLogoText');
      if (logoText) logoText.style.display = 'none';
      if (btn) btn.style.display = 'none';
      /* Hiện mini toggle bên dưới icon logo */
      let miniBtn = document.getElementById('sidebarMiniToggle');
      if (!miniBtn) {
        miniBtn = document.createElement('button');
        miniBtn.id = 'sidebarMiniToggle';
        miniBtn.className = 'flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all mx-auto mb-1';
        miniBtn.title = 'Mở sidebar';
        miniBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">left_panel_open</span>';
        miniBtn.addEventListener('click', toggle);
        brand.parentNode.insertBefore(miniBtn, brand.nextSibling);
      }
      miniBtn.style.display = 'flex';
      /* User row: center avatar */
      const userRow = sidebar.querySelector('.sb-user-row');
      if (userRow) { userRow.style.padding = '0 10px 12px'; }
      const userInner = userRow ? userRow.querySelector('div') : null;
      if (userInner) { userInner.style.justifyContent = 'center'; }
    } else {
      sidebar.querySelectorAll('.sb-label').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-logo-text:not(#sidebarLogoText)').forEach(el => { el.style.display = ''; });
      sidebar.querySelectorAll('.sb-upgrade').forEach(el => { el.style.display = ''; });
      /* Brand expanded: restore */
      const brand = document.getElementById('sidebarBrand');
      if (brand) { brand.style.padding = ''; brand.style.justifyContent = ''; }
      const logoText = document.getElementById('sidebarLogoText');
      if (logoText) logoText.style.display = '';
      if (btn) btn.style.display = '';
      const miniBtn = document.getElementById('sidebarMiniToggle');
      if (miniBtn) miniBtn.style.display = 'none';
      const userRow = sidebar.querySelector('.sb-user-row');
      if (userRow) { userRow.style.padding = ''; }
      const userInner = userRow ? userRow.querySelector('div') : null;
      if (userInner) { userInner.style.justifyContent = ''; }
    }

    /* ── Re-enable transitions after instant apply ── */
    if (!animate) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        sidebar.style.transition = 'width 0.22s ease';
        if (content) content.style.transition = 'margin-left 0.22s ease, max-width 0.22s ease';
        if (footer)  footer.style.transition  = 'margin-left 0.22s ease, max-width 0.22s ease';
        if (btn)     btn.style.transition     = 'color 0.15s ease, background 0.15s ease';
      }));
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
    window.addEventListener('resize', function () { applyState(isCollapsed(), false); });
  });

  window.VVSidebar = { reapply: function () { applyState(isCollapsed(), false); } };
})();
