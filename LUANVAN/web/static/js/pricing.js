/**
 * Pricing Page JavaScript
 */

let selectedPackageId = null;
let paymentHistoryPage = 1;
const PAYMENT_HISTORY_PER_PAGE = 8;

// i18n helper — falls back to hardcoded value if VVi18n not ready
function _t(key, fallback, vars) {
    let s = (window.VVi18n && window.VVi18n.t) ? window.VVi18n.t(key) : (fallback || key);
    if (vars && s) {
        Object.keys(vars).forEach((k) => {
            s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
        });
    }
    return s;
}

function initPricingPage() {
    if (!document.getElementById('pricingGrid')) return;
    initPricingTabs();
    bindPackageButtons();
    loadSubscriptionStatus();
    loadPackages();
    loadPaymentHistory();
}

function initPricingTabs() {
    const tabs = document.querySelectorAll('.pr-tab');
    const panelPlans = document.getElementById('prPanelPlans');
    const panelHistory = document.getElementById('prPanelHistory');
    if (!tabs.length || !panelPlans || !panelHistory) return;

    tabs.forEach(tab => {
        if (tab.dataset.bound) return;
        tab.dataset.bound = '1';
        tab.addEventListener('click', () => {
            const name = tab.dataset.prTab;
            tabs.forEach(t => {
                const active = t === tab;
                t.classList.toggle('active', active);
                t.setAttribute('aria-selected', String(active));
            });
            panelPlans.classList.toggle('hidden', name !== 'plans');
            panelHistory.classList.toggle('hidden', name !== 'history');
        });
    });
}

function bindPackageButtons() {
    const grid = document.getElementById('pricingGrid');
    if (!grid || grid.dataset.pkgBound) return;
    grid.dataset.pkgBound = '1';
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-package-id]');
        if (!btn || btn.disabled) return;
        selectPackage(parseInt(btn.dataset.packageId, 10), btn.dataset.free === '1');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPricingPage();

    // Tải lại gói khi quay lại tab / trang (sau khi sửa trong admin)
    window.addEventListener('pageshow', () => {
        if (document.getElementById('pricingGrid')) loadPackages();
    });

    // Re-render package cards whenever language is switched
    window.addEventListener('vv:langChanged', () => {
        loadPackages();
        if (document.getElementById('paymentHistoryBody')) {
            loadPaymentHistory(paymentHistoryPage);
        }
    });
    
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
            const added = `+${formatNumber(pkg?.characters || 0)} ${_t('pkg.chars', 'ký tự')}`;
            const vi_added = _t('pkg.payment.added', 'đã được cộng vào tài khoản.');
            const vi_remain = _t('pkg.payment.remaining', 'Còn lại:');
            msg.textContent = `${added} ${vi_added}`
                + (chars != null ? ` ${vi_remain} ${formatNumber(chars)} ${_t('pkg.chars', 'ký tự')}.` : '');
        }

        // Reload subscription numbers
        loadSubscriptionStatus();
        loadPaymentHistory(paymentHistoryPage);
    });

    if (window.VVPagination) {
        VVPagination.register('paymentHistory', (p) => loadPaymentHistory(p));
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
                progressFill.classList.toggle('is-active', usagePercent > 0);
                const bar = progressFill.closest('[role="progressbar"]');
                if (bar) bar.setAttribute('aria-valuenow', String(usagePercent));
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
    const grid = document.getElementById('pricingGrid');
    if (!grid) return;

  // Dữ liệu server render (luôn mới khi mở /pricing)
    const initialEl = document.getElementById('pricingPackagesJson');
    if (initialEl && initialEl.textContent.trim()) {
        try {
            const initial = JSON.parse(initialEl.textContent);
            if (Array.isArray(initial) && initial.length) {
                renderPackagesToGrid(initial, grid);
            }
        } catch (e) {
            console.warn('pricingPackagesJson parse error', e);
        }
    }

    try {
        const response = await fetch('/api/packages', { cache: 'no-store' });
        const data = await response.json();

        if (data.success && data.packages) {
            renderPackagesToGrid(data.packages, grid);
        } else if (!initialEl || !initialEl.textContent.trim()) {
            grid.classList.add('pr-plans-grid--empty');
            grid.innerHTML = `<div class="pr-loading">
                <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">error_outline</span>
                <span>${_t('pkg.error.load', 'Không thể tải gói dịch vụ. Vui lòng thử lại.')}</span>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading packages:', error);
        if (!initialEl || !initialEl.textContent.trim()) {
            grid.classList.add('pr-plans-grid--empty');
            grid.innerHTML = `<div class="pr-loading">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">wifi_off</span>
            <span>${_t('pkg.error.connection', 'Lỗi kết nối. Vui lòng tải lại trang.')}</span>
        </div>`;
        }
    }
}

function renderPackagesToGrid(packages, grid) {
    grid.classList.remove('pr-plans-grid--loading', 'pr-plans-grid--empty');

    if (!packages || !packages.length) {
        grid.classList.add('pr-plans-grid--empty');
        grid.innerHTML = `<div class="pr-loading">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:0.4">error_outline</span>
            <span>${_t('pkg.error.load', 'Không thể tải gói dịch vụ. Vui lòng thử lại.')}</span>
        </div>`;
        return;
    }

    const featuredIndex = Math.min(2, packages.length - 1);

    grid.innerHTML = packages.map((pkg, index) => {
        const priceNum = Number(pkg.price) || 0;
        const isFree = priceNum === 0;
        const isFeatured = index === featuredIndex && !isFree;

        const features = [
            `${formatNumber(pkg.characters)} ${_t('pkg.chars', 'ký tự')}`,
            _t('pkg.feature.voices', 'Tất cả giọng đọc tiếng Việt'),
            _t('pkg.feature.emo_tts', 'Emotional TTS'),
            _t('pkg.feature.library', 'Thư viện âm thanh'),
            ...(!isFree ? [_t('pkg.feature.clone', 'Clone giọng cá nhân')] : []),
            ...(isFeatured ? [_t('pkg.feature.priority', 'Ưu tiên xử lý')] : []),
        ];

        const featureRows = features.map(f => `
            <li>
                <span class="material-symbols-outlined">check_circle</span>
                <span>${f}</span>
            </li>`).join('');

        const featuredBadge = isFeatured
            ? `<div class="pr-plan-card__badge">${_t('pkg.badge.popular', 'Phổ biến nhất')}</div>`
            : '';

        const priceHtml = isFree
            ? `0đ <span>${_t('pkg.price.forever', '/mãi mãi')}</span>`
            : `${formatCurrency(priceNum)} <span>/${pkg.duration_days} ${_t('pkg.price.days', 'ngày')}</span>`;

        let btnHtml;
        if (isFree) {
            btnHtml = `<button type="button" class="pr-plan-card__btn pr-plan-card__btn--free" disabled data-package-id="${pkg.id}" data-free="1">${_t('pkg.btn.free', '✓ Bắt đầu miễn phí')}</button>`;
        } else if (isFeatured) {
            btnHtml = `<button type="button" class="pr-plan-card__btn pr-plan-card__btn--primary" data-package-id="${pkg.id}">${_t('pkg.btn.subscribe_now', 'Đăng ký ngay')}</button>`;
        } else {
            btnHtml = `<button type="button" class="pr-plan-card__btn pr-plan-card__btn--outline" data-package-id="${pkg.id}">${_t('pkg.btn.subscribe_to', 'Đăng ký')} ${pkg.name}</button>`;
        }

        return `
<article class="pr-plan-card pr-plan-card--enter${isFeatured ? ' pr-plan-card--featured' : ''}" style="--pr-i:${index}">
    ${featuredBadge}
    <div class="pr-plan-card__glow" aria-hidden="true"></div>
    <div class="pr-plan-card__head">
        <h3 class="pr-plan-card__name">${pkg.name}</h3>
        <div class="pr-plan-card__price">${priceHtml}</div>
    </div>
    <ul class="pr-plan-card__features">${featureRows}</ul>
    ${btnHtml}
</article>`;
    }).join('');
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
    const btn = document.querySelector(`[data-package-id="${packageId}"]:not([data-free="1"])`);
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="pr-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>${_t('pkg.btn.processing', 'Đang xử lý...')}`;
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

function paymentHistoryStatusBadge(status) {
    if (status === 'completed') {
        return `<span style="padding:2px 10px;border-radius:9999px;background:rgba(0,159,180,0.15);border:1px solid rgba(47,217,244,0.3);font-size:11px;font-weight:600;color:#2fd9f4">${_t('price.history.status.paid', 'ĐÃ TT')}</span>`;
    }
    if (status === 'pending') {
        return `<span style="padding:2px 10px;border-radius:9999px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);font-size:11px;font-weight:600;color:#f59e0b">${_t('price.history.status.pending', 'Đang chờ')}</span>`;
    }
    return status || '—';
}

function renderPaymentHistoryRow(p) {
    const date = p.completed_at || p.created_at || '—';
    const invoiceHtml = p.payment_status === 'completed'
        ? `<a href="/invoice/${p.id}" class="text-xs font-semibold text-primary hover:underline no-underline">${_t('price.history.invoice', 'Hóa đơn')}</a>`
        : '<span class="text-on-surface-variant">—</span>';
    return `
        <tr class="hover:bg-surface-container/40 transition-colors">
            <td class="px-4 py-3 font-mono text-xs text-on-surface-variant">${p.transaction_id || '—'}</td>
            <td class="px-4 py-3 hidden sm:table-cell text-on-surface">${p.package_name || '—'}</td>
            <td class="px-4 py-3 font-semibold text-tertiary">${formatCurrency(p.amount_vnd)}</td>
            <td class="px-4 py-3 hidden md:table-cell text-on-surface-variant text-xs">${date}</td>
            <td class="px-4 py-3">${paymentHistoryStatusBadge(p.payment_status)}</td>
            <td class="px-4 py-3 text-right">${invoiceHtml}</td>
        </tr>`;
}

async function loadPaymentHistory(page = 1) {
    const loading = document.getElementById('paymentHistoryLoading');
    const empty = document.getElementById('paymentHistoryEmpty');
    const table = document.getElementById('paymentHistoryTable');
    const body = document.getElementById('paymentHistoryBody');
    if (!body) return;

    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (table) table.style.display = 'none';

    try {
        const res = await fetch(`/api/user/payments?page=${page}&per_page=${PAYMENT_HISTORY_PER_PAGE}`);
        const data = await res.json();
        if (loading) loading.style.display = 'none';

        if (!data.success || !data.payments?.length) {
            if (empty) empty.style.display = 'block';
            return;
        }

        paymentHistoryPage = data.page;
        body.innerHTML = data.payments.map(renderPaymentHistoryRow).join('');
        if (table) table.style.display = 'block';

        const wrap = document.getElementById('paymentHistoryPaginationWrap');
        if (wrap && window.VVPagination) {
            wrap.style.display = data.total > PAYMENT_HISTORY_PER_PAGE ? 'flex' : 'none';
            VVPagination.render({
                id: 'paymentHistory',
                containerId: 'paymentHistoryPagination',
                infoId: 'paymentHistoryPaginationInfo',
                page: data.page,
                total: data.total,
                perPage: data.per_page,
                itemLabel: _t('price.history.item', 'giao dịch'),
            });
        }
    } catch (e) {
        if (loading) loading.style.display = 'none';
        console.error('loadPaymentHistory', e);
    }
}

