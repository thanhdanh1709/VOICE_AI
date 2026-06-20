"""English default content for legal pages (UI language = en)."""

DEFAULT_UPDATED_EN = "June 2026"


def _terms_en():
    return {
        "updated": DEFAULT_UPDATED_EN,
        "sections": [
            {
                "title": "Acceptance of Terms",
                "content": (
                    "<p>By creating an account or using VietVoice, you agree to these Terms of Service. "
                    "If you do not agree, please do not use the service.</p>"
                    "<div class=\"highlight-box\"><p>ℹ️ VietVoice is an AI text-to-speech platform "
                    "currently in Beta.</p></div>"
                ),
            },
            {
                "title": "Terms of Use",
                "content": (
                    "<p>To use VietVoice, you must:</p><ul>"
                    "<li>Be at least 13 years old (or have parental consent if under 18)</li>"
                    "<li>Provide accurate and valid registration information</li>"
                    "<li>Not use your account on behalf of others without permission</li>"
                    "<li>Comply with applicable laws in Vietnam and internationally</li></ul>"
                ),
            },
            {
                "title": "User Rights and Responsibilities",
                "content": (
                    "<p><strong>You have the right to:</strong></p><ul>"
                    "<li>Use TTS services according to your subscription plan</li>"
                    "<li>Download audio files you have generated</li>"
                    "<li>Request technical support when issues occur</li>"
                    "<li>Cancel your account and request data deletion at any time</li></ul>"
                    "<p><strong>You are responsible for:</strong></p><ul>"
                    "<li>Keeping your login credentials secure</li>"
                    "<li>Only using voice files you are legally allowed to use</li>"
                    "<li>Not violating copyright with generated content</li></ul>"
                ),
            },
            {
                "title": "Prohibited Content and Conduct",
                "content": (
                    "<p>It is strictly prohibited to use VietVoice to:</p><ul>"
                    "<li>Create fraudulent, deceptive, or harmful deepfake content</li>"
                    "<li>Impersonate individuals, organizations, or government agencies</li>"
                    "<li>Distribute hateful, discriminatory, or violent content</li>"
                    "<li>Create sexual content or content harming children</li>"
                    "<li>Clone another person's voice without their consent</li>"
                    "<li>Automated scraping (bots) or attacks on the system</li>"
                    "<li>Resell the service without written agreement</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ Violations may result in immediate suspension or "
                    "termination without refund.</p></div>"
                ),
            },
            {
                "title": "Account Management",
                "content": (
                    "<p>Each user may only create one account. Character quotas are based on your plan "
                    "and reset monthly per billing cycle.</p>"
                    "<p>Free accounts have usage limits. See details on the "
                    "<a href=\"__PRICING_URL__\">Pricing</a> page.</p>"
                ),
            },
            {
                "title": "Payments and Refunds",
                "content": (
                    "<p>Paid plans are processed via SePay. Fees are charged monthly or per selected package.</p>"
                    "<p><strong>Refund policy:</strong> Within 3 days of payment, if the service does not work "
                    "as described, you may request a refund by contacting "
                    "<a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a>.</p>"
                    "<div class=\"warning-box\"><p>⚠️ Refunds apply within 3 days when VietVoice verifies the issue. "
                    "Packages with over 50% character usage may not be refunded.</p></div>"
                ),
            },
            {
                "title": "Limitation of Liability",
                "content": (
                    "<p>VietVoice provides the service \"as-is\" and does not guarantee:</p><ul>"
                    "<li>Uninterrupted service (especially during Beta)</li>"
                    "<li>Audio quality in 100% of use cases</li>"
                    "<li>Suitability for critical commercial purposes</li></ul>"
                    "<p>We are not liable for indirect damages, lost revenue, or damages from use or inability "
                    "to use the service.</p>"
                    "<div class=\"warning-box\"><p>⚠️ You are responsible for input text and audio files "
                    "generated from your account.</p></div>"
                ),
            },
            {
                "title": "Account Termination",
                "content": (
                    "<p>We may terminate or suspend accounts when:</p><ul>"
                    "<li>Terms in section 4 are violated</li>"
                    "<li>Fraud or abuse is suspected</li>"
                    "<li>Required by law enforcement</li></ul>"
                    "<p>You may delete your account anytime by contacting "
                    "<a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a>.</p>"
                ),
            },
            {
                "title": "Changes to Terms",
                "content": (
                    "<p>We may update these Terms. For material changes, we will notify your registered email. "
                    "Continued use after notice means you accept the new terms.</p>"
                    "<div class=\"warning-box\"><p>⚠️ Please review this page periodically. "
                    "The latest version date is shown at the top.</p></div>"
                ),
            },
            {
                "title": "Governing Law",
                "content": (
                    "<p>These terms are governed by the laws of Vietnam. Disputes shall be resolved in "
                    "competent courts in Vietnam.</p>"
                    "<div class=\"highlight-box\"><p>📧 Questions about terms: <strong>__SUPPORT_EMAIL__</strong></p></div>"
                ),
            },
        ],
        "body_html": "",
    }


def _privacy_en():
    return {
        "updated": DEFAULT_UPDATED_EN,
        "sections": [
            {
                "title": "Introduction",
                "content": (
                    "<p>VietVoice (\"we\") is committed to protecting your privacy. This policy describes how we "
                    "collect, use, and protect personal information when you use VietVoice — "
                    "the AI text-to-speech platform.</p>"
                    "<div class=\"highlight-box\"><p>📋 By using VietVoice, you agree to this policy.</p></div>"
                ),
            },
            {
                "title": "Developer Information",
                "content": (
                    "<p><strong>Application:</strong> VietVoice – Text to Speech AI</p>"
                    "<p><strong>Developer:</strong> VietVoice Development Team</p>"
                    "<p><strong>Contact email:</strong> __CONTACT_EMAIL__</p>"
                    "<p><strong>Platforms:</strong> Web, Android, iOS</p>"
                ),
            },
            {
                "title": "Data We Collect",
                "content": (
                    "<p>We collect the following information:</p><ul>"
                    "<li><strong>Account info:</strong> name, email, password (hashed)</li>"
                    "<li><strong>Usage data:</strong> text you submit for conversion, output audio files</li>"
                    "<li><strong>Voice files:</strong> if you upload for personal voice cloning</li>"
                    "<li><strong>Transaction history:</strong> payments and plan upgrades</li>"
                    "<li><strong>Technical info:</strong> IP address, device type, OS version</li>"
                    "<li><strong>Activity logs:</strong> login times, characters used</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ Do not enter sensitive data (passwords, card numbers, OTP) "
                    "into the text-to-speech input.</p></div>"
                ),
            },
            {
                "title": "How We Use Data",
                "content": (
                    "<p>We use collected data to:</p><ul>"
                    "<li>Provide text-to-speech services</li>"
                    "<li>Manage your account and sessions</li>"
                    "<li>Process payments and subscription plans</li>"
                    "<li>Improve AI voice quality and user experience</li>"
                    "<li>Send necessary service notifications</li>"
                    "<li>Detect and prevent system abuse</li></ul>"
                ),
            },
            {
                "title": "Third-Party Data Sharing",
                "content": (
                    "<p>We <strong>do not sell</strong> your personal data. Data is only shared when:</p><ul>"
                    "<li><strong>SePay payment gateway:</strong> to process upgrade transactions</li>"
                    "<li><strong>Cloud hosting:</strong> to operate the application</li>"
                    "<li><strong>Legal requests:</strong> when required by Vietnamese authorities</li></ul>"
                    "<div class=\"highlight-box\"><p>🛡️ We do not share data with third parties for advertising.</p></div>"
                ),
            },
            {
                "title": "Cookies & Session",
                "content": (
                    "<p>VietVoice uses:</p><ul>"
                    "<li><strong>Session cookies:</strong> to maintain your login state</li>"
                    "<li><strong>Local Storage:</strong> theme preference (light/dark) and language</li></ul>"
                    "<p>We do not use Google Analytics, Facebook Pixel, or third-party tracking tools.</p>"
                ),
            },
            {
                "title": "Your Rights",
                "content": (
                    "<p>You have the following rights regarding personal data:</p><ul>"
                    "<li><strong>Access:</strong> view data we store about you</li>"
                    "<li><strong>Edit:</strong> update account information anytime</li>"
                    "<li><strong>Delete:</strong> request full account data deletion</li>"
                    "<li><strong>Object:</strong> refuse certain data processing</li></ul>"
                    "<div class=\"highlight-box\"><p>🗑️ To delete your account, email <strong>__SUPPORT_EMAIL__</strong> "
                    "with subject <em>\"Data deletion request\"</em>. We process within 30 days.</p></div>"
                ),
            },
            {
                "title": "Data Security",
                "content": (
                    "<p>We apply the following security measures:</p><ul>"
                    "<li>Password hashing with bcrypt</li>"
                    "<li>HTTPS/TLS for all communications</li>"
                    "<li>Role-based database access control</li>"
                    "<li>No direct storage of card payment details</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ Do not share your password. "
                    "Log out on shared or public devices.</p></div>"
                ),
            },
            {
                "title": "Contact",
                "content": (
                    "<p>For privacy questions, contact us:</p>"
                    "<div class=\"contact-row\">"
                    "<a href=\"mailto:__CONTACT_EMAIL__\" class=\"contact-item\">📧 __CONTACT_EMAIL__</a>"
                    "<a href=\"__CONTACT_URL__\" class=\"contact-item\">💬 Contact page</a>"
                    "<a href=\"__SUPPORT_URL__\" class=\"contact-item\">❓ Support page</a>"
                    "</div>"
                ),
            },
        ],
        "body_html": "",
    }


def _data_deletion_en():
    return {
        "updated": DEFAULT_UPDATED_EN,
        "sections": [
            {
                "title": "Our Commitment",
                "content": (
                    "<p>VietVoice respects your right to personal data. You may request deletion of all data "
                    "related to your account at any time, in line with Google Play, Apple App Store, "
                    "and data protection requirements.</p>"
                    "<div class=\"highlight-box\"><p>✅ We process deletion requests within "
                    "<strong>30 days</strong> of receipt.</p></div>"
                ),
            },
            {
                "title": "Data That Will Be Deleted",
                "content": (
                    "<p>When you request account deletion, we permanently delete:</p><ul>"
                    "<li>Account info: email, name, hashed password</li>"
                    "<li>Text-to-speech conversion history</li>"
                    "<li>Generated and stored audio files</li>"
                    "<li>Uploaded voice files for cloning</li>"
                    "<li>Personal voice model data</li>"
                    "<li>Payment and transaction history</li>"
                    "<li>Settings and personal preferences</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ After deletion, audio on your device must be "
                    "removed manually if you downloaded it.</p></div>"
                ),
            },
            {
                "title": "How to Request Deletion",
                "content": (
                    "<p>You can request data deletion by:</p>"
                    "<ul class=\"steps-list\">"
                    "<li class=\"step-item\"><span class=\"step-num\">1</span>"
                    "<div class=\"step-text\"><strong>By email:</strong> Send to "
                    "<a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> "
                    "with subject <em>\"Data deletion request\"</em> and your account email.</div></li>"
                    "<li class=\"step-item\"><span class=\"step-num\">2</span>"
                    "<div class=\"step-text\"><strong>Contact form:</strong> Use the "
                    "<a href=\"__CONTACT_URL__\">Contact page</a> to request account deletion.</div></li>"
                    "</ul>"
                    "<a href=\"mailto:__SUPPORT_EMAIL__?subject=Data deletion request\" class=\"email-cta\">"
                    "📧 Request data deletion now</a>"
                ),
            },
            {
                "title": "Processing Time",
                "content": (
                    "<div class=\"timeline-box\"><div class=\"timeline-icon\">⏱️</div>"
                    "<div class=\"timeline-text\"><h3>Up to 30 days</h3>"
                    "<p>After confirmation, all data is removed from our systems within 30 days.</p>"
                    "</div></div>"
                    "<p style=\"margin-top: 1rem;\">Process:</p><ul>"
                    "<li><strong>Immediately:</strong> Account disabled, login blocked</li>"
                    "<li><strong>Within 7 days:</strong> Personal data removed from primary systems</li>"
                    "<li><strong>Within 30 days:</strong> Removed from backups</li></ul>"
                ),
            },
            {
                "title": "Important Notes",
                "content": (
                    "<div class=\"warning-box\"><p>⚠️ Account deletion is <strong>irreversible</strong>. "
                    "Download important data before submitting a request.</p></div><ul>"
                    "<li>Deletion is <strong class=\"text-warn\">irreversible</strong></li>"
                    "<li>Financial records may be retained up to 5 years as required by law</li>"
                    "<li>You may register again with the same email after deletion</li>"
                    "<li>Publicly shared audio will be removed from the system</li></ul>"
                ),
            },
        ],
        "body_html": "",
    }


def _payment_en():
    return {
        "updated": DEFAULT_UPDATED_EN,
        "sections": [
            {
                "title": "Introduction",
                "content": (
                    "<p>These payment terms describe how you pay for VietVoice plans, accepted methods, "
                    "confirmation process, and refund policy.</p>"
                    "<div class=\"highlight-box\"><p>💳 Payments are processed via <strong>SePay</strong> "
                    "— bank transfer or QR scan.</p></div>"
                ),
            },
            {
                "title": "Payment Methods",
                "content": (
                    "<p>VietVoice currently supports:</p><ul>"
                    "<li><strong>Bank transfer</strong> — to the account shown on the payment page</li>"
                    "<li><strong>QR scan</strong> — open your banking app and scan the code</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ Pay only the exact amount and transfer content shown. "
                    "Wrong amount or code may delay activation.</p></div>"
                ),
            },
            {
                "title": "Pricing and Plans",
                "content": (
                    "<p>Plan prices are listed on the "
                    "<a href=\"__PRICING_URL__\">Pricing</a> page and may change over time. "
                    "Prices include character limits and usage period (usually 30 days).</p>"
                    "<p>After successful payment, character quota is added to your account immediately.</p>"
                ),
            },
            {
                "title": "Payment Confirmation",
                "content": (
                    "<p>After a correct bank transfer:</p><ul>"
                    "<li>The system checks transactions via SePay (usually within minutes)</li>"
                    "<li>You can click <strong>Check now</strong> on the payment page if needed</li>"
                    "<li>On success, your plan is activated and characters are credited</li></ul>"
                    "<div class=\"highlight-box\"><p>ℹ️ If not credited after 30 minutes, contact "
                    "<strong>__SUPPORT_EMAIL__</strong> with your transaction ID.</p></div>"
                ),
            },
            {
                "title": "Refund Policy",
                "content": (
                    "<p>You may request a refund within <strong>3 days</strong> of payment if:</p><ul>"
                    "<li>The service does not work as described on the Pricing page</li>"
                    "<li>A VietVoice technical error prevents use of the service</li></ul>"
                    "<div class=\"warning-box\"><p>⚠️ No refund if over 50% of character quota was used "
                    "or Terms of Service were violated.</p></div>"
                    "<p>Email <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> "
                    "with your account email and transaction ID.</p>"
                ),
            },
            {
                "title": "Renewal and Cancellation",
                "content": (
                    "<p>Paid plans <strong>do not auto-renew</strong> — purchase a new plan when expired "
                    "or out of characters.</p>"
                    "<p>We do not store card payment details on VietVoice servers.</p>"
                ),
            },
            {
                "title": "Payment Contact",
                "content": (
                    "<p>For payment, refund, or unrecorded transaction questions:</p>"
                    "<div class=\"contact-row\">"
                    "<a href=\"mailto:__SUPPORT_EMAIL__\" class=\"contact-item\">📧 __SUPPORT_EMAIL__</a>"
                    "<a href=\"__CONTACT_URL__\" class=\"contact-item\">💬 Contact page</a>"
                    "<a href=\"__PRICING_URL__\" class=\"contact-item\">💳 Pricing</a>"
                    "</div>"
                ),
            },
        ],
        "body_html": "",
    }


def _user_guide_en():
    return {
        "updated": "June 2026",
        "sections": [
            {
                "title": "About VietVoice",
                "content": (
                    "<p>VietVoice is a text-to-speech (TTS) platform with natural Vietnamese voices, "
                    "personal voice cloning, and multiple emotional styles.</p>"
                    "<div class=\"highlight-box\"><p>ℹ️ This page is for end users. "
                    "For server deployment, see <a href=\"/installation-guide\">Installation Guide</a>.</p></div>"
                ),
            },
            {
                "title": "Sign up and sign in",
                "content": (
                    "<ol>"
                    "<li>Go to the homepage and choose <strong>Register</strong> or <strong>Sign in</strong>.</li>"
                    "<li>Register with email or Google (if enabled).</li>"
                    "<li>After signing in, you can use TTS, manage voices, and view history.</li>"
                    "</ol>"
                ),
            },
            {
                "title": "Text to speech",
                "content": (
                    "<ol>"
                    "<li>Enter or upload text (TXT, PDF, DOCX) in the input area.</li>"
                    "<li>Select a voice from the library or your cloned voice.</li>"
                    "<li>Choose emotion: Neutral, Happy, Calm, Excited, Sad (if available).</li>"
                    "<li>Click <strong>Convert</strong>, wait for processing, and download the WAV file.</li>"
                    "</ol>"
                    "<p>Character limits depend on your plan — see <a href=\"__PRICING_URL__\">Pricing</a>.</p>"
                ),
            },
            {
                "title": "Personal voice clone",
                "content": (
                    "<ol>"
                    "<li>Go to <strong>My Voices</strong> in the menu.</li>"
                    "<li>Upload a sample audio file (WAV/MP3, at least 10 seconds, clear quality).</li>"
                    "<li>Wait for training — usually a few minutes.</li>"
                    "<li>Select your cloned voice when creating TTS.</li>"
                    "</ol>"
                    "<div class=\"warning-box\"><p>⚠️ Only upload voices you are legally allowed to use.</p></div>"
                ),
            },
            {
                "title": "History and audio library",
                "content": (
                    "<p>Generated files are stored in <strong>History</strong> and <strong>Audio Library</strong> "
                    "(if enabled). You can replay, download, or delete records.</p>"
                ),
            },
            {
                "title": "Plans and payment",
                "content": (
                    "<p>Choose a plan on <a href=\"__PRICING_URL__\">Pricing</a>, pay via QR/bank transfer. "
                    "After successful payment, your quota is updated automatically.</p>"
                    "<p>Payment questions: <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a> or "
                    "<a href=\"__CONTACT_URL__\">contact page</a>.</p>"
                ),
            },
            {
                "title": "Tips for best results",
                "content": (
                    "<ul>"
                    "<li>Split long text into shorter paragraphs for more stable quality.</li>"
                    "<li>Use proper punctuation for natural speech.</li>"
                    "<li>Report issues via <a href=\"__SUPPORT_URL__\">Support & FAQ</a>.</li>"
                    "</ul>"
                ),
            },
        ],
        "body_html": "",
    }


def _installation_guide_en():
    return {
        "updated": "June 2026",
        "sections": [
            {
                "title": "Deployment overview",
                "content": (
                    "<p>This guide is for administrators deploying VietVoice Web on a server or dev machine.</p>"
                    "<div class=\"highlight-box\"><p>ℹ️ End users only need the deployed URL — "
                    "see <a href=\"/user-guide\">User Guide</a>.</p></div>"
                ),
            },
            {
                "title": "System requirements",
                "content": (
                    "<ul>"
                    "<li><strong>Python</strong> 3.10+ (3.10 recommended)</li>"
                    "<li><strong>MySQL</strong> 5.7+ or MariaDB</li>"
                    "<li><strong>RAM</strong> 8GB+ (16GB+ if running TTS models on the same host)</li>"
                    "<li><strong>NVIDIA GPU</strong> (optional, speeds up TTS/clone)</li>"
                    "<li>Windows 10/11 or Linux server</li>"
                    "</ul>"
                ),
            },
            {
                "title": "Environment setup",
                "content": (
                    "<ol>"
                    "<li>Clone or copy the LUANVAN project source to your working directory.</li>"
                    "<li>Install Python dependencies for the <code>web</code> module (pip per project requirements).</li>"
                    "<li>Ensure MySQL is running and create an application database.</li>"
                    "</ol>"
                ),
            },
            {
                "title": "Environment variables",
                "content": (
                    "<p>Create <code>.env.local</code> in the <code>web</code> folder with key variables:</p>"
                    "<ul>"
                    "<li><code>SECRET_KEY</code>, <code>DB_HOST</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>DB_NAME</code></li>"
                    "<li><code>SMTP_*</code> — email (registration, account deletion, …)</li>"
                    "<li><code>OPENAI_API_KEY</code> (optional) — EN content translation</li>"
                    "<li><code>GOOGLE_CLIENT_ID</code> / <code>SECRET</code> (optional) — OAuth</li>"
                    "</ul>"
                ),
            },
            {
                "title": "Run the application",
                "content": (
                    "<ol>"
                    "<li>Open a terminal in the <code>web</code> directory.</li>"
                    "<li>Run: <code>python app.py</code> (default port <strong>5000</strong>).</li>"
                    "<li>The server runs DB migrations on startup.</li>"
                    "<li>Open <code>http://localhost:5000</code> to verify.</li>"
                    "</ol>"
                    "<div class=\"warning-box\"><p>⚠️ First TTS model load may take 30–60 seconds or download large models.</p></div>"
                ),
            },
            {
                "title": "Reverse proxy (Apache / Nginx)",
                "content": (
                    "<p>Production should use a reverse proxy to Flask (port 5000). "
                    "With XAMPP/Apache, configure <code>ProxyPass</code> to <code>http://127.0.0.1:5000/</code> "
                    "and enable <code>mod_proxy</code>.</p>"
                    "<p>See <code>apache_config.conf</code> in the <code>web</code> folder.</p>"
                ),
            },
            {
                "title": "Troubleshooting",
                "content": (
                    "<ul>"
                    "<li><strong>DB connection failed:</strong> check MySQL and <code>DB_*</code> variables.</li>"
                    "<li><strong>TTS errors / slow:</strong> check GPU, RAM, and console logs when running <code>app.py</code>.</li>"
                    "<li><strong>Email not sent:</strong> check <code>SMTP_*</code> in <code>.env.local</code>.</li>"
                    "<li>Contact: <a href=\"mailto:__SUPPORT_EMAIL__\">__SUPPORT_EMAIL__</a></li>"
                    "</ul>"
                ),
            },
        ],
        "body_html": "",
    }


def get_legal_defaults_en():
    return {
        "terms": _terms_en(),
        "privacy": _privacy_en(),
        "data_deletion": _data_deletion_en(),
        "payment": _payment_en(),
        "user_guide": _user_guide_en(),
        "installation_guide": _installation_guide_en(),
    }
