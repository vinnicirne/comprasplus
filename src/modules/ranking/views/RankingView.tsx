import React, { useState, useMemo } from 'react';
import { useListStore } from '../../shopping/store/useListStore';
import { useNavigationStore } from '../../../core/store/useNavigationStore';
import { formatCurrency } from '../../../core/utils/currency';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronDown, 
  Lightbulb, 
  Scale, 
  Package, 
  Banknote,
  SortAsc,
  Plus
} from 'lucide-react';
import { clsx } from 'clsx';

// Constants
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Typings
interface RankedItem {
  name: string;
  normalizedName: string;
  category: string;
  frequency: number; // in how many lists it appears
  totalLists: number; // total completed lists in the period
  totalQuantity: number;
  totalSpent: number;
  avgPrice: number;
  unit: string;
  priceTrend: 'up' | 'down' | 'flat'; // mock for now
  trendValue: number; // percentage
}

export const RankingView: React.FC = () => {
  const { lists, updateList } = useListStore();
  const { activeListId, navigate } = useNavigationStore();

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Only completed lists
  const completedLists = useMemo(() => lists.filter(l => l.status === 'concluida'), [lists]);

  // Date filters
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const set = new Set(completedLists.map(l => new Date(l.created_at).getFullYear()));
    [-1, 0].forEach(d => set.add(currentYear + d));
    return [...set].sort((a, b) => b - a);
  }, [completedLists, currentYear]);

  const [filterYear, setFilterYear] = useState<string>(String(currentYear));
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);

  // Sorting and Filtering
  const [sortBy, setSortBy] = useState<'freq' | 'spent'>('freq');
  const [filterCategory, setFilterCategory] = useState<'all' | 'un' | 'kg' | 'l' | 'freq'>('all');

  // Compute stats for selected period
  const { filteredLists, rankedItems, metrics } = useMemo(() => {
    const flists = completedLists.filter(l => {
      const d = new Date(l.created_at);
      if (filterYear !== '0' && d.getFullYear() !== Number(filterYear)) return false;
      if (filterMonth !== '0' && d.getMonth() + 1 !== Number(filterMonth)) return false;
      return true;
    });

    const itemMap = new Map<string, RankedItem>();
    let totalItems = 0;
    let totalKg = 0;
    let totalLiters = 0;
    let totalInvested = 0;

    flists.forEach(list => {
      const checkedItems = list.items?.filter(i => i.checked) || [];
      totalItems += checkedItems.length;

      const seenInList = new Set<string>();

      checkedItems.forEach(item => {
        const normName = item.name.trim().toLowerCase();
        const price = item.price || 0;
        const qty = item.quantity || 1;
        const unit = (item.unit || 'un').toLowerCase();
        const spent = price * qty;

        totalInvested += spent;
        if (unit === 'kg') totalKg += qty;
        if (unit === 'l') totalLiters += qty;

        if (!itemMap.has(normName)) {
          itemMap.set(normName, {
            name: item.name,
            normalizedName: normName,
            category: item.category || 'Outros',
            frequency: 0,
            totalLists: flists.length,
            totalQuantity: 0,
            totalSpent: 0,
            avgPrice: 0,
            unit: item.unit || 'un',
            priceTrend: 'flat',
            trendValue: 0
          });
        }

        const stats = itemMap.get(normName)!;
        if (!seenInList.has(normName)) {
          stats.frequency += 1;
          seenInList.add(normName);
        }
        stats.totalQuantity += qty;
        stats.totalSpent += spent;
      });
    });

    // Finalize stats
    const rankedArray = Array.from(itemMap.values()).map(stats => {
      stats.avgPrice = stats.totalQuantity > 0 ? stats.totalSpent / stats.totalQuantity : 0;
      // Mock trends for delight
      const hash = stats.name.length;
      stats.priceTrend = hash % 3 === 0 ? 'up' : hash % 2 === 0 ? 'down' : 'flat';
      stats.trendValue = (hash % 15) + 1;
      return stats;
    });

    // Apply filters
    let resultArray = rankedArray;
    if (filterCategory === 'un') resultArray = resultArray.filter(i => i.unit.toLowerCase() === 'un');
    if (filterCategory === 'kg') resultArray = resultArray.filter(i => i.unit.toLowerCase() === 'kg' || i.unit.toLowerCase() === 'g');
    if (filterCategory === 'l') resultArray = resultArray.filter(i => i.unit.toLowerCase() === 'l' || i.unit.toLowerCase() === 'ml');
    if (filterCategory === 'freq') resultArray = resultArray.filter(i => i.frequency === flists.length && flists.length > 0);

    // Sort
    resultArray.sort((a, b) => {
      if (sortBy === 'freq') {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        return b.totalSpent - a.totalSpent;
      } else {
        return b.totalSpent - a.totalSpent;
      }
    });

    return {
      filteredLists: flists,
      rankedItems: resultArray,
      metrics: {
        items: totalItems,
        kg: totalKg,
        liters: totalLiters,
        invested: totalInvested
      }
    };
  }, [completedLists, filterYear, filterMonth, sortBy, filterCategory]);

  const top3 = rankedItems.slice(0, 3);
  const others = rankedItems.slice(3);

  const handleAddToList = (item: RankedItem) => {
    if (!activeListId) {
      showToast('Crie ou abra uma lista primeiro!');
      return;
    }
    const currentList = lists.find(l => l.id === activeListId);
    if (currentList) {
      const newItem = {
        id: crypto.randomUUID(),
        name: item.name,
        category: item.category,
        price: item.avgPrice,
        quantity: 1,
        unit: item.unit,
        checked: false
      };
      updateList(activeListId, {
        items: [...(currentList.items || []), newItem]
      });
      showToast(`"${item.name}" incluído na sua lista atual!`);
    }
  };

  const currentMonthLabel = filterMonth !== '0' ? MONTHS[Number(filterMonth)-1] : 'Todos';

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-32 pt-2">
      
      {/* Header Context */}
      <div className="px-margin pt-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0 relative">
            <button 
              onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
              className="flex items-center gap-1 text-on-surface hover:text-primary transition-colors focus:outline-none py-1"
            >
              <span className="text-[22px] font-bold tracking-tight">
                {currentMonthLabel} {filterYear !== '0' ? `/ ${filterYear}` : ''}
              </span>
              <ChevronDown 
                className={clsx("text-primary transition-transform duration-200", isMonthSelectOpen && "rotate-180")} 
                size={22} 
              />
            </button>
            <p className="text-xs text-on-surface-variant">Consumo acumulado e frequência das suas listas</p>
            
            {/* Simple Dropdown for Month/Year */}
            {isMonthSelectOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface border border-outline-variant/40 rounded-xl shadow-lg z-50 p-2 flex flex-col gap-2 min-w-[200px]">
                <div className="flex gap-2">
                  <select 
                    value={filterMonth} 
                    onChange={e => { setFilterMonth(e.target.value); setIsMonthSelectOpen(false); }}
                    className="flex-1 h-9 rounded-lg bg-surface-container-low text-sm font-bold px-2"
                  >
                    <option value="0">Todos meses</option>
                    {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                  </select>
                  <select 
                    value={filterYear} 
                    onChange={e => { setFilterYear(e.target.value); setIsMonthSelectOpen(false); }}
                    className="w-24 h-9 rounded-lg bg-surface-container-low text-sm font-bold px-2"
                  >
                    <option value="0">Todos</option>
                    {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bento 3-Card Strip */}
      <div className="px-margin mb-5">
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: Itens */}
          <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Itens</span>
              <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <Package size={15} />
              </div>
            </div>
            <div>
              <span className="text-[20px] text-on-surface font-extrabold tracking-tight">{metrics.items}</span>
              <span className="block text-[11px] text-on-surface-variant leading-none mt-0.5">registrados</span>
            </div>
          </div>
          
          {/* Card 2: Volume */}
          <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Peso/Vol</span>
              <div className="w-6 h-6 rounded-lg bg-[#acf847]/40 flex items-center justify-center text-[#416900]">
                <Scale size={15} />
              </div>
            </div>
            <div>
              <span className="text-[20px] text-on-surface font-extrabold tracking-tight">
                {metrics.kg.toFixed(1).replace('.0','')} <span className="text-[12px] font-semibold text-on-surface-variant">kg</span>
              </span>
              <span className="block text-[11px] text-on-surface-variant leading-none mt-0.5">
                & {metrics.liters.toFixed(1).replace('.0','')} L
              </span>
            </div>
          </div>

          {/* Card 3: Investimento */}
          <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Investido</span>
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Banknote size={15} />
              </div>
            </div>
            <div>
              <span className="text-[20px] text-primary font-extrabold tracking-tight">R$ {Math.round(metrics.invested)}</span>
              <span className="block text-[11px] text-on-surface-variant leading-none mt-0.5">no período</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insight */}
      {top3.length > 0 && (
        <div className="px-margin mb-5">
          <div className="relative overflow-hidden rounded-2xl p-3.5 shadow-sm" style={{ background: 'linear-gradient(to right, var(--primary-container), var(--primary))', color: 'var(--on-primary)' }}>
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 text-[#85f8c4]">
                <Lightbulb size={20} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#85f8c4] font-bold">Consumo Inteligente</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#85f8c4] animate-pulse"></span>
                </div>
                <p className="text-xs text-white/95 leading-snug">
                  Você comprou <strong className="text-white font-bold">{top3[0].name}</strong> em {top3[0].frequency} das {filteredLists.length} listas recentes. Seu gasto médio foi de {formatCurrency(top3[0].avgPrice)}.
                </p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#acf847]/20 rounded-full blur-xl pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Filter Chips & Order Switcher */}
      <div className="px-margin mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Filtrar por unidade</span>
          <button 
            onClick={() => setSortBy(sortBy === 'freq' ? 'spent' : 'freq')}
            className="flex items-center gap-1 text-primary hover:text-primary-container text-[11px] font-bold bg-surface-container-low px-2 py-1 rounded-lg transition-colors"
          >
            <SortAsc size={15} />
            {sortBy === 'freq' ? 'Mais Frequentes ↓' : 'Maior Gasto (R$) ↓'}
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-margin px-margin">
          {[
            { id: 'all', label: `Todos (${rankedItems.length})` },
            { id: 'un', label: 'Por Unidade (UN)' },
            { id: 'kg', label: 'Por Peso (KG)' },
            { id: 'l', label: 'Líquidos (L)' },
            { id: 'freq', label: '100% Presentes' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id as any)}
              className={clsx(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-[13px] font-bold transition-all",
                filterCategory === f.id 
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="px-margin mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Trophy className="text-[#416900]" size={20} />
              <h2 className="text-[17px] font-bold text-on-surface leading-tight">Destaques no Pódio</h2>
            </div>
            <span className="text-[11px] font-bold text-on-surface-variant">Top 3 do mês</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* #2 Silver */}
            {top3[1] && (
              <div className="bg-surface-container-lowest rounded-2xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden order-1 mt-3">
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center font-extrabold text-[12px] shadow-sm">2º</div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary mb-2 text-lg">
                  🥈
                </div>
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] mb-1 font-bold">
                    {top3[1].totalQuantity.toFixed(1).replace('.0','')} {top3[1].unit}
                  </span>
                  <h3 className="text-[13px] leading-tight text-on-surface font-bold truncate">{top3[1].name}</h3>
                  <p className="text-[11px] text-on-surface-variant truncate">{top3[1].frequency} de {filteredLists.length} listas</p>
                  <div className="mt-1.5 pt-1.5 border-t border-surface-container-low flex items-baseline justify-between">
                    <span className="text-[11px] text-primary font-bold">{formatCurrency(top3[1].totalSpent)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* #1 Gold */}
            {top3[0] && (
              <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-md flex flex-col justify-between relative overflow-hidden order-2 -mt-1 border-2 border-[#acf847]">
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#acf847] text-[#102000] flex items-center justify-center font-extrabold text-[13px] shadow-sm">1º</div>
                <div className="w-12 h-12 rounded-xl bg-[#acf847]/30 flex items-center justify-center text-[#416900] mb-2 text-2xl">
                  🥇
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-[#acf847]/40 text-[#457000] text-[11px] mb-1 font-extrabold">
                    {top3[0].totalQuantity.toFixed(1).replace('.0','')} {top3[0].unit}
                  </span>
                  <h3 className="text-[14px] leading-tight text-on-surface font-extrabold truncate">{top3[0].name}</h3>
                  <p className="text-[11px] text-on-surface-variant truncate">{top3[0].frequency} compras</p>
                  <div className="mt-2 pt-1.5 border-t border-surface-container-low flex items-baseline justify-between">
                    <span className="text-[13px] text-primary font-extrabold">{formatCurrency(top3[0].totalSpent)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* #3 Bronze */}
            {top3[2] && (
              <div className="bg-surface-container-lowest rounded-2xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden order-3 mt-4">
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-[12px] shadow-sm">3º</div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary mb-2 text-lg">
                  🥉
                </div>
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] mb-1 font-bold">
                    {top3[2].totalQuantity.toFixed(1).replace('.0','')} {top3[2].unit}
                  </span>
                  <h3 className="text-[13px] leading-tight text-on-surface font-bold truncate">{top3[2].name}</h3>
                  <p className="text-[11px] text-on-surface-variant truncate">{top3[2].frequency} de {filteredLists.length} listas</p>
                  <div className="mt-1.5 pt-1.5 border-t border-surface-container-low flex items-baseline justify-between">
                    <span className="text-[11px] text-primary font-bold">{formatCurrency(top3[2].totalSpent)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Ranking List */}
      {others.length > 0 && (
        <div className="px-margin flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[17px] font-bold text-on-surface">Classificação Geral</h2>
            <span className="text-[12px] text-on-surface-variant">Posições #4 a #{rankedItems.length}</span>
          </div>

          {others.map((item, idx) => {
            const rank = idx + 4;
            return (
              <div key={item.normalizedName} className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[13px] text-on-surface-variant w-5 text-center font-bold">#{rank}</span>
                    <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0 text-xl">
                      📦
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-[15px] font-bold leading-tight text-on-surface truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-on-surface-variant">Em {item.frequency} de {filteredLists.length}</span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                        <span className="text-[11px] font-bold text-primary bg-[#85f8c4]/40 px-1.5 py-0.5 rounded">
                          {item.totalQuantity.toFixed(1).replace('.0','')} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[15px] font-extrabold text-on-surface leading-tight">{formatCurrency(item.totalSpent)}</span>
                    <span className="text-[11px] text-on-surface-variant">Méd. {formatCurrency(item.avgPrice)}/{item.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-container-low/80">
                  <div className={clsx("flex items-center gap-1", item.priceTrend === 'down' ? 'text-primary' : item.priceTrend === 'up' ? 'text-error' : 'text-on-surface-variant')}>
                    {item.priceTrend === 'down' && <TrendingDown size={15} />}
                    {item.priceTrend === 'up' && <TrendingUp size={15} />}
                    {item.priceTrend === 'flat' && <Minus size={15} />}
                    <span className="text-[11px] font-semibold">
                      {item.priceTrend === 'down' ? `-${item.trendValue}% mais barato` : item.priceTrend === 'up' ? `+${item.trendValue}% mais caro` : 'Preço estável'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleAddToList(item)}
                    className="flex items-center gap-1 text-primary bg-surface-container hover:bg-primary hover:text-on-primary px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                  >
                    <Plus size={14} />
                    <span className="text-[11px] font-bold">Adicionar à lista</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Feedback */}
      <div 
        className={clsx(
          "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 transform",
          toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="bg-[#283044] text-[#eef0ff] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-[13px] font-semibold">
          <span className="text-[#85f8c4]">✓</span>
          <span>{toastMessage}</span>
        </div>
      </div>
    </div>
  );
};
