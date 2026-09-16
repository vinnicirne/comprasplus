import React from 'react';
import type { ShoppingList } from '../store/useListStore';
import { formatDate } from '../../../core/utils/date';
import { formatCurrency } from '../../../core/utils/currency';
import { cn } from '../../../core/utils/cn';

interface ListCardProps {
  list: ShoppingList;
  onEdit: (list: ShoppingList) => void;
  onDelete: (list: ShoppingList) => void;
  onOpen: (list: ShoppingList) => void;
  currentUserId?: string;
}

export const ListCard: React.FC<ListCardProps> = ({ list, onEdit, onDelete, onOpen, currentUserId }) => {
  const isConcluida = list.status === 'concluida';
  const isSharedWithMe = Boolean(list.isShared || (list.owner_id && currentUserId && list.owner_id !== currentUserId));
  
  const qtdItens = (list.items || []).length;
  const itensMarcados = (list.items || []).filter(i => i.checked).length;
  const itemProgress = qtdItens > 0 ? (itensMarcados / qtdItens) * 100 : 0;
  
  const orcamento = list.budget || 0;
  const totalGasto = (list.items || []).reduce((acc, item) => acc + (item.checked ? (item.price || 0) * (item.quantity || 1) : 0), 0);
  const saldoDisponivel = orcamento > 0 ? orcamento - totalGasto : 0;
  const percentualConsumido = orcamento > 0 ? (totalGasto / orcamento) * 100 : 0;

  let saldoColor = 'text-primary';
  let progClass = 'bg-primary';

  if (orcamento > 0 && saldoDisponivel < 0) {
    saldoColor = 'text-error';
    progClass = 'bg-error';
  } else if (percentualConsumido >= 75) {
    saldoColor = 'text-tertiary';
    progClass = 'bg-tertiary';
  }

  const getIconName = () => {
    switch (list.category) {
      case 'hortifruti': return 'nutrition';
      case 'farmacia': return 'medical_services';
      case 'festa': return 'celebration';
      case 'outros': return 'category';
      default: return 'shopping_cart';
    }
  };

  const listDateFormatted = formatDate(new Date(list.created_at));

  return (
    <article className={cn(
      "group relative rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 border border-outline-variant/30 flex flex-col gap-3",
      isConcluida ? "bg-surface-container-low/70 opacity-90" : "bg-surface-container-lowest"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">{getIconName()}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className={cn("font-label-lg text-label-lg text-on-surface truncate font-bold leading-snug", isConcluida && "line-through decoration-outline-variant")}>
              {list.name}
            </h2>
            <div className="flex items-center gap-2 text-on-surface-variant text-[11px] leading-tight mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary">calendar_month</span>
                <span>{listDateFormatted}</span>
              </span>
              {list.store && (
                <>
                  <span className="text-outline opacity-40">•</span>
                  <span className="flex items-center gap-1 text-primary font-bold">
                    <span className="material-symbols-outlined text-[13px]">storefront</span>
                    <span>{list.store}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {isConcluida ? (
          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px] text-primary">check</span> Concluída
          </span>
        ) : isSharedWithMe ? (
          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">person</span> Autor: {list.owner_name || 'Colaborador'}
          </span>
        ) : (
          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Ativa
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-on-surface-variant font-normal">Itens comprados</span>
          <span className="font-bold text-on-surface">
            {itensMarcados} de {qtdItens} <span className={cn(saldoColor, "font-semibold")}>({Math.round(itemProgress)}%)</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-300", progClass)} style={{ width: `${itemProgress}%` }}></div>
        </div>
      </div>

      <div className="pt-2.5 flex items-center justify-between border-t border-surface-container/60">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase font-semibold leading-none">Total Gasto</span>
            <span className={cn("text-sm font-extrabold leading-tight mt-0.5", saldoColor)}>{formatCurrency(totalGasto)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button onClick={() => onEdit(list)} className="w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-95 flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-[17px]">edit</span>
          </button>
          <button onClick={() => onDelete(list)} className="w-8 h-8 rounded-lg bg-error-container/25 text-error hover:bg-error-container hover:text-on-error-container active:scale-95 flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-[17px]">delete</span>
          </button>
          <button onClick={() => onOpen(list)} className="h-8 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] font-semibold flex items-center gap-1 hover:bg-primary-container active:scale-95 transition-all shadow-sm">
            {isConcluida ? 'Ver' : 'Abrir'}
            <span className="material-symbols-outlined text-[16px]">{isConcluida ? 'visibility' : 'chevron_right'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
