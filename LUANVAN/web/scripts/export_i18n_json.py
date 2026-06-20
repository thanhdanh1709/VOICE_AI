"""One-off: export EN/VI dicts from static/js/i18n.js to static/i18n/*.json"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # web/
I18N_JS = ROOT / 'static' / 'js' / 'i18n.js'
OUT_DIR = ROOT / 'static' / 'i18n'


def parse_dict_block(block: str) -> dict:
    d = {}
    pattern = r"'([^']+)':\s*'((?:[^'\\]|\\.)*)'"
    for m in re.finditer(pattern, block):
        key = m.group(1)
        val = m.group(2).replace("\\'", "'").replace("\\n", "\n")
        d[key] = val
    return d


def add_aliases(d: dict) -> dict:
    aliases = {
        'home': 'nav.home',
        'tts': 'ws.title',
        'text_input': 'ws.placeholder',
        'generate': 'ws.btn.convert',
        'voice': 'ws.voice.label',
        'speed': 'rvc.pitch',
        'emotion': 'em.joy',
        'history': 'nav.history',
        'download': 'ws.result.download',
        'login': 'nav.login',
        'register': 'nav.register',
        'logout': 'nav.logout',
    }
    for alias, src in aliases.items():
        if src in d and alias not in d:
            d[alias] = d[src]
    return d


def main():
    content = I18N_JS.read_text(encoding='utf-8')
    en_start = content.index('const EN = {')
    en_end = content.index('};', en_start) + 2
    vi_start = content.index('const VI = {')
    vi_end = content.index('};', vi_start) + 2

    en = add_aliases(parse_dict_block(content[en_start:en_end]))
    vi = add_aliases(parse_dict_block(content[vi_start:vi_end]))

    en['i18n.translating'] = 'Translating...'
    vi['i18n.translating'] = 'Đang dịch...'
    en['ws.lang_warning'] = (
        'This system is optimized for Vietnamese text. '
        'Results with other languages may be less accurate.'
    )
    vi['ws.lang_warning'] = (
        'Hệ thống được tối ưu cho văn bản tiếng Việt. '
        'Kết quả với ngôn ngữ khác có thể không chính xác.'
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / 'en.json').write_text(json.dumps(en, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT_DIR / 'vi.json').write_text(json.dumps(vi, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'en: {len(en)} keys, vi: {len(vi)} keys')


if __name__ == '__main__':
    main()
