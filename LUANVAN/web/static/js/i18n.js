/**
 * VietVoice i18n — Lightweight bilingual (vi/en) engine
 * Usage: add data-i18n="key" to any element
 *        add data-i18n-placeholder="key" for input placeholders
 *        add data-i18n-title="key" for tooltips
 *        add data-i18n-html="key" for innerHTML (use cautiously)
 */
if (!window.VVi18n) {
    const STORAGE_KEY = 'language';
    const LEGACY_KEY = 'vv-lang';
    const DEFAULT_LANG = 'vi';
    const TRANSLATE_CACHE_KEY = 'vv-translate-cache';
    const I18N_JSON_BASE = '/static/i18n';

    let currentLang = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY) || DEFAULT_LANG;
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_KEY)) {
        localStorage.setItem(STORAGE_KEY, currentLang);
    }
    let translateGeneration = 0;
    let dictionariesReady = false;
    let translateLoadingDepth = 0;
    let legalReloadToken = 0;

    // ── English translations dictionary ──────────────────────────────
    const EN = {
        // ── Navbar ──
        'nav.home':         'Home',
        'nav.library':      'Library',
        'nav.history':      'History',
        'nav.voices':       'My Voices',
        'nav.pricing':      'Pricing',
        'nav.contact':      'Contact',
        'nav.admin':        'Admin',
        'nav.logout':       'Logout',
        'nav.login':        'Sign In',
        'nav.register':     'Get Started Free',
        'nav.features':     'Features',
        'nav.theme':        'Toggle light/dark',
        'nav.about':        'About Us',

        // ── Landing page (static UI) ──
        'lp.page.title':        'VietVoice AI — Full AI Technology Toolkit',
        'lp.hero.subtitle':     'Create vivid audio experiences with top-tier Neural Synthesis. Instant processing, studio-quality output in seconds.',
        'lp.btn.view_features': 'View Features',
        'lp.demo.window_title': 'VietVoice AI — Text to Speech',
        'lp.demo.voice':        'Southern Male Voice',
        'lp.demo.sample_text':  'Hello! This is <span class="text-primary font-semibold">VietVoice AI</span>, Vietnam\'s most natural text-to-speech platform.',
        'lp.demo.convert':      'Convert',
        'lp.demo.hint':         'Press "Convert" to preview',
        'lp.demo.processing':   'Processing...',
        'lp.demo.synthesizing': 'Synthesizing voice...',
        'lp.demo.ready':        '✓ Synthesis complete — ready to play',
        'lp.stats.accuracy':    'Accuracy',
        'lp.stats.generated':   'Voices created',
        'lp.stats.users':       'Users',
        'lp.badge.latency':     'Latency',
        'lp.badge.latency_val': '< 200ms',
        'lp.badge.voices':      'Voices',
        'lp.badge.voices_val':  '50+ voices',
        'lp.pricing.badge':     'Transparent pricing, no hidden fees',
        'lp.pricing.title':     'Flexible pricing',
        'lp.pricing.subtitle':  'Choose a plan that fits your needs. Upgrade or cancel anytime.',
        'lp.pricing.free_note': '<span class="material-symbols-outlined text-green-400 text-base align-middle mr-1">check_circle</span> Start free with <strong class="text-on-surface">100,000 characters</strong> — no credit card required.',
        'lp.about.trust_title': 'Trusted solution',
        'lp.about.trust_desc':  'Trusted by over 200 major businesses in Vietnam.',
        'lp.legal.title':       'Legal information',
        'lp.legal.company_name':'Company name',
        'lp.legal.mst':         'Tax ID',
        'lp.legal.representative':'Representative',
        'lp.legal.since':       'License date',
        'lp.legal.address':     'Head office',
        'lp.legal.hotline':     'Hotline',
        'lp.legal.email':       'Email',
        'lp.price.free':        'Free',
        'lp.price.currency':    '₫',
        'lp.duration.1m':       '1 month',
        'lp.duration.3m':       '3 months',
        'lp.duration.6m':       '6 months',
        'lp.duration.1y':       '1 year',
        'lp.duration.days':     '{n} days',
        'lp.pkg.chars':         '<strong>{n}</strong> characters / period',
        'lp.pkg.valid':         'Valid for <strong>{d}</strong>',
        'lp.pkg.voices':        'All available voices',
        'lp.pkg.download':      'Download MP3 / WAV',
        'lp.pkg.support':       'Email support',
        'lp.btn.start_free':    'Start free',
        'lp.btn.register':      'Register now',
        'lp.popular':           '⭐ Most popular',
        'lp.fallback.basic':    'Basic',

        // ── Mobile drawer ──
        'mob.home':         'Home',
        'mob.library':      'Audio Library',
        'mob.history':      'Conversion History',
        'mob.voices':       'My Voices',
        'mob.pricing':      'Pricing',
        'mob.contact':      'Contact',
        'mob.admin':        'Admin',
        'mob.logout':       'Logout',
        'mob.features':     'Features',
        'mob.login':        'Sign In',
        'mob.register':     'Get Started Free',

        // ── Footer ──
        'ft.tagline':       'Leading AI text-to-speech platform — high quality, rich emotions, personal voice cloning.',
        'ft.col.features':  'Features',
        'ft.col.support':   'Support',
        'ft.col.account':   'Account',
        'ft.col.legal':     'Legal',
        'ft.tts':           'Text → Speech',
        'ft.clone':         'Personal Voice Clone',
        'ft.emotional':     'Emotional TTS',
        'ft.audio-lib':     'Audio Library',
        'ft.pricing':       'Pricing & Upgrade',
        'ft.support':       'Support & FAQ',
        'ft.user-guide':    'User Guide',
        'ft.install-guide': 'Installation Guide',
        'ft.contact':       'Contact Support',
        'ft.bugreport':     'Report a Bug',
        'ft.home':          'Home',
        'ft.history':       'Conversion History',
        'ft.voices':        'My Voices',
        'ft.logout':        'Logout',
        'ft.login':         'Sign In',
        'ft.register':      'Register Free',
        'ft.upgrade':       'Upgrade Account',
        'ft.privacy':       'Privacy Policy',
        'ft.terms':         'Terms of Service',
        'ft.deletion':      'Data Deletion',
        'ft.payment':       'Payment Terms',
        'ft.copy':          '© 2026 VietVoice · AI Technology ·',
        'ft.terms-link':    'Terms of Service',
        'ft.privacy-link':  'Privacy Policy',
        'ft.support-link':  'Support',
        'ft.disclaimer':    'System is in beta phase. All feedback helps improve the experience.',
        'ft.dashboard':     '✦ Dashboard',
        'ft.start-free':    '✦ Get Started Free',

        // ── Workspace (index.html) ──
        'ws.title':             'Text to Speech',
        'ws.subtitle':          'Advanced AI Technology • Natural Vietnamese Voice • High Quality • Rich Emotions',
        'ws.tab.text':          'Text Input',
        'ws.tab.file':          'Upload File',
        'ws.tab.emotional':     'Emotional TTS',
        'ws.tab.new':           '🆕 New',
        'ws.input.title':       'Conversion Content',
        'ws.result.title':      'Result',
        'ws.placeholder':       'Type or paste your text here...',
        'ws.placeholder.ex':    'Example: Hello! This is VietVoice AI text-to-speech system.',
        'ws.chars':             'characters',
        'ws.voice.label':       'SELECT VOICE',
        'ws.voice.loading':     'Loading voices...',
        'ws.voice.test':        'Preview',
        'ws.btn.convert':       '⊙ Convert Now',
        'ws.btn.emotional':     '🎭 Convert with Emotion',
        'ws.result.empty':      'No result yet',
        'ws.result.hint':       'Enter text and press "Convert" to begin',
        'ws.result.processing': 'Processing audio',
        'ws.result.wait':       'Please wait a moment',
        'ws.result.progress':   'Progress',
        'ws.result.step1':      'Analyzing text',
        'ws.result.step2':      'Synthesizing voice',
        'ws.result.step3':      'Finalizing audio',
        'ws.result.success':    'Conversion successful!',
        'ws.result.download':   'Download',
        'ws.result.replay':     'Replay',
        'ws.stats.count':       'Conversions',
        'ws.stats.used':        'Chars Used',
        'ws.stats.remain':      'Remaining',

        // ── Emotional TTS tab ──
        'em.voice.label':   'Voice (Emotional)',
        'em.voice.default': '⭐ Default',
        'em.voice.note':    'Only supports viXTTS Clone voices.',
        'em.voice.add':     'Add new voice',
        'em.joy':           'Joy',
        'em.banner.title':  'Emotional TTS — AI reads with natural emotion!',
        'em.banner.sub':    'Your voice + emotion automatically adapts to the text content',
        'em.excited':       'Excited',
        'em.calm':          'Calm',
        'em.sad':           'Sad',

        // ── RVC Pitch ──
        'rvc.title':        'Voice Adjustment',
        'rvc.desc':         'Fine-tune pitch and tone',
        'rvc.pitch':        'Pitch',
        'rvc.low':          'Lower ←',
        'rvc.high':         '→ Higher',
        'rvc.blend':        'Blend (Index Rate)',
        'rvc.protect':      'Protect Consonants',
        'rvc.quick':        '⚡ Quick settings:',
        'rvc.male2female':  'Male→Female',
        'rvc.female2male':  'Female→Male',
        'rvc.higher':       'Higher',
        'rvc.lower':        'Lower',
        'rvc.reset':        '↺ Reset',
        'rvc.apply':        'Apply Effect',
        'rvc.applying':     'Processing...',
        'rvc.success':      'Effect applied successfully!',

        // ── Tips ──
        'tip.title':    'Usage Tips',
        'tip.1':        'Use punctuation marks to create natural pauses.',
        'tip.2':        'Split long texts into sections under 2000 chars.',
        'tip.3':        'Try different voices to find the best fit.',
        'tip.4':        'Use Emotional TTS to auto-adjust emotion.',
        'tip.5':        'Adjust Pitch after conversion to change voice tone.',

        // ── Voice Gallery ──
        'gallery.title':    'Voice Library',
        'gallery.subtitle': 'Listen and choose the voice that suits your content',
        'gallery.loading':  'Loading voices...',
        'gallery.search.placeholder': 'Search voices...',
        'gallery.filter.all':   'All',
        'gallery.filter.male':  'Male',
        'gallery.filter.female':'Female',
        'gallery.filter.north': 'North',
        'gallery.filter.south': 'South',
        'gallery.favorites':    'Favorites',
        'gallery.tab.system':   'System voices',
        'gallery.tab.custom':   'My voices',
        'gallery.select_hint':  'Select a voice to continue',
        'gallery.selected':     'Selected',
        'gallery.chosen':       'Voice selected',
        'gallery.btn.use_voice':'Use this voice',
        'gallery.cancel':       'Cancel',
        'gallery.empty':        'No matching voices',
        'gallery.empty_custom': 'No cloned voices yet. Add one in My Voices.',
        'gallery.no_sample':    'No sample',
        'gallery.preview':      'Preview',
        'gallery.custom_badge': 'Clone',

        // ── File upload ──
        'file.drop':              'Drag & drop file or click to select',
        'file.drop.title':        'Drag & drop file or click to select',
        'file.drop.hint':         'TXT, PDF, DOCX — max 10MB',
        'file.support':           'Supports: TXT, PDF, DOCX (max 10MB)',
        'file.pdf_scan_warning':  'PDF must have a text layer (scanned/image PDFs are not supported).',
        'file.status.processing': 'Extracting text…',
        'file.success.extracted': 'Text extracted successfully',
        'file.preview.placeholder': 'Extracted content will appear here…',
        'file.btn.edit':          'Edit',
        'file.btn.done':          'Done',
        'file.btn.change':        'Change file',
        'file.error.format':      'Unsupported format. Only TXT, PDF, DOCX.',
        'file.error.size':        'File too large. Maximum 10MB.',
        'file.error.empty':       'No text found in file.',
        'file.error.read':        'Failed to read file',

        // ── History ──
        'hist.title':       'Conversion History',
        'hist.total':       'Total conversions',
        'hist.chars':       'Characters used',
        'hist.download':    'Download',
        'hist.delete':      'Delete',
        'hist.empty':       'No history yet',

        // ── Audio Library ──
        'lib.title':        'Audio Library',
        'lib.search':       'Search...',
        'lib.filter.all':   'All',
        'lib.empty':        'No audio files yet',

        // ── My Voices ──
        'voices.title':     'My Voices',
        'voices.add':       '+ Add New Voice',
        'voices.empty':     'No voices yet. Create your first voice clone!',
        'voices.status.processing': 'Processing',
        'voices.status.ready':      'Ready',
        'voices.status.failed':     'Failed',

        // ── Pricing ──
        'price.title':      'Pricing',
        'price.free':       'Free',
        'price.upgrade':    'Upgrade',
        'price.current':    'Current Plan',

        // ── Contact ──
        'contact.title':    'Contact Us',
        'contact.name':     'Full Name',
        'contact.email':    'Email',
        'contact.message':  'Message',
        'contact.send':     'Send Message',

        // ── Auth ──
        'auth.login.title':     'Sign In',
        'auth.login.welcome':   'Welcome back',
        'auth.login.btn_now':   'Sign in now',
        'auth.login.identifier':'Username or email',
        'auth.login.btn':       'Sign In',
        'auth.login.google':    'Sign in with Google',
        'auth.register.title':  'Create Account',
        'auth.register.btn':    'Create Account',
        'auth.username':        'Username',
        'auth.password':        'Password',
        'auth.fullname':        'Full Name',
        'auth.email':           'Email',
        'auth.login.forgot':    'Forgot password?',
        'auth.forgot.title':    'Forgot Password',
        'auth.forgot.subtitle': 'Enter the email you used to register VietVoice (not the SMTP sender). We will send a reset link.',
        'auth.forgot.btn':      'Send reset link',
        'auth.forgot.back_login':'← Back to sign in',
        'auth.forgot.sent':     'If the email exists, a reset link has been sent. Please check your inbox (and spam folder).',
        'auth.forgot.wait_title':'Waiting for phone confirmation...',
        'auth.forgot.wait_step1':'📱 Open the email on your phone',
        'auth.forgot.wait_step2':'✅ Tap「Confirm on phone」',
        'auth.forgot.wait_step3':'💻 This computer page will open the reset form automatically',
        'auth.reset.title':     'Reset Password',
        'auth.reset.subtitle':  'Enter a new password for your account.',
        'auth.reset.new_pw':    'New password',
        'auth.reset.confirm_pw':'Confirm password',
        'auth.reset.btn':       'Reset password',
        'auth.reset.invalid':   'This link is invalid or has expired. Please request a new one.',
        'auth.reset.request_new':'Request new link →',
        'auth.reset.success':   'Password reset successful. You can sign in now.',

        // ── Legal pages ──
        'legal.privacy':    'Privacy Policy',
        'legal.terms':      'Terms of Service',
        'legal.deletion':   'Data Deletion Policy',
        'legal.payment':    'Payment Terms',
        'legal.support':    'Support & FAQ',
        'legal.user-guide': 'User Guide',
        'legal.install':    'Installation Guide',

        // ── Common ──
        'common.close':     'Close',
        'common.save':      'Save',
        'common.cancel':    'Cancel',
        'common.delete':    'Delete',
        'common.loading':   'Loading...',
        'common.error':     'An error occurred',
        'common.success':   'Success!',
        'common.back':      '← Back',
        'common.chars_remaining': 'Characters remaining',
        'common.chars':     'characters',
        'common.reset':     'Reset',
        'common.prev':      'Previous',
        'common.next':      'Next',
        'common.times':     'times',

        // ── Sidebar navigation ──
        'side.create_audio':  'Create New Audio',
        'side.audio_library': 'Audio Library',
        'side.my_voices':     'My Voices',
        'side.history':       'Conversion History',
        'side.pricing':       'Pricing',
        'side.contact':       'Contact',
        'side.profile':       'Profile',
        'side.upgrade':       'Upgrade Plan',

        // ── Mobile bottom nav ──
        'bottom.create':    'Create',
        'bottom.library':   'Library',
        'bottom.voices':    'Voices',
        'bottom.history':   'History',
        'bottom.pricing':   'Plans',
        'bottom.contact':   'Contact',
        'bottom.create_new': 'Create New',

        // ── My Voices page ──
        'mv.title':               'My Voices',
        'mv.subtitle':            'Manage and create your custom voices',
        'mv.add_voice':           '+ Add New Voice',
        'mv.empty.title':         'No voices yet',
        'mv.empty.desc':          'Create your first voice by uploading an audio sample or choosing a preset voice',
        'mv.empty.cta':           'Create First Voice',
        'mv.status.ready':        'Ready',
        'mv.status.training':     'Training...',
        'mv.status.pending':      'Pending...',
        'mv.status.failed':       'Failed',
        'mv.progress.label':      'Training',
        'mv.progress.bg_note':    'Training in background — you\'ll be notified when done',
        'mv.meta.created':        'Created:',
        'mv.meta.sample':         'Sample:',
        'mv.meta.usage':          'Used:',
        'mv.meta.times':          'times',
        'mv.btn.preview':         'Preview',
        'mv.btn.use':             'Use',
        'mv.btn.retry':           'Retry',
        'mv.modal.title':         'Test Voice',
        'mv.modal.label':         'Enter text to test:',
        'mv.modal.placeholder':   'Hello, this is my custom voice...',
        'mv.modal.hint':          'Enter a sample sentence to preview the voice',
        'mv.modal.loading':       'Generating test audio...',
        'mv.modal.success':       'Test successful! Listen to the audio below:',
        'mv.modal.btn_test':      'Test Now',

        // ── Add Voice page ──
        'addv.title':             'Add New Voice',
        'addv.subtitle':          'Upload an audio sample or choose a base voice to create a custom voice',
        'addv.step1.title':       'Upload Audio Sample',
        'addv.step1.optional':    '(Optional)',
        'addv.step1.desc':        'Upload your voice audio file to train a custom voice. Or skip this step and use a preset base voice.',
        'addv.upload.label':      'Drag & drop or click to select',
        'addv.upload.support':    'Supported:',
        'addv.upload.length':     'Length:',
        'addv.upload.quality':    'Quality:',
        'addv.upload.quality_val':'No noise, no echo',
        'addv.upload.specs_rvc':   '<strong>Supported:</strong> WAV, MP3, M4A<br><strong>Length:</strong> 30s – 15 min<br><strong>Quality:</strong> No noise, no echo',
        'addv.upload.specs_vixtts':'<strong>Supported:</strong> WAV, MP3, M4A<br><strong>Length:</strong> 6s – 2 min (optimal 10–60s)<br><strong>Quality:</strong> No noise, no echo',
        'addv.training.vixtts':   'The <strong>viXTTS Clone</strong> voice is created instantly. The viXTTS model clones your voice from the audio sample each time you convert text.',
        'addv.training.zeroshot': 'The <strong>Zero-shot</strong> voice is created instantly. The model clones from audio sample + transcript each conversion.',
        'addv.training.tip.vixtts':'💡 <strong>Tip:</strong> Use a clear audio file, minimal noise, 10–60 seconds for best clone results.',
        'addv.training.tip.zeroshot':'💡 <strong>Tip:</strong> The transcript must match exactly the content spoken in the audio sample.',
        'addv.step2.title':       'Voice Creation Mode',
        'addv.step2.desc':        '<strong class="text-on-surface">RVC:</strong> Train from audio (takes a few minutes). <strong class="text-on-surface">Zero-shot:</strong> Clone voice from sample (transcript required). <strong class="text-on-surface">viXTTS Clone:</strong> AI voice cloning using viXTTS, no transcript needed.',
        'addv.zeroshot.label':    'Zero-shot (clone from sample)',
        'addv.transcript.label':  'Transcript',
        'addv.transcript.placeholder': 'Enter exactly what the speaker says in the audio sample...',
        'addv.transcript.hint':   'Zero-shot requires a matching transcript for accurate voice cloning.',
        'addv.vixtts.title':      '🤖 viXTTS Clone — AI voice cloning',
        'addv.vixtts.desc':       'The <strong class="text-on-surface">viXTTS</strong> model learns voice characteristics from your audio sample and synthesizes a new voice without needing a transcript.',
        'addv.vixtts.tip':        '💡 <strong>Tip:</strong> Use a clear audio file, minimal noise, 10–60 seconds for best results.',
        'addv.step3.title':       'Choose Base Voice',
        'addv.step3.desc':        'Choose a system voice as the base, then adjust it to create your custom voice.',
        'addv.base.label':        'Base voice',
        'addv.base.tip':          '💡 Your custom voice will be based on this voice',
        'addv.step4.title':       'Voice Adjustments',
        'addv.step4.desc':        'Fine-tune the voice to your preference (defaults are fine).',
        'addv.pitch.label':       'Pitch',
        'addv.pitch.hint':        '-12 (lower) ← 0 (normal) → +12 (higher)',
        'addv.speed.label':       'Speed',
        'addv.speed.hint':        '0.5x (slow) ← 1.0x (normal) → 2.0x (fast)',
        'addv.energy.label':      'Energy',
        'addv.energy.hint':       '0.5x (soft) ← 1.0x (normal) → 1.5x (powerful)',
        'addv.step5.title':       'Voice Details',
        'addv.name.label':        'Voice name',
        'addv.name.placeholder':  'E.g. My Voice, Audiobook Voice...',
        'addv.name.hint':         'Give a memorable name to identify this voice',
        'addv.desc.label':        'Description (optional)',
        'addv.desc.placeholder':  'E.g. Warm voice, suitable for storytelling...',
        'addv.desc.hint':         'Describe the characteristics or use case for this voice',
        'addv.training.title':    '⚡ Voice creation time',
        'addv.training.text':     'Your custom voice will be created <strong class="text-on-surface">instantly</strong> (&lt; 1 second) based on the base voice and your adjustments.',
        'addv.training.tip':      '💡 <strong>Tip:</strong> Create multiple variants from the same audio sample by changing the base voice and parameters.',
        'addv.btn.cancel':        'Cancel',
        'addv.btn.submit':        'Create Voice Now',
        'addv.progress.title':    '⚙️ Creating voice...',
        'addv.progress.subtitle': 'Processing...',
        'addv.success.title':     'Voice Created Successfully!',
        'addv.success.btn.view':  'View My Voices',
        'addv.success.btn.new':   'Create New Voice',
        'addv.error.title':       'Voice Creation Failed',
        'addv.error.btn.retry':   'Try Again',
        'addv.tips.title':        'Tips for High-Quality AI Voice',
        'addv.tip1.title':        'Quality mic',
        'addv.tip1.desc':         'Use a good mic, ~15cm from your mouth',
        'addv.tip2.title':        'Quiet environment',
        'addv.tip2.desc':         'Record in a closed room, no background noise',
        'addv.tip3.title':        'Varied content',
        'addv.tip3.desc':         'Read different sentence types (questions, statements, emotions)',
        'addv.tip4.title':        'Natural voice',
        'addv.tip4.desc':         'Speak clearly and naturally, don\'t try to change your voice',
        'addv.tip5.title':        'Right length',
        'addv.tip5.desc':         '5–10 minutes is optimal (enough data, not too long)',

        // ── History page ──
        'hist.title':             'Conversion History',
        'hist.subtitle':          'Manage, track, and download audio files synthesized from text.',
        'hist.search_placeholder':'Search text or ID...',
        'hist.btn.search':        'Search',
        'hist.col.text':          'Text',
        'hist.col.voice':         'Voice',
        'hist.col.status':        'Status',
        'hist.col.time':          'Time',
        'hist.col.actions':       'Actions',
        'hist.loading':           'Loading data...',
        'hist.empty.title':       'No history yet',
        'hist.empty.desc':        'Your conversions will appear here',
        'hist.empty.cta':         'Create First Audio',

        // ── Audio Library page ──
        'lib.title':              'Audio Library',
        'lib.subtitle':           'Manage and search your created audio files',
        'lib.search_placeholder': 'Search by audio content...',
        'lib.filter.all_voices':  'All voices',
        'lib.sort.newest':        'Newest',
        'lib.sort.oldest':        'Oldest',
        'lib.sort.duration':      'Duration',
        'lib.sort.size':          'Size',
        'lib.btn.filter':         'Filter',
        'lib.view.grid':          'Grid',
        'lib.view.list':          'List',
        'lib.loading':            'Loading library...',

        // ── Pricing page ──
        'price.title':            'Upgrade Service Plan',
        'price.subtitle':         'Choose the right plan to expand your conversion capacity',
        'price.stat.used':        'Used',
        'price.stat.remaining':   'Remaining',
        'price.stat.used_percent':'used',
        'price.stat.limit':       'Total quota',
        'price.stat.chars_per_period': 'chars / period',
        'price.stat.expiry':      'Expires',
        'price.plans.title':      'Service Plans',
        'price.plans.subtitle':   'All plans include full core features',
        'price.plans.loading':    'Loading service plans...',
        'price.payment.title':    'Easy Payment',
        'price.payment.qr':       'Scan QR Code',
        'price.payment.transfer': 'Bank Transfer',
        'price.qr_modal.title':   'Pay via QR Code',
        'price.qr_modal.guide_title': 'Payment instructions:',
        'price.qr_modal.step1':   '1. Open your banking app (TPBank, Vietcombank, BIDV, etc.)',
        'price.qr_modal.step2':   '2. Select "Scan QR" or "Transfer"',
        'price.qr_modal.step3':   '3. Scan the QR code below',
        'price.qr_modal.step4':   '4. Verify: account number, amount, transfer note',
        'price.qr_modal.step5':   '5. Confirm payment in your banking app',
        'price.qr_modal.step6':   '6. System auto-confirms — no code entry needed',
        'price.qr_modal.generating': 'Generating QR code...',
        'price.qr_modal.bank_title': 'Transfer details:',
        'price.qr_modal.bank':    'Bank:',
        'price.qr_modal.account': 'Account number:',
        'price.qr_modal.account_name': 'Account holder:',
        'price.qr_modal.amount':  'Amount:',
        'price.qr_modal.content': 'Transfer note:',
        'price.qr_modal.copy_hint': '(Click account number / note to copy)',
        'price.qr_modal.waiting': 'Waiting for payment confirmation...',
        'price.qr_modal.waiting_desc': 'System checks every 5 seconds. After successful transfer, your plan activates immediately.',
        'price.qr_modal.verify_now': 'Check Now',
        'price.qr_modal.success': 'Payment successful!',

        // ── Pricing package cards (dynamic JS) ──
        'pkg.chars':              'characters',
        'pkg.feature.voices':     'All Vietnamese voices',
        'pkg.feature.emo_tts':    'Emotional TTS',
        'pkg.feature.library':    'Audio library',
        'pkg.feature.clone':      'Personal voice clone',
        'pkg.feature.priority':   'Priority processing',
        'pkg.badge.popular':      'Most Popular',
        'pkg.btn.free':           '✓ Start for free',
        'pkg.btn.subscribe_now':  'Subscribe now',
        'pkg.btn.subscribe_to':   'Subscribe to',
        'pkg.price.forever':      '/forever',
        'pkg.price.days':         'days',
        'pkg.error.load':         'Could not load plans. Please try again.',
        'pkg.error.connection':   'Connection error. Please reload.',
        'pkg.payment.added':      'have been added to your account.',
        'pkg.payment.remaining':  'Remaining:',

        // ── Contact page ──
        'contact.title':          'Contact ',
        'contact.title_highlight':'Us',
        'contact.subtitle':       'We\'re available 24/7. Send questions, feedback, or technical support requests to our AI expert team.',
        'contact.info.email_title': 'Support Email',
        'contact.info.office_title':'Office',
        'contact.info.hours_title': 'Business Hours',
        'contact.info.hours':     'Mon–Fri: 9:00 AM – 6:00 PM\nSat: 9:00 AM – 12:00 PM',
        'contact.info.active':    'Online now',
        'contact.form.title':     'Send a Message',
        'contact.form.name':      'Full Name',
        'contact.form.name_placeholder': 'John Doe',
        'contact.form.subject':   'Subject',
        'contact.form.subject_placeholder': 'Select a support topic',
        'contact.form.subject.support':    'Technical Support / System Error',
        'contact.form.subject.billing':    'Billing & Plans',
        'contact.form.subject.feature':    'Feature Request',
        'contact.form.subject.bug':        'Bug Report',
        'contact.form.subject.partnership':'Partnership',
        'contact.form.subject.api':        'API Integration',
        'contact.form.subject.other':      'Other',
        'contact.form.message':   'Message',
        'contact.form.message_placeholder': 'Describe your issue in detail...',
        'contact.form.char_limit': '/ 1000 characters',
        'contact.form.submit':    'Send Message Now',
        'contact.faq.title':      'Frequently Asked Questions',
        'contact.faq.q1':         'How do I get started?',
        'contact.faq.a1':         'Simply register a free account, then start converting text to speech instantly with the Free plan.',
        'contact.faq.q2':         'What payment methods are supported?',
        'contact.faq.a2':         'We support payment via bank transfer QR Code — fast, convenient, and secure.',
        'contact.faq.q3':         'How many voice options are available?',
        'contact.faq.a3':         'The system offers diverse Vietnamese AI voices (Southern, Northern, Central) with rich emotions and high natural quality.',
        'contact.faq.q4':         'Is a mobile app available?',
        'contact.faq.a4':         'The website is fully responsive. The VietVoice mobile app is in development and coming soon to iOS & Android.',
        'contact.map.location':   'Binh Thuy, Can Tho',
        'contact.map.view':       'View on Map',
        'contact.newsletter.title': 'Connect With Us',
        'contact.newsletter.desc':  'Subscribe to our newsletter for the latest AI voice synthesis updates from VietVoice.',
        'contact.newsletter.placeholder': 'Enter your email address',
        'contact.newsletter.subscribe': 'Subscribe',

        // ── Profile page ──
        'prof.title':             'Personal Profile',
        'prof.subtitle.joined':   'Joined',
        'prof.card.info':         'Personal Information',
        'prof.field.username':    'Username',
        'prof.field.username.hint': 'Username cannot be changed.',
        'prof.field.email':       'Email',
        'prof.field.fullname':    'Full Name',
        'prof.field.fullname.ph': 'Enter your full name...',
        'prof.field.avatar':      'Profile Photo',
        'prof.field.avatar.hint': 'JPG, PNG or WEBP — max 2MB',
        'prof.btn.upload_avatar': 'Upload Photo',
        'prof.avatar.change':     'Change profile photo',
        'prof.avatar.uploading':  'Uploading photo...',
        'prof.avatar.success':    'Profile photo updated',
        'prof.avatar.err_type':   'Only JPG, PNG or WEBP allowed',
        'prof.avatar.err_size':   'Image must be 2MB or smaller',
        'prof.btn.save':          'Save Changes',
        'prof.card.password':     'Change Password',
        'prof.field.current_pw':  'Current Password',
        'prof.field.new_pw':      'New Password',
        'prof.field.new_pw.ph':   'At least 6 characters',
        'prof.field.confirm_pw':  'Confirm New Password',
        'prof.field.confirm_pw.ph': 'Re-enter new password',
        'prof.btn.change_pw':     'Change Password',
        'prof.oauth.no_pw':       'Google OAuth accounts cannot change password.',
        'prof.card.tx':           'Transaction History',
        'prof.tx.empty':          'No transactions yet.',
        'prof.tx.col.package':    'Package',
        'prof.tx.col.txid':       'Transaction ID',
        'prof.tx.col.amount':     'Amount',
        'prof.tx.col.date':       'Date',
        'prof.tx.col.status':     'Status',
        'prof.tx.col.invoice':    'Invoice',
        'prof.card.settings':     'Settings',
        'prof.theme.label':       'Theme',
        'prof.theme.desc':        'Light / Dark',
        'prof.sidebar.label':     'Sidebar',
        'prof.sidebar.desc':      'Hide / Show',
        'prof.lang.label':        'Language',
        'prof.lang.desc':         'VI / EN',
        'prof.vvpro.label':       'AI Synthesis Active',
        'prof.plan.title':        'Plan & usage',
        'prof.plan.upgrade':      'Upgrade',
        'prof.plan.current':      'Current plan',
        'prof.plan.expires':      'Expires / renews',
        'prof.plan.remaining':    'Characters left',
        'prof.plan.used':         'Used',
        'prof.plan.chart':        'Characters used (7 days)',
        'prof.tts.title':         'Default TTS',
        'prof.tts.desc':          'Applied when you open Workspace.',
        'prof.tts.voice':         'Default voice',
        'prof.tts.voice.basic':   'Basic TTS voice',
        'prof.tts.voice.emotional': 'Emotional TTS voice (viXTTS)',
        'prof.tts.voice.default': '— None —',
        'prof.tts.emotional.default': '⭐ Default (base_voice.wav)',
        'prof.tts.emotional.hint': 'Applied to Emotional TTS tab in Workspace.',
        'prof.tts.pitch':         'Pitch',
        'prof.tts.speed':         'Speed',
        'prof.tts.format':        'Export format',
        'prof.tts.bitrate':       'Bitrate',
        'prof.tts.lang':          'Default language',
        'prof.tts.save':          'Save TTS defaults',
        'prof.notify.title':      'Notifications & email',
        'prof.notify.desc':       'Email alerts for important events (requires SMTP).',
        'prof.notify.chars':      'Characters running low (<10%)',
        'prof.notify.payment':    'Payment success / failure',
        'prof.notify.expiry':     'Plan expiring soon',
        'prof.notify.marketing':  'Product news',
        'prof.notify.marketing.hint': 'Optional marketing emails',
        'prof.notify.save':       'Save notifications',
        'prof.export.title':      'Export personal data',
        'prof.export.desc':       'Download a readable report: account, plan, payments, conversion history (no audio files).',
        'prof.export.btn_pdf':    'Download PDF',
        'prof.export.btn_docx':   'Download Word',
        'prof.export.deletion':   'Data deletion policy →',
        'prof.export.privacy':    'Privacy policy',
        'prof.export.success':    'Personal data report downloaded',

        // ── Auth (expanded) ──
        'auth.login.subtitle':    'Sign in to continue your experience with us',
        'auth.login.or':          'or',
        'auth.login.or_upper':    'OR',
        'auth.login.remember':    'Remember me',
        'auth.login.identifier_label': 'Email or Username',
        'auth.login.new_user':    'New to VietVoice?',
        'auth.login.no_account':  "Don't have an account?",
        'auth.login.register_link':'Sign up free →',
        'auth.footer.support':    'Support & Help',
        'auth.footer.rights':     'All Rights Reserved.',
        'auth.brand.login_title': 'Leading AI Technology',
        'auth.brand.login_desc': 'Discover the power of natural Vietnamese voice synthesis with VietVoice AI. Professional, expressive, and flexible.',
        'auth.brand.register_title': 'Start for free',
        'auth.brand.register_desc': 'Create an account and get 100,000 characters to try text-to-speech AI.',
        'auth.brand.forgot_title': 'Recover your account',
        'auth.brand.forgot_desc': 'Confirm on your phone, then set a new password on your computer.',
        'auth.brand.reset_title': 'Account Security',
        'auth.brand.reset_desc': 'Choose a strong password, at least 6 characters, to protect your account.',
        'auth.brand.confirm_title': 'Security Verification',
        'auth.brand.confirm_desc': 'Phone confirmation ensures only you can reset your password.',
        'auth.forgot.sent_title': 'Email sent',
        'auth.confirm.invalid_title': 'Invalid link',
        'auth.confirm.invalid': 'The confirmation link has expired or has already been used.',
        'auth.confirm.success_title': 'Confirmed',
        'auth.confirm.success': 'You have successfully confirmed on your phone.',
        'auth.confirm.hint': 'Return to your computer — the page will automatically open the new password form.',
        'auth.login.google_err_cfg': 'Google OAuth is not configured. Please use standard login.',
        'auth.login.google_err':  'Google sign-in failed. Please try again.',
        'auth.register.subtitle': 'Join VietVoice and start creating AI voices',
        'auth.register.free_badge':'🎁 Free 100,000 characters on signup',
        'auth.register.confirm_pw': 'Confirm Password',
        'auth.register.btn_free': 'Sign Up Free',
        'auth.register.google':   'Quick sign up with Google',
        'auth.register.has_account':'Already have an account?',
        'auth.register.login_link':'Sign in →',
        'auth.register.terms_prefix': 'I agree to the',
        'auth.register.terms_link':   'Terms of Service',
        'auth.register.terms_and':    ' and ',
        'auth.register.privacy_link': 'Privacy Policy',
        'auth.register.terms_suffix': ' of VietVoice',
        'auth.ph.username':       'Enter username',
        'auth.ph.login_identifier':'Enter username or email',
        'auth.ph.email_login':    'yourname@domain.com',
        'auth.ph.password_dots':  '••••••••',
        'auth.ph.password':       'Enter password',
        'auth.ph.fullname':       'John Doe',
        'auth.ph.email':          'email@example.com',
        'auth.ph.password_min':   'At least 6 characters',
        'auth.ph.confirm_pw':     'Re-enter password',

        // ── Admin ──
        'admin.title':            'Admin Dashboard',
        'admin.nav.dashboard':    'Dashboard',
        'admin.nav.users':        'User Management',
        'admin.nav.voices':       'Voice Management',
        'admin.nav.payments':     'Payment Management',
        'admin.nav.landing':      'Landing Page',
        'admin.nav.settings':     'Site Settings',
        'admin.nav.policies':     'Policy Settings',
        'admin.cfg.policies_title': 'Policy Settings',
        'admin.cfg.policies_sub': 'Terms, privacy, data deletion, payment — saved to JSON files',
        'admin.cfg.save':         'Save',
        'admin.cfg.main_tab.legal': 'Legal pages',
        'admin.cfg.main_tab.support': 'Support & FAQ',
        'admin.cfg.legal_title':  'Legal pages',
        'admin.cfg.legal_desc_short': '4 legal pages (editor) + User & Installation guides (Markdown).',
        'admin.cfg.legal_tab.user_guide': 'User guide',
        'admin.cfg.legal_tab.installation_guide': 'Installation guide',
        'admin.cfg.guide_md_desc': 'Write in Markdown (# headings, tables, code). Use ## for each major section.',
        'admin.cfg.guide_md_label': 'Markdown',
        'admin.cfg.guide_preview': 'Preview',
        'admin.cfg.legal_file_note': 'Changes are written to legal_content.json — not saved to the database.',
        'admin.cfg.legal_tab.terms': 'Terms of Use',
        'admin.cfg.legal_tab.privacy': 'Privacy Policy',
        'admin.cfg.legal_tab.data_deletion': 'Data Deletion Policy',
        'admin.cfg.legal_tab.payment': 'Payment Terms',
        'admin.cfg.legal_updated': 'Display update date',
        'admin.cfg.add_section':  'Add section',
        'admin.cfg.support_title': 'Support & FAQ',
        'admin.cfg.support_desc': 'Contact channels, guides and FAQs on /support.',
        'admin.cfg.support_file_note': 'Changes are written to support_content.json — not saved to the database.',
        'admin.cfg.support_tab.contact': 'Contact',
        'admin.cfg.support_tab.guides': 'Guides',
        'admin.cfg.support_tab.faq': 'FAQ',
        'admin.cfg.support_cards_title': 'Contact channels',
        'admin.cfg.support_cards_desc': 'Cards shown on the Support page.',
        'admin.cfg.support_guides_block': 'Usage guides',
        'admin.cfg.support_guides_desc': 'Step-by-step guide blocks.',
        'admin.cfg.support_faq_block': 'Frequently asked questions',
        'admin.cfg.support_faq_desc': 'FAQ list on the Support page.',
        'admin.nav.back':         'Back to App',
        'admin.settings.title':       'Site Settings',
        'admin.settings.subtitle':    'Logo, email, plans — Policies in Policy Settings',
        'admin.settings.save':        'Save settings',
        'admin.settings.saving':      'Saving…',
        'admin.settings.saved':       'Site settings saved',
        'admin.settings.load_error':  'Could not load settings',
        'admin.settings.save_hint':   'Ctrl+S to save settings',
        'admin.settings.tab.brand':   'Brand',
        'admin.settings.tab.email':   'Email & Contact',
        'admin.settings.tab.packages': 'Plans',
        'admin.settings.section.brand': 'Logo & site name',
        'admin.settings.brand_title': 'Logo & site name',
        'admin.settings.brand_sub':   'Name and logo shown in admin and public pages.',
        'admin.settings.email_title': 'Email & Contact',
        'admin.settings.email_sub':   'Emails shown to users and contact form.',
        'admin.settings.support_email': 'Support email',
        'admin.settings.contact_email': 'Contact form email',
        'admin.settings.smtp_display':  'Sender display name',
        'admin.settings.smtp_display_hint': 'From name in system emails (when SMTP is configured).',
        'admin.settings.company_name':  'Company name (contact)',
        'admin.settings.company_phone': 'Hotline',
        'admin.settings.smtp_env_title': 'SMTP configuration (server)',
        'admin.settings.smtp_env_hint': 'Read from environment — view only here.',
        'admin.settings.smtp_host':     'SMTP host',
        'admin.settings.smtp_from_env': 'From (env)',
        'admin.settings.packages_title': 'Subscription plans',
        'admin.settings.packages_sub':  'Plans shown on landing and checkout.',
        'admin.settings.pkg_add':       'Add new plan',
        'admin.settings.pkg_name':      'Plan name',
        'admin.settings.pkg_chars':     'Characters',
        'admin.settings.pkg_price':     'Price (VND)',
        'admin.settings.pkg_days':      'Duration (days)',
        'admin.settings.pkg_create':    'Create plan',
        'admin.settings.pkg_status':    'Status',
        'admin.settings.pkg_active':  'Visible',
        'admin.settings.pkg_hidden':  'Hidden',
        'admin.settings.pkg_show':    'Show',
        'admin.settings.pkg_hide':    'Hide',
        'admin.settings.pkg_empty':   'No plans yet',
        'admin.settings.pkg_validation': 'Enter plan name and character count',
        'admin.settings.pkg_created': 'Plan created',
        'admin.settings.pkg_updated': 'Plan updated',
        'admin.settings.pkg_edit':    'Edit',
        'admin.settings.pkg_edit_title': 'Edit plan',
        'admin.settings.pkg_save':    'Save changes',
        'admin.settings.pkg_cancel_edit': 'Cancel edit',
        'admin.settings.site_name':   'Display name',
        'admin.settings.logo':        'Website logo',
        'admin.settings.logo_drop':   'Drag & drop or click to choose logo',
        'admin.settings.logo_formats': 'PNG, JPG, WebP or SVG — max 2MB',
        'admin.settings.logo_upload':   'Upload logo',
        'admin.settings.logo_upload_hint': 'Logo is saved immediately on upload — no need to click Save.',
        'admin.settings.logo_saved':  'Logo updated',
        'admin.settings.logo_error':  'Logo upload failed',
        'admin.settings.preview.sidebar': 'Admin sidebar',
        'admin.settings.preview.public_nav': 'Public navbar',
        'admin.settings.preview.favicon': 'Favicon',
        'admin.settings.preview.favicon_hint': '32×32 in browser tab',
        'admin.settings.soon_email':  'Email & Contact',
        'admin.settings.soon_packages': 'Plans',
        'admin.settings.soon_phase2': 'Coming in Phase 2',
        'admin.overview':         'System Overview',
        'admin.overview.sub':     'Statistics and recent activity of VietVoice AI.',
        'admin.edit_landing':     'Edit Landing',
        'admin.lp.studio_title':  'Landing Studio',
        'admin.lp.studio_sub':    'Edit landing page content',
        'admin.lp.title':         'Edit Landing Page',
        'admin.lp.subtitle':      'Changes are saved and shown on the live site',
        'admin.lp.unsaved':       'Unsaved changes',
        'admin.lp.preview_soon':  'Live preview — coming in Phase 2',
        'admin.lp.preview_title': 'Live preview',
        'admin.lp.preview_live': 'Live preview',
        'admin.lp.preview_refresh': 'Refresh preview',
        'admin.lp.preview_opening': 'Opening…',
        'admin.lp.preview_blocked': 'Browser blocked new tab — allow popups and try again',
        'admin.lp.preview_error': 'Could not open preview',
        'admin.lp.preview_hint': 'Alt+Shift+P — switch to Preview tab',
        'admin.lp.tab.preview': 'Preview',
        'admin.lp.tab.edit': 'Edit',
        'admin.lp.preview_loading': 'Loading preview…',
        'admin.lp.preview_loading_sub': 'Content updates as you edit',
        'admin.lp.view_landing':  'View Landing',
        'admin.lp.back_admin':    'Back to Admin',
        'admin.lp.mobile_view':   'View Landing Page',
        'admin.lp.save':          'Save changes',
        'admin.lp.saving':        'Saving…',
        'admin.lp.saved':         'Landing content saved',
        'admin.lp.conn_error':    'Server connection error',
        'admin.lp.link_label':    'Label',
        'admin.lp.link_url':      'URL path',
        'admin.lp.link_add':      'Add link',
        'admin.lp.link_hint':     'Display label and URL for each footer link.',
        'admin.lp.hero_sub':      'Main headline, CTA and free-tier note.',
        'admin.lp.company_sub':   'Company card next to the hero section.',
        'admin.lp.about_new_sub': 'Vision, mission and commitment — 3 cards.',
        'admin.lp.footer_sub':    'Brand description, link columns and copyright.',
        'admin.lp.about_legacy_sub': 'Legacy section — keep in sync if still shown on landing.',
        'admin.lp.section.hero':       'Hero Section',
        'admin.lp.section.company':    'Company info (Hero card)',
        'admin.lp.section.about_new':  'About VietVoice AI',
        'admin.lp.section.trusted':    'Trusted by',
        'admin.lp.section.features':   'Key features',
        'admin.lp.section.steps':      '3-step guide',
        'admin.lp.section.showcase':   'Showcase',
        'admin.lp.section.final_cta':  'Final CTA',
        'admin.lp.section.about':      'About us',
        'admin.lp.section.footer':     'Footer',
        'admin.lp.label.tag':          'Small tag above title',
        'admin.lp.label.cta_primary':  'Primary CTA button',
        'admin.lp.label.title_line1':  'Headline line 1',
        'admin.lp.label.title_grad':   'Gradient line (purple–cyan)',
        'admin.lp.label.title_line3': 'Headline line 3',
        'admin.lp.label.free_note':    'Free note below button',
        'admin.lp.label.company_name': 'Company name',
        'admin.lp.label.company_desc': 'Company description',
        'admin.lp.label.mst':          'Tax ID',
        'admin.lp.label.representative': 'Representative',
        'admin.lp.label.address':      'Address',
        'admin.lp.label.hotline':      'Hotline',
        'admin.lp.label.since':        'Operating since',
        'admin.lp.label.section_title': 'Section title',
        'admin.lp.label.section_desc':  'Section description',
        'admin.lp.label.icon_material': 'Icon',
        'admin.lp.label.title':         'Title',
        'admin.lp.label.desc':          'Description',
        'admin.lp.label.trusted_label': 'Label',
        'admin.lp.label.trusted_items': 'Groups (one per line)',
        'admin.lp.label.small_label':   'Small label',
        'admin.lp.label.icon_emoji':    'Icon (emoji)',
        'admin.lp.label.card_title':    'Card title',
        'admin.lp.label.step_title':    'Step title',
        'admin.lp.label.cta_btn':       'CTA button',
        'admin.lp.label.badges':        'Badges (one per line)',
        'admin.lp.label.btn_primary':   'Primary button',
        'admin.lp.label.btn_secondary': 'Secondary button',
        'admin.lp.label.small_note':    'Small note',
        'admin.lp.label.brand_desc':    'Brand description (left column)',
        'admin.lp.label.footer_col1':   'Column 1 title',
        'admin.lp.label.footer_col2':   'Column 2 title',
        'admin.lp.label.footer_col3':   'Column 3 title',
        'admin.lp.label.col1_links':    'Column 1 links — Features',
        'admin.lp.label.col2_links':    'Column 2 links — Support',
        'admin.lp.label.copyright':     'Copyright',
        'admin.lp.label.info_row1':     'Info line 1 (Tax ID · Rep.)',
        'admin.lp.label.info_row2':     'Info line 2 (Address)',
        'admin.lp.label.info_row3':     'Info line 3 (Phone · Date)',
        'admin.refresh':          'Refresh',
        'admin.gen_samples':      'Generate Voice Samples',
        'admin.stat.users':       'Total Users',
        'admin.stat.conversions': 'Total Conversions',
        'admin.stat.voices':      'Voices',
        'admin.stat.chars_month': 'Characters (month)',
        'admin.stat.active':      'Active',
        'admin.stat.today':       'Today',
        'admin.stat.week':        'This Week',
        'admin.stat.month':       'This Month',
        'admin.stat.conv':        'Conversions:',
        'admin.stat.chars':       'Characters:',
        'admin.stat.active_users': '{n} active',
        'admin.stat.success_rate': '{n}% success',
        'admin.stat.avg_chars':   'Avg: {n} chars',
        'admin.stat.chars_short': 'chars',
        'admin.dash.leaders':     'Leaderboard',
        'admin.dash.period_label': 'Recent activity',
        'admin.chart.trend':      '7-day trend',
        'admin.chart.voice_dist': 'Top voices',
        'admin.chart.legend':     'Conversions',
        'admin.chart.other':      'Other',
        'admin.chart.custom_voice': 'Custom',
        'admin.chart.usage':      'uses',
        'admin.top_users':        'Top 5 Users',
        'admin.top_voices':       'Top 5 Voices',
        'admin.dash.quick.pay':   'Review payments',
        'admin.dash.quick.pay_sub': 'Pending transactions',
        'admin.dash.quick.lifecycle': 'Account lifecycle',
        'admin.dash.quick.lifecycle_sub': 'Deletion requests',
        'admin.dash.quick.users': 'Manage users',
        'admin.dash.quick.users_sub': 'Roles & status',
        'admin.dash.quick.voices': 'Voices & samples',
        'admin.dash.quick.voices_sub': 'Preview audio files',
        'admin.dash.chart_trend_sub': 'Daily conversion volume',
        'admin.dash.chart_voice_sub': 'Usage distribution',
        'admin.dash.leaders_sub': 'Top users and voices',
        'admin.dash.by_conversions': 'By conversions',
        'admin.dash.by_usage': 'By usage',
        'admin.nav.conversions': 'Conversions',
        'admin.section.conversions': 'Conversion log',
        'admin.conv.sub': 'Track all TTS activity system-wide',
        'admin.conv.search': 'Search user, voice, text...',
        'admin.conv.voice': 'Voice',
        'admin.conv.preview': 'Content',
        'admin.conv.item': 'conversions',
        'admin.conv.status.completed': 'Completed',
        'admin.conv.status.failed': 'Failed',
        'admin.conv.status.processing': 'Processing',
        'admin.user.view_detail': 'Account details',
        'admin.user.sub_title': 'Plan & quota',
        'admin.user.pkg': 'Plan',
        'admin.user.used': 'Used',
        'admin.user.limit': 'Limit',
        'admin.user.remaining': 'Remaining',
        'admin.user.until': 'Expires',
        'admin.user.add_chars': 'Add chars',
        'admin.user.reset_used': 'Reset usage',
        'admin.user.extend': 'Extend',
        'admin.user.apply_pkg': 'Apply plan',
        'admin.user.no_sub': 'No active plan',
        'admin.user.recent_pay': 'Recent payments',
        'admin.user.recent_conv': 'Recent conversions',
        'admin.user.custom_voices': 'Custom voices',
        'admin.dash.activity': 'Recent activity',
        'admin.dash.activity_sub': 'Latest conversions',
        'admin.dash.activity_preview': '3 latest',
        'admin.dash.view_all': 'View all',
        'admin.export.csv': 'Export CSV',
        'admin.report.btn': 'Export report',
        'admin.report.title': 'Export report',
        'admin.report.sub': 'Choose report type, time range and file format',
        'admin.report.type_label': 'Report type',
        'admin.report.type.overview': 'System overview',
        'admin.report.type.overview_sub': 'KPIs, trends, top rankings',
        'admin.report.type.users': 'Users',
        'admin.report.type.users_sub': 'Accounts & subscriptions',
        'admin.report.type.conversions': 'Conversions',
        'admin.report.type.conversions_sub': 'TTS activity log',
        'admin.report.type.payments': 'Payments',
        'admin.report.type.payments_sub': 'Transactions & status',
        'admin.report.period_label': 'Time range',
        'admin.report.period.custom': 'Custom',
        'admin.report.format_label': 'File format',
        'admin.report.format.pdf': 'PDF',
        'admin.report.format.docx': 'Word',
        'admin.report.format.csv': 'CSV',
        'admin.report.hint.overview': 'PDF/Word: formatted report with KPIs and rankings.',
        'admin.report.hint.csv': 'CSV UTF-8: raw data, up to 5,000 rows.',
        'admin.report.download': 'Download',
        'admin.report.downloading': 'Generating…',
        'admin.report.success': 'Report downloaded',
        'admin.filter.from': 'From',
        'admin.filter.to': 'To',
        'admin.filter.apply': 'Apply',
        'admin.saved': 'Saved',
        'admin.section.users':    'User Management',
        'admin.section.voices':   'Voice Management',
        'admin.section.payments': 'Payment Management',
        'admin.col.username':     'Username',
        'admin.col.email':        'Email',
        'admin.col.role':         'Role',
        'admin.col.status':       'Status',
        'admin.col.actions':      'Actions',
        'admin.col.voice':        'Voice',
        'admin.col.package':      'Package',
        'admin.col.amount':       'Amount',
        'admin.col.date':         'Date',
        'admin.btn.approve':      'Approve',
        'admin.btn.reject':       'Reject',
        'admin.btn.delete':       'Delete',
        'admin.btn.suspend':      'Suspend',
        'admin.btn.activate':     'Activate',
        'admin.search_users':     'Search users...',
        'admin.loading':          'Loading...',
        'admin.no_data':          'No data',
        'admin.nav.lifecycle':    'Account Lifecycle',
        'admin.lifecycle.sub':  'Deletion requests and 30-day deactivated accounts.',
        'admin.users.sub':      'Search, suspend, and manage user roles.',
        'admin.payments.sub':   'Track transactions and approve payments.',
        'admin.updated_at':     'Updated: {time}',
        'admin.copy':           'Copy',
        'admin.filter.all':     'All',
        'admin.action.promote': 'Grant Admin',
        'admin.action.demote':  'Revoke Admin',
        'admin.pay.method.bank_qr': 'Bank QR',
        'admin.pay.method.bank_transfer': 'Bank transfer',
        'admin.pay.method.momo': 'MoMo',
        'admin.pay.method.vnpay': 'VNPay',
        'admin.pay.status.pending': 'Pending',
        'admin.pay.status.completed': 'Paid',
        'admin.pay.status.failed': 'Failed',
        'admin.pay.status.cancelled': 'Cancelled',
        'admin.pay.summary.revenue': 'Revenue (paid)',
        'admin.pay.summary.total': 'Total transactions',
        'admin.pay.summary.completed': 'Paid',
        'admin.pay.summary.pending': 'Pending approval',
        'admin.voices.sub':     'System voices and preview samples.',
        'admin.voices.system_title': 'System voices',
        'admin.voices.system_hint': 'Manage TTS voices and preview samples.',
        'admin.voices.generate_all': 'Generate all samples',
        'admin.voices.generate_ok': 'Samples generated',
        'admin.voices.col.name': 'Voice name',
        'admin.voices.col.desc': 'Description',
        'admin.voices.col.sample': 'Sample',
        'admin.voices.has_sample': 'Available',
        'admin.voices.no_sample': 'None',
        'admin.lifecycle.flow_title': 'Account deletion workflow',
        'admin.lifecycle.flow_desc': 'User request → Admin approve → 30-day deactivation (restorable) → Permanent delete after deadline.',
        'admin.lifecycle.step1': 'Deletion request',
        'admin.lifecycle.step2': 'Admin review',
        'admin.lifecycle.step3': '30-day grace',
        'admin.lifecycle.step4': 'Permanent delete',
        'admin.lifecycle.pending': 'Pending approval',
        'admin.lifecycle.grace': 'In grace period',
        'admin.lifecycle.restore_req': 'Restore requests',
        'admin.lifecycle.window': 'Grace window',
        'admin.lifecycle.days': '30 days',
        'admin.users.total': 'Total users',
        'admin.users.active': 'Active',
        'admin.users.admins': 'Admins',
        'admin.users.locked': 'Suspended',
        'admin.users.empty_hint': 'Registered users will appear here.',
        'admin.users.filter_empty': 'Try a different filter or search term.',
        'admin.del.empty_hint': 'When users request deletion, they will appear here.',
        'admin.grace.empty_hint': 'Approved accounts in the 30-day waiting period appear here.',
        'admin.pay.search': 'Search TX ID, user...',
        'admin.pay.filter_empty': 'Try a different filter or search term.',
        'admin.table.showing': 'Showing {n} items',
        'admin.table.showing_filtered': 'Showing {n} / {total}',
        'admin.voices.total': 'Total voices',
        'admin.voices.with_sample': 'With sample',
        'admin.voices.without_sample': 'No sample',
        'admin.voices.workspace': 'Workspace',
        'admin.voices.listen': 'Listen',
        'admin.voices.empty_hint': 'System voices from /api/voices.',
        'admin.role.admin':             'Admin',
        'admin.role.user':              'User',
        'admin.role.promote':           'Grant Admin',
        'admin.role.demote':            'Revoke Admin',
        'admin.status.active':          'Active',
        'admin.status.suspended':       'Suspended',

        // ── Admin Deletion Requests ──
        'admin.nav.deletions':          'Deletion Requests',
        'admin.section.deletions':      'Account Deletion Requests',
        'admin.section.grace':          'Deactivated Accounts (30 days)',
        'admin.del.reason':             'Reason',
        'admin.del.requested_at':       'Submitted At',
        'admin.del.empty':              'No pending deletion requests',
        'admin.del.status.pending':     'Pending',
        'admin.del.approve.title':      'Confirm Account Deletion',
        'admin.del.approve.confirm':    'Are you sure you want to deactivate this account? It will be deactivated for 30 days and permanently deleted after.',
        'admin.del.approve.btn':        'Confirm Deletion',
        'admin.del.approve.action':     'Approve',
        'admin.del.approve.ok':         'Account deactivated',
        'admin.del.reject.title':       'Reject Deletion Request',
        'admin.del.reject.note':        'Note (optional)',
        'admin.del.reject.btn':         'Reject',
        'admin.del.reject.ok':          'Request rejected',
        'admin.del.cancel':             'Cancel',

        // ── Legal (shared + privacy) ──
        'legal.badge':            'Legal',
        'legal.guide.badge':      'Guide',
        'legal.install.badge':    'Setup',
        'legal.updated':          'Last updated: June 2026',
        'legal.updated_prefix':   'Updated:',
        'legal.privacy.intro':    'VietVoice ("we") is committed to protecting your privacy. This policy describes how we collect, use and protect personal information when you use VietVoice — the AI text-to-speech platform.',
        'legal.privacy.agree':    'By using VietVoice, you agree to the terms of this policy.',
        'legal.privacy.s1':       'Introduction',
        'legal.privacy.s2':       'Developer Information',
        'legal.privacy.s3':       'Data We Collect',
        'legal.privacy.s4':       'How We Use Data',
        'legal.privacy.s5':       'Data Sharing',
        'legal.privacy.s6':       'Data Security',
        'legal.privacy.s7':       'Your Rights',
        'legal.privacy.s8':       'Contact',
        'legal.terms.s1':         'Acceptance of Terms',
        'legal.terms.s2':         'Service Description',
        'legal.terms.s3':         'User Accounts',
        'legal.terms.s4':         'Acceptable Use',
        'legal.terms.s5':         'Payments & Subscriptions',
        'legal.terms.s6':         'Intellectual Property',
        'legal.terms.s7':         'Limitation of Liability',
        'legal.terms.s8':         'Changes to Terms',
        'legal.deletion.s1':      'Overview',
        'legal.deletion.s2':      'How to Request Deletion',
        'legal.deletion.s3':      'What Gets Deleted',
        'legal.deletion.s4':      'Retention Period',
        'legal.support.s1':       'Getting Started',
        'legal.support.s2':       'Account & Billing',
        'legal.support.s3':       'TTS & Voices',
        'legal.support.s4':       'Technical Issues',
        'legal.support.badge':    'Support',
        'legal.support.hero':     'We are always ready to help. Choose the contact method that works for you.',
        'legal.deletion.title':   'Data Deletion Policy',

        // ── Export format ──
        'export.format':          'Export Format',
        'export.bitrate':         'Bitrate',
        'export.format.wav':      'WAV (lossless)',
        'export.format.mp3':      'MP3',
        'export.format.ogg':      'OGG Vorbis',
        'export.download':        'Download',
        'export.ffmpeg_missing':  'MP3/OGG requires ffmpeg on server. Downloading WAV instead.',
        'export.kbps':            'kbps',

        // ── Dynamic error / toast messages ──
        'err.login_required':     'Please sign in',
        'err.unauthorized':       'Unauthorized',
        'err.connection':         'Connection error',
        'err.login_failed':       'Sign in failed',
        'err.account_deleted':    'Your account has been deleted or deactivated.',
        'err.account_deactivated_grace': 'Your account has been deactivated. You can request restoration within 30 days (until {until}). Please use "Restore a deactivated account?" on the login page.',
        'err.register_failed':    'Registration failed',
        'err.password_mismatch':  'Passwords do not match',
        'err.terms_required':     'Please agree to the Terms of Service to register',
        'err.convert_failed':     'Conversion failed',
        'err.file_not_found':     'File not found',
        'err.quota_exceeded':     'Character quota exceeded',
        'err.invalid_data':       'Invalid data',
        'err.delete_failed':      'Delete failed',
        'err.save_failed':        'Save failed',
        'err.load_failed':        'Failed to load data',
        'err.register_success':   'Registration successful. Please sign in.',
        'err.retry_dev':          'Retry feature is under development',
        'err.name_empty':         'Name cannot be empty',
        'err.fill_all':           'Please fill in all fields',
        'err.pw_min':             'Password must be at least 6 characters',
        'err.pw_mismatch':        'Confirm password does not match',
        'err.update_success':     'Updated successfully!',
        'err.pw_change_success':  'Password changed successfully!',
        'i18n.translating':       'Translating...',
        'ws.lang_warning':      'This system is optimized for Vietnamese text. Results with other languages may be less accurate.',
    };

    // ── Vietnamese translations (default — same keys) ─────────────────
    const VI = {
        'nav.home':         'Trang chủ',
        'nav.library':      'Thư viện',
        'nav.history':      'Lịch sử',
        'nav.voices':       'Giọng của tôi',
        'nav.pricing':      'Thanh toán',
        'nav.contact':      'Liên hệ',
        'nav.admin':        'Quản trị',
        'nav.logout':       'Đăng xuất',
        'nav.login':        'Đăng nhập',
        'nav.register':     'Bắt đầu miễn phí',
        'nav.features':     'Tính năng',
        'nav.theme':        'Chuyển sáng/tối',
        'nav.about':        'Về chúng tôi',

        // ── Landing page (static UI) ──
        'lp.page.title':        'VietVoice AI - Bộ công cụ công nghệ AI toàn diện',
        'lp.hero.subtitle':     'Kiến tạo trải nghiệm âm thanh sống động với công nghệ Neural Synthesis đỉnh cao. Tốc độ xử lý tức thì, chất lượng chuẩn phòng thu chỉ trong vài giây.',
        'lp.btn.view_features': 'Xem tính năng',
        'lp.demo.window_title': 'VietVoice AI — Chuyển văn bản thành giọng nói',
        'lp.demo.voice':        'Giọng Nam Miền Nam',
        'lp.demo.sample_text':  'Xin chào! Đây là <span class="text-primary font-semibold">VietVoice AI</span>, nền tảng chuyển đổi văn bản thành giọng nói tự nhiên nhất Việt Nam.',
        'lp.demo.convert':      'Chuyển đổi',
        'lp.demo.hint':         'Nhấn "Chuyển đổi" để nghe thử',
        'lp.demo.processing':   'Đang xử lý...',
        'lp.demo.synthesizing': 'Đang tổng hợp giọng nói...',
        'lp.demo.ready':        '✓ Đã tổng hợp xong — sẵn sàng phát',
        'lp.stats.accuracy':    'Độ chính xác',
        'lp.stats.generated':   'Giọng đã tạo',
        'lp.stats.users':       'Người dùng',
        'lp.badge.latency':     'Độ trễ',
        'lp.badge.latency_val': '< 200ms',
        'lp.badge.voices':      'Giọng nói',
        'lp.badge.voices_val':  '50+ giọng',
        'lp.pricing.badge':     'Minh bạch, không ẩn phí',
        'lp.pricing.title':     'Bảng giá linh hoạt',
        'lp.pricing.subtitle':  'Chọn gói phù hợp với nhu cầu của bạn. Nâng cấp hoặc hủy bất kỳ lúc nào.',
        'lp.pricing.free_note': '<span class="material-symbols-outlined text-green-400 text-base align-middle mr-1">check_circle</span> Bắt đầu miễn phí với <strong class="text-on-surface">100.000 ký tự</strong> — không cần thẻ tín dụng.',
        'lp.about.trust_title': 'Giải pháp tin cậy',
        'lp.about.trust_desc':  'Được tin dùng bởi hơn 200 doanh nghiệp lớn tại Việt Nam.',
        'lp.legal.title':       'Thông tin pháp lý',
        'lp.legal.company_name':'Tên công ty',
        'lp.legal.mst':         'Mã số thuế',
        'lp.legal.representative':'Người đại diện',
        'lp.legal.since':       'Ngày cấp phép',
        'lp.legal.address':     'Trụ sở chính',
        'lp.legal.hotline':     'Hotline',
        'lp.legal.email':       'Email',
        'lp.price.free':        'Miễn phí',
        'lp.price.currency':    'đ',
        'lp.duration.1m':       '1 tháng',
        'lp.duration.3m':       '3 tháng',
        'lp.duration.6m':       '6 tháng',
        'lp.duration.1y':       '1 năm',
        'lp.duration.days':     '{n} ngày',
        'lp.pkg.chars':         '<strong>{n}</strong> ký tự / kỳ',
        'lp.pkg.valid':         'Hiệu lực <strong>{d}</strong>',
        'lp.pkg.voices':        'Toàn bộ giọng nói có sẵn',
        'lp.pkg.download':      'Tải file MP3 / WAV',
        'lp.pkg.support':       'Hỗ trợ qua email',
        'lp.btn.start_free':    'Bắt đầu miễn phí',
        'lp.btn.register':      'Đăng ký ngay',
        'lp.popular':           '⭐ Phổ biến nhất',
        'lp.fallback.basic':    'Cơ bản',
        'mob.home':         'Trang chủ',
        'mob.library':      'Thư viện Audio',
        'mob.history':      'Lịch sử chuyển đổi',
        'mob.voices':       'Giọng của tôi',
        'mob.pricing':      'Bảng giá',
        'mob.contact':      'Liên hệ',
        'mob.admin':        'Quản trị',
        'mob.logout':       'Đăng xuất',
        'mob.features':     'Tính năng',
        'mob.login':        'Đăng nhập',
        'mob.register':     'Bắt đầu miễn phí',
        'ft.tagline':       'Nền tảng chuyển văn bản thành giọng nói AI tiên phong — chất lượng cao, cảm xúc phong phú, hỗ trợ clone giọng cá nhân.',
        'ft.col.features':  'Tính năng',
        'ft.col.support':   'Hỗ trợ',
        'ft.col.account':   'Tài khoản',
        'ft.col.legal':     'Pháp lý',
        'ft.tts':           'Chuyển văn bản → Giọng nói',
        'ft.clone':         'Clone giọng cá nhân',
        'ft.emotional':     'Emotional TTS',
        'ft.audio-lib':     'Thư viện âm thanh',
        'ft.pricing':       'Bảng giá & Nâng cấp',
        'ft.support':       'Hỗ trợ & FAQ',
        'ft.user-guide':    'Hướng dẫn sử dụng',
        'ft.install-guide': 'Hướng dẫn cài đặt',
        'ft.contact':       'Liên hệ hỗ trợ',
        'ft.bugreport':     'Báo lỗi',
        'ft.home':          'Trang chủ',
        'ft.history':       'Lịch sử chuyển đổi',
        'ft.voices':        'Giọng của tôi',
        'ft.logout':        'Đăng xuất',
        'ft.login':         'Đăng nhập',
        'ft.register':      'Đăng ký miễn phí',
        'ft.upgrade':       'Nâng cấp tài khoản',
        'ft.privacy':       'Chính sách quyền riêng tư',
        'ft.terms':         'Điều khoản sử dụng',
        'ft.deletion':      'Chính sách xóa dữ liệu',
        'ft.payment':       'Điều khoản thanh toán',
        'ft.copy':          '© 2026 VietVoice · Công nghệ AI ·',
        'ft.terms-link':    'Điều khoản dịch vụ',
        'ft.privacy-link':  'Chính sách bảo mật',
        'ft.support-link':  'Hỗ trợ',
        'ft.disclaimer':    'Hệ thống đang trong giai đoạn thử nghiệm (beta). Mọi phản hồi đều giúp cải thiện trải nghiệm.',
        'ft.dashboard':     '✦ Bảng điều khiển',
        'ft.start-free':    '✦ Bắt đầu miễn phí',
        'ws.title':             'Chuyển văn bản thành giọng nói',
        'ws.subtitle':          'Công nghệ AI tiên tiến • Giọng Việt tự nhiên • Chất lượng cao • Cảm xúc phong phú',
        'ws.tab.text':          'Nhập văn bản',
        'ws.tab.file':          'Tải file lên',
        'ws.tab.emotional':     'Emotional TTS',
        'ws.input.title':       'Nội dung chuyển đổi',
        'ws.result.title':      'Kết quả',
        'ws.placeholder':       'Nhập hoặc dán văn bản của bạn vào đây...',
        'ws.placeholder.ex':    'Ví dụ: Xin chào! Đây là hệ thống chuyển văn bản thành giọng nói bằng AI.',
        'ws.chars':             'ký tự',
        'ws.voice.label':       'CHỌN GIỌNG ĐỌC',
        'ws.voice.loading':     'Đang tải danh sách giọng...',
        'ws.voice.test':        'Nghe thử',
        'ws.btn.convert':       '⊙ Chuyển đổi ngay',
        'ws.btn.emotional':     '🎭 Chuyển đổi với cảm xúc',
        'ws.result.empty':      'Chưa có kết quả',
        'ws.result.hint':       'Nhập văn bản và nhấn "Chuyển đổi" để bắt đầu',
        'ws.result.processing': 'Đang xử lý âm thanh',
        'ws.result.wait':       'Vui lòng đợi trong giây lát',
        'ws.result.progress':   'Tiến trình',
        'ws.result.step1':      'Phân tích văn bản',
        'ws.result.step2':      'Tổng hợp giọng nói',
        'ws.result.step3':      'Hoàn thiện audio',
        'ws.result.success':    'Chuyển đổi thành công!',
        'ws.result.download':   'Tải xuống',
        'ws.result.replay':     'Phát lại',
        'ws.stats.count':       'Lần chuyển đổi',
        'ws.stats.used':        'Ký tự đã dùng',
        'ws.stats.remain':      'Còn lại',
        'em.voice.label':   'Giọng đọc (Emotional)',
        'em.voice.default': '⭐ Mặc định',
        'em.voice.note':    'Chỉ hỗ trợ giọng viXTTS Clone.',
        'em.voice.add':     'Thêm giọng mới',
        'em.joy':           'Vui',
        'em.banner.title':  'Emotional TTS — AI đọc với cảm xúc tự nhiên!',
        'em.banner.sub':    'Giọng của bạn + cảm xúc tự động thay đổi theo nội dung văn bản',
        'em.excited':       'Hứng khởi',
        'em.calm':          'Bình tĩnh',
        'em.sad':           'Buồn',
        'rvc.title':        'Điều chỉnh giọng nói',
        'rvc.desc':         'Tinh chỉnh cao độ và tone giọng theo ý muốn',
        'rvc.pitch':        'Cao độ (Pitch)',
        'rvc.low':          'Âm thấp hơn ←',
        'rvc.high':         '→ Âm cao hơn',
        'rvc.blend':        'Độ pha trộn (Index Rate)',
        'rvc.protect':      'Bảo vệ phụ âm (Protect)',
        'rvc.quick':        '⚡ Cài đặt nhanh:',
        'rvc.male2female':  'Nam→Nữ',
        'rvc.female2male':  'Nữ→Nam',
        'rvc.higher':       'Cao hơn',
        'rvc.lower':        'Thấp hơn',
        'rvc.reset':        '↺ Reset',
        'rvc.apply':        'Áp dụng hiệu ứng',
        'rvc.applying':     'Đang xử lý...',
        'rvc.success':      'Đã áp dụng hiệu ứng thành công!',
        'tip.title':    'Mẹo sử dụng',
        'tip.1':        'Sử dụng dấu chấm, phẩy để giọng đọc ngắt nghỉ tự nhiên hơn.',
        'tip.2':        'Tách đoạn văn dài thành nhiều phần nhỏ hơn 2000 ký tự.',
        'tip.3':        'Thử các giọng đọc khác nhau để tìm phong cách phù hợp nhất.',
        'tip.4':        'Dùng Emotional TTS để AI tự điều chỉnh cảm xúc theo văn bản.',
        'tip.5':        'Điều chỉnh Pitch sau chuyển đổi để thay đổi cao độ giọng.',
        'gallery.title':    'Thư viện giọng đọc',
        'gallery.subtitle': 'Nghe thử và chọn giọng đọc phù hợp với nội dung của bạn',
        'gallery.loading':  'Đang tải danh sách giọng...',
        'gallery.search.placeholder': 'Tìm giọng đọc...',
        'gallery.filter.all':   'Tất cả',
        'gallery.filter.male':  'Nam',
        'gallery.filter.female':'Nữ',
        'gallery.filter.north': 'Miền Bắc',
        'gallery.filter.south': 'Miền Nam',
        'gallery.favorites':    'Yêu thích',
        'gallery.tab.system':   'Giọng hệ thống',
        'gallery.tab.custom':   'Giọng của tôi',
        'gallery.select_hint':  'Chọn một giọng để tiếp tục',
        'gallery.selected':     'Đã chọn',
        'gallery.chosen':       'Đã chọn giọng',
        'gallery.btn.use_voice':'Dùng giọng này',
        'gallery.cancel':       'Huỷ',
        'gallery.empty':        'Không có giọng phù hợp',
        'gallery.empty_custom': 'Chưa có giọng clone. Thêm tại Giọng của tôi.',
        'gallery.no_sample':    'Chưa có mẫu',
        'gallery.preview':      'Nghe thử',
        'gallery.custom_badge': 'Clone',
        'file.drop':              'Kéo thả file hoặc click để chọn',
        'file.drop.title':        'Kéo thả file hoặc click để chọn',
        'file.drop.hint':         'TXT, PDF, DOCX — tối đa 10MB',
        'file.support':           'Hỗ trợ: TXT, PDF, DOCX (tối đa 10MB)',
        'file.pdf_scan_warning':  'PDF cần có lớp văn bản (không hỗ trợ file scan/ảnh).',
        'file.status.processing': 'Đang trích xuất văn bản…',
        'file.success.extracted': 'Đã trích xuất văn bản',
        'file.preview.placeholder': 'Nội dung trích xuất sẽ hiển thị tại đây…',
        'file.btn.edit':          'Chỉnh sửa',
        'file.btn.done':          'Xong',
        'file.btn.change':        'Đổi file',
        'file.error.format':      'Định dạng file không được hỗ trợ. Chỉ TXT, PDF, DOCX.',
        'file.error.size':        'File quá lớn. Tối đa 10MB.',
        'file.error.empty':       'Không tìm thấy văn bản trong file.',
        'file.error.read':        'Lỗi đọc file',
        'hist.title':       'Lịch sử chuyển đổi',
        'hist.total':       'Tổng chuyển đổi',
        'hist.chars':       'Ký tự đã dùng',
        'hist.download':    'Tải xuống',
        'hist.delete':      'Xóa',
        'hist.empty':       'Chưa có lịch sử',
        'lib.title':        'Thư viện âm thanh',
        'lib.search':       'Tìm kiếm...',
        'lib.filter.all':   'Tất cả',
        'lib.empty':        'Chưa có file âm thanh',
        'voices.title':     'Giọng của tôi',
        'voices.add':       '+ Thêm giọng mới',
        'voices.empty':     'Chưa có giọng nào. Hãy tạo giọng clone đầu tiên!',
        'voices.status.processing': 'Đang xử lý',
        'voices.status.ready':      'Sẵn sàng',
        'voices.status.failed':     'Thất bại',
        'price.title':      'Bảng giá',
        'price.free':       'Miễn phí',
        'price.upgrade':    'Nâng cấp',
        'price.current':    'Gói hiện tại',
        'contact.title':    'Liên hệ',
        'contact.name':     'Họ và tên',
        'contact.email':    'Email',
        'contact.message':  'Nội dung',
        'contact.send':     'Gửi tin nhắn',
        'auth.login.title':     'Đăng nhập',
        'auth.login.welcome':   'Chào mừng trở lại',
        'auth.login.btn_now':   'Đăng nhập ngay',
        'auth.login.identifier':'Tên đăng nhập hoặc email',
        'auth.login.btn':       'Đăng nhập',
        'auth.login.google':    'Đăng nhập với Google',
        'auth.register.title':  'Tạo tài khoản',
        'auth.register.btn':    'Đăng ký',
        'auth.username':        'Tên đăng nhập',
        'auth.password':        'Mật khẩu',
        'auth.fullname':        'Họ và tên',
        'auth.email':           'Email',
        'auth.login.forgot':    'Quên mật khẩu?',
        'auth.forgot.title':    'Quên mật khẩu',
        'auth.forgot.subtitle': 'Nhập email đã đăng ký tài khoản VietVoice (không phải email SMTP gửi đi). Chúng tôi sẽ gửi link đặt lại mật khẩu.',
        'auth.forgot.btn':      'Gửi link đặt lại',
        'auth.forgot.back_login':'← Quay lại đăng nhập',
        'auth.forgot.sent':     'Nếu email tồn tại, link đặt lại đã được gửi. Vui lòng kiểm tra hộp thư (cả thư mục spam).',
        'auth.forgot.wait_title':'Đang chờ xác nhận từ điện thoại...',
        'auth.forgot.wait_step1':'📱 Mở email trên điện thoại',
        'auth.forgot.wait_step2':'✅ Nhấn「Xác nhận trên điện thoại」',
        'auth.forgot.wait_step3':'💻 Trang máy tính này sẽ tự chuyển sang đặt mật khẩu',
        'auth.reset.title':     'Đặt lại mật khẩu',
        'auth.reset.subtitle':  'Nhập mật khẩu mới cho tài khoản của bạn.',
        'auth.reset.new_pw':    'Mật khẩu mới',
        'auth.reset.confirm_pw':'Xác nhận mật khẩu',
        'auth.reset.btn':       'Đặt lại mật khẩu',
        'auth.reset.invalid':   'Link không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.',
        'auth.reset.request_new':'Yêu cầu link mới →',
        'auth.reset.success':   'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
        'legal.privacy':    'Chính sách quyền riêng tư',
        'legal.terms':      'Điều khoản sử dụng',
        'legal.deletion':   'Chính sách xóa dữ liệu',
        'legal.payment':    'Điều khoản thanh toán',
        'legal.support':    'Hỗ trợ & FAQ',
        'legal.user-guide': 'Hướng dẫn sử dụng',
        'legal.install':    'Hướng dẫn cài đặt',
        'common.close':     'Đóng',
        'common.save':      'Lưu',
        'common.cancel':    'Hủy',
        'common.delete':    'Xóa',
        'common.loading':   'Đang tải...',
        'common.error':     'Có lỗi xảy ra',
        'common.success':   'Thành công!',
        'common.back':      '← Quay lại',
        'common.chars_remaining': 'Ký tự còn lại',
        'common.chars':     'ký tự',
        'common.reset':     'Đặt lại',
        'common.prev':      'Trước',
        'common.next':      'Sau',
        'common.times':     'lần',
        'side.create_audio':  'Tạo Audio mới',
        'side.audio_library': 'Thư viện Audio',
        'side.my_voices':     'Giọng của tôi',
        'side.history':       'Lịch sử chuyển đổi',
        'side.pricing':       'Bảng giá',
        'side.contact':       'Liên hệ',
        'side.profile':       'Hồ sơ',
        'side.upgrade':       'Nâng cấp gói',
        'bottom.create':    'Tạo',
        'bottom.library':   'Thư viện',
        'bottom.voices':    'Giọng',
        'bottom.history':   'Lịch sử',
        'bottom.pricing':   'Gói',
        'bottom.contact':   'Liên hệ',
        'bottom.create_new': 'Tạo mới',
        'mv.title':               'Giọng của tôi',
        'mv.subtitle':            'Quản lý và tạo giọng nói tùy chỉnh của bạn',
        'mv.add_voice':           '+ Thêm giọng mới',
        'mv.empty.title':         'Chưa có giọng nào',
        'mv.empty.desc':          'Tạo giọng nói đầu tiên của bạn bằng cách upload audio sample hoặc chọn giọng nền có sẵn',
        'mv.empty.cta':           'Tạo giọng đầu tiên',
        'mv.status.ready':        'Đã sẵn sàng',
        'mv.status.training':     'Đang train...',
        'mv.status.pending':      'Đang chờ...',
        'mv.status.failed':       'Thất bại',
        'mv.progress.label':      'Đang train',
        'mv.progress.bg_note':    'Training trong background, sẽ nhận thông báo khi xong',
        'mv.meta.created':        'Đã tạo:',
        'mv.meta.sample':         'Mẫu audio:',
        'mv.meta.usage':          'Số lần dùng:',
        'mv.meta.times':          'lần',
        'mv.btn.preview':         'Nghe thử',
        'mv.btn.use':             'Sử dụng',
        'mv.btn.retry':           'Thử lại',
        'mv.modal.title':         'Test giọng nói',
        'mv.modal.label':         'Nhập văn bản để test:',
        'mv.modal.placeholder':   'Xin chào, đây là giọng custom của tôi...',
        'mv.modal.hint':          'Nhập câu văn mẫu để nghe thử giọng nói',
        'mv.modal.loading':       'Đang tạo audio test...',
        'mv.modal.success':       'Test thành công! Nghe audio bên dưới:',
        'mv.modal.btn_test':      'Test ngay',

        // ── Add Voice page ──
        'addv.title':             'Thêm giọng mới',
        'addv.subtitle':          'Upload audio sample hoặc chọn giọng nền để tạo giọng nói tùy chỉnh',
        'addv.step1.title':       'Upload Audio Sample',
        'addv.step1.optional':    '(Tuỳ chọn)',
        'addv.step1.desc':        'Upload file audio chứa giọng nói của bạn nếu muốn train voice riêng. Hoặc bỏ qua bước này và dùng giọng nền có sẵn.',
        'addv.upload.label':      'Kéo thả file hoặc click để chọn',
        'addv.upload.support':    'Hỗ trợ:',
        'addv.upload.length':     'Độ dài:',
        'addv.upload.quality':    'Chất lượng:',
        'addv.upload.quality_val':'Không noise, không echo',
        'addv.step2.title':       'Chế độ tạo giọng',
        'addv.step2.desc':        '<strong class="text-on-surface">RVC:</strong> Train model từ audio (mất vài phút). <strong class="text-on-surface">Zero-shot:</strong> Clone giọng ngay từ mẫu (cần nhập transcript). <strong class="text-on-surface">viXTTS Clone:</strong> AI clone giọng bằng model viXTTS, không cần transcript.',
        'addv.zeroshot.label':    'Zero-shot (clone từ mẫu)',
        'addv.transcript.label':  'Transcript',
        'addv.transcript.placeholder': 'Nhập chính xác nội dung mà người nói đọc trong file audio mẫu...',
        'addv.transcript.hint':   'Zero-shot cần transcript khớp với audio để clone giọng chính xác.',
        'addv.vixtts.title':      '🤖 viXTTS Clone — AI clone giọng',
        'addv.vixtts.desc':       'Model <strong class="text-on-surface">viXTTS</strong> sẽ học đặc trưng giọng nói từ file audio mẫu và tổng hợp giọng mới không cần transcript.',
        'addv.vixtts.tip':        '💡 <strong>Tip:</strong> Dùng file audio rõ ràng, ít tạp âm, dài 10–60 giây để có kết quả tốt nhất.',
        'addv.step3.title':       'Chọn giọng nền',
        'addv.step3.desc':        'Chọn giọng hệ thống làm nền, sau đó điều chỉnh để tạo giọng riêng của bạn.',
        'addv.base.label':        'Giọng nền',
        'addv.base.tip':          '💡 Giọng custom sẽ dựa trên giọng nền này',
        'addv.step4.title':       'Điều chỉnh giọng',
        'addv.step4.desc':        'Tinh chỉnh giọng nói theo ý muốn (có thể để mặc định).',
        'addv.pitch.label':       'Cao độ (Pitch)',
        'addv.pitch.hint':        '-12 (thấp hơn) ← 0 (bình thường) → +12 (cao hơn)',
        'addv.speed.label':       'Tốc độ (Speed)',
        'addv.speed.hint':        '0.5x (chậm) ← 1.0x (bình thường) → 2.0x (nhanh)',
        'addv.energy.label':      'Năng lượng (Energy)',
        'addv.energy.hint':       '0.5x (nhẹ nhàng) ← 1.0x (bình thường) → 1.5x (mạnh mẽ)',
        'addv.step5.title':       'Thông tin giọng nói',
        'addv.name.label':        'Tên giọng',
        'addv.name.placeholder':  'VD: Giọng của tôi, Giọng đọc sách, ...',
        'addv.name.hint':         'Đặt tên dễ nhớ để phân biệt các giọng',
        'addv.desc.label':        'Mô tả (tuỳ chọn)',
        'addv.desc.placeholder':  'VD: Giọng ấm áp, phù hợp đọc truyện...',
        'addv.desc.hint':         'Mô tả đặc điểm hoặc mục đích sử dụng giọng này',
        'addv.training.title':    '⚡ Thời gian tạo giọng',
        'addv.training.text':     'Giọng custom sẽ được tạo <strong class="text-on-surface">ngay lập tức</strong> (&lt; 1 giây) dựa trên giọng nền và các điều chỉnh của bạn.',
        'addv.training.tip':      '💡 <strong>Tip:</strong> Bạn có thể tạo nhiều biến thể từ cùng một audio sample bằng cách thay đổi giọng nền và các thông số điều chỉnh.',
        'addv.upload.specs_rvc':  '<strong>Hỗ trợ:</strong> WAV, MP3, M4A<br><strong>Độ dài:</strong> 30 giây - 15 phút<br><strong>Chất lượng:</strong> Không noise, không echo',
        'addv.upload.specs_vixtts':'<strong>Hỗ trợ:</strong> WAV, MP3, M4A<br><strong>Độ dài:</strong> 6 giây - 2 phút (tối ưu 10–60 giây)<br><strong>Chất lượng:</strong> Không noise, không echo',
        'addv.training.vixtts':   'Giọng <strong>viXTTS Clone</strong> được tạo ngay lập tức sau khi upload. Model viXTTS sẽ clone giọng từ audio mẫu khi bạn chuyển đổi văn bản.',
        'addv.training.zeroshot': 'Giọng <strong>Zero-shot</strong> được tạo ngay lập tức. Model sẽ clone giọng từ audio mẫu + transcript mỗi lần chuyển đổi.',
        'addv.training.tip.vixtts':'💡 <strong>Tip:</strong> Dùng file audio rõ ràng, ít tạp âm, dài 10–60 giây để có kết quả clone tốt nhất.',
        'addv.training.tip.zeroshot':'💡 <strong>Tip:</strong> Transcript phải khớp chính xác với nội dung trong file audio mẫu.',
        'addv.btn.cancel':        'Huỷ',
        'addv.btn.submit':        'Tạo giọng ngay',
        'addv.progress.title':    '⚙️ Đang tạo giọng nói...',
        'addv.progress.subtitle': 'Đang xử lý...',
        'addv.success.title':     'Tạo giọng thành công!',
        'addv.success.btn.view':  'Xem giọng của tôi',
        'addv.success.btn.new':   'Tạo giọng mới',
        'addv.error.title':       'Tạo giọng thất bại',
        'addv.error.btn.retry':   'Thử lại',
        'addv.tips.title':        'Tips để có giọng AI chất lượng cao',
        'addv.tip1.title':        'Mic chất lượng',
        'addv.tip1.desc':         'Dùng mic tốt, cách miệng ~15cm',
        'addv.tip2.title':        'Môi trường yên tĩnh',
        'addv.tip2.desc':         'Thu trong phòng kín, không tiếng ồn',
        'addv.tip3.title':        'Đa dạng nội dung',
        'addv.tip3.desc':         'Đọc nhiều loại câu (hỏi, khẳng định, cảm xúc)',
        'addv.tip4.title':        'Giọng tự nhiên',
        'addv.tip4.desc':         'Đọc rõ ràng, tự nhiên, không cố làm giọng',
        'addv.tip5.title':        'Độ dài phù hợp',
        'addv.tip5.desc':         '5-10 phút là tối ưu (đủ data, không quá lâu)',

        'hist.title':             'Lịch sử chuyển đổi',
        'hist.subtitle':          'Quản lý, theo dõi và tải xuống các tệp âm thanh đã được tổng hợp từ văn bản.',
        'hist.search_placeholder':'Tìm kiếm văn bản hoặc ID...',
        'hist.btn.search':        'Tìm kiếm',
        'hist.col.text':          'Văn bản',
        'hist.col.voice':         'Giọng đọc',
        'hist.col.status':        'Trạng thái',
        'hist.col.time':          'Thời gian',
        'hist.col.actions':       'Thao tác',
        'hist.loading':           'Đang tải dữ liệu...',
        'hist.empty.title':       'Chưa có lịch sử',
        'hist.empty.desc':        'Các lần chuyển đổi của bạn sẽ xuất hiện ở đây',
        'hist.empty.cta':         'Tạo Audio đầu tiên',
        'lib.title':              'Thư viện Audio',
        'lib.subtitle':           'Quản lý và tìm kiếm các tệp âm thanh đã tạo',
        'lib.search_placeholder': 'Tìm kiếm theo nội dung âm thanh...',
        'lib.filter.all_voices':  'Tất cả giọng đọc',
        'lib.sort.newest':        'Mới nhất',
        'lib.sort.oldest':        'Cũ nhất',
        'lib.sort.duration':      'Thời lượng',
        'lib.sort.size':          'Kích thước',
        'lib.btn.filter':         'Lọc',
        'lib.view.grid':          'Lưới',
        'lib.view.list':          'Danh sách',
        'lib.loading':            'Đang tải thư viện...',
        'price.title':            'Nâng cấp gói dịch vụ',
        'price.subtitle':         'Chọn gói phù hợp để mở rộng khả năng chuyển đổi của bạn',
        'price.stat.used':        'Đã sử dụng',
        'price.stat.remaining':   'Còn lại',
        'price.stat.used_percent':'đã dùng',
        'price.stat.limit':       'Tổng hạn mức',
        'price.stat.chars_per_period': 'ký tự / kỳ',
        'price.stat.expiry':      'Hết hạn',
        'price.plans.title':      'Các gói dịch vụ',
        'price.plans.subtitle':   'Tất cả gói đều bao gồm đầy đủ tính năng cốt lõi',
        'price.plans.loading':    'Đang tải gói dịch vụ...',
        'price.payment.title':    'Thanh toán dễ dàng',
        'price.payment.qr':       'Quét mã QR',
        'price.payment.transfer': 'Chuyển khoản',
        'price.qr_modal.title':   'Thanh toán qua QR Code',
        'price.qr_modal.guide_title': 'Hướng dẫn thanh toán:',
        'price.qr_modal.step1':   '1. Mở app ngân hàng (TPBank, Vietcombank, BIDV, v.v.)',
        'price.qr_modal.step2':   '2. Chọn "Quét QR" hoặc "Chuyển khoản"',
        'price.qr_modal.step3':   '3. Quét QR code bên dưới',
        'price.qr_modal.step4':   '4. Kiểm tra thông tin: Số tài khoản, số tiền, nội dung',
        'price.qr_modal.step5':   '5. Xác nhận thanh toán trong app ngân hàng',
        'price.qr_modal.step6':   '6. Hệ thống tự động xác nhận — không cần nhập mã',
        'price.qr_modal.generating': 'Đang tạo QR code...',
        'price.qr_modal.bank_title': 'Thông tin chuyển khoản:',
        'price.qr_modal.bank':    'Ngân hàng:',
        'price.qr_modal.account': 'Số tài khoản:',
        'price.qr_modal.account_name': 'Chủ tài khoản:',
        'price.qr_modal.amount':  'Số tiền:',
        'price.qr_modal.content': 'Nội dung:',
        'price.qr_modal.copy_hint': '(Click vào số tài khoản / nội dung để copy)',
        'price.qr_modal.waiting': 'Đang chờ xác nhận thanh toán...',
        'price.qr_modal.waiting_desc': 'Hệ thống tự động kiểm tra mỗi 5 giây. Sau khi chuyển khoản thành công, gói sẽ được kích hoạt ngay lập tức.',
        'price.qr_modal.verify_now': 'Kiểm tra ngay',
        'price.qr_modal.success': 'Thanh toán thành công!',

        // ── Pricing package cards (dynamic JS) ──
        'pkg.chars':              'ký tự',
        'pkg.feature.voices':     'Tất cả giọng đọc tiếng Việt',
        'pkg.feature.emo_tts':    'Emotional TTS (cảm xúc)',
        'pkg.feature.library':    'Thư viện âm thanh',
        'pkg.feature.clone':      'Clone giọng cá nhân',
        'pkg.feature.priority':   'Ưu tiên xử lý',
        'pkg.badge.popular':      'Phổ biến nhất',
        'pkg.btn.free':           '✓ Bắt đầu miễn phí',
        'pkg.btn.subscribe_now':  'Đăng ký ngay',
        'pkg.btn.subscribe_to':   'Đăng ký',
        'pkg.price.forever':      '/mãi mãi',
        'pkg.price.days':         'ngày',
        'pkg.error.load':         'Không thể tải gói dịch vụ. Vui lòng thử lại.',
        'pkg.error.connection':   'Lỗi kết nối. Vui lòng tải lại trang.',
        'pkg.payment.added':      'đã được cộng vào tài khoản.',
        'pkg.payment.remaining':  'Còn lại:',

        'contact.title':          'Liên hệ với ',
        'contact.title_highlight':'chúng tôi',
        'contact.subtitle':       'Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7. Hãy gửi câu hỏi, phản hồi hoặc yêu cầu hỗ trợ kỹ thuật cho đội ngũ chuyên gia AI của chúng tôi.',
        'contact.info.email_title': 'Email Hỗ Trợ',
        'contact.info.office_title':'Văn Phòng',
        'contact.info.hours_title': 'Giờ Làm Việc',
        'contact.info.hours':     'T2 - T6: 9:00 - 18:00\nT7: 9:00 - 12:00',
        'contact.info.active':    'Đang hoạt động',
        'contact.form.title':     'Gửi Tin Nhắn',
        'contact.form.name':      'Họ và tên',
        'contact.form.name_placeholder': 'Nguyễn Văn A',
        'contact.form.subject':   'Chủ đề',
        'contact.form.subject_placeholder': 'Chọn chủ đề cần hỗ trợ',
        'contact.form.subject.support':    'Hỗ trợ kỹ thuật / Lỗi hệ thống',
        'contact.form.subject.billing':    'Thanh toán & Gói cước',
        'contact.form.subject.feature':    'Yêu cầu tính năng mới',
        'contact.form.subject.bug':        'Báo lỗi',
        'contact.form.subject.partnership':'Hợp tác',
        'contact.form.subject.api':        'Tích hợp API',
        'contact.form.subject.other':      'Yêu cầu khác',
        'contact.form.message':   'Nội dung tin nhắn',
        'contact.form.message_placeholder': 'Mô tả chi tiết vấn đề của bạn...',
        'contact.form.char_limit': '/ 1000 ký tự',
        'contact.form.submit':    'Gửi tin nhắn ngay',
        'contact.faq.title':      'Câu Hỏi Thường Gặp',
        'contact.faq.q1':         'Làm thế nào để bắt đầu sử dụng?',
        'contact.faq.a1':         'Bạn chỉ cần đăng ký tài khoản miễn phí, sau đó có thể bắt đầu chuyển đổi văn bản thành giọng nói ngay lập tức với gói Free.',
        'contact.faq.q2':         'Các phương thức thanh toán được hỗ trợ?',
        'contact.faq.a2':         'Chúng tôi hỗ trợ thanh toán qua QR Code chuyển khoản ngân hàng – nhanh chóng, tiện lợi và bảo mật.',
        'contact.faq.q3':         'Có bao nhiêu tùy chọn giọng nói?',
        'contact.faq.a3':         'Hệ thống cung cấp đa dạng giọng đọc AI tiếng Việt miền Nam, Bắc, Trung với cảm xúc phong phú và chất lượng tự nhiên cao.',
        'contact.faq.q4':         'Ứng dụng di động có khả dụng không?',
        'contact.faq.a4':         'Website được tối ưu responsive hoàn hảo. Ứng dụng VietVoice mobile đang trong giai đoạn phát triển và sẽ sớm ra mắt trên iOS & Android.',
        'contact.map.location':   'Bình Thủy, Cần Thơ',
        'contact.map.view':       'Xem trên bản đồ',
        'contact.newsletter.title': 'Kết nối với chúng tôi',
        'contact.newsletter.desc':  'Đăng ký nhận bản tin để cập nhật những công nghệ tổng hợp giọng nói AI mới nhất từ VietVoice.',
        'contact.newsletter.placeholder': 'Nhập địa chỉ email của bạn',
        'contact.newsletter.subscribe': 'Đăng ký',

        // ── Profile page ──
        'prof.title':             'Hồ sơ cá nhân',
        'prof.subtitle.joined':   'Tham gia',
        'prof.card.info':         'Thông tin cá nhân',
        'prof.field.username':    'Tên đăng nhập',
        'prof.field.username.hint': 'Tên đăng nhập không thể thay đổi.',
        'prof.field.email':       'Email',
        'prof.field.fullname':    'Họ và tên',
        'prof.field.fullname.ph': 'Nhập họ và tên...',
        'prof.field.avatar':      'Ảnh đại diện',
        'prof.field.avatar.hint': 'JPG, PNG hoặc WEBP — tối đa 2MB',
        'prof.btn.upload_avatar': 'Tải ảnh lên',
        'prof.avatar.change':     'Đổi ảnh đại diện',
        'prof.avatar.uploading':  'Đang tải ảnh lên...',
        'prof.avatar.success':    'Cập nhật ảnh đại diện thành công',
        'prof.avatar.err_type':   'Chỉ chấp nhận JPG, PNG hoặc WEBP',
        'prof.avatar.err_size':   'Ảnh tối đa 2MB',
        'prof.btn.save':          'Lưu thay đổi',
        'prof.card.password':     'Đổi mật khẩu',
        'prof.field.current_pw':  'Mật khẩu hiện tại',
        'prof.field.new_pw':      'Mật khẩu mới',
        'prof.field.new_pw.ph':   'Ít nhất 6 ký tự',
        'prof.field.confirm_pw':  'Xác nhận mật khẩu mới',
        'prof.field.confirm_pw.ph': 'Nhập lại mật khẩu mới',
        'prof.btn.change_pw':     'Đổi mật khẩu',
        'prof.oauth.no_pw':       'Tài khoản Google OAuth không thể đổi mật khẩu.',
        'prof.card.tx':           'Lịch sử giao dịch',
        'prof.tx.empty':          'Chưa có giao dịch nào.',
        'prof.tx.col.package':    'Gói',
        'prof.tx.col.txid':       'Mã GD',
        'prof.tx.col.amount':     'Số tiền',
        'prof.tx.col.date':       'Ngày',
        'prof.tx.col.status':     'Trạng thái',
        'prof.tx.col.invoice':    'Hóa đơn',
        'prof.card.settings':     'Cài đặt',
        'prof.theme.label':       'Giao diện',
        'prof.theme.desc':        'Sáng / Tối',
        'prof.sidebar.label':     'Thanh bên',
        'prof.sidebar.desc':      'Ẩn / Hiện',
        'prof.lang.label':        'Ngôn ngữ',
        'prof.lang.desc':         'VI / EN',
        'prof.vvpro.label':       'AI Synthesis Active',
        'prof.plan.title':        'Gói & sử dụng',
        'prof.plan.upgrade':      'Nâng cấp',
        'prof.plan.current':      'Gói hiện tại',
        'prof.plan.expires':      'Hết hạn / gia hạn',
        'prof.plan.remaining':    'Ký tự còn lại',
        'prof.plan.used':         'Đã dùng',
        'prof.plan.chart':        'Ký tự dùng (7 ngày)',
        'prof.tts.title':         'Mặc định TTS',
        'prof.tts.desc':          'Áp dụng khi mở Workspace.',
        'prof.tts.voice':         'Giọng mặc định',
        'prof.tts.voice.basic':   'Giọng TTS cơ bản',
        'prof.tts.voice.emotional': 'Giọng Emotional TTS (viXTTS)',
        'prof.tts.voice.default': '— Không đặt —',
        'prof.tts.emotional.default': '⭐ Mặc định (base_voice.wav)',
        'prof.tts.emotional.hint': 'Áp dụng cho tab Emotional TTS trong Workspace.',
        'prof.tts.pitch':         'Cao độ (Pitch)',
        'prof.tts.speed':         'Tốc độ (Speed)',
        'prof.tts.format':        'Định dạng xuất',
        'prof.tts.bitrate':       'Bitrate',
        'prof.tts.lang':          'Ngôn ngữ mặc định',
        'prof.tts.save':          'Lưu mặc định TTS',
        'prof.notify.title':      'Thông báo & email',
        'prof.notify.desc':       'Gửi email khi có sự kiện quan trọng (cần SMTP).',
        'prof.notify.chars':      'Ký tự sắp hết (<10%)',
        'prof.notify.payment':    'Thanh toán thành công / thất bại',
        'prof.notify.expiry':     'Gói sắp hết hạn',
        'prof.notify.marketing':  'Tin tức sản phẩm',
        'prof.notify.marketing.hint': 'Tùy chọn — marketing',
        'prof.notify.save':       'Lưu thông báo',
        'prof.export.title':      'Xuất dữ liệu cá nhân',
        'prof.export.desc':       'Tải báo cáo dễ đọc: tài khoản, gói dịch vụ, giao dịch, lịch sử chuyển đổi (không có file audio).',
        'prof.export.btn_pdf':    'Tải PDF',
        'prof.export.btn_docx':   'Tải Word',
        'prof.export.deletion':   'Chính sách xóa dữ liệu →',
        'prof.export.privacy':    'Chính sách quyền riêng tư',
        'prof.export.success':    'Đã tải báo cáo dữ liệu',

        'auth.login.subtitle':    'Đăng nhập để tiếp tục trải nghiệm cùng chúng tôi',
        'auth.login.or':          'hoặc',
        'auth.login.or_upper':    'HOẶC',
        'auth.login.remember':    'Ghi nhớ đăng nhập',
        'auth.login.identifier_label': 'Email hoặc Tên đăng nhập',
        'auth.login.new_user':    'Bạn mới sử dụng VietVoice?',
        'auth.login.no_account':  'Chưa có tài khoản?',
        'auth.login.register_link':'Đăng ký miễn phí →',
        'auth.footer.support':    'Hỗ trợ & Trợ giúp',
        'auth.footer.rights':     'All Rights Reserved.',
        'auth.brand.login_title': 'Công nghệ AI hàng đầu',
        'auth.brand.login_desc': 'Khám phá sức mạnh của tổng hợp giọng nói tiếng Việt tự nhiên với VietVoice AI. Chuyên nghiệp, cảm xúc và linh hoạt.',
        'auth.brand.register_title': 'Bắt đầu miễn phí',
        'auth.brand.register_desc': 'Tạo tài khoản và nhận ngay 100.000 ký tự để trải nghiệm chuyển văn bản thành giọng nói AI.',
        'auth.brand.forgot_title': 'Khôi phục tài khoản',
        'auth.brand.forgot_desc': 'Xác nhận trên điện thoại, sau đó đặt mật khẩu mới trên máy tính.',
        'auth.brand.reset_title': 'Bảo mật tài khoản',
        'auth.brand.reset_desc': 'Chọn mật khẩu mạnh, ít nhất 6 ký tự để bảo vệ tài khoản.',
        'auth.brand.confirm_title': 'Xác nhận bảo mật',
        'auth.brand.confirm_desc': 'Bước xác nhận trên điện thoại đảm bảo chỉ bạn mới có thể đặt lại mật khẩu.',
        'auth.forgot.sent_title': 'Email đã được gửi',
        'auth.confirm.invalid_title': 'Link không hợp lệ',
        'auth.confirm.invalid': 'Link xác nhận đã hết hạn hoặc đã được sử dụng.',
        'auth.confirm.success_title': 'Đã xác nhận',
        'auth.confirm.success': 'Bạn đã xác nhận thành công trên điện thoại.',
        'auth.confirm.hint': 'Quay lại máy tính — trang web sẽ tự chuyển sang màn hình đặt mật khẩu mới.',
        'auth.login.google_err_cfg': 'Google OAuth chưa được cấu hình. Vui lòng dùng đăng nhập thường.',
        'auth.login.google_err':  'Đăng nhập Google thất bại. Vui lòng thử lại.',
        'auth.register.subtitle': 'Tham gia VietVoice và bắt đầu tạo giọng nói AI',
        'auth.register.free_badge':'🎁 Miễn phí 100,000 ký tự ngay khi đăng ký',
        'auth.register.confirm_pw': 'Xác nhận mật khẩu',
        'auth.register.btn_free': '🚀 Đăng ký miễn phí',
        'auth.register.google':   'Đăng ký nhanh với Google',
        'auth.register.has_account':'Đã có tài khoản?',
        'auth.register.login_link':'Đăng nhập →',
        'auth.register.terms_prefix': 'Tôi đồng ý với',
        'auth.register.terms_link':   'Điều khoản sử dụng',
        'auth.register.terms_and':    ' và ',
        'auth.register.privacy_link': 'Chính sách quyền riêng tư',
        'auth.register.terms_suffix': ' của VietVoice',
        'auth.ph.username':       'Nhập tên đăng nhập',
        'auth.ph.login_identifier':'Nhập tên đăng nhập hoặc email',
        'auth.ph.email_login':    'yourname@domain.com',
        'auth.ph.password_dots':  '••••••••',
        'auth.ph.password':       'Nhập mật khẩu',
        'auth.ph.fullname':       'Nguyễn Văn A',
        'auth.ph.email':          'email@example.com',
        'auth.ph.password_min':   'Ít nhất 6 ký tự',
        'auth.ph.confirm_pw':     'Nhập lại mật khẩu',

        'admin.title':            'Bảng điều khiển Quản trị',
        'admin.nav.dashboard':    'Bảng điều khiển',
        'admin.nav.users':        'Quản lý người dùng',
        'admin.nav.voices':       'Quản lý giọng đọc',
        'admin.nav.payments':     'Quản lý thanh toán',
        'admin.nav.landing':      'Landing Page',
        'admin.nav.settings':     'Cấu hình Site',
        'admin.nav.policies':     'Cấu hình chính sách',
        'admin.cfg.policies_title': 'Cấu hình chính sách',
        'admin.cfg.policies_sub': 'Điều khoản, quyền riêng tư, xóa dữ liệu, thanh toán — lưu file JSON',
        'admin.cfg.save':         'Lưu',
        'admin.cfg.main_tab.legal': 'Trang pháp lý',
        'admin.cfg.main_tab.support': 'Hỗ trợ & FAQ',
        'admin.cfg.legal_title':  'Trang pháp lý',
        'admin.cfg.legal_desc_short': '4 trang pháp lý (editor) + Hướng dẫn sử dụng & Cài đặt (Markdown).',
        'admin.cfg.legal_tab.user_guide': 'Hướng dẫn sử dụng',
        'admin.cfg.legal_tab.installation_guide': 'Hướng dẫn cài đặt',
        'admin.cfg.guide_md_desc': 'Soạn Markdown (# tiêu đề, bảng, code). Dùng ## cho mỗi mục lớn trên trang công khai.',
        'admin.cfg.guide_md_label': 'Markdown',
        'admin.cfg.guide_preview': 'Xem trước',
        'admin.cfg.legal_file_note': 'Thay đổi được ghi vào legal_content.json — không lưu database.',
        'admin.cfg.legal_tab.terms': 'Điều khoản sử dụng',
        'admin.cfg.legal_tab.privacy': 'Chính sách quyền riêng tư',
        'admin.cfg.legal_tab.data_deletion': 'Chính sách xóa dữ liệu',
        'admin.cfg.legal_tab.payment': 'Điều khoản thanh toán',
        'admin.cfg.legal_updated': 'Ngày cập nhật hiển thị',
        'admin.cfg.add_section':  'Thêm mục nội dung',
        'admin.cfg.support_title': 'Hỗ trợ & FAQ',
        'admin.cfg.support_desc': 'Kênh liên hệ, hướng dẫn và FAQ trên /support.',
        'admin.cfg.support_file_note': 'Thay đổi được ghi vào support_content.json — không lưu database.',
        'admin.cfg.support_tab.contact': 'Kênh liên hệ',
        'admin.cfg.support_tab.guides': 'Hướng dẫn',
        'admin.cfg.support_tab.faq': 'FAQ',
        'admin.cfg.support_cards_title': 'Kênh liên hệ',
        'admin.cfg.support_cards_desc': 'Thẻ hiển thị trên trang Hỗ trợ.',
        'admin.cfg.support_guides_block': 'Hướng dẫn sử dụng',
        'admin.cfg.support_guides_desc': 'Các block hướng dẫn có bước thực hiện.',
        'admin.cfg.support_faq_block': 'Câu hỏi thường gặp',
        'admin.cfg.support_faq_desc': 'Danh sách FAQ trên trang Hỗ trợ.',
        'admin.nav.back':         'Về trang chính',
        'admin.settings.title':       'Cấu hình Site',
        'admin.settings.subtitle':    'Logo, email, gói cước — Chính sách tại Cấu hình chính sách',
        'admin.settings.save':        'Lưu cấu hình',
        'admin.settings.saving':      'Đang lưu...',
        'admin.settings.saved':       'Đã lưu cấu hình site',
        'admin.settings.load_error':  'Không tải được cấu hình',
        'admin.settings.save_hint':   'Ctrl+S để lưu cấu hình',
        'admin.settings.tab.brand':   'Thương hiệu',
        'admin.settings.tab.email':   'Email & Liên hệ',
        'admin.settings.tab.packages': 'Gói cước',
        'admin.settings.section.brand': 'Logo & Tên site',
        'admin.settings.brand_title': 'Logo & Tên site',
        'admin.settings.brand_sub':   'Tên và logo hiển thị trên admin và trang public.',
        'admin.settings.email_title': 'Email & Liên hệ',
        'admin.settings.email_sub':   'Email hiển thị cho người dùng và form liên hệ.',
        'admin.settings.support_email': 'Email hỗ trợ',
        'admin.settings.contact_email': 'Email liên hệ (form)',
        'admin.settings.smtp_display':  'Tên hiển thị khi gửi email',
        'admin.settings.smtp_display_hint': 'Tên người gửi trong email hệ thống (nếu SMTP được cấu hình).',
        'admin.settings.company_name':  'Tên công ty (liên hệ)',
        'admin.settings.company_phone': 'Hotline',
        'admin.settings.smtp_env_title': 'Cấu hình SMTP (server)',
        'admin.settings.smtp_env_hint': 'Đọc từ biến môi trường — chỉ admin xem, không sửa tại đây.',
        'admin.settings.smtp_host':     'SMTP host',
        'admin.settings.smtp_from_env': 'From (env)',
        'admin.settings.packages_title': 'Gói cước',
        'admin.settings.packages_sub':  'Quản lý gói hiển thị trên landing và trang thanh toán.',
        'admin.settings.pkg_add':       'Thêm gói mới',
        'admin.settings.pkg_name':      'Tên gói',
        'admin.settings.pkg_chars':     'Số ký tự',
        'admin.settings.pkg_price':     'Giá (VND)',
        'admin.settings.pkg_days':      'Thời hạn (ngày)',
        'admin.settings.pkg_create':    'Tạo gói',
        'admin.settings.pkg_status':    'Trạng thái',
        'admin.settings.pkg_active':  'Hiển thị',
        'admin.settings.pkg_hidden':  'Ẩn',
        'admin.settings.pkg_show':    'Hiện',
        'admin.settings.pkg_hide':    'Ẩn',
        'admin.settings.pkg_empty':   'Chưa có gói cước',
        'admin.settings.pkg_validation': 'Nhập tên gói và số ký tự',
        'admin.settings.pkg_created': 'Đã tạo gói',
        'admin.settings.pkg_updated': 'Đã cập nhật gói',
        'admin.settings.pkg_edit':    'Sửa',
        'admin.settings.pkg_edit_title': 'Sửa gói',
        'admin.settings.pkg_save':    'Lưu thay đổi',
        'admin.settings.pkg_cancel_edit': 'Hủy sửa',
        'admin.settings.site_name':   'Tên hiển thị',
        'admin.settings.logo':        'Logo website',
        'admin.settings.logo_drop':   'Kéo thả hoặc bấm để chọn logo',
        'admin.settings.logo_formats': 'PNG, JPG, WebP hoặc SVG — tối đa 2MB',
        'admin.settings.logo_upload':   'Upload logo',
        'admin.settings.logo_upload_hint': 'Logo được lưu ngay khi upload — không cần bấm Lưu cấu hình.',
        'admin.settings.logo_saved':  'Đã cập nhật logo',
        'admin.settings.logo_error':  'Upload logo thất bại',
        'admin.settings.preview.sidebar': 'Admin sidebar',
        'admin.settings.preview.public_nav': 'Navbar public',
        'admin.settings.preview.favicon': 'Favicon',
        'admin.settings.preview.favicon_hint': '32×32 trên tab trình duyệt',
        'admin.settings.soon_email':  'Email & Liên hệ',
        'admin.settings.soon_packages': 'Gói cước',
        'admin.settings.soon_phase2': 'Sắp có ở Phase 2',
        'admin.overview':         'Tổng quan hệ thống',
        'admin.overview.sub':     'Thống kê và hoạt động gần đây của VietVoice AI.',
        'admin.edit_landing':     'Chỉnh sửa Landing',
        'admin.lp.studio_title':  'Landing Studio',
        'admin.lp.studio_sub':    'Chỉnh sửa nội dung trang landing',
        'admin.lp.title':         'Chỉnh sửa Landing Page',
        'admin.lp.subtitle':      'Nội dung được lưu và hiển thị ngay trên trang',
        'admin.lp.unsaved':       'Chưa lưu',
        'admin.lp.preview_soon':  'Live preview — sắp có ở Phase 2',
        'admin.lp.preview_title': 'Xem trước',
        'admin.lp.preview_live': 'Live preview',
        'admin.lp.preview_refresh': 'Làm mới xem trước',
        'admin.lp.preview_opening': 'Đang mở...',
        'admin.lp.preview_blocked': 'Trình duyệt chặn tab mới — cho phép popup và thử lại',
        'admin.lp.preview_error': 'Không mở được xem trước',
        'admin.lp.preview_hint': 'Alt+Shift+P — chuyển tab Xem trước',
        'admin.lp.tab.preview': 'Xem trước',
        'admin.lp.tab.edit': 'Chỉnh sửa',
        'admin.lp.preview_loading': 'Đang tải xem trước...',
        'admin.lp.preview_loading_sub': 'Nội dung cập nhật khi bạn chỉnh sửa',
        'admin.lp.view_landing':  'Xem Landing',
        'admin.lp.back_admin':    'Quay lại Admin',
        'admin.lp.mobile_view':   'Xem Landing Page',
        'admin.lp.save':          'Lưu thay đổi',
        'admin.lp.saving':        'Đang lưu...',
        'admin.lp.saved':         'Đã lưu nội dung landing',
        'admin.lp.conn_error':    'Lỗi kết nối máy chủ',
        'admin.lp.link_label':    'Nhãn',
        'admin.lp.link_url':      'Đường dẫn URL',
        'admin.lp.link_add':      'Thêm liên kết',
        'admin.lp.link_hint':     'Nhãn hiển thị và đường dẫn URL cho mỗi liên kết.',
        'admin.lp.hero_sub':      'Tiêu đề chính, CTA và ghi chú miễn phí.',
        'admin.lp.company_sub':   'Thẻ công ty cạnh hero.',
        'admin.lp.about_new_sub': 'Tầm nhìn, sứ mệnh, cam kết — 3 thẻ.',
        'admin.lp.footer_sub':    'Mô tả thương hiệu, liên kết và copyright.',
        'admin.lp.about_legacy_sub': 'Section cũ — đồng bộ nếu vẫn hiển thị trên landing.',
        'admin.lp.section.hero':       'Hero Section',
        'admin.lp.section.company':    'Thông tin công ty (Hero card)',
        'admin.lp.section.about_new':  'Về VietVoice AI',
        'admin.lp.section.trusted':    'Được tin dùng bởi',
        'admin.lp.section.features':   'Tính năng nổi bật',
        'admin.lp.section.steps':      'Hướng dẫn 3 bước',
        'admin.lp.section.showcase':   'Showcase',
        'admin.lp.section.final_cta':  'CTA cuối trang',
        'admin.lp.section.about':      'Về chúng tôi',
        'admin.lp.section.footer':     'Footer',
        'admin.lp.label.tag':          'Tag nhỏ phía trên tiêu đề',
        'admin.lp.label.cta_primary':  'Nút CTA chính',
        'admin.lp.label.title_line1':  'Dòng tiêu đề 1',
        'admin.lp.label.title_grad':   'Dòng gradient (tím–xanh)',
        'admin.lp.label.title_line3':  'Dòng tiêu đề 3',
        'admin.lp.label.free_note':    'Ghi chú miễn phí dưới nút',
        'admin.lp.label.company_name': 'Tên công ty',
        'admin.lp.label.company_desc': 'Mô tả công ty',
        'admin.lp.label.mst':          'Mã số thuế (MST)',
        'admin.lp.label.representative': 'Người đại diện',
        'admin.lp.label.address':      'Địa chỉ',
        'admin.lp.label.hotline':      'Hotline',
        'admin.lp.label.since':        'Hoạt động từ',
        'admin.lp.label.section_title': 'Tiêu đề section',
        'admin.lp.label.section_desc':  'Mô tả section',
        'admin.lp.label.icon_material': 'Icon',
        'admin.lp.label.title':         'Tiêu đề',
        'admin.lp.label.desc':          'Mô tả',
        'admin.lp.label.trusted_label': 'Label',
        'admin.lp.label.trusted_items': 'Các nhóm (mỗi dòng một nhóm)',
        'admin.lp.label.small_label':   'Label nhỏ',
        'admin.lp.label.icon_emoji':    'Icon (emoji)',
        'admin.lp.label.card_title':    'Tiêu đề card',
        'admin.lp.label.step_title':    'Tiêu đề bước',
        'admin.lp.label.cta_btn':       'Nút CTA',
        'admin.lp.label.badges':        'Các badge (mỗi dòng một badge)',
        'admin.lp.label.btn_primary':   'Nút chính',
        'admin.lp.label.btn_secondary': 'Nút phụ',
        'admin.lp.label.small_note':    'Ghi chú nhỏ',
        'admin.lp.label.brand_desc':    'Mô tả thương hiệu (cột trái)',
        'admin.lp.label.footer_col1':   'Tiêu đề cột 1',
        'admin.lp.label.footer_col2':   'Tiêu đề cột 2',
        'admin.lp.label.footer_col3':   'Tiêu đề cột 3',
        'admin.lp.label.col1_links':    'Links cột 1 — Tính năng',
        'admin.lp.label.col2_links':    'Links cột 2 — Hỗ trợ',
        'admin.lp.label.copyright':     'Copyright',
        'admin.lp.label.info_row1':     'Thông tin dòng 1 (MST · Đại diện)',
        'admin.lp.label.info_row2':     'Thông tin dòng 2 (Địa chỉ)',
        'admin.lp.label.info_row3':     'Thông tin dòng 3 (SĐT · Ngày)',
        'admin.refresh':          'Làm mới',
        'admin.gen_samples':      'Tạo mẫu giọng đọc',
        'admin.stat.users':       'Tổng người dùng',
        'admin.stat.conversions': 'Tổng chuyển đổi',
        'admin.stat.voices':      'Số giọng đọc',
        'admin.stat.chars_month': 'Tổng ký tự (tháng)',
        'admin.stat.active':      'Active',
        'admin.stat.today':       'Hôm nay',
        'admin.stat.week':        'Tuần này',
        'admin.stat.month':       'Tháng này',
        'admin.stat.conv':        'Chuyển đổi:',
        'admin.stat.chars':       'Ký tự:',
        'admin.stat.active_users': '{n} hoạt động',
        'admin.stat.success_rate': '{n}% thành công',
        'admin.stat.avg_chars':   'TB: {n} ký tự',
        'admin.stat.chars_short': 'ký tự',
        'admin.dash.leaders':     'Bảng xếp hạng',
        'admin.dash.period_label': 'Hoạt động gần đây',
        'admin.chart.trend':      'Xu hướng 7 ngày qua',
        'admin.chart.voice_dist': 'Top giọng đọc',
        'admin.chart.legend':     'Số chuyển đổi',
        'admin.chart.other':      'Khác',
        'admin.chart.custom_voice': 'Giọng tùy chỉnh',
        'admin.chart.usage':      'lượt',
        'admin.top_users':        'Top 5 Người dùng',
        'admin.top_voices':       'Top 5 Giọng đọc',
        'admin.dash.quick.pay':   'Duyệt thanh toán',
        'admin.dash.quick.pay_sub': 'Giao dịch chờ xử lý',
        'admin.dash.quick.lifecycle': 'Vòng đời tài khoản',
        'admin.dash.quick.lifecycle_sub': 'Yêu cầu xóa chờ duyệt',
        'admin.dash.quick.users': 'Quản lý người dùng',
        'admin.dash.quick.users_sub': 'Vai trò & trạng thái',
        'admin.dash.quick.voices': 'Giọng & mẫu nghe',
        'admin.dash.quick.voices_sub': 'Tạo file preview',
        'admin.dash.chart_trend_sub': 'Lượt chuyển đổi theo ngày',
        'admin.dash.chart_voice_sub': 'Phân bổ lượt sử dụng',
        'admin.dash.leaders_sub': 'Top người dùng và giọng đọc',
        'admin.dash.by_conversions': 'Theo chuyển đổi',
        'admin.dash.by_usage': 'Theo lượt dùng',
        'admin.nav.conversions': 'Chuyển đổi',
        'admin.section.conversions': 'Log chuyển đổi',
        'admin.conv.sub': 'Theo dõi mọi lượt TTS trên hệ thống',
        'admin.conv.search': 'Tìm user, giọng, nội dung...',
        'admin.conv.voice': 'Giọng',
        'admin.conv.preview': 'Nội dung',
        'admin.conv.item': 'chuyển đổi',
        'admin.conv.status.completed': 'Thành công',
        'admin.conv.status.failed': 'Thất bại',
        'admin.conv.status.processing': 'Đang xử lý',
        'admin.user.view_detail': 'Chi tiết tài khoản',
        'admin.user.sub_title': 'Gói & hạn mức',
        'admin.user.pkg': 'Gói',
        'admin.user.used': 'Đã dùng',
        'admin.user.limit': 'Hạn mức',
        'admin.user.remaining': 'Còn lại',
        'admin.user.until': 'Hết hạn',
        'admin.user.add_chars': 'Cộng ký tự',
        'admin.user.reset_used': 'Reset đã dùng',
        'admin.user.extend': 'Gia hạn',
        'admin.user.apply_pkg': 'Áp dụng gói',
        'admin.user.no_sub': 'Chưa có gói',
        'admin.user.recent_pay': 'Thanh toán gần đây',
        'admin.user.recent_conv': 'Chuyển đổi gần đây',
        'admin.user.custom_voices': 'Giọng tùy chỉnh',
        'admin.dash.activity': 'Hoạt động gần đây',
        'admin.dash.activity_sub': 'Chuyển đổi mới trên hệ thống',
        'admin.dash.activity_preview': '3 mới nhất',
        'admin.dash.view_all': 'Xem tất cả',
        'admin.export.csv': 'Xuất CSV',
        'admin.report.btn': 'Xuất báo cáo',
        'admin.report.title': 'Xuất báo cáo',
        'admin.report.sub': 'Chọn loại báo cáo, khoảng thời gian và định dạng file',
        'admin.report.type_label': 'Loại báo cáo',
        'admin.report.type.overview': 'Tổng quan',
        'admin.report.type.overview_sub': 'KPI, xu hướng, bảng xếp hạng',
        'admin.report.type.users': 'Người dùng',
        'admin.report.type.users_sub': 'Tài khoản & gói dịch vụ',
        'admin.report.type.conversions': 'Chuyển đổi',
        'admin.report.type.conversions_sub': 'Log hoạt động TTS',
        'admin.report.type.payments': 'Thanh toán',
        'admin.report.type.payments_sub': 'Giao dịch & trạng thái',
        'admin.report.period_label': 'Khoảng thời gian',
        'admin.report.period.custom': 'Tùy chọn',
        'admin.report.format_label': 'Định dạng file',
        'admin.report.format.pdf': 'PDF',
        'admin.report.format.docx': 'Word',
        'admin.report.format.csv': 'CSV',
        'admin.report.hint.overview': 'PDF/Word: báo cáo trình bày đẹp với KPI và bảng xếp hạng.',
        'admin.report.hint.csv': 'CSV UTF-8: dữ liệu thô, tối đa 5.000 dòng. Mở bằng Excel hoặc Google Sheets.',
        'admin.report.download': 'Tải xuống',
        'admin.report.downloading': 'Đang tạo...',
        'admin.report.success': 'Đã tải báo cáo',
        'admin.filter.from': 'Từ',
        'admin.filter.to': 'Đến',
        'admin.filter.apply': 'Áp dụng',
        'admin.saved': 'Đã lưu',
        'admin.section.users':    'Quản lý người dùng',
        'admin.section.voices':   'Quản lý giọng đọc',
        'admin.section.payments': 'Quản lý thanh toán',
        'admin.col.username':     'Tên đăng nhập',
        'admin.col.email':        'Email',
        'admin.col.role':         'Vai trò',
        'admin.col.status':       'Trạng thái',
        'admin.col.actions':      'Thao tác',
        'admin.col.voice':        'Giọng',
        'admin.col.package':      'Gói',
        'admin.col.amount':       'Số tiền',
        'admin.col.date':         'Ngày',
        'admin.btn.approve':      'Duyệt',
        'admin.btn.reject':       'Từ chối',
        'admin.btn.delete':       'Xóa',
        'admin.btn.suspend':      'Khóa',
        'admin.btn.activate':     'Kích hoạt',
        'admin.search_users':     'Tìm người dùng...',
        'admin.loading':          'Đang tải...',
        'admin.no_data':          'Không có dữ liệu',
        'admin.nav.lifecycle':    'Vòng đời tài khoản',
        'admin.lifecycle.sub':    'Yêu cầu xóa và tài khoản vô hiệu hóa 30 ngày.',
        'admin.users.sub':      'Tìm kiếm, khóa và quản lý vai trò người dùng.',
        'admin.payments.sub':   'Theo dõi giao dịch và duyệt thanh toán.',
        'admin.updated_at':     'Cập nhật: {time}',
        'admin.copy':           'Sao chép',
        'admin.filter.all':     'Tất cả',
        'admin.action.promote': 'Cấp quyền Admin',
        'admin.action.demote':  'Thu quyền Admin',
        'admin.pay.method.bank_qr': 'QR ngân hàng',
        'admin.pay.method.bank_transfer': 'Chuyển khoản',
        'admin.pay.method.momo': 'MoMo',
        'admin.pay.method.vnpay': 'VNPay',
        'admin.pay.status.pending': 'Đang chờ',
        'admin.pay.status.completed': 'Đã thanh toán',
        'admin.pay.status.failed': 'Thất bại',
        'admin.pay.status.cancelled': 'Đã hủy',
        'admin.pay.summary.revenue': 'Doanh thu (đã TT)',
        'admin.pay.summary.total': 'Tổng giao dịch',
        'admin.pay.summary.completed': 'Đã thanh toán',
        'admin.pay.summary.pending': 'Chờ duyệt',
        'admin.voices.sub':     'Giọng hệ thống và file mẫu nghe thử.',
        'admin.voices.system_title': 'Giọng hệ thống',
        'admin.voices.system_hint': 'Quản lý giọng TTS và file mẫu nghe thử.',
        'admin.voices.generate_all': 'Tạo tất cả mẫu',
        'admin.voices.generate_ok': 'Đã tạo mẫu giọng',
        'admin.voices.col.name': 'Tên giọng',
        'admin.voices.col.desc': 'Mô tả',
        'admin.voices.col.sample': 'Mẫu',
        'admin.voices.has_sample': 'Có mẫu',
        'admin.voices.no_sample': 'Chưa có',
        'admin.lifecycle.flow_title': 'Quy trình xóa tài khoản',
        'admin.lifecycle.flow_desc': 'Người dùng gửi yêu cầu → Admin duyệt → Vô hiệu 30 ngày (có thể khôi phục) → Xóa vĩnh viễn sau hạn.',
        'admin.lifecycle.step1': 'Yêu cầu xóa',
        'admin.lifecycle.step2': 'Admin duyệt',
        'admin.lifecycle.step3': 'Vô hiệu 30 ngày',
        'admin.lifecycle.step4': 'Xóa vĩnh viễn',
        'admin.lifecycle.pending': 'Chờ duyệt xóa',
        'admin.lifecycle.grace': 'Trong thời gian chờ',
        'admin.lifecycle.restore_req': 'Yêu cầu khôi phục',
        'admin.lifecycle.window': 'Thời gian chờ',
        'admin.lifecycle.days': '30 ngày',
        'admin.users.total': 'Tổng người dùng',
        'admin.users.active': 'Đang hoạt động',
        'admin.users.admins': 'Quản trị viên',
        'admin.users.locked': 'Đã khóa',
        'admin.users.empty_hint': 'Người dùng đăng ký sẽ hiển thị tại đây.',
        'admin.users.filter_empty': 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.',
        'admin.del.empty_hint': 'Khi người dùng gửi yêu cầu xóa, bạn sẽ thấy tại đây.',
        'admin.grace.empty_hint': 'Tài khoản đã duyệt xóa trong 30 ngày chờ sẽ hiển thị tại đây.',
        'admin.pay.search': 'Tìm mã GD, người dùng...',
        'admin.pay.filter_empty': 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.',
        'admin.table.showing': 'Hiển thị {n} mục',
        'admin.table.showing_filtered': 'Hiển thị {n} / {total}',
        'admin.voices.total': 'Tổng giọng',
        'admin.voices.with_sample': 'Có mẫu nghe',
        'admin.voices.without_sample': 'Chưa có mẫu',
        'admin.voices.workspace': 'Workspace',
        'admin.voices.listen': 'Nghe',
        'admin.voices.empty_hint': 'Giọng hệ thống từ API /api/voices.',

        // ── Admin Vai trò & Trạng thái ──
        'admin.role.admin':             'Admin',
        'admin.role.user':              'Người dùng',
        'admin.role.promote':           'Cấp quyền Admin',
        'admin.role.demote':            'Thu quyền Admin',
        'admin.status.active':          'Hoạt động',
        'admin.status.suspended':       'Đã khóa',

        // ── Admin Yêu cầu xóa tài khoản ──
        'admin.nav.deletions':          'Yêu cầu xóa tài khoản',
        'admin.section.deletions':      'Yêu cầu xóa tài khoản',
        'admin.section.grace':          'Tài khoản vô hiệu hóa (30 ngày)',
        'admin.del.reason':             'Lý do',
        'admin.del.requested_at':       'Thời gian gửi',
        'admin.del.empty':              'Không có yêu cầu đang chờ duyệt',
        'admin.del.status.pending':     'Đang chờ',
        'admin.del.approve.title':      'Xác nhận xóa tài khoản',
        'admin.del.approve.confirm':    'Bạn có chắc chắn muốn vô hiệu hóa tài khoản này không? Tài khoản sẽ bị vô hiệu hóa trong 30 ngày và xóa vĩnh viễn sau đó.',
        'admin.del.approve.btn':        'Xác nhận xóa',
        'admin.del.approve.action':     'Duyệt xóa',
        'admin.del.approve.ok':         'Đã vô hiệu hóa tài khoản',
        'admin.del.reject.title':       'Từ chối yêu cầu xóa',
        'admin.del.reject.note':        'Ghi chú (không bắt buộc)',
        'admin.del.reject.btn':         'Từ chối',
        'admin.del.reject.ok':          'Đã từ chối yêu cầu',
        'admin.del.cancel':             'Hủy',

        'legal.badge':            'Pháp lý',
        'legal.guide.badge':      'Hướng dẫn',
        'legal.install.badge':    'Cài đặt',
        'legal.updated':          'Cập nhật lần cuối: Tháng 6 năm 2026',
        'legal.updated_prefix':   'Cập nhật:',
        'legal.privacy.intro':    'VietVoice ("chúng tôi") cam kết bảo vệ quyền riêng tư của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn sử dụng VietVoice — nền tảng chuyển văn bản thành giọng nói AI.',
        'legal.privacy.agree':    'Bằng cách sử dụng VietVoice, bạn đồng ý với các điều khoản của chính sách này.',
        'legal.privacy.s1':       'Giới thiệu',
        'legal.privacy.s2':       'Thông tin nhà phát triển',
        'legal.privacy.s3':       'Dữ liệu chúng tôi thu thập',
        'legal.privacy.s4':       'Cách chúng tôi sử dụng dữ liệu',
        'legal.privacy.s5':       'Chia sẻ dữ liệu',
        'legal.privacy.s6':       'Bảo mật dữ liệu',
        'legal.privacy.s7':       'Quyền của bạn',
        'legal.privacy.s8':       'Liên hệ',
        'legal.terms.s1':         'Chấp nhận điều khoản',
        'legal.terms.s2':         'Mô tả dịch vụ',
        'legal.terms.s3':         'Tài khoản người dùng',
        'legal.terms.s4':         'Sử dụng hợp lệ',
        'legal.terms.s5':         'Thanh toán & Gói đăng ký',
        'legal.terms.s6':         'Sở hữu trí tuệ',
        'legal.terms.s7':         'Giới hạn trách nhiệm',
        'legal.terms.s8':         'Thay đổi điều khoản',
        'legal.deletion.s1':      'Tổng quan',
        'legal.deletion.s2':      'Cách yêu cầu xóa',
        'legal.deletion.s3':      'Dữ liệu được xóa',
        'legal.deletion.s4':      'Thời gian lưu trữ',
        'legal.support.s1':       'Bắt đầu sử dụng',
        'legal.support.s2':       'Tài khoản & Thanh toán',
        'legal.support.s3':       'TTS & Giọng nói',
        'legal.support.s4':       'Sự cố kỹ thuật',
        'legal.support.badge':    'Hỗ trợ',
        'legal.support.hero':     'Chúng tôi luôn sẵn sàng giúp bạn. Hãy chọn cách liên hệ phù hợp.',
        'legal.deletion.title':   'Chính sách xóa dữ liệu',

        'export.format':          'Định dạng xuất',
        'export.bitrate':         'Bitrate',
        'export.format.wav':      'WAV (nguyên bản)',
        'export.format.mp3':      'MP3',
        'export.format.ogg':      'OGG Vorbis',
        'export.download':        'Tải xuống',
        'export.ffmpeg_missing':  'MP3/OGG cần ffmpeg trên server. Đang tải WAV thay thế.',
        'export.kbps':            'kbps',

        'err.login_required':     'Vui lòng đăng nhập',
        'err.unauthorized':       'Không có quyền truy cập',
        'err.connection':         'Lỗi kết nối',
        'err.login_failed':       'Đăng nhập thất bại',
        'err.account_deleted':    'Tài khoản của bạn đã bị xóa hoặc vô hiệu hóa.',
        'err.account_deactivated_grace': 'Tài khoản của bạn đã bị vô hiệu hóa. Bạn có thể yêu cầu khôi phục trong vòng 30 ngày (đến {until}). Vui lòng dùng chức năng "Khôi phục tài khoản" trên trang đăng nhập.',
        'err.register_failed':    'Đăng ký thất bại',
        'err.password_mismatch':  'Mật khẩu xác nhận không khớp',
        'err.terms_required':     'Vui lòng đồng ý với điều khoản sử dụng để đăng ký',
        'err.convert_failed':     'Không thể chuyển đổi',
        'err.file_not_found':     'Không tìm thấy file',
        'err.quota_exceeded':     'Đã hết quota ký tự',
        'err.invalid_data':       'Dữ liệu không hợp lệ',
        'err.delete_failed':      'Xóa thất bại',
        'err.save_failed':        'Lưu thất bại',
        'err.load_failed':        'Không thể tải dữ liệu',
        'err.register_success':   'Đăng ký thành công. Vui lòng đăng nhập.',
        'err.retry_dev':          'Tính năng retry đang được phát triển',
        'err.name_empty':         'Tên không được để trống',
        'err.fill_all':           'Vui lòng điền đầy đủ',
        'err.pw_min':             'Mật khẩu phải có ít nhất 6 ký tự',
        'err.pw_mismatch':        'Mật khẩu xác nhận không khớp',
        'err.update_success':     'Cập nhật thành công!',
        'err.pw_change_success':  'Đổi mật khẩu thành công!',
        'i18n.translating':       'Đang dịch...',
        'ws.lang_warning':        'Hệ thống được tối ưu cho văn bản tiếng Việt. Kết quả với ngôn ngữ khác có thể không chính xác.',
    };

    // ── Vietnamese → error key map (for server messages) ─────────────
    const MSG_MAP = {
        'Vui lòng đăng nhập': 'err.login_required',
        'Vui lòng đăng nhập để sử dụng tính năng này': 'err.login_required',
        'Unauthorized': 'err.unauthorized',
        'Đăng nhập thất bại': 'err.login_failed',
        'Đăng ký thất bại': 'err.register_failed',
        'Mật khẩu xác nhận không khớp': 'err.password_mismatch',
        'Không thể chuyển đổi': 'err.convert_failed',
        'File not found': 'err.file_not_found',
        'Không tìm thấy file audio': 'err.file_not_found',
        'Dữ liệu không hợp lệ': 'err.invalid_data',
        'Lỗi kết nối': 'err.connection',
        'Đăng ký thành công. Vui lòng đăng nhập.': 'err.register_success',
        'Cập nhật thành công!': 'err.update_success',
        'Đổi mật khẩu thành công!': 'err.pw_change_success',
        'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả thư mục spam).': 'auth.forgot.sent',
        'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.': 'auth.reset.success',
        'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn': 'auth.reset.invalid',
    };

    // ── Core engine ───────────────────────────────────────────────────
    function t(key) {
        const dict = currentLang === 'en' ? EN : VI;
        return dict[key] || key;
    }

    function getTranslateCache() {
        try {
            return JSON.parse(localStorage.getItem(TRANSLATE_CACHE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function setTranslateCacheEntry(cacheKey, value) {
        const cache = getTranslateCache();
        cache[cacheKey] = value;
        const keys = Object.keys(cache);
        if (keys.length > 500) {
            keys.slice(0, keys.length - 400).forEach((k) => delete cache[k]);
        }
        try {
            localStorage.setItem(TRANSLATE_CACHE_KEY, JSON.stringify(cache));
        } catch (e) { /* quota */ }
    }

    function makeTranslateCacheKey(text, target) {
        return target + '::' + text;
    }

    async function loadDictionaries() {
        try {
            const [enRes, viRes] = await Promise.all([
                fetch(I18N_JSON_BASE + '/en.json', { cache: 'no-cache' }),
                fetch(I18N_JSON_BASE + '/vi.json', { cache: 'no-cache' }),
            ]);
            if (enRes.ok) Object.assign(EN, await enRes.json());
            if (viRes.ok) Object.assign(VI, await viRes.json());
        } catch (e) {
            console.warn('[i18n] JSON load failed, using embedded dictionary', e);
        }
        dictionariesReady = true;
    }

    const whenReady = loadDictionaries();

    function ensureLoadingOverlay() {
        let el = document.getElementById('vv-i18n-loading');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'vv-i18n-loading';
        el.className = 'vv-i18n-loading';
        el.innerHTML = '<div class="vv-i18n-loading-box"><span class="vv-i18n-loading-spinner"></span><span class="vv-i18n-loading-text"></span></div>';
        document.body.appendChild(el);
        if (!document.getElementById('vv-i18n-loading-style')) {
            const style = document.createElement('style');
            style.id = 'vv-i18n-loading-style';
            style.textContent = `
                .vv-i18n-loading { position:fixed; inset:0; z-index:99999; display:none; align-items:center; justify-content:center;
                    background:rgba(15,23,42,0.35); backdrop-filter:blur(2px); }
                .vv-i18n-loading.is-active { display:flex; }
                .vv-i18n-loading-box { display:flex; align-items:center; gap:10px; padding:12px 18px; border-radius:12px;
                    background:rgba(30,41,59,0.95); border:1px solid rgba(255,255,255,0.1); color:#e2e8f0; font-size:14px; font-weight:600; }
                .vv-i18n-loading-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.25); border-top-color:#a78bfa;
                    border-radius:50%; animation:vv-i18n-spin .7s linear infinite; }
                @keyframes vv-i18n-spin { to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }
        return el;
    }

    function showTranslateLoading() {
        translateLoadingDepth += 1;
        const el = ensureLoadingOverlay();
        const textEl = el.querySelector('.vv-i18n-loading-text');
        if (textEl) textEl.textContent = t('i18n.translating');
        el.classList.add('is-active');
    }

    function hideTranslateLoading() {
        translateLoadingDepth = Math.max(0, translateLoadingDepth - 1);
        const el = document.getElementById('vv-i18n-loading');
        if (el && translateLoadingDepth === 0) el.classList.remove('is-active');
    }

    function getEmbeddedTemplateHtml(templateId) {
        const tpl = document.getElementById(templateId);
        return tpl ? tpl.innerHTML : null;
    }

    function updateLegalUpdatedLine(lang) {
        const page = document.querySelector('.legal-page[data-legal-page]');
        const line = document.getElementById('legal-updated-line');
        if (!page || !line) return;
        const viDate = page.getAttribute('data-vi-updated') || '';
        const enDate = page.getAttribute('data-en-updated') || '';
        const date = lang === 'en' ? enDate : viDate;
        if (!date) return;
        const prefix = t('legal.updated_prefix');
        line.innerHTML = '<span data-i18n="legal.updated_prefix">' + prefix + '</span> ' + date;
    }

    async function callTranslateAPI(text, target) {
        const trimmed = (text || '').trim();
        if (!trimmed) return text || '';

        const ck = makeTranslateCacheKey(trimmed, target);
        const cache = getTranslateCache();
        if (cache[ck]) return cache[ck];

        try {
            const r = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: trimmed, target_language: target }),
            });
            const d = await r.json();
            const translated = (d && d.translated_text) ? d.translated_text : trimmed;
            if (d && d.success && translated) {
                setTranslateCacheEntry(ck, translated);
            }
            return translated || trimmed;
        } catch (e) {
            console.warn('[i18n] translate failed, using source', e);
            return trimmed;
        }
    }

    function ensureDynamicSource(el, isHtml) {
        const srcAttr = 'data-i18n-src';
        if (!el.hasAttribute(srcAttr)) {
            el.setAttribute(srcAttr, isHtml ? el.innerHTML : el.textContent);
        }
    }

    function restoreDynamicElements() {
        document.querySelectorAll('[data-i18n-src]').forEach((el) => {
            const src = el.getAttribute('data-i18n-src');
            if (!src) return;
            if (el.hasAttribute('data-i18n-translate-html')) {
                el.innerHTML = src;
            } else {
                el.textContent = src;
            }
        });
    }

    async function runPool(tasks, limit, gen) {
        let i = 0;
        async function worker() {
            while (i < tasks.length) {
                if (gen !== translateGeneration) return;
                const idx = i++;
                await tasks[idx]();
            }
        }
        const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
        await Promise.all(workers);
    }

    function prepareDynamicContentMarkers() {
        if (detectLegalPageKey() || detectSupportPage()) return;
        document.querySelectorAll('.faq-a').forEach((el) => {
            if (!el.hasAttribute('data-i18n-translate-html')) {
                el.setAttribute('data-i18n-translate-html', '');
            }
        });
        document.querySelectorAll('.guide-card, .guide-step-text').forEach((el) => {
            if (!el.hasAttribute('data-i18n-translate-html')) {
                el.setAttribute('data-i18n-translate-html', '');
            }
        });
        document.querySelectorAll('.contact-card-title, .contact-card-desc, .contact-card-link').forEach((el) => {
            if (!el.hasAttribute('data-i18n-translate')) {
                el.setAttribute('data-i18n-translate', '');
            }
        });
        document.querySelectorAll('.faq-q').forEach((el) => {
            const arrow = el.querySelector('.faq-arrow');
            if (!arrow || el.hasAttribute('data-i18n-prepared')) return;
            const clone = el.cloneNode(true);
            const cloneArrow = clone.querySelector('.faq-arrow');
            if (cloneArrow) cloneArrow.remove();
            const text = (clone.textContent || '').trim();
            if (!text) return;
            const span = document.createElement('span');
            span.className = 'faq-q-text';
            span.setAttribute('data-i18n-translate', '');
            span.textContent = text;
            Array.from(el.childNodes).forEach((n) => {
                if (n !== arrow) el.removeChild(n);
            });
            el.insertBefore(span, arrow);
            el.setAttribute('data-i18n-prepared', '1');
        });
    }

    async function translateElementContent(el, isHtml, gen) {
        if (gen !== translateGeneration) return;
        ensureDynamicSource(el, isHtml);
        const src = el.getAttribute('data-i18n-src') || '';
        if (!src.trim()) return;

        if (!isHtml || src.length < 1800) {
            const translated = await callTranslateAPI(src, 'en');
            if (gen !== translateGeneration) return;
            if (isHtml) el.innerHTML = translated;
            else el.textContent = translated;
            return;
        }

        const childSelector = ':scope > p, :scope > ul, :scope > ol, :scope > div, :scope > h3, :scope > h4, :scope > a.email-cta, :scope > li.step-item';
        const children = el.querySelectorAll(childSelector);
        if (children.length > 0) {
            for (const child of children) {
                if (gen !== translateGeneration) return;
                if (!child.hasAttribute('data-i18n-src')) {
                    child.setAttribute('data-i18n-src', child.outerHTML);
                }
                const chunk = child.getAttribute('data-i18n-src') || child.outerHTML;
                const translated = await callTranslateAPI(chunk, 'en');
                if (gen !== translateGeneration) return;
                const tmp = document.createElement('div');
                tmp.innerHTML = translated;
                const replacement = tmp.firstElementChild;
                if (replacement) child.replaceWith(replacement);
            }
            return;
        }

        const translated = await callTranslateAPI(src, 'en');
        if (gen !== translateGeneration) return;
        el.innerHTML = translated;
    }

    function detectLegalPageKey() {
        const page = document.querySelector('[data-legal-page]');
        if (page && page.dataset.legalPage) return page.dataset.legalPage;
        const path = window.location.pathname || '';
        if (path.includes('payment-terms')) return 'payment';
        if (path.includes('installation-guide') || path.includes('installation_guide')) return 'installation_guide';
        if (path.includes('user-guide') || path.includes('user_guide')) return 'user_guide';
        if (path.includes('data-deletion')) return 'data_deletion';
        if (path.includes('/privacy')) return 'privacy';
        if (path.includes('/terms')) return 'terms';
        return null;
    }

    function detectSupportPage() {
        return document.getElementById('support-dynamic-body') != null;
    }

    async function reloadSupportContent(lang, gen) {
        const container = document.getElementById('support-dynamic-body');
        if (!container) return;

        const embedded = getEmbeddedTemplateHtml(lang === 'en' ? 'support-body-en' : 'support-body-vi');
        if (embedded) {
            if (gen === translateGeneration) {
                container.innerHTML = embedded;
                applyStaticTranslations();
            }
            return;
        }

        let spinnerTimer = null;
        if (lang === 'en') spinnerTimer = setTimeout(() => showTranslateLoading(), 400);
        try {
            const r = await fetch('/api/support/display?lang=' + encodeURIComponent(lang));
            const d = await r.json();
            if (d.success && gen === translateGeneration) {
                container.innerHTML = d.html;
                applyStaticTranslations();
            }
        } catch (e) {
            console.warn('[i18n] support reload failed', e);
        } finally {
            if (spinnerTimer) clearTimeout(spinnerTimer);
            hideTranslateLoading();
        }
    }

    async function reloadLegalContent(lang, gen) {
        const container = document.querySelector('.legal-container');
        const pageKey = detectLegalPageKey();
        if (!container || !pageKey) return;

        const isLongGuide = pageKey === 'user_guide' || pageKey === 'installation_guide';
        const embedded = (!isLongGuide || lang === 'vi')
            ? getEmbeddedTemplateHtml(lang === 'en' ? 'legal-body-en' : 'legal-body-vi')
            : null;
        if (embedded) {
            if (gen === translateGeneration) {
                container.innerHTML = embedded;
                applyStaticTranslations();
                updateLegalUpdatedLine(lang);
            }
            return;
        }

        const token = ++legalReloadToken;
        let spinnerTimer = null;
        if (lang === 'en') spinnerTimer = setTimeout(() => showTranslateLoading(), 400);
        try {
            const r = await fetch('/api/legal/display/' + pageKey + '?lang=' + encodeURIComponent(lang));
            const d = await r.json();
            if (d.success && token === legalReloadToken && gen === translateGeneration) {
                container.innerHTML = d.html;
                applyStaticTranslations();
                updateLegalUpdatedLine(lang);
            }
        } catch (e) {
            console.warn('[i18n] legal reload failed', e);
        } finally {
            if (spinnerTimer) clearTimeout(spinnerTimer);
            hideTranslateLoading();
        }
    }

    async function translateDynamicElements(gen) {
        const els = document.querySelectorAll('[data-i18n-translate], [data-i18n-translate-html]');
        if (!els.length) return;

        showTranslateLoading();
        try {
            const tasks = Array.from(els).map((el) => async () => {
                if (gen !== translateGeneration) return;
                const isHtml = el.hasAttribute('data-i18n-translate-html');
                await translateElementContent(el, isHtml, gen);
            });
            await runPool(tasks, 3, gen);
        } finally {
            hideTranslateLoading();
        }
    }

    function applyStaticTranslations() {
        const dict = currentLang === 'en' ? EN : VI;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) el.textContent = dict[key];
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (dict[key] !== undefined) el.innerHTML = dict[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key] !== undefined) el.placeholder = dict[key];
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (dict[key] !== undefined) el.title = dict[key];
        });

        document.documentElement.lang = currentLang;
        updateToggleButtons();
    }

    async function applyTranslations(gen) {
        const g = gen || translateGeneration;
        applyStaticTranslations();
        prepareDynamicContentMarkers();

        const legalKey = detectLegalPageKey();
        if (legalKey) {
            await reloadLegalContent(currentLang, g);
            return;
        }

        if (detectSupportPage()) {
            await reloadSupportContent(currentLang, g);
            return;
        }

        if (currentLang === 'en') {
            await translateDynamicElements(g);
        } else {
            restoreDynamicElements();
        }
    }

    function updateToggleButtons() {
        document.querySelectorAll('.vv-lang-toggle').forEach(btn => {
            const isVi = currentLang === 'vi';
            btn.innerHTML = isVi
                ? '<span class="lang-vi lang-active">VI</span><span class="lang-sep">|</span><span class="lang-en lang-inactive">EN</span>'
                : '<span class="lang-vi lang-inactive">VI</span><span class="lang-sep">|</span><span class="lang-en lang-active">EN</span>';
            btn.title = isVi ? 'Switch to English' : 'Chuyển sang tiếng Việt';
        });
    }

    async function setLanguage(lang) {
        if (lang !== 'vi' && lang !== 'en') lang = DEFAULT_LANG;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        const gen = ++translateGeneration;
        await applyTranslations(gen);
        window.dispatchEvent(new CustomEvent('vv:langChanged', { detail: { lang } }));
        if (document.body.hasAttribute('data-landing-page') && window.VVLanding && window.VVLanding.applyLandingLang) {
            await window.VVLanding.applyLandingLang(lang);
        }
    }

    function toggle() {
        setLanguage(currentLang === 'vi' ? 'en' : 'vi');
    }

    async function translateText(text, targetLanguage) {
        return callTranslateAPI(text, targetLanguage || 'en');
    }

    function msg(text) {
        if (!text) return '';
        const key = MSG_MAP[text];
        if (key) return t(key);
        return text;
    }

    function resolveApiMessage(data) {
        if (!data) return '';
        if (data.error_code) {
            const key = 'err.' + data.error_code;
            let s = t(key);
            if (!s || s === key) s = data.message || '';
            if (data.error_vars && s) {
                Object.keys(data.error_vars).forEach((k) => {
                    s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), data.error_vars[k]);
                });
            }
            return s;
        }
        return msg(data.message);
    }

    function getLang() { return currentLang; }

    async function boot() {
        await whenReady;
        const gen = translateGeneration;
        await applyTranslations(gen);
        if (document.body.hasAttribute('data-landing-page') && window.VVLanding && window.VVLanding.applyLandingLang) {
            await window.VVLanding.applyLandingLang(currentLang);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => boot());
    } else {
        boot();
    }

    window.VVi18n = {
        t, msg, resolveApiMessage, toggle, setLanguage, getLang, applyTranslations, translateText, callTranslateAPI, whenReady,
    };
    window.__ = window.VVi18n.t;
    window.__msg = window.VVi18n.msg;
}
