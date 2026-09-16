import { create } from 'zustand';
import { supabase } from '../../../core/lib/supabase';

export interface GlobalProduct {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  frequency: number;
}

interface ProductState {
  searchResults: GlobalProduct[];
  isSearching: boolean;
  searchProducts: (query: string) => Promise<void>;
  registerProduct: (name: string, category: string, unit: string) => Promise<void>;
  clearSearch: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  searchResults: [],
  isSearching: false,

  searchProducts: async (query: string) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }

    set({ isSearching: true });
    
    try {
      const { data, error } = await supabase
        .from('global_products')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('frequency', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      set({ searchResults: data || [] });
    } catch (err) {
      console.error('Erro ao buscar produtos globais:', err);
    } finally {
      set({ isSearching: false });
    }
  },

  registerProduct: async (name: string, category: string, unit: string) => {
    const normName = name.trim();
    if (!normName) return;

    try {
      // Tenta inserir, se já existir pelo nome (UNIQUE), ignora o conflito.
      // Em uma estrutura real, você usaria uma RPC (função) no Supabase para dar upsert +1 na frequency.
      // Como não temos a RPC, faremos um fallback mais simples de leitura -> atualização.
      
      const { data: existing } = await supabase
        .from('global_products')
        .select('id, frequency')
        .eq('name', normName)
        .maybeSingle();

      if (existing) {
        // Atualiza a frequência
        await supabase
          .from('global_products')
          .update({ frequency: existing.frequency + 1 })
          .eq('id', existing.id);
      } else {
        // Insere novo
        await supabase
          .from('global_products')
          .insert({
            name: normName,
            category: category,
            default_unit: unit,
            frequency: 1
          });
      }
    } catch (err) {
      console.error('Erro ao registrar produto global:', err);
    }
  },

  clearSearch: () => {
    set({ searchResults: [], isSearching: false });
  }
}));
