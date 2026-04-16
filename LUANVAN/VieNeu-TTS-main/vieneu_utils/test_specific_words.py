"""Test specific words from files 22-26"""
import sys
import codecs
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, str(Path(__file__).parent))

from normalize_text import VietnameseTTSNormalizer

print("="*80)
print("TESTING WORDS FROM FILES 22-26")
print("="*80)

normalizer = VietnameseTTSNormalizer()

print(f"\nTotal words: {len(normalizer.english_phonetic)}")

# Test words from file 22-26
test_words = {
    'File 22 (Brands)': ['shopee', 'momo', 'grab', 'vincom', 'highlands'],
    'File 23 (Common)': ['wow', 'my', 'friend', 'amazing', 'weekend'],
    'File 24 (Food)': ['bbq', 'hotpot', 'sushi', 'ramen', 'kimchi'],
    'File 25 (Events)': ['lunar', 'festival', 'concert', 'event', 'kpop'],
    'File 26 (Music)': ['pop', 'rock', 'jazz', 'edm', 'hiphop']
}

for category, words in test_words.items():
    print(f"\n--- {category} ---")
    for word in words:
        phonetic = normalizer.english_phonetic.get(word, '❌ NOT FOUND')
        status = '✅' if phonetic != '❌ NOT FOUND' else '❌'
        print(f"  {status} {word:15} -> {phonetic}")

# Test normalization
print("\n--- Test Normalization ---")
test_texts = [
    "<en>Shopee</en> và <en>Momo</en>",
    "<en>Wow</en> <en>amazing</en>!",
    "Ăn <en>BBQ</en> và <en>sushi</en>",
    "<en>K-pop concert</en> <en>EDM party</en>"
]

for test_text in test_texts:
    normalized = normalizer.normalize(test_text)
    print(f"\nInput:  {test_text}")
    print(f"Output: {normalized}")

print("\n" + "="*80)
