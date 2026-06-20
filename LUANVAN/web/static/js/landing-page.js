/**
 * Landing page — pricing, demo animation, dynamic content i18n (vi/en)
 */
(function () {
    if (!document.body.hasAttribute('data-landing-page')) return;

    const REGISTER_URL = document.body.getAttribute('data-register-url') || '/register';

    function lpT(key, fallback, vars) {
        let s = (window.VVi18n && window.VVi18n.t) ? window.VVi18n.t(key) : (fallback || key);
        if (vars && s) {
            Object.keys(vars).forEach((k) => {
                s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
            });
        }
        return s;
    }

    function getViLp() {
        const el = document.getElementById('landing-lp-vi');
        if (!el) return null;
        try {
            return JSON.parse(el.textContent);
        } catch (e) {
            return null;
        }
    }

    function getNested(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
    }

    function applyLp(lp) {
        if (!lp) return;
        document.querySelectorAll('[data-lp]').forEach((el) => {
            const path = el.getAttribute('data-lp');
            const v = getNested(lp, path);
            if (v != null && typeof v === 'string') {
                el.textContent = v;
            }
        });
    }

    function resetDemoConvertBtn() {
        const btn = document.getElementById('demo-convert-btn');
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-base" style="font-variation-settings:\'FILL\' 1;">graphic_eq</span> <span data-i18n="lp.demo.convert">' + lpT('lp.demo.convert', 'Chuyển đổi') + '</span>';
    }

    async function applyLandingLang(lang, gen) {
        const showLoad = lang === 'en' && document.getElementById('vv-i18n-loading');
        if (showLoad && window.VVi18n && typeof window.VVi18n.t === 'function') {
            const overlay = document.getElementById('vv-i18n-loading');
            if (overlay) {
                const textEl = overlay.querySelector('.vv-i18n-loading-text');
                if (textEl) textEl.textContent = window.VVi18n.t('i18n.translating');
                overlay.classList.add('is-active');
            }
        }
        try {
            if (lang === 'vi') {
                applyLp(getViLp());
                return;
            }
            const r = await fetch('/api/landing/display?lang=en');
            const d = await r.json();
            if (d.success && d.lp) {
                if (gen && gen !== __vvLandingGen) return;
                applyLp(d.lp);
            }
        } catch (e) {
            console.warn('[landing] applyLandingLang failed', e);
        } finally {
            const overlay = document.getElementById('vv-i18n-loading');
            if (overlay) overlay.classList.remove('is-active');
        }
    }

    let __vvLandingGen = 0;

    function formatPrice(price) {
        if (!price || price === 0) return lpT('lp.price.free', 'Miễn phí');
        const suffix = lpT('lp.price.currency', 'đ');
        return new Intl.NumberFormat('vi-VN').format(price) + suffix;
    }

    function formatChars(chars) {
        if (chars >= 1000000) return (chars / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (chars >= 1000) return (chars / 1000).toFixed(0) + 'K';
        return chars.toLocaleString('vi-VN');
    }

    function formatDuration(days) {
        if (days === 30) return lpT('lp.duration.1m', '1 tháng');
        if (days === 90) return lpT('lp.duration.3m', '3 tháng');
        if (days === 180) return lpT('lp.duration.6m', '6 tháng');
        if (days === 365) return lpT('lp.duration.1y', '1 năm');
        return lpT('lp.duration.days', '{n} ngày', { n: days });
    }

    function getPackageFeatures(pkg) {
        const chars = pkg.characters || 0;
        return [
            lpT('lp.pkg.chars', '<strong>{n}</strong> ký tự / kỳ', { n: formatChars(chars) }),
            lpT('lp.pkg.valid', 'Hiệu lực <strong>{d}</strong>', { d: formatDuration(pkg.duration_days || 30) }),
            lpT('lp.pkg.voices', 'Toàn bộ giọng nói có sẵn'),
            lpT('lp.pkg.download', 'Tải file MP3 / WAV'),
            lpT('lp.pkg.support', 'Hỗ trợ qua email'),
        ];
    }

    async function loadPricingPackages() {
        const loading = document.getElementById('pricing-loading');
        const grid = document.getElementById('pricing-grid');
        if (!grid) return;

        try {
            const res = await fetch('/api/packages', { cache: 'no-store' });
            const data = await res.json();

            if (loading) loading.classList.add('hidden');

            if (!data.success || !data.packages || data.packages.length === 0) {
                renderFallbackPricing();
                return;
            }

            grid.classList.remove('hidden');
            grid.innerHTML = '';

            const packages = data.packages;
            const popularIdx = Math.floor(packages.length / 2);
            const n = packages.length;
            const perRow = n <= 2 ? n : n <= 4 ? 2 : 3;
            const cardBasis = perRow === 1 ? 'min(100%, 400px)'
                : perRow === 2 ? 'min(calc(50% - 12px), 420px)'
                    : 'min(calc(33.333% - 16px), 380px)';

            packages.forEach((pkg, idx) => {
                const isPopular = idx === popularIdx;
                const features = getPackageFeatures(pkg);
                const price = formatPrice(pkg.price);
                const isFree = !pkg.price || pkg.price === 0;
                const dur = formatDuration(pkg.duration_days || 30);
                const btnLabel = isFree
                    ? lpT('lp.btn.start_free', 'Bắt đầu miễn phí')
                    : lpT('lp.btn.register', 'Đăng ký ngay');

                const card = document.createElement('div');
                card.className = `relative glass-card p-8 rounded-3xl reveal-on-scroll flex flex-col transition-all duration-300 delay-${(idx + 1) * 100}` +
                    (isPopular ? ' border-primary/50 shadow-[0_0_30px_rgba(160,120,255,0.2)]' : '');
                card.style.cssText = `flex: 1 1 ${cardBasis}; max-width: 380px;`;

                card.innerHTML = `
                    ${isPopular ? `<div class="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white text-xs font-bold tracking-wide shadow-lg whitespace-nowrap">
                        ${lpT('lp.popular', '⭐ Phổ biến nhất')}
                    </div>` : ''}
                    <div class="mb-6">
                        <h3 class="font-headline-sm text-on-surface mb-1">${pkg.name}</h3>
                        <p class="text-on-surface-variant text-sm">${dur}</p>
                    </div>
                    <div class="mb-8">
                        <span class="text-4xl font-extrabold ${isPopular ? 'bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent' : 'text-on-surface'}">${price}</span>
                        ${!isFree ? `<span class="text-on-surface-variant text-sm ml-1">/ ${dur}</span>` : ''}
                    </div>
                    <ul class="space-y-3 mb-8 flex-grow">
                        ${features.map((f) => `
                        <li class="flex items-start gap-3 text-sm text-on-surface-variant">
                            <span class="material-symbols-outlined text-green-400 text-base mt-0.5 flex-shrink-0">check_circle</span>
                            <span>${f}</span>
                        </li>`).join('')}
                    </ul>
                    <a href="${REGISTER_URL}" class="w-full h-12 rounded-full flex items-center justify-center font-label-md text-sm transition-all duration-300
                        ${isPopular ? 'primary-gradient-btn text-white glow-effect' : 'glass-panel border border-white/10 text-on-surface hover:bg-white/5'}">
                        ${btnLabel}
                    </a>
                `;
                grid.appendChild(card);
            });

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
            }, { threshold: 0.1 });
            grid.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
        } catch (err) {
            if (loading) loading.classList.add('hidden');
            renderFallbackPricing();
        }
    }

    function renderFallbackPricing() {
        const grid = document.getElementById('pricing-grid');
        if (!grid) return;
        grid.classList.remove('hidden');
        grid.innerHTML = `
            <div class="glass-card p-8 rounded-3xl flex flex-col reveal-on-scroll delay-100 is-visible" style="flex:1 1 min(calc(33.333% - 16px),380px);max-width:380px;">
                <div class="mb-6"><h3 class="font-headline-sm mb-1">${lpT('lp.fallback.basic', 'Cơ bản')}</h3><p class="text-on-surface-variant text-sm">${lpT('lp.duration.1m', '1 tháng')}</p></div>
                <div class="mb-8"><span class="text-4xl font-extrabold text-on-surface">${lpT('lp.price.free', 'Miễn phí')}</span></div>
                <a href="${REGISTER_URL}" class="w-full h-12 rounded-full glass-panel border border-white/10 text-on-surface font-label-md text-sm flex items-center justify-center hover:bg-white/5 transition-colors">${lpT('lp.btn.start_free', 'Bắt đầu miễn phí')}</a>
            </div>
        `;
    }

    function initRevealObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, { root: null, rootMargin: '0px', threshold: 0.1 });
        document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    }

    function initMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        function openMobileMenu() {
            if (mobileMenu) mobileMenu.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }
        function closeMobileMenu() {
            if (mobileMenu) mobileMenu.classList.remove('is-open');
            document.body.style.overflow = '';
        }
        window.closeMobileMenu = closeMobileMenu;
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
        if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    window.scrollToFeatures = function scrollToFeatures() {
        const el = document.getElementById('features');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    function initDemoWaveform() {
        const container = document.getElementById('demo-waveform');
        if (!container) return;
        const heights = [18, 28, 40, 55, 62, 70, 58, 72, 80, 64, 72, 58, 68, 52, 72, 64, 56, 72, 60, 48, 70, 56, 40, 28, 18];
        heights.forEach(() => {
            const bar = document.createElement('div');
            bar.className = 'wavebar';
            bar.style.height = '8px';
            container.appendChild(bar);
        });
        window._demoBars = Array.from(container.querySelectorAll('.wavebar'));
        window._demoHeights = heights;
    }

    let _demoPlaying = false;
    let _demoProgress = 0;
    const DEMO_DURATION = 4000;

    window.runDemoAnimation = function runDemoAnimation() {
        const bars = window._demoBars;
        const heights = window._demoHeights;
        if (!bars) return;

        const status = document.getElementById('demo-status');
        const btn = document.getElementById('demo-convert-btn');

        btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> ' + lpT('lp.demo.processing', 'Đang xử lý...');
        btn.disabled = true;
        if (status) status.textContent = lpT('lp.demo.synthesizing', 'Đang tổng hợp giọng nói...');

        setTimeout(() => {
            bars.forEach((bar, i) => {
                bar.style.height = heights[i] + 'px';
                bar.style.animationDelay = (i * 0.04) + 's';
                bar.classList.add('active');
            });
            if (status) status.textContent = lpT('lp.demo.ready', '✓ Đã tổng hợp xong — sẵn sàng phát');
            btn.innerHTML = '<span class="material-symbols-outlined text-base" style="font-variation-settings:\'FILL\' 1;">graphic_eq</span> <span>' + lpT('lp.demo.convert', 'Chuyển đổi') + '</span>';
            btn.disabled = false;
            startDemoPlay();
        }, 900);
    };

    function startDemoPlay() {
        _demoPlaying = true;
        _demoProgress = 0;
        const icon = document.getElementById('demo-play-icon');
        if (icon) icon.textContent = 'pause';
        tickDemoProgress();
    }

    window.toggleDemoPlay = function toggleDemoPlay() {
        const bars = window._demoBars;
        if (!bars || bars[0].style.height === '8px') {
            runDemoAnimation();
            return;
        }
        _demoPlaying = !_demoPlaying;
        const icon = document.getElementById('demo-play-icon');
        if (icon) icon.textContent = _demoPlaying ? 'pause' : 'play_arrow';
        if (_demoPlaying) tickDemoProgress();
    };

    function tickDemoProgress() {
        if (!_demoPlaying) return;
        _demoProgress += 50;
        if (_demoProgress > DEMO_DURATION) {
            _demoProgress = 0;
            _demoPlaying = false;
            const icon = document.getElementById('demo-play-icon');
            if (icon) icon.textContent = 'play_arrow';
            const prog = document.getElementById('demo-progress');
            if (prog) prog.style.width = '0%';
            const time = document.getElementById('demo-time');
            if (time) time.textContent = '0:00';
            return;
        }
        const pct = (_demoProgress / DEMO_DURATION * 100).toFixed(1);
        const prog = document.getElementById('demo-progress');
        if (prog) prog.style.width = pct + '%';
        const sec = Math.floor(_demoProgress / 1000);
        const time = document.getElementById('demo-time');
        if (time) time.textContent = '0:0' + sec;
        setTimeout(tickDemoProgress, 50);
    }

    async function initLanding() {
        initRevealObserver();
        initMobileMenu();
        initDemoWaveform();
    }

    window.VVLanding = {
        applyLandingLang: async (lang) => {
            __vvLandingGen += 1;
            const gen = __vvLandingGen;
            await applyLandingLang(lang, gen);
            resetDemoConvertBtn();
            await loadPricingPackages();
        },
        reloadPricing: loadPricingPackages,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanding);
    } else {
        initLanding();
    }
})();
