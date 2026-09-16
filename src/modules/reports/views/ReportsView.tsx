import React from 'react';
import { useListStore } from '../../shopping/store/useListStore';
import { BarChart2, PieChart as PieChartIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currency';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Cores do Design System (inspirado no global.css)
const COLORS = ['#006948', '#acf847', '#416900', '#00855d', '#85f8c4'];

export const ReportsView: React.FC = () => {
  const { lists } = useListStore();

  // 1. Filtrar apenas listas concluídas
  const completedLists = lists.filter(l => l.status === 'concluida');

  // 2. Calcular gasto total (apenas itens com preço nas listas concluídas)
  let totalGasto = 0;
  const categoryTotals: Record<string, number> = {};

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

  // 3. Preparar dados para o gráfico de rosca (Recharts)
  const chartData = Object.keys(categoryTotals).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: categoryTotals[key],
  })).sort((a, b) => b.value - a.value); // Ordenar do maior para o menor

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-24 px-margin pt-2">
      <section className="flex flex-col gap-1 pt-1 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-tight flex items-center gap-2">
          <BarChart2 className="text-primary" size={28} /> Relatórios
        </h1>
        <p className="text-xs text-on-surface-variant font-normal">
          Análise de seus gastos em listas concluídas.
        </p>
      </section>

      {/* Hero Card: Total Gasto */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-on-primary shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-primary-fixed/20 pointer-events-none">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-primary-fixed mb-1 uppercase tracking-wider">Total Gasto</p>
          <h2 className="text-4xl font-black tracking-tight mb-2">{formatCurrency(totalGasto)}</h2>
          <p className="text-xs text-white/80">
            Considerando apenas as {completedLists.length} {completedLists.length === 1 ? 'lista concluída' : 'listas concluídas'}.
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
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
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
            Conclua suas listas e adicione os preços dos produtos para gerar relatórios detalhados.
          </p>
        </div>
      )}
    </div>
  );
};
