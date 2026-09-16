import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './core/styles/global.css'
import App from './App.tsx'
import { SplashScreen } from '@capacitor/splash-screen';

// Oculta a splash screen nativa para deixar a nossa animada (React) brilhar!
SplashScreen.hide().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
