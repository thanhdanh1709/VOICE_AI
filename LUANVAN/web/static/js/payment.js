/**
 * Payment Status Tracking & Success Notifications
 * Theo dõi thanh toán và hiển thị thông báo thành công
 */

class PaymentTracker {
    constructor() {
        this.activePayments = new Map(); // payment_id -> tracking data
        this.checkInterval = 10000; // Check mỗi 10 giây
        this.maxCheckDuration = 300000; // Dừng check sau 5 phút
        this.notificationContainer = null;
        
        this.init();
    }
    
    init() {
        // Tạo notification container
        this.createNotificationContainer();
        
        // Check localStorage cho pending payments từ session trước
        this.restorePendingPayments();
        
        console.log('[PaymentTracker] Initialized');
    }
    
    createNotificationContainer() {
        if (document.getElementById('paymentNotifications')) return;
        
        const container = document.createElement('div');
        container.id = 'paymentNotifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        this.notificationContainer = container;
    }
    
    showNotification(message, type = 'success', duration = 8000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} payment-notification`;
        notification.style.cssText = `
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>💳 Thanh toán</strong><br>
                    <span>${message}</span>
                </div>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    }
    
    /**
     * Bắt đầu theo dõi payment sau khi tạo thanh toán
     */
    trackPayment(paymentData) {
        const paymentId = paymentData.payment_id;
        const transactionId = paymentData.transaction_id;
        
        console.log(`[PaymentTracker] Start tracking payment ${paymentId} (${transactionId})`);
        
        // Lưu thông tin tracking
        const trackingData = {
            paymentId: paymentId,
            transactionId: transactionId,
            startTime: Date.now(),
            checkCount: 0,
            packageInfo: paymentData.package_info,
            userInfo: paymentData.user_info
        };
        
        this.activePayments.set(paymentId, trackingData);
        
        // Lưu vào localStorage để persist across page refresh
        localStorage.setItem('pendingPayment', JSON.stringify({
            paymentId: paymentId,
            transactionId: transactionId,
            startTime: trackingData.startTime,
            packageInfo: paymentData.package_info
        }));
        
        // Show thông báo tracking
        this.showNotification(
            `Đang theo dõi thanh toán ${trackingData.packageInfo.name} (${this.formatPrice(trackingData.packageInfo.price)})...`,
            'info',
            5000
        );
        
        // Bắt đầu check status
        this.startChecking(paymentId);
    }
    
    startChecking(paymentId) {
        const trackingData = this.activePayments.get(paymentId);
        if (!trackingData) return;
        
        // Check ngay lập tức
        this.checkPaymentStatus(paymentId);
        
        // Thiết lập interval checking
        trackingData.intervalId = setInterval(() => {
            this.checkPaymentStatus(paymentId);
        }, this.checkInterval);
    }
    
    async checkPaymentStatus(paymentId) {
        const trackingData = this.activePayments.get(paymentId);
        if (!trackingData) return;
        
        trackingData.checkCount++;
        
        // Kiểm tra timeout
        if (Date.now() - trackingData.startTime > this.maxCheckDuration) {
            this.stopTracking(paymentId, 'timeout');
            return;
        }
        
        try {
            console.log(`[PaymentTracker] Checking payment ${paymentId} (attempt ${trackingData.checkCount})`);
            
            const response = await fetch(`/api/payment/status/${paymentId}`);
            const data = await response.json();
            
            if (data.success && data.payment.status === 'completed') {
                // Payment thành công!
                this.handlePaymentSuccess(paymentId, data);
            } else {
                // Chưa thành công, tiếp tục check
                console.log(`[PaymentTracker] Payment ${paymentId} status: ${data.payment?.status || 'unknown'}`);
            }
            
        } catch (error) {
            console.error(`[PaymentTracker] Error checking payment ${paymentId}:`, error);
            
            if (trackingData.checkCount > 5) {
                this.stopTracking(paymentId, 'error');
            }
        }
    }
    
    handlePaymentSuccess(paymentId, paymentData) {
        const trackingData = this.activePayments.get(paymentId);
        
        console.log(`[PaymentTracker] Payment ${paymentId} SUCCESS!`, paymentData);
        
        // Show thông báo thành công
        const packageInfo = trackingData.packageInfo;
        const message = `
            <strong>✅ Thanh toán thành công!</strong><br>
            📦 Gói: <strong>${packageInfo.name}</strong><br>
            💰 Số tiền: <strong>${this.formatPrice(packageInfo.price)}</strong><br>
            📝 Ký tự nhận được: <strong>+${this.formatNumber(packageInfo.characters)}</strong><br>
            🔄 Tự động cập nhật tài khoản...
        `;
        
        this.showNotification(message, 'success', 15000);
        
        // Refresh character count trên trang
        this.refreshUserCharacters();
        
        // Dừng tracking
        this.stopTracking(paymentId, 'success');
        
        // Trigger custom event cho các component khác
        window.dispatchEvent(new CustomEvent('paymentSuccess', {
            detail: {
                paymentId: paymentId,
                packageInfo: packageInfo,
                charactersData: paymentData.user_characters
            }
        }));
    }
    
    async refreshUserCharacters() {
        try {
            // Update subscription status trên pricing page
            if (typeof loadSubscriptionStatus === 'function') {
                await loadSubscriptionStatus();
            }
            
            // Update character display trên main page
            const response = await fetch('/api/user/characters');
            const data = await response.json();
            
            if (data.success) {
                const charactersElement = document.querySelector('[data-characters-display]');
                if (charactersElement) {
                    charactersElement.textContent = this.formatNumber(data.characters_remaining);
                }
                
                console.log('[PaymentTracker] Updated character display:', data.characters_remaining);
            }
            
        } catch (error) {
            console.error('[PaymentTracker] Error refreshing characters:', error);
        }
    }
    
    stopTracking(paymentId, reason) {
        const trackingData = this.activePayments.get(paymentId);
        if (!trackingData) return;
        
        console.log(`[PaymentTracker] Stop tracking payment ${paymentId} (reason: ${reason})`);
        
        // Clear interval
        if (trackingData.intervalId) {
            clearInterval(trackingData.intervalId);
        }
        
        // Remove from active payments
        this.activePayments.delete(paymentId);
        
        // Remove from localStorage
        const stored = localStorage.getItem('pendingPayment');
        if (stored) {
            const pendingData = JSON.parse(stored);
            if (pendingData.paymentId === paymentId) {
                localStorage.removeItem('pendingPayment');
            }
        }
        
        // Show timeout message if needed
        if (reason === 'timeout') {
            this.showNotification(
                'Thời gian theo dõi thanh toán đã hết. Vui lòng kiểm tra thủ công hoặc liên hệ hỗ trợ.',
                'warning',
                0
            );
        }
    }
    
    restorePendingPayments() {
        const stored = localStorage.getItem('pendingPayment');
        if (!stored) return;
        
        try {
            const pendingData = JSON.parse(stored);
            const elapsed = Date.now() - pendingData.startTime;
            
            // Không restore nếu quá 10 phút
            if (elapsed > 600000) {
                localStorage.removeItem('pendingPayment');
                return;
            }
            
            console.log('[PaymentTracker] Restoring pending payment:', pendingData);
            
            // Tạo tracking data
            const trackingData = {
                paymentId: pendingData.paymentId,
                transactionId: pendingData.transactionId,
                startTime: pendingData.startTime,
                checkCount: 0,
                packageInfo: pendingData.packageInfo
            };
            
            this.activePayments.set(pendingData.paymentId, trackingData);
            
            // Show thông báo restore
            this.showNotification(
                `Tiếp tục theo dõi thanh toán ${pendingData.packageInfo.name}...`,
                'info',
                5000
            );
            
            // Bắt đầu check
            this.startChecking(pendingData.paymentId);
            
        } catch (error) {
            console.error('[PaymentTracker] Error restoring pending payments:', error);
            localStorage.removeItem('pendingPayment');
        }
    }
    
    /**
     * Manual verification của payment (khi user click verify button)
     */
    async verifyPayment(transactionId) {
        try {
            this.showNotification('Đang xác minh thanh toán...', 'info', 3000);
            
            const response = await fetch(`/api/payment/verify/${transactionId}`);
            const data = await response.json();
            
            if (data.success) {
                if (data.verified) {
                    // Thành công
                    this.showNotification(
                        data.message + (data.characters_added ? `<br>➕ Ký tự thêm: ${this.formatNumber(data.characters_added)}` : ''),
                        'success',
                        10000
                    );
                    
                    this.refreshUserCharacters();
                    
                    // Trigger success event
                    window.dispatchEvent(new CustomEvent('paymentVerified', {
                        detail: { transactionId, verified: true }
                    }));
                    
                } else {
                    // Chưa thành công
                    this.showNotification(data.message, 'warning', 8000);
                }
            } else {
                this.showNotification(`Lỗi xác minh: ${data.message}`, 'danger', 8000);
            }
            
        } catch (error) {
            console.error('[PaymentTracker] Error verifying payment:', error);
            this.showNotification('Lỗi kết nối khi xác minh thanh toán', 'danger', 5000);
        }
    }
    
    // Utility methods
    formatNumber(num) {
        return new Intl.NumberFormat('vi-VN').format(num);
    }
    
    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }
    
    /**
     * Get active tracking status
     */
    getTrackingStatus() {
        const status = {};
        for (const [paymentId, data] of this.activePayments) {
            status[paymentId] = {
                transactionId: data.transactionId,
                checkCount: data.checkCount,
                elapsed: Date.now() - data.startTime
            };
        }
        return status;
    }
}

// CSS cho animation
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.payment-notification {
    animation: slideInRight 0.3s ease-out;
}

.payment-notification:hover {
    transform: translateX(-5px);
    transition: transform 0.2s ease;
}

.payment-notification .btn-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.6;
}

.payment-notification .btn-close:hover {
    opacity: 1;
}
`;
document.head.appendChild(style);

// Initialize global payment tracker
window.paymentTracker = new PaymentTracker();
console.log('[Payment.js] PaymentTracker initialized globally');

// Export functions for global use
window.trackPayment = (paymentData) => window.paymentTracker.trackPayment(paymentData);
window.verifyPayment = (transactionId) => window.paymentTracker.verifyPayment(transactionId);