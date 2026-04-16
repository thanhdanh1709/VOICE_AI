/**
 * Index Page JavaScript
 * Xử lý chức năng chuyển đổi văn bản thành giọng nói
 */

let voices = [];

// Load voices on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadVoices();
    await loadStatistics();
    
    // Character counter
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    if (textInput && charCount) {
        textInput.addEventListener('input', () => {
            const count = textInput.value.length;
            charCount.textContent = count.toLocaleString();
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
    
    // Voice gallery modal
    const voiceGalleryBtn = document.getElementById('voiceGalleryBtn');
    const voiceGalleryModal = document.getElementById('voiceGalleryModal');
    const closeVoiceGallery = document.querySelector('.close-voice-gallery');
    
    if (voiceGalleryBtn) {
        voiceGalleryBtn.addEventListener('click', openVoiceGallery);
    }
    
    if (closeVoiceGallery) {
        closeVoiceGallery.addEventListener('click', () => {
            voiceGalleryModal.style.display = 'none';
            voiceGalleryModal.classList.remove('is-active');
        });
    }
    
    // Close modal on overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            voiceGalleryModal.style.display = 'none';
            voiceGalleryModal.classList.remove('is-active');
        });
    }
    
    // Legacy: close on modal click (for old style)
    window.addEventListener('click', (e) => {
        if (e.target === voiceGalleryModal) {
            voiceGalleryModal.style.display = 'none';
            voiceGalleryModal.classList.remove('is-active');
        }
    });
    
    // Tab switching (support both old and new styles)
    const tabButtons = document.querySelectorAll('.tab-btn, .tab-btn-modern');
    const convertBtn = document.getElementById('convertBtn');
    const convertEmotionalBtn = document.getElementById('convertEmotionalBtn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content (hide all, show selected)
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            const targetTab = document.getElementById(tab + 'Tab');
            if (targetTab) {
                targetTab.style.display = 'block';
                targetTab.classList.add('active');
            }
            
            // Show/hide appropriate convert button
            if (tab === 'emotional') {
                if (convertBtn) convertBtn.style.display = 'none';
                if (convertEmotionalBtn) convertEmotionalBtn.style.display = 'block';
            } else {
                if (convertBtn) convertBtn.style.display = 'block';
                if (convertEmotionalBtn) convertEmotionalBtn.style.display = 'none';
            }
        });
    });
    
    // File input handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const fileName = document.getElementById('fileName');
            fileName.textContent = `📄 ${file.name} (Đang xử lý...)`;
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            
            // For .txt files, read directly
            if (fileExt === 'txt') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('textInput').value = e.target.result;
                    fileName.textContent = `📄 ${file.name}`;
                };
                reader.onerror = () => {
                    fileName.textContent = `❌ Lỗi đọc file ${file.name}`;
                };
                reader.readAsText(file, 'UTF-8');
            } 
            // For .pdf and .docx files, upload to server to extract text
            else if (fileExt === 'pdf' || fileExt === 'docx') {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await fetch('/api/upload/extract', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        document.getElementById('textInput').value = data.text;
                        fileName.textContent = `📄 ${file.name}`;
                    } else {
                        fileName.textContent = `❌ ${data.message || 'Lỗi xử lý file'}`;
                    }
                } catch (error) {
                    console.error('Error uploading file:', error);
                    fileName.textContent = `❌ Lỗi: ${error.message}`;
                }
            } else {
                fileName.textContent = `❌ Định dạng file không được hỗ trợ`;
            }
        });
    }
    
    // Convert button handlers
    if (convertBtn) {
        convertBtn.addEventListener('click', handleConvert);
    }
    if (convertEmotionalBtn) {
        convertEmotionalBtn.addEventListener('click', handleEmotionalConvert);
        
        // Check emotional TTS status on page load
        checkEmotionalTTSStatus();
    }
});

// Load voices from API
async function loadVoices() {
    try {
        // Load system voices
        const systemResponse = await fetch('/api/voices');
        const systemData = await systemResponse.json();
        
        // Load custom voices
        let customVoices = [];
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
    console.log(`[EMOTIONAL TTS] Loaded ${vixttsVoices.length} viXTTS Clone voice(s) into selector`);
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
    loadingIndicator.style.display = 'block';
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
            body: JSON.stringify({ text, voice_id: voiceId })
        });
        
        console.log('[TTS] Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[TTS] Response data:', data);
        
        // Hide loading
        loadingIndicator.style.display = 'none';
        
        if (data.success) {
            // Show audio player
            const audioElement = document.getElementById('audioElement');
            const downloadBtn = document.getElementById('downloadBtn');
            
            // Reset audio element
            audioElement.pause();
            audioElement.currentTime = 0;
            
            // Set new source and load
            audioElement.src = data.audio_url;
            downloadBtn.href = data.audio_url;
            downloadBtn.download = `tts_${Date.now()}.wav`;
            
            // Load audio metadata
            audioElement.load();
            
            // Add event listeners for debugging
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
            
            // Show voice adjustment panel
            showVoiceAdjustmentPanel(data.audio_filename || downloadBtn.download);
            
            // Reload statistics
            await loadStatistics();
        } else {
            errorMessage.textContent = data.message || 'Lỗi chuyển đổi';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        loadingIndicator.style.display = 'none';
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

// Voice Gallery Modal Functions
function openVoiceGallery() {
    const modal = document.getElementById('voiceGalleryModal');
    const grid = document.getElementById('voiceGalleryGrid');
    
    modal.style.display = 'block';
    
    // Render voice cards
    if (voices.length > 0) {
        grid.innerHTML = voices.map(voice => createVoiceCard(voice)).join('');
    } else {
        grid.innerHTML = '<div class="loading-text">Đang tải giọng đọc...</div>';
    }
}

function createVoiceCard(voice) {
    const genderIcon = voice.gender === 'male' ? '👨' : '👩';
    const hasSample = voice.has_sample;
    
    return `
        <div class="voice-card" data-voice="${voice.voice_id}">
            <div class="voice-avatar">${genderIcon}</div>
            <h3>${voice.voice_name}</h3>
            <p class="voice-desc">${voice.description || ''}</p>
            <p class="voice-region">${voice.region || ''}</p>
            ${hasSample ? `
                <audio id="sample_${voice.voice_id}" src="${voice.sample_url}" preload="none"></audio>
                <button class="btn btn-sm btn-secondary preview-btn" onclick="togglePreview('${voice.voice_id}')">
                    <span class="play-icon">🔊</span> Nghe thử
                </button>
            ` : `
                <button class="btn btn-sm btn-secondary" disabled style="opacity: 0.5;">
                    ⚠️ Chưa có mẫu
                </button>
            `}
            <button class="btn btn-sm btn-primary" onclick="selectVoice('${voice.voice_id}', '${voice.voice_name}')">
                Chọn giọng này
            </button>
        </div>
    `;
}

let currentPlayingVoice = null;

function togglePreview(voiceId) {
    const audio = document.getElementById(`sample_${voiceId}`);
    const allAudios = document.querySelectorAll('[id^="sample_"]');
    const btn = event.target.closest('.preview-btn');
    
    if (!audio) return;
    
    // Stop other audios
    allAudios.forEach(a => {
        if (a !== audio && !a.paused) {
            a.pause();
            a.currentTime = 0;
        }
    });
    
    // Reset all buttons
    document.querySelectorAll('.preview-btn').forEach(b => {
        b.innerHTML = '<span class="play-icon">🔊</span> Nghe thử';
    });
    
    // Toggle current audio
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<span class="play-icon">⏸️</span> Dừng';
        currentPlayingVoice = voiceId;
        
        // Reset button when audio ends
        audio.onended = () => {
            btn.innerHTML = '<span class="play-icon">🔊</span> Nghe thử';
            currentPlayingVoice = null;
        };
    } else {
        audio.pause();
        audio.currentTime = 0;
        btn.innerHTML = '<span class="play-icon">🔊</span> Nghe thử';
        currentPlayingVoice = null;
    }
}

function selectVoice(voiceId, voiceName) {
    const select = document.getElementById('voiceSelect');
    select.value = voiceId;
    
    // Close modal
    document.getElementById('voiceGalleryModal').style.display = 'none';
    
    // Stop any playing audio
    if (currentPlayingVoice) {
        const audio = document.getElementById(`sample_${currentPlayingVoice}`);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
        currentPlayingVoice = null;
    }
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = `✓ Đã chọn giọng: ${voiceName}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/* ========================================
   VOICE ADJUSTMENT PANEL
   ======================================== */

let currentAudioFilename = null;
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
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (!audioElement) {
        console.error('[VOICE ADJUSTMENT] Audio element not found');
        return;
    }
    
    // Pause current audio
    audioElement.pause();
    audioElement.currentTime = 0;
    
    // Set new source
    audioElement.src = audioUrl;
    audioElement.load();
    
    // Update download link
    if (downloadBtn) {
        downloadBtn.href = audioUrl;
        downloadBtn.download = audioFilename || `adjusted_${Date.now()}.wav`;
    }
    
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
            // Model sẵn sàng
            convertEmotionalBtn.disabled = false;
            console.log('[EMOTIONAL TTS] ✅ Model ready!');
        } else {
            // Model chưa sẵn sàng
            convertEmotionalBtn.disabled = true;
            convertEmotionalBtn.innerHTML = '<span>⏳</span><span>Đang load model...</span>';
            console.log('[EMOTIONAL TTS] ⏳ Loading model...:', data.message);
            
            // Retry sau 5 giây
            setTimeout(checkEmotionalTTSStatus, 5000);
        }
    } catch (error) {
        console.error('[EMOTIONAL TTS] Error checking status:', error);
        // Retry sau 5 giây
        setTimeout(checkEmotionalTTSStatus, 5000);
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
    if (loadingIndicator) loadingIndicator.style.display = 'block';
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
        
        const payload = { text };
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
        
        // Hide loading
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (data.success) {
            // Show audio player
            const audioElement = document.getElementById('audioElement');
            const downloadBtn = document.getElementById('downloadBtn');
            
            if (audioElement && downloadBtn) {
                // Reset audio element
                audioElement.pause();
                audioElement.currentTime = 0;
                
                // Set new source
                audioElement.src = data.audio_url;
                downloadBtn.href = data.audio_url;
                downloadBtn.download = data.audio_filename || `emotional_${Date.now()}.wav`;
                
                // Load audio
                audioElement.load();
                
                if (audioPlayer) audioPlayer.style.display = 'block';
                
                console.log('[EMOTIONAL TTS] ✅ Success! File:', data.audio_filename);
            }
            
            // Update stats
            await loadStatistics();
            
        } else {
            if (errorMessage) {
                errorMessage.textContent = data.message || 'Không thể chuyển đổi';
                errorMessage.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('[EMOTIONAL TTS] Error:', error);
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
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

