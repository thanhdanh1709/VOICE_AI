"""
Test script to verify JSON dictionary loading
"""
import sys
import codecs
from pathlib import Path

# Fix UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, str(Path(__file__).parent))

from normalize_text import VietnameseTTSNormalizer

print("="*80)
print("TESTING JSON DICTIONARY LOADING")
print("="*80)

normalizer = VietnameseTTSNormalizer()

print(f"\nTotal words loaded: {len(normalizer.english_phonetic)}")

print("\n--- Test some words ---")
test_words = ['hello', 'father', 'computer', 'facebook', 'vietnam', 'japan', 'tokyo', 'paris', 'newyork']

for word in test_words:
    phonetic = normalizer.english_phonetic.get(word, 'NOT FOUND')
    print(f"  {word:15} -> {phonetic}")

print("\n--- Test normalization ---")
test_text = "<en>Hello</en> from <en>Vietnam</en> to <en>Japan</en>! I work at <en>Google</en> in <en>Tokyo</en>."
normalized = normalizer.normalize(test_text)
print(f"Input:  {test_text}")
print(f"Output: {normalized}")

print("\n--- Test with currency ---")
test_text2 = "Giá sản phẩm $100, €50, ¥5000. Liên hệ: 0866005541"
normalized2 = normalizer.normalize(test_text2)
print(f"Input:  {test_text2}")
print(f"Output: {normalized2}")

print("\n="*80)
print("✅ TEST COMPLETED!")
print("="*80)
