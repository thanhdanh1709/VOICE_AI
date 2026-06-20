"""
LLM translation service for UI i18n (not user TTS input).
API key is read from environment — never exposed to frontend.
"""
import hashlib
import json
import os
import re
from pathlib import Path

import requests

WEB_DIR = Path(__file__).resolve().parent
CACHE_FILE = WEB_DIR / 'data' / 'translate_cache.json'
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_API_BASE = os.environ.get('OPENAI_API_BASE', 'https://api.openai.com').rstrip('/')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

_OPENAI_QUOTA_EXHAUSTED = False


def _reload_llm_config():
    """Read env at call time (app may load .env.local after module import)."""
    global OPENAI_API_KEY, OPENAI_API_BASE, OPENAI_MODEL
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '') or OPENAI_API_KEY
    OPENAI_API_BASE = (os.environ.get('OPENAI_API_BASE', OPENAI_API_BASE) or OPENAI_API_BASE).rstrip('/')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', OPENAI_MODEL) or OPENAI_MODEL

_LANG_LABELS = {
    'en': 'tiếng Anh',
    'vi': 'tiếng Việt',
    'english': 'tiếng Anh',
    'vietnamese': 'tiếng Việt',
}

_TRANSLATE_PROMPT = """Bạn là hệ thống dịch thuật cho website chuyển văn bản thành giọng nói tiếng Việt.

Hãy dịch nội dung sau sang {target_language}.

Yêu cầu:
- Giữ nguyên ý nghĩa gốc.
- Dịch tự nhiên, rõ ràng, phù hợp với giao diện web.
- Không thêm giải thích.
- Không tự ý thêm nội dung mới.
- Không dịch tên route, tên biến, mã lỗi, class CSS, ID HTML hoặc nội dung nằm trong dấu ngoặc nhọn.
- Không thay đổi các thẻ HTML nếu có.
- Không dịch tên model, tên file, đường dẫn API hoặc định dạng âm thanh.
- Giữ nguyên các thuật ngữ kỹ thuật nếu chúng là tên riêng hoặc tên mô hình.

Dịch thống nhất các thuật ngữ sau:

Text-to-Speech = Chuyển văn bản thành giọng nói
Vietnamese Text-to-Speech = Chuyển văn bản thành giọng nói tiếng Việt
Speech synthesis = Tổng hợp giọng nói
Voice cloning = Nhân bản giọng nói
Reference voice = Giọng mẫu
Generated audio = Âm thanh được tạo
Speaker = Người nói
Emotion = Cảm xúc
Speech speed = Tốc độ đọc
Audio file = Tệp âm thanh
Download audio = Tải âm thanh
Input text = Văn bản đầu vào
Generate speech = Tạo giọng nói
Processing = Đang xử lý
Completed = Hoàn tất
Failed = Thất bại

Nội dung cần dịch:
{text}"""


def _cache_key(text: str, target_language: str) -> str:
    raw = f"{target_language}\n{text}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _load_cache() -> dict:
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_cache(cache: dict):
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False)
    except Exception:
        pass


def _normalize_target(target_language: str) -> str:
    t = (target_language or 'en').strip().lower()
    if t in ('en', 'english'):
        return 'en'
    if t in ('vi', 'vietnamese'):
        return 'vi'
    return t


def _lang_label(target_language: str) -> str:
    return _LANG_LABELS.get(target_language, target_language)


def _call_openai(prompt: str) -> str:
    global _OPENAI_QUOTA_EXHAUSTED
    if _OPENAI_QUOTA_EXHAUSTED:
        raise RuntimeError('OpenAI quota exhausted (skip retry)')

    _reload_llm_config()
    if not OPENAI_API_KEY:
        raise RuntimeError('OPENAI_API_KEY is not configured on the server')

    url = f'{OPENAI_API_BASE}/v1/chat/completions'
    payload = {
        'model': OPENAI_MODEL,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.2,
    }
    resp = requests.post(
        url,
        headers={
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=90,
    )
    if resp.status_code == 429:
        _OPENAI_QUOTA_EXHAUSTED = True
    if resp.status_code != 200:
        raise RuntimeError(f'LLM API error {resp.status_code}: {resp.text[:300]}')
    data = resp.json()
    content = (data.get('choices') or [{}])[0].get('message', {}).get('content', '')
    return (content or '').strip()


def _translate_via_google(text: str, target_language: str) -> str:
    """Free fallback when OpenAI quota/rate limit fails."""
    target = _normalize_target(target_language)
    src = 'vi' if target == 'en' else 'en'
    max_chunk = 4500
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=src, target=target)
        if len(text) <= max_chunk:
            return translator.translate(text)
        parts = []
        pos = 0
        while pos < len(text):
            end = min(pos + max_chunk, len(text))
            if end < len(text):
                br = text.rfind('\n', pos, end)
                if br > pos + max_chunk // 2:
                    end = br + 1
            parts.append(translator.translate(text[pos:end]))
            pos = end
        return ''.join(parts)
    except Exception as e:
        print(f'[translate] Google fallback failed: {e}')
        return text


def translate_text(text: str, target_language: str = 'en') -> str:
    """Translate text via LLM with file-based cache."""
    text = text or ''
    if not text.strip():
        return text

    target = _normalize_target(target_language)
    key = _cache_key(text, target)
    cache = _load_cache()
    if key in cache:
        return cache[key]

    prompt = _TRANSLATE_PROMPT.format(
        target_language=_lang_label(target),
        text=text,
    )
    try:
        translated = _call_openai(prompt)
    except Exception as e:
        if 'quota' not in str(e).lower() and '429' not in str(e):
            print(f'[translate] OpenAI failed ({e}), using Google fallback')
        translated = _translate_via_google(text, target)

    if not translated:
        translated = _translate_via_google(text, target)
    if not translated:
        raise RuntimeError('Empty translation response')

    cache[key] = translated
    _save_cache(cache)
    return translated


def translate_text_safe(text: str, target_language: str = 'en') -> str:
    """Return original text on failure."""
    try:
        return translate_text(text, target_language)
    except Exception:
        return text


def translate_text_chunked_safe(text: str, target_language: str = 'en', max_chunk: int = 4500) -> str:
    """Translate long HTML/text in chunks (Google limit ~5000 chars)."""
    text = text or ''
    if len(text) <= max_chunk:
        return translate_text_safe(text, target_language)
    parts = []
    pos = 0
    while pos < len(text):
        end = min(pos + max_chunk, len(text))
        if end < len(text):
            br = text.rfind('\n', pos, end)
            if br > pos + max_chunk // 2:
                end = br + 1
        parts.append(translate_text_safe(text[pos:end], target_language))
        pos = end
    return ''.join(parts)
