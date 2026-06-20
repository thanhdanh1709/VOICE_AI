"""Nội dung mặc định trang pháp lý — khớp layout template tĩnh (legal-card, highlight-box, …)."""

DEFAULT_UPDATED = "Tháng 6 năm 2026"

# Placeholders: __SUPPORT_EMAIL__, __CONTACT_EMAIL__, __PRICING_URL__, __CONTACT_URL__, __SUPPORT_URL__

TERMS_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Chấp thuận điều khoản",
            "content": (
                "<p>Bằng cách tạo tài khoản hoặc sử dụng VietVoice, bạn đồng ý bị ràng buộc bởi các "
                "Điều khoản sử dụng này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ.</p>"
                "<div class=\"highlight-box\"><p>ℹ️ VietVoice là nền tảng chuyển văn bản thành giọng nói AI, "
                "hiện đang trong giai đoạn thử nghiệm (Beta).</p></div>"
            ),
        },
        {
            "title": "Điều kiện sử dụng",
            "content": (
                "<p>Để sử dụng VietVoice, bạn phải:</p>"
                "<ul>"
                "<li>Từ 13 tuổi trở lên (hoặc có sự đồng ý của phụ huynh nếu dưới 18 tuổi)</li>"
                "<li>Cung cấp thông tin đăng ký chính xác và hợp lệ</li>"
                "<li>Không dùng tài khoản cho người khác mà không có sự cho phép</li>"
                "<li>Tuân thủ pháp luật Việt Nam và các quy định quốc tế áp dụng</li>"
                "</ul>"
            ),
        },
        {
            "title": "Quyền và trách nhiệm người dùng",
            "content": (
                "<p><strong>Bạn có quyền:</strong></p>"
                "<ul>"
                "<li>Sử dụng dịch vụ TTS theo gói đăng ký của mình</li>"
                "<li>Tải về các file âm thanh bạn đã tạo ra</li>"
                "<li>Yêu cầu hỗ trợ kỹ thuật khi gặp sự cố</li>"
                "<li>Hủy tài khoản và yêu cầu xóa dữ liệu bất kỳ lúc nào</li>"
                "</ul>"
                "<p><strong>Bạn có trách nhiệm:</strong></p>"
                "<ul>"
                "<li>Bảo mật thông tin đăng nhập của mình</li>"
                "<li>Chỉ sử dụng file giọng nói bạn có quyền sử dụng hợp pháp</li>"
                "<li>Không vi phạm bản quyền khi sử dụng nội dung được tạo ra</li>"
                "</ul>"
            ),
        },
        {
            "title": "Nội dung và hành vi bị cấm",
            "content": (
                "<p>Nghiêm cấm sử dụng VietVoice để:</p>"
                "<ul>"
                "<li>Tạo nội dung giả mạo, lừa đảo, deepfake gây hại</li>"
                "<li>Mạo danh cá nhân, tổ chức, cơ quan nhà nước</li>"
                "<li>Phát tán nội dung thù địch, phân biệt đối xử, bạo lực</li>"
                "<li>Tạo nội dung khiêu dâm hoặc xâm hại trẻ em</li>"
                "<li>Clone giọng nói người khác mà không có sự đồng ý của họ</li>"
                "<li>Khai thác tự động (bot) hoặc tấn công hệ thống</li>"
                "<li>Bán lại dịch vụ mà không có thỏa thuận bằng văn bản</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Vi phạm có thể dẫn đến tạm ngừng hoặc chấm dứt tài khoản "
                "ngay lập tức, không hoàn tiền.</p></div>"
            ),
        },
        {
            "title": "Quản lý tài khoản",
            "content": (
                "<p>Mỗi người dùng chỉ được phép tạo một tài khoản. Hạn ngạch ký tự được tính theo gói dịch vụ "
                "và đặt lại hàng tháng theo chu kỳ đăng ký.</p>"
                "<p>Tài khoản miễn phí có giới hạn sử dụng nhất định. Chi tiết xem tại "
                "<a href=\"__PRICING_URL__\">Bảng giá</a>.</p>"
            ),
        },
        {
            "title": "Thanh toán và hoàn tiền",
            "content": (
                "<p>Các gói trả phí được thanh toán qua cổng SePay. Phí được tính theo tháng hoặc "
                "theo gói đã chọn.</p>"
                "<p><strong>Chính sách hoàn tiền:</strong> Trong vòng 3 ngày kể từ ngày thanh toán, "
                "nếu dịch vụ không hoạt động đúng như mô tả, bạn có thể yêu cầu hoàn tiền bằng cách "
                "liên hệ <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a>.</p>"
                "<div class=\"warning-box\"><p>⚠️ Hoàn tiền chỉ áp dụng trong 3 ngày và khi lỗi được xác minh "
                "từ phía VietVoice. Gói đã sử dụng quá 50% hạn mức ký tự có thể không được hoàn tiền.</p></div>"
            ),
        },
        {
            "title": "Giới hạn trách nhiệm",
            "content": (
                "<p>VietVoice cung cấp dịch vụ \"nguyên trạng\" (as-is) và không đảm bảo:</p>"
                "<ul>"
                "<li>Dịch vụ hoạt động không gián đoạn (đặc biệt trong giai đoạn Beta)</li>"
                "<li>Chất lượng âm thanh đáp ứng 100% mọi trường hợp sử dụng</li>"
                "<li>Tính phù hợp cho mục đích thương mại quan trọng</li>"
                "</ul>"
                "<p>Chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp, mất doanh thu, hoặc thiệt hại "
                "do việc sử dụng hoặc không thể sử dụng dịch vụ gây ra.</p>"
                "<div class=\"warning-box\"><p>⚠️ Bạn tự chịu trách nhiệm về nội dung văn bản đầu vào và file âm thanh "
                "được tạo ra từ tài khoản của mình.</p></div>"
            ),
        },
        {
            "title": "Chấm dứt tài khoản",
            "content": (
                "<p>Chúng tôi có quyền chấm dứt hoặc tạm ngừng tài khoản trong trường hợp:</p>"
                "<ul>"
                "<li>Vi phạm các điều khoản được nêu trong mục 4</li>"
                "<li>Nghi ngờ gian lận hoặc lạm dụng hệ thống</li>"
                "<li>Theo yêu cầu của cơ quan pháp luật</li>"
                "</ul>"
                "<p>Bạn cũng có thể tự xóa tài khoản bất kỳ lúc nào bằng cách liên hệ "
                "<a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a>.</p>"
            ),
        },
        {
            "title": "Thay đổi điều khoản",
            "content": (
                "<p>Chúng tôi có thể cập nhật Điều khoản sử dụng này. Khi có thay đổi quan trọng, "
                "chúng tôi sẽ thông báo qua email đã đăng ký. Tiếp tục sử dụng dịch vụ sau khi "
                "thông báo đồng nghĩa với việc bạn chấp nhận điều khoản mới.</p>"
                "<div class=\"warning-box\"><p>⚠️ Vui lòng kiểm tra trang Điều khoản định kỳ. "
                "Phiên bản cập nhật luôn có ngày hiển thị ở đầu trang.</p></div>"
            ),
        },
        {
            "title": "Luật áp dụng",
            "content": (
                "<p>Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được "
                "giải quyết tại tòa án có thẩm quyền tại Việt Nam.</p>"
                "<div class=\"highlight-box\"><p>📧 Câu hỏi về điều khoản: <strong>__SUPPORT_EMAIL__</strong></p></div>"
            ),
        },
    ],
    "body_html": "",
}

PRIVACY_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Giới thiệu",
            "content": (
                "<p>VietVoice (\"chúng tôi\") cam kết bảo vệ quyền riêng tư của bạn. Chính sách này mô tả cách chúng tôi "
                "thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn sử dụng ứng dụng VietVoice — "
                "nền tảng chuyển văn bản thành giọng nói AI.</p>"
                "<div class=\"highlight-box\"><p>📋 Bằng cách sử dụng VietVoice, bạn đồng ý với các điều khoản của chính sách này.</p></div>"
            ),
        },
        {
            "title": "Thông tin nhà phát triển",
            "content": (
                "<p><strong>Tên ứng dụng:</strong> VietVoice – Text to Speech AI</p>"
                "<p><strong>Nhà phát triển:</strong> VietVoice Development Team</p>"
                "<p><strong>Email liên hệ:</strong> __CONTACT_EMAIL__</p>"
                "<p><strong>Nền tảng:</strong> Web, Android, iOS</p>"
            ),
        },
        {
            "title": "Dữ liệu chúng tôi thu thập",
            "content": (
                "<p>Chúng tôi thu thập các thông tin sau:</p>"
                "<ul>"
                "<li><strong>Thông tin tài khoản:</strong> họ tên, địa chỉ email, mật khẩu (đã mã hóa)</li>"
                "<li><strong>Dữ liệu sử dụng:</strong> văn bản bạn nhập để chuyển đổi, file âm thanh đầu ra</li>"
                "<li><strong>File giọng nói:</strong> nếu bạn tải lên để clone giọng cá nhân</li>"
                "<li><strong>Lịch sử giao dịch:</strong> thông tin thanh toán và nâng cấp gói dịch vụ</li>"
                "<li><strong>Thông tin kỹ thuật:</strong> địa chỉ IP, loại thiết bị, phiên bản hệ điều hành</li>"
                "<li><strong>Nhật ký hoạt động:</strong> thời gian đăng nhập, số ký tự đã sử dụng</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Không nhập thông tin nhạy cảm (mật khẩu, số thẻ, mã OTP) "
                "vào ô chuyển văn bản thành giọng nói.</p></div>"
            ),
        },
        {
            "title": "Mục đích sử dụng dữ liệu",
            "content": (
                "<p>Chúng tôi sử dụng dữ liệu thu thập để:</p>"
                "<ul>"
                "<li>Cung cấp dịch vụ chuyển văn bản thành giọng nói</li>"
                "<li>Quản lý tài khoản và phiên đăng nhập của bạn</li>"
                "<li>Xử lý thanh toán và quản lý gói dịch vụ</li>"
                "<li>Cải thiện chất lượng giọng nói AI và trải nghiệm người dùng</li>"
                "<li>Gửi thông báo về dịch vụ khi cần thiết</li>"
                "<li>Phát hiện và ngăn chặn hành vi lạm dụng hệ thống</li>"
                "</ul>"
            ),
        },
        {
            "title": "Chia sẻ dữ liệu với bên thứ ba",
            "content": (
                "<p>Chúng tôi <strong>không bán</strong> dữ liệu cá nhân của bạn. Dữ liệu chỉ được chia sẻ trong các trường hợp:</p>"
                "<ul>"
                "<li><strong>Cổng thanh toán SePay:</strong> để xử lý giao dịch nâng cấp tài khoản</li>"
                "<li><strong>Dịch vụ lưu trữ đám mây:</strong> Railway / hosting provider để vận hành ứng dụng</li>"
                "<li><strong>Yêu cầu pháp lý:</strong> khi có lệnh của cơ quan pháp luật Việt Nam</li>"
                "</ul>"
                "<div class=\"highlight-box\"><p>🛡️ Chúng tôi không chia sẻ dữ liệu với bên thứ ba cho mục đích quảng cáo.</p></div>"
            ),
        },
        {
            "title": "Cookies & Session",
            "content": (
                "<p>VietVoice sử dụng:</p>"
                "<ul>"
                "<li><strong>Session cookies:</strong> để duy trì trạng thái đăng nhập của bạn</li>"
                "<li><strong>Local Storage:</strong> lưu tùy chọn giao diện (sáng/tối)</li>"
                "</ul>"
                "<p>Chúng tôi không sử dụng Google Analytics, Facebook Pixel, hay bất kỳ công cụ theo dõi của bên thứ ba.</p>"
            ),
        },
        {
            "title": "Quyền của bạn",
            "content": (
                "<p>Bạn có các quyền sau đối với dữ liệu cá nhân:</p>"
                "<ul>"
                "<li><strong>Truy cập:</strong> xem dữ liệu chúng tôi lưu trữ về bạn</li>"
                "<li><strong>Chỉnh sửa:</strong> cập nhật thông tin tài khoản bất kỳ lúc nào</li>"
                "<li><strong>Xóa:</strong> yêu cầu xóa toàn bộ dữ liệu tài khoản</li>"
                "<li><strong>Phản đối:</strong> từ chối một số hình thức xử lý dữ liệu nhất định</li>"
                "</ul>"
                "<div class=\"highlight-box\"><p>🗑️ Để xóa tài khoản và toàn bộ dữ liệu, hãy gửi email đến <strong>__SUPPORT_EMAIL__</strong> "
                "với tiêu đề <em>\"Yêu cầu xóa dữ liệu\"</em>. Chúng tôi sẽ xử lý trong vòng 30 ngày.</p></div>"
            ),
        },
        {
            "title": "Bảo mật dữ liệu",
            "content": (
                "<p>Chúng tôi áp dụng các biện pháp bảo mật sau:</p>"
                "<ul>"
                "<li>Mã hóa mật khẩu bằng bcrypt hashing</li>"
                "<li>Kết nối HTTPS/TLS cho mọi giao tiếp</li>"
                "<li>Giới hạn quyền truy cập cơ sở dữ liệu theo vai trò</li>"
                "<li>Không lưu trữ thông tin thẻ thanh toán trực tiếp</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Không chia sẻ mật khẩu tài khoản. "
                "Bạn nên đăng xuất khi dùng thiết bị công cộng hoặc máy tính dùng chung.</p></div>"
            ),
        },
        {
            "title": "Liên hệ",
            "content": (
                "<p>Nếu có câu hỏi về chính sách quyền riêng tư, vui lòng liên hệ:</p>"
                "<div class=\"contact-row\">"
                "<a href=\"mailto:__CONTACT_EMAIL__\" class=\"contact-item\">📧 __CONTACT_EMAIL__</a>"
                "<a href=\"__CONTACT_URL__\" class=\"contact-item\">💬 Trang liên hệ</a>"
                "<a href=\"__SUPPORT_URL__\" class=\"contact-item\">❓ Trang hỗ trợ</a>"
                "</div>"
            ),
        },
    ],
    "body_html": "",
}

DATA_DELETION_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Cam kết của chúng tôi",
            "content": (
                "<p>VietVoice tôn trọng quyền của bạn đối với dữ liệu cá nhân. Bạn có quyền yêu cầu "
                "xóa toàn bộ dữ liệu liên quan đến tài khoản của mình bất kỳ lúc nào, "
                "phù hợp với yêu cầu của Google Play, Apple App Store và quy định bảo vệ dữ liệu.</p>"
                "<div class=\"highlight-box\"><p>✅ Chúng tôi xử lý mọi yêu cầu xóa dữ liệu trong vòng "
                "<strong>30 ngày</strong> kể từ khi nhận yêu cầu.</p></div>"
            ),
        },
        {
            "title": "Dữ liệu sẽ bị xóa",
            "content": (
                "<p>Khi bạn yêu cầu xóa tài khoản, chúng tôi sẽ xóa vĩnh viễn:</p>"
                "<ul>"
                "<li>Thông tin tài khoản: email, họ tên, mật khẩu đã mã hóa</li>"
                "<li>Lịch sử chuyển đổi văn bản thành giọng nói</li>"
                "<li>Các file âm thanh đã tạo ra và lưu trữ</li>"
                "<li>File giọng nói đã tải lên để clone</li>"
                "<li>Dữ liệu giọng nói cá nhân đã huấn luyện</li>"
                "<li>Lịch sử thanh toán và giao dịch</li>"
                "<li>Cài đặt và tùy chọn cá nhân</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Sau khi xóa, file âm thanh trên thiết bị cá nhân của bạn "
                "vẫn cần được xóa thủ công nếu bạn đã tải xuống.</p></div>"
            ),
        },
        {
            "title": "Cách yêu cầu xóa dữ liệu",
            "content": (
                "<p>Bạn có thể yêu cầu xóa dữ liệu theo các cách sau:</p>"
                "<ul class=\"steps-list\">"
                "<li class=\"step-item\">"
                "<span class=\"step-num\">1</span>"
                "<div class=\"step-text\"><strong>Qua email:</strong> Gửi email đến "
                "<a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> "
                "với tiêu đề <em>\"Yêu cầu xóa dữ liệu\"</em> và địa chỉ email tài khoản của bạn.</div>"
                "</li>"
                "<li class=\"step-item\">"
                "<span class=\"step-num\">2</span>"
                "<div class=\"step-text\"><strong>Qua trang liên hệ:</strong> Điền form tại "
                "<a href=\"__CONTACT_URL__\">trang Liên hệ</a> với nội dung yêu cầu xóa tài khoản.</div>"
                "</li>"
                "</ul>"
                "<a href=\"mailto:__SUPPORT_EMAIL__?subject=Yêu cầu xóa dữ liệu\" class=\"email-cta\">"
                "📧 Gửi yêu cầu xóa dữ liệu ngay</a>"
            ),
        },
        {
            "title": "Thời gian xử lý",
            "content": (
                "<div class=\"timeline-box\">"
                "<div class=\"timeline-icon\">⏱️</div>"
                "<div class=\"timeline-text\">"
                "<h3>Tối đa 30 ngày</h3>"
                "<p>Sau khi nhận yêu cầu xác nhận, toàn bộ dữ liệu sẽ được xóa khỏi hệ thống trong vòng 30 ngày.</p>"
                "</div></div>"
                "<p style=\"margin-top: 1rem;\">Quy trình xử lý:</p>"
                "<ul>"
                "<li><strong>Ngay lập tức:</strong> Tài khoản bị vô hiệu hóa, không thể đăng nhập</li>"
                "<li><strong>Trong 7 ngày:</strong> Xóa dữ liệu cá nhân khỏi hệ thống chính</li>"
                "<li><strong>Trong 30 ngày:</strong> Xóa khỏi backup và hệ thống lưu trữ dự phòng</li>"
                "</ul>"
            ),
        },
        {
            "title": "Lưu ý quan trọng",
            "content": (
                "<div class=\"warning-box\"><p>⚠️ Hành động xóa tài khoản là <strong>không thể hoàn tác</strong>. "
                "Hãy tải về dữ liệu quan trọng trước khi gửi yêu cầu.</p></div>"
                "<ul>"
                "<li>Hành động xóa là <strong class=\"text-warn\">không thể hoàn tác</strong></li>"
                "<li>Dữ liệu giao dịch tài chính có thể được giữ lại theo yêu cầu pháp lý (tối đa 5 năm)</li>"
                "<li>Sau khi xóa, bạn có thể đăng ký tài khoản mới với cùng email</li>"
                "<li>Các file âm thanh đã chia sẻ công khai sẽ được gỡ bỏ khỏi hệ thống</li>"
                "</ul>"
            ),
        },
    ],
    "body_html": "",
}

PAYMENT_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Giới thiệu",
            "content": (
                "<p>Điều khoản thanh toán này mô tả cách bạn thanh toán các gói dịch vụ VietVoice, "
                "phương thức được chấp nhận, quy trình xác nhận và chính sách hoàn tiền.</p>"
                "<div class=\"highlight-box\"><p>💳 Thanh toán được xử lý qua cổng <strong>SePay</strong> "
                "— chuyển khoản ngân hàng hoặc quét mã QR.</p></div>"
            ),
        },
        {
            "title": "Phương thức thanh toán",
            "content": (
                "<p>VietVoice hiện hỗ trợ:</p>"
                "<ul>"
                "<li><strong>Chuyển khoản ngân hàng</strong> — qua tài khoản được hiển thị khi thanh toán</li>"
                "<li><strong>Quét mã QR</strong> — mở app ngân hàng và quét mã trên trang thanh toán</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Chỉ thanh toán theo số tiền và nội dung chuyển khoản "
                "hiển thị trên trang xác nhận. Chuyển sai số tiền hoặc sai mã có thể làm chậm kích hoạt gói.</p></div>"
            ),
        },
        {
            "title": "Giá và gói dịch vụ",
            "content": (
                "<p>Giá các gói được niêm yết tại trang "
                "<a href=\"__PRICING_URL__\">Bảng giá</a> và có thể thay đổi theo thời gian. "
                "Giá đã bao gồm hạn mức ký tự theo gói và thời hạn sử dụng (thường 30 ngày/kỳ).</p>"
                "<p>Sau khi thanh toán thành công, hạn mức ký tự được cộng vào tài khoản của bạn "
                "theo gói đã chọn.</p>"
            ),
        },
        {
            "title": "Xác nhận thanh toán",
            "content": (
                "<p>Sau khi bạn chuyển khoản đúng thông tin:</p>"
                "<ul>"
                "<li>Hệ thống tự động kiểm tra giao dịch qua SePay (thường trong vài phút)</li>"
                "<li>Bạn có thể bấm <strong>Kiểm tra ngay</strong> trên trang thanh toán nếu cần</li>"
                "<li>Khi xác nhận thành công, gói được kích hoạt và số ký tự được cộng ngay</li>"
                "</ul>"
                "<div class=\"highlight-box\"><p>ℹ️ Nếu quá 30 phút chưa được cộng gói, vui lòng liên hệ "
                "<strong>__SUPPORT_EMAIL__</strong> kèm mã giao dịch.</p></div>"
            ),
        },
        {
            "title": "Chính sách hoàn tiền",
            "content": (
                "<p>Bạn có thể yêu cầu hoàn tiền trong <strong>3 ngày</strong> kể từ ngày thanh toán nếu:</p>"
                "<ul>"
                "<li>Dịch vụ không hoạt động đúng như mô tả trên trang Bảng giá</li>"
                "<li>Lỗi kỹ thuật từ phía VietVoice khiến không thể sử dụng dịch vụ</li>"
                "</ul>"
                "<div class=\"warning-box\"><p>⚠️ Hoàn tiền không áp dụng khi đã sử dụng quá 50% hạn mức ký tự "
                "của gói, hoặc vi phạm Điều khoản sử dụng.</p></div>"
                "<p>Gửi yêu cầu hoàn tiền tới <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> "
                "với email tài khoản và mã giao dịch.</p>"
            ),
        },
        {
            "title": "Gia hạn và hủy gói",
            "content": (
                "<p>Gói trả phí <strong>không tự động gia hạn</strong> — bạn cần chủ động mua gói mới "
                "khi hết hạn hoặc hết hạn mức ký tự.</p>"
                "<p>Chúng tôi không lưu thông tin thẻ thanh toán trên hệ thống VietVoice.</p>"
            ),
        },
        {
            "title": "Liên hệ thanh toán",
            "content": (
                "<p>Mọi thắc mắc về thanh toán, hoàn tiền hoặc giao dịch chưa được ghi nhận:</p>"
                "<div class=\"contact-row\">"
                "<a href=\"mailto:__SUPPORT_EMAIL__\" class=\"contact-item\">📧 __SUPPORT_EMAIL__</a>"
                "<a href=\"__CONTACT_URL__\" class=\"contact-item\">💬 Trang liên hệ</a>"
                "<a href=\"__PRICING_URL__\" class=\"contact-item\">💳 Bảng giá</a>"
                "</div>"
            ),
        },
    ],
    "body_html": "",
}


USER_GUIDE_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Giới thiệu VietVoice",
            "content": (
                "<p>VietVoice là nền tảng chuyển văn bản thành giọng nói (TTS) với giọng tiếng Việt tự nhiên, "
                "hỗ trợ clone giọng cá nhân và nhiều cảm xúc giọng nói.</p>"
                "<div class=\"highlight-box\"><p>ℹ️ Trang này hướng dẫn sử dụng dành cho người dùng cuối. "
                "Nếu cần triển khai server, xem <a href=\"/installation-guide\">Hướng dẫn cài đặt</a>.</p></div>"
            ),
        },
        {
            "title": "Đăng ký và đăng nhập",
            "content": (
                "<ol>"
                "<li>Truy cập trang chủ và chọn <strong>Đăng ký</strong> hoặc <strong>Đăng nhập</strong>.</li>"
                "<li>Đăng ký bằng email hoặc tài khoản Google (nếu được bật).</li>"
                "<li>Sau khi đăng nhập, bạn có thể dùng TTS, quản lý giọng và xem lịch sử.</li>"
                "</ol>"
            ),
        },
        {
            "title": "Chuyển văn bản thành giọng nói",
            "content": (
                "<ol>"
                "<li>Nhập hoặc tải văn bản (TXT, PDF, DOCX) vào ô nhập liệu.</li>"
                "<li>Chọn giọng đọc từ thư viện hoặc giọng cá nhân đã clone.</li>"
                "<li>Chọn cảm xúc: Trung lập, Vui, Bình tĩnh, Phấn khích, Buồn (nếu có).</li>"
                "<li>Nhấn <strong>Chuyển đổi</strong>, chờ xử lý và tải file WAV.</li>"
                "</ol>"
                "<p>Hạn mức ký tự phụ thuộc gói dịch vụ — xem <a href=\"__PRICING_URL__\">Bảng giá</a>.</p>"
            ),
        },
        {
            "title": "Clone giọng cá nhân",
            "content": (
                "<ol>"
                "<li>Vào <strong>Giọng của tôi</strong> trong menu.</li>"
                "<li>Tải file âm thanh mẫu (WAV/MP3, tối thiểu 10 giây, chất lượng rõ).</li>"
                "<li>Đợi hệ thống huấn luyện — thường vài phút.</li>"
                "<li>Chọn giọng clone khi tạo TTS.</li>"
                "</ol>"
                "<div class=\"warning-box\"><p>⚠️ Chỉ upload giọng bạn có quyền sử dụng hợp pháp.</p></div>"
            ),
        },
        {
            "title": "Lịch sử và thư viện âm thanh",
            "content": (
                "<p>Các file đã tạo được lưu trong <strong>Lịch sử</strong> và <strong>Thư viện âm thanh</strong> "
                "(nếu bạn đã bật tính năng). Bạn có thể nghe lại, tải xuống hoặc xóa bản ghi.</p>"
            ),
        },
        {
            "title": "Gói cước và thanh toán",
            "content": (
                "<p>Chọn gói tại <a href=\"__PRICING_URL__\">Bảng giá</a>, thanh toán qua QR/ngân hàng. "
                "Sau khi thanh toán thành công, hạn mức được cập nhật tự động.</p>"
                "<p>Thắc mắc thanh toán: <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> hoặc "
                "<a href=\"__CONTACT_URL__\">trang liên hệ</a>.</p>"
            ),
        },
        {
            "title": "Mẹo sử dụng hiệu quả",
            "content": (
                "<ul>"
                "<li>Chia văn bản dài thành đoạn ngắn để chất lượng ổn định hơn.</li>"
                "<li>Dùng dấu câu đúng để giọng đọc tự nhiên.</li>"
                "<li>Báo lỗi qua <a href=\"__SUPPORT_URL__\">Hỗ trợ & FAQ</a> khi gặp sự cố.</li>"
                "</ul>"
            ),
        },
    ],
    "body_html": "",
}

INSTALLATION_GUIDE_DEFAULT = {
    "updated": DEFAULT_UPDATED,
    "sections": [
        {
            "title": "Tổng quan triển khai",
            "content": (
                "<p>Hướng dẫn này dành cho quản trị viên / kỹ thuật triển khai VietVoice Web trên server "
                "hoặc máy phát triển.</p>"
                "<div class=\"highlight-box\"><p>ℹ️ Người dùng cuối chỉ cần truy cập URL đã triển khai — "
                "xem <a href=\"/user-guide\">Hướng dẫn sử dụng</a>.</p></div>"
            ),
        },
        {
            "title": "Yêu cầu hệ thống",
            "content": (
                "<ul>"
                "<li><strong>Python</strong> 3.10+ (khuyến nghị 3.10)</li>"
                "<li><strong>MySQL</strong> 5.7+ hoặc MariaDB</li>"
                "<li><strong>RAM</strong> 8GB+ (16GB+ nếu chạy model TTS/emotional trên cùng máy)</li>"
                "<li><strong>GPU NVIDIA</strong> (tùy chọn, tăng tốc TTS/clone)</li>"
                "<li>Windows 10/11 hoặc Linux server</li>"
                "</ul>"
            ),
        },
        {
            "title": "Cài đặt môi trường",
            "content": (
                "<ol>"
                "<li>Clone hoặc copy mã nguồn dự án LUANVAN vào thư mục làm việc.</li>"
                "<li>Cài dependencies Python cho module <code>web</code> (pip install theo requirements của dự án).</li>"
                "<li>Đảm bảo MySQL đang chạy và tạo database cho ứng dụng.</li>"
                "</ol>"
            ),
        },
        {
            "title": "Cấu hình biến môi trường",
            "content": (
                "<p>Tạo file <code>.env.local</code> trong thư mục <code>web</code> với các biến quan trọng:</p>"
                "<ul>"
                "<li><code>SECRET_KEY</code>, <code>DB_HOST</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>DB_NAME</code></li>"
                "<li><code>SMTP_*</code> — gửi email (đăng ký, xóa tài khoản, …)</li>"
                "<li><code>OPENAI_API_KEY</code> (tùy chọn) — dịch nội dung EN</li>"
                "<li><code>GOOGLE_CLIENT_ID</code> / <code>SECRET</code> (tùy chọn) — OAuth</li>"
                "</ul>"
            ),
        },
        {
            "title": "Khởi chạy ứng dụng",
            "content": (
                "<ol>"
                "<li>Mở terminal tại thư mục <code>web</code>.</li>"
                "<li>Chạy: <code>python app.py</code> (mặc định port <strong>5000</strong>).</li>"
                "<li>Server tự chạy migration DB khi khởi động.</li>"
                "<li>Truy cập <code>http://localhost:5000</code> để kiểm tra.</li>"
                "</ol>"
                "<div class=\"warning-box\"><p>⚠️ Lần đầu load model TTS có thể mất 30–60 giây hoặc download model lớn.</p></div>"
            ),
        },
        {
            "title": "Reverse proxy (Apache / Nginx)",
            "content": (
                "<p>Production nên dùng reverse proxy trỏ tới Flask (port 5000). "
                "Với XAMPP/Apache, cấu hình <code>ProxyPass</code> tới <code>http://127.0.0.1:5000/</code> "
                "và bật <code>mod_proxy</code>.</p>"
                "<p>Tham khảo file <code>apache_config.conf</code> trong thư mục <code>web</code>.</p>"
            ),
        },
        {
            "title": "Khắc phục sự cố",
            "content": (
                "<ul>"
                "<li><strong>Không kết nối DB:</strong> kiểm tra MySQL và biến <code>DB_*</code>.</li>"
                "<li><strong>TTS lỗi / chậm:</strong> kiểm tra GPU, RAM và log console khi chạy <code>app.py</code>.</li>"
                "<li><strong>Email không gửi:</strong> kiểm tra <code>SMTP_*</code> trong <code>.env.local</code>.</li>"
                "<li>Liên hệ: <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a></li>"
                "</ul>"
            ),
        },
    ],
    "body_html": "",
}


def get_legal_defaults():
    return {
        "terms": dict(TERMS_DEFAULT),
        "privacy": dict(PRIVACY_DEFAULT),
        "data_deletion": dict(DATA_DELETION_DEFAULT),
        "payment": dict(PAYMENT_DEFAULT),
        "user_guide": dict(USER_GUIDE_DEFAULT),
        "installation_guide": dict(INSTALLATION_GUIDE_DEFAULT),
    }
