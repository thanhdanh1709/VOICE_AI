# 🚀 Setup Custom Voice Feature - Hướng dẫn nhanh

## ⚡ Quick Start (3 bước)

### **Bước 1: Chạy SQL Schema** ⏱️ 2 phút

Mở MySQL Workbench hoặc terminal:

```sql
-- Connect to database
mysql -u root -p

-- Use your database
USE tts_system;  -- Thay bằng tên database của bạn

-- Run schema
source custom_voices_schema.sql;
```

**Hoặc** copy/paste nội dung file `custom_voices_schema.sql` vào MySQL Workbench và execute.

**Verify:**
```sql
SHOW TABLES LIKE 'custom_voices%';
-- Phải thấy: custom_voices, training_queue, voice_usage_logs
```

---

### **Bước 2: Create Directories** ⏱️ 30 giây

Mở PowerShell trong thư mục `web`:

```powershell
# Tạo thư mục cho uploads
New-Item -ItemType Directory -Path "uploads\custom_voices" -Force

# Tạo thư mục cho models
New-Item -ItemType Directory -Path "models\custom_voices" -Force

# Tạo thư mục cho processed audio
New-Item -ItemType Directory -Path "processed\custom_voices" -Force
```

**Hoặc** chỉ cần start server, directories sẽ tự động được tạo.

---

### **Bước 3: Restart Server** ⏱️ 1 phút

```powershell
# Stop server hiện tại (Ctrl+C)

# Start lại
python app.py
```

**Check logs:**
```
[INFO] Custom voice training is available
[WORKER] ✅ Background training worker started
```

Nếu thấy 2 dòng này → **Setup thành công! ✅**

---

## 🎯 Test Feature

### **Test 1: Upload voice nhỏ (Realtime)**

1. Vào: http://localhost:5000/my-voices
2. Click **"Thêm giọng mới"**
3. Upload file audio **<5 phút** (VD: 2 phút)
4. Nhập tên: **"Test Voice Realtime"**
5. Click **"Bắt đầu training"**
6. Đợi **30-60 giây** → Training xong!

### **Test 2: Upload voice lớn (Background)**

1. Vào: http://localhost:5000/my-voices
2. Click **"Thêm giọng mới"**
3. Upload file audio **>5 phút** (VD: 8 phút)
4. Nhập tên: **"Test Voice Background"**
5. Click **"Bắt đầu training"**
6. Thông báo: **"Đã thêm vào hàng đợi"**
7. Check sau vài giờ → Training xong!

### **Test 3: Sử dụng custom voice**

1. Vào trang chủ: http://localhost:5000
2. Dropdown **"Chọn giọng"**
3. Phải thấy section: **"🎙️ Giọng của tôi"**
4. Chọn custom voice
5. Nhập text → Convert
6. Nghe audio với giọng custom!

---

## 📂 Files Checklist

**Backend (Python):**
- ✅ `custom_voices_schema.sql` - Database schema
- ✅ `audio_processor.py` - Audio processing
- ✅ `voice_training.py` - Training service
- ✅ `background_worker.py` - Background worker
- ✅ `app.py` - Updated with routes

**Frontend (HTML/JS/CSS):**
- ✅ `templates/my_voices.html` - Voice library
- ✅ `templates/add_voice.html` - Upload page
- ✅ `static/js/my-voices.js` - Voice management
- ✅ `static/js/add-voice.js` - Upload & training
- ✅ `static/css/style.css` - Updated styles
- ✅ `templates/base.html` - Added navbar link

**Integration:**
- ✅ `static/js/index.js` - Custom voices in dropdown

**Documentation:**
- ✅ `CUSTOM_VOICE_FEATURE.md` - Full documentation
- ✅ `SETUP_CUSTOM_VOICE.md` - This file

---

## ⚠️ Common Issues

### Issue 1: "Custom voice feature not available"

**Cause:** Import errors trong Python modules

**Solution:**
```bash
# Check imports
python -c "import librosa, soundfile; print('OK')"

# If error, reinstall
pip install librosa soundfile numpy scipy
```

### Issue 2: "Worker not starting"

**Cause:** Background worker failed to start

**Solution:**
```bash
# Check logs when starting app
# Should see: [WORKER] ✅ Background training worker started

# If not, check for errors in voice_training.py or background_worker.py
```

### Issue 3: "Cannot upload file"

**Cause:** Directory permissions hoặc directories chưa tạo

**Solution:**
```powershell
# Create directories với full permissions
New-Item -ItemType Directory -Path "uploads\custom_voices" -Force
New-Item -ItemType Directory -Path "models\custom_voices" -Force
New-Item -ItemType Directory -Path "processed\custom_voices" -Force
```

### Issue 4: "Training progress stuck"

**Cause:** Frontend polling stopped hoặc backend crashed

**Solution:**
- Refresh page
- Check terminal logs for errors
- Check `/api/custom-voice/<id>/progress` manually
- Restart server if needed

---

## 🎓 Tips cho audio tốt

### **Recording Tips:**

1. **Environment:**
   - 🔇 Phòng kín, yên tĩnh
   - 🚫 Không echo, không tiếng vọng
   - 💨 Tắt quạt, điều hòa

2. **Microphone:**
   - 🎤 Dùng mic tốt (USB mic hoặc XLR)
   - 📏 Cách miệng ~15cm
   - 🎚️ Gain level vừa phải (không quá nhỏ, không clipping)

3. **Content:**
   - 📚 Đọc đa dạng loại câu (hỏi, khẳng định, phủ định)
   - 🎭 Đa dạng cảm xúc và ngữ điệu
   - 🗣️ Giọng tự nhiên, không cố làm giọng
   - ⏸️ Ngắt nghỉ hợp lý giữa các câu

4. **Duration:**
   - ⏱️ 5-10 phút là tối ưu
   - 📈 Càng dài, quality càng tốt (nhưng training lâu hơn)
   - 🎯 Ít nhất 30 giây, tối đa 15 phút

---

## 📞 Support

Nếu gặp vấn đề:
1. Check `CUSTOM_VOICE_FEATURE.md` cho chi tiết technical
2. Check logs trong terminal
3. Check database để verify tables đã tạo
4. Check file permissions cho upload directories

---

**🎉 Setup xong! Bắt đầu tạo giọng AI của riêng bạn!**

Vào: **http://localhost:5000/my-voices** để bắt đầu! 🚀
