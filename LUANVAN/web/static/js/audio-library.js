/**
 * Audio Library JavaScript
 * Quản lý thư viện audio
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

// Waveform height patterns for visual variety
const WAVEFORMS = [
    [12, 20, 8, 24, 16, 8, 12, 4, 16, 8],
    [8, 16, 24, 12, 20, 6, 18, 10, 22, 14],
    [20, 8, 16, 4, 24, 12, 6, 18, 10, 20],
    [6, 22, 10, 18, 8, 24, 14, 6, 20, 12],
    [16, 10, 20, 14, 6, 22, 8, 18, 12, 24],
];

document.addEventListener('DOMContentLoaded', () => {
    loadVoicesForFilter();
    loadAudioLibrary();

    // Filter button
    document.getElementById('filterBtn').addEventListener('click', applyFilters);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);

    // View toggle
    document.querySelectorAll('.view-btn-modern').forEach(btn => {
        btn.addEventListener('click', function () {
            currentView = this.dataset.view;
            document.querySelectorAll('.view-btn-modern').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const container = document.getElementById('audioContainer');
            if (currentView === 'grid') {
                container.className = 'audio-grid-modern gap-5 mb-8';
            } else {
                container.className = 'audio-list-modern gap-0 mb-8';
            }
            renderAudioItems(window.currentAudios || []);
        });
    });

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; loadAudioLibrary(); }
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentPage < totalPages) { currentPage++; loadAudioLibrary(); }
    });

    // Search on Enter
    document.getElementById('searchInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') applyFilters();
    });
});

// ── Voice filter ──────────────────────────────────────────────────────────────
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
    } catch (e) {
        console.error('Error loading voices:', e);
    }
}

// ── Filter controls ───────────────────────────────────────────────────────────
function applyFilters() {
    filters.search  = document.getElementById('searchInput').value;
    filters.voice   = document.getElementById('voiceFilter').value;
    filters.dateFrom = document.getElementById('dateFrom').value;
    filters.dateTo  = document.getElementById('dateTo').value;
    filters.sortBy  = document.getElementById('sortBy').value;
    currentPage = 1;
    loadAudioLibrary();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('voiceFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('sortBy').value = 'newest';
    filters = { search: '', voice: '', dateFrom: '', dateTo: '', sortBy: 'newest' };
    currentPage = 1;
    loadAudioLibrary();
}

// ── Load from API ─────────────────────────────────────────────────────────────
async function loadAudioLibrary() {
    const container = document.getElementById('audioContainer');
    container.innerHTML = `
        <div style="grid-column:1/-1" class="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <div style="width:32px;height:32px;border:3px solid rgba(208,188,255,0.15);border-top-color:#d0bcff;border-radius:50%;animation:spin 0.8s linear infinite"></div>
            <p class="text-sm">Đang tải thư viện...</p>
        </div>`;

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
            const badge = document.getElementById('audioCount');
            badge.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:14px">folder</span>
                Tổng: <strong>${data.total}</strong> audio`;

            renderAudioItems(data.audios);
            updatePagination(data.page, data.total_pages);
        } else {
            container.innerHTML = `
                <div style="grid-column:1/-1" class="flex flex-col items-center py-14 gap-2 text-on-surface-variant">
                    <span class="material-symbols-outlined" style="font-size:40px">error_outline</span>
                    <p class="text-sm">Lỗi: ${data.message || 'Không thể tải thư viện'}</p>
                </div>`;
        }
    } catch (e) {
        console.error('Error loading audio library:', e);
        container.innerHTML = `
            <div style="grid-column:1/-1" class="flex flex-col items-center py-14 gap-2 text-on-surface-variant">
                <span class="material-symbols-outlined" style="font-size:40px">wifi_off</span>
                <p class="text-sm">Lỗi kết nối. Vui lòng tải lại trang.</p>
            </div>`;
    }
}

// ── Render items ──────────────────────────────────────────────────────────────
function renderAudioItems(audios) {
    const container = document.getElementById('audioContainer');

    if (audios.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1" class="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
                <span class="material-symbols-outlined" style="font-size:56px;opacity:0.3">library_music</span>
                <div class="text-center">
                    <p class="text-base font-semibold text-on-surface">Chưa có audio nào</p>
                    <p class="text-sm mt-1">Hãy tạo audio đầu tiên của bạn!</p>
                </div>
                <a href="/index" class="mt-2 px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors no-underline flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size:16px">add_circle</span>
                    Tạo Audio mới
                </a>
            </div>`;
        return;
    }

    if (currentView === 'grid') {
        container.innerHTML = audios.map((audio, idx) => createGridCard(audio, idx)).join('');
    } else {
        container.innerHTML = `
            <table class="audio-table-modern">
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
            </table>`;
    }

    // Attach play button listeners for grid cards
    if (currentView === 'grid') {
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const audioEl = this.closest('article').querySelector('.audio-ctrl');
                if (!audioEl) return;
                const timeEl = this.closest('article').querySelector('.current-time');
                const bars = this.closest('article').querySelectorAll('.waveform-bar');

                if (audioEl.paused) {
                    // Pause all others first
                    document.querySelectorAll('.audio-ctrl').forEach(a => {
                        if (a !== audioEl && !a.paused) {
                            a.pause();
                            const otherBtn = a.closest('article')?.querySelector('.play-btn');
                            otherBtn?.classList.remove('playing');
                            a.closest('article')?.querySelectorAll('.waveform-bar').forEach(b => b.classList.remove('playing'));
                        }
                    });
                    audioEl.play();
                    this.classList.add('playing');
                    bars.forEach(b => b.classList.add('playing'));

                    audioEl.ontimeupdate = () => {
                        if (timeEl) timeEl.textContent = formatDuration(audioEl.currentTime);
                    };
                    audioEl.onended = () => {
                        this.classList.remove('playing');
                        bars.forEach(b => b.classList.remove('playing'));
                        if (timeEl) timeEl.textContent = '0:00';
                    };
                } else {
                    audioEl.pause();
                    this.classList.remove('playing');
                    bars.forEach(b => b.classList.remove('playing'));
                }
            });
        });
    }
}

// ── Grid card ─────────────────────────────────────────────────────────────────
function createGridCard(audio, idx) {
    const filename = getFilename(audio.audio_file_path);
    const audioUrl = `/api/audio/${filename}`;
    const wavePattern = WAVEFORMS[idx % WAVEFORMS.length];
    const playedCount = 4;

    const waveformBars = wavePattern.map((h, i) => {
        const isPlayed = i < playedCount;
        const color = isPlayed ? '#2fd9f4' : '#273647';
        return `<div class="waveform-bar" style="width:4px;height:${h}px;background:${color};border-radius:2px;flex-shrink:0;transition:height 0.1s ease"></div>`;
    }).join('');

    const hasTopAccent = idx % 3 === 0;
    const accentBar = hasTopAccent
        ? `<div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/70 to-tertiary/70 rounded-t-xl"></div>`
        : '';

    return `
<article class="glass-panel rounded-xl p-5 flex flex-col border border-white/5 hover:border-primary/25 transition-all duration-300 relative overflow-hidden group" data-id="${audio.id}">
    ${accentBar}
    <div class="flex justify-between items-start mb-3">
        <h3 class="text-[15px] font-semibold leading-snug text-on-surface pr-4 line-clamp-2 group-hover:text-primary transition-colors"
            title="${escapeHtml(audio.text_input)}">${truncate(audio.text_input, 90)}</h3>
    </div>

    <div class="inline-flex items-center gap-2 bg-surface-container px-2.5 py-1 rounded-md w-fit mb-3 border border-outline-variant/40">
        <span class="material-symbols-outlined text-tertiary" style="font-size:14px;font-variation-settings:'FILL' 1">graphic_eq</span>
        <span class="text-xs text-on-surface-variant font-medium">${escapeHtml(audio.voice_name || audio.voice_id || '—')}</span>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mb-4">
        <div class="flex items-center gap-1">
            <span class="material-symbols-outlined" style="font-size:14px">schedule</span>
            ${formatDuration(audio.duration_seconds)}
        </div>
        <div class="flex items-center gap-1">
            <span class="material-symbols-outlined" style="font-size:14px">sd_storage</span>
            ${formatSize(audio.audio_file_size)}
        </div>
        <div class="flex items-center gap-1">
            <span class="material-symbols-outlined" style="font-size:14px">calendar_today</span>
            ${formatDate(audio.created_at)}
        </div>
    </div>

    <div class="mt-auto">
        <!-- Player row -->
        <div class="bg-surface-container-high rounded-lg p-2 mb-3 flex items-center gap-3">
            <button class="play-btn w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary hover:bg-primary/80 transition-colors shrink-0" style="color:#3c0091">
                <span class="play-icon material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:20px">play_arrow</span>
                <span class="pause-icon material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:20px">pause</span>
            </button>
            <div class="flex-1 flex items-center justify-between gap-1 overflow-hidden py-1">
                ${waveformBars}
            </div>
            <span class="current-time text-xs text-on-surface-variant font-mono shrink-0">0:00</span>
        </div>
        <audio class="audio-ctrl" src="${audioUrl}" preload="none"></audio>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-1 border-t border-outline-variant/25 pt-3">
            <a href="${audioUrl}" download
               class="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors text-xs font-semibold no-underline">
                <span class="material-symbols-outlined" style="font-size:15px">download</span> Tải
            </a>
            <button onclick="deleteAudio(${audio.id})"
               class="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors text-xs font-semibold">
                <span class="material-symbols-outlined" style="font-size:15px">delete</span> Xóa
            </button>
        </div>
    </div>
</article>`;
}

// ── List row ──────────────────────────────────────────────────────────────────
function createListRow(audio) {
    const filename = getFilename(audio.audio_file_path);
    const audioUrl = `/api/audio/${filename}`;

    return `
<tr data-id="${audio.id}">
    <td class="text-col" title="${escapeHtml(audio.text_input)}">${truncate(audio.text_input, 60)}</td>
    <td>${escapeHtml(audio.voice_name || audio.voice_id || '—')}</td>
    <td>${formatDuration(audio.duration_seconds)}</td>
    <td>${formatSize(audio.audio_file_size)}</td>
    <td>${formatDate(audio.created_at)}</td>
    <td class="actions-col">
        <audio controls src="${audioUrl}" preload="none" class="mini-player"></audio>
        <a href="${audioUrl}" download
           class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container border border-outline-variant/50 text-on-surface-variant hover:text-on-surface text-xs font-medium no-underline transition-colors">
            <span class="material-symbols-outlined" style="font-size:13px">download</span>
        </a>
        <button onclick="deleteAudio(${audio.id})"
           class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors">
            <span class="material-symbols-outlined" style="font-size:13px">delete</span>
        </button>
    </td>
</tr>`;
}

// ── Pagination ────────────────────────────────────────────────────────────────
function updatePagination(page, total) {
    const pagination = document.getElementById('pagination');
    const prevBtn   = document.getElementById('prevBtn');
    const nextBtn   = document.getElementById('nextBtn');
    const pageInfo  = document.getElementById('pageInfo');

    if (total <= 1) {
        pagination.style.setProperty('display', 'none', 'important');
        return;
    }

    pagination.style.removeProperty('display');
    pagination.style.display = 'flex';
    pageInfo.textContent = `Trang ${page} / ${total}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= total;
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteAudio(id) {
    if (!confirm('Bạn có chắc muốn xóa audio này?')) return;

    try {
        const response = await fetch(`/api/audio-library/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadAudioLibrary();
        } else {
            alert(`Lỗi: ${data.message}`);
        }
    } catch (e) {
        console.error('Error deleting audio:', e);
        alert('Lỗi kết nối');
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function getFilename(path) {
    if (!path) return '';
    return path.split('/').pop().split('\\').pop();
}

function truncate(text, maxLength) {
    if (!text) return '';
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '…';
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
    return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDate(dateString) {
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
