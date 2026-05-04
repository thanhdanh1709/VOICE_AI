/**
 * Admin Page JavaScript
 * Xử lý trang quản trị với thống kê mở rộng
 */

let trendChart = null;
let voiceDistributionChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadAdminStatistics();
    loadTimeBasedStatistics();
    loadTopRankings();
    loadUsers();
    loadPayments();
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUsers();
            loadAdminStatistics();
            loadTimeBasedStatistics();
            loadTopRankings();
        });
    }
    
    // Refresh payments button
    const refreshPaymentsBtn = document.getElementById('refreshPaymentsBtn');
    if (refreshPaymentsBtn) {
        refreshPaymentsBtn.addEventListener('click', loadPayments);
    }
    
    // Auto-approve button
    const autoApproveBtn = document.getElementById('autoApproveBtn');
    if (autoApproveBtn) {
        autoApproveBtn.addEventListener('click', autoApprovePayments);
    }
    
    // Generate samples button
    const generateSamplesBtn = document.getElementById('generateSamplesBtn');
    if (generateSamplesBtn) {
        generateSamplesBtn.addEventListener('click', generateVoiceSamples);
    }
});

async function loadAdminStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.statistics;
            
            // Basic stats
            document.getElementById('totalUsers').textContent = stats.total_users || 0;
            document.getElementById('totalConversions').textContent = stats.total_conversions || 0;
            document.getElementById('totalVoices').textContent = stats.total_voices || 0;
            
            // Extended stats
            if (stats.active_users !== undefined) {
                document.getElementById('activeUsers').textContent = `${stats.active_users} hoạt động`;
            }
            if (stats.success_rate !== undefined) {
                document.getElementById('successRate').textContent = `${stats.success_rate}% thành công`;
            }
            if (stats.total_characters !== undefined) {
                document.getElementById('totalCharacters').textContent = formatNumber(stats.total_characters);
            }
            if (stats.avg_text_length !== undefined) {
                document.getElementById('avgTextLength').textContent = `TB: ${formatNumber(stats.avg_text_length)} ký tự`;
            }
        } else {
            console.error('Error loading statistics:', data.message);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadTimeBasedStatistics() {
    try {
        const response = await fetch('/api/statistics/time-based');
        const data = await response.json();
        
        if (data.success) {
            // Today stats
            document.getElementById('todayConversions').textContent = data.today.conversions;
            document.getElementById('todayCharacters').textContent = formatNumber(data.today.characters);
            
            // Week stats
            document.getElementById('weekConversions').textContent = data.week.conversions;
            document.getElementById('weekCharacters').textContent = formatNumber(data.week.characters);
            
            // Month stats
            document.getElementById('monthConversions').textContent = data.month.conversions;
            document.getElementById('monthCharacters').textContent = formatNumber(data.month.characters);
            
            // Render trend chart
            renderTrendChart(data.chart_data);
        } else {
            console.error('Error loading time-based statistics:', data.message);
        }
    } catch (error) {
        console.error('Error loading time-based statistics:', error);
    }
}

async function loadTopRankings() {
    try {
        const response = await fetch('/api/statistics/top-rankings');
        const data = await response.json();
        
        if (data.success) {
            // Top users
            const topUsersList = document.getElementById('topUsersList');
            if (data.top_users && data.top_users.length > 0) {
                topUsersList.innerHTML = data.top_users.map((user, index) => `
                    <div class="ranking-item">
                        <div class="ranking-rank">${index + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${user.username}${user.full_name ? ` (${user.full_name})` : ''}</div>
                            <div class="ranking-details">
                                ${user.conversion_count} chuyển đổi • 
                                ${formatNumber(user.total_characters)} ký tự
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                topUsersList.innerHTML = '<div class="loading-text">Chưa có dữ liệu</div>';
            }
            
            // Top voices
            const topVoicesList = document.getElementById('topVoicesList');
            if (data.top_voices && data.top_voices.length > 0) {
                topVoicesList.innerHTML = data.top_voices.map((voice, index) => `
                    <div class="ranking-item">
                        <div class="ranking-rank">${index + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${voice.voice_name}</div>
                            <div class="ranking-details">
                                ${voice.usage_count} lần sử dụng • 
                                ${formatNumber(voice.total_characters)} ký tự
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                topVoicesList.innerHTML = '<div class="loading-text">Chưa có dữ liệu</div>';
            }
            
            // Render voice distribution chart
            renderVoiceDistributionChart(data.voice_distribution);
        } else {
            console.error('Error loading top rankings:', data.message);
        }
    } catch (error) {
        console.error('Error loading top rankings:', error);
    }
}

// ── Bảng màu theo design system của VietVoice (dark theme) ──
const VV_COLORS = {
    primary:    '#d0bcff',  // primary
    primaryDim: '#a078ff',  // primary-container
    tertiary:   '#2fd9f4',  // cyan
    violet:     '#9b72ff',
    teal:       '#00d4c8',
    rose:       '#f472b6',
    amber:      '#fbbf24',
    sky:        '#38bdf8',
    emerald:    '#34d399',
    fuchsia:    '#e879f9',
    coral:      '#fb7185',
    lime:       '#a3e635',
    indigo:     '#818cf8',
    orange:     '#fb923c',
    mint:       '#6ee7b7',
};

// Palette cho doughnut — đủ tương phản trên nền tối
const DONUT_COLORS = [
    '#a078ff',  // violet (primary-container)
    '#2fd9f4',  // cyan (tertiary)
    '#34d399',  // emerald
    '#f472b6',  // rose
    '#fbbf24',  // amber
    '#e879f9',  // fuchsia
    '#38bdf8',  // sky
    '#fb7185',  // coral
    '#818cf8',  // indigo
    '#a3e635',  // lime
    '#fb923c',  // orange
    '#6ee7b7',  // mint
    '#9b72ff',  // soft violet
    '#00d4c8',  // teal
    '#d0bcff',  // primary light
];

const DONUT_BORDERS = '#0d1c2d'; // surface-container-low — viền tách slice

function renderTrendChart(chartData) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (trendChart) trendChart.destroy();

    const canvas = ctx.getContext('2d');
    const gradient = canvas.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0,   'rgba(160, 120, 255, 0.35)');
    gradient.addColorStop(0.5, 'rgba(160, 120, 255, 0.12)');
    gradient.addColorStop(1,   'rgba(160, 120, 255, 0.02)');

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.label),
            datasets: [{
                label: 'Số chuyển đổi',
                data: chartData.map(d => d.conversions),
                borderColor: '#d0bcff',
                backgroundColor: gradient,
                borderWidth: 2.5,
                tension: 0.45,
                fill: true,
                pointBackgroundColor: '#0d1c2d',
                pointBorderColor: '#d0bcff',
                pointBorderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#d0bcff',
                pointHoverBorderColor: '#0d1c2d',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, weight: '600', family: 'Manrope' },
                        color: '#cbc3d7',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18,33,49,0.95)',
                    titleColor: '#d0bcff',
                    bodyColor: '#cbc3d7',
                    borderColor: 'rgba(208,188,255,0.25)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `Chuyển đổi: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { size: 12, family: 'Manrope' },
                        color: '#958ea0'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        font: { size: 12, family: 'Manrope' },
                        color: '#958ea0'
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderVoiceDistributionChart(voiceData) {
    const ctx = document.getElementById('voiceDistributionChart');
    if (!ctx) return;

    if (voiceDistributionChart) voiceDistributionChart.destroy();

    const sliceColors  = DONUT_COLORS.slice(0, voiceData.length);
    // Hover: tăng độ sáng nhẹ bằng cách dùng opacity cao hơn
    const hoverColors  = sliceColors.map(c => c + 'dd');

    voiceDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: voiceData.map(d => d.voice_name),
            datasets: [{
                data: voiceData.map(d => d.count),
                backgroundColor:      sliceColors,
                hoverBackgroundColor: hoverColors,
                borderWidth: 2,
                borderColor: DONUT_BORDERS,
                hoverBorderWidth: 3,
                hoverBorderColor: DONUT_BORDERS
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        font: { size: 12, weight: '600', family: 'Manrope' },
                        color: '#cbc3d7',
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18,33,49,0.95)',
                    titleColor: '#d0bcff',
                    bodyColor: '#cbc3d7',
                    borderColor: 'rgba(208,188,255,0.25)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = ((value / total) * 100).toFixed(1);
                            return `  ${context.label}: ${value} lần (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '62%',
            radius: '88%',
            animation: {
                animateRotate: true,
                animateScale: false,
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Đang tải...</td></tr>';
    
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success && data.users) {
            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Chưa có người dùng nào</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.users.map(user => {
                const roleBadge = user.role === 'admin' 
                    ? '<span class="badge badge-admin">Admin</span>' 
                    : '<span class="badge badge-user">User</span>';
                
                const statusBadge = user.is_active
                    ? '<span class="badge badge-active">Hoạt động</span>'
                    : '<span class="badge badge-inactive">Đã khóa</span>';
                
                const roleSelect = `
                    <select class="role-select" data-user-id="${user.id}" data-current-role="${user.role}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                `;
                
                const statusButton = user.is_active
                    ? `<button class="btn btn-sm btn-warning" onclick="toggleUserStatus(${user.id}, false)">🔒 Khóa</button>`
                    : `<button class="btn btn-sm btn-success" onclick="toggleUserStatus(${user.id}, true)">🔓 Mở khóa</button>`;
                
                const deleteButton = `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">🗑️ Xóa</button>`;
                
                return `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.full_name || '-'}</td>
                        <td>${roleSelect}</td>
                        <td>${statusBadge}</td>
                        <td>${user.total_conversions}</td>
                        <td class="action-buttons">
                            ${statusButton}
                            ${deleteButton}
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Add event listeners for role selects
            document.querySelectorAll('.role-select').forEach(select => {
                select.addEventListener('change', function() {
                    const userId = parseInt(this.dataset.userId);
                    const newRole = this.value;
                    const currentRole = this.dataset.currentRole;
                    
                    if (newRole !== currentRole) {
                        updateUserRole(userId, newRole);
                    }
                });
            });
            
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="error-text">Lỗi: ${data.message || 'Không thể tải danh sách người dùng'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = `<tr><td colspan="8" class="error-text">Lỗi kết nối: ${error.message}</td></tr>`;
    }
}

async function updateUserRole(userId, newRole) {
    if (!confirm(`Bạn có chắc muốn thay đổi vai trò của người dùng này thành "${newRole}"?`)) {
        // Reset select to original value
        const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
        if (select) {
            select.value = select.dataset.currentRole;
        }
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            // Update the current role in dataset
            const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
            if (select) {
                select.dataset.currentRole = newRole;
            }
            loadUsers(); // Reload to refresh UI
        } else {
            alert(`Lỗi: ${data.message}`);
            // Reset select
            const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
            if (select) {
                select.value = select.dataset.currentRole;
            }
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        alert(`Lỗi: ${error.message}`);
        // Reset select
        const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
        if (select) {
            select.value = select.dataset.currentRole;
        }
    }
}

async function toggleUserStatus(userId, isActive) {
    const action = isActive ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: isActive })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadUsers(); // Reload to refresh UI
        } else {
            alert(`Lỗi: ${data.message}`);
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Bạn có chắc muốn XÓA người dùng "${username}"?\n\nCảnh báo: Tất cả lịch sử chuyển đổi của người dùng này cũng sẽ bị xóa!`)) {
        return;
    }
    
    if (!confirm(`Xác nhận lần cuối: Bạn thực sự muốn xóa "${username}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadUsers(); // Reload to refresh UI
            loadAdminStatistics(); // Update statistics
        } else {
            alert(`Lỗi: ${data.message}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="9" class="loading-text">Đang tải...</td></tr>';
    
    try {
        const response = await fetch('/api/admin/payments');
        const data = await response.json();
        
        if (data.success) {
            const countEl = document.getElementById('paymentsCount');
            if (countEl) countEl.textContent = `Tổng: ${data.total} giao dịch`;
            
            if (data.payments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="loading-text">Chưa có giao dịch nào</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.payments.map(p => {
                const statusBadge = {
                    'pending': '<span style="color:#f59e0b;background:rgba(245,158,11,0.12);padding:3px 10px;border-radius:9999px;font-size:0.8rem;font-weight:600;">⏳ Chờ duyệt</span>',
                    'completed': '<span style="color:#10b981;background:rgba(16,185,129,0.12);padding:3px 10px;border-radius:9999px;font-size:0.8rem;font-weight:600;">✅ Hoàn thành</span>',
                    'failed': '<span style="color:#ef4444;background:rgba(239,68,68,0.12);padding:3px 10px;border-radius:9999px;font-size:0.8rem;font-weight:600;">❌ Thất bại</span>',
                    'cancelled': '<span style="color:#6b7280;background:rgba(107,114,128,0.12);padding:3px 10px;border-radius:9999px;font-size:0.8rem;font-weight:600;">🚫 Hủy</span>'
                }[p.payment_status] || p.payment_status;
                
                const approveBtn = p.payment_status === 'pending' 
                    ? `<button class="btn btn-sm" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:4px 12px;font-size:0.8rem;cursor:pointer;border-radius:6px;" onclick="approvePayment(${p.id})">✓ Duyệt</button>`
                    : '';
                
                return `
                    <tr>
                        <td>#${p.id}</td>
                        <td>${p.username || '-'}</td>
                        <td>${p.package_name || '-'}</td>
                        <td style="font-weight:600;color:#10b981;">${formatNumber(p.amount_vnd)}₫</td>
                        <td>${p.payment_method || '-'}</td>
                        <td>${statusBadge}</td>
                        <td style="font-size:0.8rem;color:var(--text-tertiary);">${p.transaction_id ? p.transaction_id.substring(0,16)+'...' : '-'}</td>
                        <td style="font-size:0.8rem;">${p.created_at || '-'}</td>
                        <td>${approveBtn}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="error-text">Lỗi: ${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        tbody.innerHTML = `<tr><td colspan="9" class="error-text">Lỗi kết nối</td></tr>`;
    }
}

async function approvePayment(paymentId) {
    if (!confirm(`Duyệt payment #${paymentId}?\n\nHệ thống sẽ kiểm tra SePay để xác minh giao dịch trước khi duyệt.`)) return;

    try {
        const response = await fetch('/api/admin/payment/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId })
        });
        const data = await response.json();

        if (data.success) {
            alert(`✅ Duyệt thành công!\n${data.message || ''}`);
            loadPayments();
        } else if (data.failed) {
            // SePay không verify được → payment đã bị mark FAILED
            alert(`${data.message}`);
            loadPayments();  // Reload để hiển thị trạng thái FAILED
        } else {
            alert(`❌ Lỗi: ${data.message}`);
        }
    } catch (error) {
        alert(`Lỗi kết nối: ${error.message}`);
    }
}

async function autoApprovePayments() {
    if (!confirm('Tự động duyệt tất cả các payment đã chờ ≥ 5 phút?')) return;
    
    try {
        const response = await fetch('/api/admin/auto-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes_threshold: 5 })
        });
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Hoàn thành!\n${data.message || ''}\nĐã duyệt: ${data.approved_count || 0} giao dịch`);
            loadPayments();
            loadAdminStatistics();
        } else {
            alert(`Lỗi: ${data.message}`);
        }
    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    }
}

async function generateVoiceSamples() {
    if (!confirm('Ban co chac muon tao file mau cho tat ca giong doc?\n\nQua trinh nay co the mat vai phut.')) {
        return;
    }
    
    const btn = document.getElementById('generateSamplesBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Dang tao...';
    
    try {
        const response = await fetch('/api/admin/generate-voice-samples', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✓ Thanh cong!\n\nDa tao: ${data.generated.length} file\nThat bai: ${data.failed.length} file\n\nFile mau da duoc luu vao /static/voice-samples/`);
            
            if (data.failed.length > 0) {
                console.log('Failed voices:', data.failed);
            }
        } else {
            alert(`Loi: ${data.message}`);
        }
    } catch (error) {
        console.error('Error generating samples:', error);
        alert(`Loi: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
