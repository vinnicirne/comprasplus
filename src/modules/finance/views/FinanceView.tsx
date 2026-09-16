import React, { useState, useEffect } from 'react';
import { useFinanceStore, type FinanceTransaction } from '../store/useFinanceStore';
import { Wallet, Landmark, Plus } from 'lucide-react';
import { TransactionCard } from '../components/TransactionCard';
import { NovaTransacaoModal } from '../components/modals/NovaTransacaoModal';
import { formatCurrency } from '../../../core/utils/currency';
import { getLocalISODate } from '../../../core/utils/date';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

type FilterTab = 'ALL' | 'PENDING' | 'EXPENSE' | 'INCOME' | 'INSTALLMENTS' | 'RECURRENT';

export const FinanceView: React.FC = () => {
  const { 
    transactions,
    fetchTransactions,
    payTransaction,
    getRealBalance,
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<FinanceTransaction | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Current Month/Year for filtering
  const currentMonthYear = getLocalISODate().slice(0, 7); // YYYY-MM
  const balance = getRealBalance(currentMonthYear);

  const handleEdit = (t: FinanceTransaction) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setTimeout(() => setTransactionToEdit(null), 300);
  };

  // Apply Search and Date Filters
  let baseFiltered = [...transactions].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    baseFiltered = baseFiltered.filter(t => 
      t.description.toLowerCase().includes(q) || 
      (t.category && t.category.toLowerCase().includes(q))
    );
  }
  
  if (dateFilter) {
    baseFiltered = baseFiltered.filter(t => t.due_date === dateFilter);
  }

  // Pre-calculate lists for each tab to get totals
  const filteredByTab = {
    ALL: baseFiltered,
    PENDING: baseFiltered.filter(t => t.status === 'PENDING'),
    EXPENSE: baseFiltered.filter(t => t.type === 'EXPENSE'),
    INCOME: baseFiltered.filter(t => t.type === 'INCOME'),
    INSTALLMENTS: baseFiltered.filter(t => t.is_installment),
    RECURRENT: baseFiltered.filter(t => t.is_recurrent),
  };

  const getSum = (tabId: FilterTab) => {
    return filteredByTab[tabId].reduce((acc, t) => acc + t.amount, 0);
  };

  const filtered = filteredByTab[activeTab];

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'PENDING', label: '⏰ A Pagar' },
    { id: 'EXPENSE', label: '🔴 Despesas' },
    { id: 'INCOME', label: '🟢 Entradas' },
    { id: 'INSTALLMENTS', label: '💳 Parcelados' },
    { id: 'RECURRENT', label: '🔁 Recorrentes' },
  ];

  const getHeroInfo = () => {
    switch(activeTab) {
      case 'ALL': 
        return { 
          title: 'Saldo em Caixa Real', 
          val: balance, 
          sub: '(Entradas Recebidas - Despesas Pagas - Gasto de Mercado)' 
        };
      case 'PENDING': 
        return { title: 'Total A Pagar', val: getSum('PENDING'), sub: 'Soma das pendências listadas abaixo' };
      case 'EXPENSE': 
        return { title: 'Total de Despesas', val: getSum('EXPENSE'), sub: 'Soma das despesas listadas abaixo' };
      case 'INCOME': 
        return { title: 'Total de Entradas', val: getSum('INCOME'), sub: 'Soma das entradas listadas abaixo' };
      case 'INSTALLMENTS': 
        return { title: 'Total Parcelado', val: getSum('INSTALLMENTS'), sub: 'Soma dos itens parcelados listados' };
      case 'RECURRENT': 
        return { title: 'Total Recorrente', val: getSum('RECURRENT'), sub: 'Soma das transações fixas listadas' };
      default:
        return { title: 'Total', val: 0, sub: '' };
    }
  };

  const heroInfo = getHeroInfo();

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-32 px-margin pt-2">
      <section className="flex flex-col gap-1 pt-1 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-tight flex items-center gap-2">
          <Wallet className="text-primary" size={28} /> Carteira
        </h1>
        <p className="text-xs text-on-surface-variant font-normal">
          Controle centralizado das suas finanças e obrigações.
        </p>
      </section>

      {/* Hero Card: Informação Dinâmica */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-on-primary shadow-lg mb-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute -right-8 -top-8 text-primary-fixed/20 pointer-events-none">
          <Landmark size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-primary-fixed mb-1 uppercase tracking-wider">{heroInfo.title}</p>
          <h2 className="text-4xl font-black tracking-tight mb-2">{formatCurrency(heroInfo.val)}</h2>
          <p className="text-[10px] text-white/80 font-medium">
            {heroInfo.sub}
          </p>
        </div>
      </div>

      {/* Filters (Search & Date) */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center bg-surface-container-low rounded-2xl px-4 py-2 border border-outline-variant/30 shadow-xs focus-within:border-primary focus-within:bg-surface-container-lowest transition-all">
          <Search className="text-outline mr-2 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar transação ou categoria..." 
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-outline hover:text-on-surface p-1">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Data Específica:</label>
          <div className="flex-1 flex items-center bg-surface-container-low rounded-xl px-3 py-1.5 border border-outline-variant/30 shadow-xs">
            <input 
              type="date"
              className="w-full bg-transparent text-sm text-on-surface outline-none"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs font-bold text-error bg-error/10 px-3 py-2 rounded-xl">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide -mx-margin px-margin">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-bold shrink-0 transition-colors",
              activeTab === tab.id 
                ? "bg-primary text-on-primary shadow-sm" 
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            Nenhuma transação encontrada.
          </div>
        ) : (
          filtered.map(t => (
            <TransactionCard
              key={t.id}
              transaction={t}
              onPay={payTransaction}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          <Plus size={28} />
        </button>
      </div>

      <NovaTransacaoModal 
        open={isModalOpen}
        onOpenChange={handleModalClose}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
};
