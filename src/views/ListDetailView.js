import page from 'page';
import { appStore } from '../store/appStore.js';
import { getListaById, updateLista, deleteLista } from '../services/listService.js';
import { savePurchaseHistory } from '../services/historyService.js';
import * as shareService from '../services/shareService.js';
import { formatCurrency, formatDateBR, escapeHtml } from '../utils/formatters.js';
import { showToast } from '../utils/toast.js';

export const CATEGORY_ICONS = {
  'Mercado': 'shopping_cart',
  'Mercearia': 'storefront',
  'Hortifrúti': 'nutrition',
  'Hortifruti': 'nutrition',
  'Padaria': 'bakery_dining',
  'Açougue': 'set_meal',
  'Bebidas': 'liquor',
  'Limpeza': 'cleaning_services',
  'Higiene': 'soap',
  'Farmácia': 'local_pharmacy',
  'Festa': 'celebration',
  'Pet Shop': 'pets',
  'Outros': 'category'
};

const UNITS = [
  { value: 'un', label: 'un' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' }
];

export const ListDetailView = {
  currentList: null,
  editingItemId: null,

  async render(listId) {
    const rv = document.getElementById('router-view');
    rv.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <span class="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
      </div>
    `;

    this.currentList = await getListaById(listId);
    
    if (!this.currentList) {
      rv.innerHTML = `
        <div class="p-6 text-center mt-10">
          <span class="material-symbols-outlined text-5xl text-outline mb-2">error</span>
          <h2 class="font-headline-sm font-bold text-on-surface">Lista não encontrada</h2>
          <button id="btn-list-not-found-back" class="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl font-label-md shadow-md active:scale-95 transition-all">Voltar ao Dashboard</button>
        </div>
      `;
      document.getElementById('btn-list-not-found-back')?.addEventListener('click', () => page('/dashboard'));
      return;
    }

    if (!this.currentList.items) {
      this.currentList.items = [];
    }

    rv.innerHTML = this.getTemplate();
    this.updateHeroStats();
    this.renderItems();
    this.attachEvents();
  },

  getTemplate() {
    return `
      <main class="pb-safe min-h-screen bg-surface flex flex-col relative">
        <header class="sticky top-0 z-40 bg-surface/90 backdrop-blur-md pt-safe px-4 h-16 flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-2.5 min-w-0">
            <button id="btn-back-dashboard" class="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all shrink-0">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="flex flex-col min-w-0">
              <h1 class="font-headline-sm font-bold text-on-surface truncate max-w-[170px] sm:max-w-xs" id="detalhe-nome-header">${escapeHtml(this.currentList.name || 'Lista')}</h1>
              <span class="font-label-sm text-on-surface-variant flex items-center gap-1 truncate ${this.currentList.store ? '' : 'hidden'}" id="detalhe-store-header">
                <span class="material-symbols-outlined text-[12px] text-primary">storefront</span>
                <span id="detalhe-store-text">${escapeHtml(this.currentList.store || '')}</span>
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button id="btn-detalhe-editar-lista" type="button" title="Editar Informações da Lista" class="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-95 flex items-center justify-center transition-all">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button id="btn-detalhe-excluir-lista" type="button" title="Excluir Permanentemente esta Lista" class="w-9 h-9 rounded-full bg-error-container/25 text-error hover:bg-error-container hover:text-on-error-container active:scale-95 flex items-center justify-center transition-all">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button id="btn-compartilhar-lista" type="button" title="Compartilhar Lista" class="h-9 px-2.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-secondary-container/85 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[18px]">group_add</span>
              <span class="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </header>

        <div class="p-4 flex-1 flex flex-col gap-4">
          <!-- Hero Card: Orçamento -->
          <div class="bg-primary text-on-primary rounded-3xl p-5 shadow-md flex flex-col gap-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            
            <div class="flex justify-between items-end relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-on-primary/80 uppercase tracking-wide">Total Gasto</span>
                <span class="font-headline-lg font-bold" id="hero-total-gasto">R$ 0,00</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="font-label-sm text-on-primary/80 uppercase tracking-wide">Orçamento</span>
                <span class="font-body-lg font-semibold" id="hero-orcamento">
                  ${this.currentList.budget ? `R$ ${this.currentList.budget.toFixed(2).replace('.',',')}` : 'Livre'}
                </span>
              </div>
            </div>

            ${this.currentList.budget ? `
              <div class="flex flex-col gap-1.5 relative z-10">
                <div class="flex justify-between font-label-sm text-on-primary/90">
                  <span id="hero-status-text">Disponível</span>
                  <span id="hero-restante" class="font-bold">R$ 0,00</span>
                </div>
                <div class="h-2.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div id="hero-progress-bar" class="h-full bg-secondary-container transition-all duration-500 ease-out" style="width: 0%"></div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Botão Concluir Compra -->
          <button id="btn-abrir-concluir-compra" type="button" class="w-full h-12 rounded-2xl bg-secondary-container text-on-secondary-container font-label-lg font-bold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all hover:bg-secondary-container/85">
            <span class="material-symbols-outlined text-[20px]">task_alt</span>
            <span>Concluir Compra & Lançar no Histórico</span>
          </button>

          <div class="flex items-center justify-between mt-2">
            <h2 class="font-body-lg font-bold text-on-surface">Itens da Lista</h2>
            <span class="font-body-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full" id="items-count-badge">0 itens</span>
          </div>

          <div id="items-container" class="flex flex-col gap-3 pb-36">
            <!-- Items rendered here -->
          </div>
        </div>

        <!-- FAB: Adicionar Item (Elevado e protegido contra barras e anúncios) -->
        <button id="btn-add-item-fab" class="fab-btn bg-secondary text-on-secondary shadow-lg flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-fixed active:scale-90 transition-all">
          <span class="material-symbols-outlined text-[28px]">add</span>
        </button>

        <!-- Overlay do Modal -->
        <div id="add-item-overlay" class="fixed inset-0 bg-black/50 z-50 opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-sm"></div>

        <!-- Bottom Sheet Modal -->
        <!-- Bottom Sheet Modal -->
        <div id="add-item-modal" class="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl z-50 transform translate-y-full transition-transform duration-300 flex flex-col max-h-[85vh]">
          <div class="w-12 h-1.5 bg-outline/30 rounded-full mx-auto mt-3 mb-1"></div>
          <div class="px-5 py-3.5 flex-1 overflow-y-auto pb-safe">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-bold text-on-surface" id="modal-item-title">Adicionar Item</h3>
              <button type="button" id="btn-fechar-item-modal-x" class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            
            <form id="form-add-item" class="flex flex-col gap-3 pb-2">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" for="item-name">Nome do Produto *</label>
                <div class="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 px-3">
                  <input id="item-name" type="text" class="w-full h-full bg-transparent outline-none text-sm text-on-surface font-semibold placeholder:text-outline/60 placeholder:font-normal" placeholder="Ex: Arroz 5kg" required autocomplete="off">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" for="item-price" title="Preço unitário ou por Kg">Preço Unitário</label>
                  <div class="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 overflow-hidden">
                    <div class="pl-3 pr-1.5 h-full flex items-center justify-center text-on-surface-variant font-bold text-xs shrink-0">R$</div>
                    <input id="item-price" type="number" min="0" step="0.01" class="w-full h-full pr-3 bg-transparent outline-none text-sm text-on-surface font-semibold placeholder:text-outline/60 placeholder:font-normal" placeholder="0,00">
                  </div>
                </div>
                
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" for="item-qtd">Quantidade</label>
                  <div class="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 px-2">
                    <input id="item-qtd" type="number" min="0.001" step="any" value="1" class="w-full h-full bg-transparent outline-none text-sm text-on-surface text-center font-bold" required>
                    <div class="w-[1px] h-6 bg-outline-variant/40 mx-1 shrink-0"></div>
                    <select id="item-unit" class="h-full bg-transparent outline-none text-primary font-bold text-xs pr-1 appearance-none cursor-pointer">
                      ${UNITS.map(u => `<option value="${u.value}">${u.label}</option>`).join('')}
                    </select>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" for="item-category">Categoria</label>
                <div class="relative">
                  <select id="item-category" class="w-full h-11 px-3.5 pr-8 bg-surface-container-low text-on-surface text-sm font-semibold rounded-xl border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer appearance-none">
                    <option value="Mercado">🛒 Mercado</option>
                    <option value="Mercearia">🏪 Mercearia</option>
                    <option value="Hortifrúti">🥬 Hortifrúti</option>
                    <option value="Padaria">🥖 Padaria</option>
                    <option value="Açougue">🥩 Açougue</option>
                    <option value="Bebidas">🥤 Bebidas</option>
                    <option value="Limpeza">🧹 Limpeza</option>
                    <option value="Higiene">🧴 Higiene</option>
                    <option value="Farmácia">💊 Farmácia</option>
                    <option value="Festa">🎈 Festa</option>
                    <option value="Pet Shop">🐾 Pet Shop</option>
                    <option value="Outros">📦 Outros</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              <div class="mt-3 flex gap-2.5">
                <button type="button" id="btn-cancel-add-item" class="flex-1 h-11 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs hover:bg-surface-container-highest transition-all">Cancelar</button>
                <button type="submit" id="btn-submit-item" class="flex-[1.5] h-11 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md flex items-center justify-center gap-1.5 hover:bg-primary-container active:scale-[0.98] transition-all">
                  <span class="material-symbols-outlined text-[18px]">check</span> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Overlay Concluir Compra -->
        <div id="concluir-compra-overlay" class="fixed inset-0 bg-black/50 z-50 opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-xs flex items-end justify-center">
          <div id="concluir-compra-modal" class="w-full max-w-lg bg-surface rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 transform translate-y-full transition-transform duration-300 pb-safe max-h-[90vh] overflow-y-auto">
            <div class="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1"></div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
                </span>
                <h3 class="font-headline-sm font-bold text-on-surface text-lg">Concluir Compra</h3>
              </div>
              <button type="button" id="btn-fechar-modal-concluir" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-all">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Resumo dos Valores -->
            <div class="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
              <div class="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Lista:</span>
                <span class="font-bold text-on-surface text-sm" id="concluir-nome-lista">${this.currentList.name}</span>
              </div>
              <div class="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Orçamento Previsto:</span>
                <span class="font-semibold text-on-surface" id="concluir-orcamento-display">${this.currentList.budget ? `R$ ${this.currentList.budget.toFixed(2).replace('.', ',')}` : 'Livre'}</span>
              </div>
              <div class="flex justify-between items-center text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
                <span id="concluir-status-economia-label">Balanço:</span>
                <span class="font-bold text-sm" id="concluir-status-economia-val">R$ 0,00</span>
              </div>
            </div>

            <form id="form-concluir-compra" class="flex flex-col gap-3.5">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Valor Real Pago no Caixa (R$) *</label>
                <div class="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 overflow-hidden px-3">
                  <span class="text-on-surface-variant font-bold text-sm mr-1.5">R$</span>
                  <input type="number" id="concluir-total-pago" step="0.01" min="0" required
                    class="w-full h-full bg-transparent text-on-surface font-body-md text-sm outline-none font-bold">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Supermercado / Loja</label>
                  <input type="text" id="concluir-supermercado" value="${this.currentList.store || ''}" placeholder="Ex: Atacadão, Extra"
                    class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Data da Compra *</label>
                  <input type="date" id="concluir-data-compra" required
                    class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                </div>
              </div>

              <div class="flex flex-col gap-2 pt-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="concluir-abater-carteira" checked class="w-4 h-4 text-primary rounded accent-primary cursor-pointer">
                  <span class="font-body-sm text-xs text-on-surface">Registrar saída e deduzir do saldo da <strong>Carteira</strong></span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="concluir-desmarcar-itens" class="w-4 h-4 text-primary rounded accent-primary cursor-pointer">
                  <span class="font-body-sm text-xs text-on-surface">Desmarcar itens após concluir para reutilizar lista</span>
                </label>
              </div>

              <button type="submit" id="btn-submit-concluir-compra"
                class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-2">
                <span class="material-symbols-outlined text-[20px]">task_alt</span>
                Gravar no Histórico & Concluir
              </button>
            </form>
          </div>
        </div>

        <!-- Overlay Compartilhar Lista -->
        <div id="compartilhar-lista-overlay" class="fixed inset-0 bg-black/50 z-50 opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-xs flex items-end justify-center">
          <div id="compartilhar-lista-modal" class="w-full max-w-lg bg-surface rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 transform translate-y-full transition-transform duration-300 pb-safe max-h-[90vh] overflow-y-auto">
            <div class="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1"></div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">share</span>
                </span>
                <div>
                  <h3 class="font-headline-sm font-bold text-on-surface text-lg">Compartilhar Lista</h3>
                  <span class="font-body-sm text-xs text-on-surface-variant" id="share-lista-nome">${this.currentList.name}</span>
                </div>
              </div>
              <button type="button" id="btn-fechar-modal-share" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-all">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Seletor de Permissão (Aberto vs Fechado) -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs font-bold text-on-surface">Modo de Permissão:</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label class="cursor-pointer">
                  <input type="radio" name="share-mode-perm" value="aberto" checked class="peer sr-only">
                  <div class="p-3 rounded-2xl border border-outline-variant/40 peer-checked:bg-secondary-container/40 peer-checked:border-secondary peer-checked:text-on-secondary-container transition-all flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 font-bold text-xs">
                      <span class="w-2 h-2 rounded-full bg-secondary"></span>
                      Modo Aberto (Colaborativo)
                    </div>
                    <span class="text-[11px] text-on-surface-variant leading-tight">Convidado pode adicionar produtos, editar e marcar checks.</span>
                  </div>
                </label>

                <label class="cursor-pointer">
                  <input type="radio" name="share-mode-perm" value="fechado" class="peer sr-only">
                  <div class="p-3 rounded-2xl border border-outline-variant/40 peer-checked:bg-tertiary-container/40 peer-checked:border-tertiary peer-checked:text-on-tertiary-container transition-all flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 font-bold text-xs">
                      <span class="w-2 h-2 rounded-full bg-tertiary"></span>
                      Modo Fechado (Somente Leitura)
                    </div>
                    <span class="text-[11px] text-on-surface-variant leading-tight">Convidado visualiza os itens e gastos em tempo real, sem editar.</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Código & WhatsApp -->
            <div class="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="font-label-sm text-xs font-bold text-on-surface">Código & Link para WhatsApp</span>
                <button type="button" id="btn-renovar-codigo" class="text-xs text-primary font-bold flex items-center gap-1 hover:underline active:scale-95 transition-all" title="Gerar novo código">
                  <span class="material-symbols-outlined text-[14px]">autorenew</span> Renovar
                </button>
              </div>
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 gap-3">
                <span class="font-headline-sm font-extrabold tracking-widest text-primary text-xl text-center sm:text-left" id="display-invite-code">LST-.....</span>
                <div class="flex items-center justify-center gap-2">
                  <button type="button" id="btn-copiar-codigo" class="h-9 px-3 rounded-lg bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high active:scale-95 transition-all">
                    <span class="material-symbols-outlined text-[16px]">content_copy</span> Copiar
                  </button>
                  <button type="button" id="btn-whatsapp-share" class="h-9 px-3 rounded-lg bg-[#25D366] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#1EBE5D] active:scale-95 transition-all shadow-xs">
                    <span class="material-symbols-outlined text-[16px]">chat</span> WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <!-- Convidar por E-mail -->
            <div class="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
              <span class="font-label-sm text-xs font-bold text-on-surface">Convidar por E-mail</span>
              <form id="form-share-email" class="flex gap-2">
                <input type="email" id="share-input-email" placeholder="amigo@email.com" required
                  class="flex-1 h-11 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-xs border border-outline-variant/40 outline-none focus:border-primary">
                <button type="submit" id="btn-submit-share-email" class="h-11 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs active:scale-95 transition-all">
                  Enviar
                </button>
              </form>
              <div id="share-email-feedback" class="hidden text-xs font-medium mt-1"></div>
            </div>

            <!-- Pessoas com Acesso -->
            <div class="flex flex-col gap-2">
              <span class="font-label-sm text-xs font-bold text-on-surface">Pessoas com Acesso</span>
              <div id="collaborators-list-container" class="flex flex-col gap-2">
                <span class="text-xs text-outline py-2">Carregando colaboradores...</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
  },

  calculateItemTotal(price, qty, unit) {
    if (!price) return 0;
    const q = parseFloat(qty) || 1;
    const p = parseFloat(price) || 0;
    
    // Se a unidade for gramas ou ml, e a quantidade for > 0, assume-se que o preço 
    // informado é por KG ou Litro (padrão de mercado para carnes, frios, etc).
    // EX: Preço: 20, Quantidade: 500, Unidade: g -> Total: 10
    if (unit === 'g' || unit === 'ml') {
      return p * (q / 1000);
    }
    
    return p * q;
  },

  updateHeroStats() {
    const items = this.currentList.items || [];
    let totalGasto = 0;
    
    items.forEach(item => {
      if (item.checked) {
        const itemPrice = item.price !== undefined ? item.price : (item.preco || 0);
        const itemQty = item.quantity !== undefined ? item.quantity : (item.quantidade || 1);
        const itemUnit = item.unit || item.unidade || 'un';
        totalGasto += this.calculateItemTotal(itemPrice, itemQty, itemUnit);
      }
    });

    document.getElementById('hero-total-gasto').textContent = `R$ ${totalGasto.toFixed(2).replace('.', ',')}`;
    document.getElementById('items-count-badge').textContent = `${items.length} itens`;

    if (this.currentList.budget) {
      const budget = this.currentList.budget;
      const restante = budget - totalGasto;
      let percent = (totalGasto / budget) * 100;
      if (percent > 100) percent = 100;

      const restEl = document.getElementById('hero-restante');
      const statText = document.getElementById('hero-status-text');
      const bar = document.getElementById('hero-progress-bar');

      if (restante >= 0) {
        restEl.textContent = `R$ ${restante.toFixed(2).replace('.', ',')}`;
        statText.textContent = 'Disponível';
        if (bar) bar.className = 'h-full bg-secondary-container transition-all duration-500 ease-out';
      } else {
        restEl.textContent = `- R$ ${Math.abs(restante).toFixed(2).replace('.', ',')}`;
        statText.textContent = 'Estourado';
        if (bar) bar.className = 'h-full bg-error transition-all duration-500 ease-out';
      }
      
      setTimeout(() => {
        if(bar) bar.style.width = `${percent}%`;
      }, 50);
    }
  },

  renderItems() {
    const container = document.getElementById('items-container');
    const items = this.currentList.items || [];

    if (items.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center p-8 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/50 mt-4">
          <div class="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-4xl text-outline">add_shopping_cart</span>
          </div>
          <h3 class="font-body-lg font-bold text-on-surface mb-1">Sua lista está vazia</h3>
          <p class="font-body-sm text-on-surface-variant">Adicione itens para começar a acompanhar suas compras.</p>
        </div>
      `;
      return;
    }

    // Ordena: itens não marcados primeiro (mais recentes no topo), depois comprados
    const sortedItems = [...items].sort((a, b) => {
      if (Boolean(a.checked) === Boolean(b.checked)) {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      return a.checked ? 1 : -1;
    });

    const html = `
      <div class="product-items-container">
        ${sortedItems.map(item => {
          const isChecked = Boolean(item.checked);
          const itemName = item.name || item.nome || 'Item sem nome';
          const itemPrice = item.price !== undefined ? Number(item.price) : (Number(item.preco) || 0);
          const itemQty = item.quantity !== undefined ? Number(item.quantity) : (Number(item.quantidade) || 1);
          const itemUnit = item.unit || item.unidade || 'un';
          
          const total = this.calculateItemTotal(itemPrice, itemQty, itemUnit);
          
          return `
            <article class="mobile-product-card ${isChecked ? 'item-comprado' : ''}" data-id="${item.id}">
              <div class="product-left-col">
                <button type="button" class="btn-toggle-check w-6 h-6 rounded-lg ${isChecked ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-transparent hover:bg-surface-container-highest border border-outline-variant/60'} flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-90" data-id="${item.id}" title="${isChecked ? 'Desmarcar' : 'Marcar como comprado'}">
                  <span class="material-symbols-outlined text-[18px]">check</span>
                </button>
                
                <div class="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <span class="product-name ${isChecked ? 'line-through text-outline' : 'text-on-surface'} cursor-pointer btn-edit-trigger truncate" data-id="${item.id}" title="Toque para editar">
                    ${escapeHtml(itemName)}
                  </span>
                  
                  <!-- Unidade e Quantidade AO LADO do produto -->
                  <div class="product-qty-control shrink-0" onclick="event.stopPropagation()">
                    <button type="button" class="product-qty-btn btn-qty-minus" data-id="${item.id}" title="Diminuir quantidade">−</button>
                    <span class="text-xs font-bold text-on-surface">${itemQty} ${itemUnit}</span>
                    <button type="button" class="product-qty-btn btn-qty-plus" data-id="${item.id}" title="Aumentar quantidade">+</button>
                  </div>
                </div>
              </div>

              <!-- Preço na lateral direita (não abaixo) + Editar + Excluir -->
              <div class="product-right-col shrink-0 flex items-center gap-1.5">
                ${total <= 0 ? `
                  <button type="button" class="btn-item-price-chip sem-preco btn-edit-trigger" data-id="${item.id}" title="Toque para colocar o preço">
                    🏷️ Colocar Preço
                  </button>
                ` : `
                  <button type="button" class="btn-item-price-chip com-preco btn-edit-trigger" data-id="${item.id}" title="${itemQty > 1 ? `${itemQty} ${itemUnit} × ${formatCurrency(itemPrice)}` : 'Toque para alterar o preço'}">
                    ${formatCurrency(total)}
                  </button>
                `}
                <button type="button" class="btn-item-edit btn-edit-trigger" data-id="${item.id}" title="Editar produto">
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button type="button" class="btn-item-trash" data-id="${item.id}" title="Excluir este item">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.btn-toggle-check').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleItemCheck(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeItemQuantity(btn.dataset.id, -1);
      });
    });

    container.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeItemQuantity(btn.dataset.id, 1);
      });
    });

    container.querySelectorAll('.btn-edit-trigger').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditModal(el.dataset.id);
      });
    });

    container.querySelectorAll('.btn-item-trash').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteItem(btn.dataset.id);
      });
    });
  },

  async deleteItem(itemId) {
    if (!confirm('Deseja realmente remover este item da lista?')) return;
    this.currentList.items = (this.currentList.items || []).filter(i => i.id !== itemId);
    this.updateHeroStats();
    this.renderItems();
    try {
      await updateLista(this.currentList.id, { items: this.currentList.items });
    } catch (e) {
      console.error('Falha ao excluir item:', e);
    }
  },

  async changeItemQuantity(itemId, delta) {
    const item = this.currentList.items.find(i => i.id === itemId);
    if (item) {
      let qty = parseFloat(item.quantity !== undefined ? item.quantity : (item.quantidade || 1));
      
      // Se for g ou ml, altera de 100 em 100. Se for un, kg, L, altera de 1 em 1.
      const step = (item.unit === 'g' || item.unit === 'ml') ? 100 : 1;
      
      qty += (delta * step);
      if (qty < step) qty = step; // Minimo

      item.quantity = qty;
      
      this.updateHeroStats();
      this.renderItems();

      try {
        await updateLista(this.currentList.id, { items: this.currentList.items });
      } catch(e) {
        console.error('Failed to update qty', e);
      }
    }
  },

  async toggleItemCheck(itemId) {
    const item = this.currentList.items.find(i => i.id === itemId);
    if (item) {
      item.checked = !item.checked;
      
      this.updateHeroStats();
      this.renderItems();

      try {
        await updateLista(this.currentList.id, { items: this.currentList.items });
      } catch(e) {
        console.error('Failed to update list', e);
      }
    }
  },

  openAddModal() {
    this.editingItemId = null;
    document.getElementById('modal-item-title').textContent = 'Adicionar Item';
    const btnSubmit = document.getElementById('btn-submit-item');
    btnSubmit.innerHTML = '<span class="material-symbols-outlined text-[18px]">add_shopping_cart</span> Adicionar';
    
    document.getElementById('form-add-item').reset();
    
    const catSelect = document.getElementById('item-category');
    if (catSelect) catSelect.value = 'Mercado';

    document.getElementById('item-unit').value = 'un';

    this.showModal();
  },

  openEditModal(itemId) {
    this.editingItemId = itemId;
    const item = this.currentList.items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('modal-item-title').textContent = 'Editar Item';
    const btnSubmit = document.getElementById('btn-submit-item');
    btnSubmit.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Salvar';

    const itemName = item.name || item.nome || '';
    const itemPrice = item.price !== undefined ? item.price : item.preco;
    const itemQty = item.quantity !== undefined ? item.quantity : (item.quantidade || 1);
    const itemUnit = item.unit || item.unidade || 'un';
    const categoryName = item.category || item.categoria || 'Mercado';

    document.getElementById('item-name').value = itemName;
    document.getElementById('item-price').value = itemPrice ? itemPrice.toString() : '';
    document.getElementById('item-qtd').value = itemQty;
    document.getElementById('item-unit').value = itemUnit;

    const catSelect = document.getElementById('item-category');
    if (catSelect) catSelect.value = categoryName;

    this.showModal();
  },

  showModal() {
    const overlay = document.getElementById('add-item-overlay');
    const modal = document.getElementById('add-item-modal');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.remove('translate-y-full');
    window.admobService?.onModalOpen();
    setTimeout(() => document.getElementById('item-name')?.focus(), 300);
  },

  hideModal() {
    const overlay = document.getElementById('add-item-overlay');
    const modal = document.getElementById('add-item-modal');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.add('translate-y-full');
    window.admobService?.onModalClose();
  },

  openConcluirModal() {
    const overlay = document.getElementById('concluir-compra-overlay');
    const modal = document.getElementById('concluir-compra-modal');
    if (!overlay || !modal) return;

    // Calcula total gasto atual dos itens checados (ou total geral se nenhum checado)
    const items = this.currentList.items || [];
    let totalChecked = 0;
    let totalGeral = 0;
    items.forEach(item => {
      const p = item.price !== undefined ? item.price : (item.preco || 0);
      const q = item.quantity !== undefined ? item.quantity : (item.quantidade || 1);
      const u = item.unit || item.unidade || 'un';
      const tot = this.calculateItemTotal(p, q, u);
      totalGeral += tot;
      if (item.checked) totalChecked += tot;
    });

    const valorSugerido = totalChecked > 0 ? totalChecked : totalGeral;
    const inputTotal = document.getElementById('concluir-total-pago');
    if (inputTotal) inputTotal.value = valorSugerido > 0 ? valorSugerido.toFixed(2) : '';

    const inputData = document.getElementById('concluir-data-compra');
    if (inputData && !inputData.value) {
      inputData.value = new Date().toISOString().split('T')[0];
    }

    const orcamento = Number(this.currentList.budget) || 0;
    const econLabel = document.getElementById('concluir-status-economia-label');
    const econVal = document.getElementById('concluir-status-economia-val');

    if (orcamento > 0) {
      const diff = orcamento - valorSugerido;
      if (diff >= 0) {
        if (econLabel) econLabel.textContent = 'Economia Estimada:';
        if (econVal) {
          econVal.textContent = `+ ${formatCurrency(diff)}`;
          econVal.className = 'font-bold text-sm text-secondary';
        }
      } else {
        if (econLabel) econLabel.textContent = 'Estouro Estimado:';
        if (econVal) {
          econVal.textContent = `- ${formatCurrency(Math.abs(diff))}`;
          econVal.className = 'font-bold text-sm text-error';
        }
      }
    } else {
      if (econLabel) econLabel.textContent = 'Total da Compra:';
      if (econVal) {
        econVal.textContent = formatCurrency(valorSugerido);
        econVal.className = 'font-bold text-sm text-primary';
      }
    }

    overlay.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.remove('translate-y-full');
    window.admobService?.onModalOpen();
  },

  closeConcluirModal() {
    const overlay = document.getElementById('concluir-compra-overlay');
    const modal = document.getElementById('concluir-compra-modal');
    if (overlay && modal) {
      overlay.classList.add('opacity-0', 'pointer-events-none');
      modal.classList.add('translate-y-full');
      window.admobService?.onModalClose();
    }
  },

  async openCompartilharModal() {
    const overlay = document.getElementById('compartilhar-lista-overlay');
    const modal = document.getElementById('compartilhar-lista-modal');
    if (!overlay || !modal) return;

    overlay.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.remove('translate-y-full');
    window.admobService?.onModalOpen();

    const perm = document.querySelector('input[name="share-mode-perm"]:checked')?.value || 'aberto';
    try {
      const codeObj = await shareService.createShareInviteCode(this.currentList.id, perm);
      const displayCode = document.getElementById('display-invite-code');
      if (displayCode) displayCode.textContent = codeObj.inviteCode;
      this.currentList.inviteCode = codeObj.inviteCode;
      this.currentList.shareLink = codeObj.shareLink;
    } catch (e) {
      console.warn('Aviso ao sincronizar código:', e);
    }

    await this.loadCollaborators();
  },

  closeCompartilharModal() {
    const overlay = document.getElementById('compartilhar-lista-overlay');
    const modal = document.getElementById('compartilhar-lista-modal');
    if (overlay && modal) {
      overlay.classList.add('opacity-0', 'pointer-events-none');
      modal.classList.add('translate-y-full');
      window.admobService?.onModalClose();
    }
  },

  async loadCollaborators() {
    const container = document.getElementById('collaborators-list-container');
    if (!container) return;

    try {
      const list = await shareService.getListCollaborators(this.currentList.id);
      const filtered = list.filter(s => s.shared_with_email && !s.shared_with_email.includes('convite_link@'));

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs text-outline text-center">
            Nenhum colaborador adicionado por e-mail ainda. Compartilhe o código acima pelo WhatsApp!
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(col => `
        <div class="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
              ${col.shared_with_email.charAt(0).toUpperCase()}
            </span>
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-xs text-on-surface truncate">${escapeHtml(col.shared_with_email)}</span>
              <span class="text-[10px] text-outline">${col.permission === 'aberto' ? '🟢 Modo Aberto' : '🔒 Modo Fechado'}</span>
            </div>
          </div>
          <button class="btn-remove-collab text-error text-xs font-semibold p-1 hover:bg-error-container/30 rounded" data-id="${col.id}">
            Remover
          </button>
        </div>
      `).join('');

      container.querySelectorAll('.btn-remove-collab').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Deseja remover o acesso deste colaborador?')) {
            await shareService.removeCollaborator(btn.dataset.id);
            this.loadCollaborators();
          }
        });
      });
    } catch (e) {
      container.innerHTML = '<span class="text-xs text-outline">Erro ao carregar colaboradores.</span>';
    }
  },

  attachEvents() {
    document.getElementById('btn-back-dashboard')?.addEventListener('click', () => {
      page('/dashboard');
    });

    // Editar Informações da Lista
    document.getElementById('btn-detalhe-editar-lista')?.addEventListener('click', () => {
      this.openEditarListaModal();
    });

    // Excluir Permanentemente a Lista
    document.getElementById('btn-detalhe-excluir-lista')?.addEventListener('click', () => {
      this.openExcluirListaModal();
    });

    // Compartilhar Lista
    const btnShareHeader = document.getElementById('btn-compartilhar-lista');
    const btnCloseShare = document.getElementById('btn-fechar-modal-share');
    const overlayShare = document.getElementById('compartilhar-lista-overlay');
    const btnRenovarCode = document.getElementById('btn-renovar-codigo');
    const btnCopiarCode = document.getElementById('btn-copiar-codigo');
    const btnWpp = document.getElementById('btn-whatsapp-share');
    const formShareEmail = document.getElementById('form-share-email');

    btnShareHeader?.addEventListener('click', () => this.openCompartilharModal());
    btnCloseShare?.addEventListener('click', () => this.closeCompartilharModal());
    overlayShare?.addEventListener('click', (e) => {
      if (e.target === overlayShare) this.closeCompartilharModal();
    });

    btnRenovarCode?.addEventListener('click', async () => {
      const perm = document.querySelector('input[name="share-mode-perm"]:checked')?.value || 'aberto';
      btnRenovarCode.textContent = 'Gerando...';
      try {
        const codeObj = await shareService.createShareInviteCode(this.currentList.id, perm, true);
        const displayCode = document.getElementById('display-invite-code');
        if (displayCode) displayCode.textContent = codeObj.inviteCode;
        this.currentList.inviteCode = codeObj.inviteCode;
        this.currentList.shareLink = codeObj.shareLink;
      } catch (err) {
        alert('Erro ao renovar código: ' + err.message);
      } finally {
        btnRenovarCode.innerHTML = '<span class="material-symbols-outlined text-[14px]">autorenew</span> Renovar';
      }
    });

    btnCopiarCode?.addEventListener('click', () => {
      const code = this.currentList.inviteCode;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          alert(`Código copiado: ${code}`);
        }).catch(() => {
          prompt('Copie o código:', code);
        });
      }
    });

    btnWpp?.addEventListener('click', () => {
      const code = this.currentList.inviteCode;
      const perm = document.querySelector('input[name="share-mode-perm"]:checked')?.value || 'aberto';
      const permDesc = perm === 'aberto' ? 'Modo Aberto (pode adicionar e marcar itens)' : 'Modo Fechado (somente leitura)';
      const msg = `🛒 *Convite para Lista de Compras - Compras Plus*\nVocê foi convidado para a lista *${this.currentList.name}* no *${permDesc}*.\n\nCódigo do Convite: *${code}*\nOu abra diretamente no aplicativo:\n${this.currentList.shareLink || window.location.href}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    });

    formShareEmail?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('share-input-email').value.trim();
      const feedback = document.getElementById('share-email-feedback');
      const perm = document.querySelector('input[name="share-mode-perm"]:checked')?.value || 'aberto';
      const btn = document.getElementById('btn-submit-share-email');

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        await shareService.shareListWithEmail(this.currentList.id, email, perm);
        feedback.textContent = `Convite enviado com sucesso para ${email}!`;
        feedback.className = 'text-xs font-semibold text-secondary mt-1';
        document.getElementById('share-input-email').value = '';
        this.loadCollaborators();
      } catch (err) {
        feedback.textContent = err.message || 'Erro ao compartilhar.';
        feedback.className = 'text-xs font-semibold text-error mt-1';
      } finally {
        feedback.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Enviar';
      }
    });

    // Modal Concluir Compra
    const btnAbrirConcluir = document.getElementById('btn-abrir-concluir-compra');
    const btnFecharConcluir = document.getElementById('btn-fechar-modal-concluir');
    const overlayConcluir = document.getElementById('concluir-compra-overlay');
    const formConcluir = document.getElementById('form-concluir-compra');

    btnAbrirConcluir?.addEventListener('click', () => this.openConcluirModal());
    btnFecharConcluir?.addEventListener('click', () => this.closeConcluirModal());
    overlayConcluir?.addEventListener('click', (e) => {
      if (e.target === overlayConcluir) this.closeConcluirModal();
    });

    formConcluir?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-concluir-compra');
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Gravando...';

      try {
        const totalPago = parseFloat(document.getElementById('concluir-total-pago').value) || 0;
        const mercado = document.getElementById('concluir-supermercado').value.trim();
        const dataCompra = document.getElementById('concluir-data-compra').value;
        const desmarcar = document.getElementById('concluir-desmarcar-itens')?.checked;

        const orcamento = Number(this.currentList.budget) || 0;
        const savings = orcamento > 0 ? (orcamento - totalPago) : 0;

        // 1. Grava no Histórico Oficial
        await savePurchaseHistory({
          listId: this.currentList.id,
          listName: this.currentList.name,
          category: this.currentList.category || 'Mercado',
          supermarket: mercado || this.currentList.store || '',
          budget: orcamento,
          totalSpent: totalPago,
          savings,
          items: (this.currentList.items || []).map(i => ({ ...i })),
          purchasedAt: dataCompra ? new Date(dataCompra + 'T12:00:00').toISOString() : new Date().toISOString()
        });

        // 2. Atualiza a Lista
        this.currentList.status = 'concluida';
        this.currentList.concluidaAt = new Date().toISOString();
        this.currentList.totalGastoFinal = totalPago;
        if (mercado) this.currentList.store = mercado;

        if (desmarcar && this.currentList.items) {
          this.currentList.items.forEach(i => i.checked = false);
        }

        await updateLista(this.currentList.id, {
          status: 'concluida',
          concluidaAt: this.currentList.concluidaAt,
          totalGastoFinal: totalPago,
          store: this.currentList.store,
          items: this.currentList.items
        });

        this.closeConcluirModal();
        
        // Exibe intersticial do AdMob (Nativo no Android ou Overlay de Teste na Web)
        const admob = window.admobManager || window.admobService;
        if (admob && typeof admob.showInterstitial === 'function') {
          admob.showInterstitial(() => {
            page('/historico');
          });
        } else {
          page('/historico');
        }
      } catch (err) {
        alert('Erro ao concluir compra: ' + err.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span class="material-symbols-outlined text-[20px]">task_alt</span> Gravar no Histórico & Concluir';
      }
    });

    const overlay = document.getElementById('add-item-overlay');
    const fab = document.getElementById('btn-add-item-fab');
    const btnCancel = document.getElementById('btn-cancel-add-item');
    const btnCloseX = document.getElementById('btn-fechar-item-modal-x');
    const form = document.getElementById('form-add-item');

    fab?.addEventListener('click', () => this.openAddModal());
    overlay?.addEventListener('click', () => this.hideModal());
    btnCancel?.addEventListener('click', () => this.hideModal());
    btnCloseX?.addEventListener('click', () => this.hideModal());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('item-name').value.trim();
      const priceVal = document.getElementById('item-price').value;
      const price = priceVal ? parseFloat(priceVal.replace(',', '.')) : 0;
      const qty = parseFloat(document.getElementById('item-qtd').value) || 1;
      const unit = document.getElementById('item-unit').value || 'un';
      const category = document.getElementById('item-category')?.value || 'Mercado';

      if (!name) return;

      if (this.editingItemId) {
        const item = this.currentList.items.find(i => i.id === this.editingItemId);
        if (item) {
          item.name = name;
          item.price = price;
          item.quantity = qty;
          item.unit = unit;
          item.category = category;
        }
      } else {
        const newItem = {
          id: 'item_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
          name,
          price,
          quantity: qty,
          unit,
          category,
          checked: false,
          createdAt: new Date().toISOString()
        };
        this.currentList.items.push(newItem);
      }
      
      this.hideModal();
      this.updateHeroStats();
      this.renderItems();

      try {
        await updateLista(this.currentList.id, { items: this.currentList.items });
      } catch(e) {
        console.error('Failed to save item', e);
      }
    });
  },

  openEditarListaModal() {
    const old = document.getElementById('modal-detalhe-editar-lista');
    if (old) old.remove();

    const list = this.currentList;
    const currentCat = (list.category || 'mercado').toLowerCase();
    const modal = document.createElement('div');
    modal.id = 'modal-detalhe-editar-lista';
    modal.className = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="w-full max-w-[600px] bg-surface rounded-t-3xl shadow-2xl p-5 pb-10 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out]" id="modal-detalhe-editar-inner">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </span>
            <h2 class="font-headline-sm text-on-surface font-bold text-lg">Editar Informações da Lista</h2>
          </div>
          <button id="btn-modal-detalhe-editar-fechar" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <!-- Nome -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="detalhe-editar-nome">Nome da lista *</label>
            <input id="detalhe-editar-nome" type="text" value="${escapeHtml(list.name || '')}" placeholder="Ex: Mercado da semana" maxlength="50"
              class="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
          </div>

          <!-- Loja / Mercado -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="detalhe-editar-loja">Loja / Supermercado (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 px-3 gap-2">
              <span class="material-symbols-outlined text-on-surface-variant text-[18px]">storefront</span>
              <input id="detalhe-editar-loja" type="text" value="${escapeHtml(list.store || '')}" placeholder="Ex: Carrefour, Atacadão" maxlength="50"
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
                  <button type="button" class="detalhe-editar-cat-btn flex items-center gap-1.5 h-8 px-3 rounded-full border ${isActive ? 'border-primary text-primary bg-primary-fixed/30 font-bold' : 'border-outline-variant/40 bg-surface-container text-on-surface-variant font-semibold'} text-xs transition-all hover:border-primary hover:text-primary active:scale-95" data-value="${c.value}">
                    <span class="material-symbols-outlined text-[14px]">${c.icon}</span>
                    ${c.label}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Orçamento -->
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide" for="detalhe-editar-orcamento">Orçamento (opcional)</label>
            <div class="flex items-center bg-surface-container rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 overflow-hidden">
              <div class="pl-4 pr-1 h-full flex items-center justify-center text-on-surface-variant font-bold text-sm shrink-0">
                R$
              </div>
              <input id="detalhe-editar-orcamento" type="number" min="0" step="0.01" value="${list.budget || ''}" placeholder="0,00"
                class="w-full h-full pr-4 bg-transparent text-on-surface font-body-md text-sm outline-none">
            </div>
          </div>
        </div>

        <button id="btn-modal-detalhe-salvar" class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-1">
          <span class="material-symbols-outlined text-[20px]">check</span>
          Salvar Alterações
        </button>
        
        <div id="modal-detalhe-error" class="hidden text-error text-sm text-center font-medium"></div>
      </div>
    `;

    document.body.appendChild(modal);
    window.admobService?.onModalOpen();

    let selectedCategoria = currentCat;
    const catBtns = modal.querySelectorAll('.detalhe-editar-cat-btn');
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
    modal.querySelector('#btn-modal-detalhe-editar-fechar').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#btn-modal-detalhe-salvar').addEventListener('click', async () => {
      const nome = modal.querySelector('#detalhe-editar-nome').value.trim();
      const loja = modal.querySelector('#detalhe-editar-loja').value.trim();
      const orcamento = parseFloat(modal.querySelector('#detalhe-editar-orcamento').value) || 0;
      const errorEl = modal.querySelector('#modal-detalhe-error');

      if (!nome) {
        errorEl.textContent = 'O nome da lista não pode ficar vazio.';
        errorEl.classList.remove('hidden');
        return;
      }

      const btn = modal.querySelector('#btn-modal-detalhe-salvar');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Salvando...';

      try {
        await updateLista(list.id, {
          name: nome,
          store: loja,
          category: selectedCategoria,
          budget: orcamento
        });

        // Atualiza objeto em memória
        this.currentList.name = nome;
        this.currentList.store = loja;
        this.currentList.category = selectedCategoria;
        this.currentList.budget = orcamento;

        // Atualiza no appStore se existir
        if (appStore.state.lists) {
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
        }

        // Atualiza elementos da interface
        const headerTitle = document.getElementById('detalhe-nome-header');
        if (headerTitle) headerTitle.textContent = nome;

        const storeHeader = document.getElementById('detalhe-store-header');
        const storeText = document.getElementById('detalhe-store-text');
        if (storeHeader && storeText) {
          storeText.textContent = loja;
          if (loja) {
            storeHeader.classList.remove('hidden');
          } else {
            storeHeader.classList.add('hidden');
          }
        }

        const heroBudget = document.getElementById('hero-orcamento');
        if (heroBudget) {
          heroBudget.textContent = orcamento > 0 ? `R$ ${orcamento.toFixed(2).replace('.', ',')}` : 'Livre';
        }

        this.updateHeroStats();
        closeModal();
        showToast('✅ Lista atualizada com sucesso!', 'success');
      } catch (err) {
        errorEl.textContent = 'Erro ao salvar alterações: ' + err.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">check</span> Salvar Alterações';
      }
    });
  },

  openExcluirListaModal() {
    const old = document.getElementById('modal-detalhe-excluir-lista');
    if (old) old.remove();

    const list = this.currentList;
    const qtdItens = (list.items || []).length;
    const modal = document.createElement('div');
    modal.id = 'modal-detalhe-excluir-lista';
    modal.className = 'fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="w-full max-w-[460px] bg-surface rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-[slideUp_0.25s_ease-out] border border-outline-variant/30" id="modal-detalhe-excluir-inner">
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

        <div id="modal-detalhe-excluir-error" class="hidden text-error text-xs font-semibold bg-error-container/20 p-2.5 rounded-xl"></div>

        <div class="flex items-center gap-3 mt-2">
          <button type="button" id="btn-modal-detalhe-cancelar"
            class="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high active:scale-95 transition-all">
            Cancelar
          </button>
          <button type="button" id="btn-modal-detalhe-confirmar"
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
    modal.querySelector('#btn-modal-detalhe-cancelar').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#btn-modal-detalhe-confirmar').addEventListener('click', async () => {
      const btn = modal.querySelector('#btn-modal-detalhe-confirmar');
      const errEl = modal.querySelector('#modal-detalhe-excluir-error');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Excluindo...';

      try {
        await deleteLista(list.id);
        if (appStore.state.lists) {
          appStore.state.lists = appStore.state.lists.filter(l => String(l.id) !== String(list.id));
        }
        closeModal();
        showToast(`🗑️ Lista "${list.name}" excluída com sucesso!`, 'success');
        page('/dashboard');
      } catch (err) {
        errEl.textContent = 'Erro ao excluir lista: ' + err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete</span> Sim, Excluir';
      }
    });
  }
};
