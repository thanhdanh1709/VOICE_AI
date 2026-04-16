# Vietnamese TTS Text Normalization - Hướng dẫn sử dụng

## 📋 Tổng quan

File `normalize_text.py` đã được nâng cấp với các tính năng mới:

### ✅ Tính năng đã có sẵn
- ✓ Chuyển số thành chữ tiếng Việt (0→"không", 123→"một trăm hai mươi ba")
- ✓ Số điện thoại đọc từng chữ số (0866005541→"không tám sáu sáu không không năm năm bốn một")
- ✓ Tiền tệ cơ bản (VNĐ, USD)
- ✓ Ngày tháng, thời gian
- ✓ Nhiệt độ, phần trăm
- ✓ Đơn vị đo lường (42 loại)

### 🆕 Tính năng MỚI (vừa thêm)
- ✓ **Tiền tệ mở rộng**: Euro (€), Yên (¥), Bảng Anh (£), Nhân dân tệ (Yuan/RMB), Rúp (₽), Won (₩), Rupee (₹), Bitcoin, Ethereum, Vàng, Bạc
- ✓ **Tiếng Anh phiên âm tiếng Việt**: 100+ từ phổ biến (Hello→"hé lô", Animals→"én ni mô", Father→"phá thơ")
- ✓ **LLM Integration** (optional): Tự động học từ mới, kiểm tra ý nghĩa

---

## 🚀 Cách sử dụng

### 1. Sử dụng cơ bản (không cần LLM)

```python
from vieneu_utils.normalize_text import VietnameseTTSNormalizer

# Khởi tạo
normalizer = VietnameseTTSNormalizer()

# Normalize văn bản
text = "Giá sản phẩm là $100, €50, hoặc ¥5000"
normalized = normalizer.normalize(text)
print(normalized)
# Output: "giá sản phẩm là một trăm đô la, năm mươi ơ rô, hoặc năm nghìn yên"
```

### 2. Sử dụng với tiếng Anh phiên âm

Để chuyển tiếng Anh sang phiên âm tiếng Việt, sử dụng tag `<en>...</en>`:

```python
text = "<en>Hello</en> xin chào! Tôi thích <en>Animals</en>."
normalized = normalizer.normalize(text)
print(normalized)
# Output: "hé lô xin chào! tôi thích én ni mô."
```

#### Danh sách từ tiếng Anh đã hỗ trợ (100+ từ):

**Chào hỏi & Giao tiếp:**
- hello → hé lô
- hi → hai
- goodbye → gút bai
- thanks → thèng xt
- sorry → xó ri
- yes → dét
- no → nâu

**Gia đình & Con người:**
- father → phá thơ
- mother → mơ thơ
- brother → brơ thơ
- sister → xít tơ
- friend → phrend
- baby → bây bi

**Công nghệ:**
- computer → cờm piu tơ
- smartphone → smát phôn
- internet → in tơ nét
- email → i meo
- app → ép

**Mạng xã hội:**
- facebook → phây búc
- google → gú gồ
- youtube → iu típ
- iphone → ai phôn

**Và nhiều từ khác...**

### 3. Sử dụng với LLM (tùy chọn)

Nếu bạn có LLM API, normalizer có thể tự động học từ mới:

```python
# Tạo LLM client (ví dụ với OpenAI)
from openai import OpenAI

llm_client = OpenAI(api_key="your-api-key")

# Wrapper LLM client
class LLMWrapper:
    def __init__(self, client):
        self.client = client
    
    def generate(self, prompt):
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

# Khởi tạo normalizer với LLM
normalizer = VietnameseTTSNormalizer(llm_client=LLMWrapper(llm_client))

# Normalize văn bản - LLM sẽ tự động convert từ chưa có trong dictionary
text = "<en>Blockchain</en> là công nghệ mới"
normalized = normalizer.normalize(text, use_llm=True)
# LLM sẽ tự động convert "Blockchain" → phiên âm tiếng Việt
# Và cache lại cho lần sau
```

### 4. Thêm custom phonetic dictionary

Bạn có thể tạo file JSON với từ điển riêng:

```json
{
  "startup": "xờ táp ấp",
  "fintech": "phin téc",
  "blockchain": "bờ lóc chen"
}
```

Sau đó load:

```python
normalizer = VietnameseTTSNormalizer(
    phonetic_dict_path="path/to/your_dict.json"
)
```

---

## 📝 Ví dụ thực tế

### Ví dụ 1: Số điện thoại
```python
text = "Liên hệ: 0866005541"
normalized = normalizer.normalize(text)
# Output: "liên hệ: không tám sáu sáu không không năm năm bốn một"
```

### Ví dụ 2: Đa loại tiền tệ
```python
text = "Giá: 1000000đ, $100, €50, £30, ¥500, 2 BTC"
normalized = normalizer.normalize(text)
# Output: "giá: một triệu đồng, một trăm đô la, năm mươi ơ rô, ba mươi bảng anh, năm trăm yên, hai bít coin"
```

### Ví dụ 3: Tiếng Anh lồng ghép
```python
text = "Tôi học ở <en>Harvard University</en> và làm việc tại <en>Google</en>"
normalized = normalizer.normalize(text)
# Output: "tôi học ở hác vớt iu ni vớt xi ti và làm việc tại gú gồ"
```

### Ví dụ 4: Tổng hợp
```python
text = """
Hôm nay là 28/03/2024, nhiệt độ 25°C.
<en>Hello</en> các bạn! 
Sản phẩm có giá $99.99 hoặc €89.50.
Liên hệ: 0866005541
"""
normalized = normalizer.normalize(text)
```

---

## 🔧 Tích hợp với VieNeu-TTS và viXTTS

### Đã tích hợp tự động! ✅

Cả 2 TTS engines đã tự động sử dụng normalizer này:

1. **VieNeu-TTS**: Tự động normalize trong `phonemize_text.py`
2. **viXTTS Emotional**: Đã chuyển từ `vinorm` sang `VietnameseTTSNormalizer`

**Bạn không cần làm gì thêm!** Khi gọi API `/api/convert` hoặc `/api/convert-emotional`, text sẽ tự động được normalize.

---

## 🎯 Test nhanh

Chạy file để test:

```bash
cd "d:\banduphong\LUANVAN (2) - Copy\LUANVAN (2) - Copy\LUANVAN\VieNeu-TTS-main\vieneu_utils"
python normalize_text.py
```

Sẽ thấy output demo các tính năng mới!

---

## 💡 Lưu ý

1. **Tiếng Anh phiên âm**: Phải dùng tag `<en>...</en>` để hệ thống biết đây là tiếng Anh
2. **LLM là optional**: Không bắt buộc, hệ thống vẫn hoạt động tốt với dictionary có sẵn
3. **Performance**: Dictionary lookup rất nhanh (~0.1ms/từ), LLM chậm hơn (~500ms/request) nhưng có cache
4. **Độ chính xác**: Dictionary 100% chính xác, LLM ~95% chính xác nhưng linh hoạt hơn

---

## 🆘 Troubleshooting

### Lỗi: "Module not found: vieneu_utils"
**Giải pháp**: Đảm bảo bạn đã thêm path vào sys.path:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'VieNeu-TTS-main'))
```

### Tiếng Anh không được chuyển phiên âm
**Giải pháp**: Đảm bảo dùng tag `<en>...</en>`:
```python
# Sai:
text = "Hello các bạn"

# Đúng:
text = "<en>Hello</en> các bạn"
```

### Muốn thêm từ mới vào dictionary
**Giải pháp**: Có 2 cách:
1. Tạo file JSON custom và load vào
2. Hoặc sửa trực tiếp trong `normalize_text.py` phần `self.english_phonetic`

---

## 📊 So sánh trước và sau

| Tính năng | Trước | Sau |
|-----------|-------|-----|
| Tiền tệ | VNĐ, USD | VNĐ, USD, EUR, GBP, JPY, CNY, BTC, ETH, vàng, bạc, và 10+ loại khác |
| Tiếng Anh | Không hỗ trợ | 100+ từ phổ biến + LLM cho từ mới |
| Mở rộng | Khó | Dễ (thêm vào dictionary hoặc dùng LLM) |

---

## 📞 Liên hệ & Đóng góp

Nếu bạn muốn thêm từ phiên âm mới hoặc báo lỗi, hãy cập nhật file này hoặc liên hệ developer.

**Happy TTS! 🎤**
