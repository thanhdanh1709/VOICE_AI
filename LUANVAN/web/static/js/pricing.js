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
            qrModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });
    
    // Verify button
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyBankTransfer);
    }
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
        
        if (data.success && data.packages) {
            const grid = document.getElementById('pricingGrid');
            grid.innerHTML = data.packages.map(pkg => {
                const isFree = pkg.price === 0;
                return `
                    <div class="pricing-card ${isFree ? 'free-card' : ''}">
                        <div class="pricing-header">
                            <h3>${pkg.name}</h3>
                            ${isFree ? '<span class="free-badge">MIỄN PHÍ</span>' : ''}
                        </div>
                        <div class="pricing-body">
                            <div class="pricing-characters">
                                <span class="characters-count">${formatNumber(pkg.characters)}</span>
                                <span class="characters-label">ký tự</span>
                            </div>
                            ${!isFree ? `
                                <div class="pricing-price">
                                    <span class="price-amount">${formatCurrency(pkg.price)}</span>
                                    <span class="price-period">/ ${pkg.duration_days} ngày</span>
                                </div>
                            ` : ''}
                            <button class="btn-purchase" onclick="selectPackage(${pkg.id}, ${isFree})" ${isFree ? 'disabled' : ''}>
                                ${isFree ? 'Đang sử dụng' : 'Mua ngay'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

function selectPackage(packageId, isFree) {
    if (isFree) return;
    
    selectedPackageId = packageId;
    // Hiển thị trực tiếp QR payment (không cần modal chọn phương thức nữa)
    showQRPayment(packageId);
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

async function showQRPayment(packageId) {
    // Hiển thị modal QR
    const qrModal = document.getElementById('qrPaymentModal');
    qrModal.style.display = 'block';
    
    // Reset UI
    document.getElementById('qrCodeImage').style.display = 'none';
    document.getElementById('qrLoading').style.display = 'block';
    document.getElementById('bankInfo').style.display = 'none';
    document.getElementById('verifySection').style.display = 'none';
    
    try {
        // Tạo payment với method bank_qr
        const response = await fetch('/api/payment/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                package_id: packageId,
                payment_method: 'bank_qr'
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.qr_code) {
            currentPaymentId = data.payment_id;
            
            // Bắt đầu tracking payment với PaymentTracker
            if (window.paymentTracker && data.package_info) {
                window.paymentTracker.trackPayment(data);
            }
            
            // Hiển thị QR code
            const qrImg = document.getElementById('qrCodeImage');
            qrImg.src = data.qr_code;
            qrImg.style.display = 'block';
            qrImg.style.width = 'auto';
            qrImg.style.height = 'auto';
            qrImg.style.maxWidth = '100%';
            qrImg.style.maxHeight = '400px';
            document.getElementById('qrLoading').style.display = 'none';
            document.getElementById('qrDebugInfo').style.display = 'block';
            
            // Hiển thị thông tin ngân hàng
            if (data.bank_info) {
                document.getElementById('bankName').textContent = data.bank_info.bank_name;
                document.getElementById('accountNumber').textContent = data.bank_info.account_number;
                document.getElementById('accountName').textContent = data.bank_info.account_name;
                document.getElementById('amount').textContent = formatCurrency(data.bank_info.amount);
                document.getElementById('content').textContent = data.bank_info.content;
                document.getElementById('bankInfo').style.display = 'block';
                document.getElementById('verifySection').style.display = 'block';
                
                // Store transaction ID for verify function
                document.getElementById('verifyBtn').dataset.transactionId = data.transaction_id;
            }
            
            // Hiển thị thông báo payment type
            if (data.payment_type === 'sepay') {
                console.log('[Payment] Using SePay integration');
            } else if (data.fallback) {
                console.log('[Payment] SePay fallback to bank transfer');
            }
        } else {
            alert(`Lỗi: ${data.message || 'Không thể tạo QR code'}`);
            qrModal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error creating QR payment:', error);
        alert(`Lỗi: ${error.message}`);
        qrModal.style.display = 'none';
    }
}

async function verifyBankTransfer() {
    const verifyBtn = document.getElementById('verifyBtn');
    const transactionId = verifyBtn.dataset.transactionId;
    
    if (!transactionId) {
        alert('Lỗi: Không tìm thấy mã giao dịch');
        return;
    }
    
    // Sử dụng PaymentTracker để verify
    if (window.paymentTracker) {
        await window.paymentTracker.verifyPayment(transactionId);
    } else {
        console.error('PaymentTracker not available');
        alert('Lỗi: Hệ thống xác minh không khả dụng');
    }
}
        
        if (data.success) {
            alert(data.message);
            document.getElementById('qrPaymentModal').style.display = 'none';
            // Reload subscription status
            loadSubscriptionStatus();

}
