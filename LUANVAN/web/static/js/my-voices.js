/**
 * My Voices Page - Custom Voice Management
 */

let currentTestVoiceId = null;
const progressPollingInterval = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[MY VOICES] Page initialized');
    
    // Start polling for voices in processing state
    startProgressPolling();
    
    // Setup auto-refresh for processing voices
    setInterval(checkProcessingVoices, 30000); // Check every 30 seconds
});

/**
 * Start polling progress for voices being trained
 */
function startProgressPolling() {
    const processingVoices = document.querySelectorAll('.voice-card[data-status="processing"], .voice-card-modern[data-status="processing"]');
    
    processingVoices.forEach(card => {
        const voiceId = card.dataset.voiceId;
        if (!progressPollingInterval[voiceId]) {
            pollProgress(voiceId);
        }
    });
}

/**
 * Poll progress for a specific voice
 */
function pollProgress(voiceId) {
    // Poll every 3 seconds
    progressPollingInterval[voiceId] = setInterval(async () => {
        try {
            const response = await fetch(`/api/custom-voice/${voiceId}/progress`);
            const data = await response.json();
            
            if (!response.ok) {
                console.error('[MY VOICES] Error fetching progress:', data);
                return;
            }
            
            updateVoiceCard(voiceId, data);
            
            // Stop polling if completed or failed
            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(progressPollingInterval[voiceId]);
                delete progressPollingInterval[voiceId];
                
                // Show notification
                if (data.status === 'completed') {
                    showNotification('success', 'Training hoàn tất!');
                } else {
                    showNotification('error', 'Training thất bại: ' + (data.error || 'Unknown error'));
                }
                
                // Reload page after a delay
                setTimeout(() => location.reload(), 2000);
            }
            
        } catch (error) {
            console.error('[MY VOICES] Error polling progress:', error);
        }
    }, 3000);
}

/**
 * Update voice card with progress data
 */
function updateVoiceCard(voiceId, data) {
    const card = document.querySelector(`.voice-card[data-voice-id="${voiceId}"], .voice-card-modern[data-voice-id="${voiceId}"]`);
    if (!card) return;
    
    // Update progress bar (both old and new styles)
    const progressBar = card.querySelector('.progress-bar');
    const progressFill = card.querySelector('.progress-fill-modern');
    const progressText = card.querySelector('.progress-text, .progress-text-modern');
    
    if (data.status === 'processing') {
        if (progressBar) {
            progressBar.style.width = `${data.progress}%`;
        }
        if (progressFill) {
            progressFill.style.width = `${data.progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${data.progress}%`;
        }
    }
    
    // Update status badge (both old and new styles)
    const statusElement = card.querySelector('.status-badge, .badge');
    if (statusElement) {
        if (data.status === 'completed') {
            statusElement.innerHTML = '✅ Đã sẵn sàng';
            statusElement.className = 'badge badge-success';
        } else if (data.status === 'failed') {
            statusElement.innerHTML = '❌ Thất bại';
            statusElement.className = 'badge badge-error';
        }
    }
    
    // Update card status
    card.dataset.status = data.status;
}

/**
 * Check for processing voices (for auto-refresh)
 */
async function checkProcessingVoices() {
    const processingVoices = document.querySelectorAll('.voice-card[data-status="processing"], .voice-card-modern[data-status="processing"]');
    
    if (processingVoices.length > 0) {
        console.log('[MY VOICES] Checking processing voices...');
        processingVoices.forEach(card => {
            const voiceId = card.dataset.voiceId;
            if (!progressPollingInterval[voiceId]) {
                pollProgress(voiceId);
            }
        });
    }
}

/**
 * Refresh progress for a voice
 */
async function refreshProgress(voiceId) {
    try {
        const response = await fetch(`/api/custom-voice/${voiceId}/progress`);
        const data = await response.json();
        
        if (response.ok) {
            updateVoiceCard(voiceId, data);
            showNotification('success', 'Đã cập nhật trạng thái');
        } else {
            showNotification('error', 'Lỗi: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[MY VOICES] Error refreshing progress:', error);
        showNotification('error', 'Lỗi kết nối');
    }
}

/**
 * Test voice with sample text
 */
function testVoice(voiceId) {
    currentTestVoiceId = voiceId;
    
    // Reset modal state
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testLoading').style.display = 'none';
    const testError = document.getElementById('testError');
    if (testError) testError.style.display = 'none';
    
    // Show modal
    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'flex';
    modal.classList.add('is-active');
    
    // Reset
    document.getElementById('testResult').style.display = 'none';
}

/**
 * Close test modal
 */
function closeTestModal() {
    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'none';
    modal.classList.remove('is-active');
    currentTestVoiceId = null;
}

/**
 * Run test with sample text
 */
async function runTest() {
    console.log('[MY VOICES] runTest() called');
    console.log('[MY VOICES] currentTestVoiceId:', currentTestVoiceId);
    
    if (!currentTestVoiceId) {
        console.error('[MY VOICES] No voice ID selected!');
        showTestError('Không tìm thấy ID giọng nói. Vui lòng đóng và mở lại modal.');
        return;
    }
    
    const textElement = document.getElementById('testText');
    if (!textElement) {
        console.error('[MY VOICES] testText element not found!');
        showTestError('Không tìm thấy textbox. Vui lòng refresh trang.');
        return;
    }
    
    const text = textElement.value.trim();
    console.log('[MY VOICES] Test text:', text);
    
    if (!text) {
        showTestError('Vui lòng nhập văn bản để test');
        return;
    }
    
    // Show loading
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testError').style.display = 'none';
    document.getElementById('testLoading').style.display = 'block';
    
    try {
        console.log('[MY VOICES] Sending request to:', `/api/custom-voice/${currentTestVoiceId}/test`);
        
        const response = await fetch(`/api/custom-voice/${currentTestVoiceId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test_text: text })
        });
        
        console.log('[MY VOICES] Response status:', response.status);
        const data = await response.json();
        console.log('[MY VOICES] Response data:', data);
        
        // Hide loading
        document.getElementById('testLoading').style.display = 'none';
        
        if (response.ok && data.success) {
            // Show audio player (if audio URL is provided)
            if (data.audio_url && data.audio_url !== '#') {
                const resultDiv = document.getElementById('testResult');
                const audioElement = document.getElementById('testAudio');
                if (audioElement && resultDiv) {
                    audioElement.src = data.audio_url;
                    resultDiv.style.display = 'block';
                    console.log('[MY VOICES] Audio player shown with URL:', data.audio_url);
                }
            } else {
                showTestError('Test thành công nhưng không có audio URL');
            }
        } else {
            showTestError(data.error || 'Test thất bại');
        }
    } catch (error) {
        console.error('[MY VOICES] Error testing voice:', error);
        document.getElementById('testLoading').style.display = 'none';
        showTestError('Lỗi kết nối: ' + error.message);
    }
}

/**
 * Show test error message
 */
function showTestError(message) {
    const testError = document.getElementById('testError');
    if (testError) {
        testError.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:rgba(147,0,10,0.15);border:1px solid rgba(255,180,171,0.25);color:#ffb4ab;font-size:13px;">
                <span class="material-symbols-outlined" style="font-size:16px">error_outline</span>
                <span>${message}</span>
            </div>`;
        testError.style.display = 'block';
    }
}

/**
 * Use voice (go to main TTS page with this voice selected)
 */
function useVoice(voiceId) {
    // Redirect to main TTS page with custom voice selected
    window.location.href = `/?custom_voice=${voiceId}`;
}

/**
 * Delete voice
 */
async function deleteVoice(voiceId, voiceName) {
    const confirmed = confirm(`Bạn có chắc muốn xóa giọng "${voiceName}"?\n\nHành động này không thể hoàn tác.`);
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/custom-voice/${voiceId}/delete`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('success', 'Đã xóa giọng thành công');
            
            // Remove card from DOM
            const card = document.querySelector(`.voice-card-modern[data-voice-id="${voiceId}"]`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                card.style.transition = 'all 0.3s ease';
                setTimeout(() => card.remove(), 300);
            }

            // Stop polling if exists
            if (progressPollingInterval[voiceId]) {
                clearInterval(progressPollingInterval[voiceId]);
                delete progressPollingInterval[voiceId];
            }

            // Check if no voices left
            setTimeout(() => {
                const remainingVoices = document.querySelectorAll('.voice-card-modern');
                if (remainingVoices.length === 0) {
                    location.reload();
                }
            }, 500);
        } else {
            showNotification('error', data.error || 'Xóa thất bại');
        }
    } catch (error) {
        console.error('[MY VOICES] Error deleting voice:', error);
        showNotification('error', 'Lỗi kết nối');
    }
}

/**
 * Retry training (for failed voices)
 */
async function retryTraining(voiceId) {
    // TODO: Implement retry logic
    showNotification('info', 'Tính năng retry đang được phát triển');
}

/**
 * Show notification
 */
function showNotification(type, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="notification-text">${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Hide and remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('testVoiceModal');
    if (event.target === modal) {
        closeTestModal();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    // Clear all polling intervals
    for (const voiceId in progressPollingInterval) {
        clearInterval(progressPollingInterval[voiceId]);
    }
});
