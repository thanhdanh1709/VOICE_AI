# OmniVoice Emotion API — Phase 0 findings

## `OmniVoice.generate()` signature (venv_omnivoice)

Supports **simultaneously**:

- `ref_audio` + `ref_text` — voice clone identity
- `voice_clone_prompt` — cached clone prompt
- `instruct` — voice style / emotion description (English)
- `text`, `speed`, `language`, etc.

All parameters are passed to `_preprocess_all()` — **not mutually exclusive** at API level.

## Decision

| Feature | Approach |
|---------|----------|
| Emotion per segment | Map emotion → OmniVoice **whitelist** `instruct` (pitch/age), EN or ZH by chunk text |
| Voice Clone + Emotion | `ref_audio` + `instruct` on same `generate()` call |
| Multi-chunk same voice | `save_ref_voice_session` / `voice_session` (existing) |
| Text tags | Shared `emotion_parser.py` (Vi/En/Zh keywords + aliases) |

## Instruct examples (tuned for OmniVoice)

See `emotion_parser.EMOTION_TO_INSTRUCT_EN` / `EMOTION_TO_INSTRUCT_ZH`.

OmniVoice only accepts fixed tags (e.g. `young adult, moderate pitch` or `青年，中音调`) — not free-text like "cheerful, warm".

## Limitations

- Emotion quality depends on OmniVoice instruct understanding per language.
- viXTTS uses reference WAV; OmniVoice uses text instruct (different mechanism).
- CPU mode recommended on 4GB VRAM laptops.
