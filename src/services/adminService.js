import { supabase } from './supabaseClient.js';
import { isAdmin } from './authService.js';
import { appStore } from '../store/appStore.js';

export async function getAdminData() {
  if (!isAdmin(appStore.state.currentUser)) {
    throw new Error('Acesso restrito ao administrador do sistema.');
  }

  // 1. Busca perfis de usuários
  let leads = [];
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      leads = data;
    }
  } catch (e) {
    console.warn('Erro ao carregar leads do Supabase:', e);
  }

  // 2. Busca métricas de listas
  let totalLists = 0;
  try {
    const { count, error } = await supabase
      .from('listas')
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) {
      totalLists = count;
    }
  } catch (_) {}

  const totalUsers = leads.length;
  const usersWithPhone = leads.filter(l => l.phone && l.phone.trim().replace(/\D/g, '').length >= 10).length;

  return {
    totalUsers,
    usersWithPhone,
    totalLists,
    leads
  };
}

export function exportLeadsToCsv(leads) {
  if (!leads || leads.length === 0) {
    alert('Nenhum lead disponível para exportação.');
    return;
  }

  const headers = ['Nome', 'Email', 'Telefone', 'WhatsApp_Link', 'Marketing_Consent', 'Data_Cadastro'];

  const rows = leads.map(lead => {
    const name = `"${(lead.name || '').replace(/"/g, '""')}"`;
    const email = `"${(lead.email || '').replace(/"/g, '""')}"`;
    const phone = `"${(lead.phone || '').replace(/"/g, '""')}"`;

    let waLink = '';
    const digits = (lead.phone || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      const fullDigits = (digits.length === 10 || digits.length === 11) ? '55' + digits : digits;
      waLink = `"https://wa.me/${fullDigits}"`;
    }

    const consent = lead.marketing_consent !== false ? '"SIM"' : '"NAO"';
    const date = `"${lead.created_at || ''}"`;

    return [name, email, phone, waLink, consent, date].join(';');
  });

  // BOM UTF-8 (\uFEFF) para garantir caracteres e acentuação no Excel
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_compras_plus_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
