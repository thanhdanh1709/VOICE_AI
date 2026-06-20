"""Nội dung mặc định trang Hỗ trợ & FAQ — khớp layout support.html."""

# Placeholders: __SUPPORT_EMAIL__, __CONTACT_EMAIL__, __PRICING_OR_REGISTER_URL__,
# __TERMS_URL__, __DATA_DELETION_URL__, __CONTACT_URL__, __SUPPORT_URL__

SUPPORT_DEFAULT = {
    "contact_cards": [
        {
            "icon": "📧",
            "title": "Email hỗ trợ",
            "desc": "Phản hồi trong vòng 24–48 giờ làm việc",
            "link_text": "__SUPPORT_EMAIL__",
            "action": "mailto_support",
            "mailto_subject": "",
        },
        {
            "icon": "💬",
            "title": "Form liên hệ",
            "desc": "Gửi câu hỏi trực tiếp qua trang liên hệ",
            "link_text": "Mở trang liên hệ →",
            "action": "contact_page",
            "mailto_subject": "",
        },
        {
            "icon": "🐛",
            "title": "Báo lỗi",
            "desc": "Gặp sự cố kỹ thuật? Báo cho chúng tôi biết",
            "link_text": "Gửi báo cáo lỗi →",
            "action": "mailto_bug",
            "mailto_subject": "Báo lỗi ứng dụng",
        },
    ],
    "guides_title": "📖 Hướng dẫn sử dụng",
    "guides": [
        {
            "title": "🎤 Chuyển văn bản thành giọng nói",
            "steps": [
                {"text": "<strong>Đăng nhập</strong> vào tài khoản VietVoice của bạn."},
                {"text": "<strong>Nhập văn bản</strong> cần chuyển đổi vào ô nhập liệu (tối đa theo gói dịch vụ)."},
                {"text": "<strong>Chọn giọng đọc</strong> từ thư viện giọng nội tạo hoặc giọng cá nhân của bạn."},
                {"text": "<strong>Chọn cảm xúc</strong> nếu muốn: Trung lập, Vui, Bình tĩnh, Phấn khích, Buồn."},
                {"text": "<strong>Nhấn \"Chuyển đổi\"</strong> và chờ hệ thống xử lý. Tải file WAV về máy."},
            ],
        },
        {
            "title": "🎙️ Clone giọng cá nhân",
            "steps": [
                {"text": "<strong>Vào \"Giọng của tôi\"</strong> trong menu điều hướng."},
                {"text": "<strong>Tải lên file âm thanh</strong> giọng mẫu (WAV/MP3, tối thiểu 10 giây, chất lượng rõ ràng)."},
                {"text": "<strong>Hệ thống xử lý</strong> và tạo giọng clone của bạn trong vài phút."},
                {"text": "<strong>Sử dụng giọng clone</strong> khi chuyển văn bản thành giọng nói."},
            ],
        },
    ],
    "faq_title": "❓ Câu hỏi thường gặp",
    "faqs": [
        {
            "question": "Tôi có thể sử dụng bao nhiêu ký tự mỗi tháng?",
            "answer_html": (
                "Gói miễn phí cho phép sử dụng một số lượng ký tự nhất định mỗi tháng. "
                "Các gói trả phí có hạn ngạch cao hơn. Xem chi tiết tại "
                "<a href=\"__PRICING_OR_REGISTER_URL__\">Bảng giá</a>."
            ),
        },
        {
            "question": "Tôi có thể sử dụng âm thanh tạo ra cho mục đích thương mại không?",
            "answer_html": (
                "Với gói trả phí, bạn được phép sử dụng âm thanh cho mục đích cá nhân và thương mại. "
                "Tuy nhiên, không được dùng để tạo nội dung deepfake hay lừa đảo. "
                "Xem thêm tại <a href=\"__TERMS_URL__\">Điều khoản sử dụng</a>."
            ),
        },
        {
            "question": "File giọng nói tôi tải lên có được bảo mật không?",
            "answer_html": (
                "Có. File giọng nói của bạn chỉ được dùng để tạo model giọng clone cá nhân, "
                "không được chia sẻ với bên thứ ba và không được dùng để huấn luyện AI của chúng tôi "
                "mà không có sự đồng ý của bạn."
            ),
        },
        {
            "question": "Tôi quên mật khẩu, phải làm sao?",
            "answer_html": (
                "Hiện tại hãy liên hệ <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> với "
                "email tài khoản của bạn để được đặt lại mật khẩu thủ công. Tính năng tự đặt lại mật khẩu "
                "sẽ được bổ sung sớm."
            ),
        },
        {
            "question": "Tôi muốn xóa tài khoản và toàn bộ dữ liệu?",
            "answer_html": (
                "Gửi email đến <a href=\"mailto:__SUPPORT_EMAIL__?subject=Yêu cầu xóa dữ liệu\">__SUPPORT_EMAIL__</a> "
                "với tiêu đề \"Yêu cầu xóa dữ liệu\". Chúng tôi sẽ xử lý trong vòng 30 ngày. "
                "Xem thêm tại <a href=\"__DATA_DELETION_URL__\">Chính sách xóa dữ liệu</a>."
            ),
        },
        {
            "question": "Tại sao chất lượng âm thanh đôi khi không ổn định?",
            "answer_html": (
                "VietVoice đang trong giai đoạn Beta. Chất lượng giọng nói phụ thuộc vào model AI và "
                "văn bản đầu vào. Các từ kỹ thuật, tên riêng, hoặc câu quá dài có thể ảnh hưởng đến "
                "chất lượng. Hãy <a href=\"__CONTACT_URL__\">báo lỗi</a> để chúng tôi cải thiện."
            ),
        },
        {
            "question": "Thanh toán thất bại nhưng tiền đã bị trừ?",
            "answer_html": (
                "Vui lòng liên hệ ngay <a href=\"mailto:__SUPPORT_EMAIL__?subject=Vấn đề thanh toán\">__SUPPORT_EMAIL__</a> "
                "kèm ảnh chụp màn hình giao dịch. Chúng tôi sẽ xác minh và xử lý trong vòng 24 giờ."
            ),
        },
    ],
}


def get_support_defaults():
    return dict(SUPPORT_DEFAULT)
