// ============================================================
// ⚙️ FILE CẤU HÌNH FLUTTER APP
// ⚠️ Thêm file này vào .gitignore nếu chứa thông tin nhạy cảm
// ============================================================

class AppConfig {
  // ── BASE URLs ──────────────────────────────────────────────
  /// URL backend Flask TTS (IP mạng nội bộ - cùng WiFi)
  static const String apiBaseUrl = 'https://temperate-marcelle-unloaning.ngrok-free.dev';

  /// URL frontend web (không có dấu / ở cuối)
  static const String webBaseUrl = 'https://temperate-marcelle-unloaning.ngrok-free.dev';

  // ── OAUTH DEEP LINK ────────────────────────────────────────
  /// Scheme cho Deep Link callback sau Google OAuth
  static const String callbackScheme = 'ttsvietnam';

  // ── APP INFO ───────────────────────────────────────────────
  static const String appName = 'TTS Tiếng Việt';
  static const String appVersion = '1.0.0';

  // ── COMPUTED ───────────────────────────────────────────────
  /// URL endpoint đăng nhập Google dành cho Flutter
  static String get googleLoginFlutterUrl =>
      '$apiBaseUrl/auth/google/login/flutter?callback_scheme=$callbackScheme';
}
