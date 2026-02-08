#!/usr/bin/env python3
"""
Auto Payment Approver - Background worker tự động duyệt thanh toán
"""

import pymysql
import sys
import os
import time
import requests
from datetime import datetime, timedelta
import threading

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.config import DB_CONFIG, SEPAY_TOKEN, SEPAY_API_URL, SEPAY_ACCOUNT_NUMBER

class AutoPaymentApprover:
    def __init__(self):
        self.running = False
        self.check_interval = 60  # Check every 60 seconds
        self.auto_approve_minutes = 5  # Auto-approve after 5 minutes
        
    def get_db_connection(self):
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
    
    def verify_with_sepay(self, transaction_id, amount):
        """Verify payment với SePay API"""
        try:
            headers = {
                'Authorization': f'Bearer {SEPAY_TOKEN}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{SEPAY_API_URL}/check",
                params={
                    'content': transaction_id,
                    'amount': amount,
                    'accountNumber': SEPAY_ACCOUNT_NUMBER
                },
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('status') == 'success' or data.get('verified') == True
            
        except Exception as e:
            print(f"[WARNING] SePay verification failed for {transaction_id}: {e}")
        
        return False
    
    def approve_payment(self, payment):
        """Approve một payment"""
        conn = self.get_db_connection()
        if not conn:
            return False
            
        try:
            with conn.cursor() as cursor:
                payment_id = payment['id']
                user_id = payment['user_id']
                characters_limit = payment['characters_limit']
                duration_days = payment['duration_days']
                
                print(f"🔄 Auto-approving payment {payment_id} for user {payment['username']}")
                
                # Update payment status
                cursor.execute("""
                    UPDATE payments
                    SET payment_status = 'completed',
                        description = CONCAT(IFNULL(description, ''), ' - Auto-approved by system'),
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
                else:
                    # Create new subscription
                    start_date = datetime.now().date()
                    end_date = start_date + timedelta(days=duration_days)
                    cursor.execute("""
                        INSERT INTO user_subscriptions
                        (user_id, package_id, characters_limit, characters_used, start_date, end_date, is_active)
                        VALUES (%s, %s, %s, 0, %s, %s, 1)
                    """, (user_id, payment['package_id'], characters_limit, start_date, end_date))
                
                conn.commit()
                print(f"✅ Payment {payment_id} auto-approved successfully!")
                return True
                
        except Exception as e:
            conn.rollback()
            print(f"❌ Error auto-approving payment {payment['id']}: {e}")
            return False
        finally:
            conn.close()
    
    def check_pending_payments(self):
        """Kiểm tra và auto-approve pending payments"""
        conn = self.get_db_connection()
        if not conn:
            return
            
        try:
            with conn.cursor() as cursor:
                # Get pending payments older than auto_approve_minutes
                cursor.execute("""
                    SELECT p.*, sp.characters_limit, sp.duration_days, u.username,
                           TIMESTAMPDIFF(MINUTE, p.created_at, NOW()) as minutes_ago
                    FROM payments p
                    LEFT JOIN subscription_packages sp ON p.package_id = sp.id
                    LEFT JOIN users u ON p.user_id = u.id
                    WHERE p.payment_status = 'pending'
                    AND TIMESTAMPDIFF(MINUTE, p.created_at, NOW()) >= %s
                    ORDER BY p.created_at ASC
                    LIMIT 10
                """, (self.auto_approve_minutes,))
                
                pending_payments = cursor.fetchall()
                
                for payment in pending_payments:
                    print(f"🔍 Checking payment {payment['id']} ({payment['minutes_ago']} min ago)")
                    
                    # Try SePay verification first
                    if self.verify_with_sepay(payment['transaction_id'], payment['amount_vnd']):
                        print(f"✅ SePay verified payment {payment['id']}")
                        self.approve_payment(payment)
                    elif payment['minutes_ago'] >= self.auto_approve_minutes:
                        # Auto-approve by time if SePay verification fails
                        print(f"⏰ Time-based auto-approve for payment {payment['id']}")
                        self.approve_payment(payment)
                    
                    # Small delay between payments
                    time.sleep(1)
                    
        except Exception as e:
            print(f"❌ Error checking pending payments: {e}")
        finally:
            conn.close()
    
    def run_worker(self):
        """Chạy background worker"""
        print(f"🚀 Auto Payment Approver started")
        print(f"   - Check interval: {self.check_interval} seconds")
        print(f"   - Auto-approve after: {self.auto_approve_minutes} minutes")
        print(f"   - SePay account: {SEPAY_ACCOUNT_NUMBER}")
        
        self.running = True
        
        while self.running:
            try:
                print(f"🔄 Checking pending payments... ({datetime.now().strftime('%H:%M:%S')})")
                self.check_pending_payments()
                
                # Sleep until next check
                for i in range(self.check_interval):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                print("\\n⏹️  Stopping auto payment approver...")
                self.running = False
                break
            except Exception as e:
                print(f"❌ Worker error: {e}")
                time.sleep(10)  # Wait longer on error
    
    def stop(self):
        """Dừng worker"""
        self.running = False

def main():
    approver = AutoPaymentApprover()
    
    print("Auto Payment Approver")
    print("=" * 50)
    print("1. Run worker (background auto-approve)")
    print("2. Check once (manual check)")
    print("3. Exit")
    
    while True:
        choice = input("\\nSelect option (1-3): ").strip()
        
        if choice == '1':
            try:
                approver.run_worker()
            except KeyboardInterrupt:
                print("\\n⏹️  Worker stopped by user")
                break
        elif choice == '2':
            approver.check_pending_payments()
        elif choice == '3':
            break
        else:
            print("❌ Invalid option")

if __name__ == "__main__":
    main()