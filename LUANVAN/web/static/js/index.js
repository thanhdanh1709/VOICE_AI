/**
 * Index Page JavaScript
 * Xử lý chức năng chuyển đổi văn bản thành giọng nói
 */

let voices = [];
let customVoices = [];
let currentAudioFilename = null;
let ffmpegAvailable = true;
let enableTextNormalization = true;

let _audioProgressTimer = null;
let _audioProgressValue = 0;

function _updateAudioProgressUI(pct) {
    const fill = document.getElementById('audioProgressFill');
    const track = document.getElementById('audioProgressTrack');
    const pctEl = document.getElementById('audioProgressPct');
    const rounded = Math.min(100, Math.max(0, Math.round(pct)));
    if (fill) fill.style.width = rounded + '%';
    if (track) track.setAttribute('aria-valuenow', String(rounded));
    if (pctEl) pctEl.textContent = rounded + '%';

    const chips = document.querySelectorAll('.vv-audio-loader__chip');
    chips.forEach((c) => c.classList.remove('vv-audio-loader__chip--active'));
    if (rounded >= 66 && chips[2]) chips[2].classList.add('vv-audio-loader__chip--active');
    else if (rounded >= 33 && chips[1]) chips[1].classList.add('vv-audio-loader__chip--active');
    else if (chips[0]) chips[0].classList.add('vv-audio-loader__chip--active');
}

function _resetAudioProgress() {
    _audioProgressValue = 0;
    _updateAudioProgressUI(0);
}

function stopAudioProgress() {
    if (_audioProgressTimer) {
        clearInterval(_audioProgressTimer);
        _audioProgressTimer = null;
    }
}

function startAudioProgress() {
    stopAudioProgress();
    _resetAudioProgress();
    _audioProgressTimer = setInterval(() => {
        if (_audioProgressValue >= 92) return;
        const remaining = 92 - _audioProgressValue;
        const step = Math.max(0.35, remaining * 0.045 + Math.random() * 1.1);
        _audioProgressValue = Math.min(92, _audioProgressValue + step);
        _updateAudioProgressUI(_audioProgressValue);
    }, 110);
}

function finishAudioProgress(done) {
    stopAudioProgress();
    const tick = () => {
        if (_audioProgressValue >= 100) {
            _updateAudioProgressUI(100);
            setTimeout(() => {
                _resetAudioProgress();
                if (typeof done === 'function') done();
            }, 280);
            return;
        }
        _audioProgressValue = Math.min(100, _audioProgressValue + Math.max(2, (100 - _audioProgressValue) * 0.28));
        _updateAudioProgressUI(_audioProgressValue);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

function hideLoadingWithProgress(loadingIndicator, onDone) {
    if (!loadingIndicator) {
        if (typeof onDone === 'function') onDone();
        return;
    }
    finishAudioProgress(() => {
        loadingIndicator.style.display = 'none';
        loadingIndicator.classList.add('hidden');
        if (typeof onDone === 'function') onDone();
    });
}

function hideLoadingImmediate(loadingIndicator) {
    stopAudioProgress();
    _resetAudioProgress();
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        loadingIndicator.classList.add('hidden');
    }
}

function showLoadingIndicator(loadingIndicator) {
    if (!loadingIndicator) return;
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.style.display = 'block';
    startAudioProgress();
}

function _msg(text) {
    return (window.__msg ? window.__msg(text) : text);
}

function hasVietnameseChars(text) {
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u.test(text);
}

function isLikelyNonVietnameseInput(text) {
    const t = (text || '').trim();
    if (t.length < 8) return false;
    const latin = (t.match(/[a-zA-Z]/g) || []).length;
    if (latin < 5) return false;
    if (hasVietnameseChars(t)) return false;
    return latin / t.length > 0.3;
}

function updateVietnameseInputWarning(text) {
    const show = isLikelyNonVietnameseInput(text);
    ['wsLangWarning', 'fuLangWarning'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

window.updateVietnameseInputWarning = updateVietnameseInputWarning;

function setCurrentAudio(filename) {
    currentAudioFilename = filename || null;
    syncExportBitrateVisibility();
}

function getExportDownloadUrl() {
    if (!currentAudioFilename) return '#';
    const fmt = document.getElementById('exportFormat')?.value || 'wav';
    const bitrate = document.getElementById('exportBitrate')?.value || '192';
    const base = `/api/audio/${encodeURIComponent(currentAudioFilename)}`;
    if (fmt === 'wav') return base;
    return `${base}/export?format=${fmt}&bitrate=${bitrate}`;
}

function syncExportBitrateVisibility() {
    const fmt = document.getElementById('exportFormat')?.value || 'wav';
    const wrap = document.getElementById('exportBitrateWrap');
    if (wrap) wrap.style.display = fmt === 'wav' ? 'none' : 'block';
}

function handleDownloadClick() {
    if (!currentAudioFilename) return;
    const fmt = document.getElementById('exportFormat')?.value || 'wav';
    let url = getExportDownloadUrl();
    if (fmt !== 'wav' && !ffmpegAvailable) {
        alert(window.__ ? __('export.ffmpeg_missing') : 'MP3/OGG cần ffmpeg. Đang tải WAV.');
        url = `/api/audio/${encodeURIComponent(currentAudioFilename)}`;
    }
    const ext = fmt === 'wav' ? 'wav' : fmt;
    const a = document.createElement('a');
    a.href = url;
    a.download = currentAudioFilename.replace(/\.wav$/i, '') + '.' + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function applyUserTtsDefaults() {
    try {
        const r = await fetch('/api/user/settings');
        const d = await r.json();
        if (!d.success || !d.settings) return;
        const s = d.settings;
        const tnCheckbox = document.getElementById('enableTextNormalization');
        if (tnCheckbox && s.enable_text_normalization != null) {
            enableTextNormalization = !!s.enable_text_normalization;
            tnCheckbox.checked = enableTextNormalization;
        }
        const select = document.getElementById('voiceSelect');
        if (s.default_voice_id && select) {
            const opt = select.querySelector(`option[value="${CSS.escape(s.default_voice_id)}"]`);
            if (opt) select.value = s.default_voice_id;
        }
        const fmt = document.getElementById('exportFormat');
        if (fmt && s.default_export_format) fmt.value = s.default_export_format;
        const br = document.getElementById('exportBitrate');
        if (br && s.default_export_bitrate) br.value = String(s.default_export_bitrate);
        const pitchSlider = document.getElementById('pitchSlider');
        const pitchValue = document.getElementById('pitchValue');
        if (pitchSlider && s.default_pitch != null) {
            pitchSlider.value = s.default_pitch;
            if (pitchValue) {
                pitchValue.textContent = s.default_pitch > 0 ? `+${s.default_pitch}` : String(s.default_pitch);
            }
        }
        const emotionalSelect = document.getElementById('emotionalVoiceSelect');
        if (emotionalSelect && s.default_emotional_voice_id) {
            const emoOpt = emotionalSelect.querySelector(
                `option[value="${CSS.escape(s.default_emotional_voice_id)}"]`
            );
            if (emoOpt) emotionalSelect.value = s.default_emotional_voice_id;
        }
        syncExportBitrateVisibility();
    } catch (e) {
        console.log('[TTS] Could not apply user defaults:', e);
    }
}

function getActiveWorkspaceTextInput() {
    const emotionalTab = document.getElementById('emotionalTab');
    const omnivoiceTab = document.getElementById('omnivoiceTab');
    if (emotionalTab && !emotionalTab.classList.contains('hidden')) {
        return document.getElementById('emotionalTextInput');
    }
    if (omnivoiceTab && !omnivoiceTab.classList.contains('hidden')) {
        return document.getElementById('omnivoiceTextInput');
    }
    return document.getElementById('textInput');
}

function tnRequestPayload() {
    return { enable_text_normalization: enableTextNormalization };
}

async function persistTextNormalizationPreference(enabled) {
    enableTextNormalization = !!enabled;
    try {
        const r = await fetch('/api/user/settings');
        const d = await r.json();
        if (!d.success || !d.settings) return;
        await fetch('/api/user/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...d.settings,
                enable_text_normalization: enableTextNormalization,
            }),
        });
    } catch (e) {
        console.warn('[TN] Could not save preference:', e);
    }
}

function closeTnPreviewModal() {
    const modal = document.getElementById('tnPreviewModal');
    if (modal) modal.classList.add('hidden');
}

async function openTnPreviewModal() {
    const input = getActiveWorkspaceTextInput();
    const text = (input?.value || '').trim();
    if (!text) {
        alert('Vui lòng nhập văn bản trước khi xem preview');
        return;
    }

    const modal = document.getElementById('tnPreviewModal');
    const originalEl = document.getElementById('tnPreviewOriginal');
    const normalizedEl = document.getElementById('tnPreviewNormalized');
    const statusEl = document.getElementById('tnPreviewStatus');
    if (!modal || !originalEl || !normalizedEl) return;

    originalEl.textContent = text;
    normalizedEl.value = 'Đang chuẩn hóa...';
    if (statusEl) statusEl.textContent = '';
    modal.classList.remove('hidden');

    try {
        const response = await fetch('/api/text/normalize-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                ...tnRequestPayload(),
                preserve_emotion_tags: !!document.getElementById('emotionalTab')
                    && !document.getElementById('emotionalTab').classList.contains('hidden'),
            }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Preview failed');
        }
        normalizedEl.value = data.normalized || text;
        if (statusEl) {
            statusEl.textContent = data.changed
                ? 'Văn bản đã được chuẩn hóa — bản gốc vẫn giữ trong ô nhập.'
                : 'Không có thay đổi (TN tắt hoặc văn bản đã phù hợp TTS).';
        }
    } catch (error) {
        normalizedEl.value = '';
        if (statusEl) statusEl.textContent = 'Lỗi: ' + error.message;
    }
}

function initTextNormalizationControls() {
    const tnCheckbox = document.getElementById('enableTextNormalization');
    const previewBtn = document.getElementById('tnPreviewBtn');
    const closeBtn = document.getElementById('tnPreviewClose');
    const backdrop = document.getElementById('tnPreviewBackdrop');

    if (tnCheckbox) {
        tnCheckbox.addEventListener('change', () => {
            persistTextNormalizationPreference(tnCheckbox.checked);
        });
    }
    if (previewBtn) previewBtn.addEventListener('click', openTnPreviewModal);
    if (closeBtn) closeBtn.addEventListener('click', closeTnPreviewModal);
    if (backdrop) backdrop.addEventListener('click', closeTnPreviewModal);
}

async function initExportControls() {
    try {
        const r = await fetch('/api/audio/formats');
        const d = await r.json();
        if (d.success) ffmpegAvailable = !!d.ffmpeg;
    } catch (e) { /* ignore */ }
    const fmtSel = document.getElementById('exportFormat');
    const dlBtn = document.getElementById('downloadBtn');
    if (fmtSel) fmtSel.addEventListener('change', syncExportBitrateVisibility);
    if (dlBtn) dlBtn.addEventListener('click', handleDownloadClick);
    syncExportBitrateVisibility();
}

// Load voices on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadVoices();
    await applyUserTtsDefaults();
    await loadStatistics();
    await initExportControls();
    initTextNormalizationControls();
    
    // Character counter
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    if (textInput && charCount) {
        textInput.addEventListener('input', () => {
            const count = textInput.value.length;
            charCount.textContent = count.toLocaleString();
            updateVietnameseInputWarning(textInput.value);
        });
    }
    
    // Emotional text character counter
    const emotionalTextInput = document.getElementById('emotionalTextInput');
    const emotionalCharCount = document.getElementById('emotionalCharCount');
    if (emotionalTextInput && emotionalCharCount) {
        emotionalTextInput.addEventListener('input', () => {
            const count = emotionalTextInput.value.length;
            emotionalCharCount.textContent = count.toLocaleString();
        });
    }
    
    // Voice gallery — handled by voice-picker.js (VoicePicker)
    // File upload tab — handled by file-upload.js (FileUpload)

    const convertBtn = document.getElementById('convertBtn');
    const convertEmotionalBtn = document.getElementById('convertEmotionalBtn');
    const convertOmnivoiceBtn = document.getElementById('convertOmnivoiceBtn');

    // Convert button handlers
    if (convertBtn) {
        convertBtn.addEventListener('click', handleConvert);
    }
    if (convertEmotionalBtn) {
        convertEmotionalBtn.addEventListener('click', handleEmotionalConvert);
        
        // Check emotional TTS status on page load
        checkEmotionalTTSStatus();
    }
    if (convertOmnivoiceBtn) {
        convertOmnivoiceBtn.addEventListener('click', handleOmnivoiceConvert);
        checkOmnivoiceStatus();
    }

    setupOmnivoiceModeToggle();
    enhanceOvSelects();

    const omnivoiceTextInput = document.getElementById('omnivoiceTextInput');
    const omnivoiceCharCount = document.getElementById('omnivoiceCharCount');
    if (omnivoiceTextInput && omnivoiceCharCount) {
        omnivoiceTextInput.addEventListener('input', () => {
            const len = omnivoiceTextInput.value.length;
            omnivoiceCharCount.textContent = len.toLocaleString();
            updateOmnivoiceChunkHint(len);
        });
    }
});

// Load voices from API
async function loadVoices() {
    try {
        // Load system voices
        const systemResponse = await fetch('/api/voices');
        const systemData = await systemResponse.json();
        
        // Load custom voices
        try {
            const customResponse = await fetch('/api/custom-voices/list');
            const customData = await customResponse.json();
            if (customData.success) {
                customVoices = customData.voices || [];
            }
        } catch (error) {
            console.log('[TTS] Custom voices not available:', error);
        }
        
        if (systemData.success) {
            voices = systemData.voices;
            window.voices = voices;
            window.customVoices = customVoices;
            if (window.VoicePicker) window.VoicePicker.setData(voices, customVoices);
            const select = document.getElementById('voiceSelect');
            
            // Build HTML with optgroups
            let html = '';
            
            // System voices
            html += '<optgroup label="🎤 Giọng hệ thống">';
            html += voices.map(voice => 
                `<option value="${voice.voice_id}">${voice.voice_name} - ${voice.description}</option>`
            ).join('');
            html += '</optgroup>';
            
            // Custom voices (if any)
            if (customVoices.length > 0) {
                html += '<optgroup label="🎙️ Giọng của tôi">';
                html += customVoices.map(voice => 
                    `<option value="custom_${voice.id}" data-custom="true">${voice.name} ⭐${voice.quality_score.toFixed(1)}</option>`
                ).join('');
                html += '</optgroup>';
            }
            
            select.innerHTML = html;
            
            // Check URL params for custom voice selection
            const urlParams = new URLSearchParams(window.location.search);
            const customVoiceId = urlParams.get('custom_voice');
            if (customVoiceId) {
                select.value = `custom_${customVoiceId}`;
            }
        }

        // Populate emotional voice selector (viXTTS Clone voices only)
        loadEmotionalVoiceSelector(customVoices);
        loadOmnivoiceVoiceSelector(customVoices);

    } catch (error) {
        console.error('Error loading voices:', error);
    }
}

/**
 * Populate the Emotional TTS voice selector with viXTTS Clone voices
 */
function loadEmotionalVoiceSelector(customVoices) {
    const emotionalSelect = document.getElementById('emotionalVoiceSelect');
    if (!emotionalSelect) return;

    const vixttsVoices = (customVoices || []).filter(v => v.voice_type === 'vixtts_clone');

    let html = '<option value="">⭐ Mặc định (base_voice.wav)</option>';
    if (vixttsVoices.length > 0) {
        html += '<optgroup label="🤖 Giọng viXTTS Clone của tôi">';
        html += vixttsVoices.map(v =>
            `<option value="${v.id}">🎙️ ${v.name} (⭐${v.quality_score.toFixed(1)})</option>`
        ).join('');
        html += '</optgroup>';
    }
    emotionalSelect.innerHTML = html;
    refreshOvSelectMenu(emotionalSelect);
    console.log(`[EMOTIONAL TTS] Loaded ${vixttsVoices.length} viXTTS Clone voice(s) into selector`);
}

/**
 * Populate OmniVoice voice selector with omnivoice_clone voices
 */
function loadOmnivoiceVoiceSelector(customVoices) {
    const ovSelect = document.getElementById('omnivoiceVoiceSelect');
    const ovEmoSelect = document.getElementById('omnivoiceEmotionalVoiceSelect');
    if (!ovSelect && !ovEmoSelect) return;

    const ovVoices = (customVoices || []).filter(v => v.voice_type === 'omnivoice_clone');

    let html = '<option value="">— Chọn giọng clone —</option>';
    if (ovVoices.length > 0) {
        html += '<optgroup label="🌍 Giọng OmniVoice Clone của tôi">';
        html += ovVoices.map(v =>
            `<option value="${v.id}">🎙️ ${v.name} (⭐${v.quality_score.toFixed(1)})</option>`
        ).join('');
        html += '</optgroup>';
    }
    if (ovSelect) ovSelect.innerHTML = html;

    let emoHtml = '<option value="">— Auto voice + cảm xúc —</option>';
    if (ovVoices.length > 0) {
        emoHtml += '<optgroup label="🌍 Giọng OmniVoice Clone của tôi">';
        emoHtml += ovVoices.map(v =>
            `<option value="${v.id}">🎙️ ${v.name} (⭐${v.quality_score.toFixed(1)})</option>`
        ).join('');
        emoHtml += '</optgroup>';
    }
    if (ovEmoSelect) ovEmoSelect.innerHTML = emoHtml;

    if (ovSelect) refreshOvSelectMenu(ovSelect);
    if (ovEmoSelect) refreshOvSelectMenu(ovEmoSelect);

    console.log(`[OMNIVOICE] Loaded ${ovVoices.length} OmniVoice Clone voice(s)`);
}

let omnivoiceGpuMaxChars = 200;

const OMNIVOICE_PLACEHOLDERS = {
    auto: 'Nhập văn bản bất kỳ ngôn ngữ...\n\nVD: Xin chào! Hello! 你好!',
    clone: 'Nhập văn bản để đọc bằng giọng clone đã chọn...',
    design: 'Nhập văn bản...\n\nGiọng được tạo theo mô tả instruct bên trên.',
    emotional: 'Mỗi dòng có tag cảm xúc:\n(vui vẻ) Sài Gòn thật sôi động.\n(excited) What a great day!\n(平静) 今天天气很好。',
};

const OMNIVOICE_HELP = {
    auto: 'Tự chọn giọng phù hợp theo ngôn ngữ. Hỗ trợ 600+ ngôn ngữ.',
    clone: 'Chọn giọng OmniVoice Clone. Tạo mới tại <strong>Thêm giọng mới</strong> → OmniVoice Clone.',
    design: 'Mô tả giọng bằng tiếng Anh: gender, age, pitch, accent, whisper...',
    emotional: 'Dùng tag trong ngoặc: <code>(vui vẻ)</code> <code>(excited)</code> <code>(平静)</code>. Mỗi dòng một cảm xúc.',
};

function closeAllOvSelectMenus() {
    document.querySelectorAll('.ov-select-wrap.is-open').forEach((wrap) => {
        wrap.classList.remove('is-open');
        wrap.querySelector('.ov-select-menu')?.classList.add('hidden');
        wrap.querySelector('.ov-select-trigger')?.setAttribute('aria-expanded', 'false');
    });
}

function parseOvSelectItems(select) {
    const items = [];
    Array.from(select.children).forEach((child) => {
        if (child.tagName === 'OPTGROUP') {
            items.push({ kind: 'group', label: child.label });
            Array.from(child.children).forEach((opt) => {
                items.push({ kind: 'option', value: opt.value, label: opt.textContent.trim() });
            });
        } else if (child.tagName === 'OPTION') {
            items.push({ kind: 'option', value: child.value, label: child.textContent.trim() });
        }
    });
    return items;
}

function refreshOvSelectMenu(select) {
    const wrap = select?.closest('.ov-select-wrap');
    if (!wrap || !wrap.classList.contains('is-enhanced')) return;
    const menu = wrap.querySelector('.ov-select-menu');
    const trigger = wrap.querySelector('.ov-select-trigger');
    if (!menu || !trigger) return;

    menu.innerHTML = '';
    parseOvSelectItems(select).forEach((item) => {
        if (item.kind === 'group') {
            const group = document.createElement('div');
            group.className = 'ov-select-menu__group';
            group.textContent = item.label;
            menu.appendChild(group);
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ov-select-menu__item';
        btn.dataset.value = item.value;
        btn.textContent = item.label;
        btn.setAttribute('role', 'option');
        if (select.value === item.value) btn.classList.add('is-selected');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = item.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncOvSelectTrigger(select);
            closeAllOvSelectMenus();
        });
        menu.appendChild(btn);
    });
    syncOvSelectTrigger(select);
}

function syncOvSelectTrigger(select) {
    const wrap = select?.closest('.ov-select-wrap');
    const trigger = wrap?.querySelector('.ov-select-trigger');
    if (!trigger) return;
    const opt = select.options[select.selectedIndex];
    trigger.textContent = opt ? opt.textContent.trim() : '';
    wrap.querySelectorAll('.ov-select-menu__item').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.value === select.value);
    });
}

function enhanceOvSelects() {
    document.querySelectorAll('.ov-select-wrap').forEach((wrap) => {
        const select = wrap.querySelector('select');
        if (!select || wrap.classList.contains('is-enhanced')) return;

        wrap.classList.add('is-enhanced');
        select.classList.add('ov-select--native');

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ov-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'ov-select-menu hidden';
        menu.setAttribute('role', 'listbox');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrap.classList.contains('is-open');
            closeAllOvSelectMenus();
            closeOmnivoicePopovers();
            if (!isOpen) {
                wrap.classList.add('is-open');
                menu.classList.remove('hidden');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        select.addEventListener('change', () => syncOvSelectTrigger(select));

        wrap.appendChild(trigger);
        wrap.appendChild(menu);
        refreshOvSelectMenu(select);

        new MutationObserver(() => refreshOvSelectMenu(select)).observe(select, { childList: true, subtree: true });
    });
}

function updateOmnivoiceChunkHint(textLen) {
    const hint = document.getElementById('omnivoiceChunkHint');
    if (!hint) return;
    if (!textLen) {
        hint.classList.add('hidden');
        return;
    }
    const max = omnivoiceGpuMaxChars || 200;
    const chunks = Math.max(1, Math.ceil(textLen / max));
    hint.textContent = chunks > 1
        ? `≈ ${chunks} lần infer (≤${max} ký tự/đoạn trên GPU)`
        : '1 lần infer — tốc độ tối ưu';
    hint.classList.remove('hidden');
}

function getOmnivoiceMode() {
    return document.getElementById('omnivoiceModeSelect')?.value || 'auto';
}

function closeOmnivoicePopovers() {
    ['omnivoiceHelpPopover', 'omnivoiceTagPopover'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function positionOmnivoicePopover(popover, anchor) {
    if (!popover || !anchor) return;
    const studio = document.getElementById('omnivoiceTab');
    const a = anchor.getBoundingClientRect();
    const s = studio.getBoundingClientRect();
    popover.style.top = `${a.bottom - s.top + 8}px`;
    popover.style.right = `${s.right - a.right}px`;
    popover.style.left = 'auto';
}

function insertOmnivoiceTag(tag) {
    const ta = document.getElementById('omnivoiceTextInput');
    if (!ta) return;
    const start = ta.selectionStart;
    const val = ta.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const before = val.slice(0, lineStart);
    const after = val.slice(lineStart);
    const insert = `${tag} `;
    ta.value = before + insert + after;
    const pos = lineStart + insert.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    closeOmnivoicePopovers();
}

/**
 * OmniVoice tab — mode toolbar, placeholders, help & tag popovers
 */
function setupOmnivoiceModeToggle() {
    const modeSelect = document.getElementById('omnivoiceModeSelect');
    const cloneField = document.getElementById('omnivoiceCloneField');
    const emotionalCloneField = document.getElementById('omnivoiceEmotionalCloneField');
    const designField = document.getElementById('omnivoiceDesignField');
    const tagBtn = document.getElementById('omnivoiceInsertTagBtn');
    const helpBtn = document.getElementById('omnivoiceHelpBtn');
    const helpPopover = document.getElementById('omnivoiceHelpPopover');
    const helpContent = document.getElementById('omnivoiceHelpContent');
    const tagPopover = document.getElementById('omnivoiceTagPopover');
    const textInput = document.getElementById('omnivoiceTextInput');

    function update() {
        const mode = getOmnivoiceMode();
        if (cloneField) cloneField.classList.toggle('hidden', mode !== 'clone');
        if (emotionalCloneField) emotionalCloneField.classList.toggle('hidden', mode !== 'emotional');
        if (designField) designField.classList.toggle('hidden', mode !== 'design');
        if (tagBtn) tagBtn.classList.toggle('hidden', mode !== 'emotional');
        if (textInput && OMNIVOICE_PLACEHOLDERS[mode]) {
            textInput.placeholder = OMNIVOICE_PLACEHOLDERS[mode];
        }
        if (helpContent && OMNIVOICE_HELP[mode]) {
            helpContent.innerHTML = OMNIVOICE_HELP[mode];
        }
        closeOmnivoicePopovers();
    }

    if (modeSelect) {
        modeSelect.addEventListener('change', update);
        update();
    }

    if (helpBtn && helpPopover) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasHidden = helpPopover.classList.contains('hidden');
            closeOmnivoicePopovers();
            if (wasHidden) {
                helpPopover.classList.remove('hidden');
                positionOmnivoicePopover(helpPopover, helpBtn);
            }
        });
    }

    if (tagBtn && tagPopover) {
        tagBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasHidden = tagPopover.classList.contains('hidden');
            closeOmnivoicePopovers();
            if (wasHidden) {
                tagPopover.classList.remove('hidden');
                positionOmnivoicePopover(tagPopover, tagBtn);
            }
        });
    }

    document.querySelectorAll('.ov-tag-chip').forEach((chip) => {
        chip.addEventListener('click', () => insertOmnivoiceTag(chip.dataset.tag || ''));
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ov-select-wrap')) {
            closeAllOvSelectMenus();
        }
        if (!e.target.closest('.ov-popover') && !e.target.closest('#omnivoiceHelpBtn') && !e.target.closest('#omnivoiceInsertTagBtn')) {
            closeOmnivoicePopovers();
        }
    });
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.statistics;
            document.getElementById('totalConversions').textContent = 
                formatNumber(stats.total_conversions || 0);
            document.getElementById('totalCharacters').textContent = 
                formatNumber(stats.total_characters || 0);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Format number with K, M suffix
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

// Handle text to speech conversion
async function handleConvert() {
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const audioPlayer = document.getElementById('audioPlayer');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    
    const text = textInput.value.trim();
    const voiceId = voiceSelect.value || 'Binh';
    
    if (!text) {
        alert('Vui lòng nhập văn bản');
        return;
    }
    
    // Show loading, hide others
    if (emptyState) emptyState.style.display = 'none';
    showLoadingIndicator(loadingIndicator);
    audioPlayer.style.display = 'none';
    errorMessage.style.display = 'none';
    
    try {
        console.log('[TTS] Sending request to /api/convert...');
        console.log('[TTS] Data:', { text: text.substring(0, 50) + '...', voice_id: voiceId });
        
        const response = await fetch('/api/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, voice_id: voiceId, ...tnRequestPayload() })
        });
        
        console.log('[TTS] Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[TTS] Response data:', data);
        
        if (data.success) {
            hideLoadingWithProgress(loadingIndicator, async () => {
                const audioElement = document.getElementById('audioElement');
                
                audioElement.pause();
                audioElement.currentTime = 0;
                audioElement.src = data.audio_url;
                setCurrentAudio(data.audio_filename || `tts_${Date.now()}.wav`);
                audioElement.load();
                
                audioElement.addEventListener('loadedmetadata', () => {
                    console.log(`[AUDIO] Metadata loaded: duration=${audioElement.duration}s`);
                });
                audioElement.addEventListener('loadeddata', () => {
                    console.log(`[AUDIO] Data loaded: readyState=${audioElement.readyState}`);
                });
                audioElement.addEventListener('canplay', () => {
                    console.log(`[AUDIO] Can play: duration=${audioElement.duration}s`);
                });
                audioElement.addEventListener('error', (e) => {
                    console.error(`[AUDIO] Error loading audio:`, e);
                    console.error(`[AUDIO] Error code: ${audioElement.error?.code}, message: ${audioElement.error?.message}`);
                });
                
                audioPlayer.style.display = 'block';

                if (typeof window.wsSetConversionId === 'function') {
                    window.wsSetConversionId(data.conversion_id || null);
                }
                
                showVoiceAdjustmentPanel(data.audio_filename || currentAudioFilename);
                await loadStatistics();
            });
        } else {
            hideLoadingImmediate(loadingIndicator);
            errorMessage.textContent = _msg(data.message) || __('err.convert_failed');
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        hideLoadingImmediate(loadingIndicator);
        console.error('Convert error:', error);
        
        // Kiểm tra loại lỗi
        let errorMsg = 'Lỗi kết nối: ';
        if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
            errorMsg += 'Không thể kết nối đến server. Vui lòng đảm bảo Flask server đang chạy trên port 5000.';
        } else {
            errorMsg += error.message;
        }
        
        errorMessage.textContent = errorMsg;
        errorMessage.style.display = 'block';
    }
}

/* ========================================
   VOICE ADJUSTMENT PANEL
   ======================================== */

let voiceAdjustmentEnabled = false;

// Initialize Voice Adjustment Panel
document.addEventListener('DOMContentLoaded', () => {
    initVoiceAdjustmentPanel();
    checkVoiceConversionAvailability();
});

/**
 * Check if voice conversion is available
 */
async function checkVoiceConversionAvailability() {
    try {
        const response = await fetch('/api/voice-conversion/check');
        const data = await response.json();
        voiceAdjustmentEnabled = data.available;
        
        if (!voiceAdjustmentEnabled) {
            console.warn('[VOICE ADJUSTMENT] Feature not available:', data.message);
        } else {
            console.log('[VOICE ADJUSTMENT] Feature is ready');
        }
    } catch (error) {
        console.error('[VOICE ADJUSTMENT] Error checking availability:', error);
        voiceAdjustmentEnabled = false;
    }
}

/**
 * Initialize voice adjustment panel event listeners
 */
function initVoiceAdjustmentPanel() {
    // Pitch slider
    const pitchSlider = document.getElementById('pitchSlider');
    const pitchValue = document.getElementById('pitchValue');
    if (pitchSlider && pitchValue) {
        pitchSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            pitchValue.textContent = value > 0 ? `+${value}` : value;
        });
    }
    
    // Index Rate slider
    const indexSlider = document.getElementById('indexSlider');
    const indexValue = document.getElementById('indexValue');
    if (indexSlider && indexValue) {
        indexSlider.addEventListener('input', (e) => {
            indexValue.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }
    
    // Protect slider
    const protectSlider = document.getElementById('protectSlider');
    const protectValue = document.getElementById('protectValue');
    if (protectSlider && protectValue) {
        protectSlider.addEventListener('input', (e) => {
            protectValue.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }
    
    // Preset buttons
    const presetButtons = document.querySelectorAll('.btn-preset');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            applyPreset(preset);
        });
    });
    
    // Apply effect button
    const applyBtn = document.getElementById('applyVoiceEffectBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', handleApplyVoiceEffect);
    }
}

/**
 * Show voice adjustment panel after TTS
 */
function showVoiceAdjustmentPanel(audioFilename) {
    if (!voiceAdjustmentEnabled) {
        console.log('[VOICE ADJUSTMENT] Feature disabled, not showing panel');
        return;
    }
    
    const panel = document.getElementById('voiceAdjustmentPanel');
    if (!panel) {
        console.error('[VOICE ADJUSTMENT] Panel element not found');
        return;
    }
    
    currentAudioFilename = audioFilename;
    panel.style.display = 'block';
    
    // Reset sliders to default
    resetSliders();
    
    // Hide messages
    hideEffectMessages();
    
    console.log('[VOICE ADJUSTMENT] Panel shown for:', audioFilename);
}

/**
 * Hide voice adjustment panel
 */
function hideVoiceAdjustmentPanel() {
    const panel = document.getElementById('voiceAdjustmentPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    currentAudioFilename = null;
}

/**
 * Reset sliders to default values
 */
function resetSliders() {
    const pitchSlider = document.getElementById('pitchSlider');
    const indexSlider = document.getElementById('indexSlider');
    const protectSlider = document.getElementById('protectSlider');
    
    if (pitchSlider) {
        pitchSlider.value = 0;
        document.getElementById('pitchValue').textContent = '0';
    }
    
    if (indexSlider) {
        indexSlider.value = 0.75;
        document.getElementById('indexValue').textContent = '0.75';
    }
    
    if (protectSlider) {
        protectSlider.value = 0.33;
        document.getElementById('protectValue').textContent = '0.33';
    }
}

/**
 * Apply preset values
 */
function applyPreset(preset) {
    const pitchSlider = document.getElementById('pitchSlider');
    const indexSlider = document.getElementById('indexSlider');
    const protectSlider = document.getElementById('protectSlider');
    const pitchValue = document.getElementById('pitchValue');
    const indexValue = document.getElementById('indexValue');
    const protectValue = document.getElementById('protectValue');
    
    let pitch = 0;
    let index = 0.75;
    let protect = 0.33;
    
    switch (preset) {
        case 'male-to-female':
            pitch = 6;
            index = 0.8;
            protect = 0.4;
            break;
        case 'female-to-male':
            pitch = -6;
            index = 0.8;
            protect = 0.4;
            break;
        case 'higher':
            pitch = 3;
            index = 0.75;
            protect = 0.33;
            break;
        case 'lower':
            pitch = -3;
            index = 0.75;
            protect = 0.33;
            break;
        case 'reset':
            pitch = 0;
            index = 0.75;
            protect = 0.33;
            break;
    }
    
    // Update sliders
    if (pitchSlider) {
        pitchSlider.value = pitch;
        pitchValue.textContent = pitch > 0 ? `+${pitch}` : pitch;
    }
    if (indexSlider) {
        indexSlider.value = index;
        indexValue.textContent = index.toFixed(2);
    }
    if (protectSlider) {
        protectSlider.value = protect;
        protectValue.textContent = protect.toFixed(2);
    }
    
    console.log(`[VOICE ADJUSTMENT] Applied preset: ${preset}`);
}

/**
 * Handle apply voice effect button click
 */
async function handleApplyVoiceEffect() {
    if (!currentAudioFilename) {
        showEffectError('Không tìm thấy file audio để xử lý');
        return;
    }
    
    // Get slider values
    const pitch = parseInt(document.getElementById('pitchSlider').value);
    const indexRate = parseFloat(document.getElementById('indexSlider').value);
    const protect = parseFloat(document.getElementById('protectSlider').value);
    
    console.log('[VOICE ADJUSTMENT] Applying effect:', { pitch, indexRate, protect });
    
    // Show processing state
    showEffectProcessing();
    hideEffectMessages();
    
    // Disable button
    const applyBtn = document.getElementById('applyVoiceEffectBtn');
    applyBtn.disabled = true;
    
    try {
        const response = await fetch('/api/voice-conversion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_filename: currentAudioFilename,
                pitch: pitch,
                index_rate: indexRate,
                protect: protect
            })
        });
        
        const data = await response.json();
        
        // Hide processing
        hideEffectProcessing();
        
        if (data.success) {
            // Update audio player with new audio
            updateAudioPlayer(data.audio_url, data.audio_filename);
            
            // Show success message
            showEffectSuccess(data.message || 'Đã áp dụng hiệu ứng thành công!');
            
            // Update current filename
            currentAudioFilename = data.audio_filename;
            
            console.log('[VOICE ADJUSTMENT] Effect applied successfully:', data.audio_filename);
        } else {
            showEffectError(data.message || 'Không thể áp dụng hiệu ứng');
        }
    } catch (error) {
        console.error('[VOICE ADJUSTMENT] Error applying effect:', error);
        hideEffectProcessing();
        
        let errorMsg = 'Lỗi kết nối';
        if (error.message === 'Failed to fetch') {
            errorMsg = 'Không thể kết nối đến server';
        } else {
            errorMsg = error.message;
        }
        
        showEffectError(errorMsg);
    } finally {
        // Re-enable button
        applyBtn.disabled = false;
    }
}

/**
 * Update audio player with new audio
 */
function updateAudioPlayer(audioUrl, audioFilename) {
    const audioElement = document.getElementById('audioElement');
    
    if (!audioElement) {
        console.error('[VOICE ADJUSTMENT] Audio element not found');
        return;
    }
    
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.src = audioUrl;
    audioElement.load();
    setCurrentAudio(audioFilename || currentAudioFilename);
    
    // Auto play
    audioElement.play().catch(err => {
        console.warn('[VOICE ADJUSTMENT] Auto-play prevented:', err);
    });
    
    console.log('[VOICE ADJUSTMENT] Audio player updated:', audioUrl);
}

/**
 * Show/hide effect messages and states
 */
function showEffectProcessing() {
    const processing = document.getElementById('effectProcessing');
    if (processing) processing.style.display = 'flex';
}

function hideEffectProcessing() {
    const processing = document.getElementById('effectProcessing');
    if (processing) processing.style.display = 'none';
}

function showEffectSuccess(message) {
    const success = document.getElementById('effectSuccess');
    if (success) {
        success.querySelector('.message-text').textContent = message;
        success.style.display = 'flex';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            success.style.display = 'none';
        }, 3000);
    }
}

function showEffectError(message) {
    const error = document.getElementById('effectError');
    if (error) {
        error.querySelector('.message-text').textContent = message;
        error.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            error.style.display = 'none';
        }, 5000);
    }
}

function hideEffectMessages() {
    const success = document.getElementById('effectSuccess');
    const error = document.getElementById('effectError');
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
}

/**
 * ========================================
 * EMOTIONAL TTS FUNCTIONS
 * ========================================
 */

/**
 * Check if Emotional TTS is ready
 */
async function checkEmotionalTTSStatus() {
    const convertEmotionalBtn = document.getElementById('convertEmotionalBtn');
    if (!convertEmotionalBtn) return;
    
    try {
        const response = await fetch('/api/emotional-tts/status');
        const data = await response.json();
        
        if (data.success && data.ready) {
            convertEmotionalBtn.disabled = false;
            console.log('[EMOTIONAL TTS] ✅ Model ready!');
            return;
        }

        // Không cài viXTTS — dừng poll, không spam console
        const msg = (data.message || '').toLowerCase();
        const permanentlyUnavailable = msg.includes('không được cài đặt') || msg.includes('import failed');
        if (permanentlyUnavailable) {
            convertEmotionalBtn.disabled = true;
            convertEmotionalBtn.title = data.message || 'Emotional TTS không khả dụng';
            return;
        }

        convertEmotionalBtn.disabled = true;
        convertEmotionalBtn.innerHTML = '<span>⏳</span><span>Đang load model...</span>';
        setTimeout(checkEmotionalTTSStatus, 5000);
    } catch (error) {
        console.error('[EMOTIONAL TTS] Error checking status:', error);
        setTimeout(checkEmotionalTTSStatus, 10000);
    }
}

/**
 * Handle emotional TTS conversion
 */
async function handleEmotionalConvert() {
    console.log('[EMOTIONAL TTS] Starting conversion...');
    
    const emotionalTextInput = document.getElementById('emotionalTextInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const audioPlayer = document.getElementById('audioPlayer');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const convertBtn = document.getElementById('convertEmotionalBtn');
    
    const text = emotionalTextInput.value.trim();
    
    // Validate input
    if (!text) {
        alert('Vui lòng nhập văn bản với emotion tags');
        return;
    }
    
    // Check if text contains emotion hints
    const hasEmotionTags = /\([^)]*\)/.test(text);
    if (!hasEmotionTags) {
        const confirmed = confirm('Văn bản của bạn không có emotion tags.\nVẫn muốn tiếp tục với giọng neutral?');
        if (!confirmed) return;
    }
    
    // Show loading, hide others
    if (emptyState) emptyState.style.display = 'none';
    showLoadingIndicator(loadingIndicator);
    if (audioPlayer) audioPlayer.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Disable button
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner"></span><span>Đang xử lý với AI...</span>';
    }
    
    try {
        // Get selected custom voice for emotional TTS
        const emotionalVoiceSelect = document.getElementById('emotionalVoiceSelect');
        const emotionalCustomVoiceId = emotionalVoiceSelect && emotionalVoiceSelect.value
            ? emotionalVoiceSelect.value
            : null;
        
        const payload = { text, ...tnRequestPayload() };
        if (emotionalCustomVoiceId) payload.custom_voice_id = emotionalCustomVoiceId;
        
        console.log('[EMOTIONAL TTS] Calling API with voice:', emotionalCustomVoiceId || 'default');
        const response = await fetch('/api/convert-emotional', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('[EMOTIONAL TTS] Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[EMOTIONAL TTS] Response:', data);
        
        if (data.success) {
            hideLoadingWithProgress(loadingIndicator, async () => {
                const audioElement = document.getElementById('audioElement');
                
                if (audioElement) {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    audioElement.src = data.audio_url;
                    setCurrentAudio(data.audio_filename || `emotional_${Date.now()}.wav`);
                    audioElement.load();
                    
                    if (audioPlayer) audioPlayer.style.display = 'block';

                    if (typeof window.wsSetConversionId === 'function') {
                        window.wsSetConversionId(data.conversion_id || null);
                    }
                    
                    console.log('[EMOTIONAL TTS] ✅ Success! File:', data.audio_filename);
                }
                
                await loadStatistics();
            });
        } else {
            hideLoadingImmediate(loadingIndicator);
            if (errorMessage) {
                errorMessage.textContent = _msg(data.message) || __('err.convert_failed');
                errorMessage.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('[EMOTIONAL TTS] Error:', error);
        
        hideLoadingImmediate(loadingIndicator);
        
        let errorMsg = 'Lỗi kết nối';
        if (error.message === 'Failed to fetch') {
            errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra server đang chạy.';
        } else {
            errorMsg = error.message;
        }
        
        if (errorMessage) {
            errorMessage.textContent = errorMsg;
            errorMessage.style.display = 'block';
        }
    } finally {
        // Re-enable button
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span class="btn-icon">🎭</span><span class="btn-text">Chuyển đổi với cảm xúc</span>';
        }
    }
}

/**
 * Check if OmniVoice TTS is ready
 */
async function checkOmnivoiceStatus() {
    const btn = document.getElementById('convertOmnivoiceBtn');
    if (!btn) return;

    try {
        const response = await fetch('/api/omnivoice/status');
        const data = await response.json();

        if (data.success && data.ready) {
            if (data.gpu_max_chars) omnivoiceGpuMaxChars = data.gpu_max_chars;
            const ovInput = document.getElementById('omnivoiceTextInput');
            if (ovInput) updateOmnivoiceChunkHint(ovInput.value.length);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px">language</span><span>Chuyển đổi OmniVoice</span>';
            console.log('[OMNIVOICE] ✅ Model ready!');
            return;
        }

        const msg = (data.message || '').toLowerCase();
        const permanentlyUnavailable = msg.includes('chưa được cài đặt') || msg.includes('pip install');
        if (permanentlyUnavailable) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px">error</span><span>OmniVoice chưa cài đặt</span>';
            btn.title = data.message;
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px">hourglass_top</span><span>Đang load OmniVoice...</span>';
        setTimeout(checkOmnivoiceStatus, 5000);
    } catch (error) {
        console.error('[OMNIVOICE] Error checking status:', error);
        setTimeout(checkOmnivoiceStatus, 10000);
    }
}

/**
 * Handle OmniVoice TTS conversion
 */
async function handleOmnivoiceConvert() {
    const textInput = document.getElementById('omnivoiceTextInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const audioPlayer = document.getElementById('audioPlayer');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const convertBtn = document.getElementById('convertOmnivoiceBtn');

    const text = (textInput?.value || '').trim();
    const mode = getOmnivoiceMode();
    const customVoiceId = document.getElementById('omnivoiceVoiceSelect')?.value || null;
    const emotionalVoiceId = document.getElementById('omnivoiceEmotionalVoiceSelect')?.value || null;
    const instruct = document.getElementById('omnivoiceInstruct')?.value?.trim() || '';

    if (!text) {
        alert('Vui lòng nhập văn bản');
        return;
    }

    if (mode === 'clone' && !customVoiceId) {
        alert('Chế độ Voice Clone cần chọn giọng OmniVoice Clone. Tạo giọng tại Voices → Thêm giọng mới.');
        return;
    }

    if (mode === 'design' && !instruct) {
        alert('Chế độ Voice Design cần mô tả giọng (instruct).');
        return;
    }

    if (mode === 'emotional' && !/\([^)]+\)/.test(text)) {
        const ok = confirm(
            'Văn bản chưa có tag cảm xúc trong ngoặc, ví dụ (vui vẻ) hoặc (excited).\n\n' +
            'Tiếp tục với giọng neutral?'
        );
        if (!ok) return;
    }

    if (emptyState) emptyState.style.display = 'none';
    showLoadingIndicator(loadingIndicator);
    if (audioPlayer) audioPlayer.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';

    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px;animation:spin .8s linear infinite">autorenew</span><span>Đang xử lý OmniVoice...</span>';
    }

    try {
        const payload = { text, mode, ...tnRequestPayload() };
        if (mode === 'clone' && customVoiceId) payload.custom_voice_id = customVoiceId;
        if (mode === 'design') payload.instruct = instruct;
        if (mode === 'emotional' && emotionalVoiceId) payload.custom_voice_id = emotionalVoiceId;

        if (convertBtn && mode === 'emotional') {
            convertBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px;animation:spin .8s linear infinite">autorenew</span><span>Đang xử lý Emotional OmniVoice...</span>';
        }

        const response = await fetch('/api/convert-omnivoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            if (data.emotions_used && data.emotions_used.length) {
                console.log('[OMNIVOICE EMOTIONAL] Emotions used:', data.emotions_used.join(', '));
            }
            hideLoadingWithProgress(loadingIndicator, async () => {
                const audioElement = document.getElementById('audioElement');
                if (audioElement) {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    audioElement.src = data.audio_url;
                    setCurrentAudio(data.audio_filename || `omnivoice_${Date.now()}.wav`);
                    audioElement.load();
                    if (audioPlayer) audioPlayer.style.display = 'block';
                    if (typeof window.wsSetConversionId === 'function') {
                        window.wsSetConversionId(data.conversion_id || null);
                    }
                }
                await loadStatistics();
            });
        } else {
            hideLoadingImmediate(loadingIndicator);
            if (errorMessage) {
                errorMessage.textContent = _msg(data.message) || 'Chuyển đổi thất bại';
                errorMessage.style.display = 'block';
            }
        }
    } catch (error) {
        hideLoadingImmediate(loadingIndicator);
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Lỗi kết nối';
            errorMessage.style.display = 'block';
        }
    } finally {
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px">language</span><span>Chuyển đổi OmniVoice</span>';
        }
    }
}

