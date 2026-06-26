"""
Shared emotion parsing for viXTTS Emotional and OmniVoice Emotional modes.
Pure Python — no viXTTS/OmniVoice imports (safe across venv boundaries).
"""
import re
from typing import Callable, Dict, List, Optional

EMOTIONS = ("cheerful", "excited", "calm", "sad", "neutral")

# Explicit tag in parentheses -> canonical emotion
EMOTION_TAG_ALIASES = {
    "cheerful": "cheerful",
    "happy": "cheerful",
    "joy": "cheerful",
    "vui": "cheerful",
    "vui vẻ": "cheerful",
    "tươi sáng": "cheerful",
    "开心": "cheerful",
    "高兴": "cheerful",
    "excited": "excited",
    "enthusiastic": "excited",
    "hào hứng": "excited",
    "phấn khích": "excited",
    "兴奋": "excited",
    "calm": "calm",
    "gentle": "calm",
    "soft": "calm",
    "bình tĩnh": "calm",
    "nhẹ nhàng": "calm",
    "trầm": "calm",
    "平静": "calm",
    "温柔": "calm",
    "sad": "sad",
    "melancholic": "sad",
    "buồn": "sad",
    "tiếc": "sad",
    "悲伤": "sad",
    "难过": "sad",
    "neutral": "neutral",
    "bình thường": "neutral",
    "中性": "neutral",
}

EMOTION_KEYWORDS = {
    "cheerful": {
        "vi": ["tươi sáng", "vui", "nụ cười", "haha", "vui vẻ", "cười", "vui mừng"],
        "en": ["cheerful", "happy", "joy", "bright", "smile", "laugh"],
        "zh": ["开心", "高兴", "快乐", "愉快"],
    },
    "excited": {
        "vi": ["hào hứng", "phấn khích", "wow", "tuyệt vời", "kích thích"],
        "en": ["excited", "enthusiastic", "amazing", "wow", "thrilled"],
        "zh": ["兴奋", "激动", "太棒"],
    },
    "calm": {
        "vi": ["chậm", "ấm", "dịu", "nhẹ nhàng", "bình tĩnh", "trầm", "thư thái"],
        "en": ["calm", "gentle", "soft", "slow", "peaceful", "relaxed"],
        "zh": ["平静", "温柔", "轻柔", "慢"],
    },
    "sad": {
        "vi": ["buồn", "tiếc", "đau", "thương", "u sầu"],
        "en": ["sad", "sorrow", "melancholy", "grief", "unhappy"],
        "zh": ["悲伤", "难过", "伤心", "忧郁"],
    },
}

EMOTION_TO_INSTRUCT_EN = {
    "cheerful": "young adult, moderate pitch",
    "excited": "young adult, very high pitch",
    "calm": "middle-aged, low pitch",
    "sad": "elderly, very low pitch",
    "neutral": None,
}

# OmniVoice voice-design tags (ZH) — dùng dấu phẩy full-width
EMOTION_TO_INSTRUCT_ZH = {
    "cheerful": "青年，中音调",
    "excited": "青年，极高音调",
    "calm": "中年，低音调",
    "sad": "老年，极低音调",
    "neutral": None,
}

# Giữ alias cũ cho tài liệu / tương thích import
EMOTION_TO_INSTRUCT = EMOTION_TO_INSTRUCT_EN


def _is_primarily_chinese(text: str) -> bool:
    """Heuristic: chọn instruct EN hay ZH theo nội dung chunk."""
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text or ""))
    latin = len(re.findall(r"[A-Za-z]", text or ""))
    return cjk > latin


def _normalize_tag(tag: str) -> str:
    return re.sub(r"\s+", " ", (tag or "").strip().lower())


def detect_emotion_from_tag(tag: str) -> Optional[str]:
    """Map explicit parenthesis tag to emotion id."""
    key = _normalize_tag(tag)
    if key in EMOTION_TAG_ALIASES:
        return EMOTION_TAG_ALIASES[key]
    for canonical, aliases in EMOTION_TAG_ALIASES.items():
        if key == canonical:
            return canonical
    return None


def detect_emotion(text: str) -> str:
    """Detect emotion from tag content or keywords (Vi/En/Zh)."""
    text = (text or "").strip()
    if not text:
        return "neutral"

    m = re.match(r"^\(([^)]+)\)", text)
    if m:
        from_tag = detect_emotion_from_tag(m.group(1))
        if from_tag:
            return from_tag

    text_lower = text.lower()
    for emotion in ("cheerful", "excited", "calm", "sad"):
        for _lang, keywords in EMOTION_KEYWORDS[emotion].items():
            if any(kw in text_lower for kw in keywords):
                return emotion
    return "neutral"


def clean_text(text: str, normalizer: Optional[Callable[[str], str]] = None) -> str:
    """Remove emotion tags in parentheses and normalize whitespace."""
    text = re.sub(r"\([^)]*\)", "", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    if normalizer and text:
        try:
            text = normalizer(text)
        except Exception:
            pass
    return text


def split_by_emotion(
    text: str,
    normalizer: Optional[Callable[[str], str]] = None,
) -> List[Dict[str, str]]:
    """Split text into segments with detected emotion (same format as viXTTS)."""
    chunks: List[Dict[str, str]] = []
    lines = (text or "").split("\n")
    current_text = ""
    current_emotion = "neutral"

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if "(" in line:
            if current_text.strip():
                cleaned = clean_text(current_text, normalizer)
                if cleaned:
                    chunks.append({"text": cleaned, "emotion": current_emotion})
            current_emotion = detect_emotion(line)
            current_text = line
        else:
            current_text = (current_text + " " + line).strip() if current_text else line

    if current_text.strip():
        cleaned = clean_text(current_text, normalizer)
        if cleaned:
            chunks.append({"text": cleaned, "emotion": current_emotion})

    if not chunks and (text or "").strip():
        cleaned = clean_text(text, normalizer)
        if cleaned:
            chunks.append({"text": cleaned, "emotion": detect_emotion(text)})

    return chunks


def emotion_to_instruct(emotion: str, text: Optional[str] = None) -> Optional[str]:
    """
    Map emotion -> OmniVoice voice-design instruct (whitelist tags only).
    Returns None for neutral or when no instruct should be sent.
    """
    key = (emotion or "neutral").lower()
    if key == "neutral":
        return None
    if text and _is_primarily_chinese(text):
        return EMOTION_TO_INSTRUCT_ZH.get(key)
    return EMOTION_TO_INSTRUCT_EN.get(key)


def split_text_by_max_chars(text: str, max_chars: int) -> List[str]:
    """Split long text into size-limited chunks (sentence-aware)."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks: List[str] = []
    sentences = re.split(r"(?<=[.!?;])\s+|(?<=\n)", text)
    current = ""
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        if len(current) + len(sent) + 1 <= max_chars:
            current = (current + " " + sent).strip() if current else sent
        else:
            if current:
                chunks.append(current)
            if len(sent) <= max_chars:
                current = sent
            else:
                while len(sent) > max_chars:
                    chunks.append(sent[:max_chars])
                    sent = sent[max_chars:]
                current = sent
    if current:
        chunks.append(current)
    return [c for c in chunks if c.strip()]


def plan_emotional_chunks(
    text: str,
    max_chars: int = 1000,
    normalizer: Optional[Callable[[str], str]] = None,
) -> List[Dict[str, str]]:
    """
    Plan TTS jobs: split by emotion first, then by max_chars within same emotion.
    Returns list of {text, emotion, instruct}.
    """
    emotion_segments = split_by_emotion(text, normalizer=normalizer)
    if not emotion_segments:
        return []

    jobs: List[Dict[str, str]] = []
    for seg in emotion_segments:
        for sub in split_text_by_max_chars(seg["text"], max_chars):
            instruct = emotion_to_instruct(seg["emotion"], sub)
            job = {
                "text": sub,
                "emotion": seg["emotion"],
            }
            if instruct:
                job["instruct"] = instruct
            jobs.append(job)
    return jobs
