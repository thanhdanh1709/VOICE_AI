"""Test countries and cities phonetic"""
import sys
import codecs
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, str(Path(__file__).parent))

from normalize_text import VietnameseTTSNormalizer

print("="*80)
print("TEST COUNTRIES & CITIES PHONETIC")
print("="*80)

normalizer = VietnameseTTSNormalizer()

# Test countries
print("\n--- COUNTRIES ---")
countries = [
    ('vietnam', 'việt nam'),
    ('japan', 'giờ pàn'),
    ('korea', 'cô ri a'),
    ('thailand', 'thai lân'),
    ('usa', 'mỹ'),
    ('france', 'pờ răng'),
    ('germany', 'giớt mà ni'),
    ('brazil', 'bra din'),
    ('australia', 'úc'),
]

for word, expected in countries:
    phonetic = normalizer.english_phonetic.get(word, '❌ NOT FOUND')
    match = '✅' if phonetic == expected else '❌'
    print(f"  {match} {word:15} -> {phonetic:20} (expected: {expected})")

# Test cities
print("\n--- CITIES ---")
cities = [
    ('saigon', 'sài gòn'),
    ('hanoi', 'hà nội'),
    ('tokyo', 'tô ki ô'),
    ('seoul', 'xê un'),
    ('bangkok', 'băng cốc'),
    ('paris', 'pa ri'),
    ('london', 'lan đần'),
    ('newyork', 'niu ióc'),
    ('sydney', 'xít ni'),
    ('melbourne', 'men bơn'),
]

for word, expected in cities:
    phonetic = normalizer.english_phonetic.get(word, '❌ NOT FOUND')
    match = '✅' if phonetic == expected else '❌'
    print(f"  {match} {word:15} -> {phonetic:20} (expected: {expected})")

# Test normalization
print("\n--- TEST NORMALIZATION ---")
test_cases = [
    "<en>Vietnam</en> và <en>Japan</en>",
    "Từ <en>Saigon</en> đến <en>Tokyo</en>",
    "Du lịch <en>France</en>, <en>Germany</en>, <en>Brazil</en>",
    "Thành phố <en>Bangkok</en>, <en>Seoul</en>, <en>Paris</en>",
]

for test_text in test_cases:
    normalized = normalizer.normalize(test_text)
    has_placeholder = "placeholder" in normalized.lower()
    status = "❌" if has_placeholder else "✅"
    print(f"\n{status} Input:  {test_text}")
    print(f"   Output: {normalized}")

print("\n" + "="*80)
print("✅ TEST COMPLETED!")
print("="*80)
