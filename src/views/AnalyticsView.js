import { appStore } from '../store/appStore.js';
import * as walletService from '../services/walletService.js';
import { formatCurrency } from '../utils/formatters.js';
import Chart from 'chart.js/auto';

export const AnalyticsView = {
  currentFilter: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  },
  walletEntries: [],
  purchaseHistory: [],
  charts: {},

  async render() {
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    const routerView = document.getElementById('router-view');
    if (!routerView) return;

    routerView.innerHTML = `
      <main class="min-h-screen bg-surface flex flex-col pb-32">
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-md pt-safe px-4 h-16 flex items-center justify-between gap-2 border-b border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px] sm:text-[22px]">bar_chart</span>
            </span>
            <div class="min-w-0 flex flex-col">
              <h1 class="font-headline-sm text-[15px] sm:text-headline-sm font-bold text-on-surface leading-tight truncate">Relatórios</h1>
              <span class="font-body-sm text-on-surface-variant text-[10px] sm:text-xs truncate hidden sm:block">Análise visual das suas finanças</span>
            </div>
          </div>
        </header>

        <div class="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
          
          <!-- Filtros de Período -->
          <div class="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div class="flex items-center gap-1 flex-1">
              <span class="material-symbols-outlined text-outline text-[18px] pl-2">calendar_month</span>
              <select id="analytics-filter-ano" class="bg-transparent font-label-md text-on-surface font-semibold py-1.5 outline-none cursor-pointer w-full text-xs">
                ${[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => `
                  <option value="${y}" ${y === this.currentFilter.year ? 'selected' : ''}>Ano ${y}</option>
                `).join('')}
              </select>
            </div>
            <div class="w-[1px] h-6 bg-outline-variant/30"></div>
            <div class="flex items-center gap-1 flex-1">
              <select id="analytics-filter-mes" class="bg-transparent font-label-md text-on-surface font-semibold py-1.5 outline-none cursor-pointer w-full text-xs pr-2">
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

          <!-- Resumo de Balanço do Período -->
          <div class="bg-primary rounded-3xl p-5 shadow-md flex flex-col relative overflow-hidden text-on-primary">
             <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
             <span class="font-label-sm text-xs font-semibold tracking-wider uppercase opacity-85">Balanço do Período</span>
             <span class="font-headline-lg text-3xl font-extrabold mt-1 tracking-tight" id="analytics-balanco">R$ 0,00</span>
             
             <div class="flex justify-between items-end mt-4 pt-4 border-t border-white/20 relative z-10">
               <div class="flex flex-col">
                 <span class="text-[10px] uppercase opacity-80 mb-0.5">Total Entradas</span>
                 <span class="font-bold text-sm text-emerald-200" id="analytics-entradas">R$ 0,00</span>
               </div>
               <div class="flex flex-col text-right">
                 <span class="text-[10px] uppercase opacity-80 mb-0.5">Total Saídas</span>
                 <span class="font-bold text-sm text-rose-200" id="analytics-saidas">R$ 0,00</span>
               </div>
             </div>
          </div>

          <!-- Gráfico: Balanço -->
          <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
            <h2 class="font-headline-sm text-sm font-bold text-on-surface mb-3">Entradas vs Saídas</h2>
            <div class="relative w-full h-48">
              <canvas id="chart-balance"></canvas>
            </div>
          </div>

          <!-- Gráfico: Categorias de Despesas -->
          <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
            <h2 class="font-headline-sm text-sm font-bold text-on-surface mb-3">Despesas por Categoria</h2>
            <div class="relative w-full h-56 flex justify-center">
              <canvas id="chart-categories"></canvas>
            </div>
          </div>

        </div>
      </main>
    `;

    this.attachEvents();
    await this.loadData();
  },

  attachEvents() {
    const anoSelect = document.getElementById('analytics-filter-ano');
    const mesSelect = document.getElementById('analytics-filter-mes');

    if (anoSelect) {
      anoSelect.addEventListener('change', (e) => {
        this.currentFilter.year = e.target.value === 'all' ? 'all' : Number(e.target.value);
        this.renderCharts();
      });
    }

    if (mesSelect) {
      mesSelect.addEventListener('change', (e) => {
        this.currentFilter.month = e.target.value === 'all' ? 'all' : Number(e.target.value);
        this.renderCharts();
      });
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
      this.renderCharts();
    } catch (e) {
      console.error('Erro ao carregar dados para gráficos:', e);
    }
  },

  renderCharts() {
    const balance = walletService.calculateWalletBalance(
      this.walletEntries,
      this.purchaseHistory,
      this.currentFilter
    );

    // Atualiza Resumo
    const elBalanco = document.getElementById('analytics-balanco');
    const elEntradas = document.getElementById('analytics-entradas');
    const elSaidas = document.getElementById('analytics-saidas');

    if (elBalanco) elBalanco.textContent = formatCurrency(balance.saldoPeriodo);
    if (elEntradas) elEntradas.textContent = formatCurrency(balance.totalRecebido);
    if (elSaidas) elSaidas.textContent = formatCurrency(balance.totalSaidas);

    this.renderBalanceChart(balance);
    this.renderCategoriesChart(balance);
  },

  renderBalanceChart(balance) {
    const ctx = document.getElementById('chart-balance');
    if (!ctx) return;

    if (this.charts.balance) {
      this.charts.balance.destroy();
    }

    this.charts.balance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Entradas', 'Saídas'],
        datasets: [{
          label: 'Valor (R$)',
          data: [balance.totalRecebido, balance.totalSaidas],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // emerald
            'rgba(244, 63, 94, 0.8)'   // rose
          ],
          borderRadius: 8,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  renderCategoriesChart(balance) {
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;

    if (this.charts.categories) {
      this.charts.categories.destroy();
    }

    const categoryTotals = {};
    balance.entries.forEach(e => {
      if (e.type === 'saida') {
        const cat = e.category || 'Geral';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
      }
    });
    
    if (balance.totalCompras > 0) {
       categoryTotals['Mercado'] = (categoryTotals['Mercado'] || 0) + balance.totalCompras;
    }

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (data.length === 0) {
      this.charts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#ccc'] }] },
        options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '75%' }
      });
      return;
    }

    this.charts.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#006948', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
        }
      }
    });
  }
};
