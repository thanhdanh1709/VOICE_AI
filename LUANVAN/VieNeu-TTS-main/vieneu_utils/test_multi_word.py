"""Test multi-word EN tags"""
import sys
import codecs
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, str(Path(__file__).parent))

from normalize_text import VietnameseTTSNormalizer

normalizer = VietnameseTTSNormalizer()

print("="*80)
print("TEST MULTI-WORD EN TAGS")
print("="*80)

tests = [
    ("<en>Hello</en>", "1 từ đơn"),
    ("<en>Momo</en>", "1 từ đơn (brand)"),
    ("<en>K-pop concert</en>", "2 từ có dấu gạch"),
    ("<en>EDM party</en>", "2 từ"),
    ("<en>Lunar New Year</en>", "3 từ"),
    ("<en>Street food</en>", "2 từ"),
    ("<en>My friend</en>", "2 từ"),
]

for test_text, desc in tests:
    normalized = normalizer.normalize(test_text)
    has_placeholder = "placeholder" in normalized.lower()
    status = "❌" if has_placeholder else "✅"
    print(f"\n{status} {desc}")
    print(f"   Input:  {test_text}")
    print(f"   Output: {normalized}")
    if has_placeholder:
        print(f"   ⚠️  FAILED - Still has placeholder!")

print("\n" + "="*80)
