#!/usr/bin/env python3
"""
Quick approve payment script
"""

import pymysql
import sys
import os
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

def approve_payment(payment_id):
    """Approve payment"""
    print(f"🔧 Approving payment ID: {payment_id}")
    
    conn = get_db_connection()
    if not conn:
        return False
    
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
                return False
                
            if payment['payment_status'] == 'completed':
                print(f"❌ Payment already completed")
                return False
            
            print(f"📋 Payment details:")
            print(f"   User: {payment['username']}")
            print(f"   Amount: {payment['amount_vnd']:,}đ")
            print(f"   Package: {payment.get('package_name', 'N/A')}")
            print(f"   Characters: +{payment['characters_limit']:,}")
            
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
                
                print(f"✅ Extended existing subscription")
            else:
                # Create new subscription
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=duration_days)
                cursor.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, package_id, characters_limit, characters_used, start_date, end_date, is_active)
                    VALUES (%s, %s, %s, 0, %s, %s, 1)
                """, (user_id, payment['package_id'], characters_limit, start_date, end_date))
                
                print(f"✅ Created new subscription")
            
            conn.commit()
            print(f"✅ Payment {payment_id} approved successfully!")
            return True
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error approving payment: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_approve.py <payment_id>")
        print("Example: python quick_approve.py 14")
        sys.exit(1)
    
    try:
        payment_id = int(sys.argv[1])
        success = approve_payment(payment_id)
        sys.exit(0 if success else 1)
    except ValueError:
        print("❌ Payment ID must be a number")
        sys.exit(1)