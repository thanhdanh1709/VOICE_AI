(function () {
  if (window.innerWidth < 768) return;
  var collapsed = localStorage.getItem('vv_sidebar_collapsed') === '1';
  document.documentElement.style.setProperty('--vv-sidebar-width', (collapsed ? 64 : 240) + 'px');
})();
