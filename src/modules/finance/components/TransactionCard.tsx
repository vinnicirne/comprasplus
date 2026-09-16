import React from 'react';
import { formatCurrency } from '../../../core/utils/currency';
import type { FinanceTransaction } from '../store/useFinanceStore';
import { 
  Briefcase, Zap, Home, ShoppingCart, Car, Pill, Film, Book, 
  TrendingUp, CreditCard, DollarSign, Check, Clock, Repeat
} from 'lucide-react';
import { clsx } from 'clsx';

interface TransactionCardProps {
  transaction: FinanceTransaction;
  onPay: (id: string) => void;
  onEdit?: (transaction: FinanceTransaction) => void;
}

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('salário') || cat.includes('salario')) return <Briefcase size={20} />;
  if (cat.includes('extra') || cat.includes('freela')) return <Zap size={20} />;
  if (cat.includes('moradia') || cat.includes('casa')) return <Home size={20} />;
  if (cat.includes('alimentação') || cat.includes('mercado')) return <ShoppingCart size={20} />;
  if (cat.includes('transporte') || cat.includes('carro')) return <Car size={20} />;
  if (cat.includes('saúde') || cat.includes('saude') || cat.includes('farmácia')) return <Pill size={20} />;
  if (cat.includes('lazer')) return <Film size={20} />;
  if (cat.includes('educação') || cat.includes('escola')) return <Book size={20} />;
  if (cat.includes('investimento')) return <TrendingUp size={20} />;
  if (cat.includes('cartão') || cat.includes('cartao')) return <CreditCard size={20} />;
  return <DollarSign size={20} />;
};

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPay, onEdit }) => {
  const isIncome = transaction.type === 'INCOME';
  const isPaid = transaction.status === 'PAID';

  // Cores do Ícone da Esquerda
  let iconBgColor = 'bg-surface-container-high text-on-surface-variant'; // Padrão: Pago/Cinza
  if (!isPaid) {
    iconBgColor = isIncome ? 'bg-primary text-on-primary' : 'bg-error text-error-on-container';
  }

  // Cor do Valor da Direita
  const valueColor = isIncome ? 'text-primary' : 'text-error';

  return (
    <div 
      onClick={() => onEdit?.(transaction)}
      className={clsx(
        "flex items-center justify-between bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant/30 mb-3 active:scale-[0.98] transition-transform cursor-pointer",
        isPaid && "opacity-70"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ícone */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {getCategoryIcon(transaction.category)}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx("font-bold text-base text-on-surface", isPaid && "line-through text-on-surface-variant")}>
              {transaction.description}
            </span>
            {transaction.is_recurrent && (
              <span className="bg-secondary-container text-on-secondary-container text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Repeat size={10} /> FIXO
              </span>
            )}
            {transaction.is_installment && transaction.installment_info && (
              <span className="bg-surface-container-highest text-on-surface text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <CreditCard size={10} /> {transaction.installment_info}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Clock size={12} />
            <span>Vence: {new Date(transaction.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Valores e Ações */}
      <div className="flex flex-col items-end gap-2">
        <span className={clsx("font-black text-sm", valueColor)}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </span>
        
        <div className="flex items-center gap-1">
          {/* Botão de Editar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(transaction);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-all"
            title="Editar / Excluir"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>

          {/* Botão de Dar Baixa */}
          {!isPaid ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPay(transaction.id);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all hover:scale-110 active:scale-95 bg-primary"
            >
              <Check size={16} />
            </button>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center text-primary">
              <Check size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
