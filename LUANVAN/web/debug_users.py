#!/usr/bin/env python3
"""
Debug User Session & Payments - Kiểm tra session user và payments
"""

import pymysql
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.config import DB_CONFIG

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

def check_all_users():
    """Kiểm tra tất cả users và subscriptions"""
    print("👥 CHECKING ALL USERS & SUBSCRIPTIONS")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            # Get all users
            cursor.execute("""
                SELECT u.id, u.username, u.email, u.full_name, u.role
                FROM users u
                ORDER BY u.id
            """)
            users = cursor.fetchall()
            
            print(f"📋 Found {len(users)} users:")
            for user in users:
                print(f"   ID:{user['id']} | {user['username']} | {user['email']} | Role:{user['role']}")
            
            print("\n" + "=" * 60)
            
            # Check subscriptions for each user
            for user in users:
                user_id = user['id']
                username = user['username']
                
                cursor.execute("""
                    SELECT us.*, sp.package_name
                    FROM user_subscriptions us
                    LEFT JOIN subscription_packages sp ON us.package_id = sp.id
                    WHERE us.user_id = %s AND us.is_active = 1
                    ORDER BY us.created_at DESC
                """, (user_id,))
                subscriptions = cursor.fetchall()
                
                print(f"\n👤 USER: {username} (ID: {user_id})")
                if subscriptions:
                    for sub in subscriptions:
                        remaining = sub['characters_limit'] - sub['characters_used']
                        print(f"   ✅ Subscription:")
                        print(f"      Package: {sub['package_name'] or 'Custom'}")
                        print(f"      Characters: {remaining:,} / {sub['characters_limit']:,} remaining")
                        print(f"      Period: {sub['start_date']} to {sub['end_date']}")
                        print(f"      Active: {sub['is_active']}")
                else:
                    print(f"   ❌ No active subscriptions")
                
                # Check payments for this user
                cursor.execute("""
                    SELECT p.id, p.payment_status, p.amount_vnd, p.created_at, sp.package_name
                    FROM payments p
                    LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                    WHERE p.user_id = %s
                    ORDER BY p.created_at DESC
                    LIMIT 5
                """, (user_id,))
                payments = cursor.fetchall()
                
                if payments:
                    print(f"   💳 Recent payments ({len(payments)}):")
                    for pay in payments:
                        status_icon = "✅" if pay['payment_status'] == 'completed' else "⏳" if pay['payment_status'] == 'pending' else "❌"
                        print(f"      {status_icon} ID:{pay['id']} | {pay['package_name']} | {pay['amount_vnd']:,}đ | {pay['payment_status']} | {pay['created_at']}")
                else:
                    print(f"   💳 No payments found")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def check_payments_by_user(username=None):
    """Kiểm tra payments của một user cụ thể"""
    if not username:
        username = input("Enter username to check: ").strip()
    
    print(f"\n🔍 CHECKING PAYMENTS FOR USER: {username}")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            # Find user
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            
            if not user:
                print(f"❌ User '{username}' not found")
                return
            
            print(f"👤 User found:")
            print(f"   ID: {user['id']}")
            print(f"   Username: {user['username']}")
            print(f"   Email: {user['email']}")
            print(f"   Role: {user['role']}")
            
            # Get all payments for this user
            cursor.execute("""
                SELECT p.*, sp.package_name
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                WHERE p.user_id = %s
                ORDER BY p.created_at DESC
            """, (user['id'],))
            payments = cursor.fetchall()
            
            print(f"\n💳 Payments for {username} ({len(payments)} total):")
            for pay in payments:
                status_icon = "✅" if pay['payment_status'] == 'completed' else "⏳" if pay['payment_status'] == 'pending' else "❌"
                print(f"   {status_icon} ID:{pay['id']} | {pay['package_name']} | {pay['amount_vnd']:,}đ")
                print(f"      Status: {pay['payment_status']} | Method: {pay['payment_method']}")  
                print(f"      Created: {pay['created_at']} | Transaction: {pay['transaction_id']}")
                if pay['description']:
                    print(f"      Description: {pay['description']}")
                print()
            
            # Get subscription
            cursor.execute("""
                SELECT us.*, sp.package_name
                FROM user_subscriptions us
                LEFT JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.user_id = %s AND us.is_active = 1
                ORDER BY us.created_at DESC LIMIT 1
            """, (user['id'],))
            subscription = cursor.fetchone()
            
            print(f"📋 Current subscription for {username}:")
            if subscription:
                remaining = subscription['characters_limit'] - subscription['characters_used']
                print(f"   ✅ Package: {subscription['package_name'] or 'Custom'}")
                print(f"   📝 Characters: {remaining:,} / {subscription['characters_limit']:,} remaining")
                print(f"   📅 Period: {subscription['start_date']} to {subscription['end_date']}")
                print(f"   🔄 Active: {subscription['is_active']}")
            else:
                print(f"   ❌ No active subscription")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    print("🔍 User & Payment Debug Tool")
    print("=" * 50)
    print("1. Check all users & subscriptions")
    print("2. Check specific user payments")
    print("3. Exit")
    
    while True:
        choice = input("\nSelect option (1-3): ").strip()
        
        if choice == '1':
            check_all_users()
        elif choice == '2':
            check_payments_by_user()
        elif choice == '3':
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()