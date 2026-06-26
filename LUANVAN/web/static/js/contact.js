/**
 * Contact Page JavaScript
 * Xử lý form liên hệ + custom subject dropdown (mobile-friendly)
 */

function closeContactSelectMenu() {
    const wrap = document.getElementById('contactSubjectWrap');
    if (!wrap) return;
    wrap.classList.remove('is-open');
    wrap.querySelector('.ct-select-menu')?.classList.add('hidden');
    wrap.querySelector('.ct-select-trigger')?.setAttribute('aria-expanded', 'false');
}

function syncContactSubjectSelect() {
    const select = document.getElementById('contactSubject');
    const wrap = document.getElementById('contactSubjectWrap');
    if (!select || !wrap) return;

    const trigger = wrap.querySelector('.ct-select-trigger');
    if (!trigger) return;

    const opt = select.options[select.selectedIndex];
    const label = opt ? opt.textContent.trim() : '';
    trigger.textContent = label;
    trigger.classList.toggle('is-placeholder', !select.value);

    wrap.querySelectorAll('.ct-select-menu__item').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.value === select.value);
    });
}

function refreshContactSubjectMenu() {
    const select = document.getElementById('contactSubject');
    const wrap = document.getElementById('contactSubjectWrap');
    if (!select || !wrap || !wrap.classList.contains('is-enhanced')) return;

    const menu = wrap.querySelector('.ct-select-menu');
    if (!menu) return;

    menu.innerHTML = '';
    Array.from(select.options).forEach((opt) => {
        if (!opt.value) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ct-select-menu__item';
        btn.dataset.value = opt.value;
        btn.textContent = opt.textContent.trim();
        btn.setAttribute('role', 'option');
        if (select.value === opt.value) btn.classList.add('is-selected');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncContactSubjectSelect();
            closeContactSelectMenu();
        });
        menu.appendChild(btn);
    });
    syncContactSubjectSelect();
}

function enhanceContactSubjectSelect() {
    const wrap = document.getElementById('contactSubjectWrap');
    const select = document.getElementById('contactSubject');
    if (!wrap || !select || wrap.classList.contains('is-enhanced')) return;

    wrap.classList.add('is-enhanced');

    const chevron = document.createElement('span');
    chevron.className = 'material-symbols-outlined ct-select-chevron';
    chevron.textContent = 'expand_more';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ct-select-trigger is-placeholder';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-labelledby', 'contactSubject');

    const menu = document.createElement('div');
    menu.className = 'ct-select-menu hidden';
    menu.setAttribute('role', 'listbox');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('is-open');
        closeContactSelectMenu();
        if (!isOpen) {
            wrap.classList.add('is-open');
            menu.classList.remove('hidden');
            trigger.setAttribute('aria-expanded', 'true');
        }
    });

    select.addEventListener('change', syncContactSubjectSelect);

    wrap.appendChild(chevron);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    refreshContactSubjectMenu();

    new MutationObserver(refreshContactSubjectMenu).observe(select, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.VVi18n && window.VVi18n.whenReady) {
        await window.VVi18n.whenReady;
    }
    enhanceContactSubjectSelect();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#contactSubjectWrap')) {
            closeContactSelectMenu();
        }
    });

    const form = document.getElementById('contactForm');
    const messageTextarea = document.getElementById('contactMessage');
    const charCount = document.getElementById('messageCharCount');
    const charBar = document.getElementById('messageCharBar');
    const submitBtn = document.getElementById('submitContactBtn');

    function updateCharUI(count) {
        if (charCount) {
            charCount.textContent = count;
            charCount.classList.remove('is-warn', 'is-over');
            if (count > 1000) charCount.classList.add('is-over');
            else if (count > 900) charCount.classList.add('is-warn');
        }
        if (charBar) {
            charBar.style.width = Math.min(100, (count / 1000) * 100) + '%';
        }
    }

    if (messageTextarea && charCount) {
        updateCharUI(messageTextarea.value.length);
        messageTextarea.addEventListener('input', () => {
            let count = messageTextarea.value.length;
            if (count > 1000) {
                messageTextarea.value = messageTextarea.value.substring(0, 1000);
                count = 1000;
            }
            updateCharUI(count);
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value.trim();

            if (!name || !email || !subject || !message) {
                showError('Vui lòng điền đầy đủ thông tin');
                return;
            }

            if (message.length > 1000) {
                showError('Nội dung tin nhắn quá dài (tối đa 1000 ký tự)');
                return;
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Đang gửi...</span>';

            hideAlerts();

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message }),
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess(data.message);
                    form.reset();
                    updateCharUI(0);
                    syncContactSubjectSelect();
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
    successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

function hideAlerts() {
    document.getElementById('contactSuccess').style.display = 'none';
    document.getElementById('contactError').style.display = 'none';
}
