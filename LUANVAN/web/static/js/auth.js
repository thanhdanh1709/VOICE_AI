/**
 * Authentication JavaScript
 * Xử lý đăng nhập và đăng ký
 */

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
                utils.showMessage(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (error) {
            utils.showMessage('Lỗi kết nối: ' + error.message, 'error');
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
            utils.showMessage('Mật khẩu xác nhận không khớp', 'error');
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
                utils.showMessage(data.message || 'Đăng ký thành công. Vui lòng đăng nhập.', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                utils.showMessage(data.message || 'Đăng ký thất bại', 'error');
            }
        } catch (error) {
            utils.showMessage('Lỗi kết nối: ' + error.message, 'error');
        }
    });
}
