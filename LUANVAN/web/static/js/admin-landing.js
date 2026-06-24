/**
 * Landing Studio — editor + live preview
 */
(function () {
    const SECTIONS = [
        { id: 'hero', icon: 'home', labelKey: 'admin.lp.section.hero', labelFb: 'Hero' },
        { id: 'company', icon: 'business', labelKey: 'admin.lp.section.company', labelFb: 'Thông tin công ty' },
        { id: 'about_new', icon: 'info', labelKey: 'admin.lp.section.about_new', labelFb: 'Về VietVoice AI' },
        { id: 'trusted', icon: 'verified', labelKey: 'admin.lp.section.trusted', labelFb: 'Được tin dùng' },
        { id: 'features', icon: 'stars', labelKey: 'admin.lp.section.features', labelFb: 'Tính năng' },
        { id: 'steps', icon: 'route', labelKey: 'admin.lp.section.steps', labelFb: 'Hướng dẫn 3 bước' },
        { id: 'showcase', icon: 'mic', labelKey: 'admin.lp.section.showcase', labelFb: 'Showcase' },
        { id: 'final_cta', icon: 'campaign', labelKey: 'admin.lp.section.final_cta', labelFb: 'CTA cuối trang' },
        { id: 'about', icon: 'groups', labelKey: 'admin.lp.section.about', labelFb: 'Về chúng tôi' },
        { id: 'footer', icon: 'web_asset', labelKey: 'admin.lp.section.footer', labelFb: 'Footer' },
    ];

    const ICON_PRESETS = [
        'visibility', 'flag', 'handshake', 'star', 'mic', 'groups',
        'bolt', 'favorite', 'verified', 'psychology', 'lightbulb', 'rocket_launch',
    ];

    const SECTION_SCROLL_MAP = {
        hero: '#lp-section-hero',
        company: '#about',
        about_new: '#about',
        trusted: '#lp-section-stats',
        features: '#features',
        steps: '#features',
        showcase: '#pricing',
        final_cta: '#lp-section-cta',
        about: '#about',
        footer: '#lp-section-footer',
    };

    let _dirty = false;
    let _activeSection = 'hero';
    let _previewTimer = null;
    let _previewDevice = 'desktop';
    let _previewReady = false;
    let _workspaceTab = 'preview';

    const PREVIEW_DEBOUNCE_MS = 600;

    function t(key, fb) {
        if (typeof window._t === 'function') return window._t(key, fb);
        if (window.VVi18n && window.VVi18n.t) return window.VVi18n.t(key);
        return fb || key;
    }

    function g(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function setDirty(v) {
        _dirty = v;
        const badge = document.getElementById('alsDirtyBadge');
        if (badge) badge.classList.toggle('hidden', !v);
    }

    function showToast(message, type) {
        const el = document.getElementById('alsToast');
        if (!el) return;
        el.textContent = message;
        el.className = `als-toast als-toast--${type || 'success'}`;
        el.classList.remove('hidden');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => el.classList.add('hidden'), 4000);
    }

    function buildSectionNav() {
        const nav = document.getElementById('alsSectionNav');
        if (!nav) return;
        nav.innerHTML = SECTIONS.map((s) => {
            return `<button type="button" class="als-section-btn${s.id === _activeSection ? ' is-active' : ''}" data-als-section="${s.id}">
              <span class="material-symbols-outlined">${s.icon}</span>
              <span data-i18n="${s.labelKey}">${s.labelFb}</span>
            </button>`;
        }).join('');

        nav.querySelectorAll('.als-section-btn').forEach((btn) => {
            btn.addEventListener('click', () => switchSection(btn.dataset.alsSection));
        });
        refreshSectionNavLabels();
    }

    function refreshSectionNavLabels() {
        document.querySelectorAll('#alsSectionNav [data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const sec = SECTIONS.find((s) => s.labelKey === key);
            el.textContent = t(key, sec ? sec.labelFb : key);
        });
    }

    function refreshDynamicI18n() {
        refreshSectionNavLabels();
        document.querySelectorAll('.als-link-label').forEach((el) => {
            el.placeholder = t('admin.lp.link_label', 'Nhãn');
        });
        document.querySelectorAll('.als-link-href').forEach((el) => {
            el.placeholder = t('admin.lp.link_url', '/đường-dẫn');
        });
        const addBtns = document.querySelectorAll('.als-link-add');
        addBtns.forEach((btn) => {
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">add</span> ${t('admin.lp.link_add', 'Thêm liên kết')}`;
        });
    }

    function switchSection(id) {
        if (!id) return;
        _activeSection = id;
        document.querySelectorAll('.als-section-btn').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.alsSection === id);
        });
        document.querySelectorAll('.als-panel').forEach((panel) => {
            panel.classList.toggle('is-active', panel.id === `als-panel-${id}`);
        });
        scrollPreviewToSection(id);
    }

    function setPreviewLoading(on) {
        const overlay = document.getElementById('alsPreviewOverlay');
        if (overlay) {
            overlay.classList.toggle('is-active', on);
            overlay.setAttribute('aria-busy', on ? 'true' : 'false');
        }
    }

    function switchWorkspaceTab(tab) {
        const next = tab === 'edit' ? 'edit' : 'preview';
        _workspaceTab = next;

        document.querySelectorAll('.als-ws-tab').forEach((btn) => {
            const active = btn.dataset.alsWs === next;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        const editPanel = document.getElementById('alsWsEdit');
        const previewPanel = document.getElementById('alsWsPreview');
        if (editPanel) editPanel.classList.toggle('is-active', next === 'edit');
        if (previewPanel) previewPanel.classList.toggle('is-active', next === 'preview');

        const workspace = document.getElementById('alsWorkspace');
        if (workspace) workspace.classList.toggle('is-preview-tab', next === 'preview');

        if (next === 'preview') {
            scrollPreviewToSection(_activeSection);
        }
    }

    function pushInstantPreview() {
        const iframe = document.getElementById('alsPreviewFrame');
        if (!iframe?.contentWindow || !_previewReady) return;
        try {
            iframe.contentWindow.postMessage({
                type: 'als-preview-update',
                lp: collectData(),
            }, window.location.origin);
        } catch (e) {
            /* ignore */
        }
    }

    function scheduleLivePreview() {
        pushInstantPreview();
        clearTimeout(_previewTimer);
        _previewTimer = setTimeout(pushPreviewAndReload, PREVIEW_DEBOUNCE_MS);
    }

    async function pushPreviewAndReload() {
        const iframe = document.getElementById('alsPreviewFrame');
        if (!iframe) return;
        setPreviewLoading(true);
        _previewReady = false;
        try {
            const res = await fetch('/api/admin/landing/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectData()),
            });
            if (!res.ok) throw new Error('preview failed');
            iframe.src = `/admin/landing/preview?t=${Date.now()}`;
        } catch (e) {
            console.warn('[landing-studio] preview sync failed', e);
            setPreviewLoading(false);
        }
    }

    function scrollPreviewToSection(sectionId) {
        const iframe = document.getElementById('alsPreviewFrame');
        const selector = SECTION_SCROLL_MAP[sectionId];
        if (!iframe || !selector || !_previewReady) return;

        try {
            const doc = iframe.contentDocument;
            const target = doc?.querySelector(selector);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
            /* ignore */
        }
    }

    function setPreviewDevice(mode) {
        _previewDevice = mode === 'mobile' ? 'mobile' : 'desktop';
        const wrap = document.getElementById('alsPreviewFrameWrap');
        if (wrap) wrap.classList.toggle('is-mobile', _previewDevice === 'mobile');
        document.querySelectorAll('.als-device-btn').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.alsDevice === _previewDevice);
        });
    }

    function focusLivePreview() {
        switchWorkspaceTab('preview');
    }

    function initPreview() {
        const iframe = document.getElementById('alsPreviewFrame');
        if (!iframe) return;

        iframe.addEventListener('load', () => {
            _previewReady = true;
            setPreviewLoading(false);
            setTimeout(() => {
                pushInstantPreview();
                scrollPreviewToSection(_activeSection);
            }, 150);
        });

        document.getElementById('alsPreviewRefresh')?.addEventListener('click', () => {
            pushPreviewAndReload();
        });

        document.querySelectorAll('.als-device-btn').forEach((btn) => {
            btn.addEventListener('click', () => setPreviewDevice(btn.dataset.alsDevice));
        });

        document.querySelectorAll('.als-ws-tab').forEach((btn) => {
            btn.addEventListener('click', () => switchWorkspaceTab(btn.dataset.alsWs));
        });

        setPreviewDevice('desktop');
        switchWorkspaceTab('preview');
    }

    function markDirty() {
        setDirty(true);
        scheduleLivePreview();
    }

    function createLinkRow(label, href) {
        const row = document.createElement('div');
        row.className = 'als-link-row';
        row.innerHTML = `
          <input type="text" class="als-link-label" data-i18n-placeholder="admin.lp.link_label" placeholder="Nhãn" value="${escAttr(label || '')}"/>
          <input type="text" class="als-link-href" data-i18n-placeholder="admin.lp.link_url" placeholder="/đường-dẫn" value="${escAttr(href || '')}"/>
          <button type="button" class="als-link-remove" aria-label="Xóa"><span class="material-symbols-outlined" style="font-size:18px">close</span></button>
        `;
        row.querySelector('.als-link-remove').addEventListener('click', () => {
            row.remove();
            markDirty();
        });
        row.querySelectorAll('input').forEach((inp) => {
            inp.addEventListener('input', markDirty);
        });
        return row;
    }

    function escAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function initLinkManager(containerId, links) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const list = Array.isArray(links) ? links : [];
        container.innerHTML = '';
        const rowsWrap = document.createElement('div');
        rowsWrap.className = 'als-link-rows';
        list.forEach((lnk) => rowsWrap.appendChild(createLinkRow(lnk.label, lnk.href)));
        if (!list.length) rowsWrap.appendChild(createLinkRow('', '#'));
        container.appendChild(rowsWrap);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'als-link-add';
        addBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">add</span> ${t('admin.lp.link_add', 'Thêm liên kết')}`;
        addBtn.addEventListener('click', () => {
            rowsWrap.appendChild(createLinkRow('', '#'));
            markDirty();
        });
        container.appendChild(addBtn);
    }

    function getLinksFromManager(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return [...container.querySelectorAll('.als-link-row')].map((row) => ({
            label: row.querySelector('.als-link-label')?.value.trim() || '',
            href: row.querySelector('.als-link-href')?.value.trim() || '#',
        })).filter((l) => l.label || l.href);
    }

    function initIconPicker(wrapper) {
        const targetId = wrapper.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        wrapper.innerHTML = ICON_PRESETS.map((name) => {
            const sel = input.value === name ? ' is-selected' : '';
            return `<button type="button" class="als-icon-opt${sel}" data-icon="${name}" title="${name}">
              <span class="material-symbols-outlined">${name}</span>
            </button>`;
        }).join('');

        wrapper.querySelectorAll('.als-icon-opt').forEach((btn) => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.icon;
                wrapper.querySelectorAll('.als-icon-opt').forEach((b) => b.classList.remove('is-selected'));
                btn.classList.add('is-selected');
                markDirty();
            });
        });
    }

    function initDirtyTracking() {
        const root = document.getElementById('alsFormRoot');
        if (!root) return;
        root.addEventListener('input', markDirty);
        root.addEventListener('change', markDirty);
    }

    function collectData() {
        return {
            hero: {
                tag: g('hero_tag'),
                title_line1: g('hero_title_line1'),
                title_grad: g('hero_title_grad'),
                title_line2: g('hero_title_line2'),
                btn_primary: g('hero_btn_primary'),
                free_note: g('hero_free_note'),
            },
            company: {
                name: g('company_name'),
                desc: g('company_desc'),
                mst: g('company_mst'),
                representative: g('company_representative'),
                address: g('company_address'),
                phone: g('company_phone'),
                since: g('company_since'),
            },
            about_new: {
                title: g('about_new_title'),
                desc: g('about_new_desc'),
                cards: [0, 1, 2].map((i) => ({
                    icon: g(`about_card_${i}_icon`),
                    title: g(`about_card_${i}_title`),
                    desc: g(`about_card_${i}_desc`),
                })),
            },
            footer: {
                brand_desc: g('footer_brand_desc'),
                col1_title: g('footer_col1_title') || 'TÍNH NĂNG',
                col2_title: g('footer_col2_title') || 'HỖ TRỢ',
                col3_title: g('footer_col3_title') || 'TÀI KHOẢN',
                col1_links: getLinksFromManager('footerCol1LinkManager'),
                col2_links: getLinksFromManager('footerCol2LinkManager'),
                copyright: g('footer_copyright'),
            },
            trusted: {
                label: g('trusted_label') || 'Được tin dùng bởi',
                items: (g('trusted_items') || '').split('\n').map((s) => s.trim()).filter(Boolean),
            },
            features: {
                label: g('feat_label') || 'TÍNH NĂNG NỔI BẬT',
                title: g('feat_title'),
                subtitle: g('feat_subtitle'),
                cards: [0, 1, 2, 3].map((i) => ({
                    num: String(i + 1).padStart(2, '0'),
                    icon: g(`feat_card_${i}_icon`),
                    title: g(`feat_card_${i}_title`),
                    desc: g(`feat_card_${i}_desc`),
                })).filter((c) => c.title),
            },
            steps: {
                label: g('steps_label') || 'ĐƠN GIẢN',
                title: g('steps_title'),
                subtitle: g('steps_subtitle'),
                items: [0, 1, 2].map((i) => ({
                    num: String(i + 1).padStart(2, '0'),
                    icon: g(`step_${i}_icon`),
                    title: g(`step_${i}_title`),
                    desc: g(`step_${i}_desc`),
                })).filter((s) => s.title),
            },
            showcase: {
                icon: g('showcase_icon'),
                title: g('showcase_title'),
                desc: g('showcase_desc'),
                badges: (g('showcase_badges') || '').split('\n').map((s) => s.trim()).filter(Boolean),
                btn: g('showcase_btn'),
            },
            final_cta: {
                title: g('fcta_title'),
                subtitle: g('fcta_subtitle'),
                btn_primary: g('fcta_btn_primary'),
                btn_secondary: g('fcta_btn_secondary'),
                note: g('fcta_note'),
            },
            about: {
                label: g('about_label'),
                title: g('about_title'),
                company_desc: g('about_company_desc'),
                info_row1: g('about_info1'),
                info_row2: g('about_info2'),
                info_row3: g('about_info3'),
                btn: g('about_btn'),
                note: g('about_note'),
            },
        };
    }

    async function saveContent() {
        const btn = document.getElementById('alsSaveBtn');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;animation:spin 0.8s linear infinite">progress_activity</span> ${t('admin.lp.saving', 'Đang lưu...')}`;
        }

        try {
            const res = await fetch('/admin/landing/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectData()),
            });
            const data = await res.json();
            if (data.success) {
                setDirty(false);
                showToast(data.message || t('admin.lp.saved', 'Đã lưu'), 'success');
                pushPreviewAndReload();
            } else {
                showToast(data.message || t('err.save_failed', 'Lỗi lưu'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast(t('admin.lp.conn_error', 'Lỗi kết nối máy chủ'), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    }

    function initFromJson() {
        const el = document.getElementById('landingLinksData');
        if (!el) return;
        try {
            const data = JSON.parse(el.textContent);
            initLinkManager('footerCol1LinkManager', data.col1 || []);
            initLinkManager('footerCol2LinkManager', data.col2 || []);
            refreshDynamicI18n();
        } catch (e) {
            console.error('landing links init', e);
            initLinkManager('footerCol1LinkManager', []);
            initLinkManager('footerCol2LinkManager', []);
        }
    }

    function init() {
        bindActions();
        initPreview();

        if (window.VVi18n && window.VVi18n.whenReady) {
            window.VVi18n.whenReady.then(() => {
                buildSectionNav();
                initFromJson();
                document.querySelectorAll('.als-icon-picker').forEach(initIconPicker);
                initDirtyTracking();
            });
        } else {
            buildSectionNav();
            initFromJson();
            document.querySelectorAll('.als-icon-picker').forEach(initIconPicker);
            initDirtyTracking();
        }

        window.addEventListener('vv:langChanged', () => refreshDynamicI18n());
    }

    function isPreviewShortcut(e) {
        if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
            return e.code === 'KeyP' || e.key === 'P' || e.key === 'p';
        }
        return false;
    }

    function bindActions() {
        if (bindActions._bound) return;
        bindActions._bound = true;

        document.getElementById('alsSaveBtn')?.addEventListener('click', saveContent);

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                saveContent();
                return;
            }
            if (isPreviewShortcut(e)) {
                e.preventDefault();
                focusLivePreview();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
