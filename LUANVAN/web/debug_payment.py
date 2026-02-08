#!/usr/bin/env python3
"""
Debug Payment System - Kiểm tra và sửa lỗi thanh toán
"""

import pymysql
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.config import DB_CONFIG, SEPAY_TOKEN, SEPAY_API_URL, SEPAY_ACCOUNT_NUMBER
import requests

def get_db_connection():
    """Kết nối database"""
    try:
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset'],
            cursorclass=pymysql.cursors.DictCursor
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def check_database():
    """Kiểm tra cấu trúc database"""
    print("🔍 Checking database structure...")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cursor:
            # Kiểm tra các bảng cần thiết
            tables = ['users', 'subscription_packages', 'user_subscriptions', 'payments']
            for table in tables:
                cursor.execute(f"SHOW TABLES LIKE '{table}'")
                if not cursor.fetchone():
                    print(f"❌ Table '{table}' not found!")
                    return False
                else:
                    print(f"✅ Table '{table}' exists")
            
            # Kiểm tra cấu trúc user_subscriptions
            cursor.execute("DESCRIBE user_subscriptions")
            columns = [row['Field'] for row in cursor.fetchall()]
            required_cols = ['user_id', 'characters_limit', 'characters_used', 'start_date', 'end_date', 'is_active']
            
            for col in required_cols:
                if col not in columns:
                    print(f"❌ Column '{col}' missing in user_subscriptions")
                    return False
                else:
                    print(f"✅ Column '{col}' exists in user_subscriptions")
            
            return True
            
    except Exception as e:
        print(f"❌ Database check error: {e}")
        return False
    finally:
        conn.close()

def check_sepay_connection():
    """Kiểm tra kết nối SePay"""
    print("\n🔍 Checking SePay connection...")
    
    try:
        # Test ping SePay API
        response = requests.get(SEPAY_API_URL, timeout=10)
        print(f"✅ SePay API responding (Status: {response.status_code})")
        
        print(f"📋 SePay Config:")
        print(f"   - API URL: {SEPAY_API_URL}")
        print(f"   - Account: {SEPAY_ACCOUNT_NUMBER}")
        print(f"   - Token: {SEPAY_TOKEN[:10]}...{SEPAY_TOKEN[-5:] if len(SEPAY_TOKEN) > 15 else 'TOO_SHORT'}")
        
        return True
    except Exception as e:
        print(f"❌ SePay connection failed: {e}")
        return False

def list_pending_payments():
    """Liệt kê các thanh toán đang chờ"""
    print("\n🔍 Checking pending payments...")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id, p.user_id, u.username, sp.package_name, p.amount_vnd, 
                       p.payment_method, p.payment_status, p.transaction_id, p.created_at,
                       p.description
                FROM payments p
                LEFT JOIN users u ON p.user_id = u.id  
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.payment_status = 'pending'
                ORDER BY p.created_at DESC
            """)
            payments = cursor.fetchall()
            
            if not payments:
                print("✅ No pending payments found")
                return
            
            print(f"📋 Found {len(payments)} pending payments:")
            for p in payments:
                print(f"   ID:{p['id']} | User:{p['username']} | Package:{p['package_name']} | Amount:{p['amount_vnd']:,}đ | Transaction:{p['transaction_id']}")
                print(f"      Status:{p['payment_status']} | Method:{p['payment_method']} | Created:{p['created_at']}")
                if p['description']:
                    print(f"      Description: {p['description']}")
                print()
            
    except Exception as e:
        print(f"❌ Error checking payments: {e}")
    finally:
        conn.close()

def check_user_subscriptions():
    """Kiểm tra subscription của users"""
    print("\n🔍 Checking user subscriptions...")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT us.user_id, u.username, us.characters_limit, us.characters_used,
                       us.start_date, us.end_date, us.is_active, sp.package_name
                FROM user_subscriptions us
                LEFT JOIN users u ON us.user_id = u.id
                LEFT JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.is_active = 1
                ORDER BY us.created_at DESC
            """)
            subscriptions = cursor.fetchall()
            
            if not subscriptions:
                print("❌ No active subscriptions found")
                return
            
            print(f"📋 Found {len(subscriptions)} active subscriptions:")
            for sub in subscriptions:
                remaining = sub['characters_limit'] - sub['characters_used']
                days_left = (sub['end_date'] - datetime.now().date()).days
                
                print(f"   User:{sub['username']} | Package:{sub['package_name'] or 'Custom'}")
                print(f"      Characters: {remaining:,}/{sub['characters_limit']:,} remaining | Days left: {days_left}")
                print(f"      Period: {sub['start_date']} to {sub['end_date']}")
                print()
                
    except Exception as e:
        print(f"❌ Error checking subscriptions: {e}")
    finally:
        conn.close()

def approve_payment(payment_id):
    """Admin approve payment manually"""
    print(f"\n🔧 Approving payment ID: {payment_id}")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            # Get payment info
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days, u.username
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = %s
            """, (payment_id,))
            payment = cursor.fetchone()
            
            if not payment:
                print(f"❌ Payment ID {payment_id} not found")
                return
                
            if payment['payment_status'] == 'completed':
                print(f"❌ Payment already completed")
                return
            
            # Approve payment
            cursor.execute("""
                UPDATE payments
                SET payment_status = 'completed',
                    description = CONCAT(IFNULL(description, ''), ' - Manual admin approval'),
                    completed_at = NOW()
                WHERE id = %s
            """, (payment_id,))
            
            # Update user subscription
            user_id = payment['user_id']
            characters_limit = payment['characters_limit']
            duration_days = payment['duration_days']
            
            # Check existing subscription
            cursor.execute("""
                SELECT * FROM user_subscriptions 
                WHERE user_id = %s AND is_active = 1
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            current_sub = cursor.fetchone()
            
            if current_sub:
                # Extend existing subscription
                new_end_date = datetime.now() + timedelta(days=duration_days)
                new_characters_used = max(0, current_sub['characters_used'] - characters_limit)
                
                cursor.execute("""
                    UPDATE user_subscriptions
                    SET characters_used = %s,
                        characters_limit = characters_limit + %s,
                        end_date = %s
                    WHERE id = %s
                """, (new_characters_used, characters_limit, new_end_date, current_sub['id']))
                
                print(f"✅ Extended subscription for {payment['username']}")
            else:
                # Create new subscription
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=duration_days)
                cursor.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, package_id, characters_limit, characters_used, start_date, end_date, is_active)
                    VALUES (%s, %s, %s, 0, %s, %s, 1)
                """, (user_id, payment['package_id'], characters_limit, start_date, end_date))
                
                print(f"✅ Created new subscription for {payment['username']}")
            
            conn.commit()
            print(f"✅ Payment {payment_id} approved successfully!")
            print(f"   User: {payment['username']}")
            print(f"   Package: {payment['package_name'] if payment.get('package_name') else 'Custom'}")
            print(f"   Amount: {payment['amount_vnd']:,}đ")
            print(f"   Characters: +{characters_limit:,}")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error approving payment: {e}")
    finally:
        conn.close()

def main():
    """Main function"""
    print("🚀 TTS Payment Debug Tool")
    print("=" * 50)
    
    # Check database
    if not check_database():
        print("\n❌ Database check failed! Please fix database issues first.")
        return
    
    # Check SePay connection
    check_sepay_connection()
    
    # List pending payments
    list_pending_payments()
    
    # Check user subscriptions 
    check_user_subscriptions()
    
    # Interactive menu
    while True:
        print("\n" + "=" * 50)
        print("🔧 Actions:")
        print("1. Approve pending payment")
        print("2. Refresh status")
        print("3. Exit")
        
        choice = input("Select action (1-3): ").strip()
        
        if choice == '1':
            payment_id = input("Enter payment ID to approve: ").strip()
            if payment_id.isdigit():
                approve_payment(int(payment_id))
            else:
                print("❌ Invalid payment ID")
        elif choice == '2':
            list_pending_payments()
            check_user_subscriptions()
        elif choice == '3':
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()