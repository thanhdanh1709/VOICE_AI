"""English defaults for Support & FAQ page."""

SUPPORT_DEFAULT_EN = {
    "contact_cards": [
        {
            "icon": "📧",
            "title": "Support email",
            "desc": "Response within 24–48 business hours",
            "link_text": "__SUPPORT_EMAIL__",
            "action": "mailto_support",
            "mailto_subject": "",
        },
        {
            "icon": "💬",
            "title": "Contact form",
            "desc": "Send your question via the contact page",
            "link_text": "Open contact page →",
            "action": "contact_page",
            "mailto_subject": "",
        },
        {
            "icon": "🐛",
            "title": "Report error",
            "desc": "Technical issue? Let us know",
            "link_text": "Send bug report →",
            "action": "mailto_bug",
            "mailto_subject": "App bug report",
        },
    ],
    "guides_title": "📖 User guide",
    "guides": [
        {
            "title": "🎤 Text to speech",
            "steps": [
                {"text": "<strong>Sign in</strong> to your VietVoice account."},
                {"text": "<strong>Enter text</strong> to convert in the input box (limit depends on your plan)."},
                {"text": "<strong>Select a voice</strong> from the built-in library or your personal voices."},
                {"text": "<strong>Choose emotion</strong> if needed: Neutral, Happy, Calm, Excited, Sad."},
                {"text": "<strong>Click \"Convert\"</strong> and wait for processing. Download the WAV file."},
            ],
        },
        {
            "title": "🎙️ Personal voice clone",
            "steps": [
                {"text": "<strong>Go to \"My Voices\"</strong> in the navigation menu."},
                {"text": "<strong>Upload a sample audio</strong> file (WAV/MP3, at least 10 seconds, clear quality)."},
                {"text": "<strong>The system processes</strong> and creates your voice clone in a few minutes."},
                {"text": "<strong>Use your cloned voice</strong> when converting text to speech."},
            ],
        },
    ],
    "faq_title": "❓ Frequently asked questions",
    "faqs": [
        {
            "question": "How many characters can I use per month?",
            "answer_html": (
                "The free plan includes a limited number of characters per month. "
                "Paid plans offer higher quotas. See details on "
                "<a href=\"__PRICING_OR_REGISTER_URL__\">Pricing</a>."
            ),
        },
        {
            "question": "Can I use generated audio for commercial purposes?",
            "answer_html": (
                "With paid plans, you may use audio for personal and commercial purposes. "
                "However, you may not use it for deepfake or fraudulent content. "
                "See <a href=\"__TERMS_URL__\">Terms of Service</a> for more."
            ),
        },
        {
            "question": "Is my uploaded voice file kept secure?",
            "answer_html": (
                "Yes. Your voice files are only used to create your personal clone model, "
                "are not shared with third parties, and are not used to train our AI without your consent."
            ),
        },
        {
            "question": "I forgot my password — what should I do?",
            "answer_html": (
                "Please contact <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> with "
                "your account email for a manual password reset. Self-service password reset will be added soon."
            ),
        },
        {
            "question": "I want to delete my account and all data?",
            "answer_html": (
                "Email <a href=\"mailto:__SUPPORT_EMAIL__?subject=Data deletion request\">__SUPPORT_EMAIL__</a> "
                "with subject \"Data deletion request\". We will process within 30 days. "
                "See <a href=\"__DATA_DELETION_URL__\">Data Deletion Policy</a> for details."
            ),
        },
        {
            "question": "Why is audio quality sometimes inconsistent?",
            "answer_html": (
                "VietVoice is in Beta. Voice quality depends on the AI model and input text. "
                "Technical terms, proper names, or very long sentences may affect quality. "
                "Please <a href=\"__CONTACT_URL__\">report issues</a> so we can improve."
            ),
        },
        {
            "question": "Payment failed but money was deducted?",
            "answer_html": (
                "Contact <a href=\"mailto:__SUPPORT_EMAIL__?subject=Payment issue\">__SUPPORT_EMAIL__</a> "
                "with a screenshot of the transaction. We will verify and respond within 24 hours."
            ),
        },
    ],
}


def get_support_defaults_en():
    return dict(SUPPORT_DEFAULT_EN)
