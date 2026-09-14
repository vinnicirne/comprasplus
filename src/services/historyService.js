import { supabase } from './supabaseClient.js';
import { getStore } from './indexedDb.js';
import { appStore } from '../store/appStore.js';

/**
 * Salva uma compra no Histórico Oficial (IndexedDB + Supabase)
 */
export async function savePurchaseHistory(record) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Você precisa estar autenticado para registrar compras no histórico.');

  const now = record.purchasedAt ? new Date(record.purchasedAt) : new Date();
  const id = record.id || ('compra_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
  const historyItem = {
    id,
    userId: user.id,
    listId: record.listId || null,
    listName: record.listName || 'Compras Diversas',
    category: record.category || 'Mercado',
    supermarket: record.supermarket || '',
    budget: Number(record.budget) || 0,
    totalSpent: Number(record.totalSpent) || 0,
    savings: Number(record.savings !== undefined ? record.savings : (Number(record.budget) - Number(record.totalSpent))) || 0,
    items: Array.isArray(record.items) ? record.items : [],
    day: now.getDate(),
    month: now.getMonth() + 1, // 1 - 12
    year: now.getFullYear(),
    purchasedAt: now.toISOString()
  };

  // 1. Salva no IndexedDB local
  try {
    const store = await getStore('historico', 'readwrite');
    await new Promise((resolve, reject) => {
      const req = store.put(historyItem);
      req.onsuccess = () => resolve(historyItem);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Erro ao salvar histórico localmente:', e);
  }

  // 2. Salva na nuvem (Supabase)
  try {
    const payload = {
      id: historyItem.id,
      user_id: user.id,
      list_id: historyItem.listId,
      list_name: historyItem.listName,
      category: historyItem.category,
      budget: historyItem.budget,
      total_spent: historyItem.totalSpent,
      savings: historyItem.savings,
      items: historyItem.items,
      day: historyItem.day,
      month: historyItem.month,
      year: historyItem.year,
      purchased_at: historyItem.purchasedAt
    };

    const { error } = await supabase
      .from('historico_compras')
      .upsert(payload);

    if (error) {
      console.warn('Aviso de sync com historico_compras no Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Erro ao sincronizar compra no Supabase:', err);
  }

  return historyItem;
}

/**
 * Consulta todas as compras do histórico
 */
export async function getPurchaseHistory() {
  const user = appStore.state.currentUser;
  if (!user) return [];

  // 1. Tenta buscar da nuvem
  try {
    const { data, error } = await supabase
      .from('historico_compras')
      .select('*')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map(row => ({
        id: row.id,
        userId: row.user_id,
        listId: row.list_id,
        listName: row.list_name,
        category: row.category,
        supermarket: row.supermarket || '',
        budget: Number(row.budget) || 0,
        totalSpent: Number(row.total_spent) || 0,
        savings: Number(row.savings) || 0,
        items: Array.isArray(row.items) ? row.items : [],
        day: Number(row.day) || new Date(row.purchased_at).getDate(),
        month: Number(row.month) || (new Date(row.purchased_at).getMonth() + 1),
        year: Number(row.year) || new Date(row.purchased_at).getFullYear(),
        purchasedAt: row.purchased_at
      }));

      // Atualiza o IndexedDB
      try {
        const store = await getStore('historico', 'readwrite');
        for (const item of mapped) {
          store.put(item);
        }
      } catch (_) {}

      return mapped;
    }
  } catch (e) {
    console.warn('Supabase offline para histórico, buscando IndexedDB:', e);
  }

  // 2. Fallback offline: lê do IndexedDB
  try {
    const store = await getStore('historico');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []).filter(r => r.userId === user.id);
        rows.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
        resolve(rows);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    console.error('Erro ao ler histórico local:', e);
    return [];
  }
}

/**
 * Exclui uma compra do histórico
 */
export async function deletePurchaseHistory(id) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  // IndexedDB
  try {
    const store = await getStore('historico', 'readwrite');
    await new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (_) {}

  // Supabase
  try {
    await supabase
      .from('historico_compras')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  } catch (_) {}

  return true;
}

/**
 * Calcula balanço de gastos detalhado por Ano, Mês e Dia
 */
export function calculateSpendingBalance(historyList, { year, month, day } = {}) {
  const list = historyList || [];
  const currentYear = (year && year !== 'all') ? Number(year) : (list.length > 0 ? list[0].year : new Date().getFullYear());
  
  // Filtra pelo Ano
  let filtered = list;
  if (year && year !== 'all') {
    filtered = filtered.filter(item => item.year === currentYear);
  }

  // Filtra pelo Mês (se informado)
  if (month && month !== 'all') {
    filtered = filtered.filter(item => item.month === Number(month));
  }

  // Filtra pelo Dia (se informado)
  if (day && day !== 'all') {
    filtered = filtered.filter(item => item.day === Number(day));
  }

  const totalSpent = filtered.reduce((sum, i) => sum + (Number(i.totalSpent) || 0), 0);
  const totalBudget = filtered.reduce((sum, i) => sum + (Number(i.budget) || 0), 0);
  const totalSavings = totalBudget - totalSpent;
  const count = filtered.length;
  const averagePerPurchase = count > 0 ? (totalSpent / count) : 0;

  // Balanço por Mês (Janeiro a Dezembro do Ano Selecionado)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const byMonth = monthNames.map((name, idx) => {
    const mNum = idx + 1;
    const monthItems = list.filter(i => i.year === currentYear && i.month === mNum);
    const spent = monthItems.reduce((s, i) => s + (Number(i.totalSpent) || 0), 0);
    const budget = monthItems.reduce((s, i) => s + (Number(i.budget) || 0), 0);
    return {
      month: mNum,
      name,
      spent,
      budget,
      savings: budget - spent,
      count: monthItems.length
    };
  });

  return {
    year: currentYear,
    month: month || 'all',
    day: day || 'all',
    totalSpent,
    totalBudget,
    totalSavings,
    count,
    averagePerPurchase,
    byMonth,
    filteredPurchases: filtered
  };
}
