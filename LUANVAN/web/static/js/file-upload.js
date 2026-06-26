/**
 * File upload — tích hợp vào từng tab chuyển đổi (Nhập văn bản / Emotional / OmniVoice)
 */
(function () {
    'use strict';

    const MAX_BYTES = 10 * 1024 * 1024;
    const ALLOWED = ['txt', 'pdf', 'docx'];

    let progressTimer = null;

    function t(key, fallback) {
        if (window.VVi18n && window.VVi18n.t) {
            const s = window.VVi18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback || key;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function getExt(name) {
        const parts = (name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function fileTypeIcon(ext) {
        if (ext === 'pdf') return 'picture_as_pdf';
        if (ext === 'docx') return 'article';
        return 'description';
    }

    function fileTypeLabel(ext) {
        return ext ? ext.toUpperCase() : 'FILE';
    }

    function $(id) {
        return document.getElementById(id);
    }

    function show(el) {
        if (el) el.classList.remove('hidden');
    }

    function hide(el) {
        if (el) el.classList.add('hidden');
    }

    function setProgress(pct) {
        const fill = $('fuProgressFill');
        const pctEl = $('fuProgressPct');
        const rounded = Math.min(100, Math.max(0, Math.round(pct)));
        if (fill) fill.style.width = rounded + '%';
        if (pctEl) pctEl.textContent = rounded + '%';
    }

    function startFakeProgress() {
        stopFakeProgress();
        setProgress(8);
        let v = 8;
        progressTimer = setInterval(() => {
            if (v >= 88) return;
            v += Math.max(1, (88 - v) * 0.08);
            setProgress(v);
        }, 120);
    }

    function stopFakeProgress() {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    }

    function finishProgress() {
        stopFakeProgress();
        setProgress(100);
    }

    function dispatchInput(el) {
        if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function syncWorkspaceText(text) {
        const value = text || '';
        const textInput = $('textInput');
        const emotionalInput = $('emotionalTextInput');
        const omnivoiceInput = $('omnivoiceTextInput');

        if (textInput) {
            textInput.value = value;
            dispatchInput(textInput);
        }
        if (emotionalInput) {
            emotionalInput.value = value;
            dispatchInput(emotionalInput);
        }
        if (omnivoiceInput) {
            omnivoiceInput.value = value;
            dispatchInput(omnivoiceInput);
        }

        if (typeof window.updateVietnameseInputWarning === 'function') {
            window.updateVietnameseInputWarning(value);
        }
    }

    function setStripVisible(visible) {
        const strip = $('fuStatusStrip');
        if (!strip) return;
        if (visible) show(strip);
        else hide(strip);
    }

    function showProcessingUI(file) {
        setStripVisible(true);
        const ext = getExt(file.name);
        $('fuFileName').textContent = file.name;
        $('fuFileMeta').textContent = `${fileTypeLabel(ext)} · ${formatSize(file.size)}`;
        const iconEl = $('fuFileIcon');
        if (iconEl) {
            iconEl.innerHTML = `<span class="material-symbols-outlined">${fileTypeIcon(ext)}</span>`;
        }

        hide($('fuStatusReady'));
        hide($('fuStatusError'));
        show($('fuProgress'));
        startFakeProgress();
    }

    function showReadyUI(file, charCount) {
        finishProgress();
        hide($('fuProgress'));

        const ext = getExt(file.name);
        const meta = `${fileTypeLabel(ext)} · ${formatSize(file.size)} · ${charCount.toLocaleString()} ${t('ws.chars', 'ký tự')}`;
        $('fuFileMeta').textContent = meta;

        const readyText = $('fuStatusReadyText');
        if (readyText) {
            readyText.textContent = t('file.success.extracted', 'Đã trích xuất văn bản');
        }
        show($('fuStatusReady'));
        hide($('fuStatusError'));
    }

    function showErrorUI(message) {
        stopFakeProgress();
        hide($('fuProgress'));
        hide($('fuStatusReady'));

        const errText = $('fuStatusErrorText');
        if (errText) errText.textContent = message;
        show($('fuStatusError'));
    }

    function resetFileInput() {
        const input = $('fileInput');
        if (input) input.value = '';
    }

    function clearUpload() {
        stopFakeProgress();
        resetFileInput();
        syncWorkspaceText('');
        setStripVisible(false);
        hide($('fuProgress'));
        hide($('fuStatusReady'));
        hide($('fuStatusError'));
    }

    function validateFile(file) {
        const ext = getExt(file.name);
        if (!ALLOWED.includes(ext)) {
            return t('file.error.format', 'Định dạng file không được hỗ trợ. Chỉ TXT, PDF, DOCX.');
        }
        if (file.size > MAX_BYTES) {
            return t('file.error.size', 'File quá lớn. Tối đa 10MB.');
        }
        return null;
    }

    async function processFile(file) {
        const err = validateFile(file);
        setStripVisible(true);
        $('fuFileName').textContent = file.name;
        $('fuFileMeta').textContent = formatSize(file.size);

        if (err) {
            showErrorUI(err);
            return;
        }

        showProcessingUI(file);

        const ext = getExt(file.name);

        try {
            let text = '';
            if (ext === 'txt') {
                text = await readTxt(file);
            } else if (ext === 'pdf' || ext === 'docx') {
                text = await extractViaApi(file);
            }
            if (!text.trim()) {
                showErrorUI(t('file.error.empty', 'Không tìm thấy văn bản trong file.'));
                return;
            }
            syncWorkspaceText(text);
            showReadyUI(file, text.length);
        } catch (e) {
            console.error('[FileUpload]', e);
            showErrorUI(e.message || t('err.convert_failed', 'Lỗi xử lý file'));
        }
    }

    function readTxt(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result || '');
            reader.onerror = () => reject(new Error(t('file.error.read', 'Lỗi đọc file')));
            reader.readAsText(file, 'UTF-8');
        });
    }

    function extractViaApi(file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);

            xhr.open('POST', '/api/upload/extract');
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const uploadPct = (e.loaded / e.total) * 40;
                    setProgress(Math.max(8, uploadPct));
                }
            });

            xhr.addEventListener('load', () => {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                        finishProgress();
                        resolve(data.text || '');
                    } else {
                        reject(new Error(data.message || t('err.convert_failed', 'Lỗi xử lý file')));
                    }
                } catch (parseErr) {
                    reject(new Error(t('err.convert_failed', 'Lỗi xử lý file')));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error(t('err.connection', 'Không thể kết nối đến server.')));
            });

            xhr.send(formData);
        });
    }

    function openFilePicker() {
        const input = $('fileInput');
        if (input) input.click();
    }

    function bindUploadTriggers() {
        document.querySelectorAll('[data-fu-trigger]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openFilePicker();
            });
        });

        const input = $('fileInput');
        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
            });
        }
    }

    function bindDropTargets() {
        document.querySelectorAll('.ws-text-drop-target').forEach((zone) => {
            zone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                zone.classList.add('is-dragover');
            });
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('is-dragover');
            });
            ['dragleave', 'dragend'].forEach((evt) => {
                zone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    zone.classList.remove('is-dragover');
                });
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('is-dragover');
                const file = e.dataTransfer?.files?.[0];
                if (file) processFile(file);
            });
        });
    }

    function bindActions() {
        const removeBtn = $('fuRemoveBtn');
        const changeBtn = $('fuChangeBtn');

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearUpload();
            });
        }

        if (changeBtn) {
            changeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openFilePicker();
            });
        }
    }

    function init() {
        bindUploadTriggers();
        bindDropTargets();
        bindActions();
        setStripVisible(false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.FileUpload = { clear: clearUpload, syncText: syncWorkspaceText };
})();
