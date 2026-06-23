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

let trendChart = null;
let voiceDistributionChart = null;
let adminPaymentsPage = 1;
const ADMIN_PAYMENTS_PER_PAGE = 15;
let _lastStats = null;
let _lastTimeStats = null;
let _lastRankings = null;
let _lastUsers = null;
let _lastPayments = null;

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
    const set = (id, val) => {
        const e = document.getElementById(id);
        if (e) e.textContent = formatNumber(val);
    };
    set('todayConversions', data.today?.conversions);
    set('todayCharacters', data.today?.characters);
    set('weekConversions', data.week?.conversions);
    set('weekCharacters', data.week?.characters);
    set('monthConversions', data.month?.conversions);
    set('monthCharacters', data.month?.characters);
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
                backgroundColor: 'rgba(208,188,255,0.12)',
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#d0bcff',
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

function renderVoiceDistributionChart(voiceData) {
    const ctx = document.getElementById('voiceDistributionChart');
    if (!ctx || typeof Chart === 'undefined' || !voiceData?.length) return;
    const mobile = isAdminMobileView();
    if (voiceDistributionChart) voiceDistributionChart.destroy();

    const colors = voiceChartColors(voiceData.length);

    voiceDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: voiceData.map((v) => v.voice_name || '—'),
            datasets: [{
                data: voiceData.map((v) => v.count),
                backgroundColor: voiceData.map((_, i) => colors[i]),
                borderColor: '#0a1520',
                borderWidth: 2,
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 2,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: mobile ? 'bottom' : 'right',
                    labels: {
                        color: '#cbc3d7',
                        font: { family: 'Manrope', size: mobile ? 10 : 12 },
                        boxWidth: 12,
                    },
                },
            },
            animation: {
                animateRotate: true,
                animateScale: false,
                duration: 800,
                easing: 'easeOutQuart',
            },
        },
    });
    setTimeout(() => { if (voiceDistributionChart) voiceDistributionChart.resize(); }, 100);
}

async function loadTopRankings() {
    const usersList = document.getElementById('topUsersList');
    const voicesList = document.getElementById('topVoicesList');
    if (usersList) usersList.innerHTML = `<p class="loading-text">${_t('admin.loading', 'Đang tải...')}</p>`;
    if (voicesList) voicesList.innerHTML = `<p class="loading-text">${_t('admin.loading', 'Đang tải...')}</p>`;

    try {
        const res = await fetch('/api/statistics/top-rankings');
        const data = await res.json();
        if (!data.success) return;
        _lastRankings = data;
        renderTopRankings(data);
        if (data.voice_distribution) renderVoiceDistributionChart(data.voice_distribution);
    } catch (e) {
        console.error('loadTopRankings', e);
        if (usersList) usersList.innerHTML = `<p class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</p>`;
    }
}

function renderTopRankings(data) {
    const usersList = document.getElementById('topUsersList');
    const voicesList = document.getElementById('topVoicesList');

    if (usersList) {
        const users = data.top_users || [];
        if (!users.length) {
            usersList.innerHTML = `<p class="loading-text">${_t('admin.no_data', 'Không có dữ liệu')}</p>`;
        } else {
            usersList.innerHTML = users.map((u, i) => `
                <div class="ranking-item">
                    <div class="ranking-rank">${i + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${u.username || u.full_name || '—'}</div>
                        <div class="ranking-details">${_t('admin.rank.conversions', u.conversion_count + ' chuyển đổi', { n: u.conversion_count })} · ${_t('admin.rank.chars', formatNumber(u.total_characters) + ' ký tự', { n: formatNumber(u.total_characters) })}</div>
                    </div>
                </div>`).join('');
        }
    }

    if (voicesList) {
        const voices = data.top_voices || [];
        if (!voices.length) {
            voicesList.innerHTML = `<p class="loading-text">${_t('admin.no_data', 'Không có dữ liệu')}</p>`;
        } else {
            voicesList.innerHTML = voices.map((v, i) => `
                <div class="ranking-item">
                    <div class="ranking-rank">${i + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${v.voice_name || '—'}</div>
                        <div class="ranking-details">${_t('admin.rank.conversions', v.usage_count + ' chuyển đổi', { n: v.usage_count })} · ${_t('admin.rank.chars', formatNumber(v.total_characters) + ' ký tự', { n: formatNumber(v.total_characters) })}</div>
                    </div>
                </div>`).join('');
        }
    }
}

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
    } catch (e) {
        console.error('loadAccountDeletions', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderAccountDeletionsTable(requests) {
    const tbody = document.getElementById('deletionsTableBody');
    if (!tbody) return;

    if (!requests.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="loading-text">${_t('admin.del.empty', 'Không có yêu cầu đang chờ duyệt')}</td></tr>`;
        return;
    }

    tbody.innerHTML = requests.map((r, idx) => `
        <tr>
            <td class="hide-mobile text-on-surface-variant">${idx + 1}</td>
            <td class="font-medium">${r.full_name || r.username || '—'}</td>
            <td class="hide-mobile">${r.email || '—'}</td>
            <td class="hide-mobile text-xs max-w-[200px] truncate" title="${(r.delete_reason || '').replace(/"/g, '&quot;')}">${r.delete_reason || '—'}</td>
            <td class="hide-mobile text-xs">${r.delete_requested_at || '—'}</td>
            <td><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">${_t('admin.del.status.pending', 'Đang chờ')}</span></td>
            <td class="text-center">
                <div class="flex items-center justify-center gap-1 flex-wrap">
                    <button onclick="openAdminApproveDeletionModal(${r.id})" class="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">${_t('admin.del.approve.action', 'Duyệt xóa')}</button>
                    <button onclick="openAdminRejectDeletionModal(${r.id})" class="text-xs px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high">${_t('admin.del.reject.btn', 'Từ chối')}</button>
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
    } catch (e) {
        console.error('loadGraceAccounts', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderGraceAccountsTable(accounts) {
    const tbody = document.getElementById('graceAccountsTableBody');
    if (!tbody) return;

    if (!accounts.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="loading-text">${_t('admin.grace.empty', 'Không có tài khoản trong thời gian chờ')}</td></tr>`;
        return;
    }

    tbody.innerHTML = accounts.map((a) => {
        const restoreBadge = a.restore_requested
            ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">${_t('admin.grace.restore_yes', 'Có')}</span>`
            : `<span class="text-xs text-on-surface-variant">${_t('admin.grace.restore_no', 'Không')}</span>`;
        return `
        <tr>
            <td class="hide-mobile">${a.id}</td>
            <td class="font-medium">${a.full_name || a.username || '—'}</td>
            <td class="hide-mobile">${a.email || '—'}</td>
            <td class="hide-mobile text-xs">${a.deleted_at || '—'}</td>
            <td class="hide-mobile text-xs">${a.deletion_effective_at || '—'}</td>
            <td>${restoreBadge}</td>
            <td class="text-center">
                <button onclick="restoreGraceAccount(${a.id})" class="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">${_t('admin.grace.restore_btn', 'Khôi phục')}</button>
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
        renderUsersTable(_lastUsers);
    } catch (e) {
        console.error('loadUsers', e);
        tbody.innerHTML = `<tr><td colspan="8" class="error-text">${_t('err.load_failed', 'Không thể tải dữ liệu')}</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text">${_t('admin.no_data', 'Không có dữ liệu')}</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map((u) => {
        const roleLabel = u.role === 'admin' ? _t('admin.role.admin', 'Admin') : _t('admin.role.user', 'Người dùng');
        const statusLabel = u.is_active ? _t('admin.status.active', 'Hoạt động') : _t('admin.status.suspended', 'Đã khóa');
        const statusClass = u.is_active ? 'text-emerald-400' : 'text-red-400';
        return `
            <tr>
                <td class="hide-mobile">${u.id}</td>
                <td class="font-medium">${u.username}</td>
                <td class="hide-mobile">${u.email || '—'}</td>
                <td class="hide-mobile">${u.full_name || '—'}</td>
                <td><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">${roleLabel}</span></td>
                <td class="hide-mobile ${statusClass}">${statusLabel}</td>
                <td class="hide-mobile">${formatNumber(u.total_conversions)}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1 flex-wrap">
                        ${u.role !== 'admin' ? `<button onclick="toggleUserRole(${u.id}, 'admin')" class="text-xs px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high" title="${_t('admin.role.promote', 'Cấp quyền Admin')}">${_t('admin.role.user', 'Người dùng')}</button>` : `<button onclick="toggleUserRole(${u.id}, 'user')" class="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20" title="${_t('admin.role.demote', 'Thu quyền Admin')}">${_t('admin.role.admin', 'Admin')}</button>`}
                        ${u.is_active ? `<button onclick="toggleUserStatus(${u.id}, false)" class="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">${_t('admin.btn.suspend', 'Khóa')}</button>` : `<button onclick="toggleUserStatus(${u.id}, true)" class="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">${_t('admin.btn.activate', 'Kích hoạt')}</button>`}
                        <button onclick="deleteUser(${u.id})" class="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">${_t('admin.btn.delete', 'Xóa')}</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

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

        const countEl = document.getElementById('paymentsCount');
        if (countEl) countEl.textContent = _t('admin.payments_count', data.total + ' giao dịch', { n: data.total });

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

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    if (!payments.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="loading-text">${_t('admin.no_data', 'Không có dữ liệu')}</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.map((p) => `
        <tr>
            <td>${p.id}</td>
            <td class="hide-mobile">${p.username || '—'}</td>
            <td class="hide-mobile">${p.package_name || '—'}</td>
            <td class="font-semibold text-tertiary">${formatCurrency(p.amount_vnd)}</td>
            <td class="hide-mobile text-xs">${p.payment_method || '—'}</td>
            <td>${paymentStatusBadge(p.payment_status)}</td>
            <td class="hide-mobile text-xs font-mono">${p.transaction_id || '—'}</td>
            <td class="hide-mobile text-xs">${p.created_at || '—'}</td>
            <td class="text-center">
                ${p.payment_status === 'pending' ? `<button onclick="approvePayment(${p.id})" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold">${_t('admin.btn.approve', 'Duyệt')}</button>` : '—'}
            </td>
        </tr>`).join('');
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
            loadStatistics();
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
        loadStatistics();
    } catch (e) {
        console.error(e);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function refreshAdminDashboard() {
    loadStatistics();
    loadTimeBasedStats();
    loadTopRankings();
    loadAccountDeletions();
    loadGraceAccounts();
    loadUsers();
    loadPayments(adminPaymentsPage);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('totalUsers')) return;

    loadStatistics();
    loadTimeBasedStats();
    loadTopRankings();
    loadAccountDeletions();
    loadGraceAccounts();
    loadUsers();
    loadPayments();

    document.getElementById('refreshUsersBtn')?.addEventListener('click', refreshAdminDashboard);
    document.getElementById('refreshDeletionsBtn')?.addEventListener('click', loadAccountDeletions);
    document.getElementById('refreshGraceBtn')?.addEventListener('click', loadGraceAccounts);
    document.getElementById('refreshPaymentsBtn')?.addEventListener('click', () => loadPayments(adminPaymentsPage));
    document.getElementById('autoApproveBtn')?.addEventListener('click', autoApprovePayments);

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
        if (_lastPayments) {
            renderPaymentsTable(_lastPayments.payments || []);
            const countEl = document.getElementById('paymentsCount');
            if (countEl && _lastPayments.total != null) {
                countEl.textContent = _t('admin.payments_count', _lastPayments.total + ' giao dịch', { n: _lastPayments.total });
            }
        }
    });

    window.addEventListener('resize', () => {
        if (trendChart) trendChart.resize();
        if (voiceDistributionChart) voiceDistributionChart.resize();
    });
});
