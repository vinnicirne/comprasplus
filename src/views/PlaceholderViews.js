import { appStore } from '../store/appStore.js';

const views = {
  carteira: {
    icon: 'account_balance_wallet',
    title: 'Carteira',
    subtitle: 'Gerencie seu saldo e entradas',
    color: 'from-secondary to-secondary/80',
    soon: true
  },
  historico: {
    icon: 'receipt_long',
    title: 'Histórico',
    subtitle: 'Compras concluídas e relatórios',
    color: 'from-primary to-primary/80',
    soon: true
  },
  perfil: {
    icon: 'person',
    title: 'Perfil',
    subtitle: 'Suas informações e configurações',
    color: 'from-primary to-primary-container',
    soon: false
  }
};

function makePlaceholderView(key) {
  const cfg = views[key];
  return {
    render() {
      const shell = document.getElementById('main-app-shell');
      if (shell) shell.classList.remove('hidden');

      const rv = document.getElementById('router-view');
      if (!rv) return;

      const user = appStore.state.currentUser;
      const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Visitante';

      rv.innerHTML = `
        <main class="flex flex-col w-full min-h-screen bg-surface pb-20">
          <div class="bg-gradient-to-br ${cfg.color} px-5 pt-6 pb-8 flex flex-col gap-2">
            <span class="material-symbols-outlined text-on-primary text-[40px] opacity-80">${cfg.icon}</span>
            <h1 class="text-on-primary font-headline-sm text-headline-sm font-bold leading-tight">${cfg.title}</h1>
            <p class="text-on-primary/80 font-body-sm text-body-sm">${cfg.subtitle}</p>
          </div>

          ${key === 'perfil' ? `
          <div class="flex flex-col gap-4 px-4 pt-5">
            <!-- Card do Usuário -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-primary text-[30px]">person</span>
              </div>
              <div>
                <p class="font-label-lg text-on-surface font-bold text-base">${name}</p>
                <p class="font-body-sm text-on-surface-variant text-sm">${user?.email || ''}</p>
              </div>
            </div>

            <!-- Opções -->
            <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/20">
              <button class="w-full flex items-center gap-3 px-4 py-3.5 text-on-surface hover:bg-surface-container active:scale-[0.99] transition-all" id="btn-perfil-notificacoes">
                <span class="material-symbols-outlined text-primary text-[22px]">notifications</span>
                <span class="font-label-md text-sm font-semibold flex-1 text-left">Notificações</span>
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
              </button>
              <button class="w-full flex items-center gap-3 px-4 py-3.5 text-on-surface hover:bg-surface-container active:scale-[0.99] transition-all" id="btn-perfil-privacidade">
                <span class="material-symbols-outlined text-primary text-[22px]">lock</span>
                <span class="font-label-md text-sm font-semibold flex-1 text-left">Privacidade</span>
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
              </button>
              <button class="w-full flex items-center gap-3 px-4 py-3.5 text-on-surface hover:bg-surface-container active:scale-[0.99] transition-all" id="btn-perfil-ajuda">
                <span class="material-symbols-outlined text-primary text-[22px]">help</span>
                <span class="font-label-md text-sm font-semibold flex-1 text-left">Ajuda & Suporte</span>
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
              </button>
            </div>

            <!-- Sair -->
            <button id="btn-logout" class="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-error-container text-on-error-container font-semibold text-sm active:scale-[0.98] transition-all shadow-sm">
              <span class="material-symbols-outlined text-[20px]">logout</span>
              Sair da Conta
            </button>

            <p class="text-center text-on-surface-variant text-[11px] mt-2">Compras Plus v1.2.0 — Modular Edition</p>
          </div>
          ` : `
          <div class="flex flex-col items-center justify-center flex-1 py-20 px-6 text-center gap-4">
            <div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center shadow-inner">
              <span class="material-symbols-outlined text-[44px] text-outline">construction</span>
            </div>
            <h2 class="font-headline-sm text-on-surface font-bold">Em construção</h2>
            <p class="font-body-sm text-on-surface-variant max-w-[260px]">Esta funcionalidade está sendo desenvolvida e estará disponível em breve.</p>
            <div class="px-4 py-2 rounded-full bg-primary-fixed/40 text-primary font-label-sm text-sm font-semibold">
              🚀 Em breve
            </div>
          </div>
          `}
        </main>
      `;

      this.attachEvents();
    },

    attachEvents() {
      const btnLogout = document.getElementById('btn-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
          try {
            const { signOut } = await import('../services/authService.js');
            await signOut();
            const { default: page } = await import('page');
            page('/');
          } catch (e) {
            console.error('Logout error', e);
          }
        });
      }
    }
  };
}

export const HistoricoView = makePlaceholderView('historico');
