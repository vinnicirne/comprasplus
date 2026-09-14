import { supabase } from './supabaseClient.js';
import { appStore } from '../store/appStore.js';

export const productService = {
  /**
   * Busca produtos no banco de dados para o autocomplete.
   * Limita a 5 resultados para uma interface limpa.
   */
  async searchProducts(query) {
    if (!query || query.trim().length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('name')
        .ilike('name', `%${query.trim()}%`)
        .order('name', { ascending: true })
        .limit(5);

      if (error) {
        console.warn('Erro ao buscar produtos:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Erro na busca de produtos:', err);
      return [];
    }
  },

  /**
   * Registra um novo produto no banco global de produtos silenciosamente.
   * Ignora erros de conflito (ex: produto já existe).
   */
  async registerProduct(name) {
    if (!name || name.trim().length < 2) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .upsert({
          name: name.trim(),
          created_by: appStore.state.currentUser?.id || null
        }, { onConflict: 'name', ignoreDuplicates: true });

      if (error && error.code !== '23505') { // Ignora log se for apenas erro de duplicação
        console.warn('Erro ao registrar novo produto:', error);
      }
    } catch (err) {
      console.warn('Erro na inserção do produto:', err);
    }
  }
};
