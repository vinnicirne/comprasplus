import { supabase } from './supabaseClient.js';
import { getStore } from './indexedDb.js';
import { appStore } from '../store/appStore.js';
import { getListaById, updateLista } from './listService.js';
import { isAdmin } from './authService.js';

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LST-';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return code;
}

/**
 * Cria ou recupera o código de convite / link de compartilhamento
 */
export async function createShareInviteCode(listId, permission = 'fechado', forceNew = false) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Você precisa estar conectado à sua conta para compartilhar listas.');

  const list = await getListaById(listId);
  if (!list) throw new Error('Lista não encontrada.');

  // Determina o código
  let inviteCode = (forceNew || !list.inviteCode) ? generateInviteCode() : list.inviteCode;

  const shareRecord = {
    id: 'share_' + listId,
    list_id: listId,
    lista_id: listId,
    owner_id: user.id,
    shared_with_email: 'convite_link@comprasplus.app',
    permission: permission === 'aberto' ? 'aberto' : 'fechado',
    invite_code: inviteCode,
    created_at: new Date().toISOString()
  };

  // Salva no Supabase
  try {
    // Remove convites de link anteriores desta lista
    await supabase
      .from('lista_compartilhamentos')
      .delete()
      .or(`list_id.eq.${listId},lista_id.eq.${listId}`)
      .eq('shared_with_email', 'convite_link@comprasplus.app');

    const { error } = await supabase
      .from('lista_compartilhamentos')
      .upsert(shareRecord);

    if (error) console.warn('Aviso Supabase compartilhamento:', error.message);
  } catch (err) {
    console.warn('Erro ao registrar convite no Supabase:', err);
  }

  // Atualiza localmente
  try {
    const store = await getStore('compartilhamentos', 'readwrite');
    store.put(shareRecord);
  } catch (_) {}

  // Atualiza a lista com o inviteCode e permissão
  list.inviteCode = inviteCode;
  list.sharePermission = permission;
  list.isShared = true;
  await updateLista(listId, {
    inviteCode,
    sharePermission: permission,
    isShared: true
  }).catch(() => {});

  const shareLink = `${window.location.origin}${window.location.pathname}#!/entrar-convite?codigo=${encodeURIComponent(inviteCode)}`;

  return {
    inviteCode,
    permission,
    shareLink
  };
}

/**
 * Compartilha diretamente por e-mail com outro usuário
 */
export async function shareListWithEmail(listId, email, permission = 'fechado') {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Você precisa estar conectado para compartilhar.');

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Informe um e-mail válido.');
  }

  const inviteCode = generateInviteCode();
  const shareRecord = {
    id: 'share_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    list_id: listId,
    lista_id: listId,
    owner_id: user.id,
    shared_with_email: cleanEmail,
    permission: permission === 'aberto' ? 'aberto' : 'fechado',
    invite_code: inviteCode,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('lista_compartilhamentos')
    .insert([shareRecord])
    .select()
    .single();

  if (error) throw new Error(error.message || 'Falha ao compartilhar lista por e-mail.');

  return data || shareRecord;
}

/**
 * Conecta o usuário atual a uma lista compartilhada usando o código de convite LST-XXXXX
 */
export async function joinSharedListByCode(inviteCode) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Você precisa fazer login para conectar a uma lista compartilhada.');

  let rawInput = (inviteCode || '').trim();
  if (rawInput.includes('codigo=')) {
    const match = rawInput.match(/codigo=([A-Za-z0-9\-]+)/i);
    if (match) rawInput = match[1];
  } else if (rawInput.includes('convite=')) {
    const match = rawInput.match(/convite=([A-Za-z0-9\-]+)/i);
    if (match) rawInput = match[1];
  }

  let cleanCode = rawInput.toUpperCase().replace(/\s+/g, '');
  if (!cleanCode.startsWith('LST-') && cleanCode.length <= 6 && cleanCode.length > 0) {
    cleanCode = 'LST-' + cleanCode;
  }
  if (!cleanCode) throw new Error('Código de convite inválido.');

  // 1. Tenta conectar via RPC segura no Supabase
  let targetList = null;
  let share = null;
  try {
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc('connect_shared_list_by_code', { p_invite_code: cleanCode });

    if (!rpcErr && rpcData) {
      targetList = rpcData;
      share = {
        permission: rpcData.permission,
        owner_id: rpcData.owner_id
      };
    }
  } catch (_) {}

  // Fallback para PostgREST direto caso a RPC ainda não tenha sido criada no banco
  if (!targetList) {
    try {
      const { data, error } = await supabase
        .from('lista_compartilhamentos')
        .select('*')
        .ilike('invite_code', cleanCode)
        .limit(1);

      if (!error && data && data.length > 0) {
        share = data[0];
      }
    } catch (e) {
      console.warn('Erro ao buscar código na nuvem:', e);
    }

    if (!share) {
      throw new Error(`Código de convite "${cleanCode}" não encontrado ou expirado.`);
    }

    const targetListId = share.list_id || share.lista_id;
    if (!targetListId) {
      throw new Error('Lista vinculada ao convite não foi encontrada.');
    }

    // 2. Busca os dados da lista no Supabase
    try {
      const { data: listData, error: listErr } = await supabase
        .from('listas')
        .select('*')
        .eq('id', targetListId)
        .single();

      if (!listErr && listData) {
        targetList = listData;
      }
    } catch (_) {}

    // Fallback se já tiver no IndexedDB
    if (!targetList) {
      targetList = await getListaById(targetListId);
    }
  }

  if (!targetList) {
    throw new Error('A lista compartilhada não está mais disponível.');
  }

  // Marca a lista como compartilhada
  targetList.isShared = true;
  targetList.permission = share.permission || 'fechado';
  targetList.sharedBy = share.owner_id;

  // Salva no cache local do usuário
  try {
    const store = await getStore('listas', 'readwrite');
    await new Promise((resolve) => {
      const req = store.put(targetList);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (_) {}

  return targetList;
}

/**
 * Consulta a lista de colaboradores com acesso
 */
export async function getListCollaborators(listId) {
  const user = appStore.state.currentUser;
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('lista_compartilhamentos')
      .select('*')
      .or(`list_id.eq.${listId},lista_id.eq.${listId}`);

    if (!error && data) {
      return data;
    }
  } catch (_) {}

  return [];
}

/**
 * Remove o acesso de um colaborador
 */
export async function removeCollaborator(shareId) {
  try {
    const { error } = await supabase
      .from('lista_compartilhamentos')
      .delete()
      .eq('id', shareId);

    return !error;
  } catch (_) {
    return false;
  }
}

/**
 * Retorna a permissão do usuário atual para a lista
 */
export function getListPermission(list) {
  const user = appStore.state.currentUser;
  if (!list || !user) return 'fechado';
  if (list.userId === user.id || list.user_id === user.id) return 'owner';
  if (isAdmin(user)) return 'owner';
  if (list.permission) return list.permission;
  return 'fechado';
}
