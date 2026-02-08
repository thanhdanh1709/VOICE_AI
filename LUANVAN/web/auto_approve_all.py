#!/usr/bin/env python3
"""
Test Auto Approve - Duyệt tất cả payments pending ngay lập tức
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

def auto_approve_all_pending():
    """Tự động duyệt tất cả payments pending"""
    print("🚀 Auto-approving all pending payments...")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cursor:
            # Get all pending payments
            cursor.execute("""
                SELECT p.*, sp.characters_limit, sp.duration_days, u.username
                FROM payments p
                LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.payment_status = 'pending'
                ORDER BY p.created_at ASC
            """)
            pending_payments = cursor.fetchall()
            
            if not pending_payments:
                print("✅ No pending payments found")
                return
            
            print(f"📋 Found {len(pending_payments)} pending payments")
            
            approved_count = 0
            
            for payment in pending_payments:
                try:
                    payment_id = payment['id']
                    user_id = payment['user_id']
                    characters_limit = payment['characters_limit']
                    duration_days = payment['duration_days']
                    
                    print(f"🔄 Processing payment {payment_id} for {payment['username']}")
                    
                    # Approve payment
                    cursor.execute("""
                        UPDATE payments
                        SET payment_status = 'completed',
                            description = CONCAT(IFNULL(description, ''), ' - Auto-approved by test script'),
                            completed_at = NOW()
                        WHERE id = %s
                    """, (payment_id,))
                    
                    # Update user subscription
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
                        
                        print(f"   ✅ Extended subscription (+{characters_limit:,} chars)")
                    else:
                        # Create new subscription
                        start_date = datetime.now().date()
                        end_date = start_date + timedelta(days=duration_days)
                        cursor.execute("""
                            INSERT INTO user_subscriptions
                            (user_id, package_id, characters_limit, characters_used, start_date, end_date, is_active)
                            VALUES (%s, %s, %s, 0, %s, %s, 1)
                        """, (user_id, payment['package_id'], characters_limit, start_date, end_date))
                        
                        print(f"   ✅ Created new subscription ({characters_limit:,} chars)")
                    
                    approved_count += 1
                    
                except Exception as e:
                    print(f"   ❌ Error processing payment {payment['id']}: {e}")
            
            conn.commit()
            print(f"\n✅ Successfully approved {approved_count}/{len(pending_payments)} payments!")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🎯 Auto Approve All Pending Payments")
    print("=" * 50)
    
    choice = input("This will approve ALL pending payments. Continue? (y/N): ").strip().lower()
    
    if choice in ['y', 'yes']:
        auto_approve_all_pending()
    else:
        print("❌ Cancelled by user")