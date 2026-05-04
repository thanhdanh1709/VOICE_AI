/**
 * Payment Tracker — VietVoice
 * Tự động polling kiểm tra trạng thái thanh toán và hiển thị thông báo.
 */

class PaymentTracker {
    constructor() {
        this.activePayments = new Map();
        this.POLL_INTERVAL   = 5000;   // poll mỗi 5 giây
        this.MAX_DURATION    = 600000; // dừng sau 10 phút
        this._containerEl    = null;
        this._init();
    }

    _init() {
        this._buildContainer();
        this._restorePending();
    }

    // ── Notification container ────────────────────────────────
    _buildContainer() {
        if (document.getElementById('vv-pay-notifications')) return;
        const el = document.createElement('div');
        el.id = 'vv-pay-notifications';
        el.style.cssText = [
            'position:fixed', 'top:80px', 'right:20px', 'z-index:99999',
            'display:flex', 'flex-direction:column', 'gap:10px',
            'max-width:380px', 'pointer-events:none'
        ].join(';');
        document.body.appendChild(el);
        this._containerEl = el;
        this._injectCSS();
    }

    _injectCSS() {
        if (document.getElementById('vv-pay-css')) return;
        const s = document.createElement('style');
        s.id = 'vv-pay-css';
        s.textContent = `
        @keyframes vvSlideIn {
            from { transform: translateX(110%); opacity: 0; }
            to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes vvSlideOut {
            from { transform: translateX(0);   opacity: 1; }
            to   { transform: translateX(110%); opacity: 0; }
        }
        .vv-notif {
            pointer-events: auto;
            animation: vvSlideIn 0.35s cubic-bezier(.25,.8,.25,1) both;
            border-radius: 14px;
            padding: 14px 16px;
            font-family: 'Manrope', sans-serif;
            font-size: 13px;
            line-height: 1.55;
            box-shadow: 0 8px 32px rgba(0,0,0,0.45);
            position: relative;
        }
        .vv-notif-success {
            background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,180,100,0.12));
            border: 1px solid rgba(16,185,129,0.35);
            color: #d4fae8;
        }
        .vv-notif-info {
            background: rgba(18,33,49,0.95);
            border: 1px solid rgba(208,188,255,0.2);
            color: #cbc3d7;
        }
        .vv-notif-warning {
            background: rgba(245,158,11,0.12);
            border: 1px solid rgba(245,158,11,0.25);
            color: #fde68a;
        }
        .vv-notif-close {
            position: absolute; top: 8px; right: 10px;
            background: none; border: none; cursor: pointer;
            color: inherit; opacity: 0.5; font-size: 16px;
            padding: 0 4px; line-height: 1;
        }
        .vv-notif-close:hover { opacity: 1; }
        .vv-pay-spinner {
            display: inline-block;
            width: 12px; height: 12px;
            border: 2px solid rgba(208,188,255,0.3);
            border-top-color: #d0bcff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
            margin-right: 6px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(s);
    }

    notify(html, type = 'info', duration = 8000) {
        if (!this._containerEl) this._buildContainer();

        const el = document.createElement('div');
        el.className = `vv-notif vv-notif-${type}`;
        el.innerHTML = `
            <button class="vv-notif-close" onclick="this.closest('.vv-notif').remove()">✕</button>
            ${html}
        `;
        this._containerEl.appendChild(el);

        if (duration > 0) {
            setTimeout(() => {
                el.style.animation = 'vvSlideOut 0.3s ease both';
                setTimeout(() => el.remove(), 300);
            }, duration);
        }
        return el;
    }

    // ── Track payment ─────────────────────────────────────────
    trackPayment(paymentData) {
        const pid  = paymentData.payment_id;
        const txn  = paymentData.transaction_id;
        const pkg  = paymentData.package_info || {};
        const user = paymentData.user_info    || {};

        console.log(`[PayTracker] Tracking payment ${pid} (${txn})`);

        const tracking = {
            pid, txn, startTime: Date.now(),
            checkCount: 0, pkg, user,
            intervalId: null, spinnerNotif: null
        };
        this.activePayments.set(pid, tracking);

        // Persist cho page refresh
        localStorage.setItem('vv_pending_payment', JSON.stringify({
            pid, txn, startTime: tracking.startTime, pkg
        }));

        // Hiển thị spinner
        tracking.spinnerNotif = this.notify(
            `<span class="vv-pay-spinner"></span>
             <strong>Đang chờ xác nhận thanh toán...</strong><br>
             📦 ${pkg.name || 'Gói dịch vụ'} · ${this._price(pkg.price)}<br>
             <small style="opacity:.6">Hệ thống sẽ tự động duyệt khi nhận được tiền</small>`,
            'info', 0
        );

        // Poll ngay và định kỳ
        this._poll(pid);
        tracking.intervalId = setInterval(() => this._poll(pid), this.POLL_INTERVAL);
    }

    async _poll(pid) {
        const t = this.activePayments.get(pid);
        if (!t) return;
        t.checkCount++;

        // Hết thời gian tối đa
        if (Date.now() - t.startTime > this.MAX_DURATION) {
            this._stopTracking(pid, 'timeout');
            return;
        }

        try {
            const res  = await fetch(`/api/payment/status/${pid}`);

            // 404 hoặc lỗi → payment không tồn tại / không thuộc user → dừng luôn
            if (res.status === 404) {
                console.log(`[PayTracker] Payment ${pid} not found (404) — stopping tracker`);
                this._stopTracking(pid, 'not_found');
                return;
            }

            const data = await res.json();

            // Không thành công hoặc payment đã failed → dừng
            if (!data.success) {
                console.log(`[PayTracker] Payment ${pid} returned error — stopping`);
                this._stopTracking(pid, 'error');
                return;
            }

            const status = data.payment?.status;

            if (status === 'completed') {
                this._onSuccess(pid, data);
            } else if (status === 'failed' || status === 'cancelled') {
                // Payment bị huỷ/thất bại → dừng và xóa notification
                console.log(`[PayTracker] Payment ${pid} is ${status} — stopping`);
                this._stopTracking(pid, 'failed');
            } else {
                console.log(`[PayTracker] ${pid} still ${status || 'pending'} (check #${t.checkCount})`);
            }
        } catch (err) {
            console.warn(`[PayTracker] Poll error for ${pid}:`, err);
        }
    }

    _onSuccess(pid, data) {
        const t = this.activePayments.get(pid);
        if (!t) return;

        console.log(`[PayTracker] 🎉 Payment ${pid} SUCCESS`);

        // Xoá spinner cũ
        if (t.spinnerNotif) t.spinnerNotif.remove();

        const pkg    = t.pkg || {};
        const chars  = data.user_characters?.characters_remaining;
        const expiry = data.user_characters?.subscription_expires_at;

        const expiryStr = expiry
            ? new Date(expiry).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
            : '';

        // Thông báo thành công lớn
        this.notify(`
            <div style="font-size:22px;margin-bottom:4px">🎉</div>
            <strong style="font-size:14px;color:#6ee7b7">Đăng ký gói thành công!</strong><br>
            📦 Gói: <strong>${pkg.name || 'Dịch vụ'}</strong><br>
            💰 Số tiền: <strong>${this._price(pkg.price)}</strong><br>
            📝 Ký tự được cộng: <strong>+${this._num(pkg.characters)}</strong>
            ${chars != null ? `<br>💎 Tổng ký tự còn lại: <strong>${this._num(chars)}</strong>` : ''}
            ${expiryStr ? `<br>📅 Hết hạn: <strong>${expiryStr}</strong>` : ''}
        `, 'success', 20000);

        this._stopTracking(pid, 'success');

        // Cập nhật UI ngay lập tức
        this._refreshCharDisplay(data.user_characters);

        // Dispatch event cho các trang khác lắng nghe
        window.dispatchEvent(new CustomEvent('vv:paymentSuccess', {
            detail: { pid, pkg, userCharacters: data.user_characters }
        }));
    }

    _stopTracking(pid, reason) {
        const t = this.activePayments.get(pid);
        if (!t) return;

        if (t.intervalId)     clearInterval(t.intervalId);
        if (t.spinnerNotif)   t.spinnerNotif.remove();

        this.activePayments.delete(pid);
        localStorage.removeItem('vv_pending_payment');

        if (reason === 'timeout') {
            this.notify(
                `⏳ <strong>Hết thời gian chờ xác nhận.</strong><br>
                 Nếu bạn đã chuyển tiền, vui lòng <a href="/contact" style="color:#d0bcff">liên hệ hỗ trợ</a>.`,
                'warning', 0
            );
        }
        // Các trường hợp còn lại (not_found, error, failed) → tự dừng yên lặng
    }

    // ── Restore sau khi refresh trang ────────────────────────
    _restorePending() {
        try {
            const raw = localStorage.getItem('vv_pending_payment');
            if (!raw) return;
            const stored = JSON.parse(raw);
            if (Date.now() - stored.startTime > this.MAX_DURATION) {
                localStorage.removeItem('vv_pending_payment');
                return;
            }
            console.log('[PayTracker] Restoring pending payment:', stored);
            const fakeData = {
                payment_id: stored.pid,
                transaction_id: stored.txn,
                package_info: stored.pkg,
                user_info: {}
            };
            this.trackPayment(fakeData);
        } catch (e) {
            localStorage.removeItem('vv_pending_payment');
        }
    }

    // ── Cập nhật hiển thị ký tự ──────────────────────────────
    async _refreshCharDisplay(userChars) {
        try {
            // Gọi lại API để lấy số ký tự mới nhất
            const res  = await fetch('/api/user/characters');
            const data = await res.json();
            if (!data.success) return;

            const n = data.characters_remaining;
            const fmt = n >= 1e6 ? (n/1e6).toFixed(1)+'M'
                      : n >= 1e3 ? (n/1e3).toFixed(1)+'K'
                      : String(n);

            // Cập nhật navbar badge
            const navEl = document.getElementById('charsNavCount');
            if (navEl) navEl.textContent = fmt + ' ký tự';

            // Cập nhật bất kỳ element nào có data-characters-display
            document.querySelectorAll('[data-characters-display]').forEach(el => {
                el.textContent = this._num(n);
            });

            // Nếu trang pricing đang mở, reload subscription status
            if (typeof loadSubscriptionStatus === 'function') {
                await loadSubscriptionStatus();
            }
        } catch (e) {
            console.warn('[PayTracker] _refreshCharDisplay error:', e);
        }
    }

    // ── Utils ────────────────────────────────────────────────
    _num(n) {
        return new Intl.NumberFormat('vi-VN').format(n || 0);
    }
    _price(p) {
        if (!p) return '';
        return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(p);
    }
}

// ── Global singleton ─────────────────────────────────────────
window.paymentTracker = new PaymentTracker();

// Expose helpers
window.trackPayment  = (d) => window.paymentTracker.trackPayment(d);
window.verifyPayment = async (txn) => {
    try {
        window.paymentTracker.notify('<span class="vv-pay-spinner"></span> Đang xác minh...', 'info', 3000);
        const res  = await fetch(`/api/payment/verify/${txn}`);
        const data = await res.json();
        if (data.verified || data.already_verified) {
            window.paymentTracker.notify(
                `✅ <strong>Thanh toán đã xác nhận!</strong><br>${data.message || ''}`,
                'success', 12000
            );
            window.paymentTracker._refreshCharDisplay(null);
        } else {
            window.paymentTracker.notify(data.message || 'Chưa xác minh được', 'warning', 8000);
        }
    } catch (e) {
        window.paymentTracker.notify('Lỗi kết nối khi xác minh', 'warning', 5000);
    }
};

console.log('[payment.js] PaymentTracker v2 ready');
