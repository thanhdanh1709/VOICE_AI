/**
 * Admin Site Settings (logo, email, packages)
 */
(function () {
  'use strict';

  const statusEl = document.getElementById('asStatus');

  function _t(key, fallback, vars) {
    let s = (window.VVi18n && window.VVi18n.t) ? window.VVi18n.t(key) : (fallback || key);
    if (vars && s) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  function showStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.className = 'as-status ' + (ok ? 'success' : 'error');
    statusEl.textContent = msg;
    statusEl.style.display = 'flex';
    setTimeout(() => { statusEl.style.display = 'none'; }, 4500);
  }

  function switchTab(tabId) {
    document.querySelectorAll('.as-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.as-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== 'panel-' + tabId);
    });
  }

  document.querySelectorAll('.as-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  async function loadSettings() {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    if (!data.success) return;
    const s = data.settings;
    document.getElementById('siteName').value = s.site_name || '';
    document.getElementById('supportEmail').value = s.support_email || '';
    document.getElementById('contactEmail').value = s.contact_email || '';
    document.getElementById('smtpFromDisplay').value = s.smtp_from_display || '';
    document.getElementById('companyName').value = s.company_name || '';
    document.getElementById('companyPhone').value = s.company_phone || '';
    document.getElementById('smtpFromEnv').textContent = s.smtp_from_env || _t('admin.cfg.smtp_not_configured', '(chưa cấu hình trong .env)');
    document.getElementById('smtpHostEnv').textContent = s.smtp_host_env || _t('admin.cfg.smtp_not_configured', '(chưa cấu hình)');
    const preview = document.getElementById('logoPreview');
    if (s.logo_url) {
      preview.src = '/static/' + s.logo_url;
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  async function loadPackages() {
    const tbody = document.getElementById('packagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">${_t('admin.cfg.loading', 'Đang tải...')}</td></tr>`;
    const res = await fetch('/api/admin/packages');
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-red-400">${_t('admin.cfg.pkg_load_error', 'Lỗi tải gói cước')}</td></tr>`;
      return;
    }
    if (!data.packages.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">${_t('admin.cfg.no_packages', 'Chưa có gói cước')}</td></tr>`;
      return;
    }
    const saveLabel = _t('admin.cfg.btn_save_row', 'Lưu');
    const hideLabel = _t('admin.cfg.btn_hide', 'Ẩn');
    const lblName = _t('admin.cfg.pkg_name', 'Tên gói');
    const lblChars = _t('admin.cfg.pkg_chars', 'Ký tự');
    const lblPrice = _t('admin.cfg.pkg_price', 'Giá (VND)');
    const lblDays = _t('admin.cfg.pkg_days', 'Ngày');
    const lblVisible = _t('admin.cfg.pkg_visible', 'Hiển thị');
    tbody.innerHTML = data.packages.map((pkg) => `
      <tr data-id="${pkg.id}">
        <td data-label="${escapeAttr(lblName)}"><input type="text" class="as-input pkg-name" value="${escapeAttr(pkg.name)}"></td>
        <td data-label="${escapeAttr(lblChars)}"><input type="number" class="as-input pkg-chars" value="${pkg.characters}" min="0"></td>
        <td data-label="${escapeAttr(lblPrice)}"><input type="number" class="as-input pkg-price" value="${pkg.price}" min="0" step="1"></td>
        <td data-label="${escapeAttr(lblDays)}"><input type="number" class="as-input pkg-days" value="${pkg.duration_days}" min="1"></td>
        <td class="text-center" data-label="${escapeAttr(lblVisible)}">
          <input type="checkbox" class="pkg-active" ${pkg.is_active ? 'checked' : ''}>
        </td>
        <td class="text-right as-actions-cell">
          <button type="button" class="as-btn-sm save-pkg">${saveLabel}</button>
          <button type="button" class="as-btn-sm danger hide-pkg" ${pkg.is_active ? '' : 'disabled'}>${hideLabel}</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.save-pkg').forEach((btn) => {
      btn.addEventListener('click', () => savePackageRow(btn.closest('tr')));
    });
    tbody.querySelectorAll('.hide-pkg').forEach((btn) => {
      btn.addEventListener('click', () => hidePackage(btn.closest('tr')));
    });
  }

  function parsePkgInt(input, fallback) {
    const raw = (input?.value ?? '').trim();
    if (raw === '') return fallback !== undefined ? fallback : NaN;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? NaN : n;
  }

  async function savePackageRow(row) {
    const id = row.dataset.id;
    const characters = parsePkgInt(row.querySelector('.pkg-chars'));
    const price = parsePkgInt(row.querySelector('.pkg-price'), 0);
    const durationDays = parsePkgInt(row.querySelector('.pkg-days'));
    if (Number.isNaN(characters) || Number.isNaN(price) || Number.isNaN(durationDays)) {
      showStatus(_t('admin.cfg.invalid_pkg_fields', 'Giá, số ký tự hoặc số ngày không hợp lệ'), false);
      return;
    }
    const body = {
      name: row.querySelector('.pkg-name').value.trim(),
      characters,
      price,
      duration_days: durationDays,
      is_active: row.querySelector('.pkg-active').checked,
    };
    const res = await fetch('/api/admin/packages/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Phản hồi không hợp lệ' }));
    if (!data.success) {
      showStatus(data.message || _t('err.save_failed', 'Lưu thất bại'), false);
      return;
    }
    const pkg = data.package;
    const charsLabel = _t('common.chars', 'ký tự');
    const detail = pkg
      ? `${pkg.name}: ${pkg.characters?.toLocaleString('vi-VN')} ${charsLabel} · ${pkg.price?.toLocaleString('vi-VN')}đ`
      : '';
    showStatus((data.message || _t('err.update_success', 'Đã lưu')) + (detail ? ` — ${detail}` : ''), true);
    loadPackages();
  }

  async function hidePackage(row) {
    const id = row.dataset.id;
    if (!confirm(_t('admin.cfg.hide_pkg_confirm', 'Ẩn gói này khỏi trang bảng giá?'))) return;
    const res = await fetch('/api/admin/packages/' + id, { method: 'DELETE' });
    const data = await res.json();
    showStatus(data.message, data.success);
    if (data.success) loadPackages();
  }

  document.getElementById('saveGeneralBtn')?.addEventListener('click', async () => {
    const body = {
      site_name: document.getElementById('siteName').value.trim(),
      support_email: document.getElementById('supportEmail').value.trim(),
      contact_email: document.getElementById('contactEmail').value.trim(),
      smtp_from_display: document.getElementById('smtpFromDisplay').value.trim(),
      company_name: document.getElementById('companyName').value.trim(),
      company_phone: document.getElementById('companyPhone').value.trim(),
    };
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    showStatus(data.message, data.success);
  });

  document.getElementById('uploadLogoBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('logoFile');
    if (!input?.files?.length) {
      showStatus(_t('admin.cfg.select_logo', 'Chọn file logo trước'), false);
      return;
    }
    const fd = new FormData();
    fd.append('logo', input.files[0]);
    const res = await fetch('/api/admin/settings/logo', { method: 'POST', body: fd });
    const data = await res.json();
    showStatus(data.message, data.success);
    if (data.success && data.logo_src) {
      const preview = document.getElementById('logoPreview');
      preview.src = data.logo_src;
      preview.classList.remove('hidden');
    }
  });

  document.getElementById('addPackageBtn')?.addEventListener('click', async () => {
    const body = {
      name: document.getElementById('newPkgName').value.trim(),
      characters: parseInt(document.getElementById('newPkgChars').value, 10),
      price: parseInt(document.getElementById('newPkgPrice').value, 10) || 0,
      duration_days: parseInt(document.getElementById('newPkgDays').value, 10) || 30,
      is_active: true,
    };
    if (!body.name || !body.characters) {
      showStatus(_t('admin.cfg.enter_pkg_name_chars', 'Nhập tên gói và số ký tự'), false);
      return;
    }
    const res = await fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    showStatus(data.message, data.success);
    if (data.success) {
      document.getElementById('newPkgName').value = '';
      document.getElementById('newPkgChars').value = '';
      document.getElementById('newPkgPrice').value = '';
      loadPackages();
    }
  });

  window.addEventListener('vv:langChanged', () => {
    loadPackages();
    loadSettings();
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadPackages();
    switchTab('brand');
  });
})();
