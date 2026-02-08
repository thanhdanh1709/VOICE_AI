#!/usr/bin/env python3
"""
Test Create Payment for Specific User
"""

import pymysql
import sys
import os
import uuid
from datetime import datetime, timedelta

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

def create_test_payment(username, package_id=2):
    """Tạo payment test cho user"""
    print(f"🔧 Creating test payment for user: {username}")
    
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
            
            user_id = user['id']
            print(f"✅ Found user: {user['username']} (ID: {user_id})")
            
            # Get package info
            cursor.execute("""
                SELECT * FROM subscription_packages WHERE id = %s AND is_active = 1
            """, (package_id,))
            package = cursor.fetchone()
            
            if not package:
                print(f"❌ Package {package_id} not found")
                return
            
            print(f"✅ Found package: {package['package_name']} - {package['characters_limit']:,} chars - {package['price_vnd']:,}đ")
            
            # Create payment
            transaction_id = f"TEST_{uuid.uuid4().hex[:16].upper()}"
            
            cursor.execute("""
                INSERT INTO payments (user_id, package_id, amount_vnd, payment_method, payment_status, transaction_id)
                VALUES (%s, %s, %s, 'bank_qr', 'pending', %s)
            """, (user_id, package_id, package['price_vnd'], transaction_id))
            
            payment_id = cursor.lastrowid
            conn.commit()
            
            print(f"✅ Payment created:")
            print(f"   Payment ID: {payment_id}")
            print(f"   User ID: {user_id}")
            print(f"   Username: {username}")
            print(f"   Package: {package['package_name']}")
            print(f"   Amount: {package['price_vnd']:,}đ")
            print(f"   Transaction ID: {transaction_id}")
            
            return payment_id, user_id, transaction_id
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating payment: {e}")
        return None
    finally:
        conn.close()

def approve_test_payment(payment_id, user_id):
    """Approve payment test"""
    print(f"🔧 Approving payment {payment_id} for user {user_id}")
    
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
                print(f"❌ Payment {payment_id} not found")
                return
            
            print(f"📋 Payment details:")
            print(f"   ID: {payment['id']}")
            print(f"   User: {payment['username']} (ID: {payment['user_id']})")
            print(f"   Package: {payment.get('package_name', 'N/A')}")
            print(f"   Characters to add: {payment['characters_limit']:,}")
            print(f"   Duration: {payment['duration_days']} days")
            
            # Check current subscription before update
            cursor.execute("""
                SELECT * FROM user_subscriptions 
                WHERE user_id = %s AND is_active = 1
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            current_sub = cursor.fetchone()
            
            if current_sub:
                print(f"📊 Current subscription:")
                print(f"   Limit: {current_sub['characters_limit']:,}")
                print(f"   Used: {current_sub['characters_used']:,}")
                print(f"   Remaining: {current_sub['characters_limit'] - current_sub['characters_used']:,}")
                print(f"   End date: {current_sub['end_date']}")
            else:
                print(f"📊 No current subscription")
            
            # Approve payment
            cursor.execute("""
                UPDATE payments
                SET payment_status = 'completed',
                    description = 'Test approval',
                    completed_at = NOW()
                WHERE id = %s
            """, (payment_id,))
            
            # Update subscription
            if current_sub:
                # Extend existing subscription
                new_end_date = datetime.now() + timedelta(days=payment['duration_days'])
                new_characters_used = max(0, current_sub['characters_used'] - payment['characters_limit'])
                new_characters_limit = current_sub['characters_limit'] + payment['characters_limit']
                
                cursor.execute("""
                    UPDATE user_subscriptions
                    SET characters_used = %s,
                        characters_limit = %s,
                        end_date = %s
                    WHERE id = %s
                """, (new_characters_used, new_characters_limit, new_end_date, current_sub['id']))
                
                print(f"✅ Extended existing subscription")
                print(f"   New limit: {new_characters_limit:,}")
                print(f"   New used: {new_characters_used:,}")
                print(f"   New remaining: {new_characters_limit - new_characters_used:,}")
            else:
                # Create new subscription
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=payment['duration_days'])
                cursor.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, package_id, characters_limit, characters_used, start_date, end_date, is_active)
                    VALUES (%s, %s, %s, 0, %s, %s, 1)
                """, (user_id, payment['package_id'], payment['characters_limit'], start_date, end_date))
                
                print(f"✅ Created new subscription")
                print(f"   Limit: {payment['characters_limit']:,}")
                print(f"   Period: {start_date} to {end_date}")
            
            conn.commit()
            print(f"🎉 Payment {payment_id} approved successfully!")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error approving payment: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

def main():
    print("🧪 Test Payment Creation & Approval")
    print("=" * 50)
    
    while True:
        print("\n1. Create test payment")
        print("2. Approve test payment")
        print("3. Exit")
        
        choice = input("Select option (1-3): ").strip()
        
        if choice == '1':
            username = input("Enter username: ").strip()
            package_id = input("Enter package ID (default 2 = Basic Plan): ").strip() or "2"
            try:
                package_id = int(package_id)
                result = create_test_payment(username, package_id)
                if result:
                    payment_id, user_id, transaction_id = result
                    print(f"\n💡 To approve this payment, use option 2 with payment_id = {payment_id}")
            except ValueError:
                print("❌ Invalid package ID")
                
        elif choice == '2':
            try:
                payment_id = int(input("Enter payment ID: ").strip())
                user_id = int(input("Enter user ID: ").strip())
                approve_test_payment(payment_id, user_id)
            except ValueError:
                print("❌ Invalid payment or user ID")
                
        elif choice == '3':
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()