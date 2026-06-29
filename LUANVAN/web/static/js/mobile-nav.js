(function () {
  'use strict';

  function toggleMobileNav() {
    var drawer = document.getElementById('mobileNavDrawer');
    var overlay = document.getElementById('mobileNavOverlay');
    var icon = document.getElementById('mobileMenuIcon');
    if (!drawer || !overlay) return;
    var isOpen = !drawer.classList.contains('hidden');
    if (isOpen) {
      drawer.classList.add('hidden');
      overlay.classList.add('hidden');
      if (icon) icon.textContent = 'menu';
    } else {
      drawer.classList.remove('hidden');
      overlay.classList.remove('hidden');
      if (icon) icon.textContent = 'close';
    }
  }

  function closeMobileNav() {
    var drawer = document.getElementById('mobileNavDrawer');
    var overlay = document.getElementById('mobileNavOverlay');
    var icon = document.getElementById('mobileMenuIcon');
    if (drawer) drawer.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (icon) icon.textContent = 'menu';
  }

  window.toggleMobileNav = toggleMobileNav;
  window.closeMobileNav = closeMobileNav;

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768) closeMobileNav();
  });
})();
