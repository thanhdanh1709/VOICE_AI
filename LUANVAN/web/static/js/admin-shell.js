/**
 * Admin shell — module views (Phase 1)
 */
(function () {
    'use strict';

    const VIEW_META = {
        dashboard: {
            titleKey: 'admin.overview',
            titleFb: 'Tổng quan hệ thống',
            subtitleKey: 'admin.overview.sub',
            subtitleFb: 'Thống kê và hoạt động gần đây của VietVoice AI.',
        },
        lifecycle: {
            titleKey: 'admin.nav.lifecycle',
            titleFb: 'Vòng đời tài khoản',
            subtitleKey: 'admin.lifecycle.sub',
            subtitleFb: 'Yêu cầu xóa và tài khoản vô hiệu hóa 30 ngày.',
        },
        users: {
            titleKey: 'admin.section.users',
            titleFb: 'Quản lý người dùng',
            subtitleKey: 'admin.users.sub',
            subtitleFb: 'Tìm kiếm, khóa và quản lý vai trò người dùng.',
        },
        voices: {
            titleKey: 'admin.section.voices',
            titleFb: 'Quản lý giọng đọc',
            subtitleKey: 'admin.voices.sub',
            subtitleFb: 'Giọng hệ thống và file mẫu nghe thử.',
        },
        payments: {
            titleKey: 'admin.section.payments',
            titleFb: 'Quản lý thanh toán',
            subtitleKey: 'admin.payments.sub',
            subtitleFb: 'Theo dõi giao dịch và duyệt thanh toán.',
        },
        conversions: {
            titleKey: 'admin.section.conversions',
            titleFb: 'Log chuyển đổi',
            subtitleKey: 'admin.conv.sub',
            subtitleFb: 'Theo dõi mọi lượt TTS trên hệ thống.',
        },
    };

    let currentView = 'dashboard';
    let _loaded = {};

    function t(key, fb) {
        if (window._t) return window._t(key, fb);
        if (window.VVi18n && window.VVi18n.t) {
            const s = window.VVi18n.t(key);
            if (s && s !== key) return s;
        }
        return fb || key;
    }

    function getViewFromHash() {
        const hash = (location.hash || '').replace(/^#/, '').trim();
        const legacy = {
            'section-users': 'users',
            'section-payments': 'payments',
            'section-account-deletions': 'lifecycle',
            'section-grace-accounts': 'lifecycle',
            'section-voices': 'voices',
            'section-top-rankings': 'dashboard',
        };
        if (legacy[hash]) return legacy[hash];
        if (hash && VIEW_META[hash]) return hash;
        return 'dashboard';
    }

    function updateHeader(view) {
        const meta = VIEW_META[view] || VIEW_META.dashboard;
        const titleEl = document.getElementById('adminViewTitle');
        const subEl = document.getElementById('adminViewSubtitle');
        if (titleEl) {
            titleEl.textContent = t(meta.titleKey, meta.titleFb);
            titleEl.setAttribute('data-i18n', meta.titleKey);
        }
        if (subEl) {
            subEl.textContent = t(meta.subtitleKey, meta.subtitleFb);
            subEl.setAttribute('data-i18n', meta.subtitleKey);
        }

        const landingBtn = document.getElementById('adminLandingBtn');
        if (landingBtn) landingBtn.style.display = view === 'dashboard' ? '' : 'none';
    }

    function showView(view) {
        document.querySelectorAll('.admin-view').forEach((el) => {
            const isTarget = el.id === 'adminView-' + view;
            el.classList.toggle('is-active', isTarget);
            el.classList.toggle('hidden', !isTarget);
        });

        document.querySelectorAll('[data-admin-view]').forEach((link) => {
            link.classList.toggle('active', link.dataset.adminView === view);
        });

        currentView = view;
        updateHeader(view);

        if (location.hash !== '#' + view) {
            history.replaceState(null, '', '#' + view);
        }
    }

    function loadViewData(view, force) {
        if (!force && _loaded[view]) return;

        switch (view) {
            case 'dashboard':
                if (typeof refreshDashboardData === 'function') refreshDashboardData();
                _loaded.dashboard = true;
                break;
            case 'lifecycle':
                if (typeof loadAccountDeletions === 'function') loadAccountDeletions();
                if (typeof loadGraceAccounts === 'function') loadGraceAccounts();
                _loaded.lifecycle = true;
                break;
            case 'users':
                if (typeof loadUsers === 'function') loadUsers();
                _loaded.users = true;
                break;
            case 'voices':
                if (typeof loadAdminVoices === 'function') loadAdminVoices();
                _loaded.voices = true;
                break;
            case 'payments':
                if (typeof loadPaymentsSummary === 'function') loadPaymentsSummary();
                if (typeof loadPayments === 'function') loadPayments(1);
                _loaded.payments = true;
                break;
            case 'conversions':
                if (window.AdminPhase1?.loadConversions) AdminPhase1.loadConversions(1);
                _loaded.conversions = true;
                break;
            default:
                break;
        }

        const stamp = document.getElementById('adminLastUpdated');
        if (stamp) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            if (window._t) {
                stamp.textContent = window._t('admin.updated_at', 'Cập nhật: {time}', { time: timeStr });
            } else {
                stamp.textContent = `${t('admin.updated_at', 'Cập nhật')}: ${timeStr}`;
            }
            stamp.classList.remove('hidden');
        }
    }

    function switchView(view, forceReload) {
        if (!VIEW_META[view]) view = 'dashboard';
        showView(view);
        loadViewData(view, forceReload);
        if (typeof closeAdminMobileNav === 'function') closeAdminMobileNav();
    }

    function bindNav() {
        document.querySelectorAll('[data-admin-view]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const view = link.dataset.adminView;
                if (!view) return;
                const base = link.getAttribute('href')?.split('#')[0] || '';
                if (base && base !== location.pathname) return;
                e.preventDefault();
                switchView(view, false);
            });
        });

        window.addEventListener('hashchange', () => {
            switchView(getViewFromHash(), false);
        });
    }

    function init() {
        if (!document.getElementById('adminView-dashboard')) return;

        bindNav();

        const refreshBtn = document.getElementById('adminRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                _loaded[currentView] = false;
                switchView(currentView, true);
            });
        }

        switchView(getViewFromHash(), true);
    }

    window.AdminShell = {
        init,
        switchView,
        getCurrentView: () => currentView,
        invalidate: (view) => {
            if (view) _loaded[view] = false;
            else _loaded = {};
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
