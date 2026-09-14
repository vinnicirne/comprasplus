import { supabase } from './supabaseClient.js';
import { getStore } from './indexedDb.js';

export async function getListas(userId) {
  // Try Supabase first (source of truth)
  try {
    const { data, error } = await supabase
      .from('listas')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      // Sync to local IndexedDB as cache
      try {
        const store = await getStore('listas', 'readwrite');
        data.forEach(l => store.put(l));
      } catch (e) { /* ignore sync error */ }
      return data;
    }
  } catch (e) {
    console.warn('Supabase unavailable, falling back to local', e);
  }

  // Fallback to IndexedDB when offline
  try {
    const store = await getStore('listas');
    return new Promise((resolve, reject) => {
      const req = store.index('userId').getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Error fetching lists locally', error);
    return [];
  }
}

const VALID_SUPABASE_COLUMNS = [
  'id', 'name', 'category', 'budget', 'items', 'created_at', 'user_id', 'date', 'status', 'concluida_at', 'store'
];

function sanitizePayload(obj) {
  const payload = {};
  for (const col of VALID_SUPABASE_COLUMNS) {
    if (obj[col] !== undefined) {
      payload[col] = obj[col];
    }
  }
  return payload;
}

export async function createLista(listaData) {
  const fullData = {
    id: listaData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'lista_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)),
    ...listaData
  };
  const payload = sanitizePayload(fullData);

  let data = null;
  let error = null;

  try {
    const res = await supabase
      .from('listas')
      .insert([payload])
      .select()
      .single();
    data = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  // Se falhou por causa da coluna 'store' não existir ainda no Supabase
  if (error && payload.store !== undefined && (error.message?.includes('store') || error.code === 'PGRST204')) {
    const { store: _, ...fallbackPayload } = payload;
    try {
      const res2 = await supabase
        .from('listas')
        .insert([fallbackPayload])
        .select()
        .single();
      data = res2.data;
      error = res2.error;
    } catch (e2) {
      error = e2;
    }
  }

  if (error) throw new Error(error.message || 'Erro ao criar lista no banco de dados');
  
  // Also save to localIndexedDb (preserving fullData with store)
  try {
    const storeObj = await getStore('listas', 'readwrite');
    storeObj.put({ ...fullData, ...(data || {}) });
  } catch (e) {
    console.warn('Failed to save to local DB', e);
  }
  
  return { ...fullData, ...(data || {}) };
}

export async function getListaById(id) {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('listas')
      .select('*')
      .eq('id', id)
      .single();
      
    if (!error && data) {
      // Sync to local
      try {
        const store = await getStore('listas', 'readwrite');
        store.put(data);
      } catch (e) {}
      return data;
    }
  } catch (e) {
    console.warn('Supabase unavailable, falling back to local for list', e);
  }

  // Fallback to IndexedDB
  try {
    const store = await getStore('listas');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Error fetching list locally', error);
    return null;
  }
}

export async function updateLista(id, updates) {
  // Optimistically update IndexedDB
  try {
    const store = await getStore('listas', 'readwrite');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, ...updates, updatedAt: new Date().toISOString() };
        store.put(updated);
      }
    };
  } catch (e) {
    console.warn('Failed to update local DB', e);
  }

  const payload = sanitizePayload(updates);
  if (Object.keys(payload).length > 0) {
    try {
      let { data, error } = await supabase
        .from('listas')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      // Se falhou por causa da coluna 'store' não existir ainda no Supabase
      if (error && payload.store !== undefined && (error.message?.includes('store') || error.code === 'PGRST204')) {
        const { store: _, ...fallbackPayload } = payload;
        const res2 = await supabase
          .from('listas')
          .update(fallbackPayload)
          .eq('id', id)
          .select()
          .single();
        data = res2.data;
        error = res2.error;
      }

      if (error) {
        console.warn('Supabase updateLista error:', error.message);
      }
      return data;
    } catch (err) {
      console.warn('Supabase updateLista exception:', err);
    }
  }
  return null;
}

export async function deleteLista(id) {
  // Optimistically delete from IndexedDB
  try {
    const store = await getStore('listas', 'readwrite');
    store.delete(id);
  } catch (e) {
    console.warn('Failed to delete from local DB', e);
  }

  try {
    const { error } = await supabase.from('listas').delete().eq('id', id);
    if (error) {
      console.warn('Supabase deleteLista error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase deleteLista exception:', err);
  }
  return true;
}

/**
 * Inscreve no Supabase Realtime para escutar alterações da lista específica em tempo real
 */
export function subscribeToList(listId, onUpdate) {
  if (!listId || !supabase) return () => {};

  const channel = supabase
    .channel(`realtime:list:${listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'listas',
        filter: `id=eq.${listId}`
      },
      (payload) => {
        if (payload.new && typeof onUpdate === 'function') {
          try {
            getStore('listas', 'readwrite').then(store => store.put(payload.new));
          } catch (_) {}
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Inscreve no Supabase Realtime para escutar alterações em todas as listas (Dashboard)
 */
export function subscribeToAllLists(userId, onListChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('realtime:all_listas')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'listas'
      },
      (payload) => {
        if (typeof onListChange === 'function') {
          onListChange(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


