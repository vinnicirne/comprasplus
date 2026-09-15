import { supabase } from './supabaseClient.js';
import { getStore } from './indexedDb.js';
import { appStore } from '../store/appStore.js';
import { getEffectiveUserId } from './authService.js';

/**
 * Busca entradas financeiras da carteira (Supabase como fonte primária + cache IndexedDB)
 */
export async function getWalletEntries() {
  const effectiveUserId = getEffectiveUserId();
  if (!effectiveUserId) return [];

  // 1. Busca da nuvem (Supabase como fonte da verdade)
  try {
    const { data, error } = await supabase
      .from('carteira_entradas')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      // Atualiza o IndexedDB local como cache
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
              description: row.title || row.description,
              amount: Number(row.amount) || 0,
              type: row.type || 'entrada',
              category: row.category,
              status: row.status || (row.type === 'saida' ? 'a_pagar' : 'recebido'),
              dueDate: row.due_date || null,
              paidAt: row.paid_at || null,
              isRecurrent: Boolean(row.is_recurrent),
              recurrentPeriod: row.recurrent_period || 'mensal',
              isInstallment: Boolean(row.is_installment),
              installmentCurrent: row.installment_current || null,
              installmentTotal: row.installment_total || null,
              parentId: row.parent_id || null,
              relatedListId: row.related_list_id || null,
              entryDate,
              day: d,
              month: m,
              year: y,
              yearMonth: `${y}-${String(m).padStart(2, '0')}`,
              createdAt: row.created_at
            });
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
          });
        }
      } catch (cacheErr) {
        console.warn('Erro ao atualizar cache local da carteira:', cacheErr);
      }

      // Mescla com eventuais registros locais ainda não sincronizados para a nuvem
      try {
        const store = await getStore('carteira');
        const localRows = await new Promise((res) => {
          const req = store.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        });
        const userLocals = localRows.filter(r => r.userId === effectiveUserId || r.userId === 'guest');
        const cloudIds = new Set(data.map(d => d.id));
        const unsynced = userLocals.filter(l => !cloudIds.has(l.id));

        for (const uns of unsynced) {
          const cloudPayload = {
            id: uns.id,
            user_id: effectiveUserId,
            title: uns.description,
            amount: Number(uns.amount) || 0,
            type: uns.type || 'entrada',
            category: uns.category || (uns.type === 'saida' ? 'Geral' : 'Salário'),
            status: uns.status || (uns.type === 'saida' ? 'a_pagar' : 'recebido'),
            due_date: uns.dueDate || null,
            paid_at: uns.paidAt || null,
            is_recurrent: uns.isRecurrent || false,
            recurrent_period: uns.recurrentPeriod || 'mensal',
            is_installment: uns.isInstallment || false,
            installment_current: uns.installmentCurrent || null,
            installment_total: uns.installmentTotal || null,
            parent_id: uns.parentId || null,
            related_list_id: uns.relatedListId || null,
            entry_date: uns.entryDate || new Date().toISOString().split('T')[0],
            day: uns.day || new Date().getDate(),
            month: uns.month || (new Date().getMonth() + 1),
            year: uns.year || new Date().getFullYear(),
            created_at: uns.createdAt || new Date().toISOString()
          };

          try {
            const { error: upErr } = await supabase.from('carteira_entradas').upsert(cloudPayload);
            if (!upErr) {
              data.push(cloudPayload);
            }
          } catch (_) {}
        }
      } catch (_) {}

      // Retorna os dados mapeados do Supabase
      return data.map(row => {
        const entryDateStr = row.entry_date || null;
        const parts = entryDateStr ? entryDateStr.split('-') : [];
        const y = Number(row.year) || Number(parts[0]) || new Date().getFullYear();
        const m = Number(row.month) || Number(parts[1]) || (new Date().getMonth() + 1);
        const d = Number(row.day) || Number(parts[2]) || 1;
        const entryDate = entryDateStr || `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return {
          id: row.id,
          userId: row.user_id,
          description: row.title || row.description,
          amount: Number(row.amount) || 0,
          type: row.type || 'entrada',
          category: row.category,
          status: row.status || (row.type === 'saida' ? 'a_pagar' : 'recebido'),
          dueDate: row.due_date || null,
          paidAt: row.paid_at || null,
          isRecurrent: Boolean(row.is_recurrent),
          recurrentPeriod: row.recurrent_period || 'mensal',
          isInstallment: Boolean(row.is_installment),
          installmentCurrent: row.installment_current || null,
          installmentTotal: row.installment_total || null,
          parentId: row.parent_id || null,
          relatedListId: row.related_list_id || null,
          entryDate,
          day: d,
          month: m,
          year: y,
          yearMonth: `${y}-${String(m).padStart(2, '0')}`,
          createdAt: row.created_at
        };
      });
    }
  } catch (cloudErr) {
    console.warn('Supabase offline para carteira, buscando IndexedDB:', cloudErr);
  }

  // Fallback offline do IndexedDB
  try {
    const store = await getStore('carteira');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        const userRows = rows.filter(r => r.userId === effectiveUserId || r.userId === 'guest');
        userRows.sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt));
        resolve(userRows);
      };
      req.onerror = () => resolve([]);
    });
  } catch (_) {
    return [];
  }
}

/**
 * Grava uma ou várias entradas financeiras (suporta parcelamento e recorrência)
 */
export async function saveWalletEntry(entry) {
  const effectiveUserId = getEffectiveUserId();
  if (!effectiveUserId) throw new Error('Usuário não autenticado.');

  const type = entry.type || 'entrada';
  const totalAmount = Number(entry.amount) || 0;
  const isInstallment = Boolean(entry.isInstallment && entry.installmentTotal > 1);
  const installmentTotal = isInstallment ? Number(entry.installmentTotal) : 1;
  const parentId = isInstallment ? (entry.parentId || 'inst_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()) : null;

  const recordsToSave = [];

  if (isInstallment) {
    // Cria as N parcelas divididas igualmente
    const installmentAmount = Math.round((totalAmount / installmentTotal) * 100) / 100;
    const baseDueDateStr = entry.dueDate || entry.entryDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDueDateStr + 'T12:00:00');

    for (let i = 1; i <= installmentTotal; i++) {
      const pDate = new Date(baseDate);
      pDate.setMonth(pDate.getMonth() + (i - 1));
      const pDueDateStr = pDate.toISOString().split('T')[0];
      const pParts = pDueDateStr.split('-');
      const pYear = Number(pParts[0]);
      const pMonth = Number(pParts[1]);
      const pDay = Number(pParts[2]);

      // Primeira parcela pode herdar status 'pago' se especificado, as outras 'a_pagar'
      const pStatus = (i === 1 && entry.status === 'pago') ? 'pago' : 'a_pagar';

      recordsToSave.push({
        id: 'wall_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now() + `_${i}`,
        userId: effectiveUserId,
        description: `${entry.description || 'Despesa'} (${i}/${installmentTotal})`,
        amount: installmentAmount,
        type: 'saida',
        category: entry.category || 'Parcelamento',
        status: pStatus,
        dueDate: pDueDateStr,
        paidAt: pStatus === 'pago' ? new Date().toISOString() : null,
        isRecurrent: false,
        recurrentPeriod: 'mensal',
        isInstallment: true,
        installmentCurrent: i,
        installmentTotal,
        parentId,
        relatedListId: entry.relatedListId || null,
        entryDate: pDueDateStr,
        day: pDay,
        month: pMonth,
        year: pYear,
        yearMonth: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        createdAt: new Date().toISOString()
      });
    }
  } else {
    // Lançamento normal único ou recorrente
    const id = entry.id || 'wall_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const entryDate = entry.entryDate || entry.dueDate || new Date().toISOString().split('T')[0];
    const parts = entryDate.split('-');
    const year = Number(parts[0]) || new Date().getFullYear();
    const month = Number(parts[1]) || (new Date().getMonth() + 1);
    const day = Number(parts[2]) || new Date().getDate();

    const defaultStatus = type === 'saida' ? (entry.dueDate ? 'a_pagar' : 'pago') : 'recebido';
    const status = entry.status || defaultStatus;

    recordsToSave.push({
      id,
      userId: effectiveUserId,
      description: entry.description || (type === 'saida' ? 'Despesa' : 'Renda'),
      amount: totalAmount,
      type,
      category: entry.category || (type === 'saida' ? 'Geral' : 'Salário'),
      status,
      dueDate: entry.dueDate || null,
      paidAt: status === 'pago' || status === 'recebido' ? (entry.paidAt || new Date().toISOString()) : null,
      isRecurrent: Boolean(entry.isRecurrent),
      recurrentPeriod: entry.recurrentPeriod || 'mensal',
      isInstallment: false,
      installmentCurrent: null,
      installmentTotal: null,
      parentId: null,
      relatedListId: entry.relatedListId || null,
      entryDate,
      day,
      month,
      year,
      yearMonth: `${year}-${String(month).padStart(2, '0')}`,
      createdAt: entry.createdAt || new Date().toISOString()
    });
  }

  // 1. Grava no cache IndexedDB
  try {
    const store = await getStore('carteira', 'readwrite');
    for (const rec of recordsToSave) {
      await new Promise((resolve) => {
        const req = store.put(rec);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    }
  } catch (err) {
    console.warn('Aviso: falha ao gravar carteira localmente:', err);
  }

  // 1. Grava PRIMEIRO no Supabase (Database-First)
  for (const rec of recordsToSave) {
    try {
      const cloudPayload = {
        id: rec.id,
        user_id: effectiveUserId,
        title: rec.description,
        amount: rec.amount,
        type: rec.type,
        category: rec.category,
        status: rec.status,
        due_date: rec.dueDate,
        paid_at: rec.paidAt,
        is_recurrent: rec.isRecurrent,
        recurrent_period: rec.recurrentPeriod,
        is_installment: rec.isInstallment,
        installment_current: rec.installmentCurrent,
        installment_total: rec.installmentTotal,
        parent_id: rec.parentId,
        related_list_id: rec.relatedListId,
        entry_date: rec.entryDate,
        day: rec.day,
        month: rec.month,
        year: rec.year,
        created_at: rec.createdAt
      };

      let { error } = await supabase
        .from('carteira_entradas')
        .upsert(cloudPayload);

      // Fallback: se Supabase acusar coluna inexistente, salva campos básicos
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        const fallbackPayload = {
          id: rec.id,
          user_id: effectiveUserId,
          title: rec.description,
          amount: rec.amount,
          category: rec.category,
          status: rec.status,
          entry_date: rec.entryDate,
          day: rec.day,
          month: rec.month,
          year: rec.year,
          created_at: rec.createdAt
        };
        await supabase.from('carteira_entradas').upsert(fallbackPayload);
      }
    } catch (cloudErr) {
      console.warn('Erro ao gravar no Supabase:', cloudErr);
    }
  }

  return recordsToSave.length === 1 ? recordsToSave[0] : recordsToSave;
}

/**
 * Atualiza um lançamento financeiro existente
 */
export async function updateWalletEntry(id, payload) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  let record = null;
  const store = await getStore('carteira');
  record = await new Promise((resolve) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  if (!record) throw new Error('Lançamento não encontrado.');

  // Atualiza os campos
  const updated = { ...record, ...payload };
  
  // Recalcula ano/mês se a data mudou
  if (payload.entryDate || payload.dueDate) {
    const dateStr = payload.entryDate || payload.dueDate;
    const parts = dateStr.split('-');
    updated.year = Number(parts[0]);
    updated.month = Number(parts[1]);
    updated.day = Number(parts[2]);
    updated.yearMonth = `${updated.year}-${String(updated.month).padStart(2, '0')}`;
  }

  // Atualiza no IndexedDB
  try {
    const storeWrite = await getStore('carteira', 'readwrite');
    await new Promise((res) => {
      const req = storeWrite.put(updated);
      req.onsuccess = () => res(true);
      req.onerror = () => res(false);
    });
  } catch (e) {
    console.warn('Erro ao atualizar IndexedDB:', e);
  }

  // Atualiza na Nuvem Supabase
  try {
    const cloudPayload = {
      id: updated.id,
      user_id: getEffectiveUserId(),
      title: updated.description,
      amount: updated.amount,
      type: updated.type,
      category: updated.category,
      status: updated.status,
      due_date: updated.dueDate,
      paid_at: updated.paidAt,
      is_recurrent: updated.isRecurrent,
      recurrent_period: updated.recurrentPeriod,
      is_installment: updated.isInstallment,
      installment_current: updated.installmentCurrent,
      installment_total: updated.installmentTotal,
      parent_id: updated.parentId,
      related_list_id: updated.relatedListId,
      entry_date: updated.entryDate,
      day: updated.day,
      month: updated.month,
      year: updated.year,
      created_at: updated.createdAt
    };

    await supabase.from('carteira_entradas').upsert(cloudPayload);
  } catch (cloudErr) {
    console.warn('Erro ao atualizar no Supabase:', cloudErr);
  }

  return updated;
}

/**
 * Dá baixa em uma conta/despesa marcando como 'pago'.
 * Se for recorrente, gera automaticamente a PRÓXIMA ocorrência (com novo due_date)
 */
export async function markAsPaid(id) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  // 1. Busca o registro no IndexedDB
  let record = null;
  try {
    const store = await getStore('carteira');
    record = await new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Erro ao ler item para dar baixa:', e);
  }

  if (!record) {
    // Se não encontrou no IndexedDB, busca no Supabase
    try {
      const { data } = await supabase.from('carteira_entradas').select('*').eq('id', id).single();
      if (data) {
        record = {
          id: data.id,
          userId: data.user_id,
          description: data.description,
          amount: Number(data.amount) || 0,
          type: data.type || 'saida',
          category: data.category,
          status: data.status,
          dueDate: data.due_date,
          paidAt: data.paid_at,
          isRecurrent: Boolean(data.is_recurrent),
          recurrentPeriod: data.recurrent_period || 'mensal',
          isInstallment: Boolean(data.is_installment),
          installmentCurrent: data.installment_current,
          installmentTotal: data.installment_total,
          parentId: data.parent_id,
          entryDate: data.entry_date,
          day: data.day,
          month: data.month,
          year: data.year,
          createdAt: data.created_at
        };
      }
    } catch (_) {}
  }

  if (!record) throw new Error('Lançamento não encontrado.');

  const nowIso = new Date().toISOString();
  record.status = 'pago';
  record.paidAt = nowIso;

  // Atualiza o registro no IndexedDB
  try {
    const store = await getStore('carteira', 'readwrite');
    await new Promise((res) => {
      const req = store.put(record);
      req.onsuccess = () => res(true);
      req.onerror = () => res(false);
    });
  } catch (_) {}

  // Atualiza no Supabase
  try {
    await supabase.from('carteira_entradas').update({
      status: 'pago',
      paid_at: nowIso
    }).eq('id', id);
  } catch (e) {
    console.warn('Erro ao atualizar status pago no Supabase:', e);
  }

  // 2. Se for RECORRENTE, gerar a PRÓXIMA ocorrência
  let nextOccurrence = null;
  if (record.isRecurrent) {
    const period = record.recurrentPeriod || 'mensal';
    const baseDueDateStr = record.dueDate || record.entryDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDueDateStr + 'T12:00:00');

    const nextDate = new Date(baseDate);
    if (period === 'semanal') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (period === 'anual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      // mensal (padrão)
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    nextOccurrence = await saveWalletEntry({
      description: record.description,
      amount: record.amount,
      type: 'saida',
      category: record.category,
      status: 'a_pagar',
      dueDate: nextDueDateStr,
      paidAt: null,
      isRecurrent: true,
      recurrentPeriod: period,
      isInstallment: false,
      relatedListId: record.relatedListId || null
    });
  }

  return { record, nextOccurrence };
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
      .eq('id', id);

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
 * Calcula o balanço da carteira unindo entradas financeiras, despesas e compras
 */
export function calculateWalletBalance(walletEntries = [], purchaseHistory = [], filter = {}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const targetYear = filter.year && filter.year !== 'all' ? Number(filter.year) : null;
  const targetMonth = filter.month && filter.month !== 'all' ? Number(filter.month) : null;

  // 1. Métricas Globais (Saldo em Caixa Real)
  let totalGeralRecebido = 0;
  let totalGeralAReceber = 0;
  let totalGeralDespesasPagas = 0;
  let totalGeralContasAPagar = 0;
  let contasVencidasCount = 0;
  let contasVencidasValor = 0;

  const contasAPagarList = [];

  (walletEntries || []).forEach(e => {
    const amt = Number(e.amount) || 0;
    const isSaida = e.type === 'saida';
    const isPago = e.status === 'pago' || e.status === 'recebido';
    const isAPagar = e.status === 'a_pagar';
    const isAReceber = e.status === 'a_receber';

    if (!isSaida) {
      // Entrada
      if (isAReceber) {
        totalGeralAReceber += amt;
      } else {
        totalGeralRecebido += amt; // default 'recebido'
      }
    } else {
      // Saída / Despesa
      if (isPago) {
        totalGeralDespesasPagas += amt;
      } else if (isAPagar) {
        totalGeralContasAPagar += amt;
        contasAPagarList.push(e);

        if (e.dueDate && e.dueDate < todayStr) {
          contasVencidasCount++;
          contasVencidasValor += amt;
        }
      }
    }
  });

  // Ordena contas a pagar por vencimento (mais antigas/vencidas primeiro)
  contasAPagarList.sort((a, b) => {
    const da = a.dueDate || a.entryDate || '9999-99-99';
    const db = b.dueDate || b.entryDate || '9999-99-99';
    return da.localeCompare(db);
  });

  const proximoVencimento = contasAPagarList.find(c => (c.dueDate || c.entryDate) >= todayStr) || contasAPagarList[0] || null;

  const totalGeralCompras = (purchaseHistory || []).reduce((s, p) => s + (Number(p.totalSpent) || 0), 0);
  const saldoEmCaixa = totalGeralRecebido - totalGeralDespesasPagas - totalGeralCompras;

  // 2. Filtro de Período Selecionado
  let filteredEntries = [...(walletEntries || [])];
  if (targetYear) filteredEntries = filteredEntries.filter(e => Number(e.year) === targetYear);
  if (targetMonth) filteredEntries = filteredEntries.filter(e => Number(e.month) === targetMonth);

  let filteredPurchases = [...(purchaseHistory || [])];
  if (targetYear) filteredPurchases = filteredPurchases.filter(p => Number(p.year) === targetYear);
  if (targetMonth) filteredPurchases = filteredPurchases.filter(p => Number(p.month) === targetMonth);

  let totalRecebido = 0;
  let totalAReceber = 0;
  let totalDespesasPagas = 0;
  let totalContasAPagar = 0;

  filteredEntries.forEach(e => {
    const amt = Number(e.amount) || 0;
    const isSaida = e.type === 'saida';
    if (!isSaida) {
      if (e.status === 'a_receber') totalAReceber += amt;
      else totalRecebido += amt;
    } else {
      if (e.status === 'pago') totalDespesasPagas += amt;
      else if (e.status === 'a_pagar') totalContasAPagar += amt;
    }
  });

  const totalCompras = filteredPurchases.reduce((s, p) => s + (Number(p.totalSpent) || 0), 0);
  const saldoPeriodo = totalRecebido - totalDespesasPagas - totalCompras;

  // Categorização
  const byCategory = {};
  filteredEntries.forEach(e => {
    const cat = e.category || (e.type === 'saida' ? 'Despesa' : 'Renda');
    byCategory[cat] = (byCategory[cat] || 0) + (Number(e.amount) || 0);
  });

  return {
    entriesCount: filteredEntries.length,
    purchasesCount: filteredPurchases.length,
    // Globais
    totalGeralRecebido,
    totalGeralAReceber,
    totalGeralDespesasPagas,
    totalGeralContasAPagar,
    totalGeralCompras,
    totalGeralSaidas: totalGeralDespesasPagas + totalGeralCompras,
    saldoEmCaixa,
    saldoGeralCarteira: saldoEmCaixa,
    contasVencidasCount,
    contasVencidasValor,
    proximoVencimento,
    contasAPagarList,
    // Do período
    totalRecebido,
    totalAReceber,
    totalDespesasPagas,
    totalContasAPagar,
    totalCompras,
    totalSaidas: totalDespesasPagas + totalCompras,
    saldoPeriodo,
    saldoDisponivel: saldoPeriodo,
    byCategory,
    entries: filteredEntries,
    purchases: filteredPurchases
  };
}
