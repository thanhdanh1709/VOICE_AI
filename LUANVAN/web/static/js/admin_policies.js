/**
 * Admin — Policy settings (4 legal pages + support sub-tabs)
 */
(function () {
  'use strict';

  let legalData = {};
  let supportData = {};
  let currentLegalPage = 'terms';
  let currentMainTab = 'legal';
  let currentSupportTab = 'contact';
  let _dirty = false;

  const LEGAL_QUILL_KEYS = ['terms', 'privacy', 'data_deletion', 'payment'];
  const GUIDE_LEGAL_PAGES = ['user_guide', 'installation_guide'];
  const LEGAL_TAB_KEYS = [...LEGAL_QUILL_KEYS, ...GUIDE_LEGAL_PAGES];
  const quillMap = new Map();
  const supportQuillMap = new Map();

  function _t(key, fallback, vars) {
    let s = fallback || key;
    if (window.VVi18n && window.VVi18n.t) {
      const tr = window.VVi18n.t(key);
      if (tr && tr !== key) s = tr;
    }
    if (vars && s) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  function setDirty(v) {
    _dirty = v;
    const badge = document.getElementById('apDirtyBadge');
    if (badge) badge.classList.toggle('hidden', !v);
  }

  function markDirty() {
    setDirty(true);
  }

  function showToast(message, ok) {
    const el = document.getElementById('apToast');
    if (!el) return;
    el.textContent = message;
    el.className = `als-toast als-toast--${ok ? 'success' : 'error'}`;
    el.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.add('hidden'), 4500);
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

  function initQuill(el, html, onChange) {
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
              this.quill.clipboard.dangerouslyPasteHTML(range.index, `<div class="highlight-box"><p>${hint}</p></div>`);
              markDirty();
            },
            'legal-warning': function () {
              const range = this.quill.getSelection(true);
              const hint = _t('admin.cfg.quill_warning_hint', '⚠️ Thêm nội dung cảnh báo quan trọng tại đây.');
              this.quill.clipboard.dangerouslyPasteHTML(range.index, `<div class="warning-box"><p>${hint}</p></div>`);
              markDirty();
            },
          },
        },
        clipboard: { matchVisual: false },
      },
    });

    if (html) q.clipboard.dangerouslyPasteHTML(0, html);
    if (onChange) q.on('text-change', onChange);
    return q;
  }

  function initSimpleQuill(el, html, onChange) {
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
    if (onChange) q.on('text-change', onChange);
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

  function escapeTextarea(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    const updatedEl = document.getElementById('legalPageUpdated');
    page.updated = updatedEl ? updatedEl.value.trim() : '';
    page.sections = [];
    document.querySelectorAll('#legalSectionsList .apol-section-card').forEach((card) => {
      const title = card.querySelector('.section-title')?.value.trim() || '';
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

    const quillMeta = document.getElementById('legalQuillMeta');
    const addRow = document.getElementById('legalAddSectionRow');
    const guideMode = isGuideLegalPage();

    if (guideMode) {
      if (quillMeta) quillMeta.style.display = 'none';
      if (addRow) addRow.style.display = 'none';
      if (!legalData.guide_markdown) legalData.guide_markdown = {};
      const md = legalData.guide_markdown[currentLegalPage] || '';
      const pageClass = currentLegalPage === 'user_guide'
        ? 'legal-page--user-guide'
        : 'legal-page--installation';
      container.innerHTML = `
        <div class="guide-md-editor-wrap">
          <p class="als-panel-head p" style="margin-bottom:1rem;color:#958ea0;font-size:0.8125rem;line-height:1.45">${_t('admin.cfg.guide_md_desc', 'Soạn Markdown (# tiêu đề, bảng, code). Dùng ## cho mỗi mục lớn trên trang công khai.')}</p>
          <div class="guide-md-split">
            <div class="als-field guide-md-field">
              <label for="guideMarkdownEditor">${_t('admin.cfg.guide_md_label', 'Markdown')}</label>
              <textarea id="guideMarkdownEditor" class="guide-md-source" rows="24">${escapeTextarea(md)}</textarea>
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
        ta.addEventListener('input', () => {
          updateGuideMarkdownPreview();
          markDirty();
        });
        updateGuideMarkdownPreview();
      }
      return;
    }

    if (quillMeta) quillMeta.style.display = '';
    if (addRow) addRow.style.display = '';

    const page = legalData[currentLegalPage] || { updated: '', sections: [] };
    const updatedEl = document.getElementById('legalPageUpdated');
    if (updatedEl) updatedEl.value = page.updated || '';

    let sections = page.sections || [];
    if (!sections.length) sections = [{ title: '', content: '' }];

    container.innerHTML = sections.map((sec, i) => {
      const editorId = `quill-${currentLegalPage}-${i}-${Date.now()}`;
      return `
        <div class="apol-section-card" data-editor-id="${editorId}">
          <div class="apol-section-card__head">
            <span class="apol-section-card__num">${_t('admin.cfg.section_num', 'Mục ' + (i + 1), { n: i + 1 })}</span>
            <div class="apol-section-card__title-wrap">
              <input type="text" class="section-title apol-inline-input" placeholder="${escapeAttr(_t('admin.cfg.section_title_ph', 'VD: Chấp thuận điều khoản'))}" value="${escapeAttr(sec.title || '')}">
            </div>
            <div class="apol-section-card__actions">
              <button type="button" class="apol-icon-btn rm-legal-section" title="${escapeAttr(_t('admin.cfg.section_delete', 'Xóa mục'))}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
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
        const q = initQuill(el, sec.content || '', markDirty);
        if (q) quillMap.set(editorId, q);
      }
    });

    container.querySelectorAll('.section-title').forEach((el) => {
      el.addEventListener('input', markDirty);
    });

    container.querySelectorAll('.rm-legal-section').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.apol-section-card');
        const cards = container.querySelectorAll('.apol-section-card');
        if (cards.length <= 1) {
          showToast(_t('admin.cfg.section_min_one', 'Cần ít nhất một mục nội dung'), false);
          return;
        }
        quillMap.delete(card.dataset.editorId);
        card.remove();
        markDirty();
        container.querySelectorAll('.apol-section-card__num').forEach((lbl, idx) => {
          lbl.textContent = _t('admin.cfg.section_num', 'Mục ' + (idx + 1), { n: idx + 1 });
        });
      });
    });
  }

  function switchMainTab(tabKey) {
    currentMainTab = tabKey === 'support' ? 'support' : 'legal';
    document.querySelectorAll('#apolMainTabs [data-apol-main]').forEach((btn) => {
      const active = btn.dataset.apolMain === currentMainTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const legalPanel = document.getElementById('apolPanelLegal');
    const supportPanel = document.getElementById('apolPanelSupport');
    if (legalPanel) {
      legalPanel.classList.toggle('is-active', currentMainTab === 'legal');
      legalPanel.hidden = currentMainTab !== 'legal';
    }
    if (supportPanel) {
      supportPanel.classList.toggle('is-active', currentMainTab === 'support');
      supportPanel.hidden = currentMainTab !== 'support';
      if (currentMainTab === 'support' && !supportData.contact_cards?.length) {
        loadSupport();
      }
    }
  }

  function switchSupportTab(tabKey) {
    const tab = tabKey === 'guides' || tabKey === 'faq' ? tabKey : 'contact';
    currentSupportTab = tab;
    document.querySelectorAll('#apolSupportTabs [data-support-tab]').forEach((btn) => {
      const active = btn.dataset.supportTab === tab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.apol-support-block').forEach((block) => {
      const show = block.dataset.supportBlock === tab;
      block.classList.toggle('is-active', show);
      block.hidden = !show;
    });
  }

  function syncSupportFromDom() {
    const guidesTitle = document.getElementById('supportGuidesTitle');
    const faqTitle = document.getElementById('supportFaqTitle');
    supportData.guides_title = guidesTitle ? guidesTitle.value.trim() : '';
    supportData.faq_title = faqTitle ? faqTitle.value.trim() : '';
    supportData.contact_cards = [];
    document.querySelectorAll('#supportCardsList .support-card-editor').forEach((card) => {
      supportData.contact_cards.push({
        icon: card.querySelector('.card-icon')?.value.trim() || '📧',
        title: card.querySelector('.card-title')?.value.trim() || '',
        desc: card.querySelector('.card-desc')?.value.trim() || '',
        link_text: card.querySelector('.card-link-text')?.value.trim() || '',
        action: card.querySelector('.card-action')?.value || 'mailto_support',
        mailto_subject: card.querySelector('.card-mailto-subject')?.value.trim() || '',
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
        title: guideEl.querySelector('.guide-title')?.value.trim() || '',
        steps,
      });
    });
    supportData.faqs = [];
    document.querySelectorAll('#supportFaqsList .support-faq-editor').forEach((faqEl) => {
      const editorId = faqEl.dataset.editorId;
      const q = supportQuillMap.get(editorId);
      supportData.faqs.push({
        question: faqEl.querySelector('.faq-question')?.value.trim() || '',
        answer_html: q ? q.root.innerHTML : '',
      });
    });
  }

  function bindSupportDirty(container) {
    if (!container) return;
    container.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
  }

  function renderSupportCards() {
    const container = document.getElementById('supportCardsList');
    if (!container) return;
    const cards = supportData.contact_cards || [];
    const list = cards.length
      ? cards
      : [{ icon: '📧', title: '', desc: '', link_text: '', action: 'mailto_support', mailto_subject: '' }];
    container.innerHTML = list.map((card, i) => `
      <div class="apol-section-card support-card-editor">
        <div class="apol-section-card__head">
          <span class="apol-section-card__num">${_t('admin.cfg.support_card_num', 'Thẻ ' + (i + 1), { n: i + 1 })}</span>
          <div class="apol-section-card__title-wrap">
            <input type="text" class="card-title apol-inline-input" placeholder="${escapeAttr(_t('admin.cfg.support_card_title', 'Tiêu đề'))}" value="${escapeAttr(card.title || '')}">
          </div>
          <div class="apol-section-card__actions">
            <button type="button" class="apol-icon-btn rm-support-card" title="${escapeAttr(_t('admin.cfg.section_delete', 'Xóa'))}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="apol-grid-2">
          <div class="als-field">
            <label>${_t('admin.cfg.support_card_icon', 'Icon (emoji)')}</label>
            <input type="text" class="card-icon" value="${escapeAttr(card.icon || '')}">
          </div>
          <div class="als-field">
            <label>${_t('admin.cfg.support_card_action', 'Hành động liên kết')}</label>
            <select class="card-action">
              <option value="mailto_support"${card.action === 'mailto_support' ? ' selected' : ''}>Email hỗ trợ</option>
              <option value="contact_page"${card.action === 'contact_page' ? ' selected' : ''}>Trang liên hệ</option>
              <option value="mailto_bug"${card.action === 'mailto_bug' ? ' selected' : ''}>Email báo lỗi</option>
              <option value="custom"${card.action === 'custom' ? ' selected' : ''}>Tùy chỉnh</option>
            </select>
          </div>
        </div>
        <div class="als-field">
          <label>${_t('admin.cfg.support_card_desc', 'Mô tả')}</label>
          <input type="text" class="card-desc" value="${escapeAttr(card.desc || '')}">
        </div>
        <div class="als-field">
          <label>${_t('admin.cfg.support_card_link', 'Text liên kết')}</label>
          <input type="text" class="card-link-text" placeholder="__SUPPORT_EMAIL__" value="${escapeAttr(card.link_text || '')}">
        </div>
        <div class="als-field">
          <label>${_t('admin.cfg.support_card_subject', 'Tiêu đề email (báo lỗi)')}</label>
          <input type="text" class="card-mailto-subject" value="${escapeAttr(card.mailto_subject || '')}">
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.rm-support-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (container.querySelectorAll('.support-card-editor').length <= 1) {
          showToast(_t('admin.cfg.support_card_min_one', 'Cần ít nhất một thẻ liên hệ'), false);
          return;
        }
        btn.closest('.support-card-editor').remove();
        markDirty();
      });
    });
    bindSupportDirty(container);
  }

  function renderSupportGuides() {
    const container = document.getElementById('supportGuidesList');
    if (!container) return;
    const guides = supportData.guides || [];
    const list = guides.length ? guides : [{ title: '', steps: [{ text: '' }] }];
    container.innerHTML = list.map((guide, gi) => {
      const steps = guide.steps && guide.steps.length ? guide.steps : [{ text: '' }];
      const stepsHtml = steps.map((step, si) => `
        <div class="als-field">
          <label>${_t('admin.cfg.support_step_num', 'Bước ' + (si + 1), { n: si + 1 })}</label>
          <textarea class="guide-step-input" rows="2" placeholder="${escapeAttr(_t('admin.cfg.support_step_ph', 'Mô tả bước'))}">${escapeTextarea(step.text || '')}</textarea>
        </div>
      `).join('');
      return `
        <div class="apol-section-card support-guide-editor">
          <div class="apol-section-card__head">
            <span class="apol-section-card__num">${_t('admin.cfg.support_guide_num', 'Hướng dẫn ' + (gi + 1), { n: gi + 1 })}</span>
            <div class="apol-section-card__title-wrap">
              <input type="text" class="guide-title apol-inline-input" placeholder="${escapeAttr(_t('admin.cfg.support_guide_title', 'Tiêu đề hướng dẫn'))}" value="${escapeAttr(guide.title || '')}">
            </div>
            <div class="apol-section-card__actions">
              <button type="button" class="apol-icon-btn rm-support-guide" title="${escapeAttr(_t('admin.cfg.section_delete', 'Xóa'))}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          ${stepsHtml}
          <button type="button" class="als-btn als-btn--ghost add-guide-step" style="margin-top:0.35rem">
            <span class="material-symbols-outlined">add</span>
            <span>${_t('admin.cfg.add_guide_step', 'Thêm bước')}</span>
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.rm-support-guide').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.support-guide-editor').remove();
        markDirty();
      });
    });
    container.querySelectorAll('.add-guide-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const guideEl = btn.closest('.support-guide-editor');
        const wrap = document.createElement('div');
        wrap.className = 'als-field';
        wrap.innerHTML = `<label>${_t('admin.cfg.support_step_num', 'Bước')}</label><textarea class="guide-step-input" rows="2"></textarea>`;
        guideEl.insertBefore(wrap, btn);
        wrap.querySelector('textarea').addEventListener('input', markDirty);
        markDirty();
      });
    });
    bindSupportDirty(container);
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
        <div class="apol-section-card support-faq-editor" data-editor-id="${editorId}">
          <div class="apol-section-card__head">
            <span class="apol-section-card__num">${_t('admin.cfg.support_faq_num', 'FAQ ' + (i + 1), { n: i + 1 })}</span>
            <div class="apol-section-card__title-wrap">
              <input type="text" class="faq-question apol-inline-input" placeholder="${escapeAttr(_t('admin.cfg.support_faq_q', 'Câu hỏi'))}" value="${escapeAttr(faq.question || '')}">
            </div>
            <div class="apol-section-card__actions">
              <button type="button" class="apol-icon-btn rm-support-faq" title="${escapeAttr(_t('admin.cfg.section_delete', 'Xóa'))}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <div class="quill-wrap"><div id="${editorId}"></div></div>
        </div>
      `;
    }).join('');

    list.forEach((faq, i) => {
      const card = container.children[i];
      const editorId = card.dataset.editorId;
      const el = document.getElementById(editorId);
      if (el) {
        const q = initSimpleQuill(el, faq.answer_html || '', markDirty);
        if (q) supportQuillMap.set(editorId, q);
      }
    });

    container.querySelectorAll('.faq-question').forEach((el) => {
      el.addEventListener('input', markDirty);
    });
    container.querySelectorAll('.rm-support-faq').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.support-faq-editor');
        supportQuillMap.delete(card.dataset.editorId);
        card.remove();
        markDirty();
      });
    });
  }

  function renderSupportEditor() {
    const guidesTitle = document.getElementById('supportGuidesTitle');
    const faqTitle = document.getElementById('supportFaqTitle');
    if (guidesTitle) guidesTitle.value = supportData.guides_title || '';
    if (faqTitle) faqTitle.value = supportData.faq_title || '';
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
    if (!LEGAL_TAB_KEYS.includes(pageKey)) return;
    syncCurrentLegalPageFromDom();
    currentLegalPage = pageKey;
    document.querySelectorAll('#legalPageTabs [data-legal-page]').forEach((btn) => {
      const active = btn.dataset.legalPage === pageKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderLegalSections();
  }

  async function loadLegal() {
    const res = await fetch('/api/admin/legal');
    const data = await res.json();
    if (!data.success) return;
    legalData = data.legal || {};
    if (data.guide_markdown) legalData.guide_markdown = data.guide_markdown;
    LEGAL_QUILL_KEYS.forEach((key) => {
      if (!legalData[key]) legalData[key] = { updated: '', sections: [] };
      if (!legalData[key].sections) legalData[key].sections = [];
    });
    renderLegalSections();
    setDirty(false);
  }

  async function saveLegal() {
    syncAllLegalPagesFromDom();
    const payload = {};
    LEGAL_QUILL_KEYS.forEach((key) => {
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
    showToast(data.message || _t('err.save_failed', 'Lỗi lưu'), data.success);
    if (data.success) {
      setDirty(false);
      loadLegal();
    }
  }

  async function saveSupport() {
    syncSupportFromDom();
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supportData),
    });
    const data = await res.json();
    showToast(data.message || _t('err.save_failed', 'Lỗi lưu'), data.success);
    if (data.success) {
      setDirty(false);
      loadSupport();
    }
  }

  async function saveCurrent() {
    const btn = document.getElementById('apSaveBtn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;animation:spin 0.8s linear infinite">progress_activity</span> ${_t('admin.settings.saving', 'Đang lưu...')}`;
    }
    try {
      if (currentMainTab === 'legal') await saveLegal();
      else await saveSupport();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  function bindActions() {
    document.querySelectorAll('#apolMainTabs [data-apol-main]').forEach((btn) => {
      btn.addEventListener('click', () => switchMainTab(btn.dataset.apolMain));
    });

    document.querySelectorAll('#apolSupportTabs [data-support-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchSupportTab(btn.dataset.supportTab));
    });

    document.querySelectorAll('#legalPageTabs [data-legal-page]').forEach((btn) => {
      btn.addEventListener('click', () => switchLegalPage(btn.dataset.legalPage));
    });

    document.getElementById('legalPageUpdated')?.addEventListener('input', markDirty);
    document.getElementById('supportGuidesTitle')?.addEventListener('input', markDirty);
    document.getElementById('supportFaqTitle')?.addEventListener('input', markDirty);

    document.getElementById('addLegalSectionBtn')?.addEventListener('click', () => {
      syncCurrentLegalPageFromDom();
      legalData[currentLegalPage].sections.push({ title: '', content: '' });
      renderLegalSections();
      markDirty();
      const list = document.getElementById('legalSectionsList');
      if (list?.lastElementChild) {
        list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    document.getElementById('addSupportCardBtn')?.addEventListener('click', () => {
      syncSupportFromDom();
      supportData.contact_cards.push({
        icon: '📧', title: '', desc: '', link_text: '', action: 'mailto_support', mailto_subject: '',
      });
      renderSupportCards();
      markDirty();
    });

    document.getElementById('addSupportGuideBtn')?.addEventListener('click', () => {
      syncSupportFromDom();
      supportData.guides.push({ title: '', steps: [{ text: '' }] });
      renderSupportGuides();
      markDirty();
    });

    document.getElementById('addSupportFaqBtn')?.addEventListener('click', () => {
      syncSupportFromDom();
      supportData.faqs.push({ question: '', answer_html: '' });
      renderSupportFaqs();
      markDirty();
    });

    document.getElementById('apSaveBtn')?.addEventListener('click', saveCurrent);

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveCurrent();
      }
    });
  }

  window.addEventListener('vv:langChanged', () => {
    renderLegalSections();
    if (currentMainTab === 'support') renderSupportEditor();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindActions();
    switchSupportTab('contact');
    if (window.VVi18n && window.VVi18n.whenReady) {
      await window.VVi18n.whenReady;
    }
    loadLegal();
    loadSupport();
  });
})();
