/**
 * Voice Picker — Thư viện giọng đọc (Phase 1)
 */
(function () {
    'use strict';

    const FAV_KEY = 'vv-fav-voices';

    let systemVoices = [];
    let customVoices = [];
    let pendingSelectId = null;
    let playingAudio = null;
    let playingId = null;

    const state = {
        tab: 'system',
        gender: 'all',
        region: 'all',
        search: '',
        favOnly: false,
    };

    function t(key, fallback) {
        if (window.VVi18n && window.VVi18n.t) {
            const s = window.VVi18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback || key;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function toggleFavorite(id) {
        const favs = getFavorites();
        const idx = favs.indexOf(id);
        if (idx >= 0) favs.splice(idx, 1);
        else favs.push(id);
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    }

    function normalizeRegion(voice) {
        const d = (voice.description || '').toLowerCase();
        const r = (voice.region || '').toLowerCase();
        if (d.includes('bắc') || d.includes('miền bắc') || r === 'north') return 'north';
        if (d.includes('miền nam') || (d.includes('nam') && !d.includes('bắc')) || r === 'south') return 'south';
        if (d.includes('trung') || r === 'central') return 'central';
        return 'other';
    }

    function getVoiceId(voice, isCustom) {
        return isCustom ? `custom_${voice.id}` : voice.voice_id;
    }

    function getMetaLine(voice, isCustom) {
        if (isCustom) {
            const score = voice.quality_score != null ? Number(voice.quality_score).toFixed(1) : '0';
            return `${t('gallery.custom_badge', 'Clone')} · ⭐${score}`;
        }
        const parts = [];
        if (voice.gender === 'male') parts.push(t('gallery.filter.male', 'Nam'));
        else if (voice.gender === 'female') parts.push(t('gallery.filter.female', 'Nữ'));
        const desc = (voice.description || '').trim();
        const region = (voice.region || '').trim();
        if (desc) parts.push(desc);
        else if (region) parts.push(region);
        return parts.join(' · ') || '—';
    }

    function findVoiceById(id) {
        if (!id) return null;
        if (id.startsWith('custom_')) {
            const num = id.replace('custom_', '');
            const c = customVoices.find((v) => String(v.id) === num);
            return c ? { ...c, _custom: true } : null;
        }
        const s = systemVoices.find((v) => v.voice_id === id);
        return s ? { ...s, _custom: false } : null;
    }

    function getFilteredVoices() {
        const list =
            state.tab === 'custom'
                ? customVoices.map((v) => ({ ...v, _custom: true }))
                : systemVoices.map((v) => ({ ...v, _custom: false }));

        const favs = getFavorites();
        const q = state.search.toLowerCase();

        return list.filter((v) => {
            const id = getVoiceId(v, v._custom);
            const name = (v._custom ? v.name : v.voice_name) || '';

            if (state.favOnly && !favs.includes(id)) return false;

            if (q) {
                const desc = (v.description || '').toLowerCase();
                if (!name.toLowerCase().includes(q) && !desc.includes(q)) return false;
            }

            if (!v._custom) {
                if (state.gender !== 'all' && v.gender !== state.gender) return false;
                if (state.region !== 'all') {
                    const reg = normalizeRegion(v);
                    if (state.region === 'north' && reg !== 'north') return false;
                    if (state.region === 'south' && reg !== 'south') return false;
                }
            }

            return true;
        });
    }

    function getSampleUrl(id) {
        const v = findVoiceById(id);
        if (!v || v._custom) return null;
        if (v.sample_url) return v.sample_url;
        if (v.has_sample) return `/static/voice-samples/${v.voice_id}_sample.wav`;
        return null;
    }

    function getPreviewAudio() {
        let audio = document.getElementById('vpPreviewAudio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'vpPreviewAudio';
            audio.className = 'vp-preview-audio';
            audio.preload = 'none';
            const modal = document.getElementById('voiceGalleryModal');
            if (modal) modal.appendChild(audio);
        }
        return audio;
    }

    function isPreviewPlaying(id) {
        return playingId === id && playingAudio && !playingAudio.paused && !playingAudio.ended;
    }

    function updatePlayButtons() {
        const grid = document.getElementById('voiceGalleryGrid');
        if (!grid) return;
        grid.querySelectorAll('[data-play]').forEach((btn) => {
            const id = btn.dataset.play;
            const playing = isPreviewPlaying(id);
            btn.classList.toggle('is-playing', playing);
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = playing ? 'pause' : 'play_arrow';
        });
    }

    function stopAudio() {
        if (playingAudio) {
            playingAudio.pause();
            playingAudio.currentTime = 0;
            playingAudio.onended = null;
        }
        playingId = null;
    }

    function playPreview(id) {
        if (isPreviewPlaying(id)) {
            stopAudio();
            updatePlayButtons();
            return;
        }

        const url = getSampleUrl(id);
        if (!url) return;

        stopAudio();
        playingAudio = getPreviewAudio();
        playingId = id;
        playingAudio.src = url;
        playingAudio.onended = () => {
            stopAudio();
            updatePlayButtons();
        };
        playingAudio.play().catch((err) => {
            console.warn('[VoicePicker] preview failed:', err);
            stopAudio();
            updatePlayButtons();
        });
        updatePlayButtons();
    }

    function renderCard(voice) {
        const isCustom = voice._custom;
        const id = getVoiceId(voice, isCustom);
        const name = isCustom ? voice.name : voice.voice_name;
        const selected = pendingSelectId === id;
        const hasSample = !isCustom && voice.has_sample && voice.sample_url;
        const favs = getFavorites();
        const isFav = favs.includes(id);
        const playing = isPreviewPlaying(id);
        const genderIcon =
            voice.gender === 'male' ? 'face_3' : voice.gender === 'female' ? 'face_4' : 'mic';
        const avatarIcon = isCustom ? 'record_voice_over' : genderIcon;

        return `
        <div class="vp-card${selected ? ' vp-card--selected' : ''}" data-voice-id="${escapeHtml(id)}" role="button" tabindex="0" aria-pressed="${selected}">
            ${hasSample
                ? `<button type="button" class="vp-card__play${playing ? ' is-playing' : ''}" data-play="${escapeHtml(id)}" aria-label="${t('gallery.preview', 'Nghe thử')}">
                    <span class="material-symbols-outlined">${playing ? 'pause' : 'play_arrow'}</span>
                   </button>`
                : `<span class="vp-card__no-sample material-symbols-outlined" title="${t('gallery.no_sample', 'Chưa có mẫu')}">volume_off</span>`}
            <button type="button" class="vp-card__fav${isFav ? ' is-active' : ''}" data-fav="${escapeHtml(id)}" aria-label="${t('gallery.favorites', 'Yêu thích')}">
                <span class="material-symbols-outlined">${isFav ? 'star' : 'star_outline'}</span>
            </button>
            <div class="vp-card__avatar">
                <span class="material-symbols-outlined">${avatarIcon}</span>
            </div>
            <p class="vp-card__name">${escapeHtml(name)}</p>
            <p class="vp-card__meta">${escapeHtml(getMetaLine(voice, isCustom))}</p>
        </div>`;
    }

    function updateFooterLabel() {
        const el = document.getElementById('vpSelectedLabel');
        const confirmBtn = document.getElementById('vpConfirmBtn');
        if (!el) return;

        if (pendingSelectId) {
            const v = findVoiceById(pendingSelectId);
            if (v) {
                const name = v._custom ? v.name : v.voice_name;
                el.textContent = `${t('gallery.selected', 'Đã chọn')}: ${name} — ${getMetaLine(v, v._custom)}`;
            }
            if (confirmBtn) confirmBtn.disabled = false;
        } else {
            el.textContent = t('gallery.select_hint', 'Chọn một giọng để tiếp tục');
            if (confirmBtn) confirmBtn.disabled = true;
        }
    }

    function bindCardEvents() {
        const grid = document.getElementById('voiceGalleryGrid');
        if (!grid) return;

        grid.querySelectorAll('.vp-card').forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.vp-card__play') || e.target.closest('.vp-card__fav')) return;
                pendingSelectId = card.dataset.voiceId;
                render();
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pendingSelectId = card.dataset.voiceId;
                    render();
                }
            });
        });

        grid.querySelectorAll('[data-play]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playPreview(btn.dataset.play);
            });
        });

        grid.querySelectorAll('[data-fav]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(btn.dataset.fav);
                render();
            });
        });
    }

    function render() {
        const grid = document.getElementById('voiceGalleryGrid');
        if (!grid) return;

        if (state.tab === 'custom' && customVoices.length === 0) {
            grid.innerHTML = `<div class="vp-empty">${t('gallery.empty_custom', 'Chưa có giọng clone. Thêm giọng tại Giọng của tôi.')}</div>`;
            updateFooterLabel();
            return;
        }

        const filtered = getFilteredVoices();
        if (systemVoices.length === 0 && state.tab === 'system') {
            grid.innerHTML = `<div class="vp-loading"><div class="vv-spinner" style="margin:0 auto 0.75rem"></div>${t('gallery.loading', 'Đang tải...')}</div>`;
        } else if (filtered.length === 0) {
            grid.innerHTML = `<div class="vp-empty">${t('gallery.empty', 'Không có giọng phù hợp')}</div>`;
        } else {
            grid.innerHTML = filtered.map((v) => renderCard(v)).join('');
            bindCardEvents();
        }

        updateFooterLabel();
    }

    function updateTabUI() {
        document.querySelectorAll('[data-vp-tab]').forEach((tab) => {
            tab.classList.toggle('is-active', tab.dataset.vpTab === state.tab);
        });
        const customTab = document.getElementById('vpTabCustom');
        if (customTab) {
            customTab.style.display = customVoices.length > 0 ? '' : 'none';
        }
        const chips = document.getElementById('vpChips');
        if (chips) {
            chips.style.display = state.tab === 'custom' ? 'none' : '';
        }
    }

    function updateChipUI() {
        document.querySelectorAll('[data-vp-filter]').forEach((chip) => {
            const type = chip.dataset.vpFilter;
            const val = chip.dataset.value;
            let active = false;
            if (type === 'gender') active = state.gender === val;
            if (type === 'region') active = state.region === val;
            if (type === 'fav') active = state.favOnly;
            chip.classList.toggle('is-active', active);
        });
    }

    function resetFilters() {
        state.gender = 'all';
        state.region = 'all';
        state.search = '';
        state.favOnly = false;
        const searchInput = document.getElementById('vpSearchInput');
        if (searchInput) searchInput.value = '';
        updateChipUI();
    }

    function open() {
        const modal = document.getElementById('voiceGalleryModal');
        if (!modal) return;

        const select = document.getElementById('voiceSelect');
        pendingSelectId = select && select.value ? select.value : null;

        state.tab = pendingSelectId && pendingSelectId.startsWith('custom_') ? 'custom' : 'system';
        resetFilters();

        modal.classList.add('is-active');
        document.body.style.overflow = 'hidden';

        updateTabUI();
        render();
    }

    function close() {
        const modal = document.getElementById('voiceGalleryModal');
        if (modal) modal.classList.remove('is-active');
        document.body.style.overflow = '';
        stopAudio();
    }

    function showToast(msg) {
        const n = document.createElement('div');
        n.className = 'vp-toast';
        n.textContent = msg;
        document.body.appendChild(n);
        requestAnimationFrame(() => n.classList.add('show'));
        setTimeout(() => {
            n.classList.remove('show');
            setTimeout(() => n.remove(), 300);
        }, 2200);
    }

    function confirm() {
        if (!pendingSelectId) return;
        const v = findVoiceById(pendingSelectId);
        const name = v ? (v._custom ? v.name : v.voice_name) : pendingSelectId;
        const select = document.getElementById('voiceSelect');
        if (select) {
            const opt = select.querySelector(`option[value="${CSS.escape(pendingSelectId)}"]`);
            if (opt) select.value = pendingSelectId;
            else select.value = pendingSelectId;
        }
        close();
        showToast(`${t('gallery.chosen', 'Đã chọn giọng')}: ${name}`);
    }

    function setData(system, custom) {
        systemVoices = system || [];
        customVoices = custom || [];
    }

    function init() {
        const btn = document.getElementById('voiceGalleryBtn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                open();
            });
        }

        document.querySelector('.close-voice-gallery')?.addEventListener('click', close);

        const modal = document.getElementById('voiceGalleryModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
        }

        document.getElementById('vpCancelBtn')?.addEventListener('click', close);
        document.getElementById('vpConfirmBtn')?.addEventListener('click', confirm);

        document.getElementById('vpSearchInput')?.addEventListener('input', (e) => {
            state.search = (e.target.value || '').trim();
            render();
        });

        document.querySelectorAll('[data-vp-filter]').forEach((chip) => {
            chip.addEventListener('click', () => {
                const type = chip.dataset.vpFilter;
                const val = chip.dataset.value;
                if (type === 'gender') {
                    state.gender = val;
                }
                if (type === 'region') {
                    state.region = state.region === val ? 'all' : val;
                }
                if (type === 'fav') {
                    state.favOnly = !state.favOnly;
                }
                updateChipUI();
                render();
            });
        });

        document.querySelectorAll('[data-vp-tab]').forEach((tab) => {
            tab.addEventListener('click', () => {
                state.tab = tab.dataset.vpTab;
                resetFilters();
                updateTabUI();
                render();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (!modal?.classList.contains('is-active')) return;
            if (e.key === 'Escape') close();
        });

        if (window.voices) setData(window.voices, window.customVoices || []);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.VoicePicker = { open, close, confirm, setData };
})();
