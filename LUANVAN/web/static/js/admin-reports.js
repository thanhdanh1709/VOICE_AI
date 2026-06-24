/**
 * Admin report export modal
 */
(function () {
    const TYPE_FORMATS = {
        overview: ['pdf', 'docx'],
        users: ['csv'],
        conversions: ['csv'],
        payments: ['csv'],
    };

    let _reportPeriod = 'week';

    function t(key, fallback, vars) {
        if (typeof window._t === 'function') return window._t(key, fallback, vars);
        return fallback || key;
    }

    function getSelectedReportType() {
        const checked = document.querySelector('input[name="reportType"]:checked');
        return checked ? checked.value : 'overview';
    }

    function getSelectedFormat() {
        const active = document.querySelector('#adminReportFormatGrid .ac-report-format-chip.is-active:not(:disabled)');
        return active ? active.dataset.reportFormat : 'pdf';
    }

    function getPaymentStatusFilter() {
        const chip = document.querySelector('#paymentFilterChips .ac-filter-chip.is-active');
        const st = chip ? chip.dataset.payFilter : 'all';
        return st === 'all' ? '' : st;
    }

    function getConvStatusFilter() {
        const chip = document.querySelector('#convStatusChips .ac-filter-chip.is-active');
        const st = chip ? chip.dataset.convStatus : 'all';
        return st === 'all' ? '' : st;
    }

    function applyContextDefaults() {
        const view = window.AdminShell?.getCurrentView?.() || 'dashboard';
        let type = 'overview';
        let period = typeof window._dashPeriod !== 'undefined' ? window._dashPeriod : 'week';
        let from = '';
        let to = '';

        if (view === 'payments') {
            type = 'payments';
            from = document.getElementById('paymentsDateFrom')?.value || '';
            to = document.getElementById('paymentsDateTo')?.value || '';
            period = from || to ? 'custom' : period;
        } else if (view === 'conversions') {
            type = 'conversions';
            from = document.getElementById('convDateFrom')?.value || '';
            to = document.getElementById('convDateTo')?.value || '';
            period = from || to ? 'custom' : period;
        } else if (view === 'users') {
            type = 'users';
        }

        const radio = document.querySelector(`input[name="reportType"][value="${type}"]`);
        if (radio) radio.checked = true;

        _reportPeriod = period;
        document.querySelectorAll('#adminReportPeriodChips .ac-report-period-chip').forEach((chip) => {
            chip.classList.toggle('is-active', chip.dataset.reportPeriod === period);
        });

        const customEl = document.getElementById('adminReportCustomDates');
        const periodField = document.getElementById('adminReportPeriodField');
        if (type === 'users') {
            periodField?.classList.add('hidden');
        } else {
            periodField?.classList.remove('hidden');
        }

        if (period === 'custom') {
            customEl?.classList.remove('hidden');
            const fromInput = document.getElementById('adminReportDateFrom');
            const toInput = document.getElementById('adminReportDateTo');
            if (fromInput && from) fromInput.value = from;
            if (toInput && to) toInput.value = to;
        } else {
            customEl?.classList.add('hidden');
        }

        syncFormatChips();
    }

    function syncFormatChips() {
        const type = getSelectedReportType();
        const allowed = TYPE_FORMATS[type] || ['pdf'];
        const current = getSelectedFormat();
        let firstAllowed = allowed[0];

        document.querySelectorAll('#adminReportFormatGrid .ac-report-format-chip').forEach((chip) => {
            const fmt = chip.dataset.reportFormat;
            const ok = allowed.includes(fmt);
            chip.disabled = !ok;
            chip.classList.toggle('is-active', ok && fmt === (allowed.includes(current) ? current : firstAllowed));
        });

        const hint = document.getElementById('adminReportFormatHint');
        if (hint) {
            if (type === 'overview') {
                hint.textContent = t('admin.report.hint.overview', 'PDF/Word: báo cáo trình bày đẹp với KPI và bảng xếp hạng.');
            } else {
                hint.textContent = t('admin.report.hint.csv', 'CSV UTF-8: dữ liệu thô, tối đa 5.000 dòng. Mở bằng Excel hoặc Google Sheets.');
            }
        }
    }

    function openAdminReportModal() {
        const modal = document.getElementById('adminReportModal');
        if (!modal) return;
        applyContextDefaults();
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeAdminReportModal() {
        const modal = document.getElementById('adminReportModal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function parseFilename(contentDisposition, fallback) {
        if (!contentDisposition) return fallback;
        const m = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (m && m[1]) return m[1].replace(/['"]/g, '');
        return fallback;
    }

    async function downloadAdminReport() {
        const btn = document.getElementById('adminReportDownloadBtn');
        const type = getSelectedReportType();
        const format = getSelectedFormat();
        const period = _reportPeriod;
        const from = document.getElementById('adminReportDateFrom')?.value || '';
        const to = document.getElementById('adminReportDateTo')?.value || '';

        const params = new URLSearchParams({
            type,
            format,
            period,
        });
        if (period === 'custom' && from) {
            params.set('from', from);
            if (to) params.set('to', to);
        }
        if (type === 'payments') {
            const st = getPaymentStatusFilter();
            if (st) params.set('status', st);
        }
        if (type === 'conversions') {
            const st = getConvStatusFilter();
            if (st) params.set('status', st);
        }

        const label = btn?.querySelector('span:last-child');
        const origLabel = label?.textContent;
        if (btn) {
            btn.disabled = true;
            if (label) label.textContent = t('admin.report.downloading', 'Đang tạo...');
        }

        try {
            const res = await fetch(`/api/admin/reports/export?${params.toString()}`);
            if (!res.ok) {
                let msg = t('err.load_failed', 'Lỗi tải báo cáo');
                try {
                    const err = await res.json();
                    if (err.message) msg = err.message;
                } catch (_) { /* not json */ }
                alert(msg);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = parseFilename(
                res.headers.get('Content-Disposition'),
                `vietvoice-report-${type}.${format === 'docx' ? 'docx' : format}`,
            );
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            closeAdminReportModal();
        } catch (e) {
            console.error(e);
            alert(t('err.load_failed', 'Lỗi tải báo cáo'));
        } finally {
            if (btn) {
                btn.disabled = false;
                if (label && origLabel) label.textContent = origLabel;
            }
        }
    }

    function init() {
        const openBtn = document.getElementById('adminExportReportBtn');
        if (!openBtn) return;

        openBtn.addEventListener('click', openAdminReportModal);
        document.getElementById('adminReportModalClose')?.addEventListener('click', closeAdminReportModal);
        document.getElementById('adminReportModalBackdrop')?.addEventListener('click', closeAdminReportModal);
        document.getElementById('adminReportCancelBtn')?.addEventListener('click', closeAdminReportModal);
        document.getElementById('adminReportDownloadBtn')?.addEventListener('click', downloadAdminReport);

        document.querySelectorAll('input[name="reportType"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                const type = getSelectedReportType();
                const periodField = document.getElementById('adminReportPeriodField');
                if (type === 'users') {
                    periodField?.classList.add('hidden');
                } else {
                    periodField?.classList.remove('hidden');
                }
                syncFormatChips();
            });
        });

        document.querySelectorAll('#adminReportPeriodChips .ac-report-period-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                _reportPeriod = chip.dataset.reportPeriod || 'week';
                document.querySelectorAll('#adminReportPeriodChips .ac-report-period-chip').forEach((c) => {
                    c.classList.toggle('is-active', c === chip);
                });
                const customEl = document.getElementById('adminReportCustomDates');
                if (_reportPeriod === 'custom') {
                    customEl?.classList.remove('hidden');
                } else {
                    customEl?.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('#adminReportFormatGrid .ac-report-format-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                if (chip.disabled) return;
                document.querySelectorAll('#adminReportFormatGrid .ac-report-format-chip').forEach((c) => {
                    c.classList.remove('is-active');
                });
                chip.classList.add('is-active');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('adminReportModal')?.classList.contains('hidden')) {
                closeAdminReportModal();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.openAdminReportModal = openAdminReportModal;
})();
