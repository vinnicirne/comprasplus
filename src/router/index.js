import page from 'page';
import { appStore } from '../store/appStore.js';
import { LoginView } from '../views/LoginView.js';
import { DashboardView } from '../views/DashboardView.js';
import { ListDetailView } from '../views/ListDetailView.js';
import { WalletView } from '../views/WalletView.js';
import { ProfileView } from '../views/ProfileView.js';
import { AdminView } from '../views/AdminView.js';
import { HistoryView } from '../views/HistoryView.js';
import { isAdmin } from '../services/authService.js';

// Wire up bottom nav tab clicks
function initNav() {
  const navTabs = document.querySelectorAll('.app-nav-tab');
  navTabs.forEach(tab => {
    if (!tab.dataset.bound) {
      tab.dataset.bound = '1';
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        if (target) page(target);
      });
    }
  });

  // Mostra ou oculta o tab de admin conforme privilégio
  const adminTab = document.getElementById('tab-nav-admin');
  if (adminTab) {
    if (isAdmin()) {
      adminTab.classList.remove('hidden');
    } else {
      adminTab.classList.add('hidden');
    }
  }
}

// Update active tab based on current path
function updateActiveTab(path) {
  const navTabs = document.querySelectorAll('.app-nav-tab');
  navTabs.forEach(tab => {
    const target = tab.dataset.target;
    if (target === path) {
      tab.classList.add('active', 'text-primary', 'rounded-full');
      tab.classList.remove('text-on-surface-variant');
    } else {
      tab.classList.remove('active', 'text-primary');
      tab.classList.add('text-on-surface-variant', 'hover:text-primary', 'rounded-full');
    }
  });

  // Atualiza visibilidade do tab admin caso estado de auth tenha mudado
  const adminTab = document.getElementById('tab-nav-admin');
  if (adminTab) {
    if (isAdmin()) {
      adminTab.classList.remove('hidden');
    } else {
      adminTab.classList.add('hidden');
    }
  }
}

page('', () => {
  if (appStore.state.currentUser) {
    page.redirect('/dashboard');
  } else {
    LoginView.render();
  }
});

page('/', () => {
  if (appStore.state.currentUser) {
    page.redirect('/dashboard');
  } else {
    LoginView.render();
  }
});

function hideLoginView() {
  const loginView = document.getElementById('view-login-inicial');
  if (loginView) loginView.classList.add('hidden');
  const shell = document.getElementById('main-app-shell');
  if (shell) shell.classList.remove('hidden');
}

page('/dashboard', () => {
  if (!appStore.state.currentUser) {
    page.redirect('/');
    return;
  }
  hideLoginView();
  const header = document.getElementById('main-app-header');
  if (header) header.classList.remove('hidden');
  updateActiveTab('/dashboard');
  DashboardView.render();
});

page('/lista/:id', (ctx) => {
  if (!appStore.state.currentUser) {
    page.redirect('/');
    return;
  }
  hideLoginView();
  updateActiveTab('');
  const header = document.getElementById('main-app-header');
  if (header) header.classList.add('hidden');
  const listId = ctx.params.id;
  ListDetailView.render(listId);
});

function guardedRoute(renderFn, navPath) {
  return () => {
    if (!appStore.state.currentUser) { page.redirect('/'); return; }
    hideLoginView();
    const header = document.getElementById('main-app-header');
    if (header) header.classList.remove('hidden');
    updateActiveTab(navPath);
    renderFn();
  };
}

page('/carteira', guardedRoute(() => WalletView.render(),  '/carteira'));
page('/historico',guardedRoute(() => HistoryView.render(), '/historico'));
page('/perfil',   guardedRoute(() => ProfileView.render(),    '/perfil'));
page('/admin',    guardedRoute(() => {
  if (!isAdmin()) {
    page.redirect('/dashboard');
    return;
  }
  AdminView.render();
}, '/admin'));

page('*', () => {
  // Redireciona para dashboard ou login em rotas desconhecidas
  if (appStore.state.currentUser) {
    page.redirect('/dashboard');
  } else {
    page.redirect('/');
  }
});

export function startRouter() {
  initNav();
  page.start({ hashbang: true }); // Hash routing para PWA estático
}
