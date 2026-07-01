"""Unit tests for VietVoice text normalization pipeline."""
import json
import sys
from pathlib import Path

import pytest

WEB_DIR = Path(__file__).resolve().parents[1]
if str(WEB_DIR) not in sys.path:
    sys.path.insert(0, str(WEB_DIR))

VIENEU_DIR = WEB_DIR.parent / 'VieNeu-TTS-main'
if str(VIENEU_DIR) not in sys.path:
    sys.path.insert(0, str(VIENEU_DIR))

from text_normalization import normalize_for_tts, normalize_preview, load_tn_rule_groups
from math_symbol_normalizer import normalize_math_symbols


FIXTURES = WEB_DIR / 'tests' / 'fixtures' / 'tn_test_cases.json'


@pytest.fixture(scope='module')
def test_cases():
    with open(FIXTURES, encoding='utf-8') as f:
        return json.load(f)


def test_rule_groups_defaults():
    groups = load_tn_rule_groups()
    assert groups['core'] is True
    assert 'email' in groups
    assert 'url' in groups
    assert 'math' in groups


def test_normalize_disabled_passthrough():
    text = 'Email test@x.com giá $5'
    assert normalize_for_tts(text, enabled=False) == text


def test_email_normalization():
    out = normalize_for_tts('Liên hệ support@vietvoice.app')
    assert 'a còng' in out
    assert 'am pe còng' not in out
    assert '@' not in out
    assert 'giê' in out or 'ét' in out  # đọc từng chữ, không để nguyên support


def test_email_local_part_spelled():
    out = normalize_for_tts('email nguyenvana123@gmail.com')
    assert 'nguyenvana123' not in out
    assert 'nguyen van a' in out
    assert 'a còng gmail chấm com' in out
    assert 'en nờ giê' not in out  # không đánh vần từng chữ cả cụm


def test_email_abbrev_local_part():
    out = normalize_for_tts('email vtdanhag@gmail.com')
    assert 'vtdanhag' not in out
    assert 'danh' in out
    assert 'a còng gmail' in out
    assert 'vê' in out and 'tê' in out


def test_markdown_email_stripped():
    out = normalize_for_tts(
        'Email [nguyenvana123@gmail.com](mailto:nguyenvana123@gmail.com) nhé'
    )
    assert 'mailto' not in out.lower()
    assert 'a còng' in out
    assert 'nguyenvana123' not in out


def test_vnd_marker():
    out = normalize_for_tts('Trị giá 1.250.000 VNĐ')
    assert 'đồng' in out
    assert 'vnđ' not in out
    assert 'triệu' in out


def test_preserve_emotion_tags():
    src = '(vui vẻ) Giá $100 email test@x.com'
    out = normalize_for_tts(src, preserve_emotion_tags=True)
    assert '(vui vẻ)' in out
    assert 'đô la' in out or '100' in out


def test_vietnamese_thousand_amount():
    out = normalize_for_tts('Trị giá 1.250.000 VND')
    assert 'triệu' in out or 'nghìn' in out
    assert 'đồng' in out
    assert 'chấm 250 chấm' not in out


def test_date_not_treated_as_fraction():
    out = normalize_for_tts('Họp ngày 01/07/2026')
    assert 'phần bảy phần hai' not in out
    assert 'ngày một' in out
    assert 'tháng bảy' in out
    assert 'hai nghìn không trăm hai mươi sáu' in out


def test_standalone_year_still_full():
    out = normalize_for_tts('Xu hướng năm 2026')
    assert 'hai nghìn không trăm hai mươi sáu' in out
    assert 'hai nghìn hai mươi sáu' not in out


def test_url_normalization():
    out = normalize_for_tts('Vào https://vietvoice-ai.online nhé')
    assert 'h t t p s' in out
    assert '://' not in out


def test_math_symbols():
    out = normalize_math_symbols('a × b ÷ c')
    assert 'nhân' in out
    assert 'chia' in out


def test_math_ascii_star():
    out = normalize_math_symbols('a * b')
    assert 'nhân' in out


def test_preview_api_shape():
    result = normalize_preview('Giá $10')
    assert 'original' in result
    assert 'normalized' in result
    assert result['changed'] is True


@pytest.mark.parametrize('case', json.loads(FIXTURES.read_text(encoding='utf-8')), ids=lambda c: f"case_{c['id']}")
def test_fixture_cases(case):
    if case.get('preserve_tags'):
        pytest.skip('Emotional tag preservation tested at integration level')

    output = normalize_for_tts(case['input'])
    for fragment in case.get('expect_contains', []):
        assert fragment.lower() in output.lower(), (
            f"Case {case['id']} ({case['category']}): expected '{fragment}' in '{output}'"
        )
