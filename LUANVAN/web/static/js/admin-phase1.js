/**
 * Admin Phase 1 — user drawer, conversions log, payment export
 */
(function () {
    'use strict';

    let _convPage = 1;
    let _convStatus = 'all';
    let _convSearch = '';
    let _convDateFrom = '';
    let _convDateTo = '';
    let _paymentDateFrom = '';
    let _paymentDateTo = '';
    let _adminPackagesCache = null;
    let _drawerUserId = null;

    function t(key, fb, vars) {
        if (window._t) return window._t(key, fb, vars);
        return fb || key;
    }

    function esc(s) {
        if (window.escapeHtml) return window.escapeHtml(s);
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getPaymentFilterStatus() {
        const chip = document.querySelector('#paymentFilterChips .ac-filter-chip.is-active');
        return chip?.dataset.payFilter || 'all';
    }

    function buildPayQuery() {
        const p = new URLSearchParams();
        const st = getPaymentFilterStatus();
        if (st && st !== 'all') p.set('status', st);
        if (_paymentDateFrom) p.set('from', _paymentDateFrom);
        if (_paymentDateTo) p.set('to', _paymentDateTo);
        return p.toString();
    }

    async function loadPaymentsWithFilters(page) {
        if (typeof loadPayments !== 'function') return;
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;
        const pg = page || 1;
        if (typeof adminPaymentsPage !== 'undefined') window.adminPaymentsPage = pg;

        tbody.innerHTML = `<tr><td colspan="9" class="loading-text">${t('admin.loading', 'Đang tải...')}</td></tr>`;
        const qs = buildPayQuery();
        const base = `/api/admin/payments?page=${pg}&per_page=15`;
        const url = qs ? `${base}&${qs}` : base;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!data.success) return;
            if (typeof _lastPayments !== 'undefined') window._lastPayments = data;
            if (typeof renderPaymentsTable === 'function') renderPaymentsTable(data.payments || []);

            const wrap = document.getElementById('adminPaymentsPaginationWrap');
            if (wrap && window.VVPagination) {
                wrap.style.display = data.total > 15 ? 'flex' : 'none';
                VVPagination.render({
                    id: 'adminPayments',
                    containerId: 'adminPaymentsPagination',
                    infoId: 'adminPaymentsPaginationInfo',
                    page: data.page,
                    total: data.total,
                    perPage: data.per_page,
                    itemLabel: t('price.history.item', 'giao dịch'),
                });
            }
        } catch (e) {
            console.error('loadPaymentsWithFilters', e);
        }
    }

    function exportPaymentsCsv() {
        const qs = buildPayQuery();
        const url = qs ? `/api/admin/payments/export?${qs}` : '/api/admin/payments/export';
        window.location.href = url;
    }

    async function loadAdminPackages() {
        if (_adminPackagesCache) return _adminPackagesCache;
        try {
            const res = await fetch('/api/admin/packages');
            const data = await res.json();
            if (data.success) _adminPackagesCache = data.packages || [];
        } catch (e) {
            console.error(e);
        }
        return _adminPackagesCache || [];
    }

    function closeUserDrawer() {
        const drawer = document.getElementById('adminUserDrawer');
        if (drawer) {
            drawer.classList.add('hidden');
            drawer.setAttribute('aria-hidden', 'true');
        }
        _drawerUserId = null;
    }

    async function openAdminUserDrawer(userId) {
        _drawerUserId = userId;
        const drawer = document.getElementById('adminUserDrawer');
        const body = document.getElementById('adminUserDrawerBody');
        const title = document.getElementById('adminUserDrawerTitle');
        const email = document.getElementById('adminUserDrawerEmail');
        if (!drawer || !body) return;

        drawer.classList.remove('hidden');
        drawer.setAttribute('aria-hidden', 'false');
        body.innerHTML = `<p class="ac-dash-empty">${t('admin.loading', 'Đang tải...')}</p>`;

        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            const data = await res.json();
            if (!data.success) {
                body.innerHTML = `<p class="ac-dash-empty error-text">${data.message || t('err.load_failed', 'Lỗi')}</p>`;
                return;
            }

            const u = data.user;
            if (title) title.textContent = u.username || u.full_name || '—';
            if (email) email.textContent = u.email || '—';

            const sub = data.subscription;
            const pkgs = await loadAdminPackages();
            const pkgOptions = pkgs.map((p) =>
                `<option value="${p.id}">${esc(p.name)} (${formatNum(p.characters)})</option>`
            ).join('');

            const subHtml = sub
                ? `<div class="ac-drawer-card">
                    <h4>${t('admin.user.sub_title', 'Gói & hạn mức')}</h4>
                    <div class="ac-drawer-kpi-grid">
                      <div><span class="ac-drawer-kpi__label">${t('admin.user.pkg', 'Gói')}</span><strong>${esc(sub.package_name)}</strong></div>
                      <div><span class="ac-drawer-kpi__label">${t('admin.user.used', 'Đã dùng')}</span><strong>${formatNum(sub.characters_used)}</strong></div>
                      <div><span class="ac-drawer-kpi__label">${t('admin.user.limit', 'Hạn mức')}</span><strong>${formatNum(sub.characters_limit)}</strong></div>
                      <div><span class="ac-drawer-kpi__label">${t('admin.user.remaining', 'Còn lại')}</span><strong class="text-primary">${formatNum(sub.characters_remaining)}</strong></div>
                    </div>
                    <p class="ac-drawer-meta">${t('admin.user.until', 'Hết hạn')}: ${esc((sub.end_date || '').split('T')[0])}</p>
                    <div class="ac-drawer-actions">
                      <input type="number" id="drawerAddChars" class="ac-drawer-input" placeholder="100000" min="1000" step="1000"/>
                      <button type="button" class="ac-btn-inline ac-btn-inline--ghost" onclick="AdminPhase1.subAction('add_chars')">${t('admin.user.add_chars', 'Cộng ký tự')}</button>
                      <button type="button" class="ac-btn-inline ac-btn-inline--ghost" onclick="AdminPhase1.subAction('reset_used')">${t('admin.user.reset_used', 'Reset đã dùng')}</button>
                      <input type="number" id="drawerExtendDays" class="ac-drawer-input ac-drawer-input--sm" value="30" min="1"/>
                      <button type="button" class="ac-btn-inline ac-btn-inline--ghost" onclick="AdminPhase1.subAction('extend_days')">${t('admin.user.extend', 'Gia hạn')}</button>
                    </div>
                    <div class="ac-drawer-actions mt-2">
                      <select id="drawerPackageSelect" class="ac-drawer-select">${pkgOptions}</select>
                      <button type="button" class="ac-btn-inline ac-btn-inline--success" onclick="AdminPhase1.subAction('apply_package')">${t('admin.user.apply_pkg', 'Áp dụng gói')}</button>
                    </div>
                  </div>`
                : `<div class="ac-drawer-card"><p class="ac-drawer-meta">${t('admin.user.no_sub', 'Chưa có gói')}</p>
                    <div class="ac-drawer-actions">
                      <input type="number" id="drawerAddChars" class="ac-drawer-input" placeholder="100000"/>
                      <button type="button" class="ac-btn-inline ac-btn-inline--success" onclick="AdminPhase1.subAction('add_chars')">${t('admin.user.add_chars', 'Cộng ký tự')}</button>
                    </div></div>`;

            const payRows = (data.recent_payments || []).map((p) =>
                `<tr><td>${esc(p.package_name || '—')}</td><td>${formatNum(p.amount_vnd)}₫</td><td>${esc(p.payment_status)}</td></tr>`
            ).join('') || `<tr><td colspan="3" class="text-center">${t('admin.no_data', 'Không có')}</td></tr>`;

            const convRows = (data.recent_conversions || []).map((c) =>
                `<tr><td>${esc(c.voice_name || c.voice_id || '—')}</td><td>${formatNum(c.text_length)}</td><td>${esc(c.status)}</td></tr>`
            ).join('') || `<tr><td colspan="3" class="text-center">${t('admin.no_data', 'Không có')}</td></tr>`;

            body.innerHTML = `
                <div class="ac-drawer-stats">
                  <span>${t('admin.stat.conversions', 'Chuyển đổi')}: <strong>${formatNum(u.total_conversions)}</strong></span>
                  <span>${t('admin.user.custom_voices', 'Giọng tùy chỉnh')}: <strong>${formatNum(u.custom_voice_count)}</strong></span>
                  <span>${t('admin.col.role', 'Vai trò')}: <strong>${esc(u.role)}</strong></span>
                </div>
                ${subHtml}
                <div class="ac-drawer-card">
                  <h4>${t('admin.user.recent_pay', 'Thanh toán gần đây')}</h4>
                  <table class="ac-drawer-table"><thead><tr><th>${t('admin.col.package', 'Gói')}</th><th>${t('admin.col.amount', 'Số tiền')}</th><th>${t('admin.col.status', 'TT')}</th></tr></thead><tbody>${payRows}</tbody></table>
                </div>
                <div class="ac-drawer-card">
                  <h4>${t('admin.user.recent_conv', 'Chuyển đổi gần đây')}</h4>
                  <table class="ac-drawer-table"><thead><tr><th>${t('admin.conv.voice', 'Giọng')}</th><th>${t('admin.stat.chars', 'Ký tự')}</th><th>${t('admin.col.status', 'TT')}</th></tr></thead><tbody>${convRows}</tbody></table>
                </div>`;
        } catch (e) {
            console.error(e);
            body.innerHTML = `<p class="ac-dash-empty error-text">${t('err.network', 'Lỗi mạng')}</p>`;
        }
    }

    function formatNum(n) {
        if (window.formatNumber) return window.formatNumber(n);
        return Number(n || 0).toLocaleString('vi-VN');
    }

    async function subAction(action) {
        if (!_drawerUserId) return;
        const payload = { action };
        if (action === 'add_chars') {
            payload.amount = parseInt(document.getElementById('drawerAddChars')?.value || '0', 10);
        } else if (action === 'extend_days') {
            payload.days = parseInt(document.getElementById('drawerExtendDays')?.value || '30', 10);
        } else if (action === 'apply_package') {
            payload.package_id = parseInt(document.getElementById('drawerPackageSelect')?.value || '0', 10);
        }
        try {
            const res = await fetch(`/api/admin/users/${_drawerUserId}/subscription`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            alert(data.message || (data.success ? t('admin.saved', 'Đã lưu') : t('err.save_failed', 'Lỗi')));
            if (data.success) {
                openAdminUserDrawer(_drawerUserId);
                if (typeof loadUsers === 'function') loadUsers();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadConversions(page) {
        _convPage = page || 1;
        const tbody = document.getElementById('conversionsTableBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="loading-text">${t('admin.loading', 'Đang tải...')}</td></tr>`;

        const p = new URLSearchParams({
            page: _convPage,
            per_page: '20',
        });
        if (_convStatus && _convStatus !== 'all') p.set('status', _convStatus);
        if (_convSearch) p.set('search', _convSearch);
        if (_convDateFrom) p.set('from', _convDateFrom);
        if (_convDateTo) p.set('to', _convDateTo);

        try {
            const res = await fetch(`/api/admin/conversions?${p.toString()}`);
            const data = await res.json();
            if (!data.success) {
                tbody.innerHTML = `<tr><td colspan="7" class="error-text">${data.message || t('err.load_failed', 'Lỗi')}</td></tr>`;
                return;
            }
            const list = data.conversions || [];
            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="7"><p class="ac-dash-empty">${t('admin.no_data', 'Không có dữ liệu')}</p></td></tr>`;
            } else {
                tbody.innerHTML = list.map((c) => {
                    const st = c.status || '—';
                    const stClass = st === 'completed' ? 'badge-active' : st === 'failed' ? 'badge-inactive' : 'badge-user';
                    return `<tr>
                      <td>${c.id}</td>
                      <td>${esc(c.username || '—')}</td>
                      <td class="hide-mobile">${esc(c.voice_name || c.voice_id || '—')}</td>
                      <td class="hide-mobile text-xs max-w-[200px] truncate" title="${esc(c.text_preview)}">${esc(c.text_preview || '—')}</td>
                      <td>${formatNum(c.text_length)}</td>
                      <td><span class="${stClass}">${esc(st)}</span></td>
                      <td class="hide-mobile text-xs">${esc(c.created_at || '—')}</td>
                    </tr>`;
                }).join('');
            }

            const meta = document.getElementById('conversionsTableMeta');
            if (meta) {
                meta.textContent = t('admin.table.showing_filtered', 'Hiển thị {n} / {total}', {
                    n: list.length,
                    total: data.total,
                });
            }

            const wrap = document.getElementById('adminConvPaginationWrap');
            if (wrap && window.VVPagination) {
                wrap.style.display = data.total > 20 ? 'flex' : 'none';
                VVPagination.register('adminConv', (pg) => loadConversions(pg));
                VVPagination.render({
                    id: 'adminConv',
                    containerId: 'adminConvPagination',
                    infoId: 'adminConvPaginationInfo',
                    page: data.page,
                    total: data.total,
                    perPage: data.per_page,
                    itemLabel: t('admin.conv.item', 'chuyển đổi'),
                });
            }
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="7" class="error-text">${t('err.load_failed', 'Lỗi')}</td></tr>`;
        }
    }

    const DASH_ACTIVITY_PREVIEW_LIMIT = 3;

    async function loadDashActivity() {
        const el = document.getElementById('dashActivityList');
        if (!el) return;
        try {
            const res = await fetch(`/api/admin/conversions/recent?limit=${DASH_ACTIVITY_PREVIEW_LIMIT}`);
            const data = await res.json();
            if (!data.success || !data.items?.length) {
                el.innerHTML = `<p class="ac-dash-empty ac-dash-empty--compact">${t('admin.no_data', 'Không có dữ liệu')}</p>`;
                return;
            }
            el.innerHTML = data.items.map((item) => {
                const st = item.status || '';
                const icon = st === 'completed' ? 'check_circle' : st === 'failed' ? 'error' : 'hourglass_top';
                const iconClass = st === 'completed' ? 'ac-dash-activity-strip__icon--completed'
                    : st === 'failed' ? 'ac-dash-activity-strip__icon--failed'
                    : 'ac-dash-activity-strip__icon--processing';
                const time = (item.created_at || '').replace('T', ' ').slice(0, 16);
                return `<div class="ac-dash-activity-strip__item">
                  <span class="material-symbols-outlined ac-dash-activity-strip__icon ${iconClass}">${icon}</span>
                  <div class="ac-dash-activity-strip__body">
                    <div class="ac-dash-activity-strip__user">${esc(item.username || '—')}</div>
                    <div class="ac-dash-activity-strip__meta">${esc(item.voice_name || '—')} · ${formatNum(item.text_length)} ${t('admin.stat.chars_short', 'ký tự')}</div>
                    <div class="ac-dash-activity-strip__time">${esc(time)}</div>
                  </div>
                </div>`;
            }).join('');
        } catch (e) {
            console.error(e);
        }
    }

    function init() {
        if (!document.getElementById('adminView-dashboard')) return;

        document.getElementById('adminUserDrawerClose')?.addEventListener('click', closeUserDrawer);
        document.getElementById('adminUserDrawerBackdrop')?.addEventListener('click', closeUserDrawer);

        document.getElementById('paymentsExportBtn')?.addEventListener('click', exportPaymentsCsv);
        document.getElementById('paymentsFilterApplyBtn')?.addEventListener('click', () => {
            _paymentDateFrom = document.getElementById('paymentsDateFrom')?.value || '';
            _paymentDateTo = document.getElementById('paymentsDateTo')?.value || '';
            loadPaymentsWithFilters(1);
        });

        document.getElementById('convFilterApplyBtn')?.addEventListener('click', () => {
            _convDateFrom = document.getElementById('convDateFrom')?.value || '';
            _convDateTo = document.getElementById('convDateTo')?.value || '';
            loadConversions(1);
        });

        const convSearch = document.getElementById('convSearchInput');
        if (convSearch) {
            convSearch.addEventListener('input', () => {
                _convSearch = convSearch.value;
                loadConversions(1);
            });
        }

        document.querySelectorAll('#convStatusChips .ac-filter-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#convStatusChips .ac-filter-chip').forEach((c) => c.classList.remove('is-active'));
                chip.classList.add('is-active');
                _convStatus = chip.dataset.convStatus || 'all';
                loadConversions(1);
            });
        });

        // Patch user action menu — prepend detail
        if (typeof openUserActionMenu === 'function') {
            const _origOpenMenu = openUserActionMenu;
            window.openUserActionMenu = function (userId, role, isActive, anchorEl) {
                if (typeof closeAdminActionMenu === 'function') closeAdminActionMenu();
                const active = isActive === true || isActive === 'true';
                const items = [{
                    label: t('admin.user.view_detail', 'Chi tiết tài khoản'),
                    action: 'detail',
                    onClick: () => openAdminUserDrawer(userId),
                }];
                if (role !== 'admin') {
                    items.push({
                        label: t('admin.action.promote', 'Cấp quyền Admin'),
                        onClick: () => toggleUserRole(userId, 'admin'),
                    });
                } else {
                    items.push({
                        label: t('admin.action.demote', 'Thu quyền Admin'),
                        onClick: () => toggleUserRole(userId, 'user'),
                    });
                }
                if (active) {
                    items.push({
                        label: t('admin.btn.suspend', 'Khóa'),
                        danger: true,
                        onClick: () => toggleUserStatus(userId, false),
                    });
                } else {
                    items.push({
                        label: t('admin.btn.activate', 'Kích hoạt'),
                        onClick: () => toggleUserStatus(userId, true),
                    });
                }
                items.push({
                    label: t('admin.btn.delete', 'Xóa'),
                    danger: true,
                    onClick: () => deleteUser(userId),
                });
                if (typeof openAdminActionMenu === 'function') openAdminActionMenu(anchorEl, items);
            };
        }

        // Override loadPayments for server-side date filter
        window.loadPayments = loadPaymentsWithFilters;

        if (window.VVPagination) {
            VVPagination.register('adminPayments', (p) => loadPaymentsWithFilters(p));
            VVPagination.register('adminConv', (p) => loadConversions(p));
        }
        document.querySelectorAll('#paymentFilterChips .ac-filter-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                setTimeout(() => loadPaymentsWithFilters(1), 0);
            });
        });

        // Dashboard activity on refresh
        if (typeof refreshDashboardData === 'function') {
            const orig = refreshDashboardData;
            window.refreshDashboardData = function () {
                orig();
                loadDashActivity();
            };
            if (location.hash === '#dashboard' || !location.hash || location.hash === '#') {
                loadDashActivity();
            }
        }

        window.AdminPhase1 = {
            openUserDrawer: openAdminUserDrawer,
            loadConversions,
            loadDashActivity,
            subAction,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
