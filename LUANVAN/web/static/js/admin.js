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

function renderTrendChart(chartData) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    // Destroy existing chart if exists
    if (trendChart) {
        trendChart.destroy();
    }
    
    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
    gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.15)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.label),
            datasets: [{
                label: '📊 Số chuyển đổi',
                data: chartData.map(d => d.conversions),
                borderColor: '#667eea',
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#667eea',
                pointBorderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#667eea',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
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
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#4a5568',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Chuyển đổi: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: '#718096'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: '#718096'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderVoiceDistributionChart(voiceData) {
    const ctx = document.getElementById('voiceDistributionChart');
    if (!ctx) return;
    
    // Destroy existing chart if exists
    if (voiceDistributionChart) {
        voiceDistributionChart.destroy();
    }
    
    // Beautiful diverse colors
    const colors = [
        '#667eea', // Purple
        '#4facfe', // Blue
        '#43e97b', // Green
        '#fa709a', // Pink
        '#fee140', // Yellow
        '#f093fb', // Light Pink
        '#00f2fe', // Cyan
        '#38f9d7', // Teal
        '#764ba2', // Dark Purple
        '#ff6a88', // Coral
        '#ffd89b', // Peach
        '#84fab0', // Mint
        '#ff99ac', // Rose
        '#7f7fd5', // Indigo
        '#30cfd0'  // Turquoise
    ];
    
    const hoverColors = [
        '#5568d3', '#3f8fe0', '#2fd063', '#e55f88', '#efd030',
        '#df79eb', '#00d8e4', '#28e9c7', '#6a3f8f', '#e55876',
        '#edc88b', '#74eaa0', '#e88998', '#6f6fc5', '#20bfc0'
    ];
    
    voiceDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: voiceData.map(d => d.voice_name),
            datasets: [{
                data: voiceData.map(d => d.count),
                backgroundColor: colors.slice(0, voiceData.length),
                hoverBackgroundColor: hoverColors.slice(0, voiceData.length),
                borderWidth: 3,
                borderColor: '#fff',
                hoverBorderWidth: 4,
                hoverBorderColor: '#fff'
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
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#4a5568',
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} lần (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            radius: '90%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000
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
