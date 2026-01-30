"""
Script để tạo/cập nhật tài khoản admin trong database
Chạy script này để tạo hoặc cập nhật password cho admin
"""
import pymysql
from werkzeug.security import generate_password_hash

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # XAMPP mặc định không có password
    'database': 'tts_system',
    'charset': 'utf8mb4'
}

def create_or_update_admin():
    """Tạo hoặc cập nhật tài khoản admin"""
    password = input("Nhập mật khẩu cho admin (mặc định: admin123): ").strip()
    if not password:
        password = 'admin123'
    
    hashed_password = generate_password_hash(password)
    
    try:
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset']
        )
        
        with conn.cursor() as cursor:
            # Kiểm tra xem admin đã tồn tại chưa
            cursor.execute("SELECT id FROM users WHERE username = 'admin'")
            admin_exists = cursor.fetchone()
            
            if admin_exists:
                # Cập nhật password cho admin hiện có
                cursor.execute(
                    "UPDATE users SET password = %s WHERE username = 'admin'",
                    (hashed_password,)
                )
                print("[OK] Da cap nhat mat khau cho tai khoan admin")
            else:
                # Tạo tài khoản admin mới
                cursor.execute(
                    """INSERT INTO users (username, email, password, full_name, role) 
                       VALUES (%s, %s, %s, %s, %s)""",
                    ('admin', 'admin@tts.com', hashed_password, 'Administrator', 'admin')
                )
                print("[OK] Da tao tai khoan admin moi")
            
            conn.commit()
            print(f"\n[INFO] Thong tin dang nhap:")
            print(f"   Username: admin")
            print(f"   Password: {password}")
            print(f"\n[NOTE] Luu y: Hay ghi nho mat khau nay!")
            
    except Exception as e:
        print(f"[ERROR] Loi: {e}")
        print("\n[CHECK] Kiem tra:")
        print("   1. XAMPP MySQL đã chạy chưa?")
        print("   2. Database 'tts_system' đã được tạo chưa?")
        print("   3. Đã import file tts_database.sql chưa?")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    print("=" * 60)
    print("[ADMIN] Tao/Cap nhat tai khoan Admin")
    print("=" * 60)
    print()
    create_or_update_admin()
