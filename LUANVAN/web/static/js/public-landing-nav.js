(function () {
  'use strict';

  function initPublicLandingNav() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    if (!mobileMenu) return;

    function openMobileMenu() {
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    window.closeMobileMenu = closeMobileMenu;

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', openMobileMenu);
    }
    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    document.querySelectorAll('.js-landing-home').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.indexOf('#') === 0) return;
        e.preventDefault();
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        window.location.assign(href + sep + '_=' + Date.now());
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicLandingNav);
  } else {
    initPublicLandingNav();
  }
})();
