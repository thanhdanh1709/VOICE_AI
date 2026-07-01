# Text Normalization — Gap Analysis (Phase 0)

Ngày: 2026-06-26  
Lõi hiện có: `VieNeu-TTS-main/vieneu_utils/normalize_text.py` (`VietnameseTTSNormalizer`)

## Quyết định kiến trúc

| Phương án | Ưu | Nhược | Quyết định |
|-----------|-----|-------|------------|
| Mở rộng trực tiếp `normalize_text.py` | Một file duy nhất | Khó bật/tắt rule theo admin; coupling với VieNeu-TTS | Không chọn làm điểm vào chính |
| Wrapper `web/text_normalization.py` | Tập trung route TTS, rule groups, preview API | Thêm một lớp indirection | **Đã chọn** |

Pipeline: `URL → email → math → VietnameseTTSNormalizer (core)`.

## Kết quả chạy 40 câu test (trước wrapper)

| Nhóm | Số câu | Trạng thái lõi cũ | Gap |
|------|--------|-------------------|-----|
| SĐT | 3 | ✅ | — |
| Tiền tệ VND/USD/EUR/… | 8 | ✅ | — |
| Ngày/giờ | 2 | ✅ | — |
| Đơn vị, nhiệt độ, % | 5 | ✅ | — |
| IP, version | 2 | ✅ | — |
| `<en>` phonetic | 2 | ✅ | — |
| **Email** | 4 | ❌ | Đọc `@`, `.` như ký tự |
| **URL** | 4 | ❌ | Đọc `https://`, `/` không tự nhiên |
| **Toán học** | 5 | ❌ | `×`, `÷`, `√`, `²`, `≥` không chuyển |
| Emotional tags | 1 | ⚠️ | Chỉ Emotional route; Basic/OmniVoice không TN |
| Văn bản thuần | 1 | ✅ | — |

**Tổng gap chính:** email (4), URL (4), toán (5), thiếu TN ở Basic + OmniVoice (2 route).

## Sau triển khai Phase 1–3

- `normalize_for_tts()` trong `web/text_normalization.py`
- Gắn 3 route: `/api/convert`, `/api/convert-emotional`, `/api/convert-omnivoice`
- Emotional: normalize 1 lần tại route, `skip_text_normalize=True` trong viXTTS
- Admin bật/tắt nhóm rule qua `site_settings.json → tn_rules`
- Preview: `POST /api/text/normalize-preview`

## Ví dụ before / after

| Input | Output (rút gọn) |
|-------|------------------|
| `support@vietvoice.app` | `support a còng vietvoice chấm app` |
| `https://vietvoice-ai.online` | `h t t p s hai chấm gạch chéo gạch chéo vietvoice gạch ngang ai chấm online` |
| `5 × 8 m²` | `5 nhân 8 mét vuông` (sau core) |
| `Giá $100` | `giá 100 đô la` |
| `Gọi 0866005541` | `gọi không tám sáu sáu không không năm năm bốn một` |

## Đánh giá luận ván (Phase 4 — checklist)

- [ ] Ghi âm 10 cặp có/không TN (cùng voice, cùng text)
- [ ] Bảng WER hoặc đánh giá cảm nhận (3 người nghe)
- [ ] Cập nhật `USER_GUIDE.md` mục "Chuẩn hóa văn bản"

Chạy lại test: `pytest web/tests/test_text_normalization.py -v`
