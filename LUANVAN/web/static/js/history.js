/**
 * History Page JavaScript
 * Xử lý hiển thị lịch sử chuyển đổi và tìm kiếm
 */

let currentPage = 1;
let currentSearch = '';
const perPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentSearch = document.getElementById('searchInput').value.trim();
            currentPage = 1;
            loadHistory();
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                currentSearch = searchInput.value.trim();
                currentPage = 1;
                loadHistory();
            }
        });
    }

    // Expose reset for inline onclick
    window.historyReset = () => {
        currentSearch = '';
        currentPage = 1;
        loadHistory();
    };
});

// ── Load from API ─────────────────────────────────────────────────────────────
async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('emptyHistoryState');

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="px-5 py-14 text-center">
                <div class="flex flex-col items-center gap-3 text-on-surface-variant">
                    <div style="width:28px;height:28px;border:3px solid rgba(208,188,255,0.15);border-top-color:#d0bcff;border-radius:50%;animation:spin 0.8s linear infinite"></div>
                    <p class="text-sm">Đang tải dữ liệu...</p>
                </div>
            </td>
        </tr>`;

    try {
        const url = `/api/history?page=${currentPage}&per_page=${perPage}&search=${encodeURIComponent(currentSearch)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            displayHistory(data.conversions, data.total);
            displayPagination(data.total, data.page, data.per_page);
        } else {
            tbody.innerHTML = buildErrorRow('Lỗi tải dữ liệu: ' + (data.message || ''));
        }
    } catch (error) {
        console.error('Error loading history:', error);
        tbody.innerHTML = buildErrorRow('Lỗi kết nối. Vui lòng thử lại.');
    }
}

// ── Render rows ───────────────────────────────────────────────────────────────
function displayHistory(conversions, total) {
    const tbody = document.getElementById('historyTableBody');
    const totalEl = document.getElementById('totalRecords');
    const emptyState = document.getElementById('emptyHistoryState');

    if (totalEl) totalEl.textContent = total || 0;

    if (!conversions || conversions.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        }
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = conversions.map(conv => {
        const filename = conv.audio_file_path
            ? conv.audio_file_path.split('/').pop().split('\\').pop()
            : null;
        const audioUrl = filename ? `/api/audio/${filename}` : null;
        const textPreview = conv.text_input
            ? (conv.text_input.length > 70 ? conv.text_input.substring(0, 70) + '…' : conv.text_input)
            : '—';
        const voiceName = conv.voice_name || conv.voice_id || '—';
        const createdAt = (window.utils && utils.formatDate)
            ? utils.formatDate(conv.created_at)
            : formatDateFallback(conv.created_at);

        const statusBadge = buildStatusBadge(conv.status);

        const actionDownload = audioUrl
            ? `<a href="${audioUrl}" download
                 class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center no-underline"
                 title="Tải xuống">
                 <span class="material-symbols-outlined" style="font-size:18px">download</span>
               </a>`
            : `<button class="p-2 text-outline-variant rounded-lg flex items-center justify-center cursor-not-allowed" disabled title="Chưa có file">
                 <span class="material-symbols-outlined" style="font-size:18px">download</span>
               </button>`;

        const actionDelete = `
            <button onclick="deleteHistoryRecord(${conv.id})"
              class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors flex items-center justify-center"
              title="Xóa">
              <span class="material-symbols-outlined" style="font-size:18px">delete</span>
            </button>`;

        const voiceInitials = voiceName.length >= 2
            ? voiceName.substring(0, 2).toUpperCase()
            : voiceName.toUpperCase();

        return `
<tr class="hover:bg-surface-bright/20 transition-colors group">
    <td class="px-5 py-3.5 text-xs text-on-surface-variant font-mono">#${conv.id}</td>
    <td class="px-5 py-3.5 text-sm text-on-surface" style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
        title="${escapeHtml(conv.text_input)}">${escapeHtml(textPreview)}</td>
    <td class="px-5 py-3.5">
        <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline/20 text-[10px] font-bold text-on-surface-variant shrink-0">
                ${voiceInitials}
            </div>
            <span class="text-sm text-on-surface">${escapeHtml(voiceName)}</span>
        </div>
    </td>
    <td class="px-5 py-3.5">${statusBadge}</td>
    <td class="px-5 py-3.5 text-sm text-on-surface-variant whitespace-nowrap">${createdAt}</td>
    <td class="px-5 py-3.5 text-right">
        <div class="row-actions flex justify-end gap-1">
            ${actionDownload}
            ${actionDelete}
        </div>
    </td>
</tr>`;
    }).join('');
}

// ── Status badge ──────────────────────────────────────────────────────────────
function buildStatusBadge(status) {
    const map = {
        completed: { cls: 'status-completed', text: 'Thành công' },
        pending:   { cls: 'status-pending',   text: 'Chờ xử lý' },
        processing:{ cls: 'status-processing',text: 'Đang xử lý' },
        failed:    { cls: 'status-failed',    text: 'Thất bại' },
    };
    const s = map[status] || { cls: 'status-pending', text: status || 'N/A' };
    return `<span class="${s.cls}"><span class="status-dot"></span>${s.text}</span>`;
}

// ── Pagination ────────────────────────────────────────────────────────────────
function displayPagination(total, page, per_page) {
    const pagination = document.getElementById('pagination');
    const infoEl = document.getElementById('paginationInfo');
    const totalPages = Math.ceil(total / per_page);

    const start = (page - 1) * per_page + 1;
    const end = Math.min(page * per_page, total);
    if (infoEl) {
        infoEl.textContent = total > 0
            ? `Hiển thị ${start}–${end} của ${total} kết quả`
            : 'Không có kết quả';
    }

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Prev button
    html += `<button onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}
        class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-on-surface">
        <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span>
    </button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            html += `<button onclick="goToPage(${i})"
                class="page-btn w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors ${i === page ? 'active' : ''}">
                ${i}
            </button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += `<span class="text-outline-variant px-1 text-sm">…</span>`;
        }
    }

    // Next button
    html += `<button onclick="goToPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}
        class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-on-surface">
        <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
    </button>`;

    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteHistoryRecord(id) {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    try {
        const response = await fetch(`/api/audio-library/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadHistory();
        } else {
            alert('Lỗi: ' + (data.message || 'Không thể xóa'));
        }
    } catch (e) {
        alert('Lỗi kết nối');
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function buildErrorRow(msg) {
    return `<tr><td colspan="6" class="px-5 py-12 text-center">
        <div class="flex flex-col items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">wifi_off</span>
            <p class="text-sm">${msg}</p>
        </div>
    </td></tr>`;
}

function formatDateFallback(dateString) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const day   = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year  = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
