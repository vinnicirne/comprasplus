import page from 'page';
import { appStore } from '../store/appStore.js';
import { isAdmin } from '../services/authService.js';
import { getAdminData, exportLeadsToCsv } from '../services/adminService.js';
import { formatDateBR, escapeHtml } from '../utils/formatters.js';

export const AdminView = {
  allLeads: [],
  filteredLeads: [],

  async render() {
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    const routerView = document.getElementById('router-view');
    if (!routerView) return;

    if (!isAdmin(appStore.state.currentUser)) {
      page('/dashboard');
      return;
    }

    routerView.innerHTML = `
      <main class="min-h-screen bg-surface flex flex-col pb-32">
        <!-- Top Bar -->
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-md pt-safe px-space-md h-16 flex items-center justify-between border-b border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-2">
            <button id="btn-admin-voltar" class="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[22px]">shield_person</span>
              <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface">Painel Admin</h1>
            </div>
          </div>
          <button id="btn-exportar-csv" class="h-10 px-3.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all hover:bg-primary-container">
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar CSV</span>
          </button>
        </header>

        <div class="p-space-md flex flex-col gap-space-md max-w-lg mx-auto w-full">
          <!-- Cards de Métricas -->
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Total Leads</span>
              <span class="font-headline-sm font-extrabold text-primary text-xl mt-1" id="stat-total-leads">...</span>
              <span class="font-body-sm text-[10px] text-outline">Usuários</span>
            </div>
            <div class="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Com WhatsApp</span>
              <span class="font-headline-sm font-extrabold text-[#25D366] text-xl mt-1" id="stat-whatsapp-leads">...</span>
              <span class="font-body-sm text-[10px] text-outline">Prontos</span>
            </div>
            <div class="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Total Listas</span>
              <span class="font-headline-sm font-extrabold text-secondary text-xl mt-1" id="stat-total-listas">...</span>
              <span class="font-body-sm text-[10px] text-outline">Criadas</span>
            </div>
          </div>

          <!-- Busca de Leads -->
          <div class="flex items-center gap-2 bg-surface-container-lowest px-4 py-2.5 rounded-2xl border border-outline-variant/30 shadow-xs">
            <span class="material-symbols-outlined text-outline text-[20px]">search</span>
            <input type="text" id="input-buscar-lead" placeholder="Buscar por nome, e-mail ou WhatsApp..."
              class="w-full bg-transparent font-body-md text-xs text-on-surface outline-none placeholder:text-outline/60">
            <button id="btn-recarregar-admin" class="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary active:scale-95 transition-all" title="Atualizar dados">
              <span class="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          <!-- Seção de Leads -->
          <div class="flex items-center justify-between mt-1">
            <h2 class="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wide">Base de Usuários & Contatos</h2>
            <span class="font-body-sm text-xs text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full" id="stat-badge-count">0 leads</span>
          </div>

          <div id="admin-leads-list" class="flex flex-col gap-2.5">
            <div class="flex items-center justify-center p-8">
              <span class="material-symbols-outlined animate-spin text-primary text-3xl">autorenew</span>
            </div>
          </div>
        </div>
      </main>
    `;

    this.attachEvents();
    await this.loadData();
  },

  attachEvents() {
    document.getElementById('btn-admin-voltar')?.addEventListener('click', () => page('/dashboard'));

    document.getElementById('btn-exportar-csv')?.addEventListener('click', () => {
      exportLeadsToCsv(this.allLeads);
    });

    document.getElementById('btn-recarregar-admin')?.addEventListener('click', () => {
      this.loadData();
    });

    const searchInput = document.getElementById('input-buscar-lead');
    searchInput?.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      if (!q) {
        this.filteredLeads = [...this.allLeads];
      } else {
        this.filteredLeads = this.allLeads.filter(l => 
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q))
        );
      }
      this.renderLeads();
    });
  },

  async loadData() {
    try {
      const data = await getAdminData();
      this.allLeads = data.leads || [];
      this.filteredLeads = [...this.allLeads];

      document.getElementById('stat-total-leads').textContent = data.totalUsers;
      document.getElementById('stat-whatsapp-leads').textContent = data.usersWithPhone;
      document.getElementById('stat-total-listas').textContent = data.totalLists;

      this.renderLeads();
    } catch (e) {
      console.error('Erro ao carregar dados admin:', e);
      const container = document.getElementById('admin-leads-list');
      if (container) {
        container.innerHTML = `<div class="p-4 bg-error-container/30 text-error text-xs rounded-xl text-center font-medium">${escapeHtml(e.message || 'Erro ao consultar dados.')}</div>`;
      }
    }
  },

  renderLeads() {
    const container = document.getElementById('admin-leads-list');
    const badge = document.getElementById('stat-badge-count');
    if (badge) badge.textContent = `${this.filteredLeads.length} leads`;
    if (!container) return;

    if (this.filteredLeads.length === 0) {
      container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60 p-8 flex flex-col items-center justify-center text-center gap-2">
          <span class="material-symbols-outlined text-4xl text-outline/60">person_search</span>
          <p class="font-body-md font-semibold text-on-surface">Nenhum lead encontrado</p>
          <p class="font-body-sm text-xs text-on-surface-variant">Tente outro termo na busca acima.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredLeads.map(lead => {
      const name = lead.name || 'Sem nome';
      const email = lead.email || 'Sem e-mail';
      const phone = lead.phone ? lead.phone.trim() : '';
      const initial = name.charAt(0).toUpperCase();

      let waLink = '';
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        const full = (digits.length === 10 || digits.length === 11) ? '55' + digits : digits;
        waLink = `https://wa.me/${full}?text=${encodeURIComponent(`Olá ${name}, tudo bem? Aqui é do Compras Plus!`)}`;
      }

      return `
        <article class="bg-surface-container-lowest rounded-2xl p-3.5 border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3 hover:border-outline-variant transition-all">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0">
              ${initial}
            </span>
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-xs text-on-surface truncate">${escapeHtml(name)}</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${escapeHtml(email)}</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="font-label-sm text-[10px] text-outline">${formatDateBR(lead.created_at)}</span>
                ${lead.marketing_consent !== false ? `
                  <span class="font-label-sm text-[9px] px-1.5 py-0.2 bg-secondary-container text-on-secondary-container rounded-md font-semibold">Aceitou MKT</span>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="shrink-0 flex items-center gap-1.5">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer"
                class="h-8 px-2.5 rounded-lg bg-[#25D366]/15 text-[#1EBE5D] hover:bg-[#25D366] hover:text-white font-label-md text-xs font-semibold flex items-center gap-1 transition-all" title="Abrir conversa no WhatsApp">
                <span class="material-symbols-outlined text-[16px]">chat</span>
                <span class="hidden sm:inline">WhatsApp</span>
              </a>
            ` : `
              <span class="text-[10px] text-outline italic">Sem fone</span>
            `}
          </div>
        </article>
      `;
    }).join('');
  }
};
