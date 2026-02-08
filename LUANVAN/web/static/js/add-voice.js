/**
 * Add Voice Page - Upload and Train Custom Voice
 */

let selectedFile = null;
let currentVoiceId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ADD VOICE] Page initialized');
    
    setupUploadArea();
    setupForm();
    setupAdjustmentSliders();
    setupVoiceTypeToggle();
});

/**
 * Toggle Zero-shot vs RVC: show/hide ref_transcript and base voice sections
 */
function setupVoiceTypeToggle() {
    const voiceTypeRvc = document.getElementById('voiceTypeRvc');
    const voiceTypeZeroShot = document.getElementById('voiceTypeZeroShot');
    const refTranscriptBlock = document.getElementById('refTranscriptBlock');
    const baseVoiceSection = document.getElementById('baseVoiceSection');
    const adjustmentsSection = document.getElementById('adjustmentsSection');
    
    function updateVisibility() {
        const isZeroShot = voiceTypeZeroShot && voiceTypeZeroShot.checked;
        if (refTranscriptBlock) refTranscriptBlock.style.display = isZeroShot ? 'block' : 'none';
        if (baseVoiceSection) baseVoiceSection.style.display = isZeroShot ? 'none' : 'block';
        if (adjustmentsSection) adjustmentsSection.style.display = isZeroShot ? 'none' : 'block';
        const refInput = document.getElementById('refTranscript');
        if (refInput) refInput.required = !!isZeroShot;
    }
    
    if (voiceTypeRvc) voiceTypeRvc.addEventListener('change', updateVisibility);
    if (voiceTypeZeroShot) voiceTypeZeroShot.addEventListener('change', updateVisibility);
    updateVisibility();
}

/**
 * Setup upload area (drag & drop)
 */
function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('audioFile');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to select file
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
}

/**
 * Handle file selection
 */
function handleFileSelect(file) {
    console.log('[ADD VOICE] File selected:', file.name);
    
    // Validate file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav', 'audio/x-m4a', 'audio/mp4'];
    const validExtensions = ['.wav', '.mp3', '.m4a'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        showNotification('error', 'Định dạng file không hỗ trợ. Vui lòng chọn file WAV, MP3 hoặc M4A');
        return;
    }
    
    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showNotification('error', 'File quá lớn. Tối đa 100MB');
        return;
    }
    
    // Store file
    selectedFile = file;
    
    // Show file info
    displayFileInfo(file);
    
    // Enable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

/**
 * Display file information
 */
function displayFileInfo(file) {
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileDuration = document.getElementById('fileDuration');
    
    if (!fileInfo) return;
    
    // Hide upload area, show file info
    if (uploadArea) uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    
    // Set file name
    if (fileName) fileName.textContent = file.name;
    
    // Set file size
    if (fileSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileSize.textContent = `📦 Kích thước: ${sizeMB} MB`;
    }
    
    // Try to get duration using Audio element
    if (fileDuration) {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            fileDuration.textContent = `⏱️ Độ dài: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Check training mode
            const trainingMode = duration <= 300 ? 'realtime (~30-60 giây)' : 'background (~2-3 giờ)';
            fileDuration.innerHTML += `<br>🔧 Training: ${trainingMode}`;
            
            URL.revokeObjectURL(audio.src);
        });
    }
}

/**
 * Remove selected file
 */
function removeFile() {
    selectedFile = null;
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileInput = document.getElementById('audioFile');
    const submitBtn = document.getElementById('submitBtn');
    const qualityCheck = document.getElementById('qualityCheck');
    
    if (uploadArea) uploadArea.style.display = 'flex';
    if (fileInfo) fileInfo.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (submitBtn) submitBtn.disabled = true;
    if (qualityCheck) qualityCheck.style.display = 'none';
}

/**
 * Setup adjustment sliders
 */
function setupAdjustmentSliders() {
    // Pitch slider
    const pitchSlider = document.getElementById('pitchAdjustment');
    const pitchValue = document.getElementById('pitchValue');
    
    if (pitchSlider && pitchValue) {
        pitchSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            pitchValue.textContent = value > 0 ? `+${value}` : value;
        });
    }
    
    // Speed slider
    const speedSlider = document.getElementById('speedAdjustment');
    const speedValue = document.getElementById('speedValue');
    
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = `${value.toFixed(1)}x`;
        });
    }
    
    // Energy slider
    const energySlider = document.getElementById('energyAdjustment');
    const energyValue = document.getElementById('energyValue');
    
    if (energySlider && energyValue) {
        energySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            energyValue.textContent = `${value.toFixed(1)}x`;
        });
    }
}

/**
 * Setup form submission
 */
function setupForm() {
    const form = document.getElementById('addVoiceForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubmit();
    });
}

/**
 * Handle form submission
 */
async function handleSubmit() {
    if (!selectedFile) {
        showNotification('error', 'Vui lòng chọn file audio');
        return;
    }
    
    const voiceName = document.getElementById('voiceName').value.trim();
    if (!voiceName) {
        showNotification('error', 'Vui lòng nhập tên giọng');
        return;
    }
    
    const voiceTypeZeroShot = document.getElementById('voiceTypeZeroShot');
    const isZeroShot = voiceTypeZeroShot && voiceTypeZeroShot.checked;
    const refTranscript = document.getElementById('refTranscript') ? document.getElementById('refTranscript').value.trim() : '';
    if (isZeroShot && !refTranscript) {
        showNotification('error', 'Zero-shot cần nhập transcript (nội dung nói trong file mẫu)');
        return;
    }
    
    const description = document.getElementById('voiceDescription').value.trim();
    
    // Show progress
    showTrainingProgress();
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('audio_file', selectedFile);
        formData.append('voice_name', voiceName);
        formData.append('description', description);
        formData.append('voice_type', isZeroShot ? 'zero_shot' : 'rvc');
        if (isZeroShot) formData.append('ref_transcript', refTranscript);
        
        // V2: Add base voice and adjustments (RVC only)
        const baseVoice = document.getElementById('baseVoice').value;
        const pitchAdjustment = document.getElementById('pitchAdjustment').value;
        const speedAdjustment = document.getElementById('speedAdjustment').value;
        const energyAdjustment = document.getElementById('energyAdjustment').value;
        
        formData.append('base_voice_id', baseVoice);
        formData.append('pitch_adjustment', pitchAdjustment);
        formData.append('speed_adjustment', speedAdjustment);
        formData.append('energy_adjustment', energyAdjustment);
        
        console.log('[ADD VOICE] Submitting with:', {
            voice_name: voiceName,
            voice_type: isZeroShot ? 'zero_shot' : 'rvc',
            ref_transcript: isZeroShot ? refTranscript : '(none)',
            base_voice_id: baseVoice,
            pitch_adjustment: pitchAdjustment,
            speed_adjustment: speedAdjustment,
            energy_adjustment: energyAdjustment
        });
        
        // Upload and start training (or zero-shot: done immediately)
        const response = await fetch('/api/custom-voice/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        
        console.log('[ADD VOICE] Upload successful:', data);
        
        // Zero-shot: no training, show success immediately
        if (data.voice_type === 'zero_shot') {
            showTrainingSuccess(data.message || 'Giọng Zero-shot đã sẵn sàng. Bạn có thể dùng ngay.');
            return;
        }
        
        // Store voice ID for progress tracking
        currentVoiceId = data.custom_voice_id;
        
        // Update progress subtitle
        updateProgressSubtitle(data);
        
        // Start polling progress
        if (data.training_mode === 'realtime' || data.training_mode === 'instant') {
            pollTrainingProgress(currentVoiceId);
        } else {
            showBackgroundInfo(data);
        }
        
    } catch (error) {
        console.error('[ADD VOICE] Error:', error);
        showTrainingError(error.message);
    }
}

/**
 * Show training progress
 */
function showTrainingProgress() {
    document.getElementById('addVoiceForm').style.display = 'none';
    document.getElementById('trainingProgress').style.display = 'block';
}

/**
 * Update progress subtitle
 */
function updateProgressSubtitle(data) {
    const subtitle = document.getElementById('progressSubtitle');
    if (!subtitle) return;
    
    if (data.training_mode === 'realtime') {
        subtitle.textContent = 'Training realtime - Vui lòng đợi...';
    } else {
        subtitle.textContent = 'Đã thêm vào hàng đợi background';
    }
    
    // Show quality info
    const note = document.getElementById('progressNote');
    if (note && data.quality_message) {
        note.textContent = data.quality_message;
    }
}

/**
 * Poll training progress
 */
function pollTrainingProgress(voiceId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/custom-voice/${voiceId}/progress`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get progress');
            }
            
            // Update progress bar
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            if (progressBar) {
                progressBar.style.width = `${data.progress}%`;
            }
            if (progressText) {
                progressText.textContent = `${data.progress}%`;
            }
            
            // Check status
            if (data.status === 'completed') {
                clearInterval(interval);
                showTrainingSuccess('Training hoàn tất! Giọng của bạn đã sẵn sàng.');
            } else if (data.status === 'failed') {
                clearInterval(interval);
                showTrainingError(data.error || 'Training thất bại');
            }
            
        } catch (error) {
            console.error('[ADD VOICE] Error polling progress:', error);
            clearInterval(interval);
            showTrainingError('Lỗi kết nối');
        }
    }, 2000); // Poll every 2 seconds
}

/**
 * Show background training info
 */
function showBackgroundInfo(data) {
    const progressDiv = document.getElementById('trainingProgress');
    const subtitle = document.getElementById('progressSubtitle');
    const progressBar = document.getElementById('progressBar');
    const note = document.getElementById('progressNote');
    
    if (subtitle) {
        subtitle.textContent = '✅ Đã thêm vào hàng đợi training';
    }
    
    if (progressBar) {
        progressBar.style.width = '10%';
        progressBar.innerHTML = '<span class="progress-text">Đang chờ...</span>';
    }
    
    if (note) {
        note.innerHTML = `
            📬 Bạn sẽ nhận thông báo khi training hoàn tất.<br>
            Ước tính: ~2-3 giờ (tùy thuộc vào hàng đợi)<br><br>
            <a href="${window.location.origin}/my-voices" class="btn-link">Xem tất cả giọng của tôi →</a>
        `;
    }
}

/**
 * Show training success
 */
function showTrainingSuccess(message) {
    document.getElementById('trainingProgress').style.display = 'none';
    const successDiv = document.getElementById('trainingSuccess');
    const successMessage = document.getElementById('successMessage');
    
    if (successDiv) successDiv.style.display = 'block';
    if (successMessage) successMessage.textContent = message;
}

/**
 * Show training error
 */
function showTrainingError(message) {
    document.getElementById('trainingProgress').style.display = 'none';
    const errorDiv = document.getElementById('trainingError');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorDiv) errorDiv.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
}

/**
 * Show notification
 */
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="notification-text">${message}</span>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
