import { appStore } from '../store/appStore.js';
import * as walletService from '../services/walletService.js';
import { formatCurrency, formatDateBR, escapeHtml } from '../utils/formatters.js';
import { showToast, showConfirmDialog } from '../utils/toast.js';

export const WalletView = {
  currentFilter: {
    year: new Date().getFullYear(),
    month: 'all',
    tab: 'all' // 'all' | 'entradas' | 'despesas' | 'a_pagar' | 'parcelados' | 'recorrentes'
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
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-md pt-safe px-4 h-16 flex items-center justify-between gap-2 border-b border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px] sm:text-[22px]">account_balance_wallet</span>
            </span>
            <div class="min-w-0 flex flex-col">
              <h1 class="font-headline-sm text-[15px] sm:text-headline-sm font-bold text-on-surface leading-tight truncate">Hub de Finanças</h1>
              <span class="font-body-sm text-on-surface-variant text-[10px] sm:text-xs truncate hidden sm:block">Gestão de saldo, contas a pagar e despesas</span>
            </div>
          </div>
          <button id="btn-nova-entrada-top" class="h-9 px-3 rounded-xl bg-primary text-on-primary font-label-md text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 whitespace-nowrap">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Novo Lançamento</span>
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
                <span class="font-label-sm text-xs font-semibold tracking-wider uppercase opacity-85">Saldo em Caixa Real</span>
                <span class="font-headline-lg text-3xl font-extrabold mt-1 tracking-tight" id="carteira-saldo-carteira">R$ 0,00</span>
              </div>
              <div id="carteira-saldo-badge" class="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md">
                Carregando...
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-3 border-t border-white/15 relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-[11px] opacity-80 uppercase tracking-wide">Total Entradas</span>
                <span class="font-body-md text-base font-bold text-emerald-200" id="carteira-total-entradas">R$ 0,00</span>
                <span class="font-label-sm text-[10px] opacity-75" id="carteira-entradas-count">0 registros</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="font-label-sm text-[11px] opacity-80 uppercase tracking-wide">Total Saídas / Compras</span>
                <span class="font-body-md text-base font-bold text-rose-200" id="carteira-total-saidas">R$ 0,00</span>
                <span class="font-label-sm text-[10px] opacity-75" id="carteira-saidas-count">0 saídas</span>
              </div>
            </div>
          </div>

          <!-- Mini Cards: Contas a Pagar & Próximo Vencimento -->
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-surface-container-lowest p-2 sm:p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs overflow-hidden">
              <span class="font-label-sm text-[9px] text-on-surface-variant uppercase font-semibold whitespace-nowrap truncate">Contas a Pagar</span>
              <span class="font-label-lg font-bold text-error text-xs sm:text-sm mt-0.5 truncate" id="carteira-sum-a-pagar">R$ 0,00</span>
              <span class="text-[9px] text-outline truncate" id="carteira-count-a-pagar">0 pendentes</span>
            </div>
            <div class="bg-surface-container-lowest p-2 sm:p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs overflow-hidden">
              <span class="font-label-sm text-[9px] text-on-surface-variant uppercase font-semibold whitespace-nowrap truncate">Vencimento</span>
              <span class="font-label-lg font-bold text-on-surface text-xs sm:text-sm mt-0.5 truncate" id="carteira-prox-vencimento">Nenhum</span>
              <span class="text-[9px] text-tertiary truncate" id="carteira-prox-dias">-</span>
            </div>
            <div class="bg-surface-container-lowest p-2 sm:p-3 rounded-2xl border border-outline-variant/30 flex flex-col shadow-xs overflow-hidden">
              <span class="font-label-sm text-[9px] text-on-surface-variant uppercase font-semibold whitespace-nowrap truncate">A Receber</span>
              <span class="font-label-lg font-bold text-secondary text-xs sm:text-sm mt-0.5 truncate" id="carteira-sum-areceber">R$ 0,00</span>
              <span class="text-[9px] text-outline truncate">Previsão</span>
            </div>
          </div>

          <!-- Abas de Navegação Financeira -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-semibold snap-x">
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="all">
              Todos
            </button>
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'a_pagar' ? 'bg-error text-on-error shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="a_pagar">
              ⏰ A Pagar
            </button>
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'despesas' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="despesas">
              🔴 Despesas
            </button>
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'entradas' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="entradas">
              🟢 Entradas
            </button>
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'parcelados' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="parcelados">
              💳 Parcelados
            </button>
            <button type="button" class="tab-btn px-3 py-1.5 shrink-0 rounded-xl transition-all whitespace-nowrap snap-start ${this.currentFilter.tab === 'recorrentes' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}" data-tab="recorrentes">
              🔁 Recorrentes
            </button>
          </div>

          <!-- Seção de Lançamentos -->
          <div class="flex items-center justify-between mt-1">
            <h2 class="font-headline-sm text-base font-bold text-on-surface" id="titulo-secao-lancamentos">Lançamentos</h2>
            <span class="font-body-sm text-xs text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full" id="badge-total-lancamentos">0 registros</span>
          </div>

          <div id="carteira-entries-list" class="flex flex-col gap-2.5">
            <div class="flex items-center justify-center p-8">
              <span class="material-symbols-outlined animate-spin text-primary text-3xl">autorenew</span>
            </div>
          </div>
        </div>

        <!-- FAB Adicionar Entrada -->
        <button id="btn-nova-entrada-fab" class="fixed bottom-20 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-all z-40" title="Novo Lançamento">
          <span class="material-symbols-outlined text-[28px]">add</span>
        </button>

        <!-- Modal Novo Lançamento Inteligente -->
        <div id="modal-nova-entrada" class="fixed inset-0 bg-black/60 z-50 opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-xs flex items-end justify-center">
          <div class="w-full max-w-lg bg-surface rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 transform translate-y-full transition-transform duration-300 pb-safe max-h-[92vh] overflow-y-auto" id="modal-nova-entrada-sheet">
            <div class="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1"></div>
            
            <div class="flex items-center justify-between">
              <h3 class="font-headline-sm font-bold text-on-surface text-lg" id="modal-titulo">Novo Lançamento Financeiro</h3>
              <button type="button" id="btn-fechar-modal-entrada" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-all">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form id="form-nova-entrada" class="flex flex-col gap-3.5">
              <input type="hidden" id="wallet-entry-id">
              
              <!-- Seletor de Tipo: Entrada vs Despesa -->
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Tipo de Movimentação *</label>
                <div class="grid grid-cols-2 gap-2">
                  <label class="cursor-pointer">
                    <input type="radio" name="transacao-tipo" value="entrada" checked class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-bold peer-checked:bg-emerald-500/15 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-checked:border-emerald-500 flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[18px]">arrow_circle_down</span>
                      🟢 Entrada / Receita
                    </div>
                  </label>
                  <label class="cursor-pointer">
                    <input type="radio" name="transacao-tipo" value="saida" class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-bold peer-checked:bg-rose-500/15 peer-checked:text-rose-700 dark:peer-checked:text-rose-300 peer-checked:border-rose-500 flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[18px]">arrow_circle_up</span>
                      🔴 Despesa / Conta a Pagar
                    </div>
                  </label>
                </div>
              </div>

              <!-- Descrição -->
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase" id="label-descricao">Descrição / Identificação *</label>
                <input type="text" id="entrada-descricao" placeholder="Ex: Energia Elétrica, Salário, Internet" required
                  class="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
              </div>

              <!-- Valor e Data -->
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
                  <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase" id="label-data">Data de Vencimento *</label>
                  <input type="date" id="entrada-data" required
                    class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                </div>
              </div>

              <!-- Categoria -->
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Categoria *</label>
                <select id="entrada-categoria" required
                  class="w-full h-12 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
                  <option value="Moradia">🏠 Moradia (Aluguel, Luz, Água, Gás)</option>
                  <option value="Alimentação">🛒 Alimentação & Mercado</option>
                  <option value="Transporte">🚗 Transporte & Combustível</option>
                  <option value="Saúde">💊 Saúde & Medicamentos</option>
                  <option value="Lazer">🍿 Lazer & Assinaturas</option>
                  <option value="Educação">📚 Educação & Cursos</option>
                  <option value="Salário">💼 Salário / Pagamento Principal</option>
                  <option value="Renda Extra">⚡ Renda Extra / Freelance</option>
                  <option value="Outros">💵 Outros Gastos / Entradas</option>
                </select>
              </div>

              <!-- Status do Lançamento -->
              <div class="flex flex-col gap-1" id="grupo-status-transacao">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Situação *</label>
                <div class="grid grid-cols-2 gap-2" id="status-radios-container">
                  <label class="cursor-pointer">
                    <input type="radio" name="entrada-status" value="pago" class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-semibold peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[16px]">check_circle</span>
                      <span id="label-status-pago">Já Pago</span>
                    </div>
                  </label>
                  <label class="cursor-pointer">
                    <input type="radio" name="entrada-status" value="a_pagar" checked class="peer sr-only">
                    <div class="p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant text-xs font-semibold peer-checked:bg-amber-500/15 peer-checked:text-amber-700 dark:peer-checked:text-amber-300 peer-checked:border-amber-500 flex items-center justify-center gap-1.5 transition-all text-center">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      <span id="label-status-pendente">A Pagar (Pendente)</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Painel Parcelamento (Apenas Saída) -->
              <div id="secao-despesa-avancada" class="hidden flex flex-col gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <!-- Parcelamento -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-[20px]">credit_card</span>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-on-surface">Compra Parcelada</span>
                      <span class="text-[10px] text-on-surface-variant">Dividir em várias parcelas mensais</span>
                    </div>
                  </div>
                  <input type="checkbox" id="check-parcelamento" class="w-4 h-4 rounded text-primary accent-primary cursor-pointer">
                </div>

                <div id="box-parcelamento-config" class="hidden flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-xs font-semibold text-on-surface-variant">Quantidade de Parcelas:</label>
                    <select id="select-qtd-parcelas" class="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/40 text-xs font-bold text-on-surface cursor-pointer">
                      ${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => `<option value="${n}">${n}x parcelas</option>`).join('')}
                    </select>
                  </div>
                  <span class="text-[11px] text-primary font-medium" id="preview-parcelas">Ex: 2x de R$ 0,00</span>
                </div>
              </div>

              <!-- Painel Recorrência (Qualquer Lançamento) -->
              <div id="secao-recorrencia" class="flex flex-col gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-[20px]">autorenew</span>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-on-surface">Pagamento Recorrente / Fixo</span>
                      <span class="text-[10px] text-on-surface-variant">Gera a próxima ocorrência ao dar baixa</span>
                    </div>
                  </div>
                  <input type="checkbox" id="check-recorrente" class="w-4 h-4 rounded text-primary accent-primary cursor-pointer">
                </div>

                <div id="box-recorrente-config" class="hidden flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-xs font-semibold text-on-surface-variant">Frequência:</label>
                    <select id="select-periodo-recorrente" class="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/40 text-xs font-bold text-on-surface cursor-pointer">
                      <option value="mensal">Mensal (todo mês)</option>
                      <option value="semanal">Semanal (a cada 7 dias)</option>
                      <option value="anual">Anual (uma vez por ano)</option>
                    </select>
                  </div>
                  <span class="text-[11px] text-secondary font-medium" id="preview-recorrente">Ao dar baixa, a próxima ocorrência é criada automaticamente.</span>
                </div>
              </div>

              <button type="submit" id="btn-submit-salvar-entrada"
                class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-2">
                <span class="material-symbols-outlined text-[20px]">save</span>
                Gravar Lançamento
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
    // Filtros de Ano e Mês
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

    // Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter.tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.className = `tab-btn px-3 py-2 rounded-xl transition-all ${b.dataset.tab === this.currentFilter.tab ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`;
        });
        this.renderBalanceAndList();
      });
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

    // Alternar Tipo: Entrada vs Saída
    const radioTipos = document.querySelectorAll('input[name="transacao-tipo"]');
    radioTipos.forEach(r => {
      r.addEventListener('change', () => this.handleTipoChange(r.value));
    });

    // Parcelamento Toggle e Cálculo
    const checkParcelado = document.getElementById('check-parcelamento');
    const boxParcelado = document.getElementById('box-parcelamento-config');
    const selectParcelas = document.getElementById('select-qtd-parcelas');
    const inputValor = document.getElementById('entrada-valor');

    checkParcelado?.addEventListener('change', () => {
      if (checkParcelado.checked) {
        boxParcelado?.classList.remove('hidden');
        // Desmarca recorrente se marcar parcelado
        const checkRecorrente = document.getElementById('check-recorrente');
        if (checkRecorrente) checkRecorrente.checked = false;
        document.getElementById('box-recorrente-config')?.classList.add('hidden');
      } else {
        boxParcelado?.classList.add('hidden');
      }
      this.updateParcelasPreview();
    });

    selectParcelas?.addEventListener('change', () => this.updateParcelasPreview());
    inputValor?.addEventListener('input', () => this.updateParcelasPreview());

    // Recorrência Toggle
    const checkRecorrente = document.getElementById('check-recorrente');
    const boxRecorrente = document.getElementById('box-recorrente-config');
    checkRecorrente?.addEventListener('change', () => {
      if (checkRecorrente.checked) {
        boxRecorrente?.classList.remove('hidden');
        // Desmarca parcelado se marcar recorrente
        if (checkParcelado) checkParcelado.checked = false;
        boxParcelado?.classList.add('hidden');
      } else {
        boxRecorrente?.classList.add('hidden');
      }
    });

    // Form Submit
    const form = document.getElementById('form-nova-entrada');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit();
    });
  },

  handleTipoChange(tipo) {
    const secaoDespesa = document.getElementById('secao-despesa-avancada');
    const labelDesc = document.getElementById('label-descricao');
    const labelData = document.getElementById('label-data');
    const labelPago = document.getElementById('label-status-pago');
    const labelPendente = document.getElementById('label-status-pendente');
    const catSelect = document.getElementById('entrada-categoria');

    if (tipo === 'saida') {
      secaoDespesa?.classList.remove('hidden');
      if (labelDesc) labelDesc.textContent = 'Descrição da Despesa / Conta *';
      if (labelData) labelData.textContent = 'Data de Vencimento *';
      if (labelPago) labelPago.textContent = 'Já Pago';
      if (labelPendente) labelPendente.textContent = 'A Pagar (Pendente)';
      if (catSelect && catSelect.value === 'Salário') catSelect.value = 'Moradia';
    } else {
      secaoDespesa?.classList.add('hidden');
      if (labelDesc) labelDesc.textContent = 'Descrição da Entrada / Origem *';
      if (labelData) labelData.textContent = 'Data de Recebimento *';
      if (labelPago) labelPago.textContent = 'Já Recebido';
      if (labelPendente) labelPendente.textContent = 'A Receber (Previsão)';
      if (catSelect && catSelect.value === 'Moradia') catSelect.value = 'Salário';
    }
  },

  updateParcelasPreview() {
    const val = parseFloat(document.getElementById('entrada-valor')?.value) || 0;
    const qtd = parseInt(document.getElementById('select-qtd-parcelas')?.value) || 2;
    const preview = document.getElementById('preview-parcelas');
    if (preview) {
      const parcela = Math.round((val / qtd) * 100) / 100;
      preview.textContent = `${qtd}x de ${formatCurrency(parcela)} (Total: ${formatCurrency(val)})`;
    }
  },

  openModal(entry = null) {
    const modal = document.getElementById('modal-nova-entrada');
    const sheet = document.getElementById('modal-nova-entrada-sheet');
    const form = document.getElementById('form-nova-entrada');
    
    if (form) form.reset();
    
    document.getElementById('wallet-entry-id').value = entry ? entry.id : '';
    document.getElementById('modal-titulo').textContent = entry ? 'Editar Lançamento' : 'Novo Lançamento';

    if (entry) {
      // Popular campos
      const radioTipo = document.querySelector(`input[name="transacao-tipo"][value="${entry.type}"]`);
      if (radioTipo) radioTipo.checked = true;
      this.handleTipoChange(entry.type);

      document.getElementById('entrada-descricao').value = entry.description || '';
      document.getElementById('entrada-valor').value = entry.amount || '';
      const inputDate = document.getElementById('entrada-data');
      if (inputDate) inputDate.value = entry.dueDate || entry.entryDate || new Date().toISOString().split('T')[0];
      
      const catSelect = document.getElementById('entrada-categoria');
      if (catSelect) catSelect.value = entry.category || '';

      const radioStatus = document.querySelector(`input[name="entrada-status"][value="${entry.status}"]`);
      if (radioStatus) radioStatus.checked = true;

      const checkRecorrente = document.getElementById('check-recorrente');
      const boxRecorrente = document.getElementById('box-recorrente-config');
      const selPeriodo = document.getElementById('select-periodo-recorrente');
      if (checkRecorrente) checkRecorrente.checked = entry.isRecurrent || false;
      if (boxRecorrente) entry.isRecurrent ? boxRecorrente.classList.remove('hidden') : boxRecorrente.classList.add('hidden');
      if (selPeriodo) selPeriodo.value = entry.recurrentPeriod || 'mensal';

      // Parcelamento não é editável na mesma lógica, mas podemos populá-lo
      const checkParcelado = document.getElementById('check-parcelamento');
      if (checkParcelado) checkParcelado.checked = false; 
    } else {
      const inputDate = document.getElementById('entrada-data');
      if (inputDate) {
        inputDate.value = new Date().toISOString().split('T')[0];
      }
      this.handleTipoChange('entrada'); // Reset default
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
      let [entries, purchases] = await Promise.all([
        walletService.getWalletEntries(),
        walletService.getPurchaseHistoryForWallet()
      ]);

      if (!entries || entries.length === 0) {
        const seedItems = [
          { description: 'Salário Uzabelle', amount: 1493.27, type: 'entrada', category: 'Salário', status: 'recebido', entryDate: '2026-09-13' },
          { description: 'Bolsa Família', amount: 800.00, type: 'entrada', category: 'Outras', status: 'recebido', entryDate: '2026-09-13' },
          { description: 'ShopeePay', amount: 113.83, type: 'entrada', category: 'Renda Extra', status: 'recebido', entryDate: '2026-09-13' },
          { description: 'Tiktok Shop', amount: 11.12, type: 'entrada', category: 'Renda Extra', status: 'recebido', entryDate: '2026-09-13' },
          { description: 'Tiktok Shop', amount: 10.58, type: 'entrada', category: 'Renda Extra', status: 'recebido', entryDate: '2026-09-13' }
        ];

        for (const item of seedItems) {
          try {
            await walletService.saveWalletEntry(item);
          } catch (_) {}
        }
        entries = await walletService.getWalletEntries();
      }

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
    const realSaldo = balance.saldoEmCaixa;
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
    if (elSaidasCount) elSaidasCount.textContent = `${balance.purchasesCount} compras + despesas`;

    // Mini cards
    const elAPagar = document.getElementById('carteira-sum-a-pagar');
    const elCountAPagar = document.getElementById('carteira-count-a-pagar');
    const elProxVenc = document.getElementById('carteira-prox-vencimento');
    const elProxDias = document.getElementById('carteira-prox-dias');
    const elAReceber = document.getElementById('carteira-sum-areceber');

    if (elAPagar) elAPagar.textContent = formatCurrency(balance.totalGeralContasAPagar);
    if (elCountAPagar) elCountAPagar.textContent = `${balance.contasAPagarList.length} ${balance.contasAPagarList.length === 1 ? 'pendente' : 'pendentes'}`;
    if (elAReceber) elAReceber.textContent = formatCurrency(balance.totalGeralAReceber);

    if (balance.proximoVencimento) {
      const vDate = balance.proximoVencimento.dueDate || balance.proximoVencimento.entryDate;
      if (elProxVenc) elProxVenc.textContent = formatDateBR(vDate);
      
      const today = new Date().toISOString().split('T')[0];
      if (vDate < today) {
        if (elProxDias) {
          elProxDias.textContent = 'Vencida!';
          elProxDias.className = 'text-[10px] text-error font-bold truncate';
        }
      } else if (vDate === today) {
        if (elProxDias) {
          elProxDias.textContent = 'Vence hoje';
          elProxDias.className = 'text-[10px] text-amber-600 font-bold truncate';
        }
      } else {
        const diffDays = Math.ceil((new Date(vDate + 'T12:00:00') - new Date(today + 'T12:00:00')) / (1000 * 60 * 60 * 24));
        if (elProxDias) {
          elProxDias.textContent = `Em ${diffDays} dias`;
          elProxDias.className = 'text-[10px] text-primary font-semibold truncate';
        }
      }
    } else {
      if (elProxVenc) elProxVenc.textContent = 'Nenhum';
      if (elProxDias) elProxDias.textContent = 'Em dia';
    }

    // Filtragem por Aba
    let displayEntries = [...balance.entries];
    const tab = this.currentFilter.tab;
    const tituloSecao = document.getElementById('titulo-secao-lancamentos');

    if (tab === 'a_pagar') {
      displayEntries = displayEntries.filter(e => e.type === 'saida' && e.status === 'a_pagar');
      if (tituloSecao) tituloSecao.textContent = 'Contas a Pagar (Pendentes)';
    } else if (tab === 'despesas') {
      displayEntries = displayEntries.filter(e => e.type === 'saida');
      if (tituloSecao) tituloSecao.textContent = 'Despesas & Contas';
    } else if (tab === 'entradas') {
      displayEntries = displayEntries.filter(e => e.type !== 'saida');
      if (tituloSecao) tituloSecao.textContent = 'Entradas & Receitas';
    } else if (tab === 'parcelados') {
      displayEntries = displayEntries.filter(e => e.isInstallment);
      if (tituloSecao) tituloSecao.textContent = 'Compras Parceladas';
    } else if (tab === 'recorrentes') {
      displayEntries = displayEntries.filter(e => e.isRecurrent);
      if (tituloSecao) tituloSecao.textContent = 'Pagamentos Recorrentes / Fixos';
    } else {
      if (tituloSecao) tituloSecao.textContent = 'Todos os Lançamentos';
    }

    const container = document.getElementById('carteira-entries-list');
    const badgeTotal = document.getElementById('badge-total-lancamentos');
    if (badgeTotal) badgeTotal.textContent = `${displayEntries.length} ${displayEntries.length === 1 ? 'registro' : 'registros'}`;

    if (!container) return;

    if (displayEntries.length === 0) {
      container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60 p-8 flex flex-col items-center justify-center text-center gap-2">
          <span class="material-symbols-outlined text-4xl text-outline/60">receipt_long</span>
          <p class="font-body-md font-semibold text-on-surface">Nenhum lançamento encontrado</p>
          <p class="font-body-sm text-xs text-on-surface-variant">Cadastre novas despesas, receitas ou contas a pagar no botão abaixo.</p>
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = displayEntries.map(entry => {
      const isSaida = entry.type === 'saida';
      const isPago = entry.status === 'pago' || entry.status === 'recebido';
      const isAPagar = entry.status === 'a_pagar';
      const isAReceber = entry.status === 'a_receber';

      const iconMap = {
        'Moradia': 'home',
        'Alimentação': 'shopping_basket',
        'Transporte': 'directions_car',
        'Saúde': 'medical_services',
        'Lazer': 'movie',
        'Educação': 'school',
        'Salário': 'work',
        'Renda Extra': 'bolt',
        'Investimentos': 'trending_up',
        'Parcelamento': 'credit_card',
        'Outros': 'payments'
      };
      const catIcon = iconMap[entry.category] || (isSaida ? 'payments' : 'account_balance');

      // Vencimento Status Badge
      let badgeVencimentoHtml = '';
      if (isSaida && isAPagar && entry.dueDate) {
        if (entry.dueDate < todayStr) {
          badgeVencimentoHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error">🔴 Vencida</span>`;
        } else if (entry.dueDate === todayStr) {
          badgeVencimentoHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">🟠 Vence hoje</span>`;
        } else {
          const diffDays = Math.ceil((new Date(entry.dueDate + 'T12:00:00') - new Date(todayStr + 'T12:00:00')) / (1000 * 60 * 60 * 24));
          badgeVencimentoHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-high text-on-surface-variant">🟡 Em ${diffDays}d</span>`;
        }
      }

      return `
        <article class="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3 hover:border-outline-variant transition-all">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="w-10 h-10 rounded-xl ${isSaida ? (isPago ? 'bg-surface-container text-outline' : 'bg-error/10 text-error') : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'} flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">${catIcon}</span>
            </span>
            <div class="flex flex-col min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-body-md font-bold text-on-surface text-sm truncate ${isPago && isSaida ? 'line-through text-outline' : ''}">${escapeHtml(entry.description)}</span>
                ${entry.isRecurrent ? `
                  <span class="inline-flex items-center gap-0.5 text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded" title="Pagamento Recorrente">
                    🔁 ${entry.recurrentPeriod || 'mensal'}
                  </span>
                ` : ''}
              </div>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="font-label-sm text-[11px] text-outline">
                  ${entry.dueDate ? `Venc: ${formatDateBR(entry.dueDate)}` : formatDateBR(entry.entryDate)}
                </span>
                ${badgeVencimentoHtml}
                <span class="font-label-sm text-[11px] ${isPago ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : (isAPagar ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-secondary font-semibold')}">
                  ${isSaida ? (isPago ? 'Pago' : 'A Pagar') : (isRecebido(entry) ? 'Recebido' : 'A Receber')}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <div class="flex flex-col items-end">
              <span class="font-label-lg font-bold ${isSaida ? 'text-error' : 'text-emerald-600 dark:text-emerald-400'} text-sm">
                ${isSaida ? '-' : '+'} ${formatCurrency(entry.amount)}
              </span>
              ${isSaida && isAPagar ? `
                <button class="btn-dar-baixa mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer" data-id="${entry.id}" title="Marcar como Pago">
                  <span class="material-symbols-outlined text-[14px]">check</span>
                  Dar Baixa
                </button>
              ` : ''}
            </div>
            <button class="btn-edit-entry w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-primary-container/30 transition-all active:scale-90" data-id="${entry.id}" title="Editar Lançamento">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button class="btn-delete-entry w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-all active:scale-90" data-id="${entry.id}" title="Excluir Lançamento">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Listener dar baixa em 1 clique
    container.querySelectorAll('.btn-dar-baixa').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[14px]">autorenew</span>';

        try {
          const res = await walletService.markAsPaid(id);
          showToast('✅ Conta marcada como PAGA com sucesso!', 'success');
          if (res.nextOccurrence) {
            showToast(`🔁 Próxima cobrança agendada para ${formatDateBR(res.nextOccurrence.dueDate)}`, 'info', 4000);
          }
          await this.loadData();
          window.dispatchEvent(new CustomEvent('user-profile-updated'));
        } catch (err) {
          showToast('Erro ao dar baixa: ' + err.message, 'error');
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">check</span> Dar Baixa';
        }
      });
    });

    // Listener exclusão
    container.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const confirmou = await showConfirmDialog({
          title: 'Excluir Lançamento',
          message: 'Deseja realmente remover esta movimentação financeira?',
          confirmText: 'Excluir',
          cancelText: 'Cancelar'
        });

        if (confirmou) {
          try {
            await walletService.deleteWalletEntry(id);
            this.walletEntries = this.walletEntries.filter(w => w.id !== id);
            this.renderBalanceAndList();
            showToast('Lançamento excluído.', 'info');
            window.dispatchEvent(new CustomEvent('user-profile-updated'));
          } catch (err) {
            showToast('Erro ao excluir: ' + err.message, 'error');
          }
        }
      });
    });

    // Listener edição
    container.querySelectorAll('.btn-edit-entry').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const entry = this.walletEntries.find(w => w.id === id);
        if (entry) this.openModal(entry);
      });
    });

    function isRecebido(e) {
      return e.status === 'recebido' || e.status === 'pago';
    }
  },

  async handleFormSubmit() {
    const editId = document.getElementById('wallet-entry-id').value;
    const tipoRadio = document.querySelector('input[name="transacao-tipo"]:checked');
    const tipo = tipoRadio ? tipoRadio.value : 'entrada';
    const desc = document.getElementById('entrada-descricao').value.trim();
    const val = parseFloat(document.getElementById('entrada-valor').value);
    const cat = document.getElementById('entrada-categoria').value;
    const date = document.getElementById('entrada-data').value;
    const statusRadio = document.querySelector('input[name="entrada-status"]:checked');
    const status = statusRadio ? statusRadio.value : (tipo === 'saida' ? 'a_pagar' : 'recebido');

    const isParcelado = tipo === 'saida' && Boolean(document.getElementById('check-parcelamento')?.checked);
    const qtdParcelas = isParcelado ? parseInt(document.getElementById('select-qtd-parcelas')?.value) || 2 : 1;

    const isRecorrente = Boolean(document.getElementById('check-recorrente')?.checked);
    const periodoRecorrente = isRecorrente ? document.getElementById('select-periodo-recorrente')?.value || 'mensal' : 'mensal';

    if (!desc || !val || isNaN(val) || val <= 0) {
      showToast('Preencha a descrição e um valor numérico válido.', 'error');
      return;
    }

    if (tipo === 'saida' && status === 'a_pagar' && !date) {
      showToast('A data de vencimento é obrigatória para contas a pagar.', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-salvar-entrada');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Salvando...';

    try {
      const payload = {
        description: desc,
        amount: val,
        type: tipo,
        category: cat,
        status: status,
        dueDate: tipo === 'saida' ? date : null,
        entryDate: date || new Date().toISOString().split('T')[0],
        isInstallment: isParcelado,
        installmentTotal: qtdParcelas,
        isRecurrent: isRecorrente,
        recurrentPeriod: periodoRecorrente
      };

      if (editId) {
        await walletService.updateWalletEntry(editId, payload);
        showToast('Lançamento atualizado com sucesso!', 'success');
      } else {
        await walletService.saveWalletEntry(payload);
        showToast(tipo === 'saida' ? (isParcelado ? `💳 Compra parcelada em ${qtdParcelas}x cadastrada!` : '🔴 Despesa registrada com sucesso!') : '💰 Entrada registrada com sucesso!', 'success');
      }

      this.closeModal();
      await this.loadData();
      window.dispatchEvent(new CustomEvent('user-profile-updated'));
    } catch (err) {
      showToast('Erro ao gravar lançamento: ' + (err.message || 'Falha ao salvar'), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">save</span> Gravar Lançamento';
    }
  }
};
