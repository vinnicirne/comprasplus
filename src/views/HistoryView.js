import { getPurchaseHistory, deletePurchaseHistory, calculateSpendingBalance } from '../services/historyService.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';

let historyCache = [];
let historyFilter = {
  year: new Date().getFullYear(),
  month: 'all',
  day: 'all'
};

const categoryIcons = {
  'Mercado': '🛒',
  'Supermercado': '🛒',
  'Hortifruti': '🥬',
  'Feira': '🍎',
  'Farmácia': '💊',
  'Padaria': '🥖',
  'Açougue': '🥩',
  'Bebidas': '🥤',
  'Pet Shop': '🐾',
  'Construção': '🔨',
  'Outros': '📦'
};

export const HistoryView = {
  async render() {
    const container = document.getElementById('router-view');
    if (!container) return;

    // Garante que o app shell está visível
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    container.innerHTML = `
      <div class="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
        <!-- Topo & Ação -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-2xl">analytics</span>
              Balanço & Histórico
            </h1>
            <p class="text-xs text-on-surface-variant mt-0.5">Controle detalhado de gastos por dia, mês e ano</p>
          </div>
          <button id="btn-recarregar-hist" class="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-full border border-outline-variant/40 shadow-sm transition active:scale-95">
            <span class="material-symbols-outlined text-sm">refresh</span>
            Atualizar
          </button>
        </div>

        <!-- Filtros Interativos (Ano, Mês, Dia) -->
        <div class="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 shadow-sm space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">filter_alt</span>
            Filtros do Período
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label for="filtro-hist-ano" class="block text-[10px] font-bold text-on-surface-variant mb-1">Ano</label>
              <select id="filtro-hist-ano" class="w-full bg-surface-container text-on-surface text-xs font-semibold py-2 px-2.5 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary outline-none">
                <!-- Preenchido via JS -->
              </select>
            </div>
            <div>
              <label for="filtro-hist-mes" class="block text-[10px] font-bold text-on-surface-variant mb-1">Mês</label>
              <select id="filtro-hist-mes" class="w-full bg-surface-container text-on-surface text-xs font-semibold py-2 px-2.5 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary outline-none">
                <option value="all">📅 Todos os Meses</option>
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>
            <div>
              <label for="filtro-hist-dia" class="block text-[10px] font-bold text-on-surface-variant mb-1">Dia</label>
              <select id="filtro-hist-dia" class="w-full bg-surface-container text-on-surface text-xs font-semibold py-2 px-2.5 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary outline-none">
                <!-- Preenchido via JS -->
              </select>
            </div>
          </div>
        </div>

        <!-- Grade de Cards de Balanço Financeiro -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Card Total Gasto -->
          <div class="bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div class="absolute -right-2 -bottom-2 opacity-10">
              <span class="material-symbols-outlined text-7xl text-primary">shopping_bag</span>
            </div>
            <span class="text-xs font-bold text-primary block">Total Gasto Real</span>
            <span id="balanco-total-gasto" class="text-xl font-black text-on-surface block mt-1">R$ 0,00</span>
            <span id="balanco-compras-count" class="text-[11px] text-on-surface-variant block mt-0.5">0 compras</span>
          </div>

          <!-- Card Orçamento -->
          <div class="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div class="absolute -right-2 -bottom-2 opacity-5">
              <span class="material-symbols-outlined text-7xl text-on-surface">savings</span>
            </div>
            <span class="text-xs font-bold text-on-surface-variant block">Orçamento Total</span>
            <span id="balanco-total-orcamento" class="text-xl font-black text-on-surface block mt-1">R$ 0,00</span>
            <span id="balanco-media-compra" class="text-[11px] text-on-surface-variant block mt-0.5">Média: R$ 0,00</span>
          </div>

          <!-- Card Economia / Saldo (Largura Total) -->
          <div id="balanco-card-economia" class="col-span-2 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-sm transition-colors">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-on-surface-variant block">Economia / Saldo do Período</span>
                <span id="balanco-total-economia" class="text-2xl font-black text-on-surface block mt-1">R$ 0,00</span>
              </div>
              <span id="balanco-badge-status" class="px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Dentro do Teto
              </span>
            </div>
          </div>
        </div>

        <!-- Balanço Visual dos Meses (Gráfico de Barras CSS) -->
        <div class="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-primary">bar_chart</span>
              Gastos Mês a Mês (<span id="chart-ano-label">${new Date().getFullYear()}</span>)
            </h3>
            <span class="text-[11px] text-on-surface-variant font-medium">Toque no mês para filtrar</span>
          </div>
          
          <div id="chart-month-bars" class="h-40 flex items-end justify-between gap-1 pt-6 px-1 border-b border-outline-variant/30">
            <!-- 12 colunas geradas dinamicamente via JS -->
          </div>
        </div>

        <!-- Linha do Tempo: Compras Registradas -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-symbols-outlined text-base text-primary">receipt_long</span>
              Compras Registradas
            </h2>
            <span id="historico-contador-tag" class="text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant/30">
              0 compras
            </span>
          </div>

          <div id="historico-list-container" class="space-y-3">
            <div class="py-12 text-center text-on-surface-variant">
              <span class="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
              <p class="text-xs mt-2 font-medium">Carregando histórico financeiro...</p>
            </div>
          </div>

          <!-- Estado Vazio -->
          <div id="empty-state-historico" class="hidden text-center py-12 px-6 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/60">
            <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-container flex items-center justify-center text-3xl">
              📜
            </div>
            <h3 class="font-bold text-on-surface text-base">Nenhuma compra no período</h3>
            <p class="text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
              Quando você concluir suas compras no mercado, toque em <strong>"Concluir Compra"</strong> na sua lista para gravar o recibo detalhado aqui.
            </p>
          </div>

          <!-- Bloco Nativo AdMob -->
          <div id="admob-native-slot" class="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 shadow-sm relative overflow-hidden mt-6">
            <div class="text-[9px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded inline-block mb-2">
              Anúncio • Parceiro
            </div>
            <div class="flex items-center gap-3">
              <span class="text-3xl">💳</span>
              <div>
                <strong class="text-xs font-bold text-on-surface block">Cartão de Crédito com Cashback</strong>
                <p class="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                  Economize até 5% em todos os supermercados, atacarejos e padarias credenciados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    initFilters();
    initEventListeners();
    await loadData();

    // Renderiza bloco nativo oficial do Google AdMob no Histórico como no código original
    if (window.admobManager && typeof window.admobManager.renderNativeAd === 'function') {
      window.admobManager.renderNativeAd('admob-native-slot');
    }
  }
};

function initFilters() {
  const selAno = document.getElementById('filtro-hist-ano');
  const selDia = document.getElementById('filtro-hist-dia');
  const curYear = new Date().getFullYear();

  if (selAno) {
    let anoOptions = '<option value="all">📅 Todos os Anos</option>';
    for (let y = curYear + 1; y >= curYear - 3; y--) {
      anoOptions += `<option value="${y}" ${y === curYear ? 'selected' : ''}>Ano ${y}</option>`;
    }
    selAno.innerHTML = anoOptions;
  }

  if (selDia) {
    let diaOptions = '<option value="all">🗓️ Todos os Dias</option>';
    for (let d = 1; d <= 31; d++) {
      diaOptions += `<option value="${d}">Dia ${String(d).padStart(2, '0')}</option>`;
    }
    selDia.innerHTML = diaOptions;
  }
}

function initEventListeners() {
  const btnRecarregar = document.getElementById('btn-recarregar-hist');
  if (btnRecarregar) {
    btnRecarregar.onclick = async () => {
      btnRecarregar.classList.add('opacity-50', 'pointer-events-none');
      await loadData();
      btnRecarregar.classList.remove('opacity-50', 'pointer-events-none');
    };
  }

  const selAno = document.getElementById('filtro-hist-ano');
  const selMes = document.getElementById('filtro-hist-mes');
  const selDia = document.getElementById('filtro-hist-dia');

  const onFilterChange = () => {
    historyFilter.year = selAno.value === 'all' ? 'all' : Number(selAno.value);
    historyFilter.month = selMes.value;
    historyFilter.day = selDia.value;
    applyFilters();
  };

  if (selAno) selAno.onchange = onFilterChange;
  if (selMes) selMes.onchange = onFilterChange;
  if (selDia) selDia.onchange = onFilterChange;
}

async function loadData() {
  try {
    historyCache = await getPurchaseHistory();
    applyFilters();
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
    const container = document.getElementById('historico-list-container');
    if (container) {
      container.innerHTML = `
        <div class="p-4 bg-error-container/20 text-error rounded-xl text-center text-xs font-semibold">
          Falha ao carregar compras. Tente novamente em instantes.
        </div>
      `;
    }
  }
}

function applyFilters() {
  const balance = calculateSpendingBalance(historyCache, historyFilter);
  renderBalanceCards(balance);
  renderChart(balance.byMonth, balance.month);
  renderTimeline(balance.filteredPurchases);
}

function renderBalanceCards(balance) {
  const lblGasto = document.getElementById('balanco-total-gasto');
  const lblOrcamento = document.getElementById('balanco-total-orcamento');
  const lblEconomia = document.getElementById('balanco-total-economia');
  const lblCount = document.getElementById('balanco-compras-count');
  const lblMedia = document.getElementById('balanco-media-compra');
  const badgeStatus = document.getElementById('balanco-badge-status');
  const anoLabel = document.getElementById('chart-ano-label');

  if (lblGasto) lblGasto.textContent = formatCurrency(balance.totalSpent);
  if (lblOrcamento) lblOrcamento.textContent = formatCurrency(balance.totalBudget);
  if (lblCount) lblCount.textContent = `${balance.count} ${balance.count === 1 ? 'compra registrada' : 'compras registradas'}`;
  if (lblMedia) lblMedia.textContent = `Média: ${formatCurrency(balance.averagePerPurchase)} / compra`;
  if (anoLabel) anoLabel.textContent = balance.year === 'all' ? 'Todos os Anos' : balance.year;

  if (lblEconomia && badgeStatus) {
    if (balance.totalSavings >= 0) {
      lblEconomia.textContent = formatCurrency(balance.totalSavings);
      lblEconomia.className = 'text-2xl font-black text-emerald-600 block mt-1';
      badgeStatus.className = 'px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      badgeStatus.textContent = 'Economia no Período';
    } else {
      lblEconomia.textContent = `- ${formatCurrency(Math.abs(balance.totalSavings))}`;
      lblEconomia.className = 'text-2xl font-black text-rose-600 block mt-1';
      badgeStatus.className = 'px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20';
      badgeStatus.textContent = 'Orçamento Estourado';
    }
  }
}

function renderChart(byMonth, selectedMonth) {
  const chartContainer = document.getElementById('chart-month-bars');
  if (!chartContainer) return;

  const maxSpent = Math.max(...byMonth.map(m => m.spent), 100);

  chartContainer.innerHTML = byMonth.map(m => {
    const pct = Math.max(8, Math.min(100, Math.round((m.spent / maxSpent) * 100)));
    const isSelected = selectedMonth !== 'all' && Number(selectedMonth) === m.month;
    const hasSpending = m.spent > 0;

    const barBg = isSelected
      ? 'bg-primary shadow-md ring-2 ring-primary/40'
      : hasSpending
        ? 'bg-primary/50 hover:bg-primary/70'
        : 'bg-surface-container-highest/60';

    return `
      <div class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" onclick="window.selectHistoryMonth(${m.month})" title="${m.name}: ${formatCurrency(m.spent)} (${m.count} compras)">
        <div class="w-full text-center mb-1 opacity-0 group-hover:opacity-100 transition text-[9px] font-bold text-on-surface-variant truncate">
          ${hasSpending ? formatCurrency(m.spent).replace('R$', '').trim() : ''}
        </div>
        <div class="w-full max-w-[20px] rounded-t-lg transition-all duration-300 ${barBg}" style="height: ${pct}%;"></div>
        <span class="text-[10px] mt-2 font-bold ${isSelected ? 'text-primary' : 'text-on-surface-variant'}">${m.name}</span>
      </div>
    `;
  }).join('');
}

window.selectHistoryMonth = function(m) {
  const selMes = document.getElementById('filtro-hist-mes');
  if (selMes) {
    selMes.value = String(m);
    selMes.dispatchEvent(new Event('change'));
  }
};

function renderTimeline(purchases) {
  const container = document.getElementById('historico-list-container');
  const empty = document.getElementById('empty-state-historico');
  const tagCount = document.getElementById('historico-contador-tag');

  if (tagCount) {
    tagCount.textContent = `${purchases.length} ${purchases.length === 1 ? 'compra' : 'compras'}`;
  }

  if (!purchases || purchases.length === 0) {
    if (container) container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (!container) return;

  container.innerHTML = purchases.map(p => {
    const d = new Date(p.purchasedAt);
    const dateFormatted = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
    const timeFormatted = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const savings = Number(p.savings);
    const isEconomy = savings >= 0;
    const items = p.items || [];
    const icon = categoryIcons[p.category] || '🛒';

    const itemsHtml = items.map(item => {
      const price = Number(item.price || item.preco || 0);
      const qty = Number(item.quantity || item.quantidade || 1);
      const subtotal = price * qty;
      const unit = item.unit || 'un';
      return `
        <div class="flex items-center justify-between text-xs py-1 border-b border-outline-variant/20 last:border-0">
          <span class="text-on-surface truncate pr-2">• ${escapeHtml(item.name || item.nome)} (${qty} ${unit})</span>
          <span class="font-bold text-on-surface-variant shrink-0">${formatCurrency(subtotal)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3" id="card-hist-${p.id}">
        <!-- Topo do Card -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${icon}</span>
            <div>
              <h3 class="text-sm font-bold text-on-surface leading-tight">${escapeHtml(p.listName)}</h3>
              <div class="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                <span>${escapeHtml(p.category)}</span>
                ${p.supermarket ? `<span>•</span> <span class="font-semibold text-primary">${escapeHtml(p.supermarket)}</span>` : ''}
              </div>
            </div>
          </div>
          <span class="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/30 shrink-0">
            📅 ${dateFormatted} às ${timeFormatted}
          </span>
        </div>

        <!-- Grade de Métricas -->
        <div class="grid grid-cols-3 gap-2 bg-surface-container/60 p-2.5 rounded-xl border border-outline-variant/20 text-center">
          <div>
            <span class="text-[10px] font-bold text-on-surface-variant block uppercase">Gasto Real</span>
            <span class="text-xs font-black text-primary block mt-0.5">${formatCurrency(p.totalSpent)}</span>
          </div>
          <div>
            <span class="text-[10px] font-bold text-on-surface-variant block uppercase">Orçamento</span>
            <span class="text-xs font-bold text-on-surface block mt-0.5">${formatCurrency(p.budget)}</span>
          </div>
          <div>
            <span class="text-[10px] font-bold text-on-surface-variant block uppercase">Balanço</span>
            <span class="text-xs font-black block mt-0.5 ${isEconomy ? 'text-emerald-600' : 'text-rose-600'}">
              ${isEconomy ? 'Economizou ' : 'Estourou '} ${formatCurrency(Math.abs(savings))}
            </span>
          </div>
        </div>

        <!-- Sanfona de Itens Discriminados -->
        ${items.length > 0 ? `
          <div>
            <button type="button" class="w-full flex items-center justify-between py-1.5 px-3 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface-variant transition" onclick="window.toggleHistoryItems('${p.id}')">
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">receipt</span>
                Ver ${items.length} ${items.length === 1 ? 'mercadoria' : 'mercadorias'}
              </span>
              <span id="chevron-${p.id}" class="material-symbols-outlined text-sm transition-transform duration-200">expand_more</span>
            </button>
            <div id="dropdown-${p.id}" class="hidden mt-2 p-3 bg-surface-container/40 rounded-xl border border-outline-variant/20 space-y-1">
              ${itemsHtml}
            </div>
          </div>
        ` : ''}

        <!-- Ações do Histórico -->
        <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/20">
          <button type="button" onclick="window.shareHistoryReceipt('${p.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-full transition shadow-sm" title="Compartilhar comprovante da compra no WhatsApp">
            <span class="material-symbols-outlined text-sm">share</span>
            WhatsApp
          </button>
          <button type="button" onclick="window.deleteHistoryRecord('${p.id}')" class="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold rounded-full border border-rose-500/20 transition active:scale-95" title="Excluir este registro">
            <span class="material-symbols-outlined text-sm">delete</span>
            Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleHistoryItems = function(id) {
  const drop = document.getElementById(`dropdown-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  if (drop) {
    const isHidden = drop.classList.contains('hidden');
    if (isHidden) {
      drop.classList.remove('hidden');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
      drop.classList.add('hidden');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  }
};

window.shareHistoryReceipt = function(id) {
  const p = historyCache.find(item => item.id === id);
  if (!p) return;

  const dateFormatted = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
  const items = p.items || [];
  let msg = `🛒 *Comprovante de Compra - Compras Plus*\n`;
  msg += `📋 *${p.listName}* (${p.category})\n`;
  if (p.supermarket) msg += `🏪 Supermercado: *${p.supermarket}*\n`;
  msg += `📅 Data: ${dateFormatted}\n`;
  msg += `-----------------------------\n`;

  items.forEach(it => {
    const price = Number(it.price || it.preco || 0);
    const qty = Number(it.quantity || it.quantidade || 1);
    const sub = price * qty;
    msg += `• ${it.name || it.nome}: ${qty} ${it.unit || 'un'} = ${formatCurrency(sub)}\n`;
  });

  msg += `-----------------------------\n`;
  msg += `💰 *Gasto Real:* ${formatCurrency(p.totalSpent)}\n`;
  if (p.budget > 0) {
    msg += `🎯 *Orçamento Previsto:* ${formatCurrency(p.budget)}\n`;
    if (p.savings >= 0) {
      msg += `✨ *Economia:* ${formatCurrency(p.savings)}\n`;
    } else {
      msg += `⚠️ *Acima do Teto:* ${formatCurrency(Math.abs(p.savings))}\n`;
    }
  }

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
};

window.deleteHistoryRecord = async function(id) {
  if (!confirm('Deseja realmente excluir este comprovante do histórico? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    await deletePurchaseHistory(id);
    historyCache = historyCache.filter(item => item.id !== id);
    applyFilters();
  } catch (err) {
    alert('Erro ao excluir registro: ' + err.message);
  }
};
