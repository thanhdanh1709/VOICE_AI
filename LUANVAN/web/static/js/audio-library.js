/**
 * Audio Library JavaScript
 * Quan ly thu vien audio
 */

let currentPage = 1;
let totalPages = 1;
let currentView = 'grid';
let filters = {
    search: '',
    voice: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest'
};

document.addEventListener('DOMContentLoaded', () => {
    loadVoicesForFilter();
    loadAudioLibrary();
    
    // Filter button
    document.getElementById('filterBtn').addEventListener('click', applyFilters);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    
    // View toggle
    document.querySelectorAll('.view-btn-modern').forEach(btn => {
        btn.addEventListener('click', function() {
            currentView = this.dataset.view;
            document.querySelectorAll('.view-btn-modern').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const container = document.getElementById('audioContainer');
            container.className = currentView === 'grid' ? 'audio-grid-modern' : 'audio-list-modern';
            
            // Reload to rerender
            renderAudioItems(window.currentAudios || []);
        });
    });
    
    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadAudioLibrary();
        }
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadAudioLibrary();
        }
    });
    
    // Search on Enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
});

async function loadVoicesForFilter() {
    try {
        const response = await fetch('/api/voices');
        const data = await response.json();
        
        if (data.success && data.voices) {
            const select = document.getElementById('voiceFilter');
            select.innerHTML = '<option value="">Tất cả giọng đọc</option>';
            data.voices.forEach(voice => {
                select.innerHTML += `<option value="${voice.voice_id}">${voice.voice_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading voices:', error);
    }
}

function applyFilters() {
    filters.search = document.getElementById('searchInput').value;
    filters.voice = document.getElementById('voiceFilter').value;
    filters.dateFrom = document.getElementById('dateFrom').value;
    filters.dateTo = document.getElementById('dateTo').value;
    filters.sortBy = document.getElementById('sortBy').value;
    
    currentPage = 1;
    loadAudioLibrary();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('voiceFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('sortBy').value = 'newest';
    
    filters = {
        search: '',
        voice: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest'
    };
    
    currentPage = 1;
    loadAudioLibrary();
}

async function loadAudioLibrary() {
    const container = document.getElementById('audioContainer');
    container.innerHTML = `
        <div class="loading-library">
            <div class="loading-spinner-small"></div>
            <p>Đang tải thư viện...</p>
        </div>
    `;
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 12,
            search: filters.search,
            voice: filters.voice,
            date_from: filters.dateFrom,
            date_to: filters.dateTo,
            sort_by: filters.sortBy
        });
        
        const response = await fetch(`/api/audio-library?${params}`);
        const data = await response.json();
        
        if (data.success) {
            window.currentAudios = data.audios;
            totalPages = data.total_pages;
            
            // Update count badge
            document.getElementById('audioCount').innerHTML = `
                <span class="count-icon">📁</span>
                Tổng: <strong>${data.total}</strong> audio
            `;
            
            // Render audios
            renderAudioItems(data.audios);
            
            // Update pagination
            updatePagination(data.page, data.total_pages);
        } else {
            container.innerHTML = `<div class="error-text">Lỗi: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading audio library:', error);
        container.innerHTML = '<div class="error-text">Lỗi kết nối</div>';
    }
}

function renderAudioItems(audios) {
    const container = document.getElementById('audioContainer');
    
    if (audios.length === 0) {
        container.innerHTML = `
            <div class="empty-history-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">📭</div>
                <p class="empty-title">Chưa có audio nào</p>
                <p class="empty-subtitle">Hãy tạo audio đầu tiên của bạn!</p>
            </div>
        `;
        return;
    }
    
    if (currentView === 'grid') {
        container.innerHTML = audios.map(audio => createGridCard(audio)).join('');
    } else {
        container.innerHTML = `
            <table class="audio-table-modern" style="grid-column: 1 / -1;">
                <thead>
                    <tr>
                        <th>Nội dung</th>
                        <th>Giọng đọc</th>
                        <th>Thời lượng</th>
                        <th>Kích thước</th>
                        <th>Ngày tạo</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    ${audios.map(audio => createListRow(audio)).join('')}
                </tbody>
            </table>
        `;
    }
}

function createGridCard(audio) {
    const filename = getFilename(audio.audio_file_path);
    const audioUrl = `/api/audio/${filename}`;
    
    return `
        <div class="audio-card" data-id="${audio.id}">
            <div class="audio-info">
                <h4 title="${escapeHtml(audio.text_input)}">${truncate(audio.text_input, 80)}</h4>
                <div class="metadata">
                    <span>🎤 ${audio.voice_name || audio.voice_id}</span>
                    <span>⏱️ ${formatDuration(audio.duration_seconds)}</span>
                    <span>💾 ${formatSize(audio.audio_file_size)}</span>
                    <span>📅 ${formatDate(audio.created_at)}</span>
                </div>
            </div>
            <audio controls src="${audioUrl}" preload="none"></audio>
            <div class="audio-actions">
                <a href="${audioUrl}" download class="btn btn-sm btn-secondary">⬇️ Tai</a>
                <button onclick="deleteAudio(${audio.id})" class="btn btn-sm btn-danger">🗑️ Xoa</button>
            </div>
        </div>
    `;
}

function createListRow(audio) {
    const filename = getFilename(audio.audio_file_path);
    const audioUrl = `/api/audio/${filename}`;
    
    return `
        <tr data-id="${audio.id}">
            <td class="text-col" title="${escapeHtml(audio.text_input)}">${truncate(audio.text_input, 50)}</td>
            <td>${audio.voice_name || audio.voice_id}</td>
            <td>${formatDuration(audio.duration_seconds)}</td>
            <td>${formatSize(audio.audio_file_size)}</td>
            <td>${formatDate(audio.created_at)}</td>
            <td class="actions-col">
                <audio controls src="${audioUrl}" preload="none" class="mini-player"></audio>
                <a href="${audioUrl}" download class="btn btn-sm btn-secondary">⬇️</a>
                <button onclick="deleteAudio(${audio.id})" class="btn btn-sm btn-danger">🗑️</button>
            </td>
        </tr>
    `;
}

function updatePagination(page, total) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (total <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `Trang ${page} / ${total}`;
    
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= total;
}

async function deleteAudio(id) {
    if (!confirm('Ban co chac muon xoa audio nay?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/audio-library/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Da xoa thanh cong!');
            loadAudioLibrary(); // Reload
        } else {
            alert(`Loi: ${data.message}`);
        }
    } catch (error) {
        console.error('Error deleting audio:', error);
        alert('Loi ket noi');
    }
}

// Utility functions
function getFilename(path) {
    if (!path) return '';
    return path.split('/').pop().split('\\').pop();
}

function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
