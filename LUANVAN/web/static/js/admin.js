/**
 * Admin Dashboard JavaScript
 */

function _t(key, fallback, vars) {
    let s = (window.VVi18n && window.VVi18n.t) ? window.VVi18n.t(key) : (fallback || key);
    if (vars && s) {
        Object.keys(vars).forEach((k) => {
            s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
        });
    }
    return s;
}
window._t = _t;

let trendChart = null;
let voiceDistributionChart = null;
let adminPaymentsPage = 1;
const ADMIN_PAYMENTS_PER_PAGE = 15;
let _paymentFilterStatus = 'all';
let _paymentsSummaryCache = null;
let _lastStats = null;
let _lastTimeStats = null;
let _lastRankings = null;
let _lastUsers = null;
let _lastPayments = null;
let _dashPeriod = 'week';

function isAdminMobileView() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function formatNumber(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatCurrency(amount) {
    return (Number(amount) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

async function loadStatistics() {
    try {
        const res = await fetch('/api/statistics');
        const data = await res.json();
        if (!data.success) return;
        _lastStats = data.statistics;
        renderStatistics(_lastStats);
    } catch (e) {
        console.error('loadStatistics', e);
    }
}

function renderStatistics(stats) {
    if (!stats) return;
    const el = (id) => document.getElementById(id);
    if (el('totalUsers')) el('totalUsers').textContent = formatNumber(stats.total_users);
    if (el('totalConversions')) el('totalConversions').textContent = formatNumber(stats.total_conversions);
    if (el('totalVoices')) el('totalVoices').textContent = formatNumber(stats.total_voices);
    if (el('totalCharacters')) el('totalCharacters').textContent = formatNumber(stats.total_characters);
    if (el('activeUsers')) {
        el('activeUsers').textContent = _t('admin.stat.active_users', stats.active_users + ' hoạt động', { n: stats.active_users });
    }
    if (el('successRate')) {
        el('successRate').textContent = _t('admin.stat.success_rate', stats.success_rate + '% thành công', { n: stats.success_rate });
    }
    if (el('avgTextLength')) {
        const avg = formatNumber(stats.avg_text_length);
        el('avgTextLength').textContent = _t('admin.stat.avg_chars', 'TB: ' + avg + ' ký tự', { n: avg });
    }
}

async function loadTimeBasedStats() {
    try {
        const res = await fetch('/api/statistics/time-based');
        const data = await res.json();
        if (!data.success) return;
        _lastTimeStats = data;
        renderTimeStats(data);
        if (data.chart_data) renderTrendChart(data.chart_data);
    } catch (e) {
        console.error('loadTimeBasedStats', e);
    }
}

function renderTimeStats(data) {
    updateDashPeriodDisplay(data);
}

function updateDashPeriodDisplay(data) {
    const src = data || _lastTimeStats;
    if (!src) return;
    const bucket = src[_dashPeriod] || src.week || {};
    const conv = formatNumber(bucket.conversions);
    const chars = formatNumber(bucket.characters);

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('dashPeriodConvLabel', conv);
    set('dashPeriodCharLabel', chars);
}

function renderTrendChart(chartData) {
    const ctx = document.getElementById('trendChart');
    if (!ctx || typeof Chart === 'undefined') return;
    const mobile = isAdminMobileView();
    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map((d) => d.label),
            datasets: [{
                label: _t('admin.chart.legend', 'Số chuyển đổi'),
                data: chartData.map((d) => d.conversions),
                borderColor: '#d0bcff',
                backgroundColor: (context) => {
                    const { chart } = context;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return 'rgba(208,188,255,0.12)';
                    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    g.addColorStop(0, 'rgba(208,188,255,0.28)');
                    g.addColorStop(1, 'rgba(208,188,255,0.02)');
                    return g;
                },
                tension: 0.35,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#d0bcff',
                pointBorderColor: '#0a1520',
                pointBorderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: mobile ? 'bottom' : 'top',
                    labels: {
                        color: '#cbc3d7',
                        font: { family: 'Manrope', size: mobile ? 11 : 13 },
                        padding: mobile ? 10 : 16,
                    },
                },
            },
            scales: {
                y: {
                    ticks: { color: '#958ea0', font: { family: 'Manrope', size: mobile ? 10 : 12 } },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                },
                x: {
                    ticks: {
                        color: '#958ea0',
                        maxRotation: mobile ? 40 : 0,
                        autoSkip: true,
                        maxTicksLimit: mobile ? 5 : 8,
                        font: { family: 'Manrope', size: mobile ? 10 : 12 },
                    },
                    grid: { display: false },
                },
            },
        },
    });
    setTimeout(() => { if (trendChart) trendChart.resize(); }, 100);
}

function voiceChartColors(count) {
    // Hue cách đều ~137° — tránh các màu tím/cyan/xanh lá dính nhau như palette cũ
    const fixed = [
        '#9333EA', '#F59E0B', '#0EA5E9', '#EF4444', '#10B981',
        '#EC4899', '#3B82F6', '#84CC16', '#F97316', '#6366F1',
        '#14B8A6', '#E11D48', '#A855F7', '#CA8A04', '#0284C7',
    ];
    if (count <= fixed.length) return fixed.slice(0, count);
    return Array.from({ length: count }, (_, i) => {
        const h = Math.round((i * 137.508) % 360);
        return `hsl(${h}, 70%, 55%)`;
    });
}

function shortenVoiceLabel(name) {
    if (!name) return '—';
    const s = String(name);
    if (s.length <= 22) return s;
    if (s.startsWith('custom_')) return _t('admin.chart.custom_voice', 'Giọng tùy chỉnh') + ' ' + s.slice(-6);
    return s.slice(0, 20) + '…';
}

function prepareVoiceChartData(voiceData) {
    const sorted = [...(voiceData || [])].sort((a, b) => (b.count || 0) - (a.count || 0));
    const TOP = 8;
    if (!sorted.length) return [];
    if (sorted.length <= TOP) {
        return sorted.map((v) => ({
            label: shortenVoiceLabel(v.voice_name),
            count: v.count || 0,
        }));
    }
    const top = sorted.slice(0, TOP);
    const restCount = sorted.slice(TOP).reduce((sum, v) => sum + (v.count || 0), 0);
    const rows = top.map((v) => ({
        label: shortenVoiceLabel(v.voice_name),
        count: v.count || 0,
    }));
    if (restCount > 0) {
        rows.push({
            label: _t('admin.chart.other', 'Khác'),
            count: restCount,
        });
    }
    return rows;
}

function renderVoiceDistributionChart(voiceData) {
    const ctx = document.getElementById('voiceDistributionChart');
    if (!ctx || typeof Chart === 'undefined') return;
    const prepared = prepareVoiceChartData(voiceData);
    if (!prepared.length) return;

    const mobile = isAdminMobileView();
    if (voiceDistributionChart) voiceDistributionChart.destroy();

    const colors = voiceChartColors(prepared.length);

    voiceDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: prepared.map((d) => d.label),
            datasets: [{
                label: _t('admin.chart.legend', 'Số chuyển đổi'),
                data: prepared.map((d) => d.count),
                backgroundColor: prepared.map((_, i) => colors[i]),
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.x} ${_t('admin.chart.usage', 'lượt')}`,
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#958ea0',
                        font: { family: 'Manrope', size: mobile ? 10 : 11 },
                        precision: 0,
                    },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    border: { display: false },
                },
                y: {
                    ticks: {
                        color: '#cbc3d7',
                        font: { family: 'Manrope', size: mobile ? 10 : 11 },
                        autoSkip: false,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
    setTimeout(() => { if (voiceDistributionChart) voiceDistributionChart.resize(); }, 100);
}

async function loadTopRankings() {
    const usersList = document.getElementById('topUsersList');
    const voicesList = document.getElementById('topVoicesList');
    const loading = `<p class="ac-dash-empty">${_t('admin.loading', 'Đang tải...')}</p>`;
    if (usersList) usersList.innerHTML = loading;
    if (voicesList) voicesList.innerHTML = loading;

    try {
        const res = await fetch('/api/statistics/top-rankings');
        const data = await res.json();
        if (!data.success) return;
        _lastRankings = data;
        renderTopRankings(data);
        if (data.voice_distribution) renderVoiceDistributionChart(data.voice_distribution);
    } catch (e) {
        console.error('loadTopRankings', e);
        const err = `<p class="ac-dash-empty error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</p>`;
        if (usersList) usersList.innerHTML = err;
        if (voicesList) voicesList.innerHTML = err;
    }
}

function renderDashLeaderRow(rank, name, conv, chars, maxConv, kind) {
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const rowClass = kind === 'voice' ? 'ac-dash-leader-row--voice' : '';
    const pct = maxConv > 0 ? Math.round((conv / maxConv) * 100) : 0;
    const letter = (name.charAt(0) || '?').toUpperCase();
    const avatarClass = kind === 'voice' ? 'ac-dash-leader-avatar ac-dash-leader-avatar--voice' : 'ac-dash-leader-avatar';
    const icon = kind === 'voice' ? 'mic' : 'swap_calls';
    const charIcon = 'text_fields';

    return `<div class="ac-dash-leader-row ${rowClass} ac-dash-leader-row--${rankClass}">
        <span class="ac-dash-leader-rank">${rank}</span>
        <span class="${avatarClass}">${escapeHtml(letter)}</span>
        <div class="ac-dash-leader-info">
            <div class="ac-dash-leader-name">${escapeHtml(name)}</div>
            <div class="ac-dash-leader-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="ac-dash-leader-badges">
            <span class="ac-dash-stat-badge"><span class="material-symbols-outlined">${icon}</span>${formatNumber(conv)}</span>
            <span class="ac-dash-stat-badge ac-dash-stat-badge--cyan"><span class="material-symbols-outlined">${charIcon}</span>${formatNumber(chars)}</span>
        </div>
    </div>`;
}

function renderTopRankings(data) {
    const usersList = document.getElementById('topUsersList');
    const voicesList = document.getElementById('topVoicesList');
    const empty = `<p class="ac-dash-empty">${_t('admin.no_data', 'Không có dữ liệu')}</p>`;

    if (usersList) {
        const users = data.top_users || [];
        const maxConv = users.reduce((m, u) => Math.max(m, u.conversion_count || 0), 0);
        usersList.innerHTML = users.length
            ? users.map((u, i) => renderDashLeaderRow(
                i + 1,
                u.username || u.full_name || '—',
                u.conversion_count || 0,
                u.total_characters || 0,
                maxConv,
                'user'
            )).join('')
            : empty;
    }

    if (voicesList) {
        const voices = data.top_voices || [];
        const maxConv = voices.reduce((m, v) => Math.max(m, v.usage_count || 0), 0);
        voicesList.innerHTML = voices.length
            ? voices.map((v, i) => renderDashLeaderRow(
                i + 1,
                v.voice_name || '—',
                v.usage_count || 0,
                v.total_characters || 0,
                maxConv,
                'voice'
            )).join('')
            : empty;
    }
}

async function loadDashQuickStats() {
    const payBadge = document.getElementById('dashQuickPayments');
    const delBadge = document.getElementById('dashQuickDeletions');
    try {
        const [payRes, delRes] = await Promise.all([
            fetch('/api/admin/payments?page=1&per_page=100'),
            fetch('/api/admin/account-deletions'),
        ]);
        const payData = await payRes.json();
        const delData = await delRes.json();

        if (payBadge && payData.success) {
            const pending = (payData.payments || []).filter((p) => p.payment_status === 'pending').length;
            if (pending > 0) {
                payBadge.textContent = formatNumber(pending);
                payBadge.hidden = false;
            } else {
                payBadge.hidden = true;
            }
        }

        if (delBadge && delData.success) {
            const pending = (delData.requests || []).length;
            if (pending > 0) {
                delBadge.textContent = formatNumber(pending);
                delBadge.hidden = false;
            } else {
                delBadge.hidden = true;
            }
        }
    } catch (e) {
        console.error('loadDashQuickStats', e);
    }
}

let _userFilter = 'all';
let _userSearchQuery = '';
let _paymentSearchQuery = '';
let _lifecycleSubtab = 'deletions';
let _lastAdminVoices = null;

function adminEmptyRow(colspan, icon, message, hint) {
    if (hint) {
        return `<tr><td colspan="${colspan}">
            <div class="ac-empty ac-empty--rich">
                <div class="ac-empty__icon-wrap"><span class="material-symbols-outlined">${icon}</span></div>
                <p class="ac-empty__title">${message}</p>
                <p class="ac-empty__hint">${hint}</p>
            </div>
        </td></tr>`;
    }
    return `<tr><td colspan="${colspan}">
        <div class="ac-empty">
            <span class="material-symbols-outlined">${icon}</span>
            <p>${message}</p>
        </div>
    </td></tr>`;
}

function setTableMeta(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

function renderUserCell(username, fullName, email) {
    const name = username || fullName || '—';
    const letter = (name.charAt(0) || '?').toUpperCase();
    const sub = fullName && fullName !== username ? fullName : (email || '');
    return `<div class="ac-user-cell">
        <span class="ac-user-avatar">${escapeHtml(letter)}</span>
        <div class="min-w-0">
            <div class="ac-user-name">${escapeHtml(username || fullName || '—')}</div>
            ${sub ? `<div class="ac-user-sub">${escapeHtml(sub)}</div>` : ''}
        </div>
    </div>`;
}

function renderLifecycleSummary() {
    const pending = (_lastDeletions || []).length;
    const grace = (_lastGraceAccounts || []).length;
    const restore = (_lastGraceAccounts || []).filter((a) => a.restore_requested).length;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('lifecyclePendingCount', formatNumber(pending));
    set('lifecycleGraceCount', formatNumber(grace));
    set('lifecycleRestoreCount', formatNumber(restore));

    const delBadge = document.getElementById('lifecycleDeletionsBadge');
    const graceBadge = document.getElementById('lifecycleGraceBadge');
    if (delBadge) delBadge.textContent = pending;
    if (graceBadge) graceBadge.textContent = grace;

    const tab = _lifecycleSubtab;
    const count = tab === 'deletions' ? pending : grace;
    setTableMeta('lifecycleTableMeta', _t('admin.table.showing', 'Hiển thị {n} mục', { n: count }));
}

function switchLifecycleTab(tab) {
    _lifecycleSubtab = tab;
    document.querySelectorAll('#lifecycleSubtabs .ac-subtab').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.lifecycleTab === tab);
    });
    document.querySelectorAll('[data-lifecycle-jump]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.lifecycleJump === tab);
    });
    const delPanel = document.getElementById('lifecyclePanel-deletions');
    const gracePanel = document.getElementById('lifecyclePanel-grace');
    if (delPanel) delPanel.classList.toggle('hidden', tab !== 'deletions');
    if (gracePanel) gracePanel.classList.toggle('hidden', tab !== 'grace');
    renderLifecycleSummary();
}

function setSummaryBar(barId, pct) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    const span = bar.querySelector('span');
    if (!span) return;
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    span.style.width = `${p}%`;
    bar.hidden = p <= 0;
}

function renderUsersSummary(users) {
    const list = users || [];
    const active = list.filter((u) => u.is_active).length;
    const admins = list.filter((u) => u.role === 'admin').length;
    const locked = list.filter((u) => !u.is_active).length;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatNumber(val);
    };
    set('usersSummaryTotal', list.length);
    set('usersSummaryActive', active);
    set('usersSummaryAdmins', admins);
    set('usersSummaryLocked', locked);
    if (list.length) setSummaryBar('usersSummaryActiveBar', (active / list.length) * 100);
}

function filterUsersList(users) {
    let list = users || [];
    if (_userFilter === 'admin') list = list.filter((u) => u.role === 'admin');
    else if (_userFilter === 'user') list = list.filter((u) => u.role !== 'admin');
    else if (_userFilter === 'active') list = list.filter((u) => u.is_active);
    else if (_userFilter === 'suspended') list = list.filter((u) => !u.is_active);

    const q = (_userSearchQuery || '').trim().toLowerCase();
    if (q) {
        list = list.filter((u) => {
            const blob = `${u.username || ''} ${u.email || ''} ${u.full_name || ''}`.toLowerCase();
            return blob.includes(q);
        });
    }
    return list;
}

function renderVoicesSummary(voices) {
    const list = voices || [];
    const withSample = list.filter((v) => v.has_sample).length;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatNumber(val);
    };
    set('voicesSummaryTotal', list.length);
    set('voicesSummaryWithSample', withSample);
    set('voicesSummaryWithoutSample', list.length - withSample);
    if (list.length) setSummaryBar('voicesSampleBar', (withSample / list.length) * 100);
    setTableMeta('voicesTableMeta', _t('admin.table.showing', 'Hiển thị {n} mục', { n: list.length }));
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatAdminDateTime(dt) {
    if (!dt) return '—';
    const parsed = new Date(dt.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return dt;
    const pad = (n) => String(n).padStart(2, '0');
    const short = `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
    return `<span title="${escapeHtml(dt)}">${short}</span>`;
}

function formatPaymentMethod(method) {
    const key = `admin.pay.method.${method}`;
    const fallbacks = {
        bank_qr: 'QR ngân hàng',
        bank_transfer: 'Chuyển khoản',
        momo: 'MoMo',
        vnpay: 'VNPay',
    };
    return _t(key, fallbacks[method] || method || '—');
}

function paymentMethodBadge(method) {
    if (!method) return '—';
    const icon = method === 'bank_qr' ? 'qr_code_2' : 'payments';
    return `<span class="ac-method-badge"><span class="material-symbols-outlined">${icon}</span>${escapeHtml(formatPaymentMethod(method))}</span>`;
}

function formatTxCell(txId) {
    if (!txId) return '—';
    const safe = escapeHtml(txId);
    if (txId.length <= 14) {
        return `<span class="ac-tx-wrap"><span class="ac-tx-id">${safe}</span>
            <button type="button" class="ac-copy-btn" onclick="copyAdminText('${safe.replace(/'/g, "\\'")}')" title="${_t('admin.copy', 'Sao chép')}"><span class="material-symbols-outlined">content_copy</span></button></span>`;
    }
    const short = escapeHtml(txId.slice(0, 6) + '…' + txId.slice(-4));
    return `<span class="ac-tx-wrap"><span class="ac-tx-id" title="${safe}">${short}</span>
        <button type="button" class="ac-copy-btn" onclick="copyAdminText('${safe.replace(/'/g, "\\'")}')" title="${_t('admin.copy', 'Sao chép')}"><span class="material-symbols-outlined">content_copy</span></button></span>`;
}

function copyAdminText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
}

window.copyAdminText = copyAdminText;

function closeAdminActionMenu() {
    const menu = document.getElementById('adminActionMenu');
    if (menu) {
        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');
    }
}

function openAdminActionMenu(anchorEl, items) {
    const menu = document.getElementById('adminActionMenu');
    if (!menu || !anchorEl) return;

    menu.innerHTML = items.map((item) =>
        `<button type="button" class="ac-menu-item${item.danger ? ' ac-menu-item--danger' : ''}" data-menu-action="${item.action}">${escapeHtml(item.label)}</button>`
    ).join('');

    menu.classList.remove('hidden');
    menu.setAttribute('aria-hidden', 'false');

    const rect = anchorEl.getBoundingClientRect();
    const menuW = menu.offsetWidth || 180;
    let left = rect.right - menuW;
    let top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = rect.top - menu.offsetHeight - 6;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelectorAll('[data-menu-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-menu-action');
            const item = items.find((i) => i.action === action);
            if (item && item.onClick) item.onClick();
            closeAdminActionMenu();
        });
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#adminActionMenu') && !e.target.closest('.ac-menu-trigger')) {
        closeAdminActionMenu();
    }
});

function paymentStatusBadge(status) {
    const mobile = isAdminMobileView();
    const shortKey = `admin.pay.status.${status}_short`;
    const longKey = `admin.pay.status.${status}`;
    const fallbacks = {
        pending: { long: 'Đang chờ', short: 'Chờ' },
        completed: { long: 'Đã thanh toán', short: 'Xong' },
        failed: { long: 'Thất bại', short: 'Lỗi' },
        cancelled: { long: 'Đã hủy', short: 'Hủy' },
    };
    const fb = fallbacks[status] || { long: status, short: status };
    const label = mobile ? _t(shortKey, fb.short) : _t(longKey, fb.long);
    const colors = {
        pending: { c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        completed: { c: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        failed: { c: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        cancelled: { c: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    };
    const style = colors[status] || colors.pending;
    return `<span class="pay-status" style="color:${style.c};background:${style.bg}">${label}</span>`;
}

let _lastDeletions = null;
let _lastGraceAccounts = null;
let _pendingApproveUserId = null;
let _pendingRejectUserId = null;

async function loadAccountDeletions() {
    const tbody = document.getElementById('deletionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="loading-text">${_t('admin.loading', 'Đang tải...')}</td></tr>`;

    try {
        const res = await fetch('/api/admin/account-deletions');
        const data = await res.json();
        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-text">${data.message || _t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
            return;
        }
        _lastDeletions = data.requests || [];
        renderAccountDeletionsTable(_lastDeletions);
        renderLifecycleSummary();
    } catch (e) {
        console.error('loadAccountDeletions', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderAccountDeletionsTable(requests) {
    const tbody = document.getElementById('deletionsTableBody');
    if (!tbody) return;

    if (!requests.length) {
        tbody.innerHTML = adminEmptyRow(
            7,
            'person_off',
            _t('admin.del.empty', 'Không có yêu cầu đang chờ duyệt'),
            _t('admin.del.empty_hint', 'Khi người dùng gửi yêu cầu xóa, bạn sẽ thấy tại đây.')
        );
        return;
    }

    tbody.innerHTML = requests.map((r, idx) => `
        <tr>
            <td class="hide-mobile text-on-surface-variant">${idx + 1}</td>
            <td>${renderUserCell(r.username, r.full_name, r.email)}</td>
            <td class="hide-mobile">${escapeHtml(r.email || '—')}</td>
            <td class="hide-mobile text-xs max-w-[200px] truncate" title="${escapeHtml(r.delete_reason || '')}">${escapeHtml(r.delete_reason || '—')}</td>
            <td class="hide-mobile text-xs">${formatAdminDateTime(r.delete_requested_at)}</td>
            <td><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">${_t('admin.del.status.pending', 'Đang chờ')}</span></td>
            <td class="text-center">
                <div class="ac-btn-row">
                    <button type="button" onclick="openAdminApproveDeletionModal(${r.id})" class="ac-btn-inline ac-btn-inline--danger">${_t('admin.del.approve.action', 'Duyệt xóa')}</button>
                    <button type="button" onclick="openAdminRejectDeletionModal(${r.id})" class="ac-btn-inline ac-btn-inline--ghost">${_t('admin.del.reject.btn', 'Từ chối')}</button>
                </div>
            </td>
        </tr>`).join('');
}

function openAdminApproveDeletionModal(userId) {
    _pendingApproveUserId = userId;
    const modal = document.getElementById('adminApproveDeletionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAdminApproveDeletionModal() {
    _pendingApproveUserId = null;
    const modal = document.getElementById('adminApproveDeletionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function confirmAdminApproveDeletion() {
    if (!_pendingApproveUserId) return;
    const btn = document.getElementById('btnAdminConfirmApproveDeletion');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch(`/api/admin/account-deletions/${_pendingApproveUserId}/approve`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            closeAdminApproveDeletionModal();
            loadAccountDeletions();
            loadGraceAccounts();
            loadUsers();
            alert(data.message || _t('admin.del.approve.ok', 'Đã vô hiệu hóa tài khoản'));
        } else {
            alert(data.message || _t('err.save_failed', 'Thất bại'));
        }
    } catch (e) {
        console.error(e);
        alert(_t('err.network', 'Lỗi kết nối'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

function openAdminRejectDeletionModal(userId) {
    _pendingRejectUserId = userId;
    const noteEl = document.getElementById('adminRejectDeletionNote');
    if (noteEl) noteEl.value = '';
    const modal = document.getElementById('adminRejectDeletionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAdminRejectDeletionModal() {
    _pendingRejectUserId = null;
    const modal = document.getElementById('adminRejectDeletionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function confirmAdminRejectDeletion() {
    if (!_pendingRejectUserId) return;
    const btn = document.getElementById('btnAdminConfirmRejectDeletion');
    const note = (document.getElementById('adminRejectDeletionNote')?.value || '').trim();
    if (btn) btn.disabled = true;
    try {
        const res = await fetch(`/api/admin/account-deletions/${_pendingRejectUserId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
        });
        const data = await res.json();
        if (data.success) {
            closeAdminRejectDeletionModal();
            loadAccountDeletions();
            alert(data.message || _t('admin.del.reject.ok', 'Đã từ chối yêu cầu'));
        } else {
            alert(data.message || _t('err.save_failed', 'Thất bại'));
        }
    } catch (e) {
        console.error(e);
        alert(_t('err.network', 'Lỗi kết nối'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function loadGraceAccounts() {
    const tbody = document.getElementById('graceAccountsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="loading-text">${_t('admin.loading', 'Đang tải...')}</td></tr>`;

    try {
        const res = await fetch('/api/admin/account-deletions/grace-period');
        const data = await res.json();
        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-text">${data.message || _t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
            return;
        }
        _lastGraceAccounts = data.accounts || [];
        renderGraceAccountsTable(_lastGraceAccounts);
        renderLifecycleSummary();
    } catch (e) {
        console.error('loadGraceAccounts', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderGraceAccountsTable(accounts) {
    const tbody = document.getElementById('graceAccountsTableBody');
    if (!tbody) return;

    if (!accounts.length) {
        tbody.innerHTML = adminEmptyRow(
            7,
            'hourglass_top',
            _t('admin.grace.empty', 'Không có tài khoản trong thời gian chờ'),
            _t('admin.grace.empty_hint', 'Tài khoản đã duyệt xóa sẽ hiển thị trong 30 ngày chờ.')
        );
        return;
    }

    tbody.innerHTML = accounts.map((a, idx) => {
        const restoreBadge = a.restore_requested
            ? `<span class="badge-active">${_t('admin.grace.restore_yes', 'Có')}</span>`
            : `<span class="text-xs text-on-surface-variant">${_t('admin.grace.restore_no', 'Không')}</span>`;
        return `
        <tr>
            <td class="hide-mobile text-on-surface-variant">${idx + 1}</td>
            <td>${renderUserCell(a.username, a.full_name, a.email)}</td>
            <td class="hide-mobile">${escapeHtml(a.email || '—')}</td>
            <td class="hide-mobile text-xs">${formatAdminDateTime(a.deleted_at)}</td>
            <td class="hide-mobile text-xs">${formatAdminDateTime(a.deletion_effective_at)}</td>
            <td>${restoreBadge}</td>
            <td class="text-center">
                <button type="button" onclick="restoreGraceAccount(${a.id})" class="ac-btn-inline ac-btn-inline--success">${_t('admin.grace.restore_btn', 'Khôi phục')}</button>
            </td>
        </tr>`;
    }).join('');
}

async function restoreGraceAccount(userId) {
    if (!confirm(_t('admin.grace.restore_confirm', 'Khôi phục tài khoản này?'))) return;
    try {
        const res = await fetch(`/api/admin/account-deletions/${userId}/restore`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            loadGraceAccounts();
            loadUsers();
            alert(data.message || _t('admin.grace.restore_ok', 'Đã khôi phục'));
        } else {
            alert(data.message || _t('err.save_failed', 'Thất bại'));
        }
    } catch (e) {
        console.error(e);
        alert(_t('err.network', 'Lỗi kết nối'));
    }
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" class="loading-text">${_t('admin.loading', 'Đang tải...')}</td></tr>`;

    try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (!data.success) return;
        _lastUsers = data.users || [];
        renderUsersSummary(_lastUsers);
        renderUsersTable(_lastUsers);
    } catch (e) {
        console.error('loadUsers', e);
        tbody.innerHTML = `<tr><td colspan="8" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const filtered = filterUsersList(users);

    if (!filtered.length) {
        const hint = (_userSearchQuery || _userFilter !== 'all')
            ? _t('admin.users.filter_empty', 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.')
            : _t('admin.users.empty_hint', 'Người dùng đăng ký sẽ hiển thị tại đây.');
        tbody.innerHTML = adminEmptyRow(8, 'group_off', _t('admin.no_data', 'Không có dữ liệu'), hint);
        setTableMeta('usersTableMeta', '');
        return;
    }

    tbody.innerHTML = filtered.map((u, idx) => {
        const roleLabel = u.role === 'admin' ? _t('admin.role.admin', 'Admin') : _t('admin.role.user', 'Người dùng');
        const roleClass = u.role === 'admin' ? 'badge-admin' : 'badge-user';
        const statusLabel = u.is_active ? _t('admin.status.active', 'Hoạt động') : _t('admin.status.suspended', 'Đã khóa');
        const statusClass = u.is_active ? 'badge-active' : 'badge-inactive';
        return `
            <tr>
                <td class="hide-mobile text-on-surface-variant">${idx + 1}</td>
                <td>${renderUserCell(u.username, u.full_name, u.email)}</td>
                <td class="hide-mobile">${escapeHtml(u.email || '—')}</td>
                <td class="hide-mobile">${escapeHtml(u.full_name || '—')}</td>
                <td><span class="${roleClass}">${roleLabel}</span></td>
                <td class="hide-mobile"><span class="${statusClass}">${statusLabel}</span></td>
                <td class="hide-mobile">${formatNumber(u.total_conversions)}</td>
                <td class="text-center">
                    <button type="button" class="ac-menu-trigger" aria-label="${_t('admin.col.actions', 'Thao tác')}"
                        onclick="openUserActionMenu(${u.id}, '${u.role}', ${u.is_active ? 'true' : 'false'}, this)">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                </td>
            </tr>`;
    }).join('');

    const total = (users || []).length;
    setTableMeta('usersTableMeta', _t('admin.table.showing_filtered', 'Hiển thị {n} / {total} người dùng', { n: filtered.length, total }));
}

function openUserActionMenu(userId, role, isActive, anchorEl) {
    const active = isActive === true || isActive === 'true';
    const items = [];
    if (role !== 'admin') {
        items.push({
            label: _t('admin.action.promote', 'Cấp quyền Admin'),
            action: 'promote',
            onClick: () => toggleUserRole(userId, 'admin'),
        });
    } else {
        items.push({
            label: _t('admin.action.demote', 'Thu quyền Admin'),
            action: 'demote',
            onClick: () => toggleUserRole(userId, 'user'),
        });
    }
    if (active) {
        items.push({
            label: _t('admin.btn.suspend', 'Khóa'),
            action: 'suspend',
            danger: true,
            onClick: () => toggleUserStatus(userId, false),
        });
    } else {
        items.push({
            label: _t('admin.btn.activate', 'Kích hoạt'),
            action: 'activate',
            onClick: () => toggleUserStatus(userId, true),
        });
    }
    items.push({
        label: _t('admin.btn.delete', 'Xóa'),
        action: 'delete',
        danger: true,
        onClick: () => deleteUser(userId),
    });
    openAdminActionMenu(anchorEl, items);
}

window.openUserActionMenu = openUserActionMenu;

async function toggleUserRole(userId, role) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (data.success) loadUsers();
        else alert(data.message || _t('err.save_failed', 'Lưu thất bại'));
    } catch (e) {
        console.error(e);
    }
}

async function toggleUserStatus(userId, active) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: active }),
        });
        const data = await res.json();
        if (data.success) loadUsers();
        else alert(data.message || _t('err.save_failed', 'Lưu thất bại'));
    } catch (e) {
        console.error(e);
    }
}

async function deleteUser(userId) {
    if (!confirm(_t('admin.btn.delete', 'Xóa') + '?')) return;
    try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) loadUsers();
        else alert(data.message || _t('err.delete_failed', 'Xóa thất bại'));
    } catch (e) {
        console.error(e);
    }
}

async function loadPayments(page = 1) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    adminPaymentsPage = page;
    tbody.innerHTML = `<tr><td colspan="9" class="loading-text">${_t('admin.loading', 'Đang tải...')}</td></tr>`;

    try {
        const res = await fetch(`/api/admin/payments?page=${page}&per_page=${ADMIN_PAYMENTS_PER_PAGE}`);
        const data = await res.json();
        if (!data.success) return;

        _lastPayments = data;
        renderPaymentsTable(data.payments || []);

        const wrap = document.getElementById('adminPaymentsPaginationWrap');
        if (wrap && window.VVPagination) {
            wrap.style.display = data.total > ADMIN_PAYMENTS_PER_PAGE ? 'flex' : 'none';
            VVPagination.render({
                id: 'adminPayments',
                containerId: 'adminPaymentsPagination',
                infoId: 'adminPaymentsPaginationInfo',
                page: data.page,
                total: data.total,
                perPage: data.per_page,
                itemLabel: _t('price.history.item', 'giao dịch'),
            });
        }
    } catch (e) {
        console.error('loadPayments', e);
        tbody.innerHTML = `<tr><td colspan="9" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

async function loadPaymentsSummary() {
    try {
        const res = await fetch('/api/admin/payments?page=1&per_page=100');
        const data = await res.json();
        if (!data.success) return;
        const payments = data.payments || [];
        const completed = payments.filter((p) => p.payment_status === 'completed');
        const pending = payments.filter((p) => p.payment_status === 'pending');
        const revenue = completed.reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
        _paymentsSummaryCache = {
            total: data.total,
            completed: completed.length,
            pending: pending.length,
            revenue,
        };
        renderPaymentsSummary();
    } catch (e) {
        console.error('loadPaymentsSummary', e);
    }
}

function renderPaymentsSummary() {
    const s = _paymentsSummaryCache;
    if (!s) return;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('paySummaryRevenue', formatCurrency(s.revenue));
    set('paySummaryTotal', formatNumber(s.total));
    set('paySummaryCompleted', formatNumber(s.completed));
    set('paySummaryPending', formatNumber(s.pending));
    if (s.total) setSummaryBar('paySummaryCompletedBar', (s.completed / s.total) * 100);
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    let list = payments || [];
    if (_paymentFilterStatus !== 'all') {
        list = list.filter((p) => p.payment_status === _paymentFilterStatus);
    }
    const q = (_paymentSearchQuery || '').trim().toLowerCase();
    if (q) {
        list = list.filter((p) => {
            const blob = `${p.username || ''} ${p.transaction_id || ''} ${p.package_name || ''} ${p.id}`.toLowerCase();
            return blob.includes(q);
        });
    }

    if (!list.length) {
        tbody.innerHTML = adminEmptyRow(
            9,
            'payments',
            _t('admin.no_data', 'Không có dữ liệu'),
            _t('admin.pay.filter_empty', 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.')
        );
        setTableMeta('paymentsTableMeta', '');
        return;
    }

    tbody.innerHTML = list.map((p) => `
        <tr>
            <td>${p.id}</td>
            <td class="hide-mobile">${escapeHtml(p.username || '—')}</td>
            <td class="hide-mobile">${escapeHtml(p.package_name || '—')}</td>
            <td class="font-semibold text-tertiary">${formatCurrency(p.amount_vnd)}</td>
            <td class="hide-mobile">${paymentMethodBadge(p.payment_method)}</td>
            <td>${paymentStatusBadge(p.payment_status)}</td>
            <td class="hide-mobile">${formatTxCell(p.transaction_id)}</td>
            <td class="hide-mobile text-xs">${formatAdminDateTime(p.created_at)}</td>
            <td class="text-center">
                ${p.payment_status === 'pending' ? `<button type="button" onclick="approvePayment(${p.id})" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold">${_t('admin.btn.approve', 'Duyệt')}</button>` : '—'}
            </td>
        </tr>`).join('');

    const pageTotal = (payments || []).length;
    setTableMeta('paymentsTableMeta', _t('admin.table.showing_filtered', 'Hiển thị {n} / {total} giao dịch', { n: list.length, total: pageTotal }));
}

async function approvePayment(paymentId) {
    if (!confirm(_t('admin.btn.approve', 'Duyệt') + '?')) return;
    try {
        const res = await fetch('/api/admin/payment/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId }),
        });
        const data = await res.json();
        if (data.success) {
            loadPayments(adminPaymentsPage);
            loadPaymentsSummary();
            loadStatistics();
            if (window.AdminShell) AdminShell.invalidate('payments');
        } else {
            alert(data.message || _t('err.save_failed', 'Lưu thất bại'));
        }
    } catch (e) {
        console.error(e);
    }
}

async function autoApprovePayments() {
    const btn = document.getElementById('autoApproveBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch('/api/admin/auto-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: false }),
        });
        const data = await res.json();
        if (data.message) alert(data.message);
        loadPayments(adminPaymentsPage);
        loadPaymentsSummary();
        loadStatistics();
    } catch (e) {
        console.error(e);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function refreshDashboardData() {
    loadStatistics();
    loadTimeBasedStats();
    loadTopRankings();
    loadDashQuickStats();
}

function refreshAdminDashboard() {
    refreshDashboardData();
    if (window.AdminShell) AdminShell.invalidate();
}

window.refreshDashboardData = refreshDashboardData;

async function loadAdminVoices() {
    const tbody = document.getElementById('adminVoicesTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="loading-text">${_t('admin.loading', 'Đang tải...')}</td></tr>`;

    try {
        const res = await fetch('/api/voices');
        const data = await res.json();
        if (!data.success) {
            tbody.innerHTML = adminEmptyRow(5, 'mic_off', data.message || _t('err.load_failed', 'Không thể tải dữ liệu'));
            return;
        }
        const voices = data.voices || [];
        _lastAdminVoices = voices;
        renderVoicesSummary(voices);
        if (!voices.length) {
            tbody.innerHTML = adminEmptyRow(5, 'mic_off', _t('admin.no_data', 'Không có dữ liệu'), _t('admin.voices.empty_hint', 'Giọng hệ thống từ API /api/voices.'));
            return;
        }
        tbody.innerHTML = voices.map((v) => {
            const hasSample = v.has_sample;
            const sampleUrl = v.sample_url || `/static/voice-samples/${v.voice_id}_sample.wav`;
            const sampleCell = hasSample
                ? `<a href="${escapeHtml(sampleUrl)}" target="_blank" rel="noopener" class="ac-sample-link"><span class="material-symbols-outlined" style="font-size:14px">play_circle</span>${_t('admin.voices.listen', 'Nghe')}</a>`
                : `<span class="ac-sample-missing">${_t('admin.voices.no_sample', 'Chưa có')}</span>`;
            const active = v.is_active ? `<span class="badge-active">${_t('admin.status.active', 'Hoạt động')}</span>` : `<span class="badge-inactive">${_t('admin.status.suspended', 'Đã khóa')}</span>`;
            return `<tr>
                <td class="font-mono text-xs">${escapeHtml(v.voice_id)}</td>
                <td class="font-medium">${escapeHtml(v.voice_name)}</td>
                <td class="hide-mobile text-xs text-on-surface-variant">${escapeHtml(v.description || '—')}</td>
                <td>${sampleCell}</td>
                <td class="hide-mobile">${active}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('loadAdminVoices', e);
        tbody.innerHTML = adminEmptyRow(5, 'error', _t('err.load_failed', 'Không thể tải dữ liệu'));
    }
}

async function generateAllVoiceSamples() {
    const btn = document.getElementById('generateAllSamplesBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch('/api/admin/generate-voice-samples', { method: 'POST' });
        const data = await res.json();
        alert(data.message || (data.success ? _t('admin.voices.generate_ok', 'Đã tạo mẫu') : _t('err.save_failed', 'Lưu thất bại')));
        if (data.success) loadAdminVoices();
    } catch (e) {
        console.error(e);
    } finally {
        if (btn) btn.disabled = false;
    }
}

window.loadAdminVoices = loadAdminVoices;
window.loadPaymentsSummary = loadPaymentsSummary;

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('totalUsers')) return;

    document.getElementById('autoApproveBtn')?.addEventListener('click', autoApprovePayments);
    document.getElementById('generateAllSamplesBtn')?.addEventListener('click', generateAllVoiceSamples);
    document.getElementById('dashRankingsRefreshBtn')?.addEventListener('click', loadTopRankings);

    document.querySelectorAll('#dashPeriodChips .ac-dash-period-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            _dashPeriod = chip.dataset.dashPeriod || 'week';
            document.querySelectorAll('#dashPeriodChips .ac-dash-period-chip').forEach((c) => {
                c.classList.toggle('is-active', c === chip);
            });
            updateDashPeriodDisplay();
        });
    });

    document.querySelectorAll('#lifecycleSubtabs .ac-subtab').forEach((btn) => {
        btn.addEventListener('click', () => switchLifecycleTab(btn.dataset.lifecycleTab || 'deletions'));
    });

    document.querySelectorAll('[data-lifecycle-jump]').forEach((btn) => {
        btn.addEventListener('click', () => switchLifecycleTab(btn.dataset.lifecycleJump || 'deletions'));
    });

    const usersSearch = document.getElementById('usersSearchInput');
    if (usersSearch) {
        usersSearch.addEventListener('input', () => {
            _userSearchQuery = usersSearch.value;
            if (_lastUsers) renderUsersTable(_lastUsers);
        });
    }

    document.querySelectorAll('#usersFilterChips .ac-filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#usersFilterChips .ac-filter-chip').forEach((c) => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            _userFilter = chip.dataset.userFilter || 'all';
            if (_lastUsers) renderUsersTable(_lastUsers);
        });
    });

    const paySearch = document.getElementById('paymentsSearchInput');
    if (paySearch) {
        paySearch.addEventListener('input', () => {
            _paymentSearchQuery = paySearch.value;
            if (_lastPayments) renderPaymentsTable(_lastPayments.payments || []);
        });
    }

    document.querySelectorAll('#paymentFilterChips .ac-filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#paymentFilterChips .ac-filter-chip').forEach((c) => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            _paymentFilterStatus = chip.dataset.payFilter || 'all';
            if (_lastPayments) renderPaymentsTable(_lastPayments.payments || []);
        });
    });

    if (window.VVPagination) {
        VVPagination.register('adminPayments', (p) => loadPayments(p));
    }

    window.addEventListener('vv:langChanged', () => {
        if (_lastStats) renderStatistics(_lastStats);
        if (_lastTimeStats) {
            renderTimeStats(_lastTimeStats);
            if (_lastTimeStats.chart_data) renderTrendChart(_lastTimeStats.chart_data);
        }
        if (_lastRankings) {
            renderTopRankings(_lastRankings);
            if (_lastRankings.voice_distribution) renderVoiceDistributionChart(_lastRankings.voice_distribution);
        }
        if (_lastUsers) renderUsersTable(_lastUsers);
        if (_lastDeletions) renderAccountDeletionsTable(_lastDeletions);
        if (_lastGraceAccounts) renderGraceAccountsTable(_lastGraceAccounts);
        renderLifecycleSummary();
        if (_paymentsSummaryCache) renderPaymentsSummary();
        if (_lastPayments) renderPaymentsTable(_lastPayments.payments || []);
        if (_lastAdminVoices) renderVoicesSummary(_lastAdminVoices);
    });

    window.addEventListener('resize', () => {
        if (trendChart) trendChart.resize();
        if (voiceDistributionChart) voiceDistributionChart.resize();
    });
});
