
from vieneu import Vieneu
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def main():
    print("Initializing local VieNeu engine...")
    
    # Get the directory where main.py is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    outputs_dir = os.path.join(script_dir, "outputs")
    os.makedirs(outputs_dir, exist_ok=True)
    print(f"Output directory: {outputs_dir}")
    
    # ---------------------------------------------------------
    # PART 1: INITIALIZATION
    # ---------------------------------------------------------
    # Mode="standard" (default) runs locally. 
    # By default, it uses "pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf" (Backbone)
    # and "neuphonic/distill-neucodec" (Codec) for maximum speed.
    tts = Vieneu()
    
    # Optional: If you want to force use a specific PyTorch model:
    # tts = Vieneu(backbone_repo="pnnbao-ump/VieNeu-TTS-0.3B", codec_repo="neuphonic/distill-neucodec", backbone_device="cuda", codec_device="cuda")

    # ---------------------------------------------------------
    # PART 2: LIST PRESET VOICES
    # ---------------------------------------------------------
    # The SDK returns (Description, ID) tuples
    available_voices = tts.list_preset_voices()
    print(f"Found {len(available_voices)} preset voices.")
    
    if available_voices:
        print("   Showing all voices:")
        for desc, name in available_voices:
            print(f"   - {desc} (ID: {name})")

    # ---------------------------------------------------------
    # PART 3: USE SPECIFIC VOICE ID
    # ---------------------------------------------------------
    if available_voices:
        print("\n--- PART 3: Using Specific Voice ID ---")
        # Example: Select Tuyên (nam miền Bắc) - usually ID is 'Tuyen'
        _, my_voice_id = available_voices[1] if len(available_voices) > 1 else available_voices[0]
        print(f"Selecting voice: {my_voice_id}")
        
        # Get reference data for this specific voice
        voice_data = tts.get_preset_voice(my_voice_id)
        
        test_text = f"Chào bạn, người đang nói với bạn là vong."
        try:
            audio_spec = tts.infer(text=test_text, voice=voice_data)
            print(f"Audio generated, shape: {audio_spec.shape if hasattr(audio_spec, 'shape') else len(audio_spec)}")
            output_path = os.path.join(outputs_dir, f"standard_{my_voice_id}.wav")
            tts.save(audio_spec, output_path)
            # Verify file was created
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"Saved {my_voice_id} synthesis to: {output_path} ({file_size} bytes)")
            else:
                print(f"ERROR: File was not created at {output_path}")
        except Exception as e:
            print(f"Error in PART 3: {e}")
            import traceback
            traceback.print_exc()

    # ---------------------------------------------------------
    # PART 4: STANDARD SPEECH SYNTHESIS (DEFAULT)
    # ---------------------------------------------------------
    print("\n--- PART 4: Standard Synthesis (Default) ---")
    text = "Xin chào, tôi là Danh tôi thật mệt mỏi."
    
    print("Synthesizing speech...")
    # By default, it uses the model's 'default_voice'
    try:
        audio = tts.infer(text=text)
        print(f"Audio generated, shape: {audio.shape if hasattr(audio, 'shape') else len(audio)}")
        output_path = os.path.join(outputs_dir, "standard_output.wav")
        tts.save(audio, output_path)
        # Verify file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"Saved synthesized speech to: {output_path} ({file_size} bytes)")
        else:
            print(f"ERROR: File was not created at {output_path}")
    except Exception as e:
        print(f"Error in PART 4: {e}")
        import traceback
        traceback.print_exc()

    # ---------------------------------------------------------
    # PART 5: TEST THIRD VOICE (Ly - nữ miền Bắc)
    # ---------------------------------------------------------
    if available_voices and len(available_voices) > 2:
        print("\n--- PART 5: Testing Third Voice (Ly) ---")
        # Select Ly (nữ miền Bắc) - usually ID is 'Ly'
        _, third_voice_id = available_voices[4] if len(available_voices) > 4 else available_voices[2]
        print(f"Selecting voice: {third_voice_id}")
        
        # Get reference data for this voice
        third_voice_data = tts.get_preset_voice(third_voice_id)
        
        test_text_3 = f"Xin chào, tôi là {third_voice_id}. Đây là giọng nói thứ ba được test."
        try:
            audio_3 = tts.infer(text=test_text_3, voice=third_voice_data)
            print(f"Audio generated, shape: {audio_3.shape if hasattr(audio_3, 'shape') else len(audio_3)}")
            output_path = os.path.join(outputs_dir, f"standard_{third_voice_id}.wav")
            tts.save(audio_3, output_path)
            # Verify file was created
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"Saved {third_voice_id} synthesis to: {output_path} ({file_size} bytes)")
            else:
                print(f"ERROR: File was not created at {output_path}")
        except Exception as e:
            print(f"Error in PART 5: {e}")
            import traceback
            traceback.print_exc()
    
    # ---------------------------------------------------------
    # PART 6: ZERO-SHOT VOICE CLONING (LOCAL) - Optional
    # ---------------------------------------------------------
    # You can clone any voice using a short audio sample (3-5s) and its transcript
    ref_audio = "examples/audio_ref/example_ngoc_huyen.wav"
    ref_text = "Tác phẩm dự thi bảo đảm tính khoa học, tính đảng, tính chiến đấu, tính định hướng."
    
    if os.path.exists(ref_audio):
        print("\n--- PART 6: Voice Cloning ---")
        print(f"Cloning voice from: {ref_audio}")
        try:
            cloned_audio = tts.infer(
                text="Đây là giọng nói đã được clone thành công từ file mẫu.",
                ref_audio=ref_audio,
                ref_text=ref_text
            )
            print(f"Audio generated, shape: {cloned_audio.shape if hasattr(cloned_audio, 'shape') else len(cloned_audio)}")
            output_path = os.path.join(outputs_dir, "standard_cloned_output.wav")
            tts.save(cloned_audio, output_path)
            # Verify file was created
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"Saved cloned voice to: {output_path} ({file_size} bytes)")
            else:
                print(f"ERROR: File was not created at {output_path}")
        except Exception as e:
            print(f"Error in PART 6: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"\n--- PART 6: Voice Cloning ---")
        print(f"Skipped: Audio reference file not found at {ref_audio}")

    # ---------------------------------------------------------
    # PART 7: CLEANUP
    # ---------------------------------------------------------
    # Explicitly release resources
    tts.close()
    print("\nAll tasks completed!")

if __name__ == "__main__":
    main()
