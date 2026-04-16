# 📚 English Phonetic Dictionary - JSON Format

## 📊 Tổng quan

Dictionary đã được tách ra thành **21 file JSON** để dễ quản lý và mở rộng.

**Tổng số từ: 615+ words**

---

## 📁 Cấu trúc thư mục

```
phonetic_dicts/
├── 01_greetings.json          (27 words)  - Chào hỏi & cụm từ thường dùng
├── 02_family.json             (28 words)  - Gia đình & con người
├── 03_technology.json         (46 words)  - Công nghệ
├── 04_social_media.json       (29 words)  - Mạng xã hội & thương hiệu
├── 05_pronouns.json           (35 words)  - Đại từ & từ cơ bản
├── 06_communication.json      (21 words)  - Ngôn ngữ & giao tiếp
├── 07_education.json          (22 words)  - Giáo dục
├── 08_home.json               (30 words)  - Nhà cửa & sinh hoạt
├── 09_food.json               (35 words)  - Đồ ăn & đồ uống
├── 10_emotions.json           (48 words)  - Cảm xúc & tính từ
├── 11_time.json               (45 words)  - Thời gian (ngày, tháng, giờ...)
├── 12_entertainment.json      (25 words)  - Giải trí
├── 13_shopping.json           (24 words)  - Mua sắm & tiền bạc
├── 14_transportation.json     (27 words)  - Giao thông vận tải
├── 15_business.json           (30 words)  - Công việc & kinh doanh
├── 16_medical.json            (24 words)  - Y tế & sức khỏe
├── 17_countries_asia.json     (31 words)  - Quốc gia Châu Á
├── 18_countries_europe.json   (33 words)  - Quốc gia Châu Âu
├── 19_countries_americas.json (17 words)  - Quốc gia Châu Mỹ
├── 20_countries_oceania_africa.json (13 words) - Châu Đại Dương & Châu Phi
└── 21_cities.json             (31 words)  - Thành phố lớn & thủ đô
```

---

## ✅ Ưu điểm của JSON format

| Tiêu chí | Trước (hardcode) | Sau (JSON) |
|----------|------------------|------------|
| **Số dòng code** | ~700 dòng | ~50 dòng ⬇️ 93% |
| **Dễ edit** | ❌ Cần biết Python | ✅ Edit JSON đơn giản |
| **Tốc độ load** | ⚡ 0ms | ⚡ ~100ms (one-time) |
| **Maintainability** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Collaboration** | ❌ Conflict nhiều | ✅ Ít conflict (21 files) |
| **Mở rộng** | ❌ Khó | ✅ Dễ (thêm file hoặc edit file) |
| **Hot-reload** | ❌ Không | ✅ Có thể implement |

---

## 📝 Format JSON

Mỗi file có format đơn giản:

```json
{
  "english_word": "phiên âm tiếng việt",
  "hello": "hé lô",
  "father": "phá thơ",
  "computer": "cờm piu tơ"
}
```

---

## ➕ Cách thêm từ mới

### Cách 1: Edit file JSON có sẵn

Mở file tương ứng (ví dụ `03_technology.json`) và thêm:

```json
{
  "existing_word": "phiên âm",
  "newword": "phiên âm mới",
  "anotherword": "phiên âm khác"
}
```

**Lưu ý**: Đảm bảo format JSON đúng (có dấu phẩy giữa các dòng, không có dấu phẩy ở dòng cuối).

### Cách 2: Tạo file JSON mới

Tạo file mới trong thư mục này:

```json
{
  "blockchain": "bờ lóc chen",
  "metaverse": "mé tà vớt",
  "nft": "en ép tì",
  "crypto": "crip tô"
}
```

Đặt tên file: `22_crypto.json`

Normalizer sẽ tự động load file mới khi khởi động.

### Cách 3: Custom dictionary path

Tạo file riêng ngoài folder này:

```python
normalizer = VietnameseTTSNormalizer(
    phonetic_dict_path="path/to/my_custom_words.json"
)
```

---

## 🧪 Test sau khi thêm từ

Chạy test script:

```bash
cd "d:\banduphong\LUANVAN (2) - Copy\LUANVAN (2) - Copy\LUANVAN\VieNeu-TTS-main\vieneu_utils"
python test_json_dict.py
```

Hoặc test trực tiếp:

```python
from normalize_text import VietnameseTTSNormalizer

normalizer = VietnameseTTSNormalizer()
print(f"Total words: {len(normalizer.english_phonetic)}")
print(f"New word: {normalizer.english_phonetic.get('yourword')}")
```

---

## 🔄 Hot-reload dictionary

Nếu bạn sửa JSON file và muốn reload mà không restart server:

```python
# Thêm method này vào class (nếu chưa có)
normalizer.reload_phonetic_dict()
```

---

## 📋 Danh sách từ theo category

### 🌍 Countries (94 words)
- **Asia** (31): Vietnam, Japan, Korea, China, Thailand, Singapore...
- **Europe** (33): England, France, Germany, Italy, Spain, Russia...
- **Americas** (17): USA, Canada, Mexico, Brazil, Argentina...
- **Oceania & Africa** (13): Australia, NewZealand, Egypt, SouthAfrica...

### 🏙️ Cities (31 words)
Tokyo, Paris, London, NewYork, Seoul, Beijing, Bangkok, Sydney...

### 💼 Business & Work (30 words)
work, job, company, manager, meeting, project, salary, customer...

### 📱 Technology (46 words)
computer, smartphone, internet, wifi, cloud, software, app...

### 🍔 Food & Drinks (35 words)
breakfast, lunch, dinner, coffee, pizza, burger, restaurant...

### ⏰ Time (45 words)
Monday-Sunday, January-December, today, tomorrow, morning...

### 👨‍👩‍👧‍👦 Family (28 words)
father, mother, brother, sister, son, daughter, husband, wife...

### 🎓 Education (22 words)
school, university, student, teacher, exam, homework, book...

### 🏥 Medical (24 words)
hospital, doctor, medicine, sick, fever, vaccine, pain...

### 🚗 Transportation (27 words)
car, bus, train, plane, airport, taxi, ticket, hotel...

Và nhiều category khác...

---

## 🎯 Ví dụ sử dụng

### Ví dụ 1: Countries
```
Input:  Tôi sống ở <en>Vietnam</en>, làm việc ở <en>Japan</en>, du lịch <en>France</en>
Output: tôi sống ở việt nam, làm việc ở giờ pàn, du lịch pờ ráng
```

### Ví dụ 2: Cities
```
Input:  Từ <en>Hanoi</en> bay sang <en>Tokyo</en>, sau đó <en>Paris</en>
Output: từ hà nội bay sang tô ki ô, sau đó pa ri
```

### Ví dụ 3: Business
```
Input:  <en>Manager</en> tổ chức <en>meeting</en> về <en>project</en>
Output: mé ni giờ tổ chức mí tinh về pờ rô giéc
```

---

## ⚠️ Lưu ý

1. **Format JSON phải đúng**: Không quên dấu phẩy, ngoặc kép
2. **Encoding UTF-8**: Lưu file với encoding UTF-8
3. **Key lowercase**: Tất cả key nên viết thường (hello, không phải Hello)
4. **Không duplicate**: Nếu 2 file có cùng key, file sau sẽ override file trước

---

## 🛠️ Troubleshooting

### Lỗi: "No JSON files found"
**Nguyên nhân**: Thư mục phonetic_dicts/ không tồn tại hoặc rỗng  
**Giải pháp**: Kiểm tra đường dẫn và đảm bảo có file .json

### Lỗi: "JSON decode error"
**Nguyên nhân**: Format JSON sai (thiếu dấu phẩy, ngoặc...)  
**Giải pháp**: Validate JSON bằng tool online (jsonlint.com)

### Lỗi: "Could not load xxx.json"
**Nguyên nhân**: File bị lỗi hoặc encoding sai  
**Giải pháp**: Kiểm tra encoding UTF-8, format JSON

### Từ không được convert
**Nguyên nhân**: Chưa có trong dictionary hoặc không dùng tag `<en>`  
**Giải pháp**: 
1. Thêm từ vào JSON file tương ứng
2. Đảm bảo dùng tag: `<en>word</en>`

---

## 📈 Statistics

- **Total words**: 615+
- **Total files**: 21 JSON files
- **Total size**: ~18KB (rất nhẹ!)
- **Load time**: ~100ms (chỉ load 1 lần khi khởi động)
- **Memory**: ~50KB in RAM

---

## 🎓 Best Practices

1. **Thêm từ vào đúng category**: Dễ tìm kiếm sau này
2. **Kiểm tra duplicate**: Tránh thêm từ đã có
3. **Test sau khi edit**: Chạy `test_json_dict.py`
4. **Backup trước khi sửa lớn**: Copy thư mục này ra chỗ khác
5. **Comment trong JSON**: JSON không hỗ trợ comment, nên tạo file `_notes.txt` nếu cần ghi chú

---

## 📞 Hỗ trợ

Nếu cần thêm từ mới hoặc category mới, liên hệ developer hoặc tự thêm vào JSON files!

**Version**: 3.0 - JSON Edition  
**Last Updated**: 28/03/2026  

🎤 **Happy Dictionary Editing!**
