/**
 * Contact Page JavaScript
 * Xử lý form liên hệ
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const messageTextarea = document.getElementById('contactMessage');
    const charCount = document.getElementById('messageCharCount');
    const successAlert = document.getElementById('contactSuccess');
    const errorAlert = document.getElementById('contactError');
    const submitBtn = document.getElementById('submitContactBtn');
    
    // Character counter
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', () => {
            const count = messageTextarea.value.length;
            charCount.textContent = count;
            
            if (count > 1000) {
                charCount.style.color = '#e53e3e';
                messageTextarea.value = messageTextarea.value.substring(0, 1000);
            } else if (count > 900) {
                charCount.style.color = '#f6ad55';
            } else {
                charCount.style.color = '#667eea';
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value.trim();
            
            // Validate
            if (!name || !email || !subject || !message) {
                showError('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            if (message.length > 1000) {
                showError('Nội dung tin nhắn quá dài (tối đa 1000 ký tự)');
                return;
            }
            
            // Disable button and show loading
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Đang gửi...</span>';
            
            // Hide previous alerts
            hideAlerts();
            
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        subject,
                        message
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showSuccess(data.message);
                    form.reset();
                    charCount.textContent = '0';
                } else {
                    showError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
                }
            } catch (error) {
                console.error('Error submitting contact:', error);
                showError('Lỗi kết nối. Vui lòng thử lại sau.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});

function showSuccess(message) {
    const successAlert = document.getElementById('contactSuccess');
    const errorAlert = document.getElementById('contactError');
    
    errorAlert.style.display = 'none';
    successAlert.querySelector('.alert-text').textContent = message;
    successAlert.style.display = 'flex';
    
    // Scroll to alert
    successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        successAlert.style.display = 'none';
    }, 5000);
}

function showError(message) {
    const successAlert = document.getElementById('contactSuccess');
    const errorAlert = document.getElementById('contactError');
    
    successAlert.style.display = 'none';
    errorAlert.querySelector('.alert-text').textContent = message;
    errorAlert.style.display = 'flex';
    
    // Scroll to alert
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

function hideAlerts() {
    document.getElementById('contactSuccess').style.display = 'none';
    document.getElementById('contactError').style.display = 'none';
}
