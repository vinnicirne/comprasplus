import { supabase } from './supabaseClient.js';
import { getStore } from './indexedDb.js';
import { appStore } from '../store/appStore.js';

/**
 * Busca entradas financeiras da carteira (Supabase + cache IndexedDB)
 */
export async function getWalletEntries() {
  const user = appStore.state.currentUser;
  if (!user) return [];

  // 1. Tenta buscar do Supabase
  try {
    const { data, error } = await supabase
      .from('carteira_entradas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Salva no IndexedDB como cache local
      try {
        const store = await getStore('carteira', 'readwrite');
        for (const row of data) {
          const entryDateStr = row.entry_date || null;
          const parts = entryDateStr ? entryDateStr.split('-') : [];
          const y = Number(row.year) || Number(parts[0]) || new Date().getFullYear();
          const m = Number(row.month) || Number(parts[1]) || (new Date().getMonth() + 1);
          const d = Number(row.day) || Number(parts[2]) || 1;
          const entryDate = entryDateStr || `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

          await new Promise((resolve) => {
            const req = store.put({
              id: row.id,
              userId: row.user_id,
              description: row.description,
              amount: Number(row.amount) || 0,
              category: row.category,
              status: row.status,
              entryDate,
              day: d,
              month: m,
              year: y,
              yearMonth: row.year_month || `${y}-${String(m).padStart(2, '0')}`,
              createdAt: row.created_at
            });
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
          });
        }
      } catch (cacheErr) {
        console.warn('Erro ao atualizar cache local da carteira:', cacheErr);
      }

      return data.map(row => {
        const entryDateStr = row.entry_date || null;
        const parts = entryDateStr ? entryDateStr.split('-') : [];
        const y = Number(row.year) || Number(parts[0]) || new Date().getFullYear();
        const m = Number(row.month) || Number(parts[1]) || (new Date().getMonth() + 1);
        const d = Number(row.day) || Number(parts[2]) || 1;
        return {
          id: row.id,
          userId: row.user_id,
          description: row.description || 'Renda',
          amount: Number(row.amount) || 0,
          category: row.category || 'Salário',
          status: row.status || 'recebido',
          entryDate: entryDateStr || `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          day: d,
          month: m,
          year: y,
          yearMonth: row.year_month || `${y}-${String(m).padStart(2, '0')}`,
          createdAt: row.created_at
        };
      });
    }
  } catch (e) {
    console.warn('Supabase offline, lendo carteira do IndexedDB:', e);
  }

  // 2. Fallback offline: lê do IndexedDB
  try {
    const store = await getStore('carteira');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        const userRows = rows.filter(r => r.userId === user.id);
        userRows.sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt));
        resolve(userRows);
      };
      req.onerror = () => resolve([]);
    });
  } catch (localErr) {
    console.error('Falha ao ler carteira local:', localErr);
    return [];
  }
}

/**
 * Grava ou atualiza uma entrada financeira
 */
export async function saveWalletEntry(entry) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  const id = entry.id || 'wall_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  const entryDate = entry.entryDate || new Date().toISOString().split('T')[0];
  const parts = entryDate.split('-');
  const year = Number(parts[0]) || new Date().getFullYear();
  const month = Number(parts[1]) || (new Date().getMonth() + 1);
  const day = Number(parts[2]) || new Date().getDate();

  const record = {
    id,
    userId: user.id,
    description: entry.description || 'Renda',
    amount: Number(entry.amount) || 0,
    category: entry.category || 'Salário',
    status: entry.status || 'recebido',
    entryDate,
    day,
    month,
    year,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`,
    createdAt: entry.createdAt || new Date().toISOString()
  };

  // 1. Grava no cache IndexedDB
  try {
    const store = await getStore('carteira', 'readwrite');
    await new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Aviso: falha ao gravar carteira localmente:', err);
  }

  // 2. Grava no Supabase
  try {
    const cloudPayload = {
      id: record.id,
      user_id: user.id,
      description: record.description,
      amount: record.amount,
      category: record.category,
      status: record.status,
      entry_date: record.entryDate,
      day: record.day,
      month: record.month,
      year: record.year,
      year_month: record.yearMonth,
      created_at: record.createdAt
    };

    const { error } = await supabase
      .from('carteira_entradas')
      .upsert(cloudPayload);

    if (error) console.warn('Aviso de sync com Supabase:', error.message);
  } catch (cloudErr) {
    console.warn('Entrada gravada localmente, sync pendente na nuvem:', cloudErr);
  }

  return record;
}

/**
 * Exclui uma entrada da carteira
 */
export async function deleteWalletEntry(id) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  // 1. Exclui do IndexedDB
  try {
    const store = await getStore('carteira', 'readwrite');
    await new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao deletar localmente:', err);
  }

  // 2. Exclui do Supabase
  try {
    const { error } = await supabase
      .from('carteira_entradas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) console.warn('Aviso de sync ao deletar no Supabase:', error.message);
  } catch (cloudErr) {
    console.warn('Erro ao excluir no Supabase:', cloudErr);
  }

  return true;
}

/**
 * Busca o histórico de compras para cálculo de saídas
 */
export async function getPurchaseHistoryForWallet() {
  const user = appStore.state.currentUser;
  if (!user) return [];

  try {
    let { data, error } = await supabase
      .from('historico_compras')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      // Fallback para caso tabela antiga purchase_history exista
      const res = await supabase.from('purchase_history').select('*').eq('user_id', user.id);
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data.map(row => ({
        id: row.id,
        userId: row.user_id,
        totalSpent: Number(row.total_spent) || 0,
        purchasedAt: row.purchased_at,
        year: Number(row.year) || (row.purchased_at ? new Date(row.purchased_at).getFullYear() : new Date().getFullYear()),
        month: Number(row.month) || (row.purchased_at ? new Date(row.purchased_at).getMonth() + 1 : 1)
      }));
    }
  } catch (e) {
    console.warn('Erro ao consultar histórico na nuvem para a carteira:', e);
  }

  // Fallback IndexedDB
  try {
    const store = await getStore('historico');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []).filter(r => r.userId === user.id);
        resolve(rows.map(r => ({
          id: r.id,
          userId: r.userId,
          totalSpent: Number(r.totalSpent || r.total_spent) || 0,
          purchasedAt: r.purchasedAt || r.purchased_at,
          year: Number(r.year) || new Date().getFullYear(),
          month: Number(r.month) || 1
        })));
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Calcula o balanço da carteira unindo entradas financeiras e saídas de compras
 */
export function calculateWalletBalance(walletEntries = [], purchaseHistory = [], filter = {}) {
  const targetYear = filter.year && filter.year !== 'all' ? Number(filter.year) : null;
  const targetMonth = filter.month && filter.month !== 'all' ? Number(filter.month) : null;

  // Saldo geral acumulado
  const totalGeralRecebido = (walletEntries || [])
    .filter(e => e.status === 'recebido')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalGeralAReceber = (walletEntries || [])
    .filter(e => e.status === 'a_receber')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalGeralSaidas = (purchaseHistory || [])
    .reduce((s, p) => s + (Number(p.totalSpent) || 0), 0);
  const saldoGeralCarteira = totalGeralRecebido - totalGeralSaidas;

  // Filtra para o período selecionado
  let filteredEntries = [...walletEntries];
  if (targetYear) filteredEntries = filteredEntries.filter(e => Number(e.year) === targetYear);
  if (targetMonth) filteredEntries = filteredEntries.filter(e => Number(e.month) === targetMonth);

  let filteredPurchases = [...purchaseHistory];
  if (targetYear) filteredPurchases = filteredPurchases.filter(p => Number(p.year) === targetYear);
  if (targetMonth) filteredPurchases = filteredPurchases.filter(p => Number(p.month) === targetMonth);

  const totalRecebido = filteredEntries
    .filter(e => e.status === 'recebido')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalAReceber = filteredEntries
    .filter(e => e.status === 'a_receber')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSaidas = filteredPurchases.reduce((s, p) => s + (Number(p.totalSpent) || 0), 0);
  const saldoDisponivel = totalRecebido - totalSaidas;

  // Agrupamento por categoria
  const catMap = {};
  filteredEntries.forEach(e => {
    const cat = e.category || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
  });

  return {
    entriesCount: filteredEntries.length,
    purchasesCount: filteredPurchases.length,
    totalGeralRecebido,
    totalGeralAReceber,
    totalGeralSaidas,
    saldoGeralCarteira,
    totalRecebido,
    totalAReceber,
    totalSaidas,
    saldoDisponivel,
    byCategory: catMap,
    entries: filteredEntries,
    purchases: filteredPurchases
  };
}
