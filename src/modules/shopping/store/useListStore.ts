import { create } from 'zustand';
import { syncEngine } from '../../../core/sync/SyncEngine';
import { supabase } from '../../../core/lib/supabase';
import { useAuthStore } from '../../auth/store/useAuthStore';

export type ListCategory = 'mercado' | 'hortifruti' | 'farmacia' | 'festa' | 'outros';
export type ListStatus = 'aberta' | 'concluida';

export interface UserTag {
  id: string;
  name: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  price?: number;
  quantity?: number;
  unit?: string;
  category?: string;
  createdAt?: string;
  // Autoria — quem adicionou
  addedBy?: UserTag;
  added_by?: string | null;
  added_by_name?: string | null;
  // Autoria — quem comprou (espelho do legado)
  checkedBy?: string | null;        // nome display (legado: item.checkedBy = nome)
  checked_by?: string | null;       // id do usuário
  checked_by_name?: string | null;  // nome
  checked_at?: string | null;       // ISO timestamp
  // UI helpers
  lastUpdatedAt?: string;
  isBlinking?: boolean;
  // Lista Contínua e Rateada
  finalized_at?: string;
  assigned_to?: string;
  assigned_value?: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  store?: string;
  category: ListCategory;
  list_type?: 'normal' | 'continua' | 'rateada';
  split_strategy?: 'products' | 'value';
  budget?: number;
  items: ShoppingItem[];
  status: ListStatus;
  created_at: string;
  owner_id: string;
  owner_name?: string;
  isShared?: boolean;
}

interface ListStoreState {
  lists: ShoppingList[];
  filter: 'TODAS' | 'ATIVAS' | 'PENDENTES' | 'CONCLUIDAS';
  searchQuery: string;
  isLoading: boolean;
  
  setLists: (lists: ShoppingList[]) => void;
  setFilter: (filter: 'TODAS' | 'ATIVAS' | 'PENDENTES' | 'CONCLUIDAS') => void;
  setSearchQuery: (query: string) => void;
  addList: (list: ShoppingList) => void;
  updateList: (id: string, data: Partial<ShoppingList>) => void;
  deleteList: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  fetchLists: () => Promise<void>;

  // Item Operations
  addItem: (listId: string, item: ShoppingItem) => void;
  updateItem: (listId: string, itemId: string, data: Partial<ShoppingItem>) => void;
  deleteItem: (listId: string, itemId: string) => void;
  toggleItem: (listId: string, itemId: string) => void;

  // Realtime Operations
  subscribeToRealtime: (listId: string) => void;
  unsubscribeFromRealtime: () => void;

  // Lista Contínua e Rateada
  finalizePartialList: (listId: string, itemIds: string[]) => Promise<void>;
  finalizeSplitList: (listId: string) => Promise<void>;
}

export const useListStore = create<ListStoreState>((set, get) => ({
  lists: [],
  filter: 'TODAS',
  searchQuery: '',
  isLoading: false,

  setLists: (lists) => set({ lists }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  fetchLists: async () => {
    // Se o motor de sincronização estiver processando, não buscamos dados novos do servidor 
    // para evitar que o servidor mande um status velho antes do update chegar lá.
    if (syncEngine.isProcessing) {
      console.log('Skipping fetchLists because SyncEngine is processing a local update.');
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        let mergedLists = data as ShoppingList[];
        
        try {
          const q = localStorage.getItem('@compras_plus:sync_queue');
          if (q) {
            const queue = JSON.parse(q);
            for (const op of queue) {
              if (op.table === 'shopping_lists') {
                if (op.type === 'UPDATE') {
                  mergedLists = mergedLists.map(l => l.id === op.record_id ? { ...l, ...op.payload } : l);
                } else if (op.type === 'INSERT') {
                  if (!mergedLists.find(l => l.id === op.record_id)) {
                    mergedLists.push(op.payload);
                  }
                } else if (op.type === 'DELETE') {
                  mergedLists = mergedLists.filter(l => l.id !== op.record_id);
                }
              }
            }
          }
        } catch (e) {
          console.error('Erro ao aplicar queue local:', e);
        }

        set({ lists: mergedLists });
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addList: (list) => {
    set((state) => ({ lists: [...state.lists, list] }));
    syncEngine.addOperation({
      table: 'shopping_lists',
      type: 'INSERT',
      record_id: list.id,
      payload: list
    });
  },
  updateList: (id, data) => {
    set((state) => ({
      lists: state.lists.map(l => (l.id === id ? { ...l, ...data } : l))
    }));
    syncEngine.addOperation({
      table: 'shopping_lists',
      type: 'UPDATE',
      record_id: id,
      payload: data
    });
  },
  deleteList: (id) => {
    set((state) => ({
      lists: state.lists.filter(l => l.id !== id)
    }));
    syncEngine.addOperation({
      table: 'shopping_lists',
      type: 'DELETE',
      record_id: id,
      payload: null
    });
  },
  setLoading: (isLoading) => set({ isLoading }),

  // Item Operations (atualizam a lista inteira no banco)
  addItem: (listId, item) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;
    
    const user = useAuthStore.getState().user;
    const userTag: UserTag | undefined = user ? {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'
    } : undefined;

    const updatedItems = [...list.items, { ...item, addedBy: userTag }];
    state.updateList(listId, { items: updatedItems });

    // Disparar notificação Push se for lista compartilhada
    if (list.isShared && user) {
      supabase.functions.invoke('send-push', {
        body: {
          listId: list.id,
          senderId: user.id,
          senderName: userTag?.name || 'Alguém',
          itemName: item.name,
          type: 'NEW_ITEM'
        }
      }).catch(console.error);
    }
  },

  updateItem: (listId, itemId, data) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const updatedItems = list.items.map(i => i.id === itemId ? { ...i, ...data } : i);
    state.updateList(listId, { items: updatedItems });
  },

  deleteItem: (listId, itemId) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const updatedItems = list.items.filter(i => i.id !== itemId);
    state.updateList(listId, { items: updatedItems });
  },

  toggleItem: (listId, itemId) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const user = useAuthStore.getState().user;
    const currentUserName = user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || user?.email?.split('@')[0]
      || 'Usuário';

    const updatedItems = list.items.map(i => {
      if (i.id !== itemId) return i;

      const isNowChecked = !i.checked;

      if (isNowChecked) {
        // Registra quem marcou e quando (igual ao legado)
        return {
          ...i,
          checked: true,
          checked_by: user?.id ?? null,
          checked_by_name: currentUserName,
          checked_at: new Date().toISOString(),
          checkedBy: currentUserName,
        };
      } else {
        // Limpa ao desmarcar (igual ao legado)
        return {
          ...i,
          checked: false,
          checked_by: null,
          checked_by_name: null,
          checked_at: null,
          checkedBy: undefined,
        };
      }
    });

    state.updateList(listId, { items: updatedItems });
  },

  // Realtime Operations
  subscribeToRealtime: (listId) => {
    // Remove existing subscription if any
    get().unsubscribeFromRealtime();

    const channel = supabase
      .channel(`list-${listId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopping_lists',
        filter: `id=eq.${listId}`
      }, (payload) => {
        const updatedList = payload.new as ShoppingList;
        const state = get();
        const user = useAuthStore.getState().user;
        
        const oldList = state.lists.find(l => l.id === listId);
        
        // Let's figure out what changed and blink it
        let modifiedItems = updatedList.items || [];
        if (oldList && oldList.items) {
          modifiedItems = modifiedItems.map(newItem => {
            const oldItem = oldList.items.find(i => i.id === newItem.id);
            // If it's a new item or it was modified (e.g. checked status changed, or quantity changed), blink it.
            // Avoid blinking if the user themselves made the change, although this requires knowing who did it.
            // We use checked_by for checks, or we just blink everything that changed for simplicity to ensure visibility.
            const isChanged = !oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem);
            
            if (isChanged && newItem.checked_by !== user?.id) {
              return { ...newItem, isBlinking: true };
            }
            return newItem;
          });
        }
        
        set(prev => ({
          lists: prev.lists.map(l => l.id === listId ? { ...l, ...updatedList, items: modifiedItems } : l)
        }));

        // Remove blink after 2 seconds
        if (modifiedItems.some(i => i.isBlinking)) {
          setTimeout(() => {
            set(prev => ({
              lists: prev.lists.map(l => {
                if (l.id !== listId) return l;
                return {
                  ...l,
                  items: l.items.map(i => i.isBlinking ? { ...i, isBlinking: false } : i)
                };
              })
            }));
          }, 2000);
        }

      })
      .subscribe();

    // Store channel reference if needed, though for now we can just let it live in memory or global
    // For this implementation, we will store it globally in a variable outside Zustand state
    (window as any)._currentListChannel = channel;
  },
  unsubscribeFromRealtime: () => {
    if (typeof window !== 'undefined' && (window as any)._currentListChannel) {
      supabase.removeChannel((window as any)._currentListChannel);
      (window as any)._currentListChannel = null;
    }
  },

  finalizePartialList: async (listId, itemIds) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const user = useAuthStore.getState().user;
    if (!user) return;

    // Separate items to finalize
    const now = new Date().toISOString();
    const updatedItems = list.items.map(item => {
      if (itemIds.includes(item.id)) {
        return { ...item, finalized_at: now };
      }
      return item;
    });

    state.updateList(listId, { items: updatedItems });

    // Calculate total for wallet
    const totalAmount = list.items
      .filter(i => itemIds.includes(i.id))
      .reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

    if (totalAmount > 0) {
      const transactionId = crypto.randomUUID();
      syncEngine.addOperation({
        table: 'finance_transactions',
        type: 'INSERT',
        record_id: transactionId,
        payload: {
          id: transactionId,
          owner_id: user.id,
          description: `Compras em ${list.name} (Parcial)`,
          amount: totalAmount,
          type: 'EXPENSE',
          status: 'PAID',
          category: list.name, // Nome da lista como categoria
          due_date: new Date().toISOString().split('T')[0]
        }
      });
    }
  },

  finalizeSplitList: async (listId) => {
    const state = get();
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const user = useAuthStore.getState().user;
    if (!user) return;

    // For a split list, we need to gather everyone's share
    // This will group by user ID (either assigned_to or fallback to owner)
    const userShares: Record<string, number> = {};

    list.items.forEach(item => {
      const uId = item.assigned_to || user.id; // assigned_to or owner
      const amount = list.split_strategy === 'value' 
        ? (item.assigned_value || 0)
        : ((item.price || 0) * (item.quantity || 1));
      
      if (amount > 0) {
        userShares[uId] = (userShares[uId] || 0) + amount;
      }
    });

    // Build the transactions JSON
    const transactions = Object.entries(userShares).map(([uId, amount]) => ({
      id: crypto.randomUUID(),
      owner_id: uId,
      description: `Rateio: ${list.name}`,
      amount: amount,
      type: 'EXPENSE',
      status: 'PAID',
      category: list.name,
      due_date: new Date().toISOString().split('T')[0]
    }));

    if (transactions.length > 0) {
      // Call RPC
      const { error } = await supabase.rpc('insert_split_transactions', {
        p_list_id: listId,
        p_transactions: transactions
      });

      if (error) {
        console.error('Failed to insert split transactions:', error);
        return;
      }
    }

    // Mark list as concluida
    state.updateList(listId, { status: 'concluida' });
  }
}));
