import { create } from 'zustand';
import { supabase } from '../../../core/lib/supabase';
import { syncEngine } from '../../../core/sync/SyncEngine';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useListStore } from '../../shopping/store/useListStore';
import { getLocalISODate } from '../../../core/utils/date';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PAID' | 'PENDING';
export type RecurrencePeriod = 'MONTHLY' | 'WEEKLY' | 'YEARLY';

export interface FinanceTransaction {
  id: string;
  owner_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  due_date: string; // YYYY-MM-DD
  is_recurrent: boolean;
  recurrence_period?: RecurrencePeriod;
  is_installment: boolean;
  installment_info?: string; // e.g., '1/12'
  created_at: string;
}

interface FinanceState {
  transactions: FinanceTransaction[];
  isLoading: boolean;
  
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<FinanceTransaction, 'id' | 'owner_id' | 'created_at'>) => void;
  updateTransaction: (id: string, data: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  payTransaction: (id: string) => void; // Lógica de dar baixa, que gera a próxima parcela/recorrência
  
  // Cálculos filtrados por mês/ano (ex: 2026-09)
  getTotalIncome: (monthYear: string) => number;
  getTotalExpense: (monthYear: string) => number;
  getRealBalance: (monthYear: string) => number;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('due_date', { ascending: true });
        
      if (error) throw error;
      if (data) {
        set({ transactions: data as FinanceTransaction[] });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: (t) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const newTx: FinanceTransaction = {
      ...t,
      id: crypto.randomUUID(),
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ transactions: [...state.transactions, newTx] }));
    
    syncEngine.addOperation({
      table: 'finance_transactions',
      type: 'INSERT',
      record_id: newTx.id,
      payload: newTx
    });
  },

  updateTransaction: (id, data) => {
    set((state) => ({
      transactions: state.transactions.map(t => (t.id === id ? { ...t, ...data } : t))
    }));

    syncEngine.addOperation({
      table: 'finance_transactions',
      type: 'UPDATE',
      record_id: id,
      payload: data
    });
  },

  deleteTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter(t => t.id !== id)
    }));

    syncEngine.addOperation({
      table: 'finance_transactions',
      type: 'DELETE',
      record_id: id,
      payload: null
    });
  },

  payTransaction: (id) => {
    const state = get();
    const tx = state.transactions.find(t => t.id === id);
    if (!tx || tx.status === 'PAID') return;

    // 1. Atualizar o atual para PAID
    state.updateTransaction(id, { status: 'PAID' });

    // 2. Se for recorrente, gerar o próximo mês (ou período)
    if (tx.is_recurrent && tx.recurrence_period === 'MONTHLY') {
      const currentDate = new Date(tx.due_date);
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      const nextDate = getLocalISODate(currentDate);
      
      state.addTransaction({
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        status: 'PENDING',
        category: tx.category,
        due_date: nextDate,
        is_recurrent: true,
        recurrence_period: 'MONTHLY',
        is_installment: false,
      });
    }

    // 3. Se for parcelado, gerar a próxima parcela
    if (tx.is_installment && tx.installment_info) {
      const [current, total] = tx.installment_info.split('/').map(Number);
      if (current < total) {
        const currentDate = new Date(tx.due_date);
        currentDate.setMonth(currentDate.getMonth() + 1);
        const nextDate = getLocalISODate(currentDate);

        state.addTransaction({
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          status: 'PENDING',
          category: tx.category,
          due_date: nextDate,
          is_recurrent: false,
          is_installment: true,
          installment_info: `${current + 1}/${total}`
        });
      }
    }
  },

  getTotalIncome: (monthYear) => {
    return get().transactions
      .filter(t => t.type === 'INCOME' && t.due_date.startsWith(monthYear))
      .reduce((acc, curr) => acc + curr.amount, 0);
  },

  getTotalExpense: (monthYear) => {
    return get().transactions
      .filter(t => t.type === 'EXPENSE' && t.due_date.startsWith(monthYear))
      .reduce((acc, curr) => acc + curr.amount, 0);
  },

  getRealBalance: (monthYear) => {
    // 1. Total de Entradas RECEBIDAS no mês
    const incomeReceived = get().transactions
      .filter(t => t.type === 'INCOME' && t.status === 'PAID' && t.due_date.startsWith(monthYear))
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Total de Saídas PAGAS no mês
    const expensesPaid = get().transactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && t.due_date.startsWith(monthYear))
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Gasto em Listas Concluídas no mês cruzando dados da useListStore
    const { lists } = useListStore.getState();
    const completedLists = lists.filter(l => l.status === 'concluida' && l.created_at.startsWith(monthYear));
    
    let listsSpent = 0;
    completedLists.forEach(list => {
      (list.items || []).forEach(item => {
        if (item.checked && item.price && item.price > 0) {
          listsSpent += (item.price * (item.quantity || 1));
        }
      });
    });

    // Saldo = Entradas Realizadas - (Despesas Realizadas + Gastos de Mercado)
    return incomeReceived - (expensesPaid + listsSpent);
  },
}));
