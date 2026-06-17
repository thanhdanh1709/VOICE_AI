/**
 * Authentication JavaScript
 * Xử lý đăng nhập và đăng ký
 */

function _m(text) {
    return (window.__msg ? window.__msg(text) : text);
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
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
                window.location.href = '/';
            } else {
                utils.showMessage(_m(data.message) || __('err.login_failed'), 'error');
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
