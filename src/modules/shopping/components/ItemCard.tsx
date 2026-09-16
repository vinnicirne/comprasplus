import React from 'react';
import type { ShoppingItem } from '../store/useListStore';
import { useListStore } from '../store/useListStore';
import { cn } from '../../../core/utils/cn';
import { formatCurrency } from '../../../core/utils/currency';

interface ItemCardProps {
  item: ShoppingItem;
  listId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, listId, onToggle, onEdit, onDelete }) => {
  const { updateItem } = useListStore();

  const getCalculatedPrice = (): number => {
    const price = item.price || 0;
    const qty = item.quantity || 1;
    if (item.unit === 'g' || item.unit === 'ml') return (qty / 1000) * price;
    return price * qty;
  };

  const changeQty = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const current = item.quantity || 1;
    const next = Math.max(1, current + delta);
    updateItem(listId, item.id, { quantity: next });
  };

  const calcPrice = getCalculatedPrice();
  const hasPrice = (item.price || 0) > 0;

  // Nome display do quem adicionou
  const addedByName = item.added_by_name
    || (item.addedBy && typeof item.addedBy === 'object' ? (item.addedBy as any).name : undefined);

  // Nome display de quem comprou
  const checkedByName = item.checked_by_name || (typeof item.checkedBy === 'string' ? item.checkedBy : undefined);

  return (
    <article
      className={cn(
        'mobile-product-card',
        item.checked && 'item-comprado',
        item.isBlinking && 'animate-blink-green'
      )}
    >
      {/* ===== COLUNA ESQUERDA: Check + Nome + Qtd + Badges ===== */}
      <div className="product-left-col">

        {/* Botão de Check — espelho fiel do legado */}
        <button
          type="button"
          className={cn(
            'btn-toggle-check w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90',
            item.checked
              ? 'text-white'
              : 'text-transparent'
          )}
          style={item.checked
            ? { backgroundColor: 'var(--primary)', border: '2px solid var(--primary)' }
            : { backgroundColor: 'var(--surface-container-high)', border: '2px solid rgba(188,202,192,0.6)' }
          }
          onClick={onToggle}
          title="Marcar como comprado"
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
        </button>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nome do produto */}
            <span
              className={cn(
                'product-name cursor-pointer truncate',
                item.checked && 'line-through'
              )}
              style={{ color: item.checked ? 'var(--text-muted)' : 'var(--text-main)' }}
              onClick={onEdit}
              title="Toque para editar"
            >
              {item.name}
            </span>

            {/* Controle de quantidade */}
            <div
              className="product-qty-control shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                className="product-qty-btn"
                onClick={e => changeQty(e, -1)}
              >
                −
              </button>
              <span className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>
                {item.quantity || 1} {item.unit || 'un'}
              </span>
              <button
                type="button"
                className="product-qty-btn"
                onClick={e => changeQty(e, 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Badges de autoria */}
          {(addedByName || checkedByName) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {addedByName === checkedByName && item.checked ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ color: '#065f46', backgroundColor: 'rgba(16,185,129,0.1)' }}
                >
                  + ✓ {addedByName}
                </span>
              ) : (
                <>
                  {addedByName && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: 'var(--on-surface-variant, #3d4a42)',
                        backgroundColor: 'rgba(188,202,192,0.25)',
                      }}
                    >
                      + {addedByName}
                    </span>
                  )}
                  {item.checked && checkedByName && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ color: '#065f46', backgroundColor: 'rgba(16,185,129,0.1)' }}
                    >
                      ✓ {checkedByName}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== COLUNA DIREITA: Preço + Editar + Excluir ===== */}
      <div className="product-right-col">

        {/* Chip de preço */}
        {!hasPrice ? (
          <button
            className="btn-item-price-chip sem-preco"
            onClick={onEdit}
            title="Adicionar preço"
          >
            🏷️ Preço
          </button>
        ) : (
          <button
            className="btn-item-price-chip com-preco"
            onClick={onEdit}
            title="Editar preço"
          >
            {formatCurrency(calcPrice)}
          </button>
        )}

        {/* Botão editar */}
        <button
          className="btn-item-edit"
          onClick={onEdit}
          title="Editar item"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>

        {/* Botão excluir */}
        <button
          className="btn-item-trash"
          onClick={onDelete}
          title="Excluir item"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </article>
  );
};
