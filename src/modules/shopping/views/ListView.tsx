import React, { useState, useEffect } from 'react';
import { useListStore } from '../store/useListStore';
import type { ShoppingItem } from '../store/useListStore';
import { useNavigationStore } from '../../../core/store/useNavigationStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { ItemCard } from '../components/ItemCard';
import { NovoItemModal } from '../components/modals/NovoItemModal';
import { ShareListModal } from '../components/modals/ShareListModal';
import { ConfirmDialog } from '../../../core/components/ui/ConfirmDialog';
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus, ShoppingCart, Milk, Beef, Leaf, Pill, Wine, Coffee, Package } from 'lucide-react';
import { Button } from '../../../core/components/ui/Button';
import { formatCurrency } from '../../../core/utils/currency';

// Category icons map
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'laticínios': <Milk size={14} />,
  'laticinio': <Milk size={14} />,
  'hortifruti': <Leaf size={14} />,
  'carnes': <Beef size={14} />,
  'farmácia': <Pill size={14} />,
  'bebidas': <Wine size={14} />,
  'mercearia': <Coffee size={14} />,
  'padaria': <Package size={14} />,
};

function getCategoryIcon(cat: string) {
  const key = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CATEGORY_ICONS[key] ?? <ShoppingCart size={14} />;
}

export const ListView: React.FC = () => {
  const { lists, toggleItem, deleteItem, updateList } = useListStore();
  const { activeListId, navigate } = useNavigationStore();
  const { user } = useAuthStore();
  const [isNovoItemOpen, setIsNovoItemOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (activeListId) {
      useListStore.getState().subscribeToRealtime(activeListId);
    }
    return () => {
      useListStore.getState().unsubscribeFromRealtime();
    };
  }, [activeListId]);

  const list = lists.find(l => l.id === activeListId);

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p style={{ color: 'var(--text-muted)' }} className="mb-4">Lista não encontrada.</p>
        <Button onClick={() => navigate('DASHBOARD')}>Voltar</Button>
      </div>
    );
  }

  const items = list.items || [];

  const handleEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setIsNovoItemOpen(true);
  };

  const handleDelete = (itemId: string) => setItemToDelete(itemId);

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(list.id, itemToDelete);
      setItemToDelete(null);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsNovoItemOpen(open);
    if (!open) setTimeout(() => setEditingItem(null), 300);
  };

  // Group items by category (legado: groupedItems[cat])
  const grouped: Record<string, ShoppingItem[]> = {};
  const uncategorized: ShoppingItem[] = [];
  items.forEach(item => {
    const cat = (item.category || '').trim();
    if (!cat) {
      uncategorized.push(item);
    } else {
      const key = cat.toUpperCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
  });
  if (uncategorized.length > 0) grouped['GERAL'] = uncategorized;

  // Sort legado: não-comprados primeiro; empate → mais novo primeiro (createdAt desc)
  Object.keys(grouped).forEach(cat => {
    grouped[cat].sort((a, b) => {
      const aChecked = Boolean(a.checked);
      const bChecked = Boolean(b.checked);
      if (aChecked === bChecked) {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // mais novo primeiro
      }
      return aChecked ? 1 : -1; // não-comprado = topo
    });
  });

  const groupEntries = Object.entries(grouped);

  // Totals
  const getCalcPrice = (item: ShoppingItem) => {
    const price = item.price || 0;
    const qty = item.quantity || 1;
    if (item.unit === 'g' || item.unit === 'ml') return (qty / 1000) * price;
    return price * qty;
  };
  const totalGasto = items.filter(i => i.checked).reduce((acc, i) => acc + getCalcPrice(i), 0);
  const budget = list.budget || 0;

  return (
    <main className="flex flex-col w-full min-h-screen pb-28" style={{ backgroundColor: 'var(--bg-app)' }}>
      
      {/* === HEADER === */}
      <header
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('DASHBOARD')}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95"
            style={{ color: 'var(--on-surface)' }}
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="flex-1 text-[17px] font-bold truncate" style={{ color: 'var(--on-surface)' }}>
            {list.name}
          </h1>

          <button
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95"
            style={{ color: 'var(--outline)' }}
          >
            <Pencil size={18} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95"
            style={{ color: 'var(--outline)' }}
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white font-bold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)', boxShadow: 'var(--shadow-md)' }}
            title="Compartilhar"
          >
            <UserPlus size={16} />
          </button>
        </div>
      </header>

      {/* === SECTION: Itens da Lista === */}
      <div className="px-4 pt-5 flex-1">
        {items.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--on-surface)' }}>Itens da Lista</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const allChecked = items.every(i => i.checked);
                  const currentUserName = user?.user_metadata?.name || user?.email?.split('@')[0];
                  const updatedItems = items.map(i => ({
                    ...i,
                    checked: !allChecked,
                    checked_by: !allChecked ? user?.id || null : null,
                    checked_at: !allChecked ? new Date().toISOString() : null,
                    checked_by_name: !allChecked ? currentUserName || null : null,
                    checkedBy: !allChecked ? currentUserName : undefined,
                  }));
                  updateList(list.id, { items: updatedItems });
                }}
                className="text-[11px] font-bold px-2 py-1 rounded-md transition-colors"
                style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-fixed)', opacity: 0.9 }}
              >
                {items.every(i => i.checked) ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
              <span
                className="text-[12px] font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--surface-container)', color: 'var(--outline)' }}
              >
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>
        )}

        {/* === Budget strip === */}
        <div
          className="flex items-center justify-between p-5 rounded-3xl mb-4 mx-4"
          style={{ backgroundColor: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase mb-0.5">
              Total Gasto
            </span>
            <span className="text-[15px] font-bold text-white">
              {formatCurrency(totalGasto)}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase mb-0.5">
              Orçamento
            </span>
            <span className="text-[15px] font-bold text-white">
              {budget > 0 ? formatCurrency(budget) : 'Livre'}
            </span>
          </div>
        </div>

        {/* === EMPTY STATE === */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--surface-container)' }}
            >
              <ShoppingCart size={28} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--on-surface)' }}>Lista vazia</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Toque em + para adicionar o primeiro produto.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groupEntries.map(([category, catItems]) => (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span style={{ color: 'var(--primary)' }}>
                    {getCategoryIcon(category)}
                  </span>
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {category}
                  </span>
                </div>

                {/* Items in category */}
                <div className="flex flex-col gap-2">
                  {catItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      listId={list.id}
                      onToggle={() => toggleItem(list.id, item.id)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === FINALIZAR / REABRIR === */}
        {items.length > 0 && (
          <div className="mt-8 mb-4 flex flex-col gap-3">
            {list.status === 'concluida' ? (
              <>
                {/* Badge de lista concluída */}
                <div
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
                >
                  <span>✅</span> Lista Concluída e Lançada na Carteira
                </div>
                {/* Botão de Reabrir */}
                <button
                  onClick={() => updateList(list.id, { status: 'aberta' })}
                  className="w-full h-12 rounded-2xl font-bold text-sm border-2 transition-all active:scale-95"
                  style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
                >
                  🔄 Reabrir Lista
                </button>
                <p className="text-center text-[10px] text-on-surface-variant">
                  Ao reabrir, você pode continuar editando os itens.
                </p>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    updateList(list.id, { status: 'concluida' });
                    navigate('DASHBOARD');
                  }}
                  className="w-full h-14 font-black text-base shadow-lg hover:shadow-xl"
                >
                  Finalizar Lista e Lançar
                </Button>
                <p className="text-center text-[10px] text-on-surface-variant">
                  Os gastos dessa lista serão contabilizados automaticamente na sua Carteira.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* === FAB === */}
      <button
        onClick={() => setIsNovoItemOpen(true)}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center z-40 text-white transition-all active:scale-90 hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
          boxShadow: 'var(--shadow-primary)',
        }}
        aria-label="Adicionar item"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* === MODALS === */}
      <NovoItemModal
        open={isNovoItemOpen}
        onOpenChange={handleModalOpenChange}
        listId={list.id}
        itemToEdit={editingItem}
      />

      <ShareListModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        listId={list.id}
        listName={list.name}
        shareCode={(list as any).share_code}
      />

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Remover Item"
        description="Tem certeza que deseja remover este item da lista?"
        onConfirm={confirmDelete}
        confirmText="Remover"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </main>
  );
};
