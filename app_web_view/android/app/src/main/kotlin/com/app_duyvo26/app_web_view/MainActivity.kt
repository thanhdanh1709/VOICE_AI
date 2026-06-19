package com.app_duyvo26.app_web_view

import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Channel để Dart gọi sau khi nhận OAuth callback → kéo app lên foreground
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "app.petai/foreground")
            .setMethodCallHandler { call, result ->
                if (call.method == "bringToFront") {
                    try {
                        // Reorder activity về đầu task → Flutter task lên foreground
                        val intent = packageManager.getLaunchIntentForPackage(packageName)
                        intent?.addFlags(
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                        )
                        if (intent != null) startActivity(intent)
                        result.success(null)
                    } catch (e: Exception) {
                        result.error("BRING_TO_FRONT_FAILED", e.message, null)
                    }
                } else {
                    result.notImplemented()
                }
            }
    }
}
