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
