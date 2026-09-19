import { DashboardView } from './modules/shopping/views/DashboardView';
import { AuthProvider } from './modules/auth/components/AuthProvider';
import { useNavigationStore } from './core/store/useNavigationStore';
import { useAuthStore } from './modules/auth/store/useAuthStore';
import { ListView } from './modules/shopping/views/ListView';
import { LoginView } from './modules/auth/views/LoginView';
import { AppLayout } from './modules/shell/components/AppLayout';
import { FinanceView } from './modules/finance/views/FinanceView';
import { ReportsView } from './modules/reports/views/ReportsView';
import { HistoryView } from './modules/history/views/HistoryView';
import { ProfileView } from './modules/profile/views/ProfileView';
import { RankingView } from './modules/ranking/views/RankingView';
import { SplashScreen } from './core/components/SplashScreen';
import { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

import { NotificationListener } from './core/components/NotificationListener';
import { setupCapacitorPush } from './core/services/capacitorPush';
import { requestWebPushPermission } from './core/services/webPush';
import { useEffect } from 'react';

function AppContent() {
  const currentView = useNavigationStore(state => state.currentView);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) {
      setupCapacitorPush(user.id);
      requestWebPushPermission(user.id);
    }

    // Trava o botão Voltar (hardware back button no Android)
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      const state = useNavigationStore.getState();
      // Se não estiver na tela principal, volta para ela
      if (state.currentView !== 'DASHBOARD') {
        state.navigate('DASHBOARD');
      }
      // Se estiver no DASHBOARD, o botão não fará nada (trava a saída do app)
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [user]);

  if (!user) {
    return <LoginView />;
  }

  return (
    <AppLayout>
      <NotificationListener userId={user.id} />
      {currentView === 'DASHBOARD' && <DashboardView />}
      {currentView === 'LIST' && <ListView />}
      {currentView === 'FINANCE' && <FinanceView />}
      {currentView === 'REPORTS' && <ReportsView />}
      {currentView === 'HISTORY' && <HistoryView />}
      {currentView === 'PROFILE' && <ProfileView />}
      {currentView === 'RANKING' && <RankingView />}
    </AppLayout>
  );
}

function App() {
  // Splash screen só aparece uma vez por sessão
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('comprasplus_splashed');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('comprasplus_splashed', '1');
    setShowSplash(false);
  };

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className="w-full max-w-[600px] mx-auto min-h-screen flex flex-col relative shadow-2xl bg-background overflow-hidden">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
