/**
 * Pagination helper — dùng chung cho bảng có phân trang
 */
(function () {
  const callbacks = {};

  function activeBtnStyle(isActive) {
    return isActive
      ? 'background:rgba(160,120,255,0.2);border-color:rgba(208,188,255,0.45);color:#d0bcff'
      : '';
  }

  window.VVPagination = {
    register(id, fn) {
      callbacks[id] = fn;
    },

    go(id, page) {
      if (callbacks[id]) callbacks[id](page);
    },

    render(opts) {
      const {
        id,
        containerId,
        infoId,
        page = 1,
        total = 0,
        perPage = 10,
        itemLabel = 'giao dịch',
      } = opts;

      const container = document.getElementById(containerId);
      const infoEl = infoId ? document.getElementById(infoId) : null;
      if (!container) return;

      const totalPages = total > 0 ? Math.ceil(total / perPage) : 1;

      if (infoEl) {
        if (total > 0) {
          const start = (page - 1) * perPage + 1;
          const end = Math.min(page * perPage, total);
          infoEl.textContent = `Hiển thị ${start}–${end} của ${total} ${itemLabel}`;
        } else {
          infoEl.textContent = '';
        }
      }

      if (totalPages <= 1) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
      }

      container.style.display = 'flex';
      let html = '';

      html += `<button type="button" onclick="VVPagination.go('${id}', ${page - 1})" ${page === 1 ? 'disabled' : ''}
        class="p-2 border border-outline-variant/40 rounded-lg hover:bg-surface-container/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-on-surface"
        aria-label="Trang trước">
        <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span>
      </button>`;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
          const isActive = i === page;
          html += `<button type="button" onclick="VVPagination.go('${id}', ${i})"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/40 hover:bg-surface-container/60 text-on-surface text-xs font-semibold transition-colors"
            style="${activeBtnStyle(isActive)}" aria-label="Trang ${i}" ${isActive ? 'aria-current="page"' : ''}>${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
          html += `<span class="text-outline px-1 text-sm">…</span>`;
        }
      }

      html += `<button type="button" onclick="VVPagination.go('${id}', ${page + 1})" ${page >= totalPages ? 'disabled' : ''}
        class="p-2 border border-outline-variant/40 rounded-lg hover:bg-surface-container/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-on-surface"
        aria-label="Trang sau">
        <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
      </button>`;

      container.innerHTML = html;
    },
  };
})();
