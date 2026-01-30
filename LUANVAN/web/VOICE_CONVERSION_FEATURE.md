# 🎛️ Voice Conversion Feature - Tính năng điều chỉnh giọng nói

## 🎯 Tổng quan

Tính năng **Voice Conversion** cho phép người dùng điều chỉnh và thay đổi giọng nói sau khi TTS tạo audio, sử dụng công nghệ RVC (Retrieval-based Voice Conversion) với các controls trực quan.

---

## ✨ Tính năng chính

### **1. Điều chỉnh Pitch (Cao độ)**
- Range: **-12 đến +12 semitones**
- Tăng pitch → Giọng cao hơn (nữ tính hơn)
- Giảm pitch → Giọng thấp hơn (nam tính hơn)
- Real-time slider với visual feedback

### **2. Độ pha trộn (Index Rate)**
- Range: **0.0 đến 1.0**
- 0 = Giọng gốc 100%
- 1 = Giọng đích 100%
- 0.75 = Cân bằng tốt (mặc định)

### **3. Bảo vệ phụ âm (Protect)**
- Range: **0.0 đến 0.5**
- Bảo vệ các âm vô thanh (f, s, t, k, etc.)
- Ngăn phụ âm bị biến dạng quá mức
- 0.33 = Giá trị tối ưu (mặc định)

### **4. Preset nhanh**
- 🎭 **Nam → Nữ**: Pitch +6, Index 0.8, Protect 0.4
- 🎭 **Nữ → Nam**: Pitch -6, Index 0.8, Protect 0.4
- 🎵 **Cao hơn**: Pitch +3
- 🎵 **Thấp hơn**: Pitch -3
- ↺ **Gốc**: Reset về mặc định

---

## 🎨 Giao diện người dùng

### **Voice Adjustment Panel**

```
┌─────────────────────────────────────────────┐
│ 🎛️ Điều chỉnh giọng nói                     │
│ Tinh chỉnh cao độ và tone giọng theo ý muốn │
├─────────────────────────────────────────────┤
│                                              │
│ Cao độ (Pitch):                    [+3]     │
│ [-12 ══════●══════════════ +12]              │
│    Âm thấp hơn ← | → Âm cao hơn              │
│                                              │
│ Độ pha trộn (Index Rate):         [0.75]    │
│ [0 ═══════════════●═══════ 1.0]              │
│    Giọng gốc ← | → Giọng đích                │
│                                              │
│ Bảo vệ phụ âm (Protect):          [0.33]    │
│ [0 ═════════●═════════════ 0.5]              │
│    Ít bảo vệ ← | → Nhiều bảo vệ              │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Cài đặt nhanh:                          │ │
│ │  [🎭 Nam→Nữ] [🎭 Nữ→Nam]               │ │
│ │  [🎵 Cao hơn] [🎵 Thấp hơn] [↺ Gốc]    │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│         [✨ Áp dụng hiệu ứng]                │
└─────────────────────────────────────────────┘
```

### **UI Components:**

1. **Slider với markers**
   - Custom styled range sliders
   - Gradient thumb với shadow
   - Visual markers cho các giá trị chính
   - Hover effects

2. **Value badges**
   - Real-time value display
   - Gradient background
   - Positioned next to label

3. **Preset buttons**
   - Grid layout responsive
   - Icon + label
   - Hover animations

4. **Apply button**
   - Full-width gradient button
   - Loading state
   - Disabled state khi processing

5. **Status messages**
   - Success (green)
   - Error (red)
   - Processing spinner
   - Auto-hide after timeout

---

## 🏗️ Kiến trúc hệ thống

### **1. Backend - Flask**

#### **API Endpoints:**

##### `/api/voice-conversion` (POST)
```python
Request:
{
    "audio_filename": "abc123.wav",
    "pitch": 3,              # -12 to +12
    "index_rate": 0.75,      # 0.0 to 1.0
    "protect": 0.33          # 0.0 to 0.5
}

Response (Success):
{
    "success": true,
    "message": "Voice conversion successful",
    "audio_filename": "abc123_pitch.wav",
    "audio_url": "/serve-audio/abc123_pitch.wav"
}

Response (Error):
{
    "success": false,
    "message": "Error message"
}
```

##### `/api/voice-conversion/check` (GET)
```python
Response:
{
    "available": true,
    "message": "Voice conversion is ready"
}
```

#### **RVC Wrapper Module (`rvc_wrapper.py`):**

```python
class RVCProcessor:
    def __init__(self):
        # Initialize RVC or fallback to simple pitch shift
    
    def is_available(self) -> bool:
        # Check if RVC is ready
    
    def adjust_voice(
        input_audio_path: str,
        model_path: Optional[str],
        f0_up_key: int,
        index_rate: float,
        protect: float
    ) -> Tuple[bool, str, str]:
        # Process audio and return (success, output_path, message)
```

**Fallback Strategy:**
- Nếu RVC không available → Dùng `librosa.effects.pitch_shift()`
- Simple pitch shift với chất lượng tốt
- Không cần models nặng

---

### **2. Frontend - JavaScript**

#### **Key Functions:**

```javascript
// Check availability on page load
async function checkVoiceConversionAvailability()

// Initialize sliders and event listeners
function initVoiceAdjustmentPanel()

// Show panel after TTS completes
function showVoiceAdjustmentPanel(audioFilename)

// Apply preset values
function applyPreset(preset)

// Send API request to convert voice
async function handleApplyVoiceEffect()

// Update audio player with new file
function updateAudioPlayer(audioUrl, audioFilename)
```

#### **Event Flow:**

```
1. User enters text → Click "Convert"
2. TTS generates audio ✓
3. Audio player shows
4. ↓
5. showVoiceAdjustmentPanel() is called
6. Panel slides in with animation
7. ↓
8. User adjusts sliders OR clicks preset
9. Sliders update value badges in real-time
10. ↓
11. User clicks "Apply Effect"
12. handleApplyVoiceEffect() → API call
13. Show loading spinner
14. ↓
15. Server processes audio (RVC or pitch shift)
16. Returns new audio file
17. ↓
18. updateAudioPlayer() updates src
19. New audio auto-plays
20. Success message shows
21. Panel stays open for more adjustments
```

---

### **3. CSS Styling**

#### **Key Classes:**

```css
.voice-adjustment-panel       /* Main panel container */
.slider-control               /* Each slider group */
.voice-slider                 /* Custom range input */
.slider-value                 /* Value badge */
.slider-markers               /* Marker labels */
.preset-buttons               /* Preset container */
.btn-preset                   /* Individual preset */
.btn-apply-effect             /* Apply button */
.effect-processing            /* Loading spinner */
.effect-message.success       /* Success message */
.effect-message.error         /* Error message */
```

#### **Design Highlights:**

- **Gradient sliders** với animated thumb
- **Smooth animations** (slideInUp, spin)
- **Dark mode support** với proper contrast
- **Responsive grid** cho preset buttons
- **Accessible** với proper ARIA labels (future)

---

## 🔧 Cài đặt và sử dụng

### **1. Dependencies:**

```bash
# Đã thêm vào requirements.txt
librosa==0.10.1
soundfile==0.12.1
scipy==1.11.4
numpy==1.24.3
```

**Cài đặt:**
```bash
cd d:\LUANVAN (2)\LUANVAN\web
pip install -r requirements.txt
```

### **2. Files đã tạo/sửa:**

```
web/
├── rvc_wrapper.py                    [NEW] RVC processor wrapper
├── app.py                             [MODIFIED] Added API endpoints
├── requirements.txt                   [MODIFIED] Added audio libs
├── templates/
│   └── index.html                     [MODIFIED] Added UI panel
├── static/
│   ├── css/
│   │   └── style.css                  [MODIFIED] Added panel styles
│   └── js/
│       └── index.js                   [MODIFIED] Added logic
└── VOICE_CONVERSION_FEATURE.md        [NEW] This file
```

### **3. Khởi động:**

```bash
# Start Flask server
python app.py

# Server runs on http://localhost:5000
```

### **4. Sử dụng:**

1. **Login** vào hệ thống
2. Vào trang **Trang chủ**
3. Nhập văn bản và chọn giọng
4. Click **"Chuyển đổi ngay"**
5. Đợi audio tạo xong
6. **Voice Adjustment Panel** sẽ xuất hiện
7. Điều chỉnh sliders hoặc chọn preset
8. Click **"Áp dụng hiệu ứng"**
9. Nghe audio mới và download nếu thích

---

## 🧪 Testing

### **Manual Testing Checklist:**

- [x] Panel xuất hiện sau TTS
- [ ] Sliders cập nhật giá trị real-time
- [ ] Preset buttons apply đúng values
- [ ] Apply button gửi request đúng
- [ ] Loading state hiện khi processing
- [ ] Success message hiện khi thành công
- [ ] Error message hiện khi lỗi
- [ ] Audio player update với file mới
- [ ] Download button update
- [ ] Audio tự động play (nếu allowed)
- [ ] Panel responsive trên mobile
- [ ] Dark mode styling đúng
- [ ] Multiple adjustments liên tiếp
- [ ] Slider accessibility (keyboard)

### **Test Cases:**

#### **Test 1: Pitch Adjustment**
```
Input: pitch = +6
Expected: Giọng cao hơn rõ rệt
Status: ⏳ Pending
```

#### **Test 2: Negative Pitch**
```
Input: pitch = -6
Expected: Giọng thấp hơn rõ rệt
Status: ⏳ Pending
```

#### **Test 3: Male to Female Preset**
```
Input: Click "Nam → Nữ" preset
Expected: pitch = +6, index = 0.8, protect = 0.4
Status: ⏳ Pending
```

#### **Test 4: Error Handling**
```
Input: Invalid audio filename
Expected: Error message "File audio không tồn tại"
Status: ⏳ Pending
```

#### **Test 5: Sequential Adjustments**
```
1. Apply pitch +3
2. Apply pitch +6 to result
Expected: Cumulative effect (pitch +9 total)
Status: ⏳ Pending
```

---

## 🐛 Known Issues

### **Issue 1: RVC Models Not Included**
- **Status**: Expected behavior
- **Impact**: Uses fallback pitch shift instead of full RVC
- **Solution**: 
  - Add RVC models (.pth files) to `web/rvc_models/`
  - Or use simple pitch shift (current default)

### **Issue 2: Processing Time**
- **Status**: Potential issue for long audio
- **Impact**: User waits 5-10s for processing
- **Mitigation**: 
  - Loading spinner shows
  - Consider background job queue (Celery)

### **Issue 3: Browser Auto-play**
- **Status**: Browser policy
- **Impact**: Audio may not auto-play after conversion
- **Mitigation**: User can click play manually

---

## 🚀 Future Enhancements

### **Phase 2 Features:**

1. **Advanced Controls**
   - Filter Radius
   - RMS Mix Rate
   - Resample SR
   - Formant shift

2. **Model Selection**
   - Upload custom RVC models
   - Select from available models
   - Train models on user voice

3. **Audio Effects**
   - Reverb
   - Echo
   - Noise reduction
   - Volume normalization

4. **Batch Processing**
   - Apply to multiple files
   - Process audio library
   - Export all

5. **Presets Manager**
   - Save custom presets
   - Share presets
   - Import/export

6. **A/B Comparison**
   - Compare original vs. adjusted
   - Side-by-side waveforms
   - Toggle between versions

7. **Visualization**
   - Real-time waveform
   - Spectrogram
   - Pitch tracking graph

---

## 📊 Performance

### **Processing Times** (estimated):

| Audio Length | Simple Pitch | Full RVC |
|--------------|--------------|----------|
| 10s          | 1-2s         | 3-5s     |
| 30s          | 2-3s         | 5-10s    |
| 1 min        | 3-5s         | 10-20s   |
| 3 min        | 8-12s        | 30-60s   |

*Times vary based on hardware (CPU/GPU)*

### **Memory Usage:**

- **Simple Pitch Shift**: ~100MB RAM
- **Full RVC**: ~500MB-1GB RAM (depends on model)

---

## 🔐 Security

### **Considerations:**

1. **Authentication**: 
   - Requires login to use
   - API checks `is_logged_in()`

2. **Input Validation**:
   - Pitch: -12 to +12
   - Index: 0.0 to 1.0
   - Protect: 0.0 to 0.5
   - Audio file exists check

3. **File Access**:
   - Only access files in `AUDIO_OUTPUT_DIR`
   - No path traversal
   - Secure filename handling

4. **Rate Limiting** (TODO):
   - Limit requests per user
   - Prevent abuse

---

## 📝 API Documentation

### **Voice Conversion Endpoint**

**URL:** `/api/voice-conversion`  
**Method:** `POST`  
**Auth:** Required (session)

**Request Body:**
```json
{
    "audio_filename": "string (required)",
    "pitch": "integer (-12 to +12, default 0)",
    "index_rate": "float (0.0 to 1.0, default 0.75)",
    "protect": "float (0.0 to 0.5, default 0.33)"
}
```

**Response 200 OK:**
```json
{
    "success": true,
    "message": "Voice conversion successful",
    "audio_filename": "abc123_pitch.wav",
    "audio_url": "/serve-audio/abc123_pitch.wav"
}
```

**Response 400 Bad Request:**
```json
{
    "success": false,
    "message": "Pitch phải trong khoảng -12 đến +12"
}
```

**Response 401 Unauthorized:**
```json
{
    "success": false,
    "message": "Vui lòng đăng nhập để sử dụng tính năng này"
}
```

**Response 404 Not Found:**
```json
{
    "success": false,
    "message": "File audio không tồn tại"
}
```

**Response 500 Internal Server Error:**
```json
{
    "success": false,
    "message": "Đã xảy ra lỗi khi xử lý. Vui lòng thử lại sau."
}
```

---

## 🎓 Technical Deep Dive

### **How RVC Works:**

1. **F0 Extraction**: Extract pitch contour from input audio
2. **F0 Adjustment**: Shift pitch by semitones
3. **Feature Extraction**: Extract mel-spectrogram features
4. **Model Inference**: Convert features using trained model
5. **Vocoding**: Generate waveform from converted features
6. **Post-processing**: Mix with original (index rate), protect consonants

### **Fallback: Simple Pitch Shift:**

```python
import librosa

# Load audio
y, sr = librosa.load(input_path, sr=None)

# Pitch shift using phase vocoder
y_shifted = librosa.effects.pitch_shift(
    y=y,
    sr=sr,
    n_steps=semitones  # -12 to +12
)

# Save
sf.write(output_path, y_shifted, sr)
```

**Advantages:**
- Fast (1-3 seconds)
- No models needed
- Good quality for moderate shifts

**Limitations:**
- Cannot change voice character (only pitch)
- Artifacts on extreme shifts (±12)
- No timbre control

---

## 📚 References

- [RVC Project](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion)
- [Librosa Documentation](https://librosa.org/doc/latest/index.html)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## ✅ Completion Status

### **Phase 1: Core Implementation** ✓

- ✅ RVC wrapper module
- ✅ Backend API endpoints
- ✅ UI panel with sliders
- ✅ JavaScript integration
- ✅ CSS styling
- ✅ Preset buttons
- ✅ Error handling
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Documentation

### **Phase 2: Testing** ⏳

- ⏳ Manual testing
- ⏳ Browser compatibility
- ⏳ Performance optimization
- ⏳ User feedback

### **Phase 3: Advanced Features** 📋

- 📋 Full RVC with models
- 📋 Advanced controls
- 📋 Batch processing
- 📋 Visualization

---

**Status:** ✅ **Core feature complete and ready for testing!**

**Next Steps:**
1. Install dependencies (`pip install -r requirements.txt`)
2. Run server (`python app.py`)
3. Test voice conversion feature
4. Gather user feedback
5. Iterate and improve

---

*Documentation created: 2026-01-25*  
*Last updated: 2026-01-25*  
*Version: 1.0.0*
