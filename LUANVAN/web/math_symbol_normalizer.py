"""
Chuẩn hóa ký hiệu toán học phổ biến cho TTS tiếng Việt.
"""
import re

MATH_SYMBOL_MAP = {
    '×': ' nhân ',
    '÷': ' chia ',
    '√': 'căn bậc hai ',
    '±': ' cộng trừ ',
    '≈': ' xấp xỉ ',
    '≠': ' khác ',
    '≤': ' nhỏ hơn hoặc bằng ',
    '≥': ' lớn hơn hoặc bằng ',
    '∞': ' vô cùng ',
    '∑': ' tổng ',
    '∏': ' tích ',
    '∫': ' tích phân ',
    'π': ' pi ',
    'α': ' alpha ',
    'β': ' beta ',
    'γ': ' gamma ',
    'θ': ' theta ',
    '²': ' bình ',
    '³': ' mũ ba ',
    '½': ' một phần hai ',
    '¼': ' một phần tư ',
    '¾': ' ba phần tư ',
}

_DATE_SLASH_RE = re.compile(r'\b\d{1,2}/\d{1,2}/\d{2,4}\b')
_FRACTION_RE = re.compile(r'(\d+)\s*/\s*(\d+)(?!\s*/\s*\d)')


def normalize_math_symbols(text: str) -> str:
    """Thay ký hiệu toán và phân số dạng a/b bằng từ tiếng Việt."""
    if not text:
        return text

    protected_dates = []

    def _protect_date(match: re.Match) -> str:
        protected_dates.append(match.group(0))
        return f'___tn_date_{len(protected_dates) - 1}___'

    text = _DATE_SLASH_RE.sub(_protect_date, text)

    # a * b (ASCII) trong biểu thức — trước khi * đơn lẻ bị đọc là "sao"
    text = re.sub(r'(?<=[a-zA-Z0-9])\s*\*\s*(?=[a-zA-Z0-9])', ' nhân ', text)

    for symbol, word in MATH_SYMBOL_MAP.items():
        text = text.replace(symbol, word)

    def _fraction(match):
        num, den = match.group(1), match.group(2)
        return f'{num} phần {den}'

    text = _FRACTION_RE.sub(_fraction, text)

    for idx, raw_date in enumerate(protected_dates):
        text = text.replace(f'___tn_date_{idx}___', raw_date)

    text = re.sub(r'\s+', ' ', text).strip()
    return text
