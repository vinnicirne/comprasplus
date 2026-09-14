import { supabase } from './supabaseClient.js';
import { appStore } from '../store/appStore.js';

export async function signUp(email, password, name, phone, marketingConsent = true) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name ? name.trim() : email.split('@')[0],
        phone: phone ? phone.trim() : '',
        marketing_consent: Boolean(marketingConsent)
      }
    }
  });

  if (error) throw new Error(error.message);
  
  if (data.session) {
    appStore.state.currentUser = data.session.user;
  } else if (data.user) {
    appStore.state.currentUser = data.user;
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw new Error(error.message);
  
  appStore.state.currentUser = data.user;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  
  appStore.state.currentUser = null;
  return true;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
  return true;
}

export async function loadSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error loading session:', error.message);
    appStore.state.currentUser = null;
    return null;
  }
  
  if (session) {
    appStore.state.currentUser = session.user;
  } else {
    appStore.state.currentUser = null;
  }
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    appStore.state.currentUser = session?.user || null;
  });
  
  return session;
}

export function isAdmin(user = appStore.state.currentUser) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (email === 'viniciuscirne@gmail.com') return true;
  if (user.app_metadata?.role === 'admin') return true;
  return false;
}

export async function updateUserProfile({ name, phone }) {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  // Suporte para modo visitante (guest)
  if (user.id === 'guest') {
    appStore.state.currentUser.user_metadata = {
      ...(appStore.state.currentUser.user_metadata || {}),
      name,
      phone
    };
    try {
      localStorage.setItem('compras_plus_guest_profile', JSON.stringify({ name, phone }));
    } catch (_) {}
    const firstName = (name || '').trim().split(' ')[0] || 'Visitante';
    const headerLabel = document.getElementById('header-auth-label');
    if (headerLabel) headerLabel.textContent = firstName;
    window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: { name, phone } }));
    return true;
  }

  // 1. Atualiza no Supabase Auth
  const { data, error } = await supabase.auth.updateUser({
    data: { name, phone }
  });

  if (error) throw new Error(error.message);

  if (data?.user) {
    appStore.state.currentUser = data.user;
  } else if (appStore.state.currentUser) {
    appStore.state.currentUser.user_metadata = {
      ...(appStore.state.currentUser.user_metadata || {}),
      name,
      phone
    };
  }

  // 2. Atualiza na tabela user_profiles (se existir)
  try {
    await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        name,
        phone,
        email: user.email,
        updated_at: new Date().toISOString()
      });
  } catch (_) {}

  // Notifica o Dashboard e Header em tempo real
  try {
    const firstName = (name || '').trim().split(' ')[0] || 'Usuário';
    const headerLabel = document.getElementById('header-auth-label');
    if (headerLabel) headerLabel.textContent = firstName;
    window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: { name, phone } }));
  } catch (_) {}

  return true;
}

export async function syncDataNow() {
  const user = appStore.state.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  const { getListas } = await import('./listService.js');
  const { getWalletEntries } = await import('./walletService.js');
  const { getPurchaseHistory } = await import('./historyService.js');

  const [lists, wallet, history] = await Promise.all([
    getListas(user.id),
    getWalletEntries(),
    getPurchaseHistory()
  ]);

  return {
    listsCount: lists.length,
    walletCount: wallet.length,
    historyCount: history.length
  };
}

