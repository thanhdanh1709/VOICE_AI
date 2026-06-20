"""Load Hướng dẫn sử dụng / Cài đặt từ file Markdown gốc (USER_GUIDE.md, INSTALLATION_GUIDE.md)."""

import os
import re

try:
    import markdown
except ImportError:
    markdown = None

_WEB_DIR = os.path.dirname(os.path.abspath(__file__))
_GUIDE_FILES = {
    'user_guide': os.path.join(_WEB_DIR, 'USER_GUIDE.md'),
    'installation_guide': os.path.join(_WEB_DIR, 'INSTALLATION_GUIDE.md'),
}

# Fallback: thư mục gốc dự án (cùng cấp LUANVAN)
_PARENT_GUIDE_FILES = {
    'user_guide': os.path.join(_WEB_DIR, '..', '..', '..', '..', 'USER_GUIDE.md'),
    'installation_guide': os.path.join(_WEB_DIR, '..', '..', '..', '..', 'INSTALLATION_GUIDE.md'),
}


def _resolve_guide_path(page_key):
    path = _GUIDE_FILES.get(page_key)
    if path and os.path.isfile(path):
        return path
    alt = _PARENT_GUIDE_FILES.get(page_key)
    if alt and os.path.isfile(alt):
        return os.path.normpath(alt)
    return None


def _normalize_guide_html(html):
    """Chuẩn hóa HTML từ Markdown — class cho bảng/code."""
    if not html:
        return ''
    text = html
    text = re.sub(r'<table>', '<table class="legal-md-table">', text)
    text = re.sub(r'<pre>', '<pre class="legal-md-pre">', text)
    text = re.sub(r'<blockquote>', '<blockquote class="legal-md-quote">', text)
    return text


def _md_to_html(text):
    if not text:
        return ''
    if markdown:
        html = markdown.markdown(
            text,
            extensions=['tables', 'fenced_code', 'nl2br'],
        )
        return _normalize_guide_html(html)
    # Fallback rất cơ bản
    html = text
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    html = re.sub(r'\n\n+', '</p><p>', html)
    return f'<p>{html}</p>'


def _extract_updated(md_text):
    m = re.search(r'Cập nhật:\s*([^\n|]+)', md_text)
    if m:
        return m.group(1).strip()
    return 'Tháng 6 năm 2026'


def parse_markdown_guide(md_text):
    """Chia Markdown theo ## heading → sections cho legal_dynamic_body."""
    updated = _extract_updated(md_text)
    sections = []
    pattern = re.compile(r'^## (.+)$', re.MULTILINE)
    matches = list(pattern.finditer(md_text))
    for i, match in enumerate(matches):
        raw_title = match.group(1).strip()
        title = re.sub(r'^\d+\.\s*', '', raw_title)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md_text)
        body = md_text[start:end].strip()
        body = re.sub(r'^---\s*$', '', body, flags=re.MULTILINE).strip()
        content = _md_to_html(body)
        if title or re.sub(r'<[^>]+>', '', content).strip():
            sections.append({'title': title, 'content': content})
    return {
        'updated': updated,
        'sections': sections,
        'body_html': '',
    }


def load_guide_from_markdown(page_key):
    """Đọc trang hướng dẫn từ file MD — None nếu không có file."""
    path = _resolve_guide_path(page_key)
    if not path:
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return parse_markdown_guide(f.read())
    except Exception:
        return None


def load_guide_markdown_raw(page_key):
    """Đọc nội dung Markdown thô (cho admin chỉnh sửa)."""
    path = _resolve_guide_path(page_key)
    if not path:
        return ''
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ''


def save_guide_markdown(page_key, md_text):
    """Lưu file Markdown gốc và trả page dict đã parse."""
    path = _GUIDE_FILES.get(page_key)
    if not path:
        raise ValueError(f'Unknown guide page: {page_key}')
    text = (md_text or '').strip()
    if not text:
        raise ValueError('Nội dung Markdown trống')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
        if not text.endswith('\n'):
            f.write('\n')
    return parse_markdown_guide(text)


def load_all_guide_markdown_raw():
    return {
        'user_guide': load_guide_markdown_raw('user_guide'),
        'installation_guide': load_guide_markdown_raw('installation_guide'),
    }
