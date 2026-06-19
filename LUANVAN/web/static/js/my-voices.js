/**
 * My Voices Page - Custom Voice Management
 */

let currentTestVoiceId = null;
const progressPollingInterval = {};

document.addEventListener('DOMContentLoaded', function() {
    startProgressPolling();
    setInterval(checkProcessingVoices, 30000);
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
    progressPollingInterval[voiceId] = setInterval(async () => {
        try {
            const response = await fetch(`/api/custom-voice/${voiceId}/progress`);
            const data = await response.json();

            if (!response.ok) {
                console.error('[MY VOICES] Error fetching progress:', data);
                return;
            }

            updateVoiceCard(voiceId, data);

            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(progressPollingInterval[voiceId]);
                delete progressPollingInterval[voiceId];

                if (data.status === 'completed') {
                    showNotification('success', 'Training hoàn tất!');
                } else {
                    showNotification('error', 'Training thất bại: ' + (data.error || 'Unknown error'));
                }

                setTimeout(() => location.reload(), 2000);
            }
        } catch (error) {
            console.error('[MY VOICES] Error polling progress:', error);
        }
    }, 3000);
}

function updateVoiceCard(voiceId, data) {
    const card = document.querySelector(`.voice-card[data-voice-id="${voiceId}"], .voice-card-modern[data-voice-id="${voiceId}"]`);
    if (!card) return;

    const progressBar = card.querySelector('.progress-bar');
    const progressFill = card.querySelector('.progress-fill-modern');
    const progressText = card.querySelector('.progress-text, .progress-text-modern');

    if (data.status === 'processing') {
        if (progressBar) progressBar.style.width = `${data.progress}%`;
        if (progressFill) progressFill.style.width = `${data.progress}%`;
        if (progressText) progressText.textContent = `${data.progress}%`;
    }

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

    card.dataset.status = data.status;
}

async function checkProcessingVoices() {
    const processingVoices = document.querySelectorAll('.voice-card[data-status="processing"], .voice-card-modern[data-status="processing"]');

    if (processingVoices.length > 0) {
        processingVoices.forEach(card => {
            const voiceId = card.dataset.voiceId;
            if (!progressPollingInterval[voiceId]) {
                pollProgress(voiceId);
            }
        });
    }
}

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

function testVoice(voiceId) {
    currentTestVoiceId = voiceId;
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testLoading').style.display = 'none';
    const testError = document.getElementById('testError');
    if (testError) testError.style.display = 'none';

    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'flex';
    modal.classList.add('is-active');
}

function closeTestModal() {
    const modal = document.getElementById('testVoiceModal');
    modal.style.display = 'none';
    modal.classList.remove('is-active');
    currentTestVoiceId = null;
}

async function runTest() {
    if (!currentTestVoiceId) {
        showTestError('Không tìm thấy ID giọng nói. Vui lòng đóng và mở lại modal.');
        return;
    }

    const textElement = document.getElementById('testText');
    const text = textElement.value.trim();

    if (!text) {
        showTestError('Vui lòng nhập văn bản để test');
        return;
    }

    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testError').style.display = 'none';
    document.getElementById('testLoading').style.display = 'block';

    try {
        const response = await fetch(`/api/custom-voice/${currentTestVoiceId}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test_text: text })
        });

        const data = await response.json();
        document.getElementById('testLoading').style.display = 'none';

        if (response.ok && data.success) {
            if (data.audio_url && data.audio_url !== '#') {
                const resultDiv = document.getElementById('testResult');
                const audioElement = document.getElementById('testAudio');
                if (audioElement && resultDiv) {
                    audioElement.src = data.audio_url;
                    resultDiv.style.display = 'block';
                }
            } else {
                showTestError('Test thành công nhưng không có audio URL');
            }
        } else {
            showTestError(data.error || 'Test thất bại');
        }
    } catch (error) {
        document.getElementById('testLoading').style.display = 'none';
        showTestError('Lỗi kết nối: ' + error.message);
    }
}

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

function useVoice(voiceId) {
    window.location.href = `/?custom_voice=${voiceId}`;
}

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

            if (progressPollingInterval[voiceId]) {
                clearInterval(progressPollingInterval[voiceId]);
                delete progressPollingInterval[voiceId];
            }

            setTimeout(() => {
                const cards = document.querySelectorAll('.voice-card-modern');
                const urlParams = new URLSearchParams(window.location.search);
                const currentPage = parseInt(urlParams.get('page') || '1', 10);

                if (cards.length <= 1 && currentPage > 1) {
                    window.location.href = `/my-voices?page=${currentPage - 1}`;
                } else {
                    window.location.reload();
                }
            }, 400);
        } else {
            showNotification('error', data.error || 'Xóa thất bại');
        }
    } catch (error) {
        console.error('[MY VOICES] Error deleting voice:', error);
        showNotification('error', 'Lỗi kết nối');
    }
}

async function retryTraining(voiceId) {
    showNotification('info', window.__ ? __('err.retry_dev') : 'Tính năng retry đang được phát triển');
}

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

window.addEventListener('click', function(event) {
    const modal = document.getElementById('testVoiceModal');
    if (event.target === modal) {
        closeTestModal();
    }
});

window.addEventListener('beforeunload', function() {
    for (const voiceId in progressPollingInterval) {
        clearInterval(progressPollingInterval[voiceId]);
    }
});
