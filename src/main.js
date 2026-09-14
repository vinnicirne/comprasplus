import './assets/css/global.css';
import { startRouter } from './router/index.js';
import { loadSession } from './services/authService.js';
import { admobService } from './services/admobService.js';

async function init() {
  console.log('App Vite inicializando...');
  try {
    await loadSession();
  } catch (err) {
    console.warn('Auth session load error:', err);
  }

  // Se não houver sessão Supabase mas houver modo visitante ativo, restaura
  if (!appStore.state.currentUser && localStorage.getItem('compras_plus_guest') === 'true') {
    appStore.state.currentUser = {
      id: 'guest',
      email: 'visitante@comprasplus.app',
      user_metadata: { name: 'Visitante' }
    };
  }

  startRouter();
  admobService.init().catch(err => console.warn('[AdMob] Init warning:', err));
}

init();
