import React, { useState, useEffect } from 'react';
import { useFinanceStore, type FinanceTransaction } from '../store/useFinanceStore';
import { Wallet, Landmark, Plus } from 'lucide-react';
import { TransactionCard } from '../components/TransactionCard';
import { NovaTransacaoModal } from '../components/modals/NovaTransacaoModal';
import { formatCurrency } from '../../../core/utils/currency';
import { getLocalISODate } from '../../../core/utils/date';
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

  let filtered = [...transactions].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (activeTab === 'PENDING') filtered = filtered.filter(t => t.status === 'PENDING');
  if (activeTab === 'EXPENSE') filtered = filtered.filter(t => t.type === 'EXPENSE');
  if (activeTab === 'INCOME') filtered = filtered.filter(t => t.type === 'INCOME');
  if (activeTab === 'INSTALLMENTS') filtered = filtered.filter(t => t.is_installment);
  if (activeTab === 'RECURRENT') filtered = filtered.filter(t => t.is_recurrent);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'PENDING', label: '⏰ A Pagar' },
    { id: 'EXPENSE', label: '🔴 Despesas' },
    { id: 'INCOME', label: '🟢 Entradas' },
    { id: 'INSTALLMENTS', label: '💳 Parcelados' },
    { id: 'RECURRENT', label: '🔁 Recorrentes' },
  ];

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

      {/* Hero Card: Saldo em Caixa Real */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-on-primary shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-primary-fixed/20 pointer-events-none">
          <Landmark size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-primary-fixed mb-1 uppercase tracking-wider">Saldo em Caixa Real</p>
          <h2 className="text-4xl font-black tracking-tight mb-2">{formatCurrency(balance)}</h2>
          <p className="text-[10px] text-white/80 font-medium">
            (Entradas Recebidas - Despesas Pagas - Gasto de Mercado)
          </p>
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
