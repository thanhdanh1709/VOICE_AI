/**
 * History Page JavaScript
 * Xử lý hiển thị lịch sử chuyển đổi và tìm kiếm
 */

let currentPage = 1;
let currentSearch = '';
const perPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Search button handler
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentSearch = document.getElementById('searchInput').value;
            currentPage = 1;
            loadHistory();
        });
    }
    
    // Search on Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentSearch = searchInput.value;
                currentPage = 1;
                loadHistory();
            }
        });
    }
});

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Đang tải...</td></tr>';
    
    try {
        const url = `/api/history?page=${currentPage}&per_page=${perPage}&search=${encodeURIComponent(currentSearch)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayHistory(data.conversions);
            displayPagination(data.total, data.page, data.per_page);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Lỗi tải dữ liệu</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Lỗi kết nối: ' + error.message + '</td></tr>';
    }
}

function displayHistory(conversions) {
    const tbody = document.getElementById('historyTableBody');
    
    if (conversions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Không có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = conversions.map(conv => `
        <tr>
            <td>${conv.id}</td>
            <td>${conv.text_input.substring(0, 50)}${conv.text_input.length > 50 ? '...' : ''}</td>
            <td>${conv.voice_name || conv.voice_id}</td>
            <td><span class="status-badge ${conv.status}">${getStatusText(conv.status)}</span></td>
            <td>${utils.formatDate(conv.created_at)}</td>
            <td>
                ${conv.audio_file_path ? `
                    <a href="/api/audio/${conv.audio_file_path.split('/').pop()}" 
                       class="btn btn-secondary btn-sm" 
                       download>Tải xuống</a>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function displayPagination(total, page, per_page) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(total / per_page);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Trước</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            html += `<button onclick="goToPage(${i})" class="${i === page ? 'active' : ''}">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button onclick="goToPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Sau</button>`;
    
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadHistory();
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'failed': 'Thất bại'
    };
    return statusMap[status] || status;
}
