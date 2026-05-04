/**
 * Pricing Page JavaScript
 */

let selectedPackageId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptionStatus();
    loadPackages();
    
    // QR Modal close
    const qrModal = document.getElementById('qrPaymentModal');
    const closeQrBtn = document.querySelector('.close-qr');
    
    if (closeQrBtn) {
        closeQrBtn.addEventListener('click', () => {
            qrModal.classList.remove('is-active');
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === qrModal || e.target.classList.contains('modal-overlay')) {
            qrModal.classList.remove('is-active');
        }
    });
    
    // "Kiểm tra ngay" button — manually trigger SePay verify
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyBankTransfer);
    }

    // Lắng nghe sự kiện thanh toán thành công từ PaymentTracker
    window.addEventListener('vv:paymentSuccess', (e) => {
        const { pkg, userCharacters } = e.detail || {};
        // Hiển thị trạng thái success trong modal
        const waiting = document.getElementById('verifyWaiting');
        const success = document.getElementById('verifySuccess');
        const msg     = document.getElementById('verifySuccessMsg');

        if (waiting) waiting.style.display = 'none';
        if (success) success.style.display = 'flex';
        if (msg) {
            const chars = userCharacters?.characters_remaining;
            msg.textContent = `+${formatNumber(pkg?.characters || 0)} ký tự đã được cộng vào tài khoản.`
                + (chars != null ? ` Còn lại: ${formatNumber(chars)} ký tự.` : '');
        }

        // Reload subscription numbers
        loadSubscriptionStatus();
    });
});

async function loadSubscriptionStatus() {
    try {
        const response = await fetch('/api/subscription/status');
        const data = await response.json();
        
        if (data.success) {
            const sub = data.subscription;
            document.getElementById('charactersUsed').textContent = formatNumber(sub.used);
            document.getElementById('charactersRemaining').textContent = formatNumber(sub.remaining);
            document.getElementById('charactersLimit').textContent = formatNumber(sub.limit);
            
            // Update progress bar
            const usagePercent = sub.limit > 0 ? Math.round((sub.used / sub.limit) * 100) : 0;
            const progressFill = document.getElementById('usageProgress');
            const usagePercentText = document.getElementById('usagePercent');
            
            if (progressFill) {
                progressFill.style.width = usagePercent + '%';
            }
            if (usagePercentText) {
                usagePercentText.textContent = usagePercent + '%';
            }
            
            if (sub.end_date) {
                const endDate = new Date(sub.end_date);
                document.getElementById('endDate').textContent = endDate.toLocaleDateString('vi-VN');
            } else {
                document.getElementById('endDate').textContent = '-';
            }
        }
    } catch (error) {
        console.error('Error loading subscription status:', error);
    }
}

async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        const data = await response.json();

        const grid = document.getElementById('pricingGrid');

        if (data.success && data.packages) {
            const featuredIndex = Math.min(2, data.packages.length - 1);

            grid.innerHTML = data.packages.map((pkg, index) => {
                const isFree    = pkg.price === 0;
                const isFeatured = index === featuredIndex && !isFree;

                // Feature list items
                const features = [
                    `${formatNumber(pkg.characters)} ký tự`,
                    'Tất cả giọng đọc tiếng Việt',
                    'Emotional TTS (cảm xúc)',
                    'Thư viện âm thanh',
                    ...(!isFree   ? ['Clone giọng cá nhân'] : []),
                    ...(isFeatured ? ['Ưu tiên xử lý']       : []),
                ];

                const featureRows = features.map(f => `
                    <li class="flex items-start gap-2">
                        <span class="material-symbols-outlined text-tertiary shrink-0" style="font-size:16px;margin-top:2px;font-variation-settings:'FILL' 1">check_circle</span>
                        <span class="text-sm text-on-surface-variant">${f}</span>
                    </li>`).join('');

                const featuredBadge = isFeatured ? `
                    <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-tertiary to-primary text-surface-container-lowest text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                        Phổ biến nhất
                    </div>` : '';

                const priceHtml = isFree
                    ? `<div class="text-2xl font-bold text-primary mt-1">0đ<span class="text-sm text-on-surface-variant font-normal">/mãi mãi</span></div>`
                    : `<div class="text-2xl font-bold ${isFeatured ? 'text-tertiary' : 'text-primary'} mt-1">${formatCurrency(pkg.price)}<span class="text-sm text-on-surface-variant font-normal">/${pkg.duration_days} ngày</span></div>`;

                let btnHtml;
                if (isFree) {
                    btnHtml = `<button class="w-full py-2.5 px-4 rounded-lg border border-primary text-primary text-sm font-semibold text-center hover:bg-primary/10 transition-colors mt-auto" disabled>✓ Bắt đầu miễn phí</button>`;
                } else if (isFeatured) {
                    btnHtml = `<button onclick="selectPackage(${pkg.id}, false)" class="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-primary to-inverse-primary text-white text-sm font-semibold text-center hover:shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all mt-auto">Đăng ký ngay</button>`;
                } else {
                    btnHtml = `<button onclick="selectPackage(${pkg.id}, false)" class="w-full py-2.5 px-4 rounded-lg border border-primary text-primary text-sm font-semibold text-center hover:bg-primary/10 transition-colors mt-auto">Đăng ký ${pkg.name}</button>`;
                }

                return `
<div class="pricing-card-modern glass-card ${isFeatured ? 'glass-card-active' : ''} rounded-xl p-6 flex flex-col ${isFeatured ? 'relative' : 'transition-transform hover:-translate-y-1.5'}" style="animation-delay:${index * 0.06}s">
    ${featuredBadge}
    <div class="mb-5 ${isFeatured ? 'mt-3' : ''}">
        <h3 class="text-lg font-bold text-on-surface">${pkg.name}</h3>
        ${priceHtml}
    </div>
    <ul class="space-y-3 mb-6 flex-1">
        ${featureRows}
    </ul>
    ${btnHtml}
</div>`;
            }).join('');
        } else {
            grid.innerHTML = `<div style="grid-column:1/-1" class="flex flex-col items-center py-14 gap-2 text-on-surface-variant">
                <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">error_outline</span>
                <p class="text-sm">Không thể tải gói dịch vụ. Vui lòng thử lại.</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading packages:', error);
        const grid = document.getElementById('pricingGrid');
        grid.innerHTML = `<div style="grid-column:1/-1" class="flex flex-col items-center py-14 gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">wifi_off</span>
            <p class="text-sm">Lỗi kết nối. Vui lòng tải lại trang.</p>
        </div>`;
    }
}

function selectPackage(packageId, isFree) {
    if (isFree) return;
    selectedPackageId = packageId;
    initiatePaymentAndRedirect(packageId);
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatCurrency(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

let currentPaymentId = null;

// Tạo payment rồi redirect sang trang xác nhận
async function initiatePaymentAndRedirect(packageId) {
    // Hiển thị loading trên nút bấm
    const btn = document.querySelector(`[onclick="selectPackage(${packageId}, false)"]`);
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(208,188,255,0.3);border-top-color:#d0bcff;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px"></span>Đang xử lý...`;
    }

    try {
        const response = await fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_id: packageId, payment_method: 'bank_qr' })
        });
        const data = await response.json();

        if (data.success && data.payment_id) {
            // Xóa pending payment cũ trước khi redirect
            localStorage.removeItem('vv_pending_payment');
            // Redirect sang trang xác nhận thanh toán
            window.location.href = `/payment/confirm?id=${data.payment_id}`;
        } else {
            alert(`Lỗi: ${data.message || 'Không thể tạo thanh toán. Vui lòng thử lại.'}`);
            if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        }
    } catch (error) {
        console.error('[Payment] Error creating payment:', error);
        alert('Lỗi kết nối. Vui lòng thử lại.');
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

// Giữ lại hàm cũ phòng trường hợp các nơi khác gọi
async function showQRPayment(packageId) {
    initiatePaymentAndRedirect(packageId);
}

async function verifyBankTransfer() {
    const verifyBtn = document.getElementById('verifyBtn');
    const transactionId = verifyBtn?.dataset.transactionId;

    if (!transactionId) {
        console.warn('No transactionId set on verifyBtn');
        return;
    }

    // Disable button during check
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = `
        <span style="display:inline-block;width:13px;height:13px;border:2px solid rgba(208,188,255,0.3);border-top-color:#d0bcff;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:5px"></span>
        Đang kiểm tra...`;

    try {
        if (window.paymentTracker) {
            if (currentPaymentId) {
                // Trigger immediate poll on the active payment
                await window.paymentTracker._poll(currentPaymentId);
            } else {
                await window.paymentTracker.verifyPayment(transactionId);
            }
        }
    } finally {
        setTimeout(() => {
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size:15px">refresh</span>
                    Kiểm tra ngay`;
            }
        }, 3000);
    }
}
