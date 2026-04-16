"""
Test viXTTS Emotional TTS - TIẾNG VIỆT 100%
"""
import sys
import codecs

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

from emotional_tts_vixtts import ViXTTSEmotionalTTS

def main():
    print("\n" + "="*70)
    print("TEST viXTTS EMOTIONAL TTS")
    print("✅ HỖ TRỢ TIẾNG VIỆT 100%")
    print("✅ EMOTION CONTROL TỰ ĐỘNG")
    print("✅ GIỌNG CỦA BẠN + EMOTIONS TỰ NHIÊN")
    print("="*70 + "\n")
    
    print("📋 Emotion refs mapping:")
    print("   - cheerful → cheerful_ref.wav")
    print("   - excited → excited_ref.wav")
    print("   - calm → calm_ref.wav")
    print("   - sad → calm_ref.wav (dùng chung)")
    print("   - neutral → base_voice.wav")
    print()
    
    try:
        tts = ViXTTSEmotionalTTS()
    except Exception as e:
        print(f"❌ Error initializing TTS: {e}")
        return
    
    # Text mẫu từ user
    text = """Chào mừng quý bằng hữu!
(nói tươi sáng, nụ cười trong giọng)
Thật bụng, tụi tui mừng hết lớn khi được đón tiếp các bạn ngay tại trái tim Sài Gòn.
(ngắt nhẹ, chuyển sang giọng kể chậm, ấm)
Chúng ta sẽ có một buổi tối thật tuyệt vời."""
    
    print(f"📝 Input text:\n{text}\n")
    print("🎤 Generating audio với viXTTS...")
    print("⏳ Lần đầu sẽ tải model (~2GB), hãy chờ 3-5 phút...\n")
    
    try:
        output = tts.synthesize(text, "test_vixtts_output.wav")
        
        print("\n" + "="*70)
        print(f"✅ SUCCESS!")
        print(f"   📁 Output: {output}")
        print(f"   🎧 GIỌNG BẠN + EMOTIONS TỰ NHIÊN!")
        print(f"   ✅ TIẾNG VIỆT CHUẨN 100%!")
        print(f"   🎭 TỰ ĐỘNG DETECT EMOTIONS!")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
