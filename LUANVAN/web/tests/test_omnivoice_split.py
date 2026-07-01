import sys
from pathlib import Path

WEB_DIR = Path(__file__).resolve().parents[1]
VIENEU_DIR = WEB_DIR.parent / 'VieNeu-TTS-main'
if str(WEB_DIR) not in sys.path:
    sys.path.insert(0, str(WEB_DIR))
if str(VIENEU_DIR) not in sys.path:
    sys.path.insert(0, str(VIENEU_DIR))

from text_normalization import normalize_for_tts
from omnivoice_tts import split_text_for_omnivoice, DEFAULT_CPU_MAX_CHARS

SAMPLE = (
    'Ngày 01/07/2026, tôi nhận được thông báo từ email nguyenvana123@gmail.com '
    'về hóa đơn thanh toán trị giá 1.250.000 VNĐ tại website https://vietvoice-ai.online. '
    'Nếu có thắc mắc, vui lòng liên hệ số điện thoại 0987 654 321 hoặc truy cập URL hỗ trợ: '
    'https://vietvoice-ai.online/support. Nội dung ghi chú có kèm một số kí tự đặc biệt như @, #, %, &, *, ! '
    'và công thức toán học: S = a * b, trong đó a = 5 và b = 10 nên S = 50.'
)


def test_omnivoice_long_tn_text_splits_into_multiple_chunks():
    norm = normalize_for_tts(SAMPLE)
    chunks = split_text_for_omnivoice(norm, max_chars=DEFAULT_CPU_MAX_CHARS)
    assert len(chunks) >= 2
    assert 'năm mươi' in chunks[-1]
    assert 'nhân' in norm


def test_math_star_in_expression_is_nhan_not_sao():
    out = normalize_for_tts('S = a * b')
    assert 'nhân' in out
    assert 'sao' not in out
