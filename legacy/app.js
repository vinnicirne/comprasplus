/**
 * app.js - Lógica da Aplicação Mobile-First & Banco de Dados Real
 * Totalmente reativo, sem dados mockados e com suporte completo a IndexedDB e PWA.
 */

// Ícones por categoria
const CATEGORY_ICONS = {
  'Mercearia': '🌾',
  'Hortifrúti': '🍎',
  'Carnes & Aves': '🥩',
  'Laticínios & Frios': '🧀',
  'Bebidas': '🧃',
  'Limpeza': '🧹',
  'Higiene Pessoal': '🧴',
  'Padaria': '🍞',
  'Congelados': '🧊',
  'Outros': '📦',
  'Supermercado': '🛒',
  'Feira & Hortifrúti': '🥬',
  'Açougue & Carnes': '🥩',
  'Farmácia': '💊',
  'Padaria & Confeitaria': '🥖',
  'Casa & Construção': '🏠',
  'Pet Shop': '🐾',
  'Churrasco & Eventos': '🔥'
};

// Estado da Aplicação
let state = {
  lists: [],
  activeListId: null,
  filterCategory: 'TODAS'
};

let deferredInstallPrompt = null;

// ==========================================================
// SISTEMA DE TOAST (Substitui alert/confirm/prompt nativo)
// ==========================================================

function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || '💡'}</span><span class="toast-text">${escapeHtml(msg)}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-hide');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// showConfirm: substitui confirm() com Promise
function showConfirm(msg, title = 'Confirmar', icon = '⚠️', okLabel = '✅ Confirmar', okClass = 'btn-primary') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('modal-confirm-title').textContent = title;
    document.getElementById('modal-confirm-msg').textContent = msg;
    document.getElementById('modal-confirm-icon').textContent = icon;
    const btnOk = document.getElementById('modal-confirm-ok');
    const btnCancel = document.getElementById('modal-confirm-cancel');
    btnOk.className = `btn ${okClass}`;
    btnOk.textContent = okLabel;
    modal.classList.remove('hidden');

    const cleanup = (result) => {
      modal.classList.add('hidden');
      btnOk.replaceWith(btnOk.cloneNode(true));
      btnCancel.replaceWith(btnCancel.cloneNode(true));
      resolve(result);
    };

    document.getElementById('modal-confirm-ok').addEventListener('click', () => cleanup(true), { once: true });
    document.getElementById('modal-confirm-cancel').addEventListener('click', () => cleanup(false), { once: true });
  });
}

// ==========================================================
// Funções Utilitárias & Formatação
// ==========================================================

function formatCurrency(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function getIcon(cat) {
  return CATEGORY_ICONS[cat] || '🏷️';
}

function generateId() {
  return 'item_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function vibrateDevice(ms = 15) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (_) {}
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================
// Cálculos Financeiros da Lista
// ==========================================================

function calculateItemSubtotal(item) {
  const qtd = Number(item.quantity) || 0;
  const preco = Number(item.unitPrice) || 0;
  const unit = item.unit || 'un';

  if (unit === 'g') {
    // Gramas: Preço anunciado é por Quilo (ex: 300g com preço R$ 50/kg = R$ 15,00)
    return (qtd / 1000) * preco;
  }
  // Para 'un', 'kg', 'L' ou outros: Quantidade * Preço Unitário
  return qtd * preco;
}

function calculateListTotals(list) {
  const items = list.items || [];
  
  // Total Gasto = Computa EXCLUSIVAMENTE os itens marcados como comprados (carrinho)
  const totalGasto = items.reduce((sum, item) => {
    if (item.checked) {
      return sum + calculateItemSubtotal(item);
    }
    return sum;
  }, 0);

  // Total Estimado (caso todos os itens tivessem sido comprados)
  const totalPrevisto = items.reduce((sum, item) => {
    return sum + calculateItemSubtotal(item);
  }, 0);

  const orcamento = Number(list.budget) || 0;
  const saldoDisponivel = orcamento - totalGasto;
  const percentualConsumido = orcamento > 0 ? (totalGasto / orcamento) * 100 : 0;

  return {
    orcamento,
    totalGasto,
    totalPrevisto,
    saldoDisponivel,
    percentualConsumido: Math.max(0, percentualConsumido)
  };
}

// ==========================================================
// Inicialização de Dados do Banco (IndexedDB)
// ==========================================================

async function loadDataFromDb() {
  await db.loadSession();
  const isAuth = db.isAuthenticated();
  const isAdmin = db.isAdmin();

  const btnConfig = document.getElementById('btn-abrir-config');
  if (btnConfig) {
    if (isAdmin) btnConfig.classList.remove('hidden');
    else btnConfig.classList.add('hidden');
  }

  if (!isAuth) {
    state.lists = [];
    state.activeListId = null;
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lista-detalhe').classList.add('hidden');
    const fab = document.getElementById('fab-action-btn');
    if (fab) fab.classList.add('hidden');
    updateAuthUI();
    lockAppWithAuthGate();
    return;
  }

  unlockAppFromAuthGate();

  // Roteamento por hash ao recarregar
  const hash = window.location.hash;
  if (hash.startsWith('#/listas/')) {
    const lid = hash.replace('#/listas/', '');
    state.activeListId = lid;
  }

  if (state.activeListId) {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lista-detalhe').classList.remove('hidden');
  } else {
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('view-lista-detalhe').classList.add('hidden');
  }

  const fab = document.getElementById('fab-action-btn');
  if (fab) fab.classList.remove('hidden');

  try {
    state.lists = await db.getLists();
    renderDashboard();
    updateAuthUI();
    checkPendingInviteAfterLogin();
    // Se veio de hash com lista aberta, abre ela
    if (state.activeListId) {
      await renderListDetail(state.activeListId);
    }
  } catch (err) {
    console.error('Erro ao carregar dados do banco:', err);
    state.lists = [];
    renderDashboard();
    updateAuthUI();
    checkPendingInviteAfterLogin();
  }
}

function lockAppWithAuthGate() {
  const initialView = document.getElementById('view-login-inicial');
  const mainShell = document.getElementById('main-app-shell');
  const fab = document.getElementById('fab-action-btn');

  if (initialView) initialView.classList.remove('hidden');
  if (mainShell) mainShell.classList.add('hidden');
  if (fab) fab.classList.add('hidden');

  closeAllSheets();
  showInitialAuthTab('login');
}

function unlockAppFromAuthGate() {
  const initialView = document.getElementById('view-login-inicial');
  const mainShell = document.getElementById('main-app-shell');

  if (initialView) initialView.classList.add('hidden');
  if (mainShell) mainShell.classList.remove('hidden');

  closeAllSheets();
}

// ==========================================================
// Renderização: Dashboard (Minhas Listas)
// ==========================================================

function renderDashboard() {
  const container = document.getElementById('listas-container');
  const emptyState = document.getElementById('empty-state-listas');
  
  // Atualizar contadores de pílulas (Filtros)
  const inProgress = state.lists.filter(l => l.status !== 'concluida');
  const completed = state.lists.filter(l => l.status === 'concluida');
  
  const elCountAll = document.getElementById('filter-count-all');
  const elCountProg = document.getElementById('filter-count-progress');
  const elCountPend = document.getElementById('filter-count-pending');
  const elCountComp = document.getElementById('filter-count-completed');

  if(elCountAll) elCountAll.textContent = state.lists.length;
  if(elCountProg) elCountProg.textContent = inProgress.length;
  if(elCountPend) elCountPend.textContent = '0'; // Simplificado
  if(elCountComp) elCountComp.textContent = completed.length;

  // Atualizar Hero Card
  let totalOrcamento = 0;
  let totalGasto = 0;
  
  state.lists.forEach(l => {
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
  if(heroActiveCount) heroActiveCount.textContent = inProgress.length;
  
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

  // Renderizar listas
  if (state.lists.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    return;
  }

  emptyState.classList.add('hidden');
  emptyState.classList.remove('flex');

  container.innerHTML = state.lists.map(list => {
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
    const listDateFormatted = formatDateBR(list.date || list.createdAt);

    let badgeStatus = '';
    if (isConcluida) {
      badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[12px] text-primary">check</span> Concluída</span>`;
    } else if (list.isShared) {
      badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">group</span> Compartilhada</span>`;
    } else {
      badgeStatus = `<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Ativa</span>`;
    }

    return `
      <article class="list-card group relative ${isConcluida ? 'bg-surface-container-low/70 opacity-90' : 'bg-surface-container-lowest'} rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 border border-outline-variant/30 flex flex-col gap-3" data-status="${isConcluida ? 'completed' : 'in_progress'}" data-title="${escapeHtml(list.name)}">
        <!-- Cabeçalho -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">${iconName}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <h2 class="font-label-lg text-label-lg text-on-surface truncate font-bold leading-snug ${isConcluida ? 'line-through decoration-outline-variant' : ''}">${escapeHtml(list.name)}</h2>
              <div class="flex items-center gap-1.5 text-on-surface-variant text-[11px] leading-tight mt-0.5">
                <span class="material-symbols-outlined text-[13px] text-primary">calendar_month</span>
                <span class="">${listDateFormatted}</span>
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
          
          <div class="flex gap-2">
            ${!isConcluida ? `
            <button aria-label="Finalizar Lista" class="h-8 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-[12px] font-semibold flex items-center gap-1 hover:bg-surface-container-highest active:scale-95 transition-all shadow-sm" onclick="window.openConcluirCompraModalById('${list.id}', event)">
              <span class="material-symbols-outlined text-[16px]">done_all</span>
            </button>
            ` : ''}
            <button aria-label="Abrir lista" class="h-8 px-3.5 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] font-semibold flex items-center gap-1 hover:bg-primary-container active:scale-95 transition-all shadow-sm" onclick="openList('${list.id}', event)">
              ${isConcluida ? 'Ver Lista' : 'Abrir'}
              <span class="material-symbols-outlined text-[16px]">${isConcluida ? 'visibility' : 'chevron_right'}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  if (typeof applyFilterAndSearch === 'function') {
    applyFilterAndSearch();
  }
}

// ==========================================================
// Renderização: Detalhe da Lista (Itens & Orçamento)
// ==========================================================

let listSyncInterval = null;

function stopListAutoSync() {
  if (window.listSyncInterval) {
    clearInterval(window.listSyncInterval);
    window.listSyncInterval = null;
  }
  if (window.listRealtimeSubscription) {
    window.listRealtimeSubscription.unsubscribe();
    window.listRealtimeSubscription = null;
  }
}

function startListAutoSync(listId) {
  stopListAutoSync();
  
  if (db.supabaseClient && db.isCloudOnline) {
    window.listRealtimeSubscription = db.supabaseClient
      .channel(`public:listas:id=eq.${listId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listas', filter: `id=eq.${listId}` }, payload => {
        if (state.activeListId === String(listId) && !document.hidden) {
          const fresh = payload.new;
          if (fresh && fresh.items) {
            // Check for new items to add badge
            const currentList = state.lists.find(l => String(l.id) === String(listId));
            if (currentList && currentList.items) {
              const currentItemIds = currentList.items.map(i => i.id);
              fresh.items.forEach(item => {
                if (!currentItemIds.includes(item.id)) {
                  item.isNew = true; setTimeout(() => { item.isNew = false; renderListDetailView(state.lists.find(l => String(l.id) === String(listId))); }, 5000);
                }
              });
            }
            const idx = state.lists.findIndex(l => String(l.id) === String(listId));
            if (idx !== -1) state.lists[idx] = fresh;
            renderListDetailView(fresh);
          }
        }
      })
      .subscribe();
  } else {
    window.listSyncInterval = setInterval(async () => {
      if (state.activeListId === String(listId) && !document.hidden) {
        try {
          const fresh = await db.getListById(listId);
          if (fresh && state.activeListId === String(listId)) {
            const idx = state.lists.findIndex(l => String(l.id) === String(listId));
            if (idx !== -1) state.lists[idx] = fresh;
            renderListDetailView(fresh);
          }
        } catch (_) {}
      }
    }, 4000);
  }
}

async function renderListDetail(listId) {
  // 1. Renderiza imediatamente com dados em cache local se existirem (resposta instantânea)
  let list = state.lists.find(l => String(l.id) === String(listId));
  if (list) {
    state.activeListId = String(list.id);
    renderListDetailView(list);
  }

  // 2. Busca versão mais recente na nuvem (garante que produtos inseridos por parceiros apareçam)
  try {
    const cloudList = await db.getListById(listId);
    if (cloudList) {
      list = cloudList;
      const idx = state.lists.findIndex(l => String(l.id) === String(listId));
      if (idx !== -1) {
        state.lists[idx] = cloudList;
      } else {
        state.lists.unshift(cloudList);
      }
      state.activeListId = String(cloudList.id);
      renderListDetailView(cloudList);
    }
  } catch (e) {
    console.warn('Erro ao atualizar lista em tempo real:', e);
  }

  if (!list) {
    console.warn('Lista não encontrada para ID:', listId);
    showDashboard();
    return;
  }

  // Inicia sincronização automática em segundo plano enquanto a lista estiver aberta
  startListAutoSync(listId);
}

function renderListDetailView(list) {
  // Permissão da Lista
  const perm = db.getListPermission(list);
  const sharedBanner = document.getElementById('detalhe-shared-banner');
  const sharedText = document.getElementById('shared-banner-text');
  const sharedIcon = document.getElementById('shared-banner-icon');
  const btnEditarOrcamento = document.getElementById('btn-editar-orcamento');
  const btnAbrirConcluir = document.getElementById('btn-abrir-finalizar-compra');
  const fab = document.getElementById('fab-action-btn');

  if (perm === 'fechado') {
    if (sharedBanner) {
      sharedBanner.className = 'shared-mode-banner';
      sharedBanner.classList.remove('hidden');
    }
    if (sharedIcon) sharedIcon.textContent = '🔒';
    if (sharedText) sharedText.textContent = 'Modo Fechado: Somente Leitura. Você pode acompanhar a lista em tempo real, mas a adição e edição de mercadorias está bloqueada pelo dono.';
    if (btnEditarOrcamento) btnEditarOrcamento.classList.add('hidden');
    if (btnAbrirConcluir) btnAbrirConcluir.classList.add('hidden');
    if (fab) fab.classList.add('hidden');
  } else if (perm === 'aberto') {
    if (sharedBanner) {
      sharedBanner.className = 'shared-mode-banner';
      sharedBanner.style.background = '#f0fdf4';
      sharedBanner.style.borderColor = '#bbf7d0';
      sharedBanner.style.color = '#166534';
      sharedBanner.classList.remove('hidden');
    }
    if (sharedIcon) sharedIcon.textContent = '🟢';
    if (sharedText) sharedText.textContent = 'Modo Aberto: Você é colaborador desta lista e pode adicionar produtos e marcar compras.';
    if (btnEditarOrcamento) btnEditarOrcamento.classList.remove('hidden');
    if (btnAbrirConcluir) btnAbrirConcluir.classList.remove('hidden');
    if (fab) fab.classList.remove('hidden');
  } else {
    // Dono
    if (sharedBanner) sharedBanner.classList.add('hidden');
    if (btnEditarOrcamento) btnEditarOrcamento.classList.remove('hidden');
    if (btnAbrirConcluir) btnAbrirConcluir.classList.remove('hidden');
    if (fab) fab.classList.remove('hidden');
  }

  // Atualizar cabeçalho da lista
  document.getElementById('detalhe-nome-lista').textContent = list.name;
  document.getElementById('detalhe-categoria-tag').textContent = `${getIcon(list.category)} ${list.category}`;

  const elDetalheData = document.getElementById('detalhe-data-tag');
  if (elDetalheData) {
    const dStr = formatDateBR(list.date || list.createdAt);
    elDetalheData.textContent = dStr ? `📅 ${dStr}` : `📅 Hoje`;
  }

  const elDetalheStatus = document.getElementById('detalhe-status-badge');
  if (elDetalheStatus) {
    if (list.status === 'concluida') {
      elDetalheStatus.classList.remove('hidden');
    } else {
      elDetalheStatus.classList.add('hidden');
    }
  }

  if (btnAbrirConcluir) {
    if (list.status === 'concluida') {
      btnAbrirConcluir.innerHTML = '✅ Concluída';
      btnAbrirConcluir.title = 'Compra já concluída e gravada no histórico. Clique para revisar ou regravar.';
    } else {
      btnAbrirConcluir.innerHTML = '🏁 Concluir';
      btnAbrirConcluir.title = 'Finalizar compra, gravar no histórico e deduzir do saldo';
    }
  }

  // Calcular métricas
  const { orcamento, totalGasto, saldoDisponivel, percentualConsumido } = calculateListTotals(list);

  document.getElementById('metric-orcamento').textContent = formatCurrency(orcamento);
  document.getElementById('metric-gasto').textContent = formatCurrency(totalGasto);
  document.getElementById('metric-saldo').textContent = formatCurrency(saldoDisponivel);
  document.getElementById('progress-percent-text').textContent = `${Math.round(percentualConsumido)}%`;

  const boxSaldo = document.getElementById('box-saldo-disponivel');
  const statusSaldo = document.getElementById('metric-saldo-status');
  const progressFill = document.getElementById('budget-progress-fill');
  const progressMsg = document.getElementById('progress-status-msg');

  boxSaldo.classList.remove('saldo-positivo', 'saldo-alerta', 'saldo-negativo');
  progressFill.classList.remove('prog-green', 'prog-yellow', 'prog-red');

  progressFill.style.width = `${Math.min(100, Math.max(0, percentualConsumido))}%`;

  if (saldoDisponivel < 0) {
    boxSaldo.classList.add('saldo-negativo');
    progressFill.classList.add('prog-red');
    statusSaldo.textContent = `Excedido em ${formatCurrency(Math.abs(saldoDisponivel))}`;
    progressMsg.textContent = 'Orçamento Estourado!';
    progressMsg.style.color = 'var(--danger)';
  } else if (percentualConsumido >= 75) {
    boxSaldo.classList.add('saldo-alerta');
    progressFill.classList.add('prog-yellow');
    statusSaldo.textContent = `Restam apenas ${formatCurrency(saldoDisponivel)}`;
    progressMsg.textContent = 'Atenção ao Limite';
    progressMsg.style.color = 'var(--warning-text)';
  } else {
    boxSaldo.classList.add('saldo-positivo');
    progressFill.classList.add('prog-green');
    statusSaldo.textContent = `Restante livre: ${formatCurrency(saldoDisponivel)}`;
    progressMsg.textContent = 'Seguro';
    progressMsg.style.color = 'var(--success)';
  }

  // Renderizar produtos
  renderProductCards(list);

  // Trocar telas (via hash)
  const viewDash = document.getElementById('view-dashboard');
  const viewDetail = document.getElementById('view-lista-detalhe');
  if (viewDash) viewDash.classList.add('hidden');
  if (viewDetail) viewDetail.classList.remove('hidden');

  // Atualiza botão Reabrir
  const btnReabrir = document.getElementById('btn-reabrir-lista');
  if (btnReabrir) {
    if (list.status === 'concluida') {
      btnReabrir.classList.remove('hidden');
    } else {
      btnReabrir.classList.add('hidden');
    }
  }
}

function renderProductCards(list) {
  const container = document.getElementById('produtos-mobile-container');
  const emptyState = document.getElementById('empty-state-produtos');
  const badgeContador = document.getElementById('itens-contador');

  let items = list.items || [];
  const perm = db.getListPermission(list);
  const isReadOnly = perm === 'fechado';

  // Filtrar por categoria se houver filtro selecionado
  if (state.filterCategory && state.filterCategory !== 'TODAS') {
    items = items.filter(it => it.category === state.filterCategory);
  }

  badgeContador.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;

  if (items.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = items.map(item => {
    const qtd = Number(item.quantity) || 0;
    const preco = Number(item.unitPrice) || 0;
    const unit = item.unit || 'un';
    const subtotal = calculateItemSubtotal(item);
    const catIcon = getIcon(item.category);

    let unitDisplay = '';
    if (unit === 'kg') {
      unitDisplay = `${qtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg × ${formatCurrency(preco)}/kg`;
    } else if (unit === 'g') {
      const kgEq = (qtd / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
      unitDisplay = `${qtd} g (${kgEq} kg) × ${formatCurrency(preco)}/kg`;
    } else if (unit === 'L') {
      unitDisplay = `${qtd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L × ${formatCurrency(preco)}/L`;
    } else {
      unitDisplay = `${qtd} un × ${formatCurrency(preco)}`;
    }

    return `
      <div class="mobile-product-card ${item.checked ? 'item-comprado' : ''}" id="card-item-${item.id}">
        <div class="product-left-col">
          <input 
            type="checkbox" 
            class="mobile-checkbox" 
            ${item.checked ? 'checked' : ''} 
            ${isReadOnly ? 'disabled' : ''}
            data-list-id="${list.id}"
            data-item-id="${item.id}"
            title="${isReadOnly ? 'Somente leitura' : (item.checked ? 'Desmarcar item' : 'Marcar como comprado')}"
          >
          <div class="product-info-group flex items-center flex-wrap" onclick="handleOpenEditItem('${list.id}', '${item.id}')" style="cursor:pointer;" title="${isReadOnly ? 'Somente leitura' : 'Toque para editar o produto'}">
            <span class="product-name mr-1">${escapeHtml(item.name)}</span>
            ${item.isNew ? '<span class="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-sm font-bold ml-1 animate-pulse" id="badge-new-' + item.id + '">NOVO</span>' : ''}
            <div class="product-meta-sub w-full mt-0.5">
              <span>${catIcon} ${escapeHtml(item.category)}</span>
              <span> &bull; </span>
              <span class="product-qty-badge">${unitDisplay}</span>
            </div>
          </div>
        </div>

        <div class="product-right-col">
          ${preco <= 0 ? `
            <button type="button" class="btn-item-price-chip sem-preco" onclick="handleEditItemPrice('${list.id}', '${item.id}')" title="Toque para colocar o preço de mercado">
              🏷️ Colocar Preço
            </button>
          ` : `
            <button type="button" class="btn-item-price-chip com-preco" onclick="handleEditItemPrice('${list.id}', '${item.id}')" title="Toque para alterar o preço">
              ${formatCurrency(subtotal)} ✎
            </button>
          `}
          ${!isReadOnly ? `
            <button class="btn-edit-item" title="Editar produto" onclick="handleOpenEditItem('${list.id}', '${item.id}')">✏️</button>
            <button class="btn-trash" title="Excluir item" onclick="handleDeleteItem('${list.id}', '${item.id}')">✕</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Delega evento de checkbox via container (evita problemas com innerHTML dinâmico)
  container.querySelectorAll('.mobile-checkbox').forEach(cb => {
    cb.addEventListener('change', function() {
      const lid = this.dataset.listId;
      const iid = this.dataset.itemId;
      handleToggleItem(lid, iid, this.checked, this);
    });
  });
}

// ==========================================================
// Ações de Navegação e Interação
// ==========================================================

async function openList(listId, event) {
  if (event) event.stopPropagation();
  state.filterCategory = 'TODAS';
  document.querySelectorAll('#chips-categorias .chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === 'TODAS');
  });
  // Atualiza hash da URL
  window.history.pushState({}, '', `#/listas/${listId}`);
  await renderListDetail(listId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDashboard() {
  stopListAutoSync();
  state.activeListId = null;
  window.history.pushState({}, '', '#/listas');
  const viewDash = document.getElementById('view-dashboard');
  const viewDetail = document.getElementById('view-lista-detalhe');
  if (viewDetail) viewDetail.classList.add('hidden');
  if (viewDash) viewDash.classList.remove('hidden');
  renderDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Exposição explícita no window para garantir chamada em eventos inline
window.openList = openList;
window.showDashboard = showDashboard;
window.handleDeleteList = handleDeleteList;
window.handleToggleItem = handleToggleItem;
window.handleDeleteItem = handleDeleteItem;
window.handleEditItemPrice = handleEditItemPrice;
window.shareListWhatsApp = shareListWhatsApp;

// ==========================================================
// Compartilhamento via WhatsApp
// ==========================================================

function shareListWhatsApp() {
  if (!state.activeListId) return;
  const list = state.lists.find(l => String(l.id) === String(state.activeListId));
  if (!list) return;

  const { orcamento, totalGasto, saldoDisponivel } = calculateListTotals(list);
  const items = list.items || [];

  let msg = `🛒 *${list.name}*\n`;
  msg += `🏷️ Categoria: ${list.category}\n`;
  msg += `💰 Orçamento: ${formatCurrency(orcamento)} | Gasto: ${formatCurrency(totalGasto)} | Saldo: ${formatCurrency(saldoDisponivel)}\n\n`;
  msg += `*Itens da Compra:*\n`;

  if (items.length === 0) {
    msg += `(Nenhum item cadastrado)\n`;
  } else {
    items.forEach(it => {
      const check = it.checked ? '✅' : '⬜';
      const unit = it.unit || 'un';
      const subtotal = calculateItemSubtotal(it);
      let unitText = '';
      if (unit === 'kg') {
        unitText = `${it.quantity} kg (${formatCurrency(it.unitPrice)}/kg)`;
      } else if (unit === 'g') {
        unitText = `${it.quantity} g (${formatCurrency(it.unitPrice)}/kg)`;
      } else if (unit === 'L') {
        unitText = `${it.quantity} L (${formatCurrency(it.unitPrice)}/L)`;
      } else {
        unitText = `${it.quantity} un (${formatCurrency(it.unitPrice)})`;
      }
      msg += `${check} ${it.name} - ${unitText} = ${formatCurrency(subtotal)}\n`;
    });
  }

  msg += `\n📱 _Enviado via Compras Plus App_`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

async function handleDeleteList(listId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const list = state.lists.find(l => String(l.id) === String(listId));
  const listName = list ? list.name : 'esta lista';
  const isOwner = list ? (!list.isShared && (list.userId === db.getUser()?.id || !list.userId)) : true;

  const confirmMsg = isOwner 
    ? `Deseja realmente excluir permanentemente a lista "${listName}" e todos os seus itens?`
    : `Deseja sair e remover a lista compartilhada "${listName}" do seu aplicativo?`;

  const ok = await showConfirm(confirmMsg, isOwner ? '🗑️ Excluir Lista' : '🚶 Sair da Lista', isOwner ? '🗑️' : '🚶', isOwner ? '🗑️ Excluir' : '🚶 Sair', 'btn-danger-outline');
  if (!ok) return;

  vibrateDevice(35);
  try {
    await db.deleteList(listId);
    state.lists = state.lists.filter(l => String(l.id) !== String(listId));
    if (state.activeListId === String(listId)) {
      stopListAutoSync();
      showDashboard();
    } else {
      renderDashboard();
    }
    showToast(isOwner ? `Lista "${listName}" excluída.` : `Você saiu da lista "${listName}".`, 'success');
  } catch (err) {
    showToast('Erro ao excluir lista: ' + (err.message || err), 'error');
  }
}

async function handleToggleItem(listId, itemId, checked, checkboxEl) {
  vibrateDevice(15);

  // Optimistic update: atualiza imediatamente na UI local
  const list = state.lists.find(l => String(l.id) === String(listId));
  if (list && list.items) {
    const item = list.items.find(i => String(i.id) === String(itemId));
    if (item) {
      item.checked = checked;
      // Atualiza card financeiro imediatamente (saldo/gasto do orçamento)
      updateBudgetMetricsOnly(list);
      // Anima o card do item
      const card = document.getElementById(`card-item-${itemId}`);
      if (card) {
        if (checked) card.classList.add('item-comprado');
        else card.classList.remove('item-comprado');
      }
    }
  }

  // Se marcando e sem preço, abre bottom sheet de edição focado no preço
  if (checked && list && list.items) {
    const item = list.items.find(i => String(i.id) === String(itemId));
    if (item && (Number(item.unitPrice) || 0) <= 0) {
      handleOpenEditItem(listId, itemId, true);
      return;
    }
  }

  // Persiste no banco
  try {
    const updatedList = await db.toggleItem(listId, itemId, checked);
    if (updatedList) {
      const idx = state.lists.findIndex(l => String(l.id) === String(listId));
      if (idx !== -1) state.lists[idx] = updatedList;
      updateBudgetMetricsOnly(updatedList);
    }
  } catch (err) {
    // Reverte se falhou
    if (list && list.items) {
      const item = list.items.find(i => String(i.id) === String(itemId));
      if (item) item.checked = !checked;
      updateBudgetMetricsOnly(list);
      const card = document.getElementById(`card-item-${itemId}`);
      if (card) {
        if (!checked) card.classList.add('item-comprado');
        else card.classList.remove('item-comprado');
      }
    }
    if (checkboxEl) checkboxEl.checked = !checked;
    showToast('Erro ao salvar. Verifique sua conexão.', 'error');
  }
}

// Atualiza apenas os cards financeiros sem re-renderizar toda a lista de itens
function updateBudgetMetricsOnly(list) {
  if (!list) return;
  const { orcamento, totalGasto, saldoDisponivel, percentualConsumido } = calculateListTotals(list);
  const elOrc = document.getElementById('metric-orcamento');
  const elGasto = document.getElementById('metric-gasto');
  const elSaldo = document.getElementById('metric-saldo');
  const elPct = document.getElementById('progress-percent-text');
  const progressFill = document.getElementById('budget-progress-fill');
  const boxSaldo = document.getElementById('box-saldo-disponivel');
  const statusSaldo = document.getElementById('metric-saldo-status');
  const progressMsg = document.getElementById('progress-status-msg');

  if (elOrc) elOrc.textContent = formatCurrency(orcamento);
  if (elGasto) elGasto.textContent = formatCurrency(totalGasto);
  if (elSaldo) elSaldo.textContent = formatCurrency(saldoDisponivel);
  if (elPct) elPct.textContent = `${Math.round(percentualConsumido)}%`;
  if (progressFill) {
    progressFill.style.width = `${Math.min(100, Math.max(0, percentualConsumido))}%`;
    progressFill.classList.remove('prog-green', 'prog-yellow', 'prog-red');
    if (saldoDisponivel < 0) progressFill.classList.add('prog-red');
    else if (percentualConsumido >= 75) progressFill.classList.add('prog-yellow');
    else progressFill.classList.add('prog-green');
  }
  if (boxSaldo) {
    boxSaldo.classList.remove('saldo-positivo', 'saldo-alerta', 'saldo-negativo');
    if (saldoDisponivel < 0) {
      boxSaldo.classList.add('saldo-negativo');
      if (statusSaldo) statusSaldo.textContent = `Excedido em ${formatCurrency(Math.abs(saldoDisponivel))}`;
      if (progressMsg) { progressMsg.textContent = 'Orçamento Estourado!'; progressMsg.style.color = 'var(--danger)'; }
    } else if (percentualConsumido >= 75) {
      boxSaldo.classList.add('saldo-alerta');
      if (statusSaldo) statusSaldo.textContent = `Restam apenas ${formatCurrency(saldoDisponivel)}`;
      if (progressMsg) { progressMsg.textContent = 'Atenção ao Limite'; progressMsg.style.color = 'var(--warning-text)'; }
    } else {
      boxSaldo.classList.add('saldo-positivo');
      if (statusSaldo) statusSaldo.textContent = `Restante livre: ${formatCurrency(saldoDisponivel)}`;
      if (progressMsg) { progressMsg.textContent = 'Seguro'; progressMsg.style.color = 'var(--success)'; }
    }
  }
}

async function handleEditItemPrice(listId, itemId) {
  // Abre sheet de edição com foco no campo de preço
  handleOpenEditItem(listId, itemId, false, true);
}

async function handleDeleteItem(listId, itemId) {
  vibrateDevice(25);
  const list = state.lists.find(l => String(l.id) === String(listId));
  const item = list?.items?.find(i => String(i.id) === String(itemId));
  const ok = await showConfirm(`Excluir "${item?.name || 'este item'}" da lista?`, 'Excluir Item', '🗑️', '🗑️ Excluir', 'btn-danger-outline');
  if (!ok) return;
  const updatedList = await db.deleteItem(listId, itemId);
  if (updatedList) {
    const idx = state.lists.findIndex(l => String(l.id) === String(listId));
    if (idx !== -1) state.lists[idx] = updatedList;
    renderProductCards(updatedList);
    updateBudgetMetricsOnly(updatedList);
    showToast('Item excluído.', 'success', 2000);
  }
}

// ==========================================================
// Bottom Sheets (Modais Deslizantes do Celular)
// ==========================================================

function openSheet(id) {
  const sheet = document.getElementById(id);
  if (sheet) {
    sheet.classList.remove('hidden');
    if (window.admobManager && typeof window.admobManager.hideBanner === 'function') {
      window.admobManager.hideBanner();
    }
  }
}

function closeSheet(id) {
  const sheet = document.getElementById(id);
  if (sheet) {
    sheet.classList.add('hidden');
  }
  const remainingSheets = document.querySelectorAll('.bottom-sheet-backdrop:not(.hidden)');
  if (remainingSheets.length === 0) {
    if (window.admobManager && typeof window.admobManager.resumeBanner === 'function') {
      window.admobManager.resumeBanner();
    }
  }
}

function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet-backdrop').forEach(s => s.classList.add('hidden'));
  if (window.admobManager && typeof window.admobManager.resumeBanner === 'function') {
    window.admobManager.resumeBanner();
  }
}

// ==========================================================
// Formulários: Nova Lista & Novo Produto
// ==========================================================

async function handleCreateList(e) {
  e.preventDefault();
  const nome = document.getElementById('nova-lista-nome').value.trim();
  const categoria = document.getElementById('nova-lista-categoria').value;
  const orcamento = parseFloat(document.getElementById('nova-lista-orcamento').value) || 0;
  const dataInput = document.getElementById('nova-lista-data')?.value || new Date().toISOString().split('T')[0];

  if (!nome) {
    showToast('Informe o nome da lista.', 'warning');
    return;
  }

  const newList = {
    id: generateId(),
    name: nome,
    category: categoria,
    budget: orcamento,
    date: dataInput,
    status: 'aberta',
    createdAt: new Date().toISOString(),
    items: []
  };

  vibrateDevice(25);

  // Optimistic: adiciona localmente primeiro
  state.lists.unshift(newList);
  closeSheet('sheet-nova-lista');
  document.getElementById('form-nova-lista').reset();
  openList(newList.id);

  // Persiste no banco em background
  try {
    await db.saveList(newList);
    showToast(`Lista "${nome}" criada!`, 'success');
  } catch (err) {
    showToast('Erro ao salvar lista na nuvem: ' + (err.message || err), 'error');
  }
}

function setProductUnit(unit) {
  const hiddenInput = document.getElementById('produto-unidade');
  if (hiddenInput) hiddenInput.value = unit;

  document.querySelectorAll('#produto-unidade-group .unit-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });

  const labelQtd = document.getElementById('label-produto-quantidade');
  const labelPreco = document.getElementById('label-produto-preco');
  const qtdInput = document.getElementById('produto-quantidade');
  const tipEl = document.getElementById('unit-helper-tip');

  if (unit === 'kg') {
    if (labelQtd) labelQtd.textContent = 'Peso (kg) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Kg (R$)';
    if (qtdInput) {
      qtdInput.step = '0.1';
      qtdInput.min = '0.1';
      if (!qtdInput.value || qtdInput.value === '250') qtdInput.value = '1';
      qtdInput.placeholder = 'Ex: 1.5';
    }
    if (tipEl) tipEl.style.display = 'none';
  } else if (unit === 'g') {
    if (labelQtd) labelQtd.textContent = 'Peso (Gramas - g) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Kg no Mercado (R$)';
    if (qtdInput) {
      qtdInput.step = '50';
      qtdInput.min = '50';
      if (!qtdInput.value || qtdInput.value === '1') qtdInput.value = '250';
      qtdInput.placeholder = 'Ex: 300';
    }
    if (tipEl) tipEl.style.display = 'block';
  } else if (unit === 'L') {
    if (labelQtd) labelQtd.textContent = 'Volume (Litros - L) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Litro (R$)';
    if (qtdInput) {
      qtdInput.step = '0.5';
      qtdInput.min = '0.5';
      if (!qtdInput.value || qtdInput.value === '250') qtdInput.value = '1';
      qtdInput.placeholder = 'Ex: 1';
    }
    if (tipEl) tipEl.style.display = 'none';
  } else {
    // 'un' - Unidades inteiras 1, 2, 3, 4...
    if (labelQtd) labelQtd.textContent = 'Quantidade (un) *';
    if (labelPreco) labelPreco.textContent = 'Valor Unit. (R$) - Opcional';
    if (qtdInput) {
      qtdInput.step = '1';
      qtdInput.min = '1';
      qtdInput.value = Math.max(1, Math.round(parseFloat(qtdInput.value) || 1));
      qtdInput.placeholder = 'Ex: 1';
    }
    if (tipEl) tipEl.style.display = 'none';
  }

  updateSubtotalPreview();
}

function updateSubtotalPreview() {
  const qtdInput = document.getElementById('produto-quantidade');
  const unitInput = document.getElementById('produto-valor-unitario');
  const unitHidden = document.getElementById('produto-unidade');
  const preview = document.getElementById('preview-subtotal');

  const qtd = parseFloat(qtdInput.value) || 0;
  const unitPrice = parseFloat(unitInput.value) || 0;
  const unit = unitHidden ? unitHidden.value : 'un';

  let subtotal = 0;
  let calculationText = '';

  if (unit === 'g') {
    subtotal = (qtd / 1000) * unitPrice;
    const kgEquivalent = (qtd / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
    calculationText = `${qtd} g (${kgEquivalent} kg) × ${formatCurrency(unitPrice)}/kg = `;
  } else if (unit === 'kg') {
    subtotal = qtd * unitPrice;
    calculationText = `${qtd} kg × ${formatCurrency(unitPrice)}/kg = `;
  } else if (unit === 'L') {
    subtotal = qtd * unitPrice;
    calculationText = `${qtd} L × ${formatCurrency(unitPrice)}/L = `;
  } else {
    subtotal = qtd * unitPrice;
    calculationText = `${qtd} un × ${formatCurrency(unitPrice)} = `;
  }

  preview.innerHTML = `<span style="font-weight: 500; font-size: 0.8rem; color: var(--text-muted);">${calculationText}</span><strong>${formatCurrency(subtotal)}</strong>`;
}

async function handleAddProduct(e) {
  e.preventDefault();
  if (!state.activeListId) return;

  const nomeInput = document.getElementById('produto-nome');
  const catInput = document.getElementById('produto-categoria');
  const qtdInput = document.getElementById('produto-quantidade');
  const precoInput = document.getElementById('produto-valor-unitario');
  const unitHidden = document.getElementById('produto-unidade');

  const name = nomeInput.value.trim();
  const category = catInput.value;
  const unit = unitHidden ? unitHidden.value : 'un';
  const quantity = parseFloat(qtdInput.value) || 1;
  const unitPrice = parseFloat(precoInput.value) || 0;

  if (!name) {
    showToast('Informe o nome do produto.', 'warning');
    nomeInput.focus();
    return;
  }

  const newItem = {
    id: generateId(),
    name,
    category,
    unit,
    quantity,
    unitPrice,
    checked: false
  };

  vibrateDevice(20);

  // 1. OPTIMISTIC UPDATE: adiciona imediatamente na memória e re-renderiza
  const listIdx = state.lists.findIndex(l => String(l.id) === String(state.activeListId));
  if (listIdx !== -1) {
    if (!state.lists[listIdx].items) state.lists[listIdx].items = [];
    state.lists[listIdx].items.push(newItem);
    renderProductCards(state.lists[listIdx]);
    updateBudgetMetricsOnly(state.lists[listIdx]);
    // Anima o novo item
    setTimeout(() => {
      const card = document.getElementById(`card-item-${newItem.id}`);
      if (card) card.classList.add('item-novo');
    }, 50);
  }

  // Limpa formulário e fecha Bottom Sheet imediatamente
  document.getElementById('form-novo-produto').reset();
  setProductUnit('un');
  document.getElementById('produto-quantidade').value = '1';
  updateSubtotalPreview();
  closeSheet('sheet-novo-produto');
  showToast(`"${name}" adicionado à lista!`, 'success', 2500);

  // 2. Persiste no banco em background
  try {
    const updatedList = await db.addItem(state.activeListId, newItem);
    if (updatedList) {
      const idx = state.lists.findIndex(l => String(l.id) === String(state.activeListId));
      if (idx !== -1) state.lists[idx] = updatedList;
      renderProductCards(updatedList);
      updateBudgetMetricsOnly(updatedList);
    }
  } catch (err) {
    showToast('Erro ao salvar produto na nuvem: ' + (err.message || err), 'error', 5000);
    // Reverte o otimismo se falhou
    const idx = state.lists.findIndex(l => String(l.id) === String(state.activeListId));
    if (idx !== -1) {
      state.lists[idx].items = state.lists[idx].items.filter(i => i.id !== newItem.id);
      renderProductCards(state.lists[idx]);
      updateBudgetMetricsOnly(state.lists[idx]);
    }
  }
}

async function handleUpdateBudget(e) {
  e.preventDefault();
  if (!state.activeListId) return;

  const input = document.getElementById('novo-orcamento-input');
  const novoOrcamento = parseFloat(input.value) || 0;

  vibrateDevice(20);
  const updatedList = await db.updateBudget(state.activeListId, novoOrcamento);
  if (updatedList) {
    const idx = state.lists.findIndex(l => l.id === state.activeListId);
    if (idx !== -1) state.lists[idx] = updatedList;
  }

  closeSheet('modal-editar-orcamento');
  renderListDetail(state.activeListId);
  showToast('Orçamento atualizado!', 'success', 2000);
}

// ==========================================================
// Configurações Supabase Cloud (Opcional)
// ==========================================================

async function loadSupabaseConfig() {
  const url = (await db.getConfig('supabase_url')) || db.supabaseUrl;
  const key = (await db.getConfig('supabase_key')) || db.supabaseKey;
  if (url) document.getElementById('supabase-url').value = url;
  if (key) document.getElementById('supabase-key').value = key;

  const statusEl = document.getElementById('db-status-text');
  if (statusEl) {
    statusEl.textContent = 'Verificando conexão com o Supabase Cloud...';
    const status = await db.checkCloudStatus();
    if (status.connected && status.tableReady) {
      statusEl.innerHTML = '🟢 <strong>Conectado e Sincronizado:</strong> Tabela "listas" ativa no Supabase.';
      statusEl.style.color = 'var(--success-text)';
    } else if (status.connected && !status.tableReady) {
      statusEl.innerHTML = '🟡 <strong>Conexão Válida com o Supabase!</strong> Falta apenas executar o script <code>schema.sql</code> no SQL Editor do Supabase para criar a tabela.';
      statusEl.style.color = 'var(--warning-text)';
    } else {
      statusEl.innerHTML = `🔵 <strong>Modo Local Offline:</strong> Operando via IndexedDB no aparelho. (${status.message})`;
      statusEl.style.color = 'var(--text-muted)';
    }
  }
}

async function handleSaveSupabaseConfig(e) {
  e.preventDefault();
  const url = document.getElementById('supabase-url').value.trim();
  const key = document.getElementById('supabase-key').value.trim();

  db.supabaseUrl = url;
  db.supabaseKey = key;
  await db.setConfig('supabase_url', url);
  await db.setConfig('supabase_key', key);
  vibrateDevice(30);

  await loadSupabaseConfig();
  await loadDataFromDb();
  showToast('Configurações salvas e conexão testada!', 'success');
}

// ==========================================================
// PWA Installation & Service Worker
// ==========================================================

function setupPwa() {
  const btnInstall = document.getElementById('btn-instalar-app');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) btnInstall.classList.remove('hidden');
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('Resultado da instalação:', outcome);
      deferredInstallPrompt = null;
      btnInstall.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (btnInstall) btnInstall.classList.add('hidden');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Falha no Service Worker:', err);
      });
    });
  }
}

// ==========================================================
// Inicialização de Listeners
// ==========================================================

function setupEventListeners() {
  // Navegação
  document.getElementById('btn-voltar-dashboard').addEventListener('click', showDashboard);

  // Floating Action Button (FAB): ação sensível ao contexto
  document.getElementById('fab-action-btn').addEventListener('click', () => {
    vibrateDevice(20);
    if (state.activeListId) {
      // Dentro de uma lista -> Adicionar Mercadoria
      document.getElementById('produto-nome').value = '';
      document.getElementById('produto-valor-unitario').value = '';
      document.getElementById('produto-quantidade').value = '1';
      setProductUnit('un');
      updateSubtotalPreview();
      openSheet('sheet-novo-produto');
      setTimeout(() => document.getElementById('produto-nome').focus(), 150);
    } else {
      // No dashboard -> Nova Lista
      document.getElementById('form-nova-lista').reset();
      const inputData = document.getElementById('nova-lista-data');
      if (inputData) inputData.value = new Date().toISOString().split('T')[0];
      openSheet('sheet-nova-lista');
      setTimeout(() => document.getElementById('nova-lista-nome').focus(), 150);
    }
  });

  // Botões de Estado Vazio
  document.getElementById('btn-criar-primeira-lista').addEventListener('click', () => {
    document.getElementById('form-nova-lista').reset();
    const inputData = document.getElementById('nova-lista-data');
    if (inputData) inputData.value = new Date().toISOString().split('T')[0];
    openSheet('sheet-nova-lista');
  });

  // Fechar Bottom Sheets
  document.getElementById('btn-fechar-sheet-produto').addEventListener('click', () => closeSheet('sheet-novo-produto'));
  document.getElementById('btn-fechar-sheet-lista').addEventListener('click', () => closeSheet('sheet-nova-lista'));
  document.getElementById('btn-fechar-modal-orcamento').addEventListener('click', () => closeSheet('modal-editar-orcamento'));
  document.getElementById('btn-fechar-modal-db').addEventListener('click', () => closeSheet('modal-config-db'));
  document.getElementById('btn-fechar-sheet-auth').addEventListener('click', () => {
    if (!db.isAuthenticated()) return; // Bloqueado: usuário precisa se autenticar
    closeSheet('sheet-auth');
  });
  document.getElementById('btn-fechar-sheet-perfil').addEventListener('click', () => closeSheet('sheet-perfil'));
  
  const btnFecharAdmin = document.getElementById('btn-fechar-sheet-admin');
  if (btnFecharAdmin) {
    btnFecharAdmin.addEventListener('click', () => closeSheet('sheet-admin'));
  }

  // Fechar ao clicar no backdrop escuro
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('bottom-sheet-backdrop')) {
      // Bloqueia fechamento da tela de login se o usuário não estiver autenticado
      if (!db.isAuthenticated() && e.target.id === 'sheet-auth') {
        vibrateDevice(20);
        return;
      }
      closeAllSheets();
    }
  });

  // Alternância de Abas Principais (Listas, Carteira, Histórico, Perfil, Admin)
  const tabListas = document.getElementById('tab-nav-listas');
  if (tabListas) tabListas.addEventListener('click', () => switchAppTab('listas'));

  const tabCarteira = document.getElementById('tab-nav-carteira');
  if (tabCarteira) tabCarteira.addEventListener('click', () => switchAppTab('carteira'));

  const tabRanking = document.getElementById('tab-nav-ranking');
  if (tabRanking) tabRanking.addEventListener('click', () => switchAppTab('ranking'));

  const tabHistorico = document.getElementById('tab-nav-historico');
  if (tabHistorico) tabHistorico.addEventListener('click', () => switchAppTab('historico'));

  const tabPerfil = document.getElementById('tab-nav-perfil');
  if (tabPerfil) tabPerfil.addEventListener('click', () => switchAppTab('perfil'));

  const tabAdmin = document.getElementById('tab-nav-admin');
  if (tabAdmin) tabAdmin.addEventListener('click', () => switchAppTab('admin'));

  // Ações de Dashboard: Nova Lista e Entrar via Convite
  const btnDashNovaLista = document.getElementById('btn-dashboard-nova-lista');
  if (btnDashNovaLista) {
    btnDashNovaLista.addEventListener('click', () => {
      document.getElementById('form-nova-lista').reset();
      const inputData = document.getElementById('nova-lista-data');
      if (inputData) inputData.value = new Date().toISOString().split('T')[0];
      openSheet('sheet-nova-lista');
    });
  }

  const btnDashEntrarConvite = document.getElementById('btn-dashboard-entrar-convite');
  if (btnDashEntrarConvite) {
    btnDashEntrarConvite.addEventListener('click', () => {
      vibrateDevice(15);
      const form = document.getElementById('form-entrar-codigo');
      if (form) form.reset();
      const alertBox = document.getElementById('convite-alert-msg');
      if (alertBox) {
        alertBox.classList.add('hidden');
        alertBox.textContent = '';
      }
      openSheet('sheet-entrar-lista-codigo');
      setTimeout(() => {
        const input = document.getElementById('input-convite-codigo');
        if (input) input.focus();
      }, 200);
    });
  }

  // Ações de Compartilhamento e Exclusão no Detalhe da Lista
  const btnDetalheExcluirLista = document.getElementById('btn-detalhe-excluir-lista');
  if (btnDetalheExcluirLista) {
    btnDetalheExcluirLista.addEventListener('click', () => {
      if (state.activeListId) {
        handleDeleteList(state.activeListId);
      }
    });
  }

  const btnDetalheCompartilhar = document.getElementById('btn-detalhe-compartilhar');
  if (btnDetalheCompartilhar) {
    btnDetalheCompartilhar.addEventListener('click', openCompartilharModal);
  }

  const btnFecharShare = document.getElementById('btn-fechar-sheet-compartilhar');
  if (btnFecharShare) btnFecharShare.addEventListener('click', () => closeSheet('sheet-compartilhar-lista'));

  const formShareEmail = document.getElementById('form-compartilhar-email');
  if (formShareEmail) formShareEmail.addEventListener('submit', handleShareEmail);

  const btnFecharEntrarCodigo = document.getElementById('btn-fechar-sheet-entrar-codigo');
  if (btnFecharEntrarCodigo) btnFecharEntrarCodigo.addEventListener('click', () => closeSheet('sheet-entrar-lista-codigo'));

  const formEntrarCodigo = document.getElementById('form-entrar-codigo');
  if (formEntrarCodigo) formEntrarCodigo.addEventListener('submit', handleJoinListByCode);

  const btnCopiarCodigo = document.getElementById('btn-copiar-codigo-share');
  if (btnCopiarCodigo) {
    btnCopiarCodigo.addEventListener('click', () => {
      if (activeSharingList && activeSharingList.inviteCode) {
        navigator.clipboard.writeText(activeSharingList.inviteCode).then(() => {
          vibrateDevice(20);
          showToast(`Código copiado: ${activeSharingList.inviteCode}`, 'success');
        }).catch(() => {
          prompt('Copie o código abaixo:', activeSharingList.inviteCode);
        });
      }
    });
  }

  const btnEnviarLinkWpp = document.getElementById('btn-enviar-link-whatsapp');
  if (btnEnviarLinkWpp) {
    btnEnviarLinkWpp.addEventListener('click', () => {
      if (!activeSharingList) return;
      const perm = document.querySelector('input[name="share-permission"]:checked')?.value || 'fechado';
      const permText = perm === 'aberto' ? 'Modo Aberto (pode inserir e editar)' : 'Modo Fechado (somente leitura)';
      const msg = `🛒 *Convite para Lista de Compras - Compras Plus*\nVocê foi convidado para a lista *${activeSharingList.name}* no *${permText}*.\n\nCódigo do Convite: *${activeSharingList.inviteCode}*\nOu abra diretamente:\n${activeSharingList.shareLink || window.location.href}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  const btnRenovarCodigo = document.getElementById('btn-renovar-codigo-share');
  if (btnRenovarCodigo) {
    btnRenovarCodigo.addEventListener('click', handleRenovarCodigoShare);
  }

  const btnLimparCodigoConvite = document.getElementById('btn-limpar-convite-codigo');
  if (btnLimparCodigoConvite) {
    btnLimparCodigoConvite.addEventListener('click', () => {
      const input = document.getElementById('input-convite-codigo');
      if (input) {
        input.value = '';
        input.focus();
      }
      const alertBox = document.getElementById('convite-alert-msg');
      if (alertBox) alertBox.classList.add('hidden');
    });
  }

  // Seletores visuais de modo de permissão de compartilhamento
  document.querySelectorAll('input[name="share-permission"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.share-mode-card').forEach(c => c.classList.remove('active'));
      const parentCard = e.target.closest('.share-mode-card');
      if (parentCard) parentCard.classList.add('active');
    });
  });

  // Ações da Carteira Financeira
  const btnAbrirEntrada = document.getElementById('btn-abrir-nova-entrada');
  if (btnAbrirEntrada) {
    btnAbrirEntrada.addEventListener('click', () => {
      document.getElementById('form-nova-entrada').reset();
      document.getElementById('entrada-data').value = new Date().toISOString().split('T')[0];
      openSheet('sheet-nova-entrada');
    });
  }

  const btnCarteiraAddFirst = document.getElementById('btn-carteira-add-first');
  if (btnCarteiraAddFirst) {
    btnCarteiraAddFirst.addEventListener('click', () => {
      document.getElementById('form-nova-entrada').reset();
      document.getElementById('entrada-data').value = new Date().toISOString().split('T')[0];
      openSheet('sheet-nova-entrada');
    });
  }

  const btnFecharEntrada = document.getElementById('btn-fechar-sheet-entrada');
  if (btnFecharEntrada) btnFecharEntrada.addEventListener('click', () => closeSheet('sheet-nova-entrada'));

  const formNovaEntrada = document.getElementById('form-nova-entrada');
  if (formNovaEntrada) formNovaEntrada.addEventListener('submit', handleSaveWalletEntry);

  const filtroCarteiraAno = document.getElementById('filtro-carteira-ano');
  if (filtroCarteiraAno) filtroCarteiraAno.addEventListener('change', (e) => {
    walletFilter.year = e.target.value;
    loadAndRenderWallet();
  });

  const filtroCarteiraMes = document.getElementById('filtro-carteira-mes');
  if (filtroCarteiraMes) filtroCarteiraMes.addEventListener('change', (e) => {
    walletFilter.month = e.target.value;
    loadAndRenderWallet();
  });

  const btnRecarregarCarteira = document.getElementById('btn-recarregar-carteira');
  if (btnRecarregarCarteira) btnRecarregarCarteira.addEventListener('click', loadAndRenderWallet);

  // Ações de Perfil
  const formEditarPerfil = document.getElementById('form-editar-perfil');
  if (formEditarPerfil) formEditarPerfil.addEventListener('submit', handleSaveProfile);

  const btnPerfilLogout = document.getElementById('btn-perfil-logout');
  if (btnPerfilLogout) btnPerfilLogout.addEventListener('click', handleLogout);

  const btnPerfilQuickLogout = document.getElementById('btn-perfil-quick-logout');
  if (btnPerfilQuickLogout) btnPerfilQuickLogout.addEventListener('click', handleLogout);

  const btnPerfilVoltar = document.getElementById('btn-perfil-voltar-app');
  if (btnPerfilVoltar) btnPerfilVoltar.addEventListener('click', () => switchAppTab('listas'));

  const btnHeaderLogout = document.getElementById('btn-header-logout');
  if (btnHeaderLogout) btnHeaderLogout.addEventListener('click', handleLogout);

  const btnPerfilSync = document.getElementById('btn-perfil-sync');
  if (btnPerfilSync) btnPerfilSync.addEventListener('click', handleSyncNow);

  const btnPerfilAdmin = document.getElementById('btn-perfil-admin-link');
  if (btnPerfilAdmin) btnPerfilAdmin.addEventListener('click', () => switchAppTab('admin'));

  // Ações da Página Admin
  const btnAdminVoltar = document.getElementById('btn-admin-voltar-app');
  if (btnAdminVoltar) btnAdminVoltar.addEventListener('click', () => switchAppTab('listas'));

  const btnAdminCsv = document.getElementById('btn-admin-download-csv');
  if (btnAdminCsv) btnAdminCsv.addEventListener('click', exportLeadsToCsv);

  const btnAdminRefresh = document.getElementById('btn-admin-refresh-data');
  if (btnAdminRefresh) btnAdminRefresh.addEventListener('click', loadAdminPageView);

  const btnAdminOpenDb = document.getElementById('btn-admin-open-db-config');
  if (btnAdminOpenDb) btnAdminOpenDb.addEventListener('click', () => openSheet('modal-config-db'));

  const searchAdminLeads = document.getElementById('admin-input-search-leads');
  if (searchAdminLeads) searchAdminLeads.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase();
    const filtered = adminLeadsCache.filter(l => 
      (l.name && l.name.toLowerCase().includes(q)) || 
      (l.email && l.email.toLowerCase().includes(q)) || 
      (l.phone && l.phone.includes(q))
    );
    renderAdminPageLeads(filtered);
  });

  // Eventos da Página de Login Inicial
  const btnTabChoiceLogin = document.getElementById('btn-tab-choice-login');
  if (btnTabChoiceLogin) btnTabChoiceLogin.addEventListener('click', () => showInitialAuthTab('login'));

  const btnTabChoiceSignup = document.getElementById('btn-tab-choice-signup');
  if (btnTabChoiceSignup) btnTabChoiceSignup.addEventListener('click', () => showInitialAuthTab('signup'));

  const btnInitialForgot = document.getElementById('btn-initial-forgot-pass');
  if (btnInitialForgot) btnInitialForgot.addEventListener('click', () => showInitialAuthTab('recovery'));

  const btnInitialBackLogin = document.getElementById('btn-initial-back-to-login');
  if (btnInitialBackLogin) btnInitialBackLogin.addEventListener('click', () => showInitialAuthTab('login'));

  const formInitialLogin = document.getElementById('form-initial-login');
  if (formInitialLogin) formInitialLogin.addEventListener('submit', handleInitialLogin);

  const formInitialSignup = document.getElementById('form-initial-signup');
  if (formInitialSignup) formInitialSignup.addEventListener('submit', handleInitialSignup);

  const btnInitialSendRecovery = document.getElementById('btn-initial-send-recovery');
  if (btnInitialSendRecovery) btnInitialSendRecovery.addEventListener('click', handleInitialRecovery);

  const initialPhoneInput = document.getElementById('initial-signup-phone');
  if (initialPhoneInput) {
    initialPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneInput(e.target.value);
    });
  }

  // Finalizar Compra & Gravar Histórico
  const btnAbrirConcluir = document.getElementById('btn-abrir-finalizar-compra');
  if (btnAbrirConcluir) {
    btnAbrirConcluir.addEventListener('click', openConcluirCompraModal);
  }

  const btnFecharConcluir = document.getElementById('btn-fechar-sheet-concluir');
  if (btnFecharConcluir) {
    btnFecharConcluir.addEventListener('click', () => closeSheet('sheet-concluir-compra'));
  }

  const btnConfirmarGravar = document.getElementById('btn-confirmar-gravar-historico');
  if (btnConfirmarGravar) {
    btnConfirmarGravar.addEventListener('click', handleConfirmarFinalizarCompra);
  }

  // Filtros do Histórico & Balanço
  const filtroAno = document.getElementById('filtro-hist-ano');
  const filtroMes = document.getElementById('filtro-hist-mes');
  const filtroDia = document.getElementById('filtro-hist-dia');
  if (filtroAno) filtroAno.addEventListener('change', handleFilterChange);
  if (filtroMes) filtroMes.addEventListener('change', handleFilterChange);
  if (filtroDia) filtroDia.addEventListener('change', handleFilterChange);

  const btnRecarregarHist = document.getElementById('btn-recarregar-historico');
  if (btnRecarregarHist) {
    btnRecarregarHist.addEventListener('click', loadAndRenderHistory);
  }

  // Botão Conta / Autenticação no Header
  document.getElementById('btn-header-auth').addEventListener('click', () => {
    vibrateDevice(15);
    if (db.isAuthenticated()) {
      switchAppTab('perfil');
    } else {
      lockAppWithAuthGate();
    }
  });

  // Botão Abrir Painel Admin (dentro de Meu Perfil)
  const btnAbrirAdmin = document.getElementById('btn-abrir-painel-admin');
  if (btnAbrirAdmin) {
    btnAbrirAdmin.addEventListener('click', () => {
      vibrateDevice(15);
      closeSheet('sheet-perfil');
      switchAppTab('admin');
    });
  }

  // Ações do Painel Admin Modal
  const btnRecarregarAdmin = document.getElementById('btn-recarregar-admin');
  if (btnRecarregarAdmin) {
    btnRecarregarAdmin.addEventListener('click', loadAdminData);
  }

  const btnExportarCsv = document.getElementById('btn-exportar-csv');
  if (btnExportarCsv) {
    btnExportarCsv.addEventListener('click', exportLeadsToCsv);
  }

  const searchAdminInput = document.getElementById('admin-search-leads');
  if (searchAdminInput) {
    searchAdminInput.addEventListener('input', (e) => {
      filterAdminLeads(e.target.value);
    });
  }

  // Abas de Autenticação Modal
  document.getElementById('tab-btn-login').addEventListener('click', () => showAuthTab('login'));
  document.getElementById('tab-btn-signup').addEventListener('click', () => showAuthTab('signup'));
  document.getElementById('btn-esqueci-senha').addEventListener('click', () => showAuthTab('recovery'));
  document.getElementById('btn-voltar-login').addEventListener('click', () => showAuthTab('login'));

  // Submissão dos Formulários de Autenticação Modal
  document.getElementById('form-auth-login').addEventListener('submit', handleAuthLogin);
  document.getElementById('form-auth-signup').addEventListener('submit', handleAuthSignup);
  document.getElementById('form-auth-recovery').addEventListener('submit', handleAuthRecovery);

  // Ações de Perfil
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-sincronizar-nuvem').addEventListener('click', handleSyncNow);

  // Compartilhar no WhatsApp
  document.getElementById('btn-compartilhar-whatsapp').addEventListener('click', shareListWhatsApp);

  // Máscara de Telefone e Alternador de Visibilidade de Senha (Olhinho)
  const phoneInput = document.getElementById('signup-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneInput(e.target.value);
    });
  }
  setupPasswordToggles();

  // Submissão dos Formulários do App
  document.getElementById('form-nova-lista').addEventListener('submit', handleCreateList);
  document.getElementById('form-novo-produto').addEventListener('submit', handleAddProduct);
  document.getElementById('form-editar-orcamento').addEventListener('submit', handleUpdateBudget);
  document.getElementById('form-config-supabase').addEventListener('submit', handleSaveSupabaseConfig);

  // Botão Orçamento
  document.getElementById('btn-editar-orcamento').addEventListener('click', () => {
    const list = state.lists.find(l => l.id === state.activeListId);
    if (list) {
      document.getElementById('novo-orcamento-input').value = list.budget;
      openSheet('modal-editar-orcamento');
    }
  });

  // Botão Configurações Banco de Dados (Exclusivo para Administrador)
  const handleOpenDbConfig = () => {
    if (!db.isAdmin()) {
      showToast('Acesso restrito ao administrador do sistema.', 'error');
      return;
    }
    loadSupabaseConfig();
    openSheet('modal-config-db');
  };

  const btnAbrirConfig = document.getElementById('btn-abrir-config');
  if (btnAbrirConfig) {
    btnAbrirConfig.addEventListener('click', handleOpenDbConfig);
  }

  const btnAdminConfigDb = document.getElementById('btn-admin-config-db');
  if (btnAdminConfigDb) {
    btnAdminConfigDb.addEventListener('click', () => {
      closeSheet('sheet-perfil');
      handleOpenDbConfig();
    });
  }

  // Stepper de Quantidade Inteligente (Adaptativo por Unidade)
  const qtdInput = document.getElementById('produto-quantidade');
  const precoInput = document.getElementById('produto-valor-unitario');
  
  qtdInput.addEventListener('input', updateSubtotalPreview);
  precoInput.addEventListener('input', updateSubtotalPreview);

  document.getElementById('btn-qty-minus').addEventListener('click', () => {
    let cur = parseFloat(qtdInput.value) || 1;
    const unit = document.getElementById('produto-unidade')?.value || 'un';
    
    if (unit === 'un') {
      qtdInput.value = Math.max(1, Math.round(cur) - 1);
    } else if (unit === 'g') {
      qtdInput.value = Math.max(50, Math.round((cur - 50) / 50) * 50);
    } else if (unit === 'kg') {
      qtdInput.value = Math.max(0.1, Math.round((cur - 0.25) * 100) / 100);
    } else if (unit === 'L') {
      qtdInput.value = Math.max(0.5, Math.round((cur - 0.5) * 10) / 10);
    }
    updateSubtotalPreview();
  });

  document.getElementById('btn-qty-plus').addEventListener('click', () => {
    let cur = parseFloat(qtdInput.value) || 0;
    const unit = document.getElementById('produto-unidade')?.value || 'un';
    
    if (unit === 'un') {
      qtdInput.value = Math.max(1, Math.round(cur) + 1);
    } else if (unit === 'g') {
      qtdInput.value = Math.round((cur + 50) / 50) * 50;
    } else if (unit === 'kg') {
      qtdInput.value = Math.round((cur + 0.25) * 100) / 100;
    } else if (unit === 'L') {
      qtdInput.value = Math.round((cur + 0.5) * 10) / 10;
    }
    updateSubtotalPreview();
  });

  // Botões Seletores de Unidade (Unidade, Kilo, Gramas, Litro)
  document.querySelectorAll('#produto-unidade-group .unit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      vibrateDevice(10);
      const unit = e.currentTarget.dataset.unit;
      setProductUnit(unit);
    });
  });

  // Auto-sugestão de unidade ao escolher categoria
  document.getElementById('produto-categoria').addEventListener('change', (e) => {
    const cat = e.target.value;
    if (cat === 'Carnes & Aves' || cat === 'Hortifrúti') {
      setProductUnit('kg');
    } else if (cat === 'Laticínios & Frios') {
      setProductUnit('g');
    } else if (cat === 'Bebidas') {
      setProductUnit('un');
    }
  });

  // Carrossel de Chips de Categorias
  document.querySelectorAll('#chips-categorias .chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#chips-categorias .chip-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.filterCategory = e.currentTarget.dataset.cat;
      vibrateDevice(10);
      if (state.activeListId) {
        const list = state.lists.find(l => l.id === state.activeListId);
        if (list) renderProductCards(list);
      }
    });
  });

  // PWA
  setupPwa();
}

// ==========================================================
// Funções de Gestão de Autenticação e Perfil SaaS
// ==========================================================

function updateAuthUI() {
  const btnHeader = document.getElementById('btn-header-auth');
  const iconHeader = document.getElementById('header-auth-icon');
  const labelHeader = document.getElementById('header-auth-label');

  const user = db.getUser();
  const isAuth = db.isAuthenticated();
  const isAdmin = db.isAdmin();

  // Configuração só deve aparecer para o administrador
  const btnConfig = document.getElementById('btn-abrir-config');
  if (btnConfig) {
    if (isAdmin) {
      btnConfig.classList.remove('hidden');
    } else {
      btnConfig.classList.add('hidden');
    }
  }

  // Controla exibição da seção exclusiva do Administrador no Perfil
  const adminSection = document.getElementById('admin-perfil-section');
  if (adminSection) {
    if (isAdmin) {
      adminSection.classList.remove('hidden');
    } else {
      adminSection.classList.add('hidden');
    }
  }

  if (isAuth && user) {
    const rawName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
    const initial = rawName.charAt(0).toUpperCase();

    if (btnHeader) {
      btnHeader.classList.add('logged-in');
      btnHeader.title = isAdmin ? `🛡️ Administrador Master (${rawName})` : `Conectado como ${rawName}`;
    }
    if (iconHeader) iconHeader.textContent = isAdmin ? '🛡️' : '👑';
    if (labelHeader) labelHeader.textContent = isAdmin ? 'Admin' : rawName.split(' ')[0];

    // Atualiza dados no modal de perfil
    const profileName = document.getElementById('profile-user-name');
    const profileEmail = document.getElementById('profile-user-email');
    const profileAvatar = document.getElementById('profile-avatar');
    const statListas = document.getElementById('stat-total-listas');
    const statItens = document.getElementById('stat-total-itens');

    if (profileName) {
      profileName.innerHTML = isAdmin 
        ? `${escapeHtml(rawName)} <span style="font-size:0.72rem; color:#d97706; font-weight:800; background:#fef3c7; border:1px solid #fde68a; padding:0.12rem 0.45rem; border-radius:12px; margin-left:5px;">🛡️ Admin</span>` 
        : escapeHtml(rawName);
    }
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileAvatar) profileAvatar.textContent = isAdmin ? '🛡️' : initial;

    if (statListas) statListas.textContent = state.lists.length;
    if (statItens) {
      const totalItens = state.lists.reduce((sum, l) => sum + (l.items || []).length, 0);
      statItens.textContent = totalItens;
    }
  } else {
    if (btnHeader) {
      btnHeader.classList.remove('logged-in');
      btnHeader.title = 'Entrar / Criar Conta';
    }
    if (iconHeader) iconHeader.textContent = '👤';
    if (labelHeader) labelHeader.textContent = 'Entrar';
  }
}

function showAuthTab(tab) {
  const formLogin = document.getElementById('form-auth-login');
  const formSignup = document.getElementById('form-auth-signup');
  const formRecovery = document.getElementById('form-auth-recovery');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabSignup = document.getElementById('tab-btn-signup');
  const alertBox = document.getElementById('auth-alert-msg');
  const title = document.getElementById('auth-sheet-title');

  if (alertBox) {
    alertBox.classList.add('hidden');
    alertBox.textContent = '';
  }

  if (tab === 'login') {
    if (formLogin) formLogin.classList.remove('hidden');
    if (formSignup) formSignup.classList.add('hidden');
    if (formRecovery) formRecovery.classList.add('hidden');
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (title) title.textContent = 'Entrar no Compras Plus';
  } else if (tab === 'signup') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formSignup) formSignup.classList.remove('hidden');
    if (formRecovery) formRecovery.classList.add('hidden');
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.add('active');
    if (title) title.textContent = 'Criar Conta Grátis';
  } else if (tab === 'recovery') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formSignup) formSignup.classList.add('hidden');
    if (formRecovery) formRecovery.classList.remove('hidden');
    if (title) title.textContent = 'Recuperar Senha';
  }
}

function showAuthAlert(msg, type = 'error') {
  const alertBox = document.getElementById('auth-alert-msg');
  if (alertBox) {
    alertBox.className = `auth-alert ${type}`;
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  }
}

function formatPhoneInput(value) {
  let clean = value.replace(/\D/g, '');
  if (clean.length > 11) clean = clean.slice(0, 11);
  if (clean.length > 10) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (clean.length > 6) {
    return clean.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (clean.length > 2) {
    return clean.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  } else if (clean.length > 0) {
    return clean.replace(/^(\d{0,2})$/, '($1');
  }
  return clean;
}

function setupPasswordToggles() {
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.title = 'Ocultar senha';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.title = 'Visualizar senha';
      }
    });
  });
}

async function handleAuthLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('login-remember-me') ? document.getElementById('login-remember-me').checked : true;
  const btnSubmit = document.getElementById('btn-submit-login');

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Autenticando...';

  try {
    await db.signIn(email, pass, rememberMe);
    vibrateDevice(25);
    unlockAppFromAuthGate();
    document.getElementById('form-auth-login').reset();
    await db.migrateLocalListsToCloud();
    await loadDataFromDb();
  } catch (err) {
    vibrateDevice(40);
    showAuthAlert(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Entrar no Compras Plus';
  }
}

async function handleAuthSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const pass = document.getElementById('signup-password').value;
  const marketingConsent = document.getElementById('signup-marketing-consent') ? document.getElementById('signup-marketing-consent').checked : true;
  const btnSubmit = document.getElementById('btn-submit-signup');

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    showAuthAlert('Por favor, digite um número de WhatsApp/Telefone válido com DDD (ex: (11) 99999-9999).', 'error');
    document.getElementById('signup-phone').focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Criando conta...';

  try {
    const res = await db.signUp(email, pass, name, phone, marketingConsent);
    vibrateDevice(30);

    if (db.isAuthenticated()) {
      unlockAppFromAuthGate();
      document.getElementById('form-auth-signup').reset();
      await db.migrateLocalListsToCloud();
      await loadDataFromDb();
    } else {
      showAuthAlert('Conta criada com sucesso! Verifique seu e-mail para confirmar seu cadastro e faça login.', 'success');
      setTimeout(() => showAuthTab('login'), 3500);
    }
  } catch (err) {
    vibrateDevice(40);
    showAuthAlert(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Criar Minha Conta Grátis';
  }
}

async function handleAuthRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('recovery-email').value;

  try {
    await db.resetPassword(email);
    showAuthAlert('Instruções de recuperação enviadas para o seu e-mail!', 'success');
  } catch (err) {
    showAuthAlert(err.message, 'error');
  }
}

async function handleLogout() {
  const ok = await showConfirm('Deseja realmente sair da sua conta?', 'Sair da Conta', '🚪', '🚪 Sair', 'btn-danger-outline');
  if (!ok) return;
  vibrateDevice(20);
  await db.signOut();
  closeAllSheets();
  state.lists = [];
  state.activeListId = null;
  window.history.pushState({}, '', '#/listas');
  await loadDataFromDb();
}

async function handleSyncNow() {
  const btn = document.getElementById('btn-sincronizar-nuvem');
  btn.disabled = true;
  btn.textContent = 'Sincronizando...';

  try {
    await db.migrateLocalListsToCloud();
    await loadDataFromDb();
    vibrateDevice(25);
    showToast('Listas sincronizadas com a nuvem com sucesso!', 'success');
  } catch (err) {
    showToast('Erro ao sincronizar: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Sincronizar Listas Agora';
  }
}

// ==========================================================
// Painel Administrativo & Gestão de Leads SaaS
// ==========================================================

let adminLeadsCache = [];

async function openAdminPanel() {
  openSheet('sheet-admin');
  await loadAdminData();
}

async function loadAdminData() {
  const loading = document.getElementById('admin-leads-loading');
  const container = document.getElementById('admin-leads-container');
  const empty = document.getElementById('admin-leads-empty');
  const statUsers = document.getElementById('admin-stat-users');
  const statPhones = document.getElementById('admin-stat-phones');
  const statLists = document.getElementById('admin-stat-lists');

  if (loading) loading.classList.remove('hidden');
  if (container) container.classList.add('hidden');
  if (empty) empty.classList.add('hidden');

  try {
    const stats = await db.getAdminStats();
    if (statUsers) statUsers.textContent = stats.totalUsers || 0;
    if (statPhones) statPhones.textContent = stats.usersWithPhone || 0;
    if (statLists) statLists.textContent = stats.totalLists || 0;

    adminLeadsCache = stats.profiles || [];
    renderAdminLeads(adminLeadsCache);
  } catch (err) {
    if (loading) loading.classList.add('hidden');
    showToast('Erro ao carregar dados do painel admin: ' + err.message, 'error');
  }
}

function renderAdminLeads(leads) {
  const loading = document.getElementById('admin-leads-loading');
  const container = document.getElementById('admin-leads-container');
  const empty = document.getElementById('admin-leads-empty');

  if (loading) loading.classList.add('hidden');

  if (!leads || leads.length === 0) {
    if (container) container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (container) {
    container.classList.remove('hidden');
    container.innerHTML = leads.map(lead => {
      const name = lead.name || 'Sem nome';
      const email = lead.email || 'Sem e-mail';
      const phone = lead.phone ? formatPhoneInput(lead.phone) : 'Não informado';
      const isAdmin = (lead.role === 'admin') || (email.toLowerCase() === 'viniciuscirne@gmail.com');
      const badgeClass = isAdmin ? 'badge-admin' : 'badge-user';
      const badgeLabel = isAdmin ? '👑 Admin' : '👤 Lead';
      
      const rawDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data n/d';
      
      let waButton = '';
      if (lead.phone && lead.phone.replace(/\D/g, '').length >= 10) {
        let cleanDigits = lead.phone.replace(/\D/g, '');
        if (cleanDigits.length === 10 || cleanDigits.length === 11) {
          cleanDigits = '55' + cleanDigits;
        }
        const textMsg = encodeURIComponent(`Olá ${name}, tudo bem? Sou da equipe do Compras Plus!`);
        waButton = `
          <a href="https://wa.me/${cleanDigits}?text=${textMsg}" target="_blank" rel="noopener" class="btn-lead-whatsapp">
            <span>💬</span> Conversar no WhatsApp
          </a>
        `;
      } else {
        waButton = `<span style="font-size: 0.72rem; color: var(--text-light);">Sem WhatsApp cadastrado</span>`;
      }

      return `
        <div class="admin-lead-card ${isAdmin ? 'is-admin' : ''}">
          <div class="admin-lead-header">
            <span class="admin-lead-name">${escapeHtml(name)}</span>
            <span class="admin-lead-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="admin-lead-details">
            <div class="admin-lead-row">
              <span>📧</span>
              <span>${escapeHtml(email)}</span>
            </div>
            <div class="admin-lead-row">
              <span>📲</span>
              <strong>${escapeHtml(phone)}</strong>
            </div>
            <div class="admin-lead-row" style="justify-content: space-between; margin-top: 2px;">
              <span style="font-size: 0.7rem; color: var(--text-light);">📅 ${rawDate}</span>
              ${lead.marketing_consent !== false ? '<span class="admin-lead-consent-tag">✅ Aceita Marketing</span>' : '<span style="font-size:0.68rem; color:#ef4444;">❌ Não aceitou</span>'}
            </div>
          </div>
          <div class="admin-lead-actions">
            ${waButton}
          </div>
        </div>
      `;
    }).join('');
  }
}

function filterAdminLeads(searchTerm) {
  const term = (searchTerm || '').toLowerCase().trim();
  if (!term) {
    renderAdminLeads(adminLeadsCache);
    return;
  }

  const filtered = adminLeadsCache.filter(lead => {
    const name = (lead.name || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const phone = (lead.phone || '').replace(/\D/g, '');
    const cleanTerm = term.replace(/\D/g, '');

    return name.includes(term) || email.includes(term) || (cleanTerm && phone.includes(cleanTerm));
  });

  renderAdminLeads(filtered);
}

function exportLeadsToCsv() {
  if (!adminLeadsCache || adminLeadsCache.length === 0) {
    showToast('Nenhum lead disponível para exportação no momento.', 'warning');
    return;
  }

  // Cabeçalho do CSV
  const headers = ['Nome', 'Email', 'Telefone', 'WhatsApp_Link', 'Marketing_Consent', 'Funcao', 'Data_Cadastro'];
  
  const rows = adminLeadsCache.map(lead => {
    const name = `"${(lead.name || '').replace(/"/g, '""')}"`;
    const email = `"${(lead.email || '').replace(/"/g, '""')}"`;
    const phone = `"${(lead.phone || '').replace(/"/g, '""')}"`;
    
    let waLink = '';
    if (lead.phone && lead.phone.replace(/\D/g, '').length >= 10) {
      let digits = lead.phone.replace(/\D/g, '');
      if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
      waLink = `"https://wa.me/${digits}"`;
    }

    const consent = lead.marketing_consent !== false ? '"SIM"' : '"NAO"';
    const role = `"${lead.role || 'user'}"`;
    const date = `"${lead.created_at || ''}"`;

    return [name, email, phone, waLink, consent, role, date].join(';');
  });

  // BOM UTF-8 (\uFEFF) para garantir acentuação correta no Excel brasileiro
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_compras_plus_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  vibrateDevice(20);
}

// ==========================================================
// Gestão de Abas da Aplicação (Minhas Listas vs Histórico & Balanço)
// ==========================================================

function switchAppTab(tabName) {
  vibrateDevice(15);
  const tabListas = document.getElementById('tab-nav-listas');
  const tabRanking = document.getElementById('tab-nav-ranking');
  const tabCarteira = document.getElementById('tab-nav-carteira');
  const tabHist = document.getElementById('tab-nav-historico');
  const tabPerfil = document.getElementById('tab-nav-perfil');
  const tabAdmin = document.getElementById('tab-nav-admin');

  const viewDashboard = document.getElementById('view-dashboard');
  const viewDetalhe = document.getElementById('view-lista-detalhe');
  const viewRanking = document.getElementById('view-ranking');
  const viewCarteira = document.getElementById('view-carteira');
  const viewHistorico = document.getElementById('view-historico');
  const viewPerfil = document.getElementById('view-perfil');
  const viewAdmin = document.getElementById('view-admin');
  const viewTermos = document.getElementById('view-termos');
  const fab = document.getElementById('fab-action-btn');

  [tabListas, tabRanking, tabCarteira, tabHist, tabPerfil, tabAdmin].forEach(t => t && t.classList.remove('active'));
  [viewDashboard, viewDetalhe, viewRanking, viewCarteira, viewHistorico, viewPerfil, viewAdmin, viewTermos].forEach(v => v && v.classList.add('hidden'));


  if (tabName === 'listas') {
    if (tabListas) tabListas.classList.add('active');
    if (state.activeListId) {
      if (viewDetalhe) viewDetalhe.classList.remove('hidden');
      window.history.pushState({}, '', `#/listas/${state.activeListId}`);
    } else {
      if (viewDashboard) viewDashboard.classList.remove('hidden');
      window.history.pushState({}, '', '#/listas');
    }
    if (fab) fab.classList.remove('hidden');
    if (window.admobManager && typeof window.admobManager.renderWebBanner === 'function') {
      window.admobManager.renderWebBanner();
    }
  } else if (tabName === 'ranking') {
    if (tabRanking) tabRanking.classList.add('active');
    if (viewRanking) viewRanking.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    window.history.pushState({}, '', '#/ranking');
  } else if (tabName === 'carteira') {
    if (tabCarteira) tabCarteira.classList.add('active');
    if (viewCarteira) viewCarteira.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    window.history.pushState({}, '', '#/carteira');
    loadAndRenderWallet();
  } else if (tabName === 'historico') {
    if (tabHist) tabHist.classList.add('active');
    if (viewHistorico) viewHistorico.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    window.history.pushState({}, '', '#/historico');
    loadAndRenderHistory();
    if (window.admobManager && typeof window.admobManager.renderNativeAd === 'function') {
      window.admobManager.renderNativeAd('admob-native-slot');
    }
  } else if (tabName === 'perfil') {
    if (tabPerfil) tabPerfil.classList.add('active');
    if (viewPerfil) viewPerfil.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    window.history.pushState({}, '', '#/perfil');
    loadUserProfileView();
  } else if (tabName === 'admin') {
    if (tabAdmin) tabAdmin.classList.add('active');
    if (viewAdmin) viewAdmin.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    loadAdminPageView();
  }
}

// ==========================================================
// MÓDULO CARTEIRA FINANCEIRA (ENTRADAS & SALDO)
// ==========================================================
let walletFilter = {
  year: new Date().getFullYear(),
  month: 'all'
};

async function loadAndRenderWallet() {
  const selectAno = document.getElementById('filtro-carteira-ano');
  const selectMes = document.getElementById('filtro-carteira-mes');

  // Preenche anos disponíveis
  const currentYear = new Date().getFullYear();
  if (selectAno && selectAno.options.length === 0) {
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = '📅 Todos os Anos';
    selectAno.appendChild(optAll);

    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `Ano ${y}`;
      if (y === walletFilter.year) opt.selected = true;
      selectAno.appendChild(opt);
    }
  }

  // Busca todas as entradas para garantir que o saldo geral acumulado nunca se perca
  const allEntries = await db.getWalletEntries({});
  const purchases = await db.getPurchaseHistory();

  const balance = db.calculateWalletBalance(allEntries, purchases, walletFilter);

  // Cards de balanço
  const elEntradas = document.getElementById('carteira-total-entradas');
  const elSaidas = document.getElementById('carteira-total-saidas');
  const elSaldo = document.getElementById('carteira-saldo-carteira');
  const elBadge = document.getElementById('carteira-saldo-badge');

  const isPeriodAll = (walletFilter.year === 'all' && walletFilter.month === 'all');
  if (elEntradas) elEntradas.textContent = formatCurrency(isPeriodAll ? balance.totalGeralRecebido : balance.totalRecebido);
  if (elSaidas) elSaidas.textContent = formatCurrency(isPeriodAll ? balance.totalGeralSaidas : balance.totalSaidas);
  
  // Saldo da Carteira reflete o saldo geral real disponível de caixa
  const realSaldo = balance.saldoGeralCarteira !== undefined ? balance.saldoGeralCarteira : balance.saldoDisponivel;
  if (elSaldo) elSaldo.textContent = formatCurrency(realSaldo);

  const elEntradasCount = document.getElementById('carteira-entradas-count');
  const elSaidasCount = document.getElementById('carteira-saidas-count');
  if (elEntradasCount) elEntradasCount.textContent = `${balance.entriesCount} ${balance.entriesCount === 1 ? 'registro' : 'registros'}`;
  if (elSaidasCount) elSaidasCount.textContent = `${balance.purchasesCount} ${balance.purchasesCount === 1 ? 'compra registrada' : 'compras registradas'}`;

  if (elBadge) {
    if (realSaldo >= 0) {
      elBadge.className = 'carteira-status-badge badge-green';
      elBadge.textContent = 'Saldo Positivo (No Verde)';
    } else {
      elBadge.className = 'carteira-status-badge badge-red';
      elBadge.textContent = 'Atenção: Gastos superaram a renda!';
    }
  }

  // Breakdown de rendas
  const elSalario = document.getElementById('carteira-sum-salario');
  const elExtra = document.getElementById('carteira-sum-extra');
  const elAReceber = document.getElementById('carteira-sum-areceber');

  const sumSalario = (balance.byCategory['Salário'] || 0);
  const sumExtra = (balance.byCategory['Renda Extra'] || 0);
  if (elSalario) elSalario.textContent = formatCurrency(sumSalario);
  if (elExtra) elExtra.textContent = formatCurrency(sumExtra);
  if (elAReceber) elAReceber.textContent = formatCurrency(balance.totalAReceber);

  // Lista de Entradas
  const listContainer = document.getElementById('carteira-entries-list');
  const emptyState = document.getElementById('empty-state-carteira');

  if (!listContainer) return;

  if (balance.filteredEntries.length === 0) {
    listContainer.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  const catIcons = {
    'Salário': '💼',
    'Renda Extra': '⚡',
    'Investimentos': '📈',
    'Presente': '🎁',
    'Outros': '💵'
  };

  listContainer.innerHTML = balance.filteredEntries.map(e => {
    const icon = catIcons[e.category] || '💵';
    const statusText = e.status === 'recebido' ? '✅ Recebido' : '⏳ A Receber';
    const statusColor = e.status === 'recebido' ? '#166534' : '#b45309';
    const dateFormatted = `${String(e.day).padStart(2, '0')}/${String(e.month).padStart(2, '0')}/${e.year}`;

    return `
      <div class="carteira-entry-card">
        <div class="carteira-entry-left">
          <div class="carteira-entry-icon">${icon}</div>
          <div>
            <div class="carteira-entry-desc">${escapeHtml(e.description)}</div>
            <div class="carteira-entry-meta">
              <span>${escapeHtml(e.category)}</span>
              <span>•</span>
              <span>${dateFormatted}</span>
              <span>•</span>
              <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
            </div>
          </div>
        </div>
        <div class="carteira-entry-right">
          <span class="carteira-entry-amount">+ ${formatCurrency(e.amount)}</span>
          <button type="button" class="btn-del-entry" title="Excluir renda" onclick="handleDeleteWalletEntry('${e.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleSaveWalletEntry(e) {
  e.preventDefault();
  const desc = document.getElementById('entrada-descricao').value.trim();
  const valor = parseFloat(document.getElementById('entrada-valor').value) || 0;
  const categoria = document.getElementById('entrada-categoria').value;
  const status = document.getElementById('entrada-status').value;
  const data = document.getElementById('entrada-data').value;
  const btn = document.getElementById('btn-salvar-entrada-submit');

  if (!desc || valor <= 0) {
    showToast('Informe uma descrição e um valor válido.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Gravando...';

  try {
    await db.saveWalletEntry({
      description: desc,
      amount: valor,
      category: categoria,
      status: status,
      entryDate: data
    });

    vibrateDevice(25);
    closeSheet('sheet-nova-entrada');
    document.getElementById('form-nova-entrada').reset();
    loadAndRenderWallet();
  } catch (err) {
    showToast('Erro ao gravar entrada: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Gravar na Carteira';
  }
}

window.handleDeleteWalletEntry = async function(id) {
  if (confirm('Deseja realmente excluir esta entrada financeira?')) {
    vibrateDevice(20);
    try {
      await db.deleteWalletEntry(id);
      loadAndRenderWallet();
    } catch (err) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  }
};

// ==========================================================
// PÁGINA DE PERFIL DO USUÁRIO
// ==========================================================

function loadUserProfileView() {
  const user = db.getUser();
  if (!user) return;

  const rawName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
  const initial = rawName.charAt(0).toUpperCase();
  const phone = user.user_metadata?.phone || '';

  const elName = document.getElementById('perfil-view-name');
  const elEmail = document.getElementById('perfil-view-email');
  const elAvatar = document.getElementById('perfil-avatar-circle');
  const btnAdminLink = document.getElementById('btn-perfil-admin-link');
  const statListas = document.getElementById('perfil-stat-listas');

  if (elName) elName.textContent = rawName;
  if (elEmail) elEmail.textContent = user.email;
  if (elAvatar) elAvatar.textContent = db.isAdmin() ? '🛡️' : initial;
  if (statListas) statListas.textContent = state.lists.length;

  if (btnAdminLink) {
    if (db.isAdmin()) {
      btnAdminLink.classList.remove('hidden');
      btnAdminLink.style.display = 'flex';
    } else {
      btnAdminLink.classList.add('hidden');
      btnAdminLink.style.display = 'none';
    }
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('perfil-input-name').value.trim();
  const phone = document.getElementById('perfil-input-phone').value.trim();
  const btn = document.getElementById('btn-salvar-perfil');

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    await db.updateUserProfile({ name, phone });
    vibrateDevice(25);
    showToast('Perfil atualizado com sucesso!', 'success');
    loadUserProfileView();
    updateAuthUI();
  } catch (err) {
    showToast('Erro ao atualizar perfil: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Salvar Alterações';
  }
}

// ==========================================================
// PÁGINA DE ADMINISTRAÇÃO SAAS (LEADS E MÉTRICAS)
// ==========================================================
// Reusa adminLeadsCache declarado anteriormente

async function loadAdminPageView() {
  const elLeadsVal = document.getElementById('admin-stat-leads-val');
  const elWppVal = document.getElementById('admin-stat-whatsapp-val');
  const elListasVal = document.getElementById('admin-stat-listas-val');
  const loading = document.getElementById('admin-page-leads-loading');
  const container = document.getElementById('admin-page-leads-container');
  const empty = document.getElementById('admin-page-leads-empty');

  if (loading) loading.classList.remove('hidden');
  if (container) container.classList.add('hidden');
  if (empty) empty.classList.add('hidden');

  try {
    const leads = await db.getAllUserProfiles();
    adminLeadsCache = leads || [];

    const totalLeads = adminLeadsCache.length;
    const withPhone = adminLeadsCache.filter(l => l.phone && l.phone.trim().length > 6).length;

    let totalLists = 0;
    try {
      const listsRes = await fetch(`${db.supabaseUrl}/rest/v1/listas?select=id`, {
        headers: db.getHeaders()
      });
      if (listsRes.ok) {
        const lData = await listsRes.json();
        totalLists = lData.length;
      }
    } catch (_) {}

    if (elLeadsVal) elLeadsVal.textContent = totalLeads;
    if (elWppVal) elWppVal.textContent = withPhone;
    if (elListasVal) elListasVal.textContent = totalLists;

    renderAdminPageLeads(adminLeadsCache);
  } catch (err) {
    console.warn('Erro ao carregar painel admin:', err);
  } finally {
    if (loading) loading.classList.add('hidden');
  }
}

function renderAdminPageLeads(leads) {
  const container = document.getElementById('admin-page-leads-container');
  const empty = document.getElementById('admin-page-leads-empty');
  if (!container) return;

  if (leads.length === 0) {
    container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (empty) empty.classList.add('hidden');

  container.innerHTML = leads.map(lead => {
    const rawName = lead.name || 'Sem nome informado';
    const email = lead.email || 'Sem e-mail';
    const rawPhone = lead.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const dateFormatted = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'Data não reg.';
    const isAdmin = lead.role === 'admin' || (email && email.toLowerCase().trim() === 'viniciuscirne@gmail.com');

    const whatsappBtn = cleanPhone.length >= 10 ? `
      <a href="https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${rawName}! Vimos que você está usando o Compras Plus...`)}" 
         target="_blank" 
         class="btn-lead-whatsapp" 
         title="Abrir WhatsApp">
        📲 Conversar
      </a>
    ` : `<span class="badge-no-phone">Sem WhatsApp</span>`;

    return `
      <div class="lead-crm-card ${isAdmin ? 'admin-lead' : ''}">
        <div class="lead-crm-top">
          <div>
            <div class="lead-crm-name">
              ${escapeHtml(rawName)}
              ${isAdmin ? '<span class="lead-badge-admin">ADMIN</span>' : ''}
            </div>
            <div class="lead-crm-email">${escapeHtml(email)}</div>
          </div>
          ${whatsappBtn}
        </div>
        <div class="lead-crm-meta">
          <span>📲 ${rawPhone ? escapeHtml(rawPhone) : 'Não informado'}</span>
          <span>📅 ${dateFormatted}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================
// LISTAS COMPARTILHADAS (MODO ABERTO VS FECHADO)
// ==========================================================
let activeSharingList = null;

async function openCompartilharModal() {
  if (!state.activeListId) return;
  let list = state.lists.find(l => String(l.id) === String(state.activeListId));
  if (!list) {
    try {
      list = await db.getListById(state.activeListId);
    } catch (_) {}
  }
  if (!list) return;

  if (!db.isAuthenticated()) {
    showToast('💡 Para compartilhar uma lista com amigos ou familiares, você precisa estar conectado à sua conta.', 'info', 5000);
    openAuthModal('login');
    return;
  }

  activeSharingList = list;
  const title = document.getElementById('compartilhar-nome-lista');
  if (title) title.textContent = `Lista: ${list.name}`;

  const statusMsg = document.getElementById('share-code-status-msg');
  if (statusMsg) {
    statusMsg.classList.add('hidden');
    statusMsg.textContent = '';
  }

  // Gera ou recupera código ativo
  const permSelector = document.querySelector('input[name="share-permission"]:checked')?.value || 'fechado';
  try {
    const codeObj = await db.createShareInviteCode(list.id, permSelector);
    const displayCode = document.getElementById('share-display-code');
    if (displayCode) displayCode.textContent = codeObj.inviteCode;
    activeSharingList.shareLink = codeObj.shareLink;
    activeSharingList.inviteCode = codeObj.inviteCode;
  } catch (err) {
    console.warn('Aviso ao sincronizar código:', err);
  }

  await renderCollaboratorsList(list.id);
  openSheet('sheet-compartilhar-lista');
}

async function handleRenovarCodigoShare() {
  const targetId = activeSharingList?.id || state.activeListId;
  if (!targetId) return;
  const btn = document.getElementById('btn-renovar-codigo-share');
  const displayCode = document.getElementById('share-display-code');
  const statusMsg = document.getElementById('share-code-status-msg');
  const perm = document.querySelector('input[name="share-permission"]:checked')?.value || 'fechado';

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Renovando...';
  }

  try {
    const codeObj = await db.createShareInviteCode(targetId, perm, true); // forceNew = true
    if (displayCode) displayCode.textContent = codeObj.inviteCode;
    if (activeSharingList) {
      activeSharingList.inviteCode = codeObj.inviteCode;
      activeSharingList.shareLink = codeObj.shareLink;
    }
    vibrateDevice(30);

    if (statusMsg) {
      statusMsg.className = 'auth-alert success';
      statusMsg.textContent = `✅ Código ${codeObj.inviteCode} renovado e ativado na nuvem com sucesso!`;
      statusMsg.classList.remove('hidden');
    }
  } catch (err) {
    if (statusMsg) {
      statusMsg.className = 'auth-alert error';
      statusMsg.textContent = 'Erro ao renovar: ' + (err.message || err);
      statusMsg.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Renovar Código';
    }
  }
}

async function renderCollaboratorsList(listId) {
  const container = document.getElementById('share-collaborators-list');
  if (!container) return;

  container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Buscando acessos...</span>';
  try {
    const collaborators = await db.getListCollaborators(listId);
    if (!collaborators || collaborators.length === 0) {
      container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Nenhum convidado adicionado ainda.</span>';
      return;
    }

    container.innerHTML = collaborators.map(c => {
      const modeTag = c.permission === 'aberto' 
        ? '<span class="badge-shared-tag tag-aberto">Modo Aberto</span>' 
        : '<span class="badge-shared-tag tag-fechado">Modo Fechado</span>';

      return `
        <div class="collaborator-item-card">
          <div>
            <strong>${escapeHtml(c.shared_with_email)}</strong>
            <div style="margin-top:2px;">${modeTag}</div>
          </div>
          <button type="button" class="btn-del-entry" title="Remover acesso" onclick="handleRemoveCollaborator('${c.id}')">
            ✕
          </button>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Nenhum convidado adicional.</span>';
  }
}

window.handleRemoveCollaborator = async function(shareId) {
  if (confirm('Deseja revogar o acesso deste usuário à sua lista?')) {
    vibrateDevice(20);
    await db.removeCollaborator(shareId);
    const targetId = activeSharingList?.id || state.activeListId;
    if (targetId) renderCollaboratorsList(targetId);
  }
};

async function handleShareEmail(e) {
  e.preventDefault();
  const targetId = activeSharingList?.id || activeSharingList?.list_id || state.activeListId;
  if (!targetId) {
    showToast('Nenhuma lista selecionada para compartilhar.', 'error');
    return;
  }
  const emailInput = document.getElementById('share-input-email');
  const email = emailInput.value.trim();
  const perm = document.querySelector('input[name="share-permission"]:checked')?.value || 'fechado';
  const btn = document.getElementById('btn-submit-share-email');

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    await db.shareListWithEmail(targetId, email, perm);
    vibrateDevice(25);
    showToast(`Lista compartilhada com ${email}!`, 'success');
    emailInput.value = '';
    renderCollaboratorsList(targetId);
  } catch (err) {
    showToast('Erro ao compartilhar: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
}

function showConviteAlert(msg, type = 'error') {
  const alertBox = document.getElementById('convite-alert-msg');
  if (alertBox) {
    alertBox.className = `auth-alert ${type}`;
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  } else {
    showToast(msg, type);
  }
}

async function handleJoinListByCode(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('input-convite-codigo');
  const code = (input ? input.value : '').trim();
  const btn = document.getElementById('btn-submit-entrar-codigo');
  const alertBox = document.getElementById('convite-alert-msg');
  if (alertBox) alertBox.classList.add('hidden');

  if (!code) {
    showConviteAlert('Por favor, digite ou cole o código do convite.', 'error');
    if (input) input.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Conectando à lista...';
  }

  try {
    const result = await db.joinSharedListByCode(code);
    vibrateDevice(30);
    closeSheet('sheet-entrar-lista-codigo');
    if (input) input.value = '';

    state.lists = await db.getLists();
    if (!state.lists.some(l => l.id === result.list.id)) {
      state.lists.unshift(result.list);
    }

    renderDashboard();
    switchAppTab('listas');
    showToast(`Conectado à lista "${result.list.name}"!`, 'success');
    openList(result.list.id);
  } catch (err) {
    console.error('Erro ao conectar via convite:', err);
    showConviteAlert(err.message || 'Erro ao conectar lista. Verifique o código e tente novamente.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Conectar Lista';
    }
  }
}

/**
 * Detecta parâmetro ?convite=LST-XXXXX na URL (vindo de WhatsApp ou link direto)
 */
function checkUrlInviteParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('convite');
    if (!inviteParam) return;

    let code = inviteParam.trim();
    if (code.includes('convite=')) {
      const match = code.match(/convite=([A-Za-z0-9\-]+)/i);
      if (match) code = match[1];
    }
    code = code.toUpperCase().replace(/\s+/g, '');

    // Limpa o parâmetro da barra de endereço para evitar reexecução ao recarregar
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    if (db.isAuthenticated()) {
      const input = document.getElementById('input-convite-codigo');
      if (input) input.value = code;
      openSheet('sheet-entrar-lista-codigo');
      setTimeout(() => {
        if (confirm(`🛒 Você abriu um link de convite para a lista (${code})!\n\nDeseja conectar esta lista à sua conta agora?`)) {
          const form = document.getElementById('form-entrar-codigo');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 400);
    } else {
      // Guarda para conectar assim que o usuário entrar/criar conta
      sessionStorage.setItem('pending_invite_code', code);
      alert(`🛒 Você recebeu um convite para acessar uma lista compartilhada (${code})!\n\nFaça login ou crie sua conta grátis para acessá-la.`);
    }
  } catch (_) {}
}

/**
 * Executa convite pendente guardado antes do login
 */
function checkPendingInviteAfterLogin() {
  try {
    const pendingCode = sessionStorage.getItem('pending_invite_code');
    if (!pendingCode) return;
    sessionStorage.removeItem('pending_invite_code');

    setTimeout(() => {
      const input = document.getElementById('input-convite-codigo');
      if (input) input.value = pendingCode;
      openSheet('sheet-entrar-lista-codigo');
      if (confirm(`🛒 Deseja conectar agora a lista do convite (${pendingCode}) recebido à sua conta?`)) {
        const form = document.getElementById('form-entrar-codigo');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 600);
  } catch (_) {}
}

// ==========================================================
// PÁGINA DE LOGIN INICIAL (LANDING DEDICADA)
// ==========================================================
function showInitialAuthTab(tab) {
  const formLogin = document.getElementById('form-initial-login');
  const formSignup = document.getElementById('form-initial-signup');
  const blockRecovery = document.getElementById('block-initial-recovery');
  const btnTabLogin = document.getElementById('btn-tab-choice-login');
  const btnTabSignup = document.getElementById('btn-tab-choice-signup');
  const alertBox = document.getElementById('auth-initial-alert');

  if (alertBox) {
    alertBox.classList.add('hidden');
    alertBox.textContent = '';
  }

  if (tab === 'login') {
    if (formLogin) formLogin.classList.remove('hidden');
    if (formSignup) formSignup.classList.add('hidden');
    if (blockRecovery) blockRecovery.classList.add('hidden');
    if (btnTabLogin) btnTabLogin.classList.add('active');
    if (btnTabSignup) btnTabSignup.classList.remove('active');
  } else if (tab === 'signup') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formSignup) formSignup.classList.remove('hidden');
    if (blockRecovery) blockRecovery.classList.add('hidden');
    if (btnTabLogin) btnTabLogin.classList.remove('active');
    if (btnTabSignup) btnTabSignup.classList.add('active');
  } else if (tab === 'recovery') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formSignup) formSignup.classList.add('hidden');
    if (blockRecovery) blockRecovery.classList.remove('hidden');
  }
}

function showInitialAuthAlert(msg, type = 'error') {
  const alertBox = document.getElementById('auth-initial-alert');
  if (alertBox) {
    alertBox.className = `auth-alert ${type}`;
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  }
}

async function handleInitialLogin(e) {
  e.preventDefault();
  const email = document.getElementById('initial-login-email').value.trim();
  const pass = document.getElementById('initial-login-password').value;
  const remember = document.getElementById('initial-login-remember')?.checked ?? true;
  const btn = document.getElementById('btn-initial-login-submit');

  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    await db.signIn(email, pass, remember);
    vibrateDevice(25);
    unlockAppFromAuthGate();
    await db.migrateLocalListsToCloud();
    await loadDataFromDb();
  } catch (err) {
    vibrateDevice(40);
    showInitialAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Entrar no Aplicativo';
  }
}

async function handleInitialSignup(e) {
  e.preventDefault();
  const name = document.getElementById('initial-signup-name').value.trim();
  const email = document.getElementById('initial-signup-email').value.trim();
  const phone = document.getElementById('initial-signup-phone').value.trim();
  const pass = document.getElementById('initial-signup-password').value;
  const consent = document.getElementById('initial-signup-marketing')?.checked ?? true;
  const btn = document.getElementById('btn-initial-signup-submit');

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    showInitialAuthAlert('Por favor, informe um número de WhatsApp válido com DDD (ex: (11) 99999-9999).', 'error');
    document.getElementById('initial-signup-phone').focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Criando conta...';

  try {
    await db.signUp(email, pass, name, phone, consent);
    vibrateDevice(30);
    if (db.isAuthenticated()) {
      unlockAppFromAuthGate();
      await db.migrateLocalListsToCloud();
      await loadDataFromDb();
    } else {
      showInitialAuthAlert('Conta criada! Verifique seu e-mail para confirmação e faça login.', 'success');
      setTimeout(() => showInitialAuthTab('login'), 3500);
    }
  } catch (err) {
    vibrateDevice(40);
    showInitialAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Criar Minha Conta Grátis';
  }
}

async function handleInitialRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('initial-recovery-email').value.trim();
  const btn = document.getElementById('btn-initial-send-recovery');

  if (!email) {
    showInitialAuthAlert('Digite seu e-mail cadastrado.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    await db.resetPassword(email);
    showInitialAuthAlert('Link de recuperação enviado para o seu e-mail!', 'success');
  } catch (err) {
    showInitialAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✉️ Enviar Link de Recuperação';
  }
}

// ==========================================================
// Finalização de Compra & Gravação no Histórico
// ==========================================================

let activeConcluirList = null;

function openConcluirCompraModal(targetList = null) {
  let list = null;
  if (targetList && targetList.id) {
    list = targetList;
  } else if (state.activeListId) {
    list = state.lists.find(l => String(l.id) === String(state.activeListId));
  }
  if (!list) return;

  activeConcluirList = list;
  const { orcamento, totalGasto, saldoDisponivel } = calculateListTotals(list);
  const listDateFormatted = formatDateBR(list.date || list.createdAt);
  const dateStr = listDateFormatted ? `📅 ${listDateFormatted}` : `Hoje, ${new Date().toLocaleDateString('pt-BR')}`;

  document.getElementById('concluir-lista-nome').textContent = list.name;
  document.getElementById('concluir-lista-categoria').textContent = `${getIcon(list.category)} ${list.category}`;
  document.getElementById('concluir-data-badge').textContent = dateStr;
  document.getElementById('concluir-total-gasto').textContent = formatCurrency(totalGasto);
  document.getElementById('concluir-orcamento').textContent = formatCurrency(orcamento);

  const resBox = document.getElementById('concluir-resultado-box');
  const resVal = document.getElementById('concluir-resultado-val');

  if (saldoDisponivel >= 0) {
    if (resBox) resBox.className = 'concluir-stat-item full';
    if (resVal) {
      resVal.textContent = `Economia de ${formatCurrency(saldoDisponivel)}`;
      resVal.style.color = 'var(--success-text)';
    }
  } else {
    if (resBox) resBox.className = 'concluir-stat-item full estouro';
    if (resVal) {
      resVal.textContent = `Estouro de ${formatCurrency(Math.abs(saldoDisponivel))}`;
      resVal.style.color = 'var(--danger-text)';
    }
  }

  openSheet('sheet-concluir-compra');
}

window.openConcluirCompraModalById = function(listId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const list = state.lists.find(l => String(l.id) === String(listId));
  if (list) {
    openConcluirCompraModal(list);
  }
};

async function handleConfirmarFinalizarCompra() {
  if (!activeConcluirList) return;
  const list = activeConcluirList;
  const { orcamento, totalGasto, saldoDisponivel } = calculateListTotals(list);
  const btn = document.getElementById('btn-confirmar-gravar-historico');
  const resetCheckboxes = document.getElementById('concluir-reset-checkboxes')?.checked ?? false;

  btn.disabled = true;
  btn.textContent = 'Gravando e Atualizando Saldo...';

  try {
    const listDateStr = list.date || (list.createdAt ? list.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    const purchaseDate = listDateStr ? new Date(listDateStr + 'T12:00:00') : new Date();

    const historyItem = {
      listId: list.id,
      listName: list.name,
      category: list.category,
      budget: orcamento,
      totalSpent: totalGasto,
      savings: saldoDisponivel,
      items: (list.items || []).map(i => ({ ...i })),
      purchasedAt: purchaseDate.toISOString()
    };

    await db.savePurchaseHistory(historyItem);
    vibrateDevice(30);

    list.status = 'concluida';
    list.concluidaAt = new Date().toISOString();
    list.totalGastoFinal = totalGasto;

    if (resetCheckboxes && list.items && list.items.length > 0) {
      list.items.forEach(i => i.checked = false);
    }
    await db.saveList(list);

    await loadAndRenderWallet();
    await loadAndRenderHistory();
    renderDashboard();

    if (state.activeListId === list.id) {
      renderListDetail(list.id);
    }

    closeSheet('sheet-concluir-compra');
    showToast(`🎉 Compra concluída! Total: ${formatCurrency(totalGasto)}`, 'success', 5000);

    if (window.admobManager && typeof window.admobManager.showInterstitial === 'function') {
      window.admobManager.showInterstitial(() => switchAppTab('historico'));
    } else {
      switchAppTab('historico');
    }
  } catch (err) {
    showToast('Erro ao gravar compra: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Gravar no Histórico & Deduzir do Saldo';
  }
}

// ==========================================================
// Lógica de Histórico & Balanço Financeiro (Ano, Mês e Dia)
// ==========================================================

let historyCache = [];
let historyFilter = {
  year: new Date().getFullYear(),
  month: 'all',
  day: 'all'
};

async function loadAndRenderHistory() {
  const empty = document.getElementById('empty-state-historico');

  try {
    historyCache = await db.getPurchaseHistory();
    populateHistoryFilterOptions();
    applyHistoryFilters();
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
    if (empty) empty.classList.remove('hidden');
  }
}

function populateHistoryFilterOptions() {
  const selAno = document.getElementById('filtro-hist-ano');
  const selDia = document.getElementById('filtro-hist-dia');
  if (!selAno) return;

  const years = Array.from(new Set(historyCache.map(h => h.year))).filter(Boolean);
  const curYear = new Date().getFullYear();
  if (!years.includes(curYear)) years.unshift(curYear);
  years.sort((a, b) => b - a);

  selAno.innerHTML = years.map(y => `<option value="${y}" ${y === historyFilter.year ? 'selected' : ''}>${y}</option>`).join('');

  if (selDia && selDia.options.length <= 1) {
    let dayOptions = '<option value="all">🗓️ Todos os Dias</option>';
    for (let d = 1; d <= 31; d++) {
      dayOptions += `<option value="${d}">Dia ${String(d).padStart(2, '0')}</option>`;
    }
    selDia.innerHTML = dayOptions;
  }
}

function handleFilterChange() {
  const selAno = document.getElementById('filtro-hist-ano');
  const selMes = document.getElementById('filtro-hist-mes');
  const selDia = document.getElementById('filtro-hist-dia');

  historyFilter.year = selAno ? Number(selAno.value) : new Date().getFullYear();
  historyFilter.month = selMes ? selMes.value : 'all';
  historyFilter.day = selDia ? selDia.value : 'all';

  applyHistoryFilters();
}

function applyHistoryFilters() {
  const balance = db.calculateSpendingBalance(historyCache, historyFilter);
  renderSpendingBalance(balance);
  renderHistoryTimeline(balance.filteredPurchases);
}

function renderSpendingBalance(balance) {
  const lblGasto = document.getElementById('balanco-total-gasto');
  const lblOrcamento = document.getElementById('balanco-total-orcamento');
  const lblEconomia = document.getElementById('balanco-total-economia');
  const lblCount = document.getElementById('balanco-compras-count');
  const lblMedia = document.getElementById('balanco-media-compra');
  const badgeStatus = document.getElementById('balanco-badge-status');
  const cardEconomia = document.getElementById('balanco-card-economia');
  const anoLabel = document.getElementById('chart-ano-label');

  if (lblGasto) lblGasto.textContent = formatCurrency(balance.totalSpent);
  if (lblOrcamento) lblOrcamento.textContent = formatCurrency(balance.totalBudget);
  if (lblCount) lblCount.textContent = `${balance.count} ${balance.count === 1 ? 'compra registrada' : 'compras registradas'}`;
  if (lblMedia) lblMedia.textContent = `Média: ${formatCurrency(balance.averagePerPurchase)} / compra`;
  if (anoLabel) anoLabel.textContent = balance.year;

  if (lblEconomia && badgeStatus && cardEconomia) {
    if (balance.totalSavings >= 0) {
      lblEconomia.textContent = formatCurrency(balance.totalSavings);
      lblEconomia.style.color = 'var(--success)';
      badgeStatus.className = 'balanco-pill-badge';
      badgeStatus.textContent = 'Economia no Período';
      cardEconomia.className = 'balanco-stat-card full-width';
    } else {
      lblEconomia.textContent = `- ${formatCurrency(Math.abs(balance.totalSavings))}`;
      lblEconomia.style.color = 'var(--danger)';
      badgeStatus.className = 'balanco-pill-badge negativo';
      badgeStatus.textContent = 'Orçamento Estourado';
      cardEconomia.className = 'balanco-stat-card full-width negativo';
    }
  }

  renderMonthBarsChart(balance.byMonth, balance.month);
}

function renderMonthBarsChart(byMonth, selectedMonth) {
  const chartContainer = document.getElementById('chart-month-bars');
  if (!chartContainer) return;

  const maxSpent = Math.max(...byMonth.map(m => m.spent), 100);

  chartContainer.innerHTML = byMonth.map(m => {
    const pct = Math.max(6, Math.min(100, Math.round((m.spent / maxSpent) * 100)));
    const isSelected = selectedMonth !== 'all' && Number(selectedMonth) === m.month;
    const hasSpending = m.spent > 0;

    return `
      <div class="month-bar-col" title="${m.name}: ${formatCurrency(m.spent)} em ${m.count} compras">
        <div class="month-bar-fill ${isSelected ? 'active' : (hasSpending ? '' : 'empty')}" 
             style="height: ${pct}%; ${hasSpending ? '' : 'background: #e2e8f0; opacity: 0.5;'}">
        </div>
        <span class="month-bar-label ${isSelected ? 'active' : ''}">${m.name}</span>
      </div>
    `;
  }).join('');
}

function renderHistoryTimeline(purchases) {
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

    const itemsHtml = items.map(item => {
      const subtotal = calculateItemSubtotal(item);
      const unit = item.unit || 'un';
      return `
        <div class="historico-item-line">
          <span>• ${escapeHtml(item.name)} (${item.quantity} ${unit})</span>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>
      `;
    }).join('');

    return `
      <div class="historico-card" id="card-hist-${p.id}">
        <div class="historico-card-header">
          <div>
            <span class="historico-card-title">${getIcon(p.category)} ${escapeHtml(p.listName)}</span>
            <span style="display:block; font-size: 0.72rem; color: var(--text-muted);">${p.category}</span>
          </div>
          <span class="historico-date-badge">📅 ${dateFormatted} às ${timeFormatted}</span>
        </div>

        <div class="historico-metrics-row">
          <div class="historico-metric-item">
            <span class="lbl">Gasto Real</span>
            <span class="val" style="color: var(--primary);">${formatCurrency(p.totalSpent)}</span>
          </div>
          <div class="historico-metric-item">
            <span class="lbl">Orçamento</span>
            <span class="val">${formatCurrency(p.budget)}</span>
          </div>
          <div class="historico-metric-item">
            <span class="lbl">Balanço</span>
            <span class="val" style="color: ${isEconomy ? 'var(--success)' : 'var(--danger)'};">
              ${isEconomy ? 'Economizou ' : 'Estourou '} ${formatCurrency(Math.abs(savings))}
            </span>
          </div>
        </div>

        <!-- Detalhes de Mercadorias (Expansível) -->
        <button type="button" class="historico-items-toggle" onclick="toggleHistoryDropdown('${p.id}')">
          <span>🧾</span>
          <span id="label-toggle-${p.id}">Ver ${items.length} ${items.length === 1 ? 'mercadoria' : 'mercadorias'}</span>
          <span>▼</span>
        </button>
        <div class="historico-items-dropdown hidden" id="dropdown-${p.id}">
          ${itemsHtml || '<p style="margin:0; font-size:0.75rem;">Nenhum item discriminado.</p>'}
        </div>

        <div class="historico-actions-bar">
          <button type="button" class="btn btn-whatsapp-sm" onclick="shareHistoryReceipt('${p.id}')" title="Compartilhar comprovante da compra no WhatsApp">
            📲 WhatsApp
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="handleDeleteHistoryItem('${p.id}')" style="color: var(--danger); border-color: #fca5a5;" title="Excluir este registro">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleHistoryDropdown = function(id) {
  const drop = document.getElementById(`dropdown-${id}`);
  if (drop) {
    drop.classList.toggle('hidden');
  }
};

window.shareHistoryReceipt = function(id) {
  const p = historyCache.find(item => item.id === id);
  if (!p) return;

  const dateFormatted = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
  const items = p.items || [];
  let msg = `🛒 *Comprovante de Compra - Compras Plus*\n`;
  msg += `📋 *${p.listName}* (${p.category})\n`;
  msg += `📅 Data: ${dateFormatted}\n`;
  msg += `-----------------------------\n`;

  items.forEach(it => {
    const sub = calculateItemSubtotal(it);
    msg += `• ${it.name}: ${it.quantity} ${it.unit || 'un'} = ${formatCurrency(sub)}\n`;
  });

  msg += `-----------------------------\n`;
  msg += `💰 *Total Gasto:* ${formatCurrency(p.totalSpent)}\n`;
  msg += `🎯 *Orçamento:* ${formatCurrency(p.budget)}\n`;
  if (p.savings >= 0) {
    msg += `🟢 *Economia:* ${formatCurrency(p.savings)}\n`;
  } else {
    msg += `🔴 *Estouro:* ${formatCurrency(Math.abs(p.savings))}\n`;
  }
  msg += `\nGerado via Compras Plus 📱`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

window.handleDeleteHistoryItem = async function(id) {
  const ok = await showConfirm('Deseja realmente excluir este registro de compra do histórico financeiro?', 'Excluir Registro', '🗑️', '🗑️ Excluir', 'btn-danger-outline');
  if (!ok) return;
  vibrateDevice(20);
  try {
    await db.deletePurchaseHistory(id);
    historyCache = historyCache.filter(h => h.id !== id);
    applyHistoryFilters();
    showToast('Registro excluído.', 'success', 2000);
  } catch (err) {
    showToast('Erro ao excluir registro: ' + err.message, 'error');
  }
};

window.handleDeleteWalletEntry = async function(id) {
  const ok = await showConfirm('Deseja realmente excluir esta entrada financeira?', 'Excluir Entrada', '🗑️', '🗑️ Excluir', 'btn-danger-outline');
  if (!ok) return;
  vibrateDevice(20);
  try {
    await db.deleteWalletEntry(id);
    loadAndRenderWallet();
    showToast('Entrada excluída.', 'success', 2000);
  } catch (err) {
    showToast('Erro ao excluir: ' + err.message, 'error');
  }
};

// ==========================================================
// REABRIR LISTA CONCLUÍDA
// ==========================================================
async function handleReopenList() {
  if (!state.activeListId) return;
  const list = state.lists.find(l => String(l.id) === String(state.activeListId));
  if (!list) return;

  const ok = await showConfirm(`Reabrir a lista "${list.name}"? Ela voltará ao status Aberta.`, 'Reabrir Lista', '🔓', '🔓 Reabrir', 'btn-primary');
  if (!ok) return;

  list.status = 'aberta';
  delete list.concluidaAt;
  vibrateDevice(20);
  try {
    await db.saveList(list);
    const idx = state.lists.findIndex(l => String(l.id) === String(state.activeListId));
    if (idx !== -1) state.lists[idx] = list;
    renderListDetailView(list);
    renderDashboard();
    showToast(`Lista "${list.name}" reaberta!`, 'success');
  } catch (err) {
    showToast('Erro ao reabrir lista: ' + err.message, 'error');
  }
}

// ==========================================================
// EDITAR PRODUTO COMPLETO (Nome, Categoria, Unidade, Qtd, Preço)
// ==========================================================
function handleOpenEditItem(listId, itemId, focusPreco = false, onlyPreco = false) {
  const list = state.lists.find(l => String(l.id) === String(listId));
  if (!list || !list.items) return;
  const item = list.items.find(i => String(i.id) === String(itemId));
  if (!item) return;

  document.getElementById('edit-produto-list-id').value = listId;
  document.getElementById('edit-produto-item-id').value = itemId;
  document.getElementById('edit-produto-nome').value = item.name || '';
  document.getElementById('edit-produto-preco').value = item.unitPrice > 0 ? item.unitPrice : '';
  document.getElementById('edit-produto-quantidade').value = item.quantity || 1;

  // Seleciona categoria
  const catSel = document.getElementById('edit-produto-categoria');
  if (catSel) catSel.value = item.category || 'Mercearia';

  // Define unidade
  setEditProductUnit(item.unit || 'un');

  updateEditSubtotalPreview();
  openSheet('sheet-editar-produto');

  setTimeout(() => {
    if (focusPreco || onlyPreco) {
      document.getElementById('edit-produto-preco').focus();
      document.getElementById('edit-produto-preco').select();
    } else {
      document.getElementById('edit-produto-nome').focus();
    }
  }, 200);
}

function setEditProductUnit(unit) {
  const hiddenInput = document.getElementById('edit-produto-unidade');
  if (hiddenInput) hiddenInput.value = unit;

  document.querySelectorAll('#edit-produto-unidade-group .unit-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });

  const labelQtd = document.getElementById('edit-label-produto-quantidade');
  const labelPreco = document.getElementById('edit-label-produto-preco');
  const qtdInput = document.getElementById('edit-produto-quantidade');

  if (unit === 'kg') {
    if (labelQtd) labelQtd.textContent = 'Peso (kg) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Kg (R$)';
    if (qtdInput) { qtdInput.step = '0.1'; qtdInput.min = '0.1'; }
  } else if (unit === 'g') {
    if (labelQtd) labelQtd.textContent = 'Peso (Gramas) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Kg (R$)';
    if (qtdInput) { qtdInput.step = '50'; qtdInput.min = '50'; }
  } else if (unit === 'L') {
    if (labelQtd) labelQtd.textContent = 'Volume (Litros) *';
    if (labelPreco) labelPreco.textContent = 'Preço do Litro (R$)';
    if (qtdInput) { qtdInput.step = '0.5'; qtdInput.min = '0.5'; }
  } else {
    if (labelQtd) labelQtd.textContent = 'Quantidade (un) *';
    if (labelPreco) labelPreco.textContent = 'Preço Unit. (R$)';
    if (qtdInput) { qtdInput.step = '1'; qtdInput.min = '1'; }
  }
  updateEditSubtotalPreview();
}

function updateEditSubtotalPreview() {
  const qtd = parseFloat(document.getElementById('edit-produto-quantidade')?.value) || 0;
  const preco = parseFloat(document.getElementById('edit-produto-preco')?.value) || 0;
  const unit = document.getElementById('edit-produto-unidade')?.value || 'un';
  let subtotal = 0;
  if (unit === 'g') subtotal = (qtd / 1000) * preco;
  else subtotal = qtd * preco;
  const el = document.getElementById('edit-preview-subtotal');
  if (el) el.textContent = formatCurrency(subtotal);
}

async function handleSaveEditItem(e) {
  e.preventDefault();
  const listId = document.getElementById('edit-produto-list-id').value;
  const itemId = document.getElementById('edit-produto-item-id').value;
  const nome = document.getElementById('edit-produto-nome').value.trim();
  const cat = document.getElementById('edit-produto-categoria').value;
  const unit = document.getElementById('edit-produto-unidade').value;
  const quantity = parseFloat(document.getElementById('edit-produto-quantidade').value) || 1;
  const unitPrice = parseFloat(document.getElementById('edit-produto-preco').value) || 0;

  if (!nome) { showToast('Informe o nome do produto.', 'warning'); return; }

  const updates = { name: nome, category: cat, unit, quantity, unitPrice };

  // Optimistic update local
  const list = state.lists.find(l => String(l.id) === String(listId));
  if (list && list.items) {
    const item = list.items.find(i => String(i.id) === String(itemId));
    if (item) Object.assign(item, updates);
    renderProductCards(list);
    updateBudgetMetricsOnly(list);
  }

  closeSheet('sheet-editar-produto');
  showToast(`"${nome}" atualizado!`, 'success', 2000);
  vibrateDevice(20);

  try {
    const updatedList = await db.updateItem(listId, itemId, updates);
    if (updatedList) {
      const idx = state.lists.findIndex(l => String(l.id) === String(listId));
      if (idx !== -1) state.lists[idx] = updatedList;
      renderProductCards(updatedList);
      updateBudgetMetricsOnly(updatedList);
    }
  } catch (err) {
    showToast('Erro ao salvar alterações: ' + err.message, 'error');
  }
}

// ==========================================================
// REABRIR LISTA CONCLUÍDA
// ==========================================================
async function handleReopenList() {
  if (!state.activeListId) return;
  const list = state.lists.find(l => String(l.id) === String(state.activeListId));
  if (!list) return;

  const ok = await showConfirm(
    `Reabrir a lista "${list.name}"? Ela voltará ao status Aberta e poderá ser editada novamente.`,
    'Reabrir Lista', '🔓', '🔓 Reabrir', 'btn-primary'
  );
  if (!ok) return;

  list.status = 'aberta';
  delete list.concluidaAt;
  vibrateDevice(20);

  try {
    await db.saveList(list);
    const idx = state.lists.findIndex(l => String(l.id) === String(state.activeListId));
    if (idx !== -1) state.lists[idx] = list;
    // Atualiza o botão Reabrir / Concluir
    const btnReabrir = document.getElementById('btn-reabrir-lista');
    const btnConcluir = document.getElementById('btn-abrir-finalizar-compra');
    if (btnReabrir) btnReabrir.classList.add('hidden');
    if (btnConcluir) btnConcluir.classList.remove('hidden');
    renderProductCards(list);
    updateBudgetMetricsOnly(list);
    renderDashboard();
    showToast(`Lista "${list.name}" reaberta!`, 'success');
  } catch (err) {
    showToast('Erro ao reabrir lista: ' + err.message, 'error');
    list.status = 'concluida'; // reverte
  }
}

window.handleOpenEditItem = handleOpenEditItem;
window.showToast = showToast;
window.handleReopenList = handleReopenList;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  // Listeners do sheet de editar produto
  const btnFecharEditProduto = document.getElementById('btn-fechar-sheet-editar-produto');
  if (btnFecharEditProduto) btnFecharEditProduto.addEventListener('click', () => closeSheet('sheet-editar-produto'));

  const formEditarProduto = document.getElementById('form-editar-produto');
  if (formEditarProduto) formEditarProduto.addEventListener('submit', handleSaveEditItem);

  document.querySelectorAll('#edit-produto-unidade-group .unit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setEditProductUnit(btn.dataset.unit));
  });

  const editQtdInput = document.getElementById('edit-produto-quantidade');
  const editPrecoInput = document.getElementById('edit-produto-preco');
  if (editQtdInput) editQtdInput.addEventListener('input', updateEditSubtotalPreview);
  if (editPrecoInput) editPrecoInput.addEventListener('input', updateEditSubtotalPreview);

  document.getElementById('edit-btn-qty-minus')?.addEventListener('click', () => {
    const qtdEl = document.getElementById('edit-produto-quantidade');
    const unit = document.getElementById('edit-produto-unidade')?.value || 'un';
    let cur = parseFloat(qtdEl.value) || 1;
    if (unit === 'un') qtdEl.value = Math.max(1, Math.round(cur) - 1);
    else if (unit === 'g') qtdEl.value = Math.max(50, Math.round((cur - 50) / 50) * 50);
    else if (unit === 'kg') qtdEl.value = Math.max(0.1, Math.round((cur - 0.25) * 100) / 100);
    else if (unit === 'L') qtdEl.value = Math.max(0.5, Math.round((cur - 0.5) * 10) / 10);
    updateEditSubtotalPreview();
  });

  document.getElementById('edit-btn-qty-plus')?.addEventListener('click', () => {
    const qtdEl = document.getElementById('edit-produto-quantidade');
    const unit = document.getElementById('edit-produto-unidade')?.value || 'un';
    let cur = parseFloat(qtdEl.value) || 0;
    if (unit === 'un') qtdEl.value = Math.max(1, Math.round(cur) + 1);
    else if (unit === 'g') qtdEl.value = Math.round((cur + 50) / 50) * 50;
    else if (unit === 'kg') qtdEl.value = Math.round((cur + 0.25) * 100) / 100;
    else if (unit === 'L') qtdEl.value = Math.round((cur + 0.5) * 10) / 10;
    updateEditSubtotalPreview();
  });

  // Listener do botão Reabrir Lista
  const btnReabrir = document.getElementById('btn-reabrir-lista');
  if (btnReabrir) btnReabrir.addEventListener('click', handleReopenList);

  // Roteamento pelo hash da URL
  const handleHashChange = () => {
    const hash = window.location.hash;
    if (!db.isAuthenticated()) return;
    if (hash.startsWith('#/listas/')) {
      const lid = hash.replace('#/listas/', '');
      if (lid && lid !== state.activeListId) {
        switchAppTab('listas');
        openList(lid);
      }
    } else if (hash === '#/listas' || hash === '' || hash === '#/') {
      if (state.activeListId) showDashboard();
      else switchAppTab('listas');
    } else if (hash === '#/ranking') {
      switchAppTab('ranking');
    } else if (hash === '#/carteira') {
      switchAppTab('carteira');
    } else if (hash === '#/historico') {
      switchAppTab('historico');
    } else if (hash === '#/perfil') {
      switchAppTab('perfil');
    } else if (hash === '#/termos') {
      switchAppTab('termos');
    }
  };
  window.addEventListener('hashchange', handleHashChange);

  // Interações de Busca e Filtro Tailwind
  const searchInput = document.getElementById('searchInput');
  let currentFilter = 'all';

  window.applyFilterAndSearch = function() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    let visibleCount = 0;
    const cards = Array.from(document.querySelectorAll('.list-card'));
    const emptyState = document.getElementById('empty-state-listas');

    cards.forEach(card => {
      const title = (card.getAttribute('data-title') || '').toLowerCase();
      const status = card.getAttribute('data-status') || '';

      const matchesQuery = !query || title.includes(query);
      
      let matchesFilter = false;
      if (currentFilter === 'all') matchesFilter = true;
      else if (currentFilter === 'in_progress' && status !== 'completed') matchesFilter = true;
      else if (currentFilter === 'pending' && status === 'pending') matchesFilter = true;
      else if (currentFilter === 'completed' && status === 'completed') matchesFilter = true;

      if (matchesQuery && matchesFilter) {
        card.classList.remove('hidden');
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.classList.add('hidden');
        card.style.display = 'none';
      }
    });

    if (visibleCount === 0 && cards.length > 0) {
      emptyState?.classList.remove('hidden');
      emptyState?.classList.add('flex');
      const spanMsg = emptyState?.querySelector('.text-label-lg');
      if(spanMsg) spanMsg.textContent = 'Nenhum resultado';
    } else if (cards.length > 0) {
      emptyState?.classList.add('hidden');
      emptyState?.classList.remove('flex');
    }
  };

  document.getElementById('toggleSearchBtn')?.addEventListener('click', () => {
    const searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) return;
    const isHidden = searchContainer.classList.contains('hidden');
    if (isHidden) {
      searchContainer.classList.remove('hidden');
      searchInput?.focus();
    } else {
      searchContainer.classList.add('hidden');
      if (searchInput) searchInput.value = '';
      applyFilterAndSearch();
    }
  });

  document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      applyFilterAndSearch();
    }
  });

  searchInput?.addEventListener('input', applyFilterAndSearch);

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        c.classList.add('bg-surface-container', 'text-on-surface-variant');
        c.setAttribute('aria-selected', 'false');
      });

      chip.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
      chip.classList.remove('bg-surface-container', 'text-on-surface-variant');
      chip.setAttribute('aria-selected', 'true');

      currentFilter = chip.getAttribute('data-filter') || 'all';
      applyFilterAndSearch();
    });
  });

  await loadDataFromDb();
  checkUrlInviteParam();

  // Define hash inicial se não houver
  if (!window.location.hash) {
    window.history.replaceState({}, '', '#/listas');
  }
});
