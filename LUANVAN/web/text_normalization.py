"""
Dịch vụ chuẩn hóa văn bản tập trung cho TTS VietVoice.

Quyết định kiến trúc (Phase 0):
- Giữ VietnameseTTSNormalizer (normalize_text.py) làm lõi số/tiền/SĐT/đơn vị.
- Module này là wrapper: rule email/URL/toán + bật/tắt nhóm rule từ site_settings.
"""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, Optional

from math_symbol_normalizer import normalize_math_symbols
from vieneu_utils.normalize_text import VietnameseTTSNormalizer

SITE_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'site_settings.json')

DEFAULT_RULE_GROUPS: Dict[str, bool] = {
    'core': True,
    'email': True,
    'url': True,
    'math': True,
}

_EMAIL_RE = re.compile(
    r'(?<![\w.])'
    r'[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?'
    r'@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,253}[A-Za-z0-9])?'
    r'\.[A-Za-z]{2,24}'
    r'(?=[\s,.;:!?\)]|$)'
)
_URL_RE = re.compile(
    r'(?<![\w@])'
    r'(?:https?://|ftp://|www\.)'
    r'[^\s<>"\'\])]+',
    re.IGNORECASE,
)
_MARKDOWN_LINK_RE = re.compile(
    r'\[([^\]]+)\]\(\s*(?:mailto:)?([^)]+)\s*\)',
    re.IGNORECASE,
)
_EMOTION_TAG_RE = re.compile(r'\([^)]+\)')
_EMOTION_PLACEHOLDER_TMPL = '___tn_emotion_{}___'

_normalizer: Optional[VietnameseTTSNormalizer] = None


def _get_normalizer() -> VietnameseTTSNormalizer:
    global _normalizer
    if _normalizer is None:
        _normalizer = VietnameseTTSNormalizer()
    return _normalizer


@lru_cache(maxsize=1)
def _load_site_settings_raw() -> str:
    try:
        with open(SITE_SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    except OSError:
        return '{}'


def load_tn_rule_groups() -> Dict[str, bool]:
    """Đọc nhóm rule TN từ site_settings.json (admin Phase 3)."""
    try:
        data = json.loads(_load_site_settings_raw())
    except json.JSONDecodeError:
        data = {}
    stored = data.get('tn_rules') or {}
    groups = dict(DEFAULT_RULE_GROUPS)
    for key in DEFAULT_RULE_GROUPS:
        if key in stored:
            groups[key] = bool(stored[key])
    return groups


def invalidate_tn_settings_cache() -> None:
    _load_site_settings_raw.cache_clear()


def _spell_token(token: str) -> str:
    token = token.strip().lower()
    if not token:
        return ''
    if token.isdigit():
        digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
        return ' '.join(digits[int(c)] for c in token)
    return token


_AT_PLACEHOLDER = '___tn_email_at___'
_EMAIL_SPOKEN_PLACEHOLDER = '___tn_email_spoken_{}___'

# Tên chữ cái ngắn (viết tắt email: v t danh ag)
_SHORT_LETTER_VI = {
    'a': 'a', 'b': 'bê', 'c': 'xê', 'd': 'dê', 'e': 'e', 'f': 'ép',
    'g': 'gờ', 'h': 'hát', 'i': 'i', 'j': 'di', 'k': 'ca', 'l': 'lờ',
    'm': 'mờ', 'n': 'nờ', 'o': 'o', 'p': 'pê', 'q': 'cu', 'r': 'rờ',
    's': 'ét', 't': 'tê', 'u': 'u', 'v': 'vê', 'w': 'đúp vê', 'x': 'ích',
    'y': 'i dài', 'z': 'dét',
}

# Âm tiết/từ họ tên Việt thường gặp trong local-part email (dài trước)
_VI_EMAIL_SYLLABLES = tuple(sorted({
    'nguyen', 'nguyễn', 'tran', 'trần', 'hoang', 'hoàng', 'huynh', 'huỳnh',
    'pham', 'phạm', 'dang', 'đặng', 'bui', 'bùi', 'duong', 'dương', 'ngo', 'ngô',
    'do', 'đỗ', 'ly', 'lý', 'van', 'văn', 'thi', 'thị', 'minh', 'anh', 'hung',
    'hùng', 'danh', 'duc', 'đức', 'linh', 'mai', 'lan', 'nam', 'nu', 'nữ',
    'thanh', 'tuan', 'tuấn', 'hieu', 'hiếu', 'khanh', 'phuong', 'phương',
    'quang', 'son', 'sơn', 'trung', 'vinh', 'long', 'hao', 'hào', 'ha', 'hà',
    'binh', 'bình', 'chau', 'châu', 'cuong', 'cường', 'dung', 'dũng', 'giang',
    'hanh', 'hạnh', 'khoa', 'khoi', 'khôi', 'lam', 'lâm', 'loc', 'lộc',
    'nhan', 'nhân', 'phuc', 'phúc', 'quynh', 'quỳnh', 'sang', 'sinh', 'tan',
    'tân', 'thao', 'thảo', 'thien', 'thiên', 'thu', 'thú', 'tien', 'tiến',
    'trang', 'trieu', 'triệu', 'trinh', 'tu', 'tú', 'tung', 'tùng', 'viet',
    'việt', 'vu', 'vũ', 'xuan', 'xuân', 'yen', 'yến', 'thao', 'loan', 'loạn',
    'hien', 'hiền', 'huong', 'hương', 'ngoc', 'ngọc', 'truc', 'trúc',
}, key=len, reverse=True))

_COMMON_EMAIL_WORDS = {
    'gmail': 'gmail',
    'yahoo': 'yahoo',
    'hotmail': 'hotmail',
    'outlook': 'outlook',
    'icloud': 'icloud',
    'com': 'com',
    'net': 'net',
    'org': 'org',
    'vn': 'vi en',
    'edu': 'edu',
    'gov': 'gov',
}


def _next_syllable_or_break(local: str, start: int) -> int:
    """Vị trí ký tự tiếp theo bắt đầu âm tiết tên hoặc số/dấu."""
    for j in range(start + 1, len(local)):
        if local[j].isdigit() or local[j] in '._-+':
            return j
        for syllable in _VI_EMAIL_SYLLABLES:
            if local[j:].startswith(syllable):
                return j
    return len(local)


def _spell_short_chunk(chunk: str) -> str:
    """Đọc cụm viết tắt (vt, ag) — từng chữ ngắn."""
    return ' '.join(_SHORT_LETTER_VI.get(c, c) for c in chunk if c.isalpha())


def _parse_email_local(local: str) -> str:
    """
    Đọc local-part email theo kiểu Việt:
    - nguyenvana123 → nguyen van a một hai ba
    - vtdanhag → vê tê danh a gờ
    """
    local = (local or '').lower().strip()
    if not local:
        return ''

    if local in _COMMON_EMAIL_WORDS:
        return _COMMON_EMAIL_WORDS[local]

    parts = []
    i = 0
    while i < len(local):
        ch = local[i]
        if ch in '._-+':
            sep = {'.': 'chấm', '_': 'gạch dưới', '-': 'gạch ngang', '+': 'cộng'}
            parts.append(sep[ch])
            i += 1
            continue
        if ch.isdigit():
            j = i
            while j < len(local) and local[j].isdigit():
                j += 1
            parts.append(_spell_token(local[i:j]))
            i = j
            continue

        matched_syllable = None
        for syllable in _VI_EMAIL_SYLLABLES:
            if local[i:].startswith(syllable):
                matched_syllable = syllable
                break

        if matched_syllable:
            parts.append(matched_syllable)
            i += len(matched_syllable)
            continue

        nxt = _next_syllable_or_break(local, i)
        chunk = local[i:nxt]
        if len(chunk) == 1:
            parts.append(_SHORT_LETTER_VI.get(chunk, chunk))
        else:
            parts.append(_spell_short_chunk(chunk))
        i = nxt if nxt > i else i + 1

    return ' '.join(parts)


def _spell_email_domain(domain: str) -> str:
    segments = []
    for segment in domain.split('.'):
        segment = segment.strip()
        if not segment:
            continue
        key = segment.lower()
        if key in _COMMON_EMAIL_WORDS:
            segments.append(_COMMON_EMAIL_WORDS[key])
        else:
            segments.append(_parse_email_local(segment))
    return ' chấm '.join(segments)


def _email_to_spoken(email: str) -> str:
    local, _, domain = email.partition('@')
    local_spoken = _parse_email_local(local)
    domain_spoken = _spell_email_domain(domain)
    return f'{local_spoken} a còng {domain_spoken}'


def _normalize_email_match(match: re.Match, spoken_cache: list) -> str:
    spoken = _email_to_spoken(match.group(0))
    spoken_cache.append(spoken)
    return _EMAIL_SPOKEN_PLACEHOLDER.format(len(spoken_cache) - 1)


def _normalize_url_match(match: re.Match) -> str:
    raw = match.group(0)
    trailing_punct = ''
    while raw and raw[-1] in '.,;:!?)':
        trailing_punct = raw[-1] + trailing_punct
        raw = raw[:-1]

    spoken = raw
    spoken = re.sub(r'^https://', 'h t t p s hai chấm gạch chéo gạch chéo ', spoken, flags=re.I)
    spoken = re.sub(r'^http://', 'h t t p hai chấm gạch chéo gạch chéo ', spoken, flags=re.I)
    spoken = re.sub(r'^ftp://', 'f t p hai chấm gạch chéo gạch chéo ', spoken, flags=re.I)
    spoken = re.sub(r'^www\.', 'double u double u double u chấm ', spoken, flags=re.I)

    spoken = spoken.replace('/', ' gạch chéo ')
    spoken = spoken.replace('-', ' gạch ngang ')
    spoken = spoken.replace('_', ' gạch dưới ')
    spoken = spoken.replace('.', ' chấm ')
    spoken = spoken.replace(':', ' hai chấm ')
    spoken = spoken.replace('?', ' hỏi chấm ')
    spoken = spoken.replace('&', ' và ')
    spoken = spoken.replace('=', ' bằng ')
    spoken = re.sub(r'\s+', ' ', spoken).strip()
    return spoken + (f' {trailing_punct}' if trailing_punct else '')


def _normalize_email(text: str, spoken_cache: Optional[list] = None) -> str:
    cache = spoken_cache if spoken_cache is not None else []

    def _repl(match: re.Match) -> str:
        return _normalize_email_match(match, cache)

    return _EMAIL_RE.sub(_repl, text)


def _normalize_url(text: str) -> str:
    return _URL_RE.sub(_normalize_url_match, text)


def _strip_markdown_links(text: str) -> str:
    """[label](mailto:email@x.com) → email thuần (tránh mailto: gây lỗi TTS)."""

    def _repl(match: re.Match) -> str:
        label = (match.group(1) or '').strip()
        target = (match.group(2) or '').strip()
        if '@' in label:
            return label
        if '@' in target:
            return target.replace('mailto:', '').strip()
        return label or target

    return _MARKDOWN_LINK_RE.sub(_repl, text)


def _protect_emotion_tags(text: str):
    """Giữ nguyên tag (vui vẻ) khi chạy core TN (tránh bị đổi thành dấu phẩy)."""
    tags = []

    def _repl(match: re.Match) -> str:
        tags.append(match.group(0))
        return _EMOTION_PLACEHOLDER_TMPL.format(len(tags) - 1)

    return _EMOTION_TAG_RE.sub(_repl, text), tags


def _restore_emotion_tags(text: str, tags) -> str:
    for idx, tag in enumerate(tags):
        text = text.replace(_EMOTION_PLACEHOLDER_TMPL.format(idx), tag)
    return text


def _normalize_standalone_symbols(text: str) -> str:
    """Đọc ký hiệu đơn lẻ trong câu liệt kê: @, #, %, *, !"""
    replacements = (
        (r'(^|\s)@(\s|,|$)', r'\1a còng\2'),
        (r'(^|\s)#(\s|,|$)', r'\1thăng\2'),
        (r'(^|\s)%(\s|,|$)', r'\1phần trăm\2'),
        (r'(^|\s)\*(\s|,|$)', r'\1sao\2'),
        (r'(^|\s)!(\s|,|$)', r'\1chấm than\2'),
    )
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return re.sub(r'\s+', ' ', text).strip()


def _smooth_tts_prosody(text: str) -> str:
    """
    Làm mượt ngắt nhịp sau TN: bỏ phẩy thừa, liệt kê ký hiệu đọc liền hơn.
    """
    if not text:
        return text
    # Liệt kê @, #, % … — dùng " và " thay vì phẩy liên tiếp
    text = re.sub(
        r'(a còng),\s*(thăng),\s*(phần trăm),\s*(và),\s*(sao),\s*(chấm than)',
        r'\1, \2, \3, \4, \5 và \6',
        text,
    )
    text = re.sub(r',\s*,+', ', ', text)
    text = re.sub(r'\s+,', ',', text)
    # Không chèn pause giữa từng chữ trong cụm viết tắt ngắn (vê tê → vê tê giữ nguyên)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_for_tts(
    text: str,
    *,
    enabled: bool = True,
    rule_groups: Optional[Dict[str, bool]] = None,
    preserve_emotion_tags: bool = False,
) -> str:
    """
    Pipeline chuẩn hóa chính cho mọi route TTS.

    Thứ tự: markdown → (bảo vệ tag cảm xúc) → URL → email → math → core.
    """
    if not enabled or not text or not str(text).strip():
        return text

    groups = rule_groups or load_tn_rule_groups()
    working = _strip_markdown_links(str(text))
    emotion_tags = []

    if preserve_emotion_tags:
        working, emotion_tags = _protect_emotion_tags(working)

    email_spoken_cache = []
    if groups.get('url', True):
        working = _normalize_url(working)
    if groups.get('email', True):
        working = _normalize_email(working, email_spoken_cache)
    if groups.get('math', True):
        working = normalize_math_symbols(working)
    working = _normalize_standalone_symbols(working)
    # Chuẩn hóa VNĐ trước core (tránh sót sau lower())
    working = re.sub(r'\bvnđ\b', 'VND', working, flags=re.IGNORECASE)
    if groups.get('core', True):
        working = _get_normalizer().normalize(working)

    working = _smooth_tts_prosody(working)

    for idx, spoken in enumerate(email_spoken_cache):
        working = working.replace(_EMAIL_SPOKEN_PLACEHOLDER.format(idx), spoken)

    working = working.replace(_AT_PLACEHOLDER, 'a còng')
    if emotion_tags:
        working = _restore_emotion_tags(working, emotion_tags)

    return working


def normalize_preview(
    text: str,
    *,
    enabled: bool = True,
    rule_groups: Optional[Dict[str, bool]] = None,
    preserve_emotion_tags: bool = False,
) -> Dict[str, Any]:
    """Trả về before/after cho UI preview."""
    original = text or ''
    if not enabled:
        return {
            'original': original,
            'normalized': original,
            'changed': False,
            'enabled': False,
            'rule_groups': rule_groups or load_tn_rule_groups(),
        }
    normalized = normalize_for_tts(
        original,
        enabled=True,
        rule_groups=rule_groups,
        preserve_emotion_tags=preserve_emotion_tags,
    )
    return {
        'original': original,
        'normalized': normalized,
        'changed': normalized != original,
        'enabled': True,
        'rule_groups': rule_groups or load_tn_rule_groups(),
    }


def resolve_tts_text(
    user_id: int,
    text: str,
    get_user_settings_fn,
    request_overrides: Optional[dict] = None,
    preserve_emotion_tags: bool = False,
):
    """
    Áp dụng preference user + override từ request.
    Returns: (text_for_tts, normalization_enabled, normalized_applied)
    """
    settings = get_user_settings_fn(user_id)
    enabled = bool(settings.get('enable_text_normalization', True))
    if request_overrides and 'enable_text_normalization' in request_overrides:
        enabled = bool(request_overrides.get('enable_text_normalization'))

    if not enabled:
        return text, False, False

    normalized = normalize_for_tts(
        text,
        enabled=True,
        preserve_emotion_tags=preserve_emotion_tags,
    )
    return normalized, True, normalized != text
