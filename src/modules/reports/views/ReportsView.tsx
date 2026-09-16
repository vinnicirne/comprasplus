import React, { useState, useEffect } from 'react';
import { useListStore } from '../../shopping/store/useListStore';
import { useFinanceStore } from '../../finance/store/useFinanceStore';
import { BarChart2, PieChart as PieChartIcon, TrendingUp, AlertCircle, ShoppingCart, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currency';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { clsx } from 'clsx';

// Cores do Design System (inspirado no global.css)
const COLORS = ['#006948', '#acf847', '#416900', '#00855d', '#85f8c4'];

export const ReportsView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'MARKET' | 'WALLET'>('MARKET');
  
  const { lists } = useListStore();
  const { transactions, fetchTransactions } = useFinanceStore();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  let totalGasto = 0;
  const categoryTotals: Record<string, number> = {};
  let totalItemsCount = 0;
  
  if (viewMode === 'MARKET') {
    // 1. Filtrar apenas listas concluídas
    const completedLists = lists.filter(l => l.status === 'concluida');
    totalItemsCount = completedLists.length;

    completedLists.forEach(list => {
      (list.items || []).forEach(item => {
        // Considerando itens marcados (comprados) que possuem preço
        if (item.checked && item.price && item.price > 0) {
          const itemTotal = item.price * (item.quantity || 1);
          totalGasto += itemTotal;

          const cat = (item.category || 'Outros').toLowerCase();
          categoryTotals[cat] = (categoryTotals[cat] || 0) + itemTotal;
        }
      });
    });
  } else {
    // Modo Carteira (Apenas Despesas Pagas)
    const paidExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID');
    totalItemsCount = paidExpenses.length;

    paidExpenses.forEach(t => {
      totalGasto += t.amount;
      const cat = (t.category || 'Outros').toLowerCase();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });
  }

  // 3. Preparar dados para o gráfico de rosca (Recharts)
  const chartData = Object.keys(categoryTotals).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: categoryTotals[key],
  })).sort((a, b) => b.value - a.value); // Ordenar do maior para o menor

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-24 px-margin pt-2">
      <section className="flex flex-col gap-1 pt-1 mb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-tight flex items-center gap-2">
          <BarChart2 className="text-primary" size={28} /> Relatórios
        </h1>
        <p className="text-xs text-on-surface-variant font-normal">
          Análise detalhada de seus gastos.
        </p>
      </section>

      {/* Toggle View Mode */}
      <div className="flex bg-surface-container-low rounded-xl p-1 gap-1 border border-outline-variant/30 mb-6">
        <button
          onClick={() => setViewMode('MARKET')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
            viewMode === 'MARKET' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <ShoppingCart size={16} /> Mercado
        </button>
        <button
          onClick={() => setViewMode('WALLET')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
            viewMode === 'WALLET' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <Wallet size={16} /> Carteira
        </button>
      </div>

      {/* Hero Card: Total Gasto */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-on-primary shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-primary-fixed/20 pointer-events-none">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-primary-fixed mb-1 uppercase tracking-wider">Total Gasto</p>
          <h2 className="text-4xl font-black tracking-tight mb-2">{formatCurrency(totalGasto)}</h2>
          <p className="text-xs text-white/80">
            {viewMode === 'MARKET' 
              ? `Considerando apenas as ${totalItemsCount} ${totalItemsCount === 1 ? 'lista concluída' : 'listas concluídas'}.` 
              : `Considerando apenas ${totalItemsCount} ${totalItemsCount === 1 ? 'despesa paga' : 'despesas pagas'}.`
            }
          </p>
        </div>
      </div>

      {totalGasto > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2 text-on-surface">
            <PieChartIcon className="text-secondary" size={20} />
            <h3 className="text-lg font-bold">Gastos por Categoria</h3>
          </div>
          
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm border border-outline-variant/30 flex flex-col items-center">
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {chartData.map((item, index) => {
              const percentage = ((item.value / totalGasto) * 100).toFixed(1);
              return (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm font-bold text-on-surface">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span>{item.name}</span>
                    </div>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length] 
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-on-surface-variant text-right">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/50 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Sem Dados</h3>
          <p className="text-sm text-on-surface-variant">
            {viewMode === 'MARKET'
              ? 'Conclua suas listas e adicione os preços dos produtos para gerar relatórios detalhados.'
              : 'Registre e dê baixa em suas despesas na aba de Carteira para gerar relatórios.'
            }
          </p>
        </div>
      )}
    </div>
  );
};
