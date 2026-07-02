from emotion_parser import detect_emotion, split_by_emotion


def test_tag_buon_maps_to_sad_even_with_smile_words_in_body():
    text = "(buồn) Sài Gòn có nụ cười và vui vẻ trên phố."
    assert detect_emotion(text) == "sad"


def test_tag_vui_ve_maps_to_cheerful():
    assert detect_emotion("(vui vẻ) Xin chào mọi người!") == "cheerful"


def test_body_keywords_without_tag_stay_neutral():
    text = "Sài Gòn có nụ cười và vui vẻ trên phố."
    assert detect_emotion(text) == "neutral"


def test_split_by_emotion_uses_tag_only():
    chunks = split_by_emotion("(buồn) Đoạn buồn.\n(vui vẻ) Đoạn vui.")
    assert chunks[0]["emotion"] == "sad"
    assert chunks[1]["emotion"] == "cheerful"
