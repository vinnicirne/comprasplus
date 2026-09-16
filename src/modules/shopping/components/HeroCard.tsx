import React, { useMemo } from 'react';
import { useListStore } from '../store/useListStore';
import { formatCurrency } from '../../../core/utils/currency';
import { Wallet, TrendingDown } from 'lucide-react';

export const HeroCard: React.FC = () => {
  const lists = useListStore(state => state.lists);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtra listas do mês atual
  const monthLists = useMemo(() => {
    return lists.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [lists, currentMonth, currentYear]);

  const activeListsCount = monthLists.filter(l => l.status !== 'concluida').length;

  let totalSpent = 0;
  let totalBudget = 0;
  
  // Para análise de mercado mais vantajoso
  const storeStats: Record<string, { totalSpent: number, listCount: number }> = {};

  monthLists.forEach(l => {
    totalBudget += l.budget || 0;
    const gasto = (l.items || []).reduce((acc, item) => acc + (item.checked ? (item.price || 0) * (item.quantity || 1) : 0), 0);
    totalSpent += gasto;

    const store = (l.store || '').trim().toLowerCase();
    if (store && l.status === 'concluida') {
      if (!storeStats[store]) storeStats[store] = { totalSpent: 0, listCount: 0 };
      storeStats[store].totalSpent += gasto;
      storeStats[store].listCount += 1;
    }
  });

  // Calcula o mercado mais vantajoso (menor ticket médio)
  let bestStore = '';
  let lowestAvg = Infinity;
  Object.keys(storeStats).forEach(s => {
    if (storeStats[s].listCount > 0) {
      const avg = storeStats[s].totalSpent / storeStats[s].listCount;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        bestStore = s;
      }
    }
  });

  // Se não houver lojas, esconde a dica
  const displayStore = bestStore ? bestStore.charAt(0).toUpperCase() + bestStore.slice(1) : null;

  return (
    <section className="bg-primary rounded-3xl p-5 text-white shadow-level-3 flex flex-col justify-between relative overflow-hidden">
      {/* Elementos decorativos (Glow) */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-emerald-200 uppercase">
          <Wallet size={15} />
          <span>TOTAL GASTO NO MÊS</span>
        </div>
        <div className="px-3 py-1 rounded-full backdrop-blur-md bg-white/20 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
          {activeListsCount} listas ativas
        </div>
      </div>

      <div className="mt-3 relative z-10">
        <div className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
          <span className="text-2xl">R$</span>
          <span>{formatCurrency(totalSpent).replace('R$', '').trim()}</span>
        </div>
      </div>

      {/* Dica de Mercado mais Vantajoso */}
      <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100 font-medium relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Orçamento Total</span>
          <strong className="text-white text-sm">{formatCurrency(totalBudget)}</strong>
        </div>
        
        {displayStore && (
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[10px] uppercase tracking-wider text-[#acf847] font-bold flex items-center gap-1">
              <TrendingDown size={12} />
              Mais Vantajoso
            </span>
            <span className="text-white font-bold truncate max-w-[120px]" title={displayStore}>
              {displayStore}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
