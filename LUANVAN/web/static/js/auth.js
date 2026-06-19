/**
 * Authentication JavaScript
 * Xử lý đăng nhập và đăng ký
 */

function _m(text) {
    return (window.__msg ? window.__msg(text) : text);
}

// Login form handler
const REMEMBER_KEY = 'vv_remember_username';

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    const usernameInput = document.getElementById('username');
    const rememberCheckbox = document.getElementById('rememberMe');
    const savedUsername = localStorage.getItem(REMEMBER_KEY);
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem(REMEMBER_KEY, username);
                } else {
                    localStorage.removeItem(REMEMBER_KEY);
                }
                window.location.href = '/';
            } else {
                const errMsg = _m(data.message) || __('err.login_failed');
                const messageEl = document.getElementById('message');
                if (messageEl) {
                    messageEl.textContent = errMsg;
                    messageEl.className = 'auth-v2-msg error';
                } else {
                    utils.showMessage(errMsg, 'error');
                }
            }
        } catch (error) {
            utils.showMessage(__('err.connection') + ': ' + error.message, 'error');
        }
    });
}

// Register form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const full_name = document.getElementById('full_name').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm_password').value;
        
        if (password !== confirm_password) {
            utils.showMessage(__('err.password_mismatch'), 'error');
            return;
        }
        
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ full_name, username, email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                utils.showMessage(_m(data.message) || __('err.register_success'), 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                utils.showMessage(_m(data.message) || __('err.register_failed'), 'error');
            }
        } catch (error) {
            utils.showMessage(__('err.connection') + ': ' + error.message, 'error');
        }
    });
}

// Forgot password form handler
let forgotPollTimer = null;

function startForgotPasswordWait(waitId) {
    const waitPanel = document.getElementById('forgotWaitPanel');
    const mainSection = document.getElementById('forgotMainSection');
    if (mainSection) mainSection.style.display = 'none';
    if (waitPanel) waitPanel.classList.add('show');

    if (forgotPollTimer) clearInterval(forgotPollTimer);
    forgotPollTimer = setInterval(async () => {
        try {
            const res = await fetch(`/api/forgot-password/status/${waitId}`);
            const data = await res.json();
            if (data.status === 'confirmed' && data.redirect) {
                clearInterval(forgotPollTimer);
                window.location.href = data.redirect;
            } else if (data.status === 'expired' || !res.ok) {
                clearInterval(forgotPollTimer);
                const messageEl = document.getElementById('message');
                const form = document.getElementById('forgotPasswordForm');
                const mainSection = document.getElementById('forgotMainSection');
                if (waitPanel) waitPanel.classList.remove('show');
                if (mainSection) mainSection.style.display = '';
                if (form) form.style.display = '';
                if (messageEl) {
                    messageEl.textContent = data.message || 'Phiên đã hết hạn. Vui lòng thử lại.';
                    messageEl.className = 'auth-v2-msg error';
                }
                const submitBtn = document.getElementById('forgotSubmitBtn');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '';
                }
            }
        } catch (e) {
            /* giữ poll, mạng có thể tạm gián đoạn */
        }
    }, 2000);
}

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const submitBtn = document.getElementById('forgotSubmitBtn');
        const messageEl = document.getElementById('message');
        const successPanel = document.getElementById('forgotSuccessPanel');
        const successText = document.getElementById('forgotSuccessText');

        if (messageEl) {
            messageEl.className = 'auth-v2-msg';
            messageEl.textContent = '';
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
        }

        try {
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            const msg = _m(data.message) || (data.success ? __('auth.forgot.sent') : __('common.error'));

            if (data.success) {
                if (data.wait_id) {
                    startForgotPasswordWait(data.wait_id);
                } else {
                    const mainSection = document.getElementById('forgotMainSection');
                    if (mainSection) mainSection.style.display = 'none';
                    if (successPanel) {
                        successPanel.classList.add('show');
                        if (successText) successText.textContent = msg;
                    } else if (messageEl) {
                        messageEl.textContent = msg;
                        messageEl.className = 'auth-v2-msg success';
                    }
                }
            } else {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '';
                }
                if (messageEl) {
                    messageEl.textContent = msg;
                    messageEl.className = 'auth-v2-msg error';
                } else {
                    utils.showMessage(msg, 'error');
                }
            }
        } catch (error) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '';
            }
            const errMsg = __('err.connection') + ': ' + error.message;
            if (messageEl) {
                messageEl.textContent = errMsg;
                messageEl.className = 'auth-v2-msg error';
            } else {
                utils.showMessage(errMsg, 'error');
            }
        }
    });
}

// Reset password form handler
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = resetPasswordForm.dataset.token;
        const new_password = document.getElementById('new_password').value;
        const confirm_password = document.getElementById('confirm_password').value;

        if (new_password !== confirm_password) {
            utils.showMessage(__('err.password_mismatch'), 'error');
            return;
        }

        try {
            const response = await fetch(`/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password, confirm_password })
            });
            const data = await response.json();

            if (data.success) {
                utils.showMessage(_m(data.message) || __('auth.reset.success'), 'success');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
            } else {
                utils.showMessage(_m(data.message) || __('common.error'), 'error');
            }
        } catch (error) {
            utils.showMessage(__('err.connection') + ': ' + error.message, 'error');
        }
    });
}
