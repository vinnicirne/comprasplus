import page from 'page';
import { appStore } from '../store/appStore.js';
import { updateUserProfile, syncDataNow, signOut, isAdmin } from '../services/authService.js';
import { escapeHtml } from '../utils/formatters.js';

export const ProfileView = {
  render() {
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.remove('hidden');

    const routerView = document.getElementById('router-view');
    if (!routerView) return;

    const user = appStore.state.currentUser;
    if (!user) {
      page('/');
      return;
    }

    const rawName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
    const phone = user.user_metadata?.phone || '';
    const initial = rawName.charAt(0).toUpperCase();
    const isUserAdmin = isAdmin(user);

    routerView.innerHTML = `
      <main class="min-h-screen bg-surface flex flex-col pb-32">
        <!-- Top Bar -->
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-md pt-safe px-space-md h-16 flex items-center justify-between border-b border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-2">
            <button id="btn-perfil-voltar" class="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface">Meu Perfil</h1>
          </div>
          <button id="btn-quick-logout" class="h-9 px-3 rounded-xl bg-error-container/40 text-on-error-container font-label-md text-xs font-semibold flex items-center gap-1.5 hover:bg-error-container active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            <span>Sair</span>
          </button>
        </header>

        <div class="p-space-md flex flex-col gap-space-md max-w-lg mx-auto w-full">
          <!-- Hero Card do Usuário -->
          <div class="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 shadow-md flex flex-col items-center text-center text-on-primary relative overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

            <div class="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-3xl font-extrabold shadow-inner mb-3">
              ${isUserAdmin ? '🛡️' : initial}
            </div>

            <h2 class="font-headline-sm text-xl font-bold tracking-tight">${escapeHtml(rawName)}</h2>
            <span class="font-body-sm text-xs opacity-85 mt-0.5">${escapeHtml(user.email || '')}</span>

            <div class="mt-4 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md flex items-center gap-2 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
              <span>SaaS Conectado • Nuvem Ativa</span>
            </div>
          </div>

          <!-- Card: Meus Dados -->
          <section class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">person</span>
              </span>
              <h3 class="font-headline-sm text-base font-bold text-on-surface">Meus Dados</h3>
            </div>

            <form id="form-editar-perfil" class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">Nome Completo</label>
                <input type="text" id="perfil-input-name" value="${escapeHtml(rawName)}" required
                  class="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
              </div>

              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase">WhatsApp / Telefone</label>
                <input type="tel" id="perfil-input-phone" value="${escapeHtml(phone)}" placeholder="(11) 99999-9999" maxlength="15"
                  class="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                <small class="font-body-sm text-[11px] text-outline">Usado para receber convites de listas compartilhadas.</small>
              </div>

              <div id="perfil-salvar-alerta" class="hidden p-3 rounded-xl text-xs font-semibold"></div>

              <button type="submit" id="btn-salvar-perfil"
                class="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all mt-1">
                <span class="material-symbols-outlined text-[20px]">save</span>
                Salvar Alterações
              </button>
            </form>
          </section>

          <!-- Card: Sincronização & Nuvem -->
          <section class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">cloud_sync</span>
              </span>
              <h3 class="font-headline-sm text-base font-bold text-on-surface">Sincronização & Nuvem</h3>
            </div>

            <p class="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              O Compras PLUS funciona offline e sincroniza automaticamente seus dados sempre que conectado à internet. Clique abaixo para forçar a sincronização imediata.
            </p>

            <button type="button" id="btn-perfil-sync"
              class="w-full h-12 rounded-2xl border border-outline-variant/40 bg-surface-container text-on-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-[20px]">sync</span>
              Sincronizar Dados Agora
            </button>
          </section>

          ${isUserAdmin ? `
          <!-- Card: Painel do Administrador (Exclusivo) -->
          <section class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">shield_person</span>
              </span>
              <h3 class="font-headline-sm text-base font-bold text-on-surface">Painel Administrativo</h3>
            </div>
            <p class="font-body-sm text-xs text-on-surface-variant">
              Acesso exclusivo de administrador para visualização de métricas e exportação de leads.
            </p>
            <button type="button" id="btn-abrir-painel-admin-profile"
              class="w-full h-12 rounded-2xl bg-tertiary text-on-tertiary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              Acessar Painel Admin
            </button>
          </section>
          ` : ''}

          <!-- Card: Sair da Conta -->
          <section class="bg-surface-container-lowest rounded-2xl p-5 border border-error/20 shadow-xs flex flex-col gap-3">
            <h3 class="font-headline-sm text-sm font-bold text-error">Encerrar Sessão</h3>
            <p class="font-body-sm text-xs text-on-surface-variant">
              Deseja desconectar sua conta deste dispositivo?
            </p>
            <button type="button" id="btn-perfil-logout-bottom"
              class="w-full h-12 rounded-2xl bg-error-container text-on-error-container font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-[20px]">logout</span>
              Sair da Conta
            </button>
          </section>

          <p class="text-center text-on-surface-variant text-[11px] mt-1">Compras Plus v1.2.0 • SaaS Conectado</p>
        </div>
      </main>
    `;

    this.attachEvents();
  },

  formatPhoneInput(value) {
    const raw = (value || '').replace(/\D/g, '');
    if (raw.length <= 2) return raw ? `(${raw}` : '';
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  },

  attachEvents() {
    // Voltar
    document.getElementById('btn-perfil-voltar')?.addEventListener('click', () => page('/dashboard'));

    // Máscara de telefone
    const phoneInput = document.getElementById('perfil-input-phone');
    phoneInput?.addEventListener('input', (e) => {
      e.target.value = this.formatPhoneInput(e.target.value);
    });

    // Salvar Perfil
    const form = document.getElementById('form-editar-perfil');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('perfil-input-name').value.trim();
      const phone = document.getElementById('perfil-input-phone').value.trim();
      const btn = document.getElementById('btn-salvar-perfil');
      const alerta = document.getElementById('perfil-salvar-alerta');

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Salvando...';

      try {
        await updateUserProfile({ name, phone });
        alerta.textContent = 'Perfil atualizado com sucesso!';
        alerta.className = 'p-3 rounded-xl text-xs font-semibold bg-secondary-container text-on-secondary-container';
        alerta.classList.remove('hidden');
      } catch (err) {
        alerta.textContent = err.message || 'Erro ao atualizar perfil.';
        alerta.className = 'p-3 rounded-xl text-xs font-semibold bg-error-container text-on-error-container';
        alerta.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">save</span> Salvar Alterações';
      }
    });

    // Sincronizar Agora
    const btnSync = document.getElementById('btn-perfil-sync');
    btnSync?.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Sincronizando...';

      try {
        const res = await syncDataNow();
        alert(`☁️ Sincronização concluída!\n\n• ${res.listsCount} listas atualizadas\n• ${res.walletCount} entradas da carteira\n• ${res.historyCount} registros no histórico`);
      } catch (err) {
        alert('Erro ao sincronizar: ' + err.message);
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = '<span class="material-symbols-outlined text-[20px]">sync</span> Sincronizar Dados Agora';
      }
    });

    // Botão Admin
    document.getElementById('btn-abrir-painel-admin-profile')?.addEventListener('click', () => {
      page('/admin');
    });

    // Logout
    const doLogout = async () => {
      if (confirm('Deseja realmente sair da sua conta?')) {
        try {
          await signOut();
          page('/');
        } catch (e) {
          console.error('Erro ao sair:', e);
        }
      }
    };

    document.getElementById('btn-quick-logout')?.addEventListener('click', doLogout);
    document.getElementById('btn-perfil-logout-bottom')?.addEventListener('click', doLogout);
  }
};
