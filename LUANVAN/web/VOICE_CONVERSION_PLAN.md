# 🎤 Voice Conversion Feature - Kế hoạch triển khai

## 🎯 Mục tiêu

Tích hợp RVC (Retrieval-based Voice Conversion) để cho phép user điều chỉnh giọng nói sau khi TTS tạo audio.

---

## 📋 Phân tích RVC

### **RVC là gì?**
- **Retrieval-based Voice Conversion**: Công nghệ AI chuyển đổi giọng nói
- **Input**: Audio file (.wav)
- **Output**: Audio file với giọng đã được điều chỉnh
- **Models**: Cần file .pth (PyTorch model) cho mỗi giọng

### **API Endpoint:**
```python
POST /inference
Parameters:
- input_audio: Path | UploadFile
- modelpath: Path to .pth file
- f0_up_key: int (-12 to +12) - Pitch adjustment
- f0_method: str - F0 detection method
- index_rate: float (0-1) - Model blend ratio
- protect: float (0-0.5) - Protect voiceless consonants
- rms_mix_rate: float (0-1) - Volume envelope mix
```

---

## 🎨 Design - User Flow

### **Workflow:**
```
1. User nhập text
2. Chọn giọng TTS
3. Click "Chuyển đổi"
4. TTS tạo audio
5. ↓
6. [NEW] Voice Adjustment Panel hiện ra
7. User điều chỉnh:
   - Pitch (cao độ): -12 → +12
   - Index Rate: 0 → 1
   - Protect: 0 → 0.5
8. Click "Apply Voice Effect"
9. Backend gọi RVC
10. Trả về audio đã điều chỉnh
```

### **UI Components:**

```
┌─────────────────────────────────────┐
│  Audio Output                        │
│  ┌──────────────────────────────┐  │
│  │ ▶️ Audio Player              │  │
│  └──────────────────────────────┘  │
│                                      │
│  🎛️ Voice Adjustment                │
│  ┌──────────────────────────────┐  │
│  │ Pitch: [-12 ←●─── 0] +12     │  │
│  │ Index: [0 ─────●──→ 1]       │  │
│  │ Protect: [0 ──●────→ 0.5]    │  │
│  │ [Apply Effects]               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🏗️ Implementation Plan

### **Phase 1: Setup (TODO rvc-1)**
- [ ] Check RVC dependencies in requirements.txt
- [ ] Install RVC package
- [ ] Setup .env for RVC
- [ ] Download base models (nếu cần)

### **Phase 2: Backend Wrapper (TODO rvc-2)**
File: `web/rvc_wrapper.py`
```python
from rvc.modules.vc.modules import VC
import tempfile
from pathlib import Path

class RVCProcessor:
    def __init__(self):
        self.vc = VC()
    
    def adjust_voice(
        self,
        input_audio_path: str,
        model_path: str,
        f0_up_key: int = 0,
        index_rate: float = 0.75,
        protect: float = 0.33
    ) -> str:
        # Process audio with RVC
        # Return output audio path
        pass
```

### **Phase 3: UI Controls (TODO rvc-3)**
File: `templates/index.html`
```html
<div class="voice-adjustment-panel" style="display: none;">
    <h3>🎛️ Voice Adjustment</h3>
    
    <div class="slider-control">
        <label>Pitch: <span id="pitchValue">0</span></label>
        <input type="range" id="pitchSlider" 
               min="-12" max="12" value="0" step="1">
    </div>
    
    <div class="slider-control">
        <label>Index Rate: <span id="indexValue">0.75</span></label>
        <input type="range" id="indexSlider" 
               min="0" max="1" value="0.75" step="0.05">
    </div>
    
    <div class="slider-control">
        <label>Protect: <span id="protectValue">0.33</span></label>
        <input type="range" id="protectSlider" 
               min="0" max="0.5" value="0.33" step="0.01">
    </div>
    
    <button id="applyVoiceEffect" class="btn-primary">
        Apply Voice Effect
    </button>
</div>
```

### **Phase 4: Backend API (TODO rvc-4)**
File: `app.py`
```python
@app.route('/api/voice-conversion', methods=['POST'])
def voice_conversion():
    data = request.get_json()
    audio_path = data.get('audio_path')
    pitch = data.get('pitch', 0)
    index_rate = data.get('index_rate', 0.75)
    protect = data.get('protect', 0.33)
    
    # Process with RVC
    rvc = RVCProcessor()
    output_path = rvc.adjust_voice(
        audio_path,
        model_path="default_model.pth",
        f0_up_key=pitch,
        index_rate=index_rate,
        protect=protect
    )
    
    return jsonify({
        'success': True,
        'audio_url': url_for('serve_audio', filename=output_path)
    })
```

### **Phase 5: JavaScript (TODO rvc-5)**
File: `static/js/index.js`
```javascript
// Show voice adjustment panel after TTS
function showVoiceAdjustmentPanel(audioPath) {
    const panel = document.querySelector('.voice-adjustment-panel');
    panel.style.display = 'block';
    panel.dataset.audioPath = audioPath;
}

// Apply voice effects
document.getElementById('applyVoiceEffect').addEventListener('click', async () => {
    const audioPath = panel.dataset.audioPath;
    const pitch = document.getElementById('pitchSlider').value;
    const indexRate = document.getElementById('indexSlider').value;
    const protect = document.getElementById('protectSlider').value;
    
    const response = await fetch('/api/voice-conversion', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            audio_path: audioPath,
            pitch: parseInt(pitch),
            index_rate: parseFloat(indexRate),
            protect: parseFloat(protect)
        })
    });
    
    const data = await response.json();
    if (data.success) {
        // Update audio player with new audio
        updateAudioPlayer(data.audio_url);
    }
});
```

### **Phase 6: CSS Styling (TODO rvc-6)**
File: `static/css/style.css`
```css
.voice-adjustment-panel {
    background: var(--bg-white);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    margin-top: var(--spacing-lg);
    box-shadow: var(--shadow-md);
}

.slider-control {
    margin-bottom: var(--spacing-md);
}

.slider-control label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
}

.slider-control input[type="range"] {
    width: 100%;
    height: 8px;
    border-radius: 5px;
    background: var(--bg-light);
    outline: none;
}

.slider-control input[type="range"]::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-gradient);
    cursor: pointer;
}
```

---

## 🔧 Technical Details

### **Dependencies:**
```txt
# Add to requirements.txt
rvc @ git+https://github.com/RVC-Project/Retrieval-based-Voice-Conversion
scipy
librosa
faiss-cpu  # or faiss-gpu
```

### **Environment Variables:**
```env
# .env
RVC_MODEL_PATH=./rvc_models/
RVC_INDEX_PATH=./rvc_indexes/
```

### **Models Needed:**
1. Base models (rmvpe, hubert)
2. Voice models (.pth files)
3. Index files (.index files)

---

## 🎯 Features

### **Basic Controls:**
- ✅ **Pitch Adjustment**: -12 to +12 semitones
- ✅ **Index Rate**: Blend between original and target voice
- ✅ **Protect**: Protect consonants from over-processing

### **Advanced (Optional):**
- Filter Radius: Median filtering
- RMS Mix Rate: Volume envelope blending
- Resample SR: Output sample rate

### **Presets:**
- 🎭 Male → Female (+6 pitch)
- 🎭 Female → Male (-6 pitch)
- 🎵 Higher Pitch (+3)
- 🎵 Lower Pitch (-3)
- 🎤 Original (0)

---

## 🚧 Challenges & Solutions

### **Challenge 1: RVC requires models**
**Solution**: 
- Provide default model
- Or allow admin to upload models
- Or use TTS voices as base

### **Challenge 2: Processing time**
**Solution**:
- Show loading spinner
- Process in background
- Cache results

### **Challenge 3: Model compatibility**
**Solution**:
- Test with multiple model versions
- Provide fallback to simple pitch shift
- Clear error messages

---

## 📊 User Experience Flow

### **Happy Path:**
```
1. User enters text
2. Clicks "Convert"
3. TTS generates audio ✓
4. Audio plays automatically
5. Voice Adjustment panel appears
6. User adjusts sliders
7. Clicks "Apply Effects"
8. [Loading spinner]
9. New audio plays with effects ✓
10. User can download both versions
```

### **Edge Cases:**
- No model available → Show message, disable feature
- Processing fails → Revert to original audio
- Very long audio → Warn about processing time

---

## ✅ Testing Checklist

- [ ] RVC package installed correctly
- [ ] Can load model successfully
- [ ] Pitch adjustment works (-12 to +12)
- [ ] Index rate affects voice blend
- [ ] Protect parameter works
- [ ] UI sliders update values correctly
- [ ] Apply button triggers conversion
- [ ] Loading state shows during processing
- [ ] Error handling works
- [ ] Audio player updates with new file
- [ ] Can download adjusted audio
- [ ] Works on different browsers
- [ ] Mobile responsive

---

## 📝 Next Steps

1. **Setup RVC** - Install và configure
2. **Test locally** - Verify RVC works standalone
3. **Integrate wrapper** - Create Python wrapper
4. **Build UI** - Add sliders and controls
5. **Connect API** - Wire up frontend to backend
6. **Test end-to-end** - Full user flow
7. **Polish** - Error handling, loading states
8. **Document** - User guide

---

**Ready to implement! Let's start with Phase 1: Setup** 🚀
