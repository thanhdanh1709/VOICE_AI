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


def test_split_by_emotion_multiple_tags_on_one_line():
    """Sau TN gộp xuống dòng, vẫn tách đúng từng tag."""
    text = (
        "(vui) đoạn một. (bình tĩnh) đoạn hai. (buồn ) đoạn ba."
    )
    chunks = split_by_emotion(text)
    assert [c["emotion"] for c in chunks] == ["cheerful", "calm", "sad"]


def test_split_by_emotion_long_sample_like_user():
    text = (
        "(vui) xin chào mọi người. "
        "(vui) buổi sáng ở sài gòn. "
        "(bình tĩnh) ban ngày thành phố năng động. "
        "(vui) khi đêm xuống. "
        "(buồn ) sài gòn là vậy."
    )
    chunks = split_by_emotion(text)
    assert [c["emotion"] for c in chunks] == [
        "cheerful", "cheerful", "calm", "cheerful", "sad"
    ]
