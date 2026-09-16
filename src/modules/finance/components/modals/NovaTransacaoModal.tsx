import React, { useState } from 'react';
import { Modal } from '../../../../core/components/ui/Modal';
import { Input } from '../../../../core/components/ui/Input';
import { Button } from '../../../../core/components/ui/Button';
import { ConfirmDialog } from '../../../../core/components/ui/ConfirmDialog';
import { useFinanceStore, type FinanceTransaction } from '../../store/useFinanceStore';
import { DollarSign, FileText, Calendar, Repeat, CreditCard, Tag } from 'lucide-react';
import { clsx } from 'clsx';

import { getLocalISODate } from '../../../../core/utils/date';

interface NovaTransacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: FinanceTransaction | null;
}

export const NovaTransacaoModal: React.FC<NovaTransacaoModalProps> = ({ open, onOpenChange, transactionToEdit }) => {
  const { addTransaction, updateTransaction, deleteTransaction, transactions } = useFinanceStore();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState(() => getLocalISODate());
  const [status, setStatus] = useState<'PAID' | 'PENDING'>('PENDING');
  
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');
  
  const [error, setError] = useState('');

  // Sugestões de categoria baseadas no histórico do usuário
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(c => c && c.trim() !== ''))).sort();

  React.useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setDescription(transactionToEdit.description);
        setAmount(transactionToEdit.amount.toString());
        setCategory(transactionToEdit.category);
        setDueDate(transactionToEdit.due_date);
        setStatus(transactionToEdit.status);
        setIsRecurrent(transactionToEdit.is_recurrent);
        setIsInstallment(transactionToEdit.is_installment);
      } else {
        // Reset
        setType('EXPENSE');
        setDescription('');
        setAmount('');
        setCategory('Outros');
        setDueDate(getLocalISODate());
        setStatus('PENDING');
        setIsRecurrent(false);
        setIsInstallment(false);
        setInstallments('2');
      }
      setError('');
    }
  }, [open, transactionToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount.replace(',', '.')) <= 0) {
      setError('Preencha a descrição e o valor.');
      return;
    }

    const val = parseFloat(amount.replace(',', '.'));

    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        description: description.trim(),
        amount: val,
        type,
        category,
        due_date: dueDate,
        status,
        is_recurrent: isRecurrent,
      });
    } else {
      if (isInstallment && type === 'EXPENSE') {
        // Primeira parcela (as outras serão geradas dinamicamente ao dar baixa)
        const totalInst = parseInt(installments);
        addTransaction({
          description: description.trim(),
          amount: val / totalInst, // Divide o valor inicial pela quantidade
          type,
          category,
          due_date: dueDate,
          status,
          is_recurrent: false,
          is_installment: true,
          installment_info: `1/${totalInst}`
        });
      } else {
        addTransaction({
          description: description.trim(),
          amount: val,
          type,
          category,
          due_date: dueDate,
          status,
          is_recurrent: isRecurrent,
          recurrence_period: isRecurrent ? 'MONTHLY' : undefined,
          is_installment: false,
        });
      }
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToEdit) {
      deleteTransaction(transactionToEdit.id);
      onOpenChange(false);
    }
  };

  return (
    <>
    <Modal open={open} onOpenChange={onOpenChange} title={transactionToEdit ? "Editar Transação" : "Nova Transação"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Type Toggle */}
        <div className="flex bg-surface-container-low rounded-xl p-1 gap-1 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={clsx(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              type === 'EXPENSE' ? 'bg-error text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={clsx(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              type === 'INCOME' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Entrada
          </button>
        </div>

        {error && <p className="text-error text-sm font-medium text-center">{error}</p>}

        <Input 
          label="Descrição" 
          placeholder="Ex: Aluguel, Salário..." 
          icon={FileText}
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus
        />

        <Input 
          label="Valor (R$)" 
          placeholder="0,00" 
          type="number"
          step="0.01"
          icon={DollarSign}
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        <Input 
          label="Categoria" 
          placeholder="Ex: Moradia, Alimentação" 
          icon={Tag}
          value={category}
          onChange={e => setCategory(e.target.value)}
          list="category-suggestions"
        />
        <datalist id="category-suggestions">
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <Input 
          label="Data de Vencimento / Recebimento" 
          type="date"
          icon={Calendar}
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />

        {/* Status */}
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-bold text-on-surface-variant">Status</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatus('PENDING')}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold border transition-all flex-1",
                status === 'PENDING' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant'
              )}
            >
              {type === 'EXPENSE' ? 'A Pagar' : 'A Receber'}
            </button>
            <button
              type="button"
              onClick={() => setStatus('PAID')}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold border transition-all flex-1",
                status === 'PAID' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-on-surface-variant'
              )}
            >
              {type === 'EXPENSE' ? 'Já Pago' : 'Já Recebido'}
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-outline-variant/30">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <Repeat size={18} className="text-primary" />
                Despesa Fixa Mensal (Recorrente)
              </div>
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary"
                checked={isRecurrent}
                onChange={e => {
                  setIsRecurrent(e.target.checked);
                  if (e.target.checked) setIsInstallment(false);
                }}
              />
            </label>

            {type === 'EXPENSE' && (
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                  <CreditCard size={18} className="text-primary" />
                  Compra Parcelada
                </div>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-primary"
                  checked={isInstallment}
                  onChange={e => {
                    setIsInstallment(e.target.checked);
                    if (e.target.checked) setIsRecurrent(false);
                  }}
                />
              </label>
            )}

            {isInstallment && type === 'EXPENSE' && (
              <Input 
                label="Número de Parcelas" 
                type="number"
                min="2"
                max="48"
                value={installments}
                onChange={e => setInstallments(e.target.value)}
              />
            )}
          </div>

        <div className="flex gap-2 mt-4">
          {transactionToEdit && (
            <Button 
              type="button" 
              variant="outline"
              className="h-14 flex-1 border-error text-error hover:bg-error/10 hover:border-error"
              onClick={handleDelete}
            >
              Excluir
            </Button>
          )}
          <Button type="submit" className={transactionToEdit ? "h-14 text-base flex-[2]" : "h-14 text-base mt-4"}>
            {transactionToEdit ? 'Salvar Alterações' : 'Salvar Transação'}
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      open={confirmDeleteOpen}
      onOpenChange={setConfirmDeleteOpen}
      title="Excluir Lançamento"
      description="Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita."
      onConfirm={confirmDelete}
      confirmText="Excluir"
      cancelText="Cancelar"
    />
    </>
  );
};
