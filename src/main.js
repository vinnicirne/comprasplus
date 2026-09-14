import './assets/css/global.css';
import { startRouter } from './router/index.js';
import { loadSession } from './services/authService.js';
import { admobService } from './services/admobService.js';

async function init() {
  console.log('App Vite inicializando...');
  await loadSession();
  startRouter();
  admobService.init().catch(err => console.warn('[AdMob] Init warning:', err));
}

init();
