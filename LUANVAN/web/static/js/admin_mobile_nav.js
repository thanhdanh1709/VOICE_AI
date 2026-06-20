/**
 * Mobile nav drawer for admin console pages (ac-layout).
 */
(function () {
  'use strict';

  function toggleAdminMobileNav() {
    const drawer = document.getElementById('adminMobileDrawer');
    const overlay = document.getElementById('adminMobileOverlay');
    const icon = document.getElementById('adminMobileMenuIcon');
    if (!drawer || !overlay) return;
    const isOpen = !drawer.classList.contains('hidden');
    if (isOpen) {
      drawer.classList.add('hidden');
      overlay.classList.add('hidden');
      if (icon) icon.textContent = 'menu';
      document.body.classList.remove('ac-mobile-nav-open');
    } else {
      drawer.classList.remove('hidden');
      overlay.classList.remove('hidden');
      if (icon) icon.textContent = 'close';
      document.body.classList.add('ac-mobile-nav-open');
    }
  }

  function closeAdminMobileNav() {
    const drawer = document.getElementById('adminMobileDrawer');
    const overlay = document.getElementById('adminMobileOverlay');
    const icon = document.getElementById('adminMobileMenuIcon');
    if (drawer) drawer.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (icon) icon.textContent = 'menu';
    document.body.classList.remove('ac-mobile-nav-open');
  }

  window.toggleAdminMobileNav = toggleAdminMobileNav;
  window.closeAdminMobileNav = closeAdminMobileNav;

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) closeAdminMobileNav();
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#adminMobileDrawer .admin-nav-link').forEach((link) => {
      link.addEventListener('click', () => closeAdminMobileNav());
    });
  });
})();
