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
        let s;
        if (window._t) {
            s = window._t(key, fb, vars);
            if (s && s !== key) return s;
        }
        s = fb || key;
        if (vars && s) {
            Object.keys(vars).forEach((k) => {
                s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
            });
        }
        return s;
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
        const badges = document.getElementById('adminUserDrawerBadges');
        if (badges) badges.innerHTML = '';
        _drawerUserId = null;
    }

    function formatNum(n) {
        if (window.formatNumber) return window.formatNumber(n);
        return Number(n || 0).toLocaleString('vi-VN');
    }

    function formatShortDate(iso) {
        if (!iso) return '—';
        return String(iso).split('T')[0];
    }

    function formatDateTime(iso) {
        if (!iso) return '—';
        return String(iso).replace('T', ' ').slice(0, 16);
    }

    function getInitials(u) {
        const src = (u.full_name || u.username || u.email || '?').trim();
        const parts = src.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return src.slice(0, 2).toUpperCase();
    }

    function daysUntil(iso) {
        if (!iso) return null;
        const end = new Date(iso);
        if (Number.isNaN(end.getTime())) return null;
        return Math.ceil((end - Date.now()) / 86400000);
    }

    function usagePct(used, limit) {
        if (!limit || limit <= 0) return 0;
        return Math.min(100, Math.round(((used || 0) / limit) * 100));
    }

    function drawerStatusBadge(status, type) {
        const s = String(status || '').toLowerCase();
        let cls = 'ud-badge--muted';
        let label = status || '—';
        if (type === 'payment') {
            if (s === 'completed' || s === 'success') { cls = 'ud-badge--success'; label = t('admin.pay.status.completed', 'Thành công'); }
            else if (s === 'failed') { cls = 'ud-badge--danger'; label = t('admin.pay.status.failed', 'Thất bại'); }
            else if (s === 'pending') { cls = 'ud-badge--warn'; label = t('admin.pay.status.pending', 'Chờ xử lý'); }
        } else if (type === 'conversion') {
            if (s === 'completed') { cls = 'ud-badge--success'; label = t('admin.conv.status.completed', 'Hoàn tất'); }
            else if (s === 'failed') { cls = 'ud-badge--danger'; label = t('admin.conv.status.failed', 'Lỗi'); }
            else if (s === 'processing') { cls = 'ud-badge--warn'; label = t('admin.conv.status.processing', 'Đang xử lý'); }
        } else if (type === 'account') {
            if (s === 'active') { cls = 'ud-badge--success'; label = t('admin.user.status.active', 'Hoạt động'); }
            else { cls = 'ud-badge--danger'; label = t('admin.user.status.inactive', 'Vô hiệu'); }
        }
        return `<span class="ud-badge ${cls}">${esc(label)}</span>`;
    }

    function drawerRoleBadge(role) {
        const r = String(role || 'user').toLowerCase();
        const cls = r === 'admin' ? 'ud-badge--violet' : r === 'moderator' ? 'ud-badge--cyan' : 'ud-badge--muted';
        return `<span class="ud-badge ${cls}">${esc(role || 'user')}</span>`;
    }

    function renderDrawerHeader(u) {
        const avatar = document.getElementById('adminUserDrawerAvatar');
        const badges = document.getElementById('adminUserDrawerBadges');
        if (avatar) avatar.textContent = getInitials(u);
        if (badges) {
            badges.innerHTML = [
                drawerRoleBadge(u.role),
                drawerStatusBadge(u.is_active ? 'active' : 'inactive', 'account'),
                u.delete_status && u.delete_status !== 'none'
                    ? `<span class="ud-badge ud-badge--danger">${t('admin.user.delete_pending', 'Chờ xóa')}</span>`
                    : '',
            ].filter(Boolean).join('');
        }
    }

    function renderSubSection(sub, pkgOptions) {
        if (!sub) {
            return `<section class="ud-section ud-section--plan ud-fade" style="--ud-i:1">
              <div class="ud-section__head">
                <span class="material-symbols-outlined ud-section__icon ud-section__icon--violet">workspace_premium</span>
                <h3>${t('admin.user.sub_title', 'Gói & hạn mức')}</h3>
              </div>
              <div class="ud-empty-plan">
                <span class="material-symbols-outlined">inventory_2</span>
                <p>${t('admin.user.no_sub', 'Chưa có gói')}</p>
              </div>
              <div class="ud-tool-group">
                <label class="ud-tool-label">${t('admin.user.add_chars', 'Cộng ký tự')}</label>
                <div class="ud-tool-row">
                  <input type="number" id="drawerAddChars" class="ac-drawer-input" placeholder="100000" min="1000" step="1000"/>
                  <button type="button" class="ud-btn ud-btn--primary" onclick="AdminPhase1.subAction('add_chars')">
                    <span class="material-symbols-outlined">add_circle</span>${t('admin.user.add_chars', 'Cộng ký tự')}
                  </button>
                </div>
              </div>
            </section>`;
        }

        const pct = usagePct(sub.characters_used, sub.characters_limit);
        const days = daysUntil(sub.end_date);
        const daysLabel = days == null ? '—'
            : days < 0 ? t('admin.user.expired', 'Đã hết hạn')
            : t('admin.user.days_left', 'Còn {n} ngày', { n: days });

        return `<section class="ud-section ud-section--plan ud-fade" style="--ud-i:1">
          <div class="ud-section__head">
            <span class="material-symbols-outlined ud-section__icon ud-section__icon--violet">workspace_premium</span>
            <h3>${t('admin.user.sub_title', 'Gói & hạn mức')}</h3>
          </div>

          <div class="ud-plan-hero">
            <div class="ud-plan-hero__name">${esc(sub.package_name)}</div>
            <div class="ud-plan-hero__meta">
              <span><span class="material-symbols-outlined">event</span>${t('admin.user.from', 'Từ')} ${formatShortDate(sub.start_date)}</span>
              <span><span class="material-symbols-outlined">schedule</span>${daysLabel}</span>
            </div>
          </div>

          <div class="ud-usage">
            <div class="ud-usage__top">
              <span>${t('admin.user.used', 'Đã dùng')} <strong>${formatNum(sub.characters_used)}</strong></span>
              <span>${formatNum(sub.characters_remaining)} ${t('admin.user.remaining_short', 'còn lại')}</span>
            </div>
            <div class="ud-usage__track"><div class="ud-usage__fill" style="width:${pct}%"></div></div>
            <div class="ud-usage__bottom">
              <span>${pct}% ${t('admin.user.of_limit', 'hạn mức')}</span>
              <span>${t('admin.user.limit', 'Hạn mức')}: ${formatNum(sub.characters_limit)}</span>
            </div>
          </div>

          <div class="ud-kpi-row">
            <div class="ud-kpi ud-kpi--cyan"><span>${t('admin.user.used', 'Đã dùng')}</span><strong>${formatNum(sub.characters_used)}</strong></div>
            <div class="ud-kpi ud-kpi--violet"><span>${t('admin.user.remaining', 'Còn lại')}</span><strong>${formatNum(sub.characters_remaining)}</strong></div>
            <div class="ud-kpi ud-kpi--green"><span>${t('admin.user.until', 'Hết hạn')}</span><strong>${formatShortDate(sub.end_date)}</strong></div>
          </div>

          <div class="ud-tool-group">
            <label class="ud-tool-label">${t('admin.user.manage_quota', 'Quản lý hạn mức')}</label>
            <div class="ud-tool-row">
              <input type="number" id="drawerAddChars" class="ac-drawer-input" placeholder="100000" min="1000" step="1000"/>
              <button type="button" class="ud-btn ud-btn--ghost" onclick="AdminPhase1.subAction('add_chars')">
                <span class="material-symbols-outlined">add</span>${t('admin.user.add_chars', 'Cộng ký tự')}
              </button>
              <button type="button" class="ud-btn ud-btn--ghost" onclick="AdminPhase1.subAction('reset_used')">
                <span class="material-symbols-outlined">restart_alt</span>${t('admin.user.reset_used', 'Reset')}
              </button>
            </div>
          </div>

          <div class="ud-tool-group">
            <label class="ud-tool-label">${t('admin.user.extend_plan', 'Gia hạn & gói')}</label>
            <div class="ud-tool-row">
              <input type="number" id="drawerExtendDays" class="ac-drawer-input ac-drawer-input--sm" value="30" min="1"/>
              <span class="ud-tool-hint">${t('admin.user.days', 'ngày')}</span>
              <button type="button" class="ud-btn ud-btn--ghost" onclick="AdminPhase1.subAction('extend_days')">
                <span class="material-symbols-outlined">update</span>${t('admin.user.extend', 'Gia hạn')}
              </button>
            </div>
            <div class="ud-tool-row ud-tool-row--full">
              <select id="drawerPackageSelect" class="ac-drawer-select">${pkgOptions}</select>
              <button type="button" class="ud-btn ud-btn--primary" onclick="AdminPhase1.subAction('apply_package')">
                <span class="material-symbols-outlined">check_circle</span>${t('admin.user.apply_pkg', 'Áp dụng gói')}
              </button>
            </div>
          </div>
        </section>`;
    }

    function renderPaymentList(payments) {
        const list = payments || [];
        if (!list.length) {
            return `<p class="ud-list-empty">${t('admin.no_data', 'Không có dữ liệu')}</p>`;
        }
        return `<ul class="ud-list">${list.map((p, i) => `
          <li class="ud-list__item ud-fade" style="--ud-i:${i + 2}">
            <span class="ud-list__icon ud-list__icon--pay"><span class="material-symbols-outlined">payments</span></span>
            <div class="ud-list__body">
              <div class="ud-list__title">${esc(p.package_name || '—')}</div>
              <div class="ud-list__meta">${formatNum(p.amount_vnd)}₫ · ${formatDateTime(p.created_at)}</div>
            </div>
            ${drawerStatusBadge(p.payment_status, 'payment')}
          </li>`).join('')}</ul>`;
    }

    function renderConversionList(conversions) {
        const list = conversions || [];
        if (!list.length) {
            return `<p class="ud-list-empty">${t('admin.no_data', 'Không có dữ liệu')}</p>`;
        }
        return `<ul class="ud-list">${list.map((c, i) => {
            const dur = c.duration_seconds ? `${Number(c.duration_seconds).toFixed(1)}s` : '';
            return `<li class="ud-list__item ud-fade" style="--ud-i:${i + 3}">
              <span class="ud-list__icon ud-list__icon--conv"><span class="material-symbols-outlined">graphic_eq</span></span>
              <div class="ud-list__body">
                <div class="ud-list__title">${esc(c.voice_name || c.voice_id || '—')}</div>
                <div class="ud-list__meta">${formatNum(c.text_length)} ${t('admin.stat.chars_short', 'ký tự')}${dur ? ` · ${dur}` : ''} · ${formatDateTime(c.created_at)}</div>
              </div>
              ${drawerStatusBadge(c.status, 'conversion')}
            </li>`;
        }).join('')}</ul>`;
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
            if (title) title.textContent = u.full_name || u.username || '—';
            if (email) email.textContent = u.email || '—';
            renderDrawerHeader(u);

            const sub = data.subscription;
            const pkgs = await loadAdminPackages();
            const pkgOptions = pkgs.map((p) =>
                `<option value="${p.id}"${sub && sub.package_id === p.id ? ' selected' : ''}>${esc(p.name)} (${formatNum(p.characters)})</option>`
            ).join('');

            body.innerHTML = `
              <div class="ud-studio">
                <div class="ud-stats ud-fade" style="--ud-i:0">
                  <div class="ud-stat ud-stat--cyan">
                    <span class="material-symbols-outlined">sync</span>
                    <div><span>${t('admin.stat.conversions', 'Chuyển đổi')}</span><strong>${formatNum(u.total_conversions)}</strong></div>
                  </div>
                  <div class="ud-stat ud-stat--violet">
                    <span class="material-symbols-outlined">record_voice_over</span>
                    <div><span>${t('admin.user.custom_voices', 'Giọng tùy chỉnh')}</span><strong>${formatNum(u.custom_voice_count)}</strong></div>
                  </div>
                  <div class="ud-stat ud-stat--green">
                    <span class="material-symbols-outlined">badge</span>
                    <div><span>ID</span><strong>#${u.id}</strong></div>
                  </div>
                </div>

                <div class="ud-info-bar ud-fade" style="--ud-i:0">
                  <span><span class="material-symbols-outlined">person</span>@${esc(u.username || '—')}</span>
                  <span><span class="material-symbols-outlined">calendar_month</span>${t('admin.user.joined', 'Tham gia')}: ${formatShortDate(u.created_at)}</span>
                </div>

                ${renderSubSection(sub, pkgOptions)}

                <section class="ud-section ud-fade" style="--ud-i:2">
                  <div class="ud-section__head">
                    <span class="material-symbols-outlined ud-section__icon ud-section__icon--cyan">receipt_long</span>
                    <h3>${t('admin.user.recent_pay', 'Thanh toán gần đây')}</h3>
                  </div>
                  ${renderPaymentList(data.recent_payments)}
                </section>

                <section class="ud-section ud-fade" style="--ud-i:3">
                  <div class="ud-section__head">
                    <span class="material-symbols-outlined ud-section__icon ud-section__icon--green">history</span>
                    <h3>${t('admin.user.recent_conv', 'Chuyển đổi gần đây')}</h3>
                  </div>
                  ${renderConversionList(data.recent_conversions)}
                </section>
              </div>`;

            requestAnimationFrame(() => {
                body.querySelectorAll('.ud-usage__fill').forEach((el) => {
                    const w = el.style.width;
                    el.style.width = '0%';
                    requestAnimationFrame(() => { el.style.width = w; });
                });
            });
        } catch (e) {
            console.error(e);
            body.innerHTML = `<p class="ac-dash-empty error-text">${t('err.network', 'Lỗi mạng')}</p>`;
        }
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
