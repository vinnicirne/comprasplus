import page from 'page';
import { appStore } from '../store/appStore.js';
import * as listService from '../services/listService.js';
import { joinSharedListByCode } from '../services/shareService.js';
import { formatCurrency, formatDateBR, escapeHtml } from '../utils/formatters.js';
import { calculateListTotals } from '../utils/listUtils.js';
import { showToast } from '../utils/toast.js';

export const DashboardView = {
  async render() {
    const app = document.getElementById('app');
    
    // Mostra skeleton loader se quisermos depois, por agora só carrega
    const user = appStore.state.currentUser;
    if (!user) {
      page.redirect('/');
      return;
    }

    // Esconde o Login se existir
    const loginView = document.getElementById('view-login-inicial');
    if (loginView) loginView.classList.add('hidden');

    // Mostra o shell do app (Header e Nav)
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    const routerView = document.getElementById('router-view');
    routerView.innerHTML = this.getBaseHtml();
    
    // Seta o nome do usuário
    this.updateGreeting(user);
    
    // Anexa eventos estáticos (ex: nova lista)
    this.attachStaticEvents();

    // Busca as listas
    try {
      const lists = await listService.getListas(user.id);
      appStore.state.lists = lists;
      this.renderLists(lists);
      this.updateWalletSummary();
    } catch (e) {
      console.error('Failed to load lists:', e);
      const container = document.getElementById('lists-container');
      if (container) container.innerHTML = '<p class="text-error px-4">Erro ao carregar listas.</p>';
    }

    // Inscrição Realtime no Dashboard para listas ao vivo
    if (!this.unsubscribeRealtime) {
      this.unsubscribeRealtime = listService.subscribeToAllLists(user.id, async () => {
        try {
          const freshLists = await listService.getListas(user.id);
          appStore.state.lists = freshLists;
          this.renderLists(freshLists);
          this.updateWalletSummary();
        } catch (_) {}
      });
    }

    // Renderiza banner oficial do Google AdMob no Dashboard como no código original
    if (window.admobManager && typeof window.admobManager.renderWebBanner === 'function') {
      window.admobManager.renderWebBanner();
    }
  },

  updateGreeting(user) {
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Visitante';
    const firstName = name.split(' ')[0];

    // Greeting no dashboard
    const greeting = document.getElementById('dashboard-user-greeting');
    if (greeting) greeting.textContent = firstName;

    // Botão no header
    const headerLabel = document.getElementById('header-auth-label');
    const headerIcon = document.getElementById('header-auth-icon');
    if (headerLabel) headerLabel.textContent = firstName;
    if (headerIcon) headerIcon.textContent = 'account_circle';

    // Click no header abre perfil
    const btnAuth = document.getElementById('btn-header-auth');
    if (btnAuth && !btnAuth.dataset.bound) {
      btnAuth.dataset.bound = '1';
      btnAuth.addEventListener('click', () => {
        import('page').then(m => m.default('/perfil')).catch(() => {});
      });
    }
  },

  async updateWalletSummary() {
    try {
      const { getWalletEntries, getPurchaseHistoryForWallet, calculateWalletBalance } = await import('../services/walletService.js');
      const [entries, purchases] = await Promise.all([
        getWalletEntries(),
        getPurchaseHistoryForWallet()
      ]);
      const balance = calculateWalletBalance(entries, purchases);
      const elSaldo = document.getElementById('dashboard-wallet-balance');
      if (elSaldo) {
        elSaldo.textContent = formatCurrency(balance.saldoGeralCarteira);
        if (balance.saldoGeralCarteira < 0) {
          elSaldo.classList.add('text-error');
          elSaldo.classList.remove('text-secondary-fixed');
        } else {
          elSaldo.classList.remove('text-error');
          elSaldo.classList.add('text-secondary-fixed');
        }
      }
    } catch (_) {}
  },


  attachStaticEvents() {
    const btnNova = document.getElementById('btn-dashboard-nova-lista');
    if (btnNova) {
      btnNova.addEventListener('click', () => this.openNovaListaModal());
    }

    const btnEntrarCodigo = document.getElementById('btn-dashboard-entrar-codigo');
    if (btnEntrarCodigo) {
      btnEntrarCodigo.addEventListener('click', () => this.openEntrarCodigoModal());
    }

    // Verifica se veio com código de convite via URL (ex: ?convite=LST-XXXX ou ?codigo=LST-XXXX)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      let inviteCode = urlParams.get('convite') || urlParams.get('codigo');
      if (!inviteCode && hash.includes('codigo=')) {
        const m = hash.match(/codigo=([A-Za-z0-9\-]+)/i);
        if (m) inviteCode = m[1];
      }
      if (inviteCode) {
        this.openEntrarCodigoModal(inviteCode);
      }
      if (urlParams.get('action') === 'new' || hash.includes('action=new')) {
        this.openNovaListaModal();
      }
    } catch (_) {}

    // Atalho da Carteira no Dashboard
    const btnCarteira = document.getElementById('btn-dashboard-ir-carteira');
    if (btnCarteira && !btnCarteira.dataset.bound) {
      btnCarteira.dataset.bound = '1';
      btnCarteira.addEventListener('click', (e) => {
        e.preventDefault();
        page('/carteira');
      });
    }
    
    // Adicionar listener aos botões de filtro
    const filterBtns = document.querySelectorAll('.dashboard-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-primary', 'text-on-primary', 'shadow-md', 'hover:brightness-105');
          b.classList.add('bg-surface-container', 'text-on-surface-variant', 'hover:bg-surface-container-high', 'hover:text-on-surface');
        });
        
        const clicked = e.currentTarget;
        clicked.classList.remove('bg-surface-container', 'text-on-surface-variant', 'hover:bg-surface-container-high', 'hover:text-on-surface');
        clicked.classList.add('bg-primary', 'text-on-primary', 'shadow-md', 'hover:brightness-105');
        
        appStore.state.filterCategory = clicked.dataset.filter || 'TODAS';
        this.renderLists(appStore.state.lists);
      });
    });

    // Botão criar primeira lista (empty state)
    const btnPrimeira = document.getElementById('btn-criar-primeira-lista');
    if (btnPrimeira) {
      btnPrimeira.addEventListener('click', () => this.openNovaListaModal());
    }

    // Sincronização direta na nuvem no topo do Dashboard
    const btnSync = document.getElementById('btn-dashboard-sync');
    if (btnSync && !btnSync.dataset.bound) {
      btnSync.dataset.bound = '1';
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        const icon = btnSync.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');
        try {
          const { syncDataNow } = await import('../services/authService.js');
          const res = await syncDataNow();
          showToast(`☁️ Nuvem sincronizada! (${res.listsCount} listas)`, 'success');
          const user = appStore.state.currentUser;
          if (user) {
            const lists = await listService.getListas(user.id);
            appStore.state.lists = lists;
            this.renderLists(lists);
          }
        } catch (err) {
          showToast('Erro ao sincronizar: ' + err.message, 'error');
        } finally {
          btnSync.disabled = false;
          if (icon) icon.classList.remove('animate-spin');
        }
      });
    }

    // Toggle da barra de busca
    const btnToggleSearch = document.getElementById('toggleSearchBtn');
    const searchBar = document.getElementById('dashboard-search-bar');
    const searchInput = document.getElementById('dashboard-search-input');
    if (btnToggleSearch && searchBar && !btnToggleSearch.dataset.bound) {
      btnToggleSearch.dataset.bound = '1';
      btnToggleSearch.addEventListener('click', () => {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden') && searchInput) {
          searchInput.focus();
        }
      });
    }

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', (e) => {
        appStore.state.searchQuery = e.target.value;
        this.renderLists(appStore.state.lists);
      });
    }

    // Atualização reativa de perfil no Dashboard
    if (!window._dashboardProfileListenerBound) {
      window._dashboardProfileListenerBound = true;
      window.addEventListener('user-profile-updated', (e) => {
        const user = appStore.state.currentUser;
        if (user) this.updateGreeting(user);
        this.updateWalletSummary();
      });
    }
  },

  openEntrarCodigoModal(defaultCode = '') {
    const old = document.getElementById('modal-entrar-codigo');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-entrar-codigo';
    modal.className = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="w-full max-w-[600px] bg-surface rounded-t-3xl shadow-2xl p-6 pb-10 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]" id="modal-entrar-codigo-inner">
        <div class="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1"></div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">link</span>
            </span>
            <h2 class="font-headline-sm text-on-surface font-bold text-lg">Conectar Lista Compartilhada</h2>
          </div>
          <button id="btn-modal-entrar-fechar" class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p class="font-body-sm text-xs text-on-surface-variant">
          Cole o código de convite que você recebeu (ex: <code>LST-8931</code>) para conectar a lista à sua conta.
        </p>

        <div id="modal-entrar-alerta" class="hidden p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold"></div>

        <form id="form-entrar-codigo" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase" for="input-convite-codigo">Código de Convite *</label>
            <input id="input-convite-codigo" type="text" placeholder="LST-XXXXX" maxlength="15" value="${defaultCode}"
              class="w-full h-14 px-4 rounded-xl bg-surface-container-low text-on-surface font-headline-sm text-center font-bold tracking-widest uppercase border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
          </div>

          <button type="submit" id="btn-modal-entrar-conectar"
            class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-1">
            <span class="material-symbols-outlined text-[20px]">login</span>
            Conectar à Lista
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    window.admobService?.onModalOpen();

    const closeModal = () => {
      modal.remove();
      window.admobService?.onModalClose();
    };
    modal.querySelector('#btn-modal-entrar-fechar')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const form = modal.querySelector('#form-entrar-codigo');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = modal.querySelector('#input-convite-codigo').value.trim();
      const alerta = modal.querySelector('#modal-entrar-alerta');
      const btn = modal.querySelector('#btn-modal-entrar-conectar');

      if (!code) {
        alerta.textContent = 'Digite ou cole o código de convite.';
        alerta.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Conectando...';

      try {
        const connectedList = await joinSharedListByCode(code);
        closeModal();
        showToast(`🎉 Conectado com sucesso à lista "${connectedList.name}"!`, 'success');
        page(`/lista/${connectedList.id}`);
      } catch (err) {
        alerta.textContent = err.message || 'Não foi possível conectar com este código.';
        alerta.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">login</span> Conectar à Lista';
      }
    });
  },

  openNovaListaModal() {
    // Remove modal anterior se existir
    const old = document.getElementById('modal-nova-lista');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-nova-lista';
    modal.className = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="w-full max-w-[600px] bg-surface rounded-t-3xl shadow-2xl p-5 pb-10 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]" id="modal-nova-lista-inner">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-headline-sm text-on-surface font-bold text-lg">Nova Lista</h2>
          <button id="btn-modal-nova-fechar" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <!-- Nome -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="nova-lista-nome">Nome da lista *</label>
            <input id="nova-lista-nome" type="text" placeholder="Ex: Mercado da semana" maxlength="50"
              class="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
          </div>

          <!-- Loja / Supermercado -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="nova-lista-loja">Loja / Supermercado (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 px-3 gap-2">
              <span class="material-symbols-outlined text-on-surface-variant text-[18px]">storefront</span>
              <input id="nova-lista-loja" type="text" placeholder="Ex: Carrefour, Atacadão, Farmácia" maxlength="50"
                class="w-full h-full bg-transparent text-on-surface font-body-md text-sm outline-none">
            </div>
          </div>

          <!-- Categoria -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">Categoria</label>
            <div class="flex flex-wrap gap-2">
              ${[
                {value:'mercado', icon:'shopping_cart', label:'Mercado'},
                {value:'hortifruti', icon:'nutrition', label:'Hortifruti'},
                {value:'farmacia', icon:'medical_services', label:'Farmácia'},
                {value:'festa', icon:'celebration', label:'Festa'},
                {value:'outros', icon:'category', label:'Outros'},
              ].map(c => `
                <button type="button" class="categoria-btn flex items-center gap-1.5 h-8 px-3 rounded-full border border-outline-variant/40 bg-surface-container text-on-surface-variant text-xs font-semibold transition-all hover:border-primary hover:text-primary active:scale-95" data-value="${c.value}">
                  <span class="material-symbols-outlined text-[14px]">${c.icon}</span>
                  ${c.label}
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="nova-lista-categoria" value="mercado">
          </div>

          <!-- Orçamento -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="nova-lista-orcamento">Orçamento (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 overflow-hidden">
              <div class="pl-4 pr-1 h-full flex items-center justify-center text-on-surface-variant font-bold text-sm shrink-0">
                R$
              </div>
              <input id="nova-lista-orcamento" type="number" min="0" step="0.01" placeholder="0,00"
                class="w-full h-full pr-4 bg-transparent text-on-surface font-body-md text-sm outline-none">
            </div>
          </div>
        </div>

        <button id="btn-modal-nova-criar" class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-1">
          <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          Criar Lista
        </button>
        
        <div id="modal-nova-error" class="hidden text-error text-sm text-center font-medium"></div>
      </div>
    `;

    document.body.appendChild(modal);
    window.admobService?.onModalOpen();

    // Seleção de categoria
    let selectedCategoria = 'mercado';
    const categoriaBtns = modal.querySelectorAll('.categoria-btn');
    // Ativa padrão
    const defaultBtn = modal.querySelector('[data-value="mercado"]');
    if (defaultBtn) {
      defaultBtn.classList.add('border-primary', 'text-primary', 'bg-primary-fixed/30');
    }
    categoriaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategoria = btn.dataset.value;
        categoriaBtns.forEach(b => {
          b.classList.remove('border-primary', 'text-primary', 'bg-primary-fixed/30');
        });
        btn.classList.add('border-primary', 'text-primary', 'bg-primary-fixed/30');
      });
    });

    // Fechar
    const closeModal = () => {
      modal.remove();
      window.admobService?.onModalClose();
    };
    modal.querySelector('#btn-modal-nova-fechar').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Criar
    modal.querySelector('#btn-modal-nova-criar').addEventListener('click', async () => {
      const nome = modal.querySelector('#nova-lista-nome').value.trim();
      const loja = (modal.querySelector('#nova-lista-loja')?.value || '').trim();
      const orcamento = parseFloat(modal.querySelector('#nova-lista-orcamento').value) || 0;
      const errorEl = modal.querySelector('#modal-nova-error');

      if (!nome) {
        errorEl.textContent = 'Dê um nome para sua lista.';
        errorEl.classList.remove('hidden');
        return;
      }

      const btn = modal.querySelector('#btn-modal-nova-criar');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Criando...';

      try {
        const user = appStore.state.currentUser;
        const { createLista } = await import('../services/listService.js');
        await createLista({
          name: nome,
          store: loja,
          category: selectedCategoria,
          budget: orcamento,
          user_id: user.id,
          items: [],
          status: 'aberta'
        });
        closeModal();
        showToast(`🎉 Lista "${nome}" criada com sucesso!`, 'success');
        // Recarrega a lista
        this.render();
      } catch (err) {
        errorEl.textContent = 'Erro ao criar lista: ' + err.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">add_shopping_cart</span> Criar Lista';
      }
    });
  },

  openEditarListaModal(list) {
    const old = document.getElementById('modal-editar-lista');
    if (old) old.remove();

    const currentCat = (list.category || 'mercado').toLowerCase();
    const modal = document.createElement('div');
    modal.id = 'modal-editar-lista';
    modal.className = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="w-full max-w-[600px] bg-surface rounded-t-3xl shadow-2xl p-5 pb-10 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]" id="modal-editar-lista-inner">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </span>
            <h2 class="font-headline-sm text-on-surface font-bold text-lg">Editar Lista</h2>
          </div>
          <button id="btn-modal-editar-fechar" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <!-- Nome -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="editar-lista-nome">Nome da lista *</label>
            <input id="editar-lista-nome" type="text" value="${escapeHtml(list.name || '')}" placeholder="Ex: Mercado da semana" maxlength="50"
              class="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
          </div>

          <!-- Loja / Mercado -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="editar-lista-loja">Loja / Supermercado (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 px-3 gap-2">
              <span class="material-symbols-outlined text-on-surface-variant text-[18px]">storefront</span>
              <input id="editar-lista-loja" type="text" value="${escapeHtml(list.store || '')}" placeholder="Ex: Carrefour, Atacadão" maxlength="50"
                class="w-full h-full bg-transparent text-on-surface font-body-md text-sm outline-none">
            </div>
          </div>

          <!-- Categoria -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">Categoria</label>
            <div class="flex flex-wrap gap-2">
              ${[
                {value:'mercado', icon:'shopping_cart', label:'Mercado'},
                {value:'hortifruti', icon:'nutrition', label:'Hortifruti'},
                {value:'farmacia', icon:'medical_services', label:'Farmácia'},
                {value:'festa', icon:'celebration', label:'Festa'},
                {value:'outros', icon:'category', label:'Outros'},
              ].map(c => {
                const isActive = currentCat === c.value;
                return `
                  <button type="button" class="editar-categoria-btn flex items-center gap-1.5 h-8 px-3 rounded-full border ${isActive ? 'border-primary text-primary bg-primary-fixed/30 font-bold' : 'border-outline-variant/40 bg-surface-container text-on-surface-variant font-semibold'} text-xs transition-all hover:border-primary hover:text-primary active:scale-95" data-value="${c.value}">
                    <span class="material-symbols-outlined text-[14px]">${c.icon}</span>
                    ${c.label}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Orçamento -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="editar-lista-orcamento">Orçamento (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 overflow-hidden">
              <div class="pl-4 pr-1 h-full flex items-center justify-center text-on-surface-variant font-bold text-sm shrink-0">
                R$
              </div>
              <input id="editar-lista-orcamento" type="number" min="0" step="0.01" value="${list.budget || ''}" placeholder="0,00"
                class="w-full h-full pr-4 bg-transparent text-on-surface font-body-md text-sm outline-none">
            </div>
          </div>
        </div>

        <button id="btn-modal-editar-salvar" class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-1">
          <span class="material-symbols-outlined text-[20px]">check</span>
          Salvar Alterações
        </button>
        
        <div id="modal-editar-error" class="hidden text-error text-sm text-center font-medium"></div>
      </div>
    `;

    document.body.appendChild(modal);
    window.admobService?.onModalOpen();

    let selectedCategoria = currentCat;
    const catBtns = modal.querySelectorAll('.editar-categoria-btn');
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategoria = btn.dataset.value;
        catBtns.forEach(b => {
          b.classList.remove('border-primary', 'text-primary', 'bg-primary-fixed/30', 'font-bold');
          b.classList.add('border-outline-variant/40', 'bg-surface-container', 'text-on-surface-variant', 'font-semibold');
        });
        btn.classList.add('border-primary', 'text-primary', 'bg-primary-fixed/30', 'font-bold');
        btn.classList.remove('border-outline-variant/40', 'bg-surface-container', 'text-on-surface-variant');
      });
    });

    const closeModal = () => {
      modal.remove();
      window.admobService?.onModalClose();
    };
    modal.querySelector('#btn-modal-editar-fechar').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#btn-modal-editar-salvar').addEventListener('click', async () => {
      const nome = modal.querySelector('#editar-lista-nome').value.trim();
      const loja = modal.querySelector('#editar-lista-loja').value.trim();
      const orcamento = parseFloat(modal.querySelector('#editar-lista-orcamento').value) || 0;
      const errorEl = modal.querySelector('#modal-editar-error');

      if (!nome) {
        errorEl.textContent = 'O nome da lista não pode ficar vazio.';
        errorEl.classList.remove('hidden');
        return;
      }

      const btn = modal.querySelector('#btn-modal-editar-salvar');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Salvando...';

      try {
        await listService.updateLista(list.id, {
          name: nome,
          store: loja,
          category: selectedCategoria,
          budget: orcamento
        });

        // Atualiza no store local
        const idx = appStore.state.lists.findIndex(l => String(l.id) === String(list.id));
        if (idx !== -1) {
          appStore.state.lists[idx] = {
            ...appStore.state.lists[idx],
            name: nome,
            store: loja,
            category: selectedCategoria,
            budget: orcamento
          };
        }

        closeModal();
        showToast('✅ Lista atualizada com sucesso!', 'success');
        this.renderLists(appStore.state.lists);
      } catch (err) {
        errorEl.textContent = 'Erro ao salvar alterações: ' + err.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">check</span> Salvar Alterações';
      }
    });
  },

  openExcluirListaModal(list) {
    const old = document.getElementById('modal-excluir-lista');
    if (old) old.remove();

    const qtdItens = (list.items || []).length;
    const modal = document.createElement('div');
    modal.id = 'modal-excluir-lista';
    modal.className = 'fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="w-full max-w-[460px] bg-surface rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out] border border-outline-variant/30" id="modal-excluir-lista-inner">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-error-container/30 text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[28px]">delete_forever</span>
          </div>
          <div class="flex flex-col min-w-0">
            <h2 class="font-headline-sm text-on-surface font-bold text-lg">Excluir Lista</h2>
            <span class="text-xs text-on-surface-variant font-medium">Esta ação não pode ser desfeita</span>
          </div>
        </div>

        <p class="text-sm text-on-surface leading-relaxed">
          Tem certeza de que deseja excluir permanentemente a lista <strong class="text-on-surface font-bold">"${escapeHtml(list.name || 'Nova Lista')}"</strong>${qtdItens > 0 ? ` e todos os seus <strong>${qtdItens} itens</strong>` : ''}?
        </p>

        <div id="modal-excluir-error" class="hidden text-error text-xs font-semibold bg-error-container/20 p-2.5 rounded-xl"></div>

        <div class="flex items-center gap-3 mt-2">
          <button type="button" id="btn-modal-excluir-cancelar"
            class="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high active:scale-95 transition-all">
            Cancelar
          </button>
          <button type="button" id="btn-modal-excluir-confirmar"
            class="flex-1 h-11 rounded-xl bg-error text-on-error font-bold text-xs shadow-md hover:bg-error/90 active:scale-95 transition-all flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">delete</span>
            Sim, Excluir
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    window.admobService?.onModalOpen();

    const closeModal = () => {
      modal.remove();
      window.admobService?.onModalClose();
    };
    modal.querySelector('#btn-modal-excluir-cancelar').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#btn-modal-excluir-confirmar').addEventListener('click', async () => {
      const btn = modal.querySelector('#btn-modal-excluir-confirmar');
      const errEl = modal.querySelector('#modal-excluir-error');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Excluindo...';

      try {
        await listService.deleteLista(list.id);
        appStore.state.lists = appStore.state.lists.filter(l => String(l.id) !== String(list.id));
        closeModal();
        showToast(`🗑️ Lista "${list.name}" excluída com sucesso!`, 'success');
        this.renderLists(appStore.state.lists);
      } catch (err) {
        errEl.textContent = 'Erro ao excluir lista: ' + err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete</span> Sim, Excluir';
      }
    });
  },

  renderLists(allLists) {
    const container = document.getElementById('lists-container');
    const emptyState = document.getElementById('empty-state-listas');
    if (!container || !emptyState) return;

    let filter = appStore.state.filterCategory || 'TODAS';
    
    // Filtros lógicos
    let lists = allLists;
    if (filter === 'ATIVAS') {
      lists = allLists.filter(l => l.status !== 'concluida');
    } else if (filter === 'CONCLUIDAS') {
      lists = allLists.filter(l => l.status === 'concluida');
    } else if (filter === 'PENDENTES') {
      lists = allLists.filter(l => l.status !== 'concluida' && (l.items || []).some(i => !i.checked));
    }

    // Filtro de busca
    const query = (appStore.state.searchQuery || '').trim().toLowerCase();
    if (query) {
      lists = lists.filter(l => (l.name || '').toLowerCase().includes(query) || (l.store || '').toLowerCase().includes(query));
    }

    // Atualiza contadores
    const countAll = allLists.length;
    const countActive = allLists.filter(l => l.status !== 'concluida').length;
    const countPending = allLists.filter(l => l.status !== 'concluida' && (l.items || []).some(i => !i.checked)).length;
    const countCompleted = allLists.filter(l => l.status === 'concluida').length;
    
    const elCountAll = document.getElementById('filter-count-all');
    const elCountActive = document.getElementById('filter-count-active');
    const elCountPending = document.getElementById('filter-count-pending');
    const elCountCompleted = document.getElementById('filter-count-completed');
    
    if (elCountAll) elCountAll.textContent = countAll;
    if (elCountActive) elCountActive.textContent = countActive;
    if (elCountPending) elCountPending.textContent = countPending;
    if (elCountCompleted) elCountCompleted.textContent = countCompleted;

    // Atualizar Hero Card
    let totalOrcamento = 0;
    let totalGasto = 0;
    
    allLists.forEach(l => {
      const { orcamento, totalGasto: gasto } = calculateListTotals(l);
      totalOrcamento += orcamento;
      totalGasto += gasto;
    });
    
    const heroBudget = document.getElementById('hero-total-budget');
    const heroSpent = document.getElementById('hero-total-spent');
    const heroActiveCount = document.getElementById('hero-active-count');
    const heroProgress = document.getElementById('hero-progress-bar');
    const heroPercent = document.getElementById('hero-progress-percent');
    const heroBadge = document.getElementById('hero-saving-badge');

    if(heroBudget) heroBudget.textContent = formatCurrency(totalOrcamento).replace('R$','').trim();
    if(heroSpent) heroSpent.textContent = formatCurrency(totalGasto);
    if(heroActiveCount) heroActiveCount.textContent = countActive;
    
    let percent = totalOrcamento > 0 ? (totalGasto / totalOrcamento) * 100 : 0;
    if(heroProgress) heroProgress.style.width = `${Math.min(100, percent)}%`;
    if(heroPercent) heroPercent.textContent = percent.toFixed(1);
    
    if (heroBadge) {
      const restante = totalOrcamento - totalGasto;
      if (restante >= 0) {
        heroBadge.innerHTML = `Resta: ${formatCurrency(restante)} 🎉`;
        heroBadge.className = "px-2 py-0.5 rounded-full bg-on-primary/15 text-secondary-fixed font-semibold text-[10px] flex items-center gap-1";
      } else {
        heroBadge.innerHTML = `Excedido: ${formatCurrency(Math.abs(restante))} ⚠️`;
        heroBadge.className = "px-2 py-0.5 rounded-full bg-error text-on-error font-semibold text-[10px] flex items-center gap-1";
      }
    }

    if (lists.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    container.innerHTML = lists.map(list => {
      const { orcamento, totalGasto, saldoDisponivel, percentualConsumido } = calculateListTotals(list);
      
      let saldoColor = 'text-primary';
      let progClass = 'bg-primary';
      
      if (saldoDisponivel < 0) {
        saldoColor = 'text-error';
        progClass = 'bg-error';
      } else if (percentualConsumido >= 75) {
        saldoColor = 'text-tertiary';
        progClass = 'bg-tertiary';
      }

      const progressWidth = Math.min(100, Math.round(percentualConsumido));
      let iconName = 'shopping_cart';
      if(list.category === 'hortifruti') iconName = 'nutrition';
      if(list.category === 'farmacia') iconName = 'medical_services';
      if(list.category === 'festa') iconName = 'celebration';
      if(list.category === 'outros') iconName = 'category';

      const qtdItens = (list.items || []).length;
      const itensMarcados = (list.items || []).filter(i => i.checked).length;
      let itemProgress = qtdItens > 0 ? (itensMarcados / qtdItens) * 100 : 0;

      const isOwner = !list.isShared;
      const isConcluida = list.status === 'concluida';
      const listDateFormatted = formatDateBR(list.createdAt || list.created_at || new Date().toISOString());

      let badgeStatus = '';
      if (isConcluida) {
        badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[12px] text-primary">check</span> Concluída</span>`;
      } else if (list.isShared) {
        badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">group</span> Compartilhada</span>`;
      } else {
        badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Ativa</span>`;
      }

      return `
        <article class="list-card group relative ${isConcluida ? 'bg-surface-container-low/70 opacity-90' : 'bg-surface-container-lowest'} rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 border border-outline-variant/30 flex flex-col gap-3" data-status="${isConcluida ? 'completed' : 'in_progress'}" data-title="${escapeHtml(list.name || 'Nova Lista')}">
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">${iconName}</span>
              </div>
              <div class="flex flex-col min-w-0">
                <h2 class="font-label-lg text-label-lg text-on-surface truncate font-bold leading-snug ${isConcluida ? 'line-through decoration-outline-variant' : ''}">${escapeHtml(list.name || 'Nova Lista')}</h2>
                <div class="flex items-center gap-2 text-on-surface-variant text-[11px] leading-tight mt-0.5 flex-wrap">
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px] text-primary">calendar_month</span>
                    <span>${listDateFormatted}</span>
                  </span>
                  ${list.store ? `
                    <span class="text-outline opacity-40">•</span>
                    <span class="flex items-center gap-1 text-primary font-bold">
                      <span class="material-symbols-outlined text-[13px]">storefront</span>
                      <span>${escapeHtml(list.store)}</span>
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>
            ${badgeStatus}
          </div>
          <!-- Barra de Progresso com respiro -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-[11px]">
              <span class="text-on-surface-variant font-normal">Itens comprados</span>
              <span class="font-bold text-on-surface">${itensMarcados} de ${qtdItens} <span class="${saldoColor} font-semibold">(${Math.round(itemProgress)}%)</span></span>
            </div>
            <div class="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full ${progClass} rounded-full" style="width: ${itemProgress}%;"></div>
            </div>
          </div>
          <!-- Rodapé -->
          <div class="pt-2.5 flex items-center justify-between border-t border-surface-container/60">
            <div class="flex items-center gap-2">
              <div class="flex flex-col">
                <span class="text-[10px] text-on-surface-variant uppercase font-semibold leading-none">Total Gasto</span>
                <span class="text-sm ${saldoColor} font-extrabold leading-tight mt-0.5">${formatCurrency(totalGasto)}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5">
              <button type="button" aria-label="Editar lista" title="Editar informações da lista" class="btn-card-edit-list w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-95 flex items-center justify-center transition-all" data-id="${list.id}">
                <span class="material-symbols-outlined text-[17px]">edit</span>
              </button>
              <button type="button" aria-label="Excluir lista" title="Excluir permanentemente esta lista" class="btn-card-delete-list w-8 h-8 rounded-lg bg-error-container/25 text-error hover:bg-error-container hover:text-on-error-container active:scale-95 flex items-center justify-center transition-all" data-id="${list.id}">
                <span class="material-symbols-outlined text-[17px]">delete</span>
              </button>
              <button type="button" aria-label="Abrir lista" class="btn-card-open-list h-8 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] font-semibold flex items-center gap-1 hover:bg-primary-container active:scale-95 transition-all shadow-sm" data-id="${list.id}">
                ${isConcluida ? 'Ver' : 'Abrir'}
                <span class="material-symbols-outlined text-[16px]">${isConcluida ? 'visibility' : 'chevron_right'}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
    
    // Anexar listeners nos botões de Abrir Lista
    container.querySelectorAll('.btn-card-open-list').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const listId = e.currentTarget.dataset.id;
        page(`/lista/${listId}`);
      });
    });

    // Anexar listeners nos botões de Editar Lista
    container.querySelectorAll('.btn-card-edit-list').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const listId = e.currentTarget.dataset.id;
        const list = appStore.state.lists.find(l => String(l.id) === String(listId));
        if (list) this.openEditarListaModal(list);
      });
    });

    // Anexar listeners nos botões de Excluir Lista
    container.querySelectorAll('.btn-card-delete-list').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const listId = e.currentTarget.dataset.id;
        const list = appStore.state.lists.find(l => String(l.id) === String(listId));
        if (list) this.openExcluirListaModal(list);
      });
    });
  },

  getBaseHtml() {
    return `<main id="view-dashboard" class="view flex flex-col relative w-full bg-surface min-h-screen pb-20">
        <div class="flex flex-col w-full px-margin gap-3.5 pb-6 pt-3">
        
          <!-- Saudação e Barra de Busca -->
          <section class="flex flex-col gap-2.5 pt-1">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                          Olá <span id="dashboard-user-greeting">Visitante</span> 
                          <span class="inline-block animate-bounce text-sm">👋</span>
                </span>
                <h1 class="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                          Suas Listas de Compras
                        </h1>
              </div>
              <div class="flex items-center gap-2">
                <button aria-label="Sincronizar dados com a nuvem" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary active:scale-95 transition-all shadow-sm" id="btn-dashboard-sync" type="button" title="Sincronizar com a Nuvem">
                  <span class="material-symbols-outlined text-[18px]">cloud_sync</span>
                </button>
                <button aria-label="Entrar em lista compartilhada" class="h-9 px-3 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-xs font-semibold flex items-center gap-1 hover:bg-secondary-container/80 active:scale-95 transition-all shadow-xs" id="btn-dashboard-entrar-codigo" type="button" title="Conectar lista compartilhada por código">
                  <span class="material-symbols-outlined text-[16px]">link</span>
                  <span>Conectar Código</span>
                </button>
                <button aria-label="Abrir pesquisa de listas" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary active:scale-95 transition-all shadow-sm" id="toggleSearchBtn" type="button">
                  <span class="material-symbols-outlined text-[18px]">search</span>
                </button>
              </div>
            </div>

            <!-- Barra de Busca Expansível -->
            <div id="dashboard-search-bar" class="hidden flex items-center bg-surface-container-low rounded-xl px-3 py-1.5 border border-outline-variant/30 mt-1 animate-[fadeIn_0.2s_ease-out]">
              <span class="material-symbols-outlined text-[18px] text-outline mr-2">search</span>
              <input type="text" id="dashboard-search-input" placeholder="Buscar por lista ou loja..." class="w-full bg-transparent text-xs text-on-surface outline-none">
            </div>
          </section>

          <!-- Filtros de Navegação (Pills) -->
          <nav class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-margin px-margin snap-x snap-mandatory">
            <button class="dashboard-filter-btn flex-shrink-0 snap-start h-8 px-3 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all hover:brightness-105 cursor-pointer" data-filter="TODAS">
              Todas <span class="bg-on-primary/20 text-on-primary text-[10px] px-1.5 py-0.5 rounded-full" id="filter-count-all">0</span>
            </button>
            <button class="dashboard-filter-btn flex-shrink-0 snap-start h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer" data-filter="ATIVAS">
              Ativas <span class="bg-surface-container-highest text-on-surface-variant text-[10px] px-1.5 py-0.5 rounded-full" id="filter-count-active">0</span>
            </button>
            <button class="dashboard-filter-btn flex-shrink-0 snap-start h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer" data-filter="PENDENTES">
              Pendentes <span class="bg-surface-container-highest text-on-surface-variant text-[10px] px-1.5 py-0.5 rounded-full" id="filter-count-pending">0</span>
            </button>
            <button class="dashboard-filter-btn flex-shrink-0 snap-start h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer" data-filter="CONCLUIDAS">
              Concluídas <span class="bg-surface-container-highest text-on-surface-variant text-[10px] px-1.5 py-0.5 rounded-full" id="filter-count-completed">0</span>
            </button>
          </nav>

          <!-- Hero Card: Visão Geral de Orçamento -->
          <section class="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-4 shadow-[0_8px_30px_-6px_rgba(0,105,72,0.5)] flex flex-col gap-4 relative overflow-hidden mt-1">
            <div class="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-8 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="flex items-start justify-between relative z-10">
              <div class="flex flex-col text-on-primary">
                <span class="font-label-sm text-[12px] opacity-90 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">account_balance_wallet</span> Total Previsto
                </span>
                <div class="flex items-baseline gap-1">
                  <span class="font-bold text-lg opacity-80">R$</span>
                  <span class="font-numeric-hero-mobile text-numeric-hero-mobile leading-none" id="hero-total-budget">0,00</span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <div id="hero-saving-badge" class="px-2 py-0.5 rounded-full bg-on-primary/15 text-secondary-fixed font-semibold text-[10px] flex items-center gap-1">
                  Resta: R$ 0,00 🎉
                </div>
                <button id="btn-dashboard-ir-carteira" type="button" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/35 text-on-primary text-[11px] font-semibold transition-all">
                  <span class="material-symbols-outlined text-[14px] text-secondary-fixed">account_balance_wallet</span>
                  <span>Caixa: <strong id="dashboard-wallet-balance" class="text-secondary-fixed">R$ 0,00</strong></span>
                  <span class="material-symbols-outlined text-[12px] opacity-70">chevron_right</span>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2 relative z-10">
              <div class="flex justify-between items-end text-on-primary">
                <div class="flex flex-col">
                  <span class="text-[10px] opacity-80 mb-0.5">Total Gasto</span>
                  <span class="font-headline-sm text-headline-sm leading-none" id="hero-total-spent">R$ 0,00</span>
                </div>
                <div class="flex items-center gap-1 opacity-90 text-[11px] font-medium bg-black/20 px-2 py-1 rounded-lg">
                  <span class="material-symbols-outlined text-[14px]">list_alt</span>
                  <span id="hero-active-count">0</span> Ativas
                </div>
              </div>
              
              <div class="w-full h-2 bg-black/20 rounded-full overflow-hidden mt-1">
                <div class="h-full bg-secondary-fixed rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(172,248,71,0.6)]" id="hero-progress-bar" style="width: 0%;"></div>
              </div>
              <div class="flex justify-between items-center text-[10px] text-on-primary/80 font-medium px-0.5">
                <span>Consumido</span>
                <span><span id="hero-progress-percent">0.0</span>%</span>
              </div>
            </div>
          </section>

          <!-- Listagem de Cards -->
          <section class="flex flex-col gap-3 mt-2">
            <!-- Empty State -->
            <div id="empty-state-listas" class="hidden flex-col items-center justify-center text-center py-10 px-4 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50">
              <div class="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full mb-4">
                <span class="material-symbols-outlined text-4xl text-outline">add_shopping_cart</span>
              </div>
              <h3 class="font-headline-sm text-on-surface mb-1">Nenhuma lista encontrada</h3>
              <p class="font-body-sm text-on-surface-variant max-w-[250px]">Crie sua primeira lista e comece a controlar seus gastos de forma inteligente.</p>
              <button id="btn-criar-primeira-lista" class="mt-4 px-4 py-2.5 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all" type="button">
                <span class="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                Criar Primeira Lista
              </button>
            </div>

            <!-- Container das Listas (Dinâmico) -->
            <div id="lists-container" class="flex flex-col gap-3 pb-safe">
              <!-- Cards injetados via JS -->
            </div>
          </section>

          <!-- Banner AdMob Integrado Orgânico -->
          <div id="admob-banner-slot" class="admob-banner-container mt-0 mb-4">
            <div class="admob-badge">Publicidade</div>
            <div class="admob-inner-content">
              <span style="font-size: 1.25rem;">🛒</span>
              <div style="font-size: 0.8rem; line-height: 1.25;">
                <strong>Economize nas compras:</strong> Compare preços e mantenha o orçamento no verde!
              </div>
            </div>
          </div>
          
        </div>

        <!-- Botão Flutuante de Ação Rápida mais Compacto e Equilibrado -->
        <div class="sticky bottom-24 z-40 flex justify-end w-full pr-4 pointer-events-none mb-6">
          <button class="pointer-events-auto flex items-center gap-1.5 h-11 px-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-md text-label-md shadow-[0_6px_20px_-4px_rgba(0,105,72,0.4)] hover:shadow-[0_10px_25px_-4px_rgba(0,105,72,0.5)] active:scale-95 transition-all transform hover:-translate-y-0.5" id="btn-dashboard-nova-lista" type="button">
            <span class="material-symbols-outlined text-[20px]">add</span>
            <span class="font-bold">Nova Lista</span>
          </button>
        </div>
      </main>`;
  }
};
