"""Test các từ vừa sửa lỗi"""
import sys
import codecs
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, str(Path(__file__).parent))

from normalize_text import VietnameseTTSNormalizer

print("="*80)
print("TEST CÁC TỪ VỪA SỬA LỖI")
print("="*80)

normalizer = VietnameseTTSNormalizer()

# Test grandfather/grandmother (đã sửa format)
print("\n--- TEST FAMILY (sửa format) ---")
test_words = [
    ('grandfather', 'grên phá đơ'),
    ('grandmother', 'grên mơ đơ'),
]

for word, expected in test_words:
    phonetic = normalizer.english_phonetic.get(word, '❌ NOT FOUND')
    match = '✅' if phonetic == expected else '❌'
    print(f"  {match} {word:15} -> {phonetic:20} (expected: {expected})")

# Test các duplicate đã xóa
print("\n--- TEST DUPLICATES (đã xóa khỏi file 23) ---")
removed_words = ['my', 'friend', 'party', 'book']
for word in removed_words:
    phonetic = normalizer.english_phonetic.get(word)
    if phonetic:
        print(f"  ✅ {word:15} -> {phonetic:20} (vẫn có từ file khác)")
    else:
        print(f"  ❌ {word:15} -> KHÔNG TÌM THẤY (lỗi!)")

# Test file 25_events (đã sửa)
print("\n--- TEST EVENTS (đã gộp year->newyear) ---")
event_words = [
    ('newyear', 'niu dia'),
    ('event', 'i ven'),
    ('lunar', 'lu na'),
    ('performance', 'pơ phóm mần'),
    ('idol', 'ai đồ'),
]

for word, expected in event_words:
    phonetic = normalizer.english_phonetic.get(word, '❌ NOT FOUND')
    match = '✅' if phonetic == expected else '❌'
    print(f"  {match} {word:15} -> {phonetic:20} (expected: {expected})")

# Test normalization với các từ đã sửa
print("\n--- TEST NORMALIZATION ---")
test_cases = [
    "<en>Grandfather</en> and <en>Grandmother</en>",
    "<en>My</en> <en>friend</en> goes to the <en>party</en>",
    "Read a <en>book</en> at the <en>event</en>",
    "<en>Lunar</en> <en>NewYear</en> celebration",
]

for test_text in test_cases:
    normalized = normalizer.normalize(test_text)
    has_placeholder = "placeholder" in normalized.lower()
    status = "❌" if has_placeholder else "✅"
    print(f"\n{status} Input:  {test_text}")
    print(f"   Output: {normalized}")

print("\n" + "="*80)
print("✅ KIỂM TRA HOÀN TẤT!")
print(f"📊 Tổng số từ trong dictionary: {len(normalizer.english_phonetic)}")
print("="*80)
