import page from 'page';
import { appStore } from '../store/appStore.js';
import { LoginView } from '../views/LoginView.js';
import { DashboardView } from '../views/DashboardView.js';
import { ListDetailView } from '../views/ListDetailView.js';
import { WalletView } from '../views/WalletView.js';
import { ProfileView } from '../views/ProfileView.js';
import { AdminView } from '../views/AdminView.js';
import { HistoryView } from '../views/HistoryView.js';
import { AnalyticsView } from '../views/AnalyticsView.js';
import { isAdmin } from '../services/authService.js';

let closeDrawerFn = null;

export function closeDrawer() {
  if (closeDrawerFn) closeDrawerFn();
}

// Instala eventos para abrir e fechar o Menu Lateral (Drawer)
function setupDrawer() {
  const btnHamburger = document.getElementById('btn-hamburger');
  const drawer = document.getElementById('app-side-drawer');
  const overlay = document.getElementById('app-side-drawer-overlay');

  if (!btnHamburger || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.remove('-translate-x-full');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeDrawerFn = () => {
    drawer.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0', 'pointer-events-none');
  };

  btnHamburger.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
}

// Wire up side nav tab clicks
function initNav() {
  const navTabs = document.querySelectorAll('.app-nav-tab');
  navTabs.forEach(tab => {
    if (!tab.dataset.bound) {
      tab.dataset.bound = '1';
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        if (target) {
          page(target);
          closeDrawer();
        }
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
      tab.classList.add('bg-surface-container', 'text-primary');
      tab.classList.remove('text-on-surface-variant');
    } else {
      tab.classList.remove('bg-surface-container', 'text-primary');
      tab.classList.add('text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-primary');
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
page('/relatorios', guardedRoute(() => AnalyticsView.render(), '/relatorios'));
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
  setupDrawer();
  initNav();
  page.start({ hashbang: true }); // Hash routing para PWA estático
}
