# 🎙️ Custom Voice / Voice Cloning Feature

## 📋 Tổng quan

Tính năng **Custom Voice** cho phép users upload audio sample của chính mình để tạo giọng nói AI tùy chỉnh. System sử dụng RVC (Retrieval-based Voice Conversion) để train model giọng nói.

---

## ✨ Tính năng chính

### **1. Quản lý giọng custom**
- Mỗi user có library giọng riêng
- Upload audio samples (WAV, MP3, M4A)
- Training hybrid mode (realtime/background)
- Test giọng trước khi sử dụng
- Xóa, sửa giọng đã tạo

### **2. Hybrid Training Mode**
- **Realtime (<5 phút):** Training ngay, đợi ~30-60 giây
- **Background (>5 phút):** Training trong background ~2-3 giờ, nhận notification khi xong

### **3. Quality Assessment**
- Tự động đánh giá chất lượng audio
- Score từ 0-10 (dựa trên noise, volume, clipping)
- Suggestions để improve audio quality

### **4. Integration với TTS**
- Custom voices xuất hiện trong dropdown "Chọn giọng"
- Phân biệt system voices vs custom voices
- Sử dụng ngay sau khi training xong

---

## 🏗️ Architecture

### **Backend Components:**

```
backend/
├── voice_training.py        # Core training service
├── audio_processor.py       # Audio preprocessing & validation
├── background_worker.py     # Background job processor
├── rvc_wrapper.py          # RVC integration (existing)
└── app.py                  # Flask routes
```

### **Frontend Components:**

```
frontend/
├── templates/
│   ├── my_voices.html      # Voice library page
│   └── add_voice.html      # Upload & train page
├── static/js/
│   ├── my-voices.js        # Voice management logic
│   └── add-voice.js        # Upload & training logic
└── static/css/
    └── style.css           # Custom voice styles
```

### **Database Tables:**

```sql
custom_voices       # Store custom voice info
training_queue      # Background training jobs
voice_usage_logs    # Usage statistics
```

---

## 🚀 Setup Instructions

### **Step 1: Run SQL Schema**

```bash
# Connect to MySQL
mysql -u root -p your_database

# Run schema file
source custom_voices_schema.sql
```

Hoặc copy/paste SQL từ `custom_voices_schema.sql` vào MySQL Workbench.

### **Step 2: Install Dependencies**

Dependencies đã có trong `requirements.txt`:
- ✅ `librosa` - Audio processing
- ✅ `soundfile` - Audio I/O
- ✅ `numpy` - Numerical operations
- ✅ `scipy` - Scientific computing

### **Step 3: Create Directories**

```bash
cd web
mkdir -p uploads/custom_voices
mkdir -p models/custom_voices
mkdir -p processed/custom_voices
```

Hoặc chạy app, directories sẽ tự động được tạo.

### **Step 4: Start Server**

```bash
python app.py
```

Background worker sẽ tự động start khi app khởi động.

---

## 📱 User Flow

### **Flow 1: Thêm giọng mới (Realtime)**

```
1. Vào "Giọng của tôi" (navbar)
2. Click "Thêm giọng mới"
3. Upload audio (<5 phút)
4. Nhập tên giọng: "Giọng của tôi"
5. Click "Bắt đầu training"
6. Đợi 30-60 giây (realtime training)
7. ✅ Training xong!
8. Test giọng với sample text
9. Sử dụng trong TTS chính
```

### **Flow 2: Thêm giọng mới (Background)**

```
1. Vào "Giọng của tôi"
2. Click "Thêm giọng mới"
3. Upload audio (5-15 phút)
4. Nhập tên giọng
5. Click "Bắt đầu training"
6. Thông báo: "Đã thêm vào hàng đợi"
7. Đóng trang, làm việc khác
8. Sau 2-3 giờ: Nhận notification
9. Quay lại "Giọng của tôi"
10. ✅ Giọng đã sẵn sàng!
```

---

## 🎯 API Endpoints

### **1. My Voices Page**
```
GET /my-voices
```
Hiển thị danh sách custom voices của user

### **2. Add Voice Page**
```
GET /add-voice
```
Form upload audio và train voice

### **3. Upload Custom Voice**
```
POST /api/custom-voice/upload

Body (form-data):
- audio_file: File
- voice_name: string
- description: string (optional)

Response:
{
    "success": true,
    "custom_voice_id": 123,
    "training_mode": "realtime" | "background",
    "message": "...",
    "quality_score": 8.5,
    "quality_message": "✅ Chất lượng tốt",
    "duration": 180.5
}
```

### **4. Get Training Progress**
```
GET /api/custom-voice/<voice_id>/progress

Response:
{
    "status": "processing",
    "progress": 65,
    "error": null,
    "quality_score": 8.5
}
```

### **5. Test Custom Voice**
```
POST /api/custom-voice/<voice_id>/test

Body:
{
    "text": "Sample text to test"
}

Response:
{
    "success": true,
    "message": "Test thành công",
    "audio_url": "/api/audio/test_voice.wav"
}
```

### **6. Delete Custom Voice**
```
DELETE /api/custom-voice/<voice_id>/delete

Response:
{
    "success": true,
    "message": "Voice deleted successfully"
}
```

### **7. List Custom Voices**
```
GET /api/custom-voices/list

Response:
{
    "success": true,
    "voices": [
        {
            "id": 123,
            "name": "Giọng của tôi",
            "status": "completed",
            "quality_score": 8.5,
            "created_at": "2026-01-25T10:30:00",
            "usage_count": 5
        }
    ]
}
```

### **8. Worker Status (Admin)**
```
GET /api/worker/status

Response:
{
    "running": true,
    "queue_stats": {
        "queued": 2,
        "processing": 1,
        "completed": 15,
        "failed": 0
    }
}
```

---

## 💾 File Structure

### **Uploaded Audio:**
```
uploads/custom_voices/
├── user_1/
│   ├── 1_1706234567_my_voice.wav
│   └── 1_1706235678_another.mp3
└── user_2/
    └── 2_1706236789_voice.wav
```

### **Trained Models:**
```
models/custom_voices/
├── user_1/
│   ├── voice_1.pth       # RVC model
│   ├── voice_1.index     # Feature index
│   ├── voice_2.pth
│   └── voice_2.index
└── user_2/
    ├── voice_3.pth
    └── voice_3.index
```

### **Processed Audio:**
```
processed/custom_voices/
├── user_1/
│   └── voice_1_processed.wav
└── user_2/
    └── voice_3_processed.wav
```

---

## 🔧 Technical Details

### **Audio Requirements:**

| Parameter | Value |
|-----------|-------|
| Format | WAV, MP3, M4A |
| Sample Rate | Auto-converted to 16kHz |
| Duration | 30 seconds - 15 minutes |
| File Size | Max 100MB |
| Quality | Clean, no noise/echo |

### **Training Process:**

```python
# Simplified workflow
1. Upload audio → Validate
2. Check quality → Score 0-10
3. Decide mode (realtime vs background)
4. Preprocess audio:
   - Resample to 16kHz
   - Remove silence
   - Normalize volume
5. Extract features:
   - Pitch (F0)
   - MFCCs
   - Mel spectrogram
6. Train RVC model (or queue if background)
7. Create feature index
8. Save model to database
9. Notify user (if background)
```

### **Training Time Estimates:**

| Audio Length | GPU | Training Time | Mode |
|--------------|-----|---------------|------|
| < 5 minutes | RTX 3050 | 30-60 seconds | Realtime |
| 5-10 minutes | RTX 3050 | 1-2 hours | Background |
| 10-15 minutes | RTX 3050 | 2-3 hours | Background |

---

## 🎨 UI/UX Features

### **My Voices Page:**
- Grid layout với voice cards
- Status indicators (✅ Completed, ⏳ Processing, ❌ Failed)
- Progress bars cho voices đang training
- Quick actions: Test, Use, Delete
- Auto-refresh cho processing voices

### **Add Voice Page:**
- Drag & drop upload area
- File validation với instant feedback
- Quality assessment preview
- Step-by-step wizard
- Progress tracking (realtime/background)
- Tips card cho audio quality

### **Integration với TTS:**
- Custom voices trong dropdown với optgroup
- Phân biệt rõ: "🎤 Giọng hệ thống" vs "🎙️ Giọng của tôi"
- Quality score hiển thị: "Giọng của tôi ⭐8.5"
- Auto-select khi navigate từ My Voices

---

## 🔒 Security

### **Access Control:**
- Users chỉ xem/sử dụng voices của mình
- Admin có thể xem tất cả voices (future feature)
- File paths được validate để prevent path traversal

### **File Validation:**
- Check file type (WAV, MP3, M4A only)
- Check file size (max 100MB)
- Check duration (30s - 15 minutes)
- Validate audio integrity

### **Database:**
- Foreign key constraints
- ON DELETE CASCADE để cleanup tự động
- Indexes cho performance

---

## 📊 Statistics & Analytics

### **Voice Usage Tracking:**
```python
# Log mỗi khi custom voice được sử dụng
INSERT INTO voice_usage_logs 
(custom_voice_id, user_id, text_length, audio_duration)
VALUES (?, ?, ?, ?)
```

### **Popular Voices:**
```sql
SELECT cv.voice_name, COUNT(*) as usage_count
FROM custom_voices cv
JOIN voice_usage_logs vul ON cv.id = vul.custom_voice_id
GROUP BY cv.id
ORDER BY usage_count DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### **Issue: "Audio file not found"**
**Cause:** File path invalid or file deleted
**Solution:** Check `uploads/custom_voices/user_X/` directory

### **Issue: "Training stuck at 0%"**
**Cause:** Background worker not running
**Solution:** Restart app or check worker status at `/api/worker/status`

### **Issue: "Quality score very low"**
**Cause:** Noisy audio, too quiet, or clipping
**Solution:** 
- Record in quiet environment
- Use good microphone
- Check volume levels (not too quiet, not clipping)

### **Issue: "Training failed after upload"**
**Cause:** Missing dependencies or audio corruption
**Solution:**
- Check logs for specific error
- Verify `librosa`, `soundfile` installed
- Try re-uploading with different audio file

---

## 🚀 Future Enhancements

### **Phase 2 Features:**
- [ ] Voice mixing (blend 2 voices 50-50)
- [ ] Voice marketplace (share với users khác)
- [ ] Web recording (thu âm trực tiếp trên browser)
- [ ] Batch upload (nhiều files cùng lúc)
- [ ] Voice preview before training (zero-shot)
- [ ] Email notifications khi training xong
- [ ] Voice analytics dashboard
- [ ] Export/import trained models

### **Advanced Features:**
- [ ] Multi-speaker training
- [ ] Emotion control (happy, sad, angry)
- [ ] Speed/pitch adjustment for custom voices
- [ ] Voice similarity search
- [ ] Auto-generated training scripts (text to read)

---

## 📚 References

- **RVC:** [Retrieval-based Voice Conversion](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI)
- **Librosa:** [Audio analysis library](https://librosa.org/)
- **Soundfile:** [Audio I/O](https://python-soundfile.readthedocs.io/)

---

## 🎯 Testing Checklist

### **Basic Flow:**
- [ ] Upload audio (<5 min) → Realtime training
- [ ] Upload audio (>5 min) → Background training
- [ ] Check progress updates real-time
- [ ] Test voice after training complete
- [ ] Use custom voice in main TTS
- [ ] Delete custom voice

### **Edge Cases:**
- [ ] Upload invalid file type → Error message
- [ ] Upload too long audio (>15 min) → Rejected
- [ ] Upload too short audio (<30s) → Rejected
- [ ] Upload corrupted audio → Handled gracefully
- [ ] Training failed → Retry available
- [ ] Background training → Notification works

### **UI/UX:**
- [ ] Empty state when no voices
- [ ] Loading states during upload
- [ ] Progress bars animate smoothly
- [ ] Notifications appear correctly
- [ ] Dark mode works properly
- [ ] Responsive on mobile

---

## ✅ Implementation Complete!

**Files Created:**
1. ✅ `custom_voices_schema.sql` - Database schema
2. ✅ `audio_processor.py` - Audio preprocessing
3. ✅ `voice_training.py` - Training service
4. ✅ `background_worker.py` - Background jobs
5. ✅ `templates/my_voices.html` - Voice library page
6. ✅ `templates/add_voice.html` - Upload page
7. ✅ `static/js/my-voices.js` - Frontend logic
8. ✅ `static/js/add-voice.js` - Upload logic
9. ✅ `static/css/style.css` - Updated with styles

**Files Modified:**
1. ✅ `app.py` - Added custom voice routes
2. ✅ `templates/base.html` - Added navbar link
3. ✅ `static/js/index.js` - Integrated custom voices dropdown

---

**🎉 Ready to use! Bắt đầu bằng cách chạy SQL schema và upload giọng đầu tiên!**
