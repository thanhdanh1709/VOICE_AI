"""
Script to check and fix custom voices in database
"""
import sys
import pymysql

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Database config (change if needed)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Change this if you have password
    'database': 'tts_system',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def check_custom_voices():
    """Check custom voices and their base_voice_id"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check table structure
        print("=" * 60)
        print("CHECKING TABLE STRUCTURE")
        print("=" * 60)
        cursor.execute("DESCRIBE custom_voices")
        columns = cursor.fetchall()
        
        has_base_voice = False
        has_pitch = False
        has_speed = False
        has_energy = False
        
        for col in columns:
            if col['Field'] == 'base_voice_id':
                has_base_voice = True
            elif col['Field'] == 'pitch_adjustment':
                has_pitch = True
            elif col['Field'] == 'speed_adjustment':
                has_speed = True
            elif col['Field'] == 'energy_adjustment':
                has_energy = True
        
        print(f"✓ base_voice_id column exists: {has_base_voice}")
        print(f"✓ pitch_adjustment column exists: {has_pitch}")
        print(f"✓ speed_adjustment column exists: {has_speed}")
        print(f"✓ energy_adjustment column exists: {has_energy}")
        
        if not all([has_base_voice, has_pitch, has_speed, has_energy]):
            print("\n⚠️  MISSING COLUMNS! You need to run:")
            print("   cd \"d:\\LUANVAN (2)\\LUANVAN\\database\"")
            print("   mysql -u root -p tts_system < custom_voices_update_v2.sql")
            return
        
        # Check custom voices
        print("\n" + "=" * 60)
        print("CUSTOM VOICES DATA")
        print("=" * 60)
        
        cursor.execute("""
            SELECT id, voice_name, base_voice_id, pitch_adjustment, 
                   speed_adjustment, energy_adjustment, status 
            FROM custom_voices 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        voices = cursor.fetchall()
        
        if not voices:
            print("No custom voices found.")
            return
        
        for voice in voices:
            print(f"\nID: {voice['id']}")
            print(f"  Name: {voice['voice_name']}")
            print(f"  Base Voice: {voice['base_voice_id']} {'❌ NULL!' if not voice['base_voice_id'] else '✓'}")
            print(f"  Pitch: {voice['pitch_adjustment']}")
            print(f"  Speed: {voice['speed_adjustment']}")
            print(f"  Energy: {voice['energy_adjustment']}")
            print(f"  Status: {voice['status']}")
        
        # Fix NULL base_voice_id
        print("\n" + "=" * 60)
        print("FIXING NULL base_voice_id")
        print("=" * 60)
        
        cursor.execute("""
            UPDATE custom_voices 
            SET base_voice_id = 'Ly', 
                pitch_adjustment = 0, 
                speed_adjustment = 1.0, 
                energy_adjustment = 1.0
            WHERE base_voice_id IS NULL
        """)
        conn.commit()
        
        affected = cursor.rowcount
        if affected > 0:
            print(f"✓ Fixed {affected} voices with default values (base_voice='Ly')")
        else:
            print("✓ All voices already have base_voice_id")
        
        # Remove 'HM' suffix from existing voices
        print("\n" + "=" * 60)
        print("REMOVING 'HM' SUFFIX FROM base_voice_id")
        print("=" * 60)
        
        cursor.execute("""
            UPDATE custom_voices 
            SET base_voice_id = SUBSTRING(base_voice_id, 1, LENGTH(base_voice_id) - 2)
            WHERE base_voice_id LIKE '%HM'
        """)
        conn.commit()
        
        affected = cursor.rowcount
        if affected > 0:
            print(f"✓ Removed 'HM' suffix from {affected} voices")
        else:
            print("✓ No voices with 'HM' suffix found")
        
        conn.close()
        print("\n" + "=" * 60)
        print("✅ DONE! Please restart your Flask server and try again.")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nPlease check:")
        print("1. MySQL is running")
        print("2. Database 'tts_system' exists")
        print("3. Database credentials are correct")

if __name__ == '__main__':
    check_custom_voices()
