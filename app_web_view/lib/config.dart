// ============================================================
// ⚙️ FILE CẤU HÌNH FLUTTER APP
// ⚠️ Thêm file này vào .gitignore nếu chứa thông tin nhạy cảm
// ============================================================

class AppConfig {
  // ── BASE URLs ──────────────────────────────────────────────
  /// URL backend Flask TTS (IP mạng nội bộ - cùng WiFi)
  static const String apiBaseUrl = 'https://vietvoice-ai.online';

  /// URL frontend web (không có dấu / ở cuối)
  static const String webBaseUrl = 'https://vietvoice-ai.online';

  // ── OAUTH DEEP LINK ────────────────────────────────────────
  /// Scheme cho Deep Link callback sau Google OAuth (phải khớp AndroidManifest & Google Cloud)
  static const String callbackScheme = 'petai';

  // ── APP INFO ───────────────────────────────────────────────
  static const String appName = 'VietVoice';
  static const String appVersion = '1.0.0';

  // ── COMPUTED ───────────────────────────────────────────────
  /// URL endpoint đăng nhập Google dành cho Flutter
  static String get googleLoginFlutterUrl =>
      '$apiBaseUrl/auth/google/login/flutter?callback_scheme=$callbackScheme';
}
