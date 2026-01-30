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
    const processingVoices = document.querySelectorAll('.voice-card[data-status="processing"]');
    
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
    const card = document.querySelector(`.voice-card[data-voice-id="${voiceId}"]`);
    if (!card) return;
    
    const statusElement = card.querySelector('.status-badge');
    const progressBar = card.querySelector('.progress-bar');
    const progressText = card.querySelector('.progress-text');
    
    if (data.status === 'processing' && progressBar) {
        progressBar.style.width = `${data.progress}%`;
        if (progressText) {
            progressText.textContent = `${data.progress}%`;
        }
    }
    
    if (statusElement) {
        if (data.status === 'completed') {
            statusElement.innerHTML = '✅ Đã sẵn sàng';
            statusElement.className = 'status-badge status-completed';
        } else if (data.status === 'failed') {
            statusElement.innerHTML = '❌ Thất bại';
            statusElement.className = 'status-badge status-failed';
        }
    }
    
    // Update card status
    card.dataset.status = data.status;
}

/**
 * Check for processing voices (for auto-refresh)
 */
async function checkProcessingVoices() {
    const processingVoices = document.querySelectorAll('.voice-card[data-status="processing"]');
    
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
    
    // Show modal
    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'flex';
    
    // Reset
    document.getElementById('testResult').style.display = 'none';
}

/**
 * Close test modal
 */
function closeTestModal() {
    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'none';
    currentTestVoiceId = null;
}

/**
 * Run test with sample text
 */
async function runTest() {
    if (!currentTestVoiceId) return;
    
    const text = document.getElementById('testText').value.trim();
    
    if (!text) {
        showNotification('error', 'Vui lòng nhập văn bản để test');
        return;
    }
    
    try {
        const response = await fetch(`/api/custom-voice/${currentTestVoiceId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('success', data.message || 'Test thành công!');
            
            // Show audio player (if audio URL is provided)
            if (data.audio_url && data.audio_url !== '#') {
                const resultDiv = document.getElementById('testResult');
                const audioElement = document.getElementById('testAudio');
                audioElement.src = data.audio_url;
                resultDiv.style.display = 'block';
            }
        } else {
            showNotification('error', data.error || 'Test thất bại');
        }
    } catch (error) {
        console.error('[MY VOICES] Error testing voice:', error);
        showNotification('error', 'Lỗi kết nối');
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
            const card = document.querySelector(`.voice-card[data-voice-id="${voiceId}"]`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);
            }
            
            // Stop polling if exists
            if (progressPollingInterval[voiceId]) {
                clearInterval(progressPollingInterval[voiceId]);
                delete progressPollingInterval[voiceId];
            }
            
            // Check if no voices left
            setTimeout(() => {
                const remainingVoices = document.querySelectorAll('.voice-card');
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
