import React, { useState, useMemo } from 'react';
import { useListStore, type ShoppingList } from '../../shopping/store/useListStore';
import { formatCurrency } from '../../../core/utils/currency';
import { Receipt, ShoppingBag, Wallet2, Sparkles, ChevronDown, Trash2, Share2 } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Utilidades ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CATEGORY_EMOJI: Record<string, string> = {
  mercado: '🛒', hortifruti: '🥦', farmacia: '💊', festa: '🎉', outros: '🏷️',
};

function calcListSpent(list: ShoppingList): number {
  return (list.items || [])
    .filter(i => i.checked && i.price && i.price > 0)
    .reduce((acc, i) => acc + (i.price! * (i.quantity || 1)), 0);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Sub-componente: Card de compra na timeline ────────────────────────────────

const PurchaseCard: React.FC<{ list: ShoppingList; onDelete: (id: string) => void }> = ({ list, onDelete }) => {
  const [open, setOpen] = useState(false);
  const spent = calcListSpent(list);
  const budget = list.budget || 0;
  const savings = budget > 0 ? budget - spent : null;
  const emoji = CATEGORY_EMOJI[list.category] || '🏷️';
  const checkedItems = (list.items || []).filter(i => i.checked);

  const handleWhatsApp = () => {
    const items = checkedItems
      .map(i => `• ${i.name}${i.quantity && i.quantity > 1 ? ` (${i.quantity} ${i.unit || 'un'})` : ''}: ${formatCurrency((i.price || 0) * (i.quantity || 1))}`)
      .join('\n');

    const msg = [
      `🛒 *Comprovante de Compra - Compras Plus*`,
      `📋 *${list.name}* (${list.category})`,
      list.store ? `🏪 Supermercado: *${list.store}*` : '',
      `📅 Data: ${formatDate(list.created_at)}`,
      `-----------------------------`,
      items,
      `-----------------------------`,
      `💰 *Gasto Real:* ${formatCurrency(spent)}`,
      budget > 0 ? `🎯 *Orçamento Previsto:* ${formatCurrency(budget)}` : '',
      savings !== null && savings >= 0 ? `✨ *Economia:* ${formatCurrency(savings)}` : '',
      savings !== null && savings < 0 ? `⚠️ *Excedeu:* ${formatCurrency(Math.abs(savings))}` : '',
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm mb-4" style={{ background: 'var(--surface)' }}>
      {/* Header do card */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'var(--primary)', opacity: 0.9 }}
          >
            {emoji}
          </div>
          <div>
            <p className="font-black text-base text-on-surface leading-tight">{list.name}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {list.category}{list.store ? ` · ${list.store}` : ''}
            </p>
            <p className="text-[10px] text-outline mt-0.5">{formatDate(list.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Linha de métricas */}
      <div className="grid grid-cols-3 gap-px bg-outline-variant/20 border-t border-outline-variant/20">
        <div className="flex flex-col items-center py-3 px-2" style={{ background: 'var(--surface)' }}>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Gasto Real</span>
          <span className="text-sm font-black text-primary">{formatCurrency(spent)}</span>
        </div>
        <div className="flex flex-col items-center py-3 px-2" style={{ background: 'var(--surface)' }}>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Orçamento</span>
          <span className="text-sm font-black text-on-surface">{budget > 0 ? formatCurrency(budget) : 'Livre'}</span>
        </div>
        <div className="flex flex-col items-center py-3 px-2" style={{ background: 'var(--surface)' }}>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Balanço</span>
          {savings !== null ? (
            <span className={clsx('text-sm font-black', savings >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {savings >= 0 ? '+' : ''}{formatCurrency(savings)}
            </span>
          ) : (
            <span className="text-sm font-black text-on-surface-variant">—</span>
          )}
        </div>
      </div>

      {/* Sanfona de itens */}
      {checkedItems.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-outline-variant/20 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span>{open ? 'Ocultar' : `Ver ${checkedItems.length} ${checkedItems.length === 1 ? 'produto' : 'produtos'}`}</span>
            <ChevronDown
              size={16}
              className="transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          {open && (
            <div className="px-4 pb-3 border-t border-outline-variant/10 flex flex-col gap-1 pt-2">
              {checkedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-outline-variant/10 last:border-0">
                  <span className="text-on-surface font-semibold">
                    • {item.name}
                    {item.quantity && item.quantity > 1 ? ` (${item.quantity} ${item.unit || 'un'})` : ''}
                  </span>
                  <span className="text-on-surface-variant font-bold shrink-0 ml-2">
                    {formatCurrency((item.price || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Ações */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/20">
        <button
          type="button"
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <Share2 size={14} /> Compartilhar
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Excluir este registro do histórico?')) onDelete(list.id);
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-error hover:bg-error/10 border border-error/20 transition-colors shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ─── View Principal ────────────────────────────────────────────────────────────

export const HistoryView: React.FC = () => {
  const { lists, deleteList } = useListStore();

  // Apenas listas concluídas
  const completed = useMemo(
    () => lists.filter(l => l.status === 'concluida').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [lists]
  );

  // Anos disponíveis
  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    const set = new Set(completed.map(l => new Date(l.created_at).getFullYear()));
    [-2, -1, 0, 1].forEach(d => set.add(current + d));
    return [...set].sort((a, b) => b - a);
  }, [completed]);

  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>('0'); // 0 = Todos
  const [filterDay, setFilterDay] = useState<string>('0');     // 0 = Todos

  // Aplicar filtros
  const filtered = useMemo(() => {
    return completed.filter(l => {
      const d = new Date(l.created_at);
      if (filterYear !== '0' && d.getFullYear() !== Number(filterYear)) return false;
      if (filterMonth !== '0' && d.getMonth() + 1 !== Number(filterMonth)) return false;
      if (filterDay !== '0' && d.getDate() !== Number(filterDay)) return false;
      return true;
    });
  }, [completed, filterYear, filterMonth, filterDay]);

  // Cálculo dos cards de balanço
  const totalSpent = useMemo(() => filtered.reduce((acc, l) => acc + calcListSpent(l), 0), [filtered]);
  const totalBudget = useMemo(() => filtered.reduce((acc, l) => acc + (l.budget || 0), 0), [filtered]);
  const totalSavings = totalBudget > 0 ? totalBudget - totalSpent : null;
  const avgPerPurchase = filtered.length > 0 ? totalSpent / filtered.length : 0;

  // Dados para o gráfico mensal
  const year = filterYear !== '0' ? Number(filterYear) : new Date().getFullYear();
  const byMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const spent = completed
        .filter(l => {
          const d = new Date(l.created_at);
          return d.getFullYear() === year && d.getMonth() + 1 === monthNum;
        })
        .reduce((acc, l) => acc + calcListSpent(l), 0);
      return { month: monthNum, label: MONTHS[i], spent };
    });
  }, [completed, year]);

  const maxSpent = Math.max(...byMonth.map(m => m.spent), 100);

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-32 px-margin pt-2">
      {/* Cabeçalho */}
      <section className="flex flex-col gap-1 pt-1 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-tight flex items-center gap-2">
          <Receipt className="text-primary" size={28} /> Balanço & Histórico
        </h1>
        <p className="text-xs text-on-surface-variant font-normal">
          Todas as suas compras concluídas e seus balanços.
        </p>
      </section>

      {/* ─── Filtros ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          {
            id: 'year', label: 'Ano', value: filterYear, onChange: setFilterYear,
            options: [{ value: '0', label: 'Todos' }, ...availableYears.map(y => ({ value: String(y), label: String(y) }))],
          },
          {
            id: 'month', label: 'Mês', value: filterMonth, onChange: setFilterMonth,
            options: [{ value: '0', label: 'Todos' }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))],
          },
          {
            id: 'day', label: 'Dia', value: filterDay, onChange: setFilterDay,
            options: [
              { value: '0', label: 'Todos' },
              ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') })),
            ],
          },
        ].map(f => (
          <div key={f.id} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{f.label}</label>
            <select
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className="h-10 px-2 rounded-xl border border-outline-variant/40 bg-surface-container-low text-on-surface text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
            >
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* ─── Cards de Balanço ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total Gasto */}
        <div className="relative flex flex-col p-4 rounded-3xl overflow-hidden" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
          <div className="absolute right-2 top-2 text-primary/10 pointer-events-none"><ShoppingBag size={52} /></div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Gasto Real</span>
          <span className="text-xl font-black text-primary">{formatCurrency(totalSpent)}</span>
          <span className="text-[10px] text-on-surface-variant mt-1">{filtered.length} {filtered.length === 1 ? 'compra' : 'compras'} registradas</span>
        </div>

        {/* Orçamento Total */}
        <div className="relative flex flex-col p-4 rounded-3xl overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
          <div className="absolute right-2 top-2 text-on-surface-variant/10 pointer-events-none"><Wallet2 size={52} /></div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Orçamento Total</span>
          <span className="text-xl font-black text-on-surface">{totalBudget > 0 ? formatCurrency(totalBudget) : '—'}</span>
          <span className="text-[10px] text-on-surface-variant mt-1">Média: {formatCurrency(avgPerPurchase)} / compra</span>
        </div>

        {/* Economia — col-span-2 */}
        <div className={clsx(
          'col-span-2 relative flex flex-col p-4 rounded-3xl overflow-hidden',
          totalSavings === null ? 'bg-surface-container-low' :
          totalSavings >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'
        )}>
          <div className="absolute right-3 top-3 pointer-events-none opacity-10">
            <Sparkles size={52} className={totalSavings !== null && totalSavings < 0 ? 'text-rose-500' : 'text-emerald-500'} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            {totalSavings === null ? 'Economia / Saldo' : totalSavings >= 0 ? '✅ Economia no Período' : '⚠️ Orçamento Estourado'}
          </span>
          <span className={clsx(
            'text-2xl font-black',
            totalSavings === null ? 'text-on-surface-variant' :
            totalSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {totalSavings === null ? '—' : `${totalSavings >= 0 ? '+' : ''}${formatCurrency(totalSavings)}`}
          </span>
        </div>
      </div>

      {/* ─── Gráfico de Barras CSS ───────────────────────────── */}
      <div className="rounded-3xl border border-outline-variant/30 p-4 mb-6" style={{ background: 'var(--surface-container-lowest)' }}>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Gastos Mês a Mês — {year}</p>
        <div className="flex items-end gap-1 h-40">
          {byMonth.map(m => {
            const pct = Math.max(8, Math.min(100, Math.round((m.spent / maxSpent) * 100)));
            const isSelected = filterMonth !== '0' && Number(filterMonth) === m.month;
            const hasSpent = m.spent > 0;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                title={`${MONTHS[m.month - 1]}: ${formatCurrency(m.spent)}`}
                onClick={() => setFilterMonth(filterMonth === String(m.month) ? '0' : String(m.month))}
              >
                <div className="w-full flex items-end justify-center" style={{ height: '128px' }}>
                  <div
                    className={clsx(
                      'w-full rounded-t-lg transition-all duration-300',
                      isSelected
                        ? 'shadow-md ring-2 ring-primary/40'
                        : hasSpent
                          ? 'group-hover:opacity-80'
                          : 'opacity-40'
                    )}
                    style={{
                      height: `${pct}%`,
                      background: isSelected
                        ? 'var(--primary)'
                        : hasSpent
                          ? 'color-mix(in srgb, var(--primary) 50%, transparent)'
                          : 'var(--surface-container-highest)',
                    }}
                  />
                </div>
                <span className={clsx(
                  'text-[9px] font-bold',
                  isSelected ? 'text-primary' : 'text-on-surface-variant'
                )}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Timeline de compras ──────────────────────────────── */}
      <div className="flex flex-col">
        <h2 className="text-base font-black text-on-surface mb-4">
          {filtered.length === 0 ? 'Nenhum registro' : `${filtered.length} ${filtered.length === 1 ? 'Compra' : 'Compras'} no Período`}
        </h2>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-3xl border border-dashed border-outline-variant/40 text-center">
            <Receipt size={40} className="text-on-surface-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant">Nenhuma compra encontrada</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Tente ajustar os filtros de período.</p>
          </div>
        ) : (
          filtered.map(list => (
            <PurchaseCard key={list.id} list={list} onDelete={deleteList} />
          ))
        )}
      </div>
    </div>
  );
};
