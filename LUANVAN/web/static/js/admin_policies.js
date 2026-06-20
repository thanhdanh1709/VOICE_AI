/**
 * Admin — Policy settings (legal_content.json + support_content.json)
 */
(function () {
  'use strict';

  const statusEl = document.getElementById('apStatus');
  let legalData = {};
  let supportData = {};
  let currentLegalPage = 'terms';
  const LEGAL_PAGE_KEYS = ['terms', 'privacy', 'data_deletion', 'payment', 'user_guide', 'installation_guide'];
  const GUIDE_LEGAL_PAGES = ['user_guide', 'installation_guide'];
  const quillMap = new Map();
  const supportQuillMap = new Map();

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

  function destroyQuillEditors() {
    quillMap.clear();
  }

  function registerLegalQuillFormats() {
    if (!window.Quill || window.__legalQuillFormatsRegistered) return;
    window.__legalQuillFormatsRegistered = true;

    const Block = Quill.import('blots/block');

    class HighlightBoxBlot extends Block {
      static create() {
        const node = super.create();
        node.classList.add('highlight-box');
        const p = document.createElement('p');
        p.textContent = _t('admin.cfg.quill_highlight_hint', 'ℹ️ Thêm nội dung ghi chú hoặc lưu ý tại đây.');
        node.appendChild(p);
        return node;
      }
      static match(node) {
        return node.tagName === 'DIV' && node.classList.contains('highlight-box');
      }
    }
    HighlightBoxBlot.blotName = 'legalHighlightBox';
    HighlightBoxBlot.tagName = 'DIV';

    class WarningBoxBlot extends Block {
      static create() {
        const node = super.create();
        node.classList.add('warning-box');
        const p = document.createElement('p');
        p.textContent = _t('admin.cfg.quill_warning_hint', '⚠️ Thêm nội dung cảnh báo quan trọng tại đây.');
        node.appendChild(p);
        return node;
      }
      static match(node) {
        return node.tagName === 'DIV' && node.classList.contains('warning-box');
      }
    }
    WarningBoxBlot.blotName = 'legalWarningBox';
    WarningBoxBlot.tagName = 'DIV';

    Quill.register(HighlightBoxBlot);
    Quill.register(WarningBoxBlot);

    const icons = Quill.import('ui/icons');
    icons['legal-highlight'] = 'ℹ️';
    icons['legal-warning'] = '⚠️';
  }

  function initQuill(el, html) {
    if (!window.Quill) return null;
    registerLegalQuillFormats();

    const q = new Quill(el, {
      theme: 'snow',
      placeholder: _t('admin.cfg.quill_placeholder', 'Nhập nội dung mục này...'),
      modules: {
        toolbar: {
          container: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['legal-highlight', 'legal-warning'],
            ['clean'],
          ],
          handlers: {
            'legal-highlight': function () {
              const range = this.quill.getSelection(true);
              const hint = _t('admin.cfg.quill_highlight_hint', 'ℹ️ Thêm nội dung ghi chú hoặc lưu ý tại đây.');
              const htmlBox = `<div class="highlight-box"><p>${hint}</p></div>`;
              this.quill.clipboard.dangerouslyPasteHTML(range.index, htmlBox);
            },
            'legal-warning': function () {
              const range = this.quill.getSelection(true);
              const hint = _t('admin.cfg.quill_warning_hint', '⚠️ Thêm nội dung cảnh báo quan trọng tại đây.');
              const htmlBox = `<div class="warning-box"><p>${hint}</p></div>`;
              this.quill.clipboard.dangerouslyPasteHTML(range.index, htmlBox);
            },
          },
        },
        clipboard: { matchVisual: false },
      },
    });

    if (html) {
      q.clipboard.dangerouslyPasteHTML(0, html);
    }
    return q;
  }

  function sectionHasContent(sec) {
    const title = (sec.title || '').trim();
    const html = sec.content || '';
    const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    return title || text;
  }

  function pruneEmptySections(page) {
    page.sections = (page.sections || []).filter(sectionHasContent);
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function isGuideLegalPage(pageKey) {
    return GUIDE_LEGAL_PAGES.includes(pageKey || currentLegalPage);
  }

  function syncCurrentLegalPageFromDom() {
    if (isGuideLegalPage()) {
      if (!legalData.guide_markdown) legalData.guide_markdown = {};
      const ta = document.getElementById('guideMarkdownEditor');
      if (ta) legalData.guide_markdown[currentLegalPage] = ta.value;
      return;
    }
    const page = legalData[currentLegalPage] || { updated: '', sections: [] };
    page.updated = document.getElementById('legalPageUpdated').value.trim();
    const cards = document.querySelectorAll('#legalSectionsList .legal-section-card');
    page.sections = [];
    cards.forEach((card) => {
      const title = card.querySelector('.section-title').value.trim();
      const editorId = card.dataset.editorId;
      const q = quillMap.get(editorId);
      page.sections.push({ title, content: q ? q.root.innerHTML : '' });
    });
    legalData[currentLegalPage] = page;
  }

  function syncAllLegalPagesFromDom() {
    const activePage = currentLegalPage;
    syncCurrentLegalPageFromDom();
    currentLegalPage = activePage;
  }

  function normalizeGuidePreviewHtml(html) {
    if (!html) return '';
    return String(html)
      .replace(/<table>/g, '<table class="legal-md-table">')
      .replace(/<pre>/g, '<pre class="legal-md-pre">')
      .replace(/<blockquote>/g, '<blockquote class="legal-md-quote">');
  }

  function updateGuideMarkdownPreview() {
    const ta = document.getElementById('guideMarkdownEditor');
    const preview = document.getElementById('guideMarkdownPreview');
    if (!ta || !preview || !window.marked) return;
    const html = normalizeGuidePreviewHtml(
      window.marked.parse(ta.value || '', { gfm: true, breaks: true })
    );
    preview.innerHTML = html;
  }

  function renderLegalSections() {
    destroyQuillEditors();
    const container = document.getElementById('legalSectionsList');
    if (!container) return;

    const updatedWrap = document.getElementById('legalPageUpdated')?.closest('.as-field');
    const addBtn = document.getElementById('addLegalSectionBtn');
    const guideMode = isGuideLegalPage();

    if (guideMode) {
      if (updatedWrap) updatedWrap.style.display = 'none';
      if (addBtn) addBtn.style.display = 'none';
      if (!legalData.guide_markdown) legalData.guide_markdown = {};
      const md = legalData.guide_markdown[currentLegalPage] || '';
      const pageClass = currentLegalPage === 'user_guide'
        ? 'legal-page--user-guide'
        : 'legal-page--installation';
      container.innerHTML = `
        <div class="guide-md-editor-wrap">
          <p class="ac-desc" style="margin-bottom:1rem">${_t('admin.cfg.guide_md_desc', 'Soạn nội dung bằng Markdown (# tiêu đề, bảng, code). Dùng ## cho mỗi mục lớn trên trang công khai.')}</p>
          <div class="guide-md-split">
            <div class="as-field guide-md-field">
              <label for="guideMarkdownEditor">${_t('admin.cfg.guide_md_label', 'Markdown')}</label>
              <textarea id="guideMarkdownEditor" class="as-input guide-md-source" rows="24">${escapeTextarea(md)}</textarea>
            </div>
            <div class="legal-html-preview-wrap guide-md-preview-wrap">
              <div class="legal-html-preview-label">${_t('admin.cfg.guide_preview', 'Xem trước')}</div>
              <div id="guideMarkdownPreview" class="legal-html-preview legal-section-body legal-page ${pageClass}"></div>
            </div>
          </div>
        </div>
      `;
      const ta = document.getElementById('guideMarkdownEditor');
      if (ta) {
        ta.addEventListener('input', updateGuideMarkdownPreview);
        updateGuideMarkdownPreview();
      }
      return;
    }

    if (updatedWrap) updatedWrap.style.display = '';
    if (addBtn) addBtn.style.display = '';

    const page = legalData[currentLegalPage] || { updated: '', sections: [] };
    document.getElementById('legalPageUpdated').value = page.updated || '';

    let sections = page.sections || [];
    if (!sections.length) sections = [{ title: '', content: '' }];

    container.innerHTML = sections.map((sec, i) => {
      const editorId = `quill-${currentLegalPage}-${i}-${Date.now()}`;
      return `
        <div class="legal-section-card" data-editor-id="${editorId}">
          <div class="section-head">
            <span class="section-num-label">${_t('admin.cfg.section_num', 'Mục ' + (i + 1), { n: i + 1 })}</span>
            <button type="button" class="as-btn-sm danger rm-legal-section">${_t('admin.cfg.section_delete', 'Xóa mục')}</button>
          </div>
          <div class="as-field" style="margin-bottom:10px">
            <label>${_t('admin.cfg.section_title_label', 'Tiêu đề mục')}</label>
            <input type="text" class="as-input section-title" placeholder="${escapeAttr(_t('admin.cfg.section_title_ph', 'VD: Chấp thuận điều khoản'))}" value="${escapeAttr(sec.title || '')}">
          </div>
          <div class="quill-wrap"><div id="${editorId}"></div></div>
        </div>
      `;
    }).join('');

    sections.forEach((sec, i) => {
      const card = container.children[i];
      const editorId = card.dataset.editorId;
      const el = document.getElementById(editorId);
      if (el) {
        const q = initQuill(el, sec.content || '');
        if (q) quillMap.set(editorId, q);
      }
    });

    container.querySelectorAll('.rm-legal-section').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.legal-section-card');
        const cards = container.querySelectorAll('.legal-section-card');
        if (cards.length <= 1) {
          showStatus(_t('admin.cfg.section_min_one', 'Cần ít nhất một mục nội dung'), false);
          return;
        }
        quillMap.delete(card.dataset.editorId);
        card.remove();
        container.querySelectorAll('.section-num-label').forEach((lbl, idx) => {
          lbl.textContent = _t('admin.cfg.section_num', 'Mục ' + (idx + 1), { n: idx + 1 });
        });
      });
    });
  }

  function initSimpleQuill(el, html) {
    if (!window.Quill) return null;
    const q = new Quill(el, {
      theme: 'snow',
      placeholder: _t('admin.cfg.quill_placeholder', 'Nhập nội dung...'),
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
        clipboard: { matchVisual: false },
      },
    });
    if (html) q.clipboard.dangerouslyPasteHTML(0, html);
    return q;
  }

  function escapeTextarea(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function switchMainTab(tabKey) {
    document.querySelectorAll('#adminPoliciesMainTabs .legal-page-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mainTab === tabKey);
    });
    const legalPanel = document.getElementById('panel-legal');
    const supportPanel = document.getElementById('panel-support');
    const showLegal = tabKey === 'legal';
    const showSupport = tabKey === 'support';
    if (legalPanel) {
      legalPanel.classList.toggle('hidden', !showLegal);
      legalPanel.classList.toggle('ac-panel-hidden', !showLegal);
    }
    if (supportPanel) {
      supportPanel.classList.toggle('hidden', !showSupport);
      supportPanel.classList.toggle('ac-panel-hidden', !showSupport);
      if (showSupport) {
        if (!supportData.contact_cards?.length && !supportData.faqs?.length) {
          loadSupport();
        } else {
          renderSupportEditor();
        }
      }
    }
  }

  function syncSupportFromDom() {
    supportData.guides_title = document.getElementById('supportGuidesTitle')?.value.trim() || '';
    supportData.faq_title = document.getElementById('supportFaqTitle')?.value.trim() || '';
    supportData.contact_cards = [];
    document.querySelectorAll('#supportCardsList .support-card-editor').forEach((card) => {
      supportData.contact_cards.push({
        icon: card.querySelector('.card-icon').value.trim() || '📧',
        title: card.querySelector('.card-title').value.trim(),
        desc: card.querySelector('.card-desc').value.trim(),
        link_text: card.querySelector('.card-link-text').value.trim(),
        action: card.querySelector('.card-action').value,
        mailto_subject: card.querySelector('.card-mailto-subject').value.trim(),
      });
    });
    supportData.guides = [];
    document.querySelectorAll('#supportGuidesList .support-guide-editor').forEach((guideEl) => {
      const steps = [];
      guideEl.querySelectorAll('.guide-step-input').forEach((input) => {
        const text = input.value.trim();
        if (text) steps.push({ text });
      });
      supportData.guides.push({
        title: guideEl.querySelector('.guide-title').value.trim(),
        steps,
      });
    });
    supportData.faqs = [];
    document.querySelectorAll('#supportFaqsList .support-faq-editor').forEach((faqEl) => {
      const editorId = faqEl.dataset.editorId;
      const q = supportQuillMap.get(editorId);
      supportData.faqs.push({
        question: faqEl.querySelector('.faq-question').value.trim(),
        answer_html: q ? q.root.innerHTML : '',
      });
    });
  }

  function renderSupportCards() {
    const container = document.getElementById('supportCardsList');
    if (!container) return;
    const cards = supportData.contact_cards || [];
    const list = cards.length ? cards : [{ icon: '📧', title: '', desc: '', link_text: '', action: 'mailto_support', mailto_subject: '' }];
    container.innerHTML = list.map((card, i) => `
      <div class="legal-section-card support-card-editor" style="margin-bottom:12px">
        <div class="section-head">
          <span class="section-num-label">${_t('admin.cfg.support_card_num', 'Thẻ ' + (i + 1), { n: i + 1 })}</span>
          <button type="button" class="as-btn-sm danger rm-support-card">${_t('admin.cfg.section_delete', 'Xóa mục')}</button>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div class="as-field">
            <label>${_t('admin.cfg.support_card_icon', 'Icon (emoji)')}</label>
            <input type="text" class="as-input card-icon" value="${escapeAttr(card.icon || '')}">
          </div>
          <div class="as-field">
            <label>${_t('admin.cfg.support_card_action', 'Hành động liên kết')}</label>
            <select class="as-input card-action">
              <option value="mailto_support"${card.action === 'mailto_support' ? ' selected' : ''}>Email hỗ trợ</option>
              <option value="contact_page"${card.action === 'contact_page' ? ' selected' : ''}>Trang liên hệ</option>
              <option value="mailto_bug"${card.action === 'mailto_bug' ? ' selected' : ''}>Email báo lỗi</option>
              <option value="custom"${card.action === 'custom' ? ' selected' : ''}>Tùy chỉnh</option>
            </select>
          </div>
        </div>
        <div class="as-field"><label>${_t('admin.cfg.support_card_title', 'Tiêu đề')}</label>
          <input type="text" class="as-input card-title" value="${escapeAttr(card.title || '')}"></div>
        <div class="as-field"><label>${_t('admin.cfg.support_card_desc', 'Mô tả')}</label>
          <input type="text" class="as-input card-desc" value="${escapeAttr(card.desc || '')}"></div>
        <div class="as-field"><label>${_t('admin.cfg.support_card_link', 'Text liên kết')}</label>
          <input type="text" class="as-input card-link-text" placeholder="__SUPPORT_EMAIL__" value="${escapeAttr(card.link_text || '')}"></div>
        <div class="as-field"><label>${_t('admin.cfg.support_card_subject', 'Tiêu đề email (báo lỗi)')}</label>
          <input type="text" class="as-input card-mailto-subject" value="${escapeAttr(card.mailto_subject || '')}"></div>
      </div>
    `).join('');
    container.querySelectorAll('.rm-support-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cards = container.querySelectorAll('.support-card-editor');
        if (cards.length <= 1) {
          showStatus(_t('admin.cfg.support_card_min_one', 'Cần ít nhất một thẻ liên hệ'), false);
          return;
        }
        btn.closest('.support-card-editor').remove();
      });
    });
  }

  function renderSupportGuides() {
    const container = document.getElementById('supportGuidesList');
    if (!container) return;
    const guides = supportData.guides || [];
    const list = guides.length ? guides : [{ title: '', steps: [{ text: '' }] }];
    container.innerHTML = list.map((guide, gi) => {
      const steps = guide.steps && guide.steps.length ? guide.steps : [{ text: '' }];
      const stepsHtml = steps.map((step, si) => `
        <div class="as-field" style="margin-bottom:8px">
          <label>${_t('admin.cfg.support_step_num', 'Bước ' + (si + 1), { n: si + 1 })}</label>
          <textarea class="as-input guide-step-input" rows="2" placeholder="${escapeAttr(_t('admin.cfg.support_step_ph', 'Mô tả bước (HTML: &lt;strong&gt;...&lt;/strong&gt;)'))}">${escapeTextarea(step.text || '')}</textarea>
        </div>
      `).join('');
      return `
        <div class="legal-section-card support-guide-editor" style="margin-bottom:12px">
          <div class="section-head">
            <span class="section-num-label">${_t('admin.cfg.support_guide_num', 'Hướng dẫn ' + (gi + 1), { n: gi + 1 })}</span>
            <button type="button" class="as-btn-sm danger rm-support-guide">${_t('admin.cfg.section_delete', 'Xóa mục')}</button>
          </div>
          <div class="as-field"><label>${_t('admin.cfg.support_guide_title', 'Tiêu đề hướng dẫn')}</label>
            <input type="text" class="as-input guide-title" value="${escapeAttr(guide.title || '')}"></div>
          ${stepsHtml}
          <button type="button" class="as-btn-sm add-guide-step" style="margin-top:4px">${_t('admin.cfg.add_guide_step', '+ Thêm bước')}</button>
        </div>
      `;
    }).join('');
    container.querySelectorAll('.rm-support-guide').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.support-guide-editor').remove());
    });
    container.querySelectorAll('.add-guide-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const guideEl = btn.closest('.support-guide-editor');
        const wrap = document.createElement('div');
        wrap.className = 'as-field';
        wrap.style.marginBottom = '8px';
        wrap.innerHTML = `<label>${_t('admin.cfg.support_step_num', 'Bước')}</label><textarea class="as-input guide-step-input" rows="2"></textarea>`;
        guideEl.insertBefore(wrap, btn);
      });
    });
  }

  function destroySupportQuillEditors() {
    supportQuillMap.clear();
  }

  function renderSupportFaqs() {
    destroySupportQuillEditors();
    const container = document.getElementById('supportFaqsList');
    if (!container) return;
    const faqs = supportData.faqs || [];
    const list = faqs.length ? faqs : [{ question: '', answer_html: '' }];
    container.innerHTML = list.map((faq, i) => {
      const editorId = `support-faq-${i}-${Date.now()}`;
      return `
        <div class="legal-section-card support-faq-editor" data-editor-id="${editorId}" style="margin-bottom:12px">
          <div class="section-head">
            <span class="section-num-label">${_t('admin.cfg.support_faq_num', 'FAQ ' + (i + 1), { n: i + 1 })}</span>
            <button type="button" class="as-btn-sm danger rm-support-faq">${_t('admin.cfg.section_delete', 'Xóa mục')}</button>
          </div>
          <div class="as-field"><label>${_t('admin.cfg.support_faq_q', 'Câu hỏi')}</label>
            <input type="text" class="as-input faq-question" value="${escapeAttr(faq.question || '')}"></div>
          <div class="quill-wrap"><div id="${editorId}"></div></div>
        </div>
      `;
    }).join('');
    list.forEach((faq, i) => {
      const card = container.children[i];
      const editorId = card.dataset.editorId;
      const el = document.getElementById(editorId);
      if (el) {
        const q = initSimpleQuill(el, faq.answer_html || '');
        if (q) supportQuillMap.set(editorId, q);
      }
    });
    container.querySelectorAll('.rm-support-faq').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.support-faq-editor');
        supportQuillMap.delete(card.dataset.editorId);
        card.remove();
      });
    });
  }

  function renderSupportEditor() {
    document.getElementById('supportGuidesTitle').value = supportData.guides_title || '';
    document.getElementById('supportFaqTitle').value = supportData.faq_title || '';
    renderSupportCards();
    renderSupportGuides();
    renderSupportFaqs();
  }

  async function loadSupport() {
    const res = await fetch('/api/admin/support');
    const data = await res.json();
    if (!data.success) return;
    supportData = data.support || {};
    if (!supportData.contact_cards) supportData.contact_cards = [];
    if (!supportData.guides) supportData.guides = [];
    if (!supportData.faqs) supportData.faqs = [];
    renderSupportEditor();
  }

  function switchLegalPage(pageKey) {
    syncCurrentLegalPageFromDom();
    currentLegalPage = pageKey;
    document.querySelectorAll('[data-legal-page]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.legalPage === pageKey);
    });
    renderLegalSections();
  }

  async function loadLegal() {
    const res = await fetch('/api/admin/legal');
    const data = await res.json();
    if (!data.success) return;
    legalData = data.legal || {};
    if (data.guide_markdown) legalData.guide_markdown = data.guide_markdown;
    LEGAL_PAGE_KEYS.forEach((key) => {
      if (!legalData[key]) legalData[key] = { updated: '', sections: [], body_html: '' };
      if (!legalData[key].sections) legalData[key].sections = [];
    });
    renderLegalSections();
  }

  document.querySelectorAll('#adminPoliciesMainTabs .legal-page-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mainTab) switchMainTab(btn.dataset.mainTab);
    });
  });

  document.querySelectorAll('[data-legal-page]').forEach((btn) => {
    btn.addEventListener('click', () => switchLegalPage(btn.dataset.legalPage));
  });

  document.getElementById('addLegalSectionBtn')?.addEventListener('click', () => {
    syncCurrentLegalPageFromDom();
    legalData[currentLegalPage].sections.push({ title: '', content: '' });
    renderLegalSections();
    const list = document.getElementById('legalSectionsList');
    if (list?.lastElementChild) {
      list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  document.getElementById('saveLegalBtn')?.addEventListener('click', async () => {
    syncAllLegalPagesFromDom();
    const payload = {};
    LEGAL_PAGE_KEYS.forEach((key) => {
      if (GUIDE_LEGAL_PAGES.includes(key)) return;
      if (legalData[key]) {
        pruneEmptySections(legalData[key]);
        payload[key] = legalData[key];
      }
    });
    if (legalData.guide_markdown) payload.guide_markdown = legalData.guide_markdown;
    const res = await fetch('/api/admin/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    showStatus(data.message, data.success);
    if (data.success) loadLegal();
  });

  document.getElementById('addSupportCardBtn')?.addEventListener('click', () => {
    syncSupportFromDom();
    supportData.contact_cards.push({ icon: '📧', title: '', desc: '', link_text: '', action: 'mailto_support', mailto_subject: '' });
    renderSupportCards();
  });

  document.getElementById('addSupportGuideBtn')?.addEventListener('click', () => {
    syncSupportFromDom();
    supportData.guides.push({ title: '', steps: [{ text: '' }] });
    renderSupportGuides();
  });

  document.getElementById('addSupportFaqBtn')?.addEventListener('click', () => {
    syncSupportFromDom();
    supportData.faqs.push({ question: '', answer_html: '' });
    renderSupportFaqs();
  });

  document.getElementById('saveSupportBtn')?.addEventListener('click', async () => {
    syncSupportFromDom();
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supportData),
    });
    const data = await res.json();
    showStatus(data.message, data.success);
    if (data.success) loadSupport();
  });

  window.addEventListener('vv:langChanged', () => {
    renderLegalSections();
    if (document.getElementById('panel-support') && !document.getElementById('panel-support').classList.contains('hidden')) {
      renderSupportEditor();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadLegal();
    loadSupport();
  });
})();
