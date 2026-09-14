import { escapeHtml } from './formatters.js';

export function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  const el = document.createElement('div');
  el.className = `toast-item toast-${type} flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-[slideDown_0.25s_ease-out] z-[99999] pointer-events-auto`;
  
  let bgClass = 'bg-surface-container-highest text-on-surface border border-outline-variant/30';
  if (type === 'success') bgClass = 'bg-primary text-on-primary shadow-primary/30';
  if (type === 'error') bgClass = 'bg-error text-on-error shadow-error/30';
  if (type === 'warning') bgClass = 'bg-tertiary-container text-on-tertiary-container border border-tertiary/30';

  el.className += ` ${bgClass}`;
  el.innerHTML = `
    <span class="material-symbols-outlined text-[18px] shrink-0">${icons[type] || 'info'}</span>
    <span class="flex-1 leading-snug">${escapeHtml(msg)}</span>
  `;

  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    el.style.transition = 'all 0.25s ease-in';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

export function showAlertDialog({ title = 'Aviso', message = '', icon = 'info', confirmText = 'Entendido' }) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]';
    modal.innerHTML = `
      <div class="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">${icon}</span>
          </div>
          <h3 class="font-headline-sm text-base font-bold text-on-surface">${escapeHtml(title)}</h3>
        </div>
        <p class="font-body-md text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">${escapeHtml(message)}</p>
        <button type="button" class="btn-dialog-confirm w-full h-11 rounded-2xl bg-primary text-on-primary font-semibold text-xs shadow-md active:scale-95 transition-all">
          ${escapeHtml(confirmText)}
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.remove();
      resolve(true);
    };
    modal.querySelector('.btn-dialog-confirm')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  });
}

export function showConfirmDialog({ title = 'Confirmar', message = '', icon = 'help', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]';
    modal.innerHTML = `
      <div class="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-error-container/30 text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">${icon}</span>
          </div>
          <h3 class="font-headline-sm text-base font-bold text-on-surface">${escapeHtml(title)}</h3>
        </div>
        <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">${escapeHtml(message)}</p>
        <div class="flex items-center gap-2 mt-1">
          <button type="button" class="btn-dialog-cancel flex-1 h-11 rounded-2xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high active:scale-95 transition-all">
            ${escapeHtml(cancelText)}
          </button>
          <button type="button" class="btn-dialog-confirm flex-1 h-11 rounded-2xl bg-error text-on-error font-bold text-xs shadow-md hover:bg-error/90 active:scale-95 transition-all">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = (confirmed) => {
      modal.remove();
      resolve(confirmed);
    };
    modal.querySelector('.btn-dialog-cancel')?.addEventListener('click', () => close(false));
    modal.querySelector('.btn-dialog-confirm')?.addEventListener('click', () => close(true));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(false); });
  });
}

