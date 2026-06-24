/**
 * Site Settings — Brand, Email, Packages (no live preview)
 */
(function () {
    let _dirty = false;
    let _activeTab = 'brand';
    let _logoSrc = '';
    let _editingPkgId = null;

    function t(key, fb) {
        if (typeof window._t === 'function') return window._t(key, fb);
        if (window.VVi18n && window.VVi18n.t) return window.VVi18n.t(key);
        return fb || key;
    }

    function g(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function setDirty(v) {
        _dirty = v;
        const badge = document.getElementById('assDirtyBadge');
        if (badge) badge.classList.toggle('hidden', !v);
    }

    function showToast(message, type) {
        const el = document.getElementById('assToast');
        if (!el) return;
        el.textContent = message;
        el.className = `als-toast als-toast--${type || 'success'}`;
        el.classList.remove('hidden');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => el.classList.add('hidden'), 4000);
    }

    function formatNum(n) {
        const v = Number(n) || 0;
        return new Intl.NumberFormat('vi-VN').format(v);
    }

    function updateLogoPreview() {
        const formImg = document.getElementById('assLogoPreviewImg');
        const formPh = document.getElementById('assLogoPlaceholder');
        if (!formImg || !formPh) return;
        if (_logoSrc) {
            formImg.src = _logoSrc;
            formImg.classList.remove('hidden');
            formPh.classList.add('hidden');
        } else {
            formImg.classList.add('hidden');
            formPh.classList.remove('hidden');
        }
    }

    function switchMainTab(tab) {
        const id = tab === 'email' || tab === 'packages' ? tab : 'brand';
        _activeTab = id;

        document.querySelectorAll('.ass-top-tab').forEach((btn) => {
            const active = btn.dataset.assTab === id;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        document.querySelectorAll('.ass-tab-panel').forEach((panel) => {
            const show = panel.id === `assTab${id.charAt(0).toUpperCase() + id.slice(1)}`;
            panel.classList.toggle('is-active', show);
            panel.hidden = !show;
        });

        if (id === 'packages') loadPackages();
    }

    function collectSettingsPayload() {
        return {
            site_name: g('assSiteName'),
            support_email: g('assSupportEmail'),
            contact_email: g('assContactEmail'),
            smtp_from_display: g('assSmtpDisplay'),
            company_name: g('assCompanyName'),
            company_phone: g('assCompanyPhone'),
        };
    }

    function applySettings(s) {
        const map = {
            assSiteName: s.site_name,
            assSupportEmail: s.support_email,
            assContactEmail: s.contact_email,
            assSmtpDisplay: s.smtp_from_display,
            assCompanyName: s.company_name,
            assCompanyPhone: s.company_phone,
        };
        Object.keys(map).forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = map[id] || '';
        });

        const hostEl = document.getElementById('assSmtpHostEnv');
        const fromEl = document.getElementById('assSmtpFromEnv');
        if (hostEl) hostEl.textContent = s.smtp_host_env || '—';
        if (fromEl) fromEl.textContent = s.smtp_from_env || '—';

        _logoSrc = s.logo_src || (s.logo_url ? `/static/${s.logo_url.replace(/^\//, '')}` : '');
        updateLogoPreview();
    }

    async function loadSettings() {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (!data.success || !data.settings) return;
            applySettings(data.settings);
            setDirty(false);
        } catch (e) {
            console.warn('[site-settings] load failed', e);
            showToast(t('admin.settings.load_error', 'Không tải được cấu hình'), 'error');
        }
    }

    async function saveSettings() {
        const btn = document.getElementById('assSaveBtn');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;animation:spin 0.8s linear infinite">progress_activity</span> ${t('admin.settings.saving', 'Đang lưu...')}`;
        }

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectSettingsPayload()),
            });
            const data = await res.json();
            if (data.success) {
                setDirty(false);
                showToast(data.message || t('admin.settings.saved', 'Đã lưu cấu hình'), 'success');
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

    async function uploadLogo(file) {
        if (!file) return;
        const dropzone = document.getElementById('assLogoDropzone');
        if (dropzone) dropzone.classList.add('is-uploading');

        const fd = new FormData();
        fd.append('logo', file);

        try {
            const res = await fetch('/api/admin/settings/logo', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                _logoSrc = data.logo_src || '';
                updateLogoPreview();
                showToast(data.message || t('admin.settings.logo_saved', 'Đã cập nhật logo'), 'success');
            } else {
                showToast(data.message || t('admin.settings.logo_error', 'Upload logo thất bại'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast(t('admin.lp.conn_error', 'Lỗi kết nối máy chủ'), 'error');
        } finally {
            if (dropzone) dropzone.classList.remove('is-uploading');
        }
    }

    function initLogoUpload() {
        const input = document.getElementById('assLogoInput');
        const dropzone = document.getElementById('assLogoDropzone');
        const pickBtn = document.getElementById('assLogoPickBtn');
        const openPicker = () => input?.click();

        pickBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            openPicker();
        });
        dropzone?.addEventListener('click', openPicker);
        dropzone?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
            }
        });
        input?.addEventListener('change', () => {
            const file = input.files?.[0];
            if (file) uploadLogo(file);
            input.value = '';
        });
        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('is-dragover');
        });
        dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
        dropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('is-dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) uploadLogo(file);
        });
    }

    function initDirtyTracking() {
        const ids = [
            'assSiteName', 'assSupportEmail', 'assContactEmail',
            'assSmtpDisplay', 'assCompanyName', 'assCompanyPhone',
        ];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => setDirty(true));
                el.addEventListener('change', () => setDirty(true));
            }
        });
    }

    function renderPackagesTable(packages) {
        const tbody = document.getElementById('assPkgTableBody');
        if (!tbody) return;

        if (!packages.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="ass-pkg-empty">${t('admin.settings.pkg_empty', 'Chưa có gói cước')}</td></tr>`;
            return;
        }

        tbody.innerHTML = packages.map((pkg) => {
            const isEditing = _editingPkgId === pkg.id;
            const status = pkg.is_active
                ? `<span class="ass-pkg-badge ass-pkg-badge--on">${t('admin.settings.pkg_active', 'Hiển thị')}</span>`
                : `<span class="ass-pkg-badge ass-pkg-badge--off">${t('admin.settings.pkg_hidden', 'Ẩn')}</span>`;
            const toggleLabel = pkg.is_active
                ? t('admin.settings.pkg_hide', 'Ẩn')
                : t('admin.settings.pkg_show', 'Hiện');
            return `<tr data-pkg-id="${pkg.id}" class="${isEditing ? 'is-editing' : ''}">
              <td><strong>${esc(pkg.name)}</strong></td>
              <td>${formatNum(pkg.characters)}</td>
              <td>${formatNum(pkg.price)}₫</td>
              <td>${pkg.duration_days}</td>
              <td>${status}</td>
              <td class="ass-pkg-actions">
                <button type="button" class="als-btn als-btn--ghost ass-pkg-edit" data-id="${pkg.id}" title="${t('admin.settings.pkg_edit', 'Sửa')}">
                  <span class="material-symbols-outlined">edit</span>
                  <span>${t('admin.settings.pkg_edit', 'Sửa')}</span>
                </button>
                <button type="button" class="als-btn als-btn--ghost ass-pkg-toggle" data-id="${pkg.id}" data-active="${pkg.is_active ? '1' : '0'}">${toggleLabel}</button>
              </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.ass-pkg-edit').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id, 10);
                const pkg = packages.find((p) => p.id === id);
                if (pkg) startEditPackage(pkg);
            });
        });

        tbody.querySelectorAll('.ass-pkg-toggle').forEach((btn) => {
            btn.addEventListener('click', () => togglePackage(btn.dataset.id, btn.dataset.active !== '1'));
        });
    }

    function setPkgFormMode(editing) {
        const form = document.getElementById('assPkgAddForm');
        const title = document.getElementById('assPkgFormTitle');
        const icon = document.getElementById('assPkgSubmitIcon');
        const text = document.getElementById('assPkgSubmitText');
        const cancelBtn = document.getElementById('assPkgCancelEditBtn');
        const editingInput = document.getElementById('assPkgEditingId');

        if (form) form.classList.toggle('is-editing', editing);
        if (title) title.textContent = editing
            ? t('admin.settings.pkg_edit_title', 'Sửa gói')
            : t('admin.settings.pkg_add', 'Thêm gói mới');
        if (icon) icon.textContent = editing ? 'save' : 'add';
        if (text) text.textContent = editing
            ? t('admin.settings.pkg_save', 'Lưu thay đổi')
            : t('admin.settings.pkg_create', 'Tạo gói');
        if (cancelBtn) cancelBtn.classList.toggle('hidden', !editing);
        if (editingInput) editingInput.value = editing ? String(_editingPkgId) : '';
    }

    function resetPkgForm() {
        _editingPkgId = null;
        document.getElementById('assPkgName').value = '';
        document.getElementById('assPkgChars').value = '';
        document.getElementById('assPkgPrice').value = '';
        document.getElementById('assPkgDays').value = '30';
        setPkgFormMode(false);
        document.querySelectorAll('.ass-pkg-table tr.is-editing').forEach((row) => row.classList.remove('is-editing'));
    }

    function startEditPackage(pkg) {
        _editingPkgId = pkg.id;
        document.getElementById('assPkgName').value = pkg.name || '';
        document.getElementById('assPkgChars').value = pkg.characters || '';
        document.getElementById('assPkgPrice').value = pkg.price || 0;
        document.getElementById('assPkgDays').value = pkg.duration_days || 30;
        setPkgFormMode(true);

        document.querySelectorAll('.ass-pkg-table tr').forEach((row) => {
            row.classList.toggle('is-editing', row.dataset.pkgId === String(pkg.id));
        });

        const form = document.getElementById('assPkgAddForm');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function loadPackages() {
        const tbody = document.getElementById('assPkgTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="ass-pkg-loading">${t('admin.loading', 'Đang tải...')}</td></tr>`;

        try {
            const res = await fetch('/api/admin/packages');
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            renderPackagesTable(data.packages || []);
        } catch (e) {
            console.error(e);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="ass-pkg-empty">${t('err.load_failed', 'Lỗi tải dữ liệu')}</td></tr>`;
        }
    }

    async function savePackage() {
        const name = g('assPkgName');
        const characters = parseInt(g('assPkgChars'), 10);
        const price = parseInt(g('assPkgPrice'), 10);
        const duration_days = parseInt(g('assPkgDays'), 10) || 30;
        const editing = _editingPkgId != null;

        if (!name || !characters || characters <= 0) {
            showToast(t('admin.settings.pkg_validation', 'Nhập tên gói và số ký tự'), 'error');
            return;
        }

        const btn = document.getElementById('assPkgSubmitBtn');
        if (btn) btn.disabled = true;

        const payload = {
            name,
            characters,
            price: price || 0,
            duration_days,
        };

        try {
            const url = editing ? `/api/admin/packages/${_editingPkgId}` : '/api/admin/packages';
            const method = editing ? 'PUT' : 'POST';
            const body = editing ? payload : { ...payload, is_active: true };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                showToast(
                    data.message || (editing
                        ? t('admin.settings.pkg_updated', 'Đã cập nhật gói')
                        : t('admin.settings.pkg_created', 'Đã tạo gói')),
                    'success'
                );
                resetPkgForm();
                loadPackages();
            } else {
                showToast(data.message || t('err.save_failed', 'Lỗi'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast(t('admin.lp.conn_error', 'Lỗi kết nối'), 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function togglePackage(id, activate) {
        try {
            const res = await fetch(`/api/admin/packages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: activate }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || t('admin.settings.pkg_updated', 'Đã cập nhật gói'), 'success');
                loadPackages();
            } else {
                showToast(data.message || t('err.save_failed', 'Lỗi'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast(t('admin.lp.conn_error', 'Lỗi kết nối'), 'error');
        }
    }

    function bindActions() {
        if (bindActions._bound) return;
        bindActions._bound = true;

        document.getElementById('assSaveBtn')?.addEventListener('click', saveSettings);
        document.getElementById('assPkgSubmitBtn')?.addEventListener('click', savePackage);
        document.getElementById('assPkgCancelEditBtn')?.addEventListener('click', resetPkgForm);

        document.querySelectorAll('.ass-top-tab:not(:disabled)').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!btn.disabled) switchMainTab(btn.dataset.assTab);
            });
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                saveSettings();
            }
        });
    }

    function init() {
        bindActions();
        initLogoUpload();
        initDirtyTracking();
        switchMainTab('brand');

        if (window.VVi18n && window.VVi18n.whenReady) {
            window.VVi18n.whenReady.then(loadSettings);
        } else {
            loadSettings();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
