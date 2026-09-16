import { create } from 'zustand';
import { supabase } from '../../../core/lib/supabase';
import { useAuthStore } from '../../auth/store/useAuthStore';

interface CategoryState {
  categories: string[];
  isLoading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  editCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  'Mercado', 'Mercearia', 'Hortifrúti', 'Padaria', 'Açougue',
  'Bebidas', 'Limpeza', 'Higiene', 'Farmácia', 'Festa',
  'Pet Shop', 'Outros'
];

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [...DEFAULT_CATEGORIES],
  isLoading: false,

  fetchCategories: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('name')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Merge with defaults or override
        const dbCategories = data.map(d => d.name);
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));
        set({ categories: merged });
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const { categories } = get();
    if (categories.includes(trimmed)) return;
    
    // Update local immediately for responsive UI
    set({ categories: [...categories, trimmed] });

    // Background sync
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        await supabase.from('user_categories').insert({ user_id: user.id, name: trimmed });
      } catch (err) {
        console.error('Erro ao salvar categoria:', err);
      }
    }
  },

  editCategory: async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    
    const { categories } = get();
    if (categories.includes(trimmed)) return;

    set({ categories: categories.map(c => c === oldName ? trimmed : c) });

    const user = useAuthStore.getState().user;
    if (user) {
      try {
        await supabase
          .from('user_categories')
          .update({ name: trimmed })
          .eq('user_id', user.id)
          .eq('name', oldName);
      } catch (err) {
        console.error('Erro ao editar categoria:', err);
      }
    }
  },

  deleteCategory: async (name: string) => {
    const { categories } = get();
    set({ categories: categories.filter(c => c !== name) });

    const user = useAuthStore.getState().user;
    if (user) {
      try {
        await supabase
          .from('user_categories')
          .delete()
          .eq('user_id', user.id)
          .eq('name', name);
      } catch (err) {
        console.error('Erro ao deletar categoria:', err);
      }
    }
  }
}));
