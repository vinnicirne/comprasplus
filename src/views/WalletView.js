import { appStore } from '../store/appStore.js';
import * as walletService from '../services/walletService.js';
import { formatCurrency, formatDateBR, escapeHtml } from '../utils/formatters.js';
import { showToast } from '../utils/toast.js';

export const WalletView = {
  currentFilter: {
    year: new Date().getFullYear(),
    month: 'all'
  },
  walletEntries: [],
  purchaseHistory: [],

  async render() {
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    const routerView = document.getElementById('router-view');
    if (!routerView) return;

    routerView.innerHTML = `
      <main class="min-h-screen bg-surface flex flex-col pb-32">
        <!-- Top Bar -->
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-md pt-safe px-space-md h-16 flex items-center justify-between border-b border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-2">
            <span class="w-10 h-10 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </span>
            <div>
              <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">Carteira</h1>
              <span class="font-body-sm text-on-surface-variant text-xs">Gestão de saldo e receitas</span>
            </div>
          </div>
          <button id="btn-nova-entrada-top" class="h-10 px-3 rounded-xl bg-primary text-on-primary font-label-md font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>Nova Entrada</span>
          </button>
        </header>

        <div class="p-space-md flex flex-col gap-space-md max-w-lg mx-auto w-full">
          <!-- Filtros de Período -->
          <div class="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div class="flex items-center gap-1 flex-1">
              <span class="material-symbols-outlined text-outline text-[18px] pl-2">calendar_month</span>
              <select id="filtro-carteira-ano" class="bg-transparent font-label-md text-on-surface font-semibold py-1.5 outline-none cursor-pointer w-full text-xs">
                ${[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => `
                  <option value="${y}" ${y === this.currentFilter.year ? 'selected' : ''}>Ano ${y}</option>
                `).join('')}
              </select>
            </div>
            <div class="w-[1px] h-6 bg-outline-variant/30"></div>
            <div class="flex items-center gap-1 flex-1">
              <select id="filtro-carteira-mes" class="bg-transparent font-label-md text-on-surface font-semibold py-1.5 outline-none cursor-pointer w-full text-xs pr-2">
                <option value="all" ${this.currentFilter.month === 'all' ? 'selected' : ''}>Todos os Meses</option>
                ${[
                  {v:1, l:'Janeiro'}, {v:2, l:'Fevereiro'}, {v:3, l:'Março'},
                  {v:4, l:'Abril'}, {v:5, l:'Maio'}, {v:6, l:'Junho'},
                  {v:7, l:'Julho'}, {v:8, l:'Agosto'}, {v:9, l:'Setembro'},
                  {v:10, l:'Outubro'}, {v:11, l:'Novembro'}, {v:12, l:'Dezembro'}
                ].map(m => `
                  <option value="${m.v}" ${String(m.v) === String(this.currentFilter.month) ? 'selected' : ''}>${m.l}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Hero Saldo da Carteira -->
          <div id="card-saldo-carteira" class="rounded-3xl p-5 shadow-md flex flex-col gap-4 text-on-primary bg-primary relative overflow-hidden transition-all">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

            <div class="flex items-start justify-between relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-xs font-semibold tracking-wider uppercase opacity-85">Saldo em Caixa da Carteira</span>
                <span class="font-headline-lg text-3xl font-extrabold mt-1 tracking-tight" id="carteira-saldo-carteira">R$ 0,00</span>
              </div>
              <div id="carteira-saldo-badge" class="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md">
                Carregando...
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-3 border-t border-white/15 relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-[11px] opacity-80 uppercase tracking-wide">Total Entradas</span>
                <span class="font-body-md text-base font-bold" id="carteira-total-entradas">R$ 0,00</span>
                <span class="font-label-sm text-[10px] opacity-75" id="carteira-entradas-count">0 registros</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="font-label-sm text-[11px] opacity-80 uppercase tracking-wide">Gastos em Compras</span>
                <span class="font-body-md text-base font-bold" id="carteira-total-saidas">R$ 0,00</span>
                <span class="font-label-sm text-[10px] opacity-75" id="carteira-saidas-count">0 compras</span>
              </div>
            </div>
          </div>

          <!-- Mini Cards de Previsão -->
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Salário</span>
              <span class="font-label-lg font-bold text-on-surface text-sm mt-0.5 truncate" id="carteira-sum-salario">R$ 0,00</span>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Renda Extra</span>
              <span class="font-label-lg font-bold text-on-surface text-sm mt-0.5 truncate" id="carteira-sum-extra">R$ 0,00</span>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">A Receber</span>
              <span class="font-label-lg font-bold text-tertiary text-sm mt-0.5 truncate" id="carteira-sum-areceber">R$ 0,00</span>
            </div>
          </div>

          <!-- Seção de Lançamentos -->
          <div class="flex items-center justify-between mt-2">
            <h2 class="font-headline-sm text-base font-bold text-on-surface">Lançamentos de Entrada</h2>
            <span class="font-body-sm text-xs text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full" id="badge-total-lancamentos">0 entradas</span>
          </div>

          <div id="carteira-entries-list" class="flex flex-col gap-2.5">
            <div class="flex items-center justify-center p-8">
              <span class="material-symbols-outlined animate-spin text-primary text-3xl">autorenew</span>
            </div>
          </div>
        </div>

        <!-- FAB Adicionar Entrada -->
        <button id="btn-nova-entrada-fab" class="fixed bottom-20 right-6 w-14 h-14 bg-secondary text-on-secondary rounded-2xl shadow-lg flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-fixed active:scale-90 transition-all z-40">
          <span class="material-symbols-outlined text-[28px]">add</span>
        </button>

        <!-- Modal Nova Entrada -->
        <div id="modal-nova-entrada" class="fixed inset-0 bg-black/50 z-50 opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-xs flex items-end justify-center">
          <div class="w-full max-w-lg bg-surface rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 transform translate-y-full transition-transform duration-300 pb-safe max-h-[90vh] overflow-y-auto" id="modal-nova-entrada-sheet">
            <div class="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1"></div>
            
            <div class="flex items-center justify-between">
              <h3 class="font-headline-sm font-bold text-on-surface text-lg">Nova Entrada Financeira</h3>
              <button type="button" id="btn-fechar-modal-entrada" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-all">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="form-nova-entrada" class="flex flex-col gap-3.5">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Descrição / Origem *</label>
                <input type="text" id="entrada-descricao" placeholder="Ex: Salário Mensal, Freelance, Venda" required
                  class="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Valor (R$) *</label>
                  <div class="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-12 overflow-hidden px-3">
                    <span class="text-on-surface-variant font-bold text-sm mr-1.5">R$</span>
                    <input type="number" id="entrada-valor" step="0.01" min="0.01" placeholder="0,00" required
                      class="w-full h-full bg-transparent text-on-surface font-body-md text-sm outline-none font-bold">
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Data *</label>
                  <input type="date" id="entrada-data" required
                    class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Categoria *</label>
                <select id="entrada-categoria" required
                  class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
                  <option value="Salário">💼 Salário / Pagamento Principal</option>
                  <option value="Renda Extra">⚡ Renda Extra / Freelance</option>
                  <option value="Investimentos">📈 Rendimentos / Investimentos</option>
                  <option value="Presente">🎁 Presente / Doação</option>
                  <option value="Outros">💵 Outras Entradas</option>
                </select>
              </div>

              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Status do Valor *</label>
                <div class="grid grid-cols-2 gap-2">
                  <label class="cursor-pointer">
                    <input type="radio" name="entrada-status" value="recebido" checked class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-semibold peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[16px]">check_circle</span>
                      Já Recebido
                    </div>
                  </label>
                  <label class="cursor-pointer">
                    <input type="radio" name="entrada-status" value="a_receber" class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-semibold peer-checked:bg-tertiary-container peer-checked:text-on-tertiary-container peer-checked:border-tertiary flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      A Receber
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" id="btn-submit-salvar-entrada"
                class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-2">
                <span class="material-symbols-outlined text-[20px]">save</span>
                Gravar na Carteira
              </button>
            </form>
          </div>
        </div>
      </main>
    `;

    this.initEvents();
    await this.loadData();
  },

  initEvents() {
    // Filtros
    const selAno = document.getElementById('filtro-carteira-ano');
    const selMes = document.getElementById('filtro-carteira-mes');

    selAno?.addEventListener('change', (e) => {
      this.currentFilter.year = e.target.value;
      this.renderBalanceAndList();
    });

    selMes?.addEventListener('change', (e) => {
      this.currentFilter.month = e.target.value;
      this.renderBalanceAndList();
    });

    // Abrir Modal
    const btnTop = document.getElementById('btn-nova-entrada-top');
    const btnFab = document.getElementById('btn-nova-entrada-fab');
    btnTop?.addEventListener('click', () => this.openModal());
    btnFab?.addEventListener('click', () => this.openModal());

    // Fechar Modal
    const btnClose = document.getElementById('btn-fechar-modal-entrada');
    const modal = document.getElementById('modal-nova-entrada');
    btnClose?.addEventListener('click', () => this.closeModal());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    // Form Submit
    const form = document.getElementById('form-nova-entrada');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit();
    });
  },

  openModal() {
    const modal = document.getElementById('modal-nova-entrada');
    const sheet = document.getElementById('modal-nova-entrada-sheet');
    const inputDate = document.getElementById('entrada-data');
    if (inputDate) {
      inputDate.value = new Date().toISOString().split('T')[0];
    }
    if (modal && sheet) {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      sheet.classList.remove('translate-y-full');
      window.admobService?.onModalOpen();
    }
  },

  closeModal() {
    const modal = document.getElementById('modal-nova-entrada');
    const sheet = document.getElementById('modal-nova-entrada-sheet');
    if (modal && sheet) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      sheet.classList.add('translate-y-full');
      window.admobService?.onModalClose();
    }
  },

  async loadData() {
    try {
      const [entries, purchases] = await Promise.all([
        walletService.getWalletEntries(),
        walletService.getPurchaseHistoryForWallet()
      ]);
      this.walletEntries = entries;
      this.purchaseHistory = purchases;
      this.renderBalanceAndList();
    } catch (e) {
      console.error('Erro ao carregar dados da carteira:', e);
    }
  },

  renderBalanceAndList() {
    const balance = walletService.calculateWalletBalance(
      this.walletEntries,
      this.purchaseHistory,
      this.currentFilter
    );

    // Saldo real em caixa
    const realSaldo = balance.saldoGeralCarteira;
    const elSaldo = document.getElementById('carteira-saldo-carteira');
    const cardSaldo = document.getElementById('card-saldo-carteira');
    const elBadge = document.getElementById('carteira-saldo-badge');

    if (elSaldo) elSaldo.textContent = formatCurrency(realSaldo);

    if (cardSaldo && elBadge) {
      if (realSaldo >= 0) {
        cardSaldo.className = 'rounded-3xl p-5 shadow-md flex flex-col gap-4 text-on-primary bg-primary relative overflow-hidden transition-all';
        elBadge.textContent = 'Saldo Positivo';
        elBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md';
      } else {
        cardSaldo.className = 'rounded-3xl p-5 shadow-md flex flex-col gap-4 text-on-error bg-error relative overflow-hidden transition-all';
        elBadge.textContent = 'Atenção: Negativo';
        elBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md';
      }
    }

    // Entradas e Saídas
    const isPeriodAll = (this.currentFilter.year === 'all' && this.currentFilter.month === 'all');
    const elEntradas = document.getElementById('carteira-total-entradas');
    const elSaidas = document.getElementById('carteira-total-saidas');
    const elEntradasCount = document.getElementById('carteira-entradas-count');
    const elSaidasCount = document.getElementById('carteira-saidas-count');

    if (elEntradas) elEntradas.textContent = formatCurrency(isPeriodAll ? balance.totalGeralRecebido : balance.totalRecebido);
    if (elSaidas) elSaidas.textContent = formatCurrency(isPeriodAll ? balance.totalGeralSaidas : balance.totalSaidas);
    if (elEntradasCount) elEntradasCount.textContent = `${balance.entriesCount} ${balance.entriesCount === 1 ? 'registro' : 'registros'}`;
    if (elSaidasCount) elSaidasCount.textContent = `${balance.purchasesCount} ${balance.purchasesCount === 1 ? 'compra' : 'compras'}`;

    // Mini cards
    const elSalario = document.getElementById('carteira-sum-salario');
    const elExtra = document.getElementById('carteira-sum-extra');
    const elAReceber = document.getElementById('carteira-sum-areceber');

    if (elSalario) elSalario.textContent = formatCurrency(balance.byCategory['Salário'] || 0);
    if (elExtra) elExtra.textContent = formatCurrency(balance.byCategory['Renda Extra'] || 0);
    if (elAReceber) elAReceber.textContent = formatCurrency(balance.totalAReceber);

    // Lista de Lançamentos
    const container = document.getElementById('carteira-entries-list');
    const badgeTotal = document.getElementById('badge-total-lancamentos');
    if (badgeTotal) badgeTotal.textContent = `${balance.entries.length} entradas`;

    if (!container) return;

    if (balance.entries.length === 0) {
      container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60 p-8 flex flex-col items-center justify-center text-center gap-2">
          <span class="material-symbols-outlined text-4xl text-outline/60">payments</span>
          <p class="font-body-md font-semibold text-on-surface">Nenhuma entrada no período</p>
          <p class="font-body-sm text-xs text-on-surface-variant">Clique em "Nova Entrada" para cadastrar seu salário ou rendas extras.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = balance.entries.map(entry => {
      const isRecebido = entry.status === 'recebido';
      const iconMap = {
        'Salário': 'work',
        'Renda Extra': 'bolt',
        'Investimentos': 'trending_up',
        'Presente': 'card_giftcard',
        'Outros': 'payments'
      };
      const catIcon = iconMap[entry.category] || 'payments';

      return `
        <article class="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3 hover:border-outline-variant transition-all">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl ${isRecebido ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-container text-on-tertiary-container'} flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">${catIcon}</span>
            </span>
            <div class="flex flex-col min-w-0">
              <span class="font-body-md font-bold text-on-surface text-sm truncate">${escapeHtml(entry.description)}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-label-sm text-[11px] text-outline">${formatDateBR(entry.entryDate)}</span>
                <span class="w-1 h-1 rounded-full bg-outline/40"></span>
                <span class="font-label-sm text-[11px] ${isRecebido ? 'text-secondary font-semibold' : 'text-tertiary font-semibold'}">
                  ${isRecebido ? 'Recebido' : 'A Receber'}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="font-label-lg font-bold ${isRecebido ? 'text-secondary' : 'text-on-surface-variant'} text-sm">
              + ${formatCurrency(entry.amount)}
            </span>
            <button class="btn-delete-entry w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-all active:scale-90" data-id="${entry.id}" title="Excluir Entrada">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Listener exclusão
    container.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Deseja realmente excluir esta entrada financeira?')) {
          try {
            await walletService.deleteWalletEntry(id);
            this.walletEntries = this.walletEntries.filter(w => w.id !== id);
            this.renderBalanceAndList();
          } catch (err) {
            alert('Erro ao excluir: ' + err.message);
          }
        }
      });
    });
  },

  async handleFormSubmit() {
    const desc = document.getElementById('entrada-descricao').value.trim();
    const val = parseFloat(document.getElementById('entrada-valor').value);
    const cat = document.getElementById('entrada-categoria').value;
    const date = document.getElementById('entrada-data').value;
    const statusRadio = document.querySelector('input[name="entrada-status"]:checked');
    const status = statusRadio ? statusRadio.value : 'recebido';

    if (!desc || !val || isNaN(val) || val <= 0) {
      showToast('Preencha a descrição e um valor numérico válido.', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-salvar-entrada');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Salvando...';

    try {
      const saved = await walletService.saveWalletEntry({
        description: desc,
        amount: val,
        category: cat,
        status,
        entryDate: date || new Date().toISOString().split('T')[0]
      });

      this.walletEntries.unshift(saved);
      this.closeModal();
      document.getElementById('form-nova-entrada').reset();
      this.renderBalanceAndList();
      showToast('💰 Entrada registrada com sucesso na carteira!', 'success');
      window.dispatchEvent(new CustomEvent('user-profile-updated'));
    } catch (err) {
      showToast('Erro ao gravar entrada: ' + (err.message || 'Falha ao salvar'), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">save</span> Gravar na Carteira';
    }
  }
};
