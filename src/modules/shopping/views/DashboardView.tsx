import React from 'react';
import { HeroCard } from '../components/HeroCard';
import { FilterNav } from '../components/FilterNav';
import { ListCard } from '../components/ListCard';
import { EmptyState } from '../components/EmptyState';
import { NovaListaModal } from '../components/modals/NovaListaModal';
import { ConnectCodeModal } from '../components/modals/ConnectCodeModal';
import { ConfirmDialog } from '../../../core/components/ui/ConfirmDialog';
import { useListStore } from '../store/useListStore';
import type { ShoppingList } from '../store/useListStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useNavigationStore } from '../../../core/store/useNavigationStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { Search, RefreshCw, Link as LinkIcon, Plus } from 'lucide-react';
import { Button } from '../../../core/components/ui/Button';

export const DashboardView: React.FC = () => {
  const { lists, filter, searchQuery, setSearchQuery, deleteList } = useListStore();
  const navigate = useNavigationStore(state => state.navigate);
  
  const [isNovaListaOpen, setIsNovaListaOpen] = React.useState(false);
  const [isConnectCodeOpen, setIsConnectCodeOpen] = React.useState(false);
  const [editingList, setEditingList] = React.useState<ShoppingList | null>(null);
  const [listToDelete, setListToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    useListStore.getState().fetchLists();
    useCategoryStore.getState().fetchCategories();
  }, []);

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setIsNovaListaOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsNovaListaOpen(open);
    if (!open) {
      setTimeout(() => setEditingList(null), 300);
    }
  };

  const confirmDelete = () => {
    if (listToDelete) {
      deleteList(listToDelete);
      setListToDelete(null);
    }
  };

  let filteredLists = lists;
  if (filter === 'ATIVAS') filteredLists = lists.filter(l => l.status !== 'concluida');
  if (filter === 'CONCLUIDAS') filteredLists = lists.filter(l => l.status === 'concluida');
  if (filter === 'PENDENTES') filteredLists = lists.filter(l => l.status !== 'concluida' && (l.items || []).some(i => !i.checked));

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredLists = filteredLists.filter(l => l.name.toLowerCase().includes(q) || (l.store || '').toLowerCase().includes(q));
  }

  // Sort: pending first, then by date descending
  filteredLists = [...filteredLists].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'concluida' ? 1 : -1;
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return (
    <main className="flex flex-col relative w-full bg-surface min-h-screen pb-20">
      <div className="flex flex-col w-full px-margin gap-4 pb-6 pt-2">
        <section className="flex flex-col gap-1 pt-1">
          <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1">
            Olá, <span>{useAuthStore.getState().user?.user_metadata?.name || useAuthStore.getState().user?.email?.split('@')[0] || 'Visitante'}</span> <span className="inline-block text-base">👋</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-tight">
            Minhas Listas
          </h1>
          <p className="text-xs text-on-surface-variant font-normal">
            Acompanhe seus gastos no mercado e colabore em tempo real.
          </p>

          <div className="flex items-center gap-2.5 mt-2">
            <Button variant="secondary" className="flex-1 sm:flex-none bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim border-none shadow-sm h-10 px-4 rounded-2xl" icon={LinkIcon} onClick={() => setIsConnectCodeOpen(true)}>
              Conectar Código
            </Button>
            <Button className="flex-1 sm:flex-none h-10 px-4 rounded-2xl" icon={Plus} onClick={() => setIsNovaListaOpen(true)}>
              Nova Lista
            </Button>
          </div>
        </section>

        <HeroCard />

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-surface-container-low rounded-2xl px-4 py-2.5 border border-outline-variant/30 shadow-xs focus-within:border-primary focus-within:bg-surface-container-lowest transition-all">
              <Search className="text-outline mr-2 shrink-0" size={20} />
              <input 
                type="text" 
                placeholder="Buscar lista por nome ou supermercado..." 
                className="w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-outline outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary active:scale-95 transition-all shadow-xs" title="Atualizar listas">
              <RefreshCw size={20} />
            </button>
          </div>

          <FilterNav />
        </section>

        <section className="flex flex-col gap-3 mt-2 pb-safe">
          {filteredLists.length === 0 ? (
            <EmptyState onNewList={() => setIsNovaListaOpen(true)} />
          ) : (
            <>
              {/* Listas Ativas/Pendentes */}
              {filteredLists.filter(l => l.status !== 'concluida').length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Listas Ativas</h2>
                  {filteredLists.filter(l => l.status !== 'concluida').map(list => (
                    <ListCard 
                      key={list.id} 
                      list={list} 
                      onEdit={() => handleEditList(list)} 
                      onDelete={() => setListToDelete(list.id)} 
                      onOpen={() => navigate('LIST', list.id)} 
                    />
                  ))}
                </div>
              )}

              {/* Listas Concluídas */}
              {filteredLists.filter(l => l.status === 'concluida').length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-outline-variant mt-2 flex items-center gap-2">
                    <span className="flex-1 h-px bg-outline-variant/30"></span>
                    Listas Concluídas
                    <span className="flex-1 h-px bg-outline-variant/30"></span>
                  </h2>
                  <div className="opacity-80">
                    {filteredLists.filter(l => l.status === 'concluida').map(list => (
                      <ListCard 
                        key={list.id} 
                        list={list} 
                        onEdit={() => handleEditList(list)} 
                        onDelete={() => setListToDelete(list.id)} 
                        onOpen={() => navigate('LIST', list.id)} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>



      <NovaListaModal 
        open={isNovaListaOpen} 
        onOpenChange={handleModalOpenChange} 
        listToEdit={editingList}
      />

      <ConnectCodeModal
        open={isConnectCodeOpen}
        onOpenChange={setIsConnectCodeOpen}
      />

      <ConfirmDialog 
        open={!!listToDelete}
        onOpenChange={(open) => !open && setListToDelete(null)}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista inteira? Todos os itens dentro dela também serão apagados. Esta ação não pode ser desfeita."
        onConfirm={confirmDelete}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </main>
  );
};
