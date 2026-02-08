import pymysql
from config import DB_CONFIG

conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()

print('=== SUBSCRIPTION STATUS ===')
cursor.execute('''
    SELECT us.*, sp.package_name, u.username
    FROM user_subscriptions us
    LEFT JOIN subscription_packages sp ON us.package_id = sp.id
    LEFT JOIN users u ON us.user_id = u.id
    WHERE us.is_active = 1
    ORDER BY us.updated_at DESC LIMIT 1
''')
sub = cursor.fetchone()

if sub:
    remaining = sub['characters_limit'] - sub['characters_used']
    print(f'User: {sub["username"]}')
    print(f'Package: {sub["package_name"] or "Custom"}')
    print(f'Characters: {remaining:,} / {sub["characters_limit"]:,} remaining')
    print(f'Period: {sub["start_date"]} to {sub["end_date"]}')
else:
    print('No active subscription found')

conn.close()