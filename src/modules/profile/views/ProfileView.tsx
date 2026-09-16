import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { syncEngine } from '../../../core/sync/SyncEngine';
import { LogOut, User as UserIcon, Shield, Cloud, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../../core/components/ui/Button';
import { supabase } from '../../../core/lib/supabase';

const formatPhoneInput = (value: string) => {
  const raw = (value || '').replace(/\D/g, '');
  if (raw.length <= 2) return raw ? `(${raw}` : '';
  if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
  if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
  return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
};

export const ProfileView: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Initial user data loading
  useEffect(() => {
    if (user?.user_metadata) {
      setName(user.user_metadata.name || '');
      setPhone(formatPhoneInput(user.user_metadata.phone || ''));
    }
  }, [user]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          phone: phone.replace(/\D/g, '') // Save only digits
        }
      });
      
      if (error) throw error;
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      // For now we just process the current queue and simulate a pull if necessary
      await syncEngine.processQueue();
      // Assume success if no throw
      setSyncStatus('success');
      setSyncMessage('Sincronização Concluída.\nDados atualizados com a nuvem.');
      alert('✅ Sincronização Concluída\nDados atualizados com a nuvem.');
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus('error');
      setSyncMessage('Falha ao sincronizar com a nuvem. Verifique sua conexão.');
      alert('❌ Falha na Sincronização\nVerifique sua conexão e tente novamente.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente desconectar sua conta deste dispositivo?')) {
      signOut();
    }
  };

  // Determine user context
  const email = user?.email || 'usuario@email.com';
  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
  const isAdmin = user?.user_metadata?.is_admin === true;

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-32 px-margin pt-4">
      {/* ─── Hero Card ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] p-6 mb-6 text-white shadow-md flex flex-col gap-4"
           style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
        {/* Blob Decorativo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-black shrink-0 border border-white/30 shadow-inner">
            {isAdmin ? '🛡️' : initial}
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black leading-tight drop-shadow-sm">{name || 'Usuário'}</h2>
            <p className="text-sm text-white/80 font-medium">{email}</p>
            
            <div className="flex items-center gap-1.5 mt-2 bg-black/20 w-fit px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#85f8c4] animate-pulse"></span>
              <span className="text-[10px] font-bold text-white tracking-wide uppercase">SaaS Conectado • Nuvem Ativa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Meus Dados ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <UserIcon className="text-primary" size={20} />
          <h3 className="text-base font-black text-on-surface">Meus Dados</h3>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1">Nome Completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant"
            placeholder="Seu nome"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1">WhatsApp / Telefone</label>
          <input
            type="tel"
            maxLength={15}
            value={phone}
            onChange={handlePhoneChange}
            className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant"
            placeholder="(99) 99999-9999"
          />
        </div>

        {saveStatus === 'success' && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 size={16} /> Perfil atualizado com sucesso!
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200">
            <AlertCircle size={16} /> Ocorreu um erro ao atualizar os dados.
          </div>
        )}

        <Button 
          onClick={handleSaveProfile} 
          disabled={isSaving}
          className="w-full h-12 font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save size={18} /> Salvar Alterações</>
          )}
        </Button>
      </div>

      {/* ─── Sincronização & Nuvem ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Cloud className="text-primary" size={20} />
          <h3 className="text-base font-black text-on-surface">Sincronização & Nuvem</h3>
        </div>
        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
          O Compras Plus funciona <strong>offline-first</strong>. Seus dados são salvos localmente e sincronizados em segundo plano quando há internet.
        </p>
        
        {syncStatus === 'error' && (
          <p className="text-xs text-rose-600 font-bold">{syncMessage}</p>
        )}

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full h-12 mt-1 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
        >
          {isSyncing ? (
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <>🔄 Sincronizar Dados Agora</>
          )}
        </button>
      </div>

      {/* ─── Painel Admin (Condicional) ───────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex flex-col gap-3 bg-tertiary-container/30 p-5 rounded-3xl border border-tertiary/20 mb-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-tertiary flex items-center justify-center text-on-primary">
              <Shield size={18} />
            </span>
            <h3 className="text-base font-black text-on-surface">Painel Administrativo</h3>
          </div>
          <button className="w-full h-12 mt-1 rounded-xl font-bold text-sm bg-tertiary text-on-primary transition-all active:scale-95 shadow-md">
            Acessar Painel Admin
          </button>
        </div>
      )}

      {/* ─── Encerrar Sessão ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-5 rounded-3xl border border-error/20 bg-error/5 mb-6">
        <h3 className="text-sm font-black text-error">Encerrar Sessão</h3>
        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-xl font-bold text-sm bg-error/10 text-error hover:bg-error/20 transition-all border border-error/20 active:scale-95 flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Sair da Conta
        </button>
      </div>

      <div className="text-center pb-8">
        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
          Compras Plus v1.2.0 • SaaS Conectado
        </p>
      </div>
    </div>
  );
};
