import React from 'react';
import { useNavigationStore, type AppView } from '../../../core/store/useNavigationStore';
import { ListChecks, Wallet, BarChart2, Receipt, User, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentView, navigate } = useNavigationStore();

  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', label: 'Listas', icon: <ListChecks size={24} /> },
    { id: 'RANKING', label: 'Ranking', icon: <Trophy size={24} /> },
    { id: 'FINANCE', label: 'Carteira', icon: <Wallet size={24} /> },
    { id: 'REPORTS', label: 'Relatórios', icon: <BarChart2 size={24} /> },
    { id: 'HISTORY', label: 'Histórico', icon: <Receipt size={24} /> },
    { id: 'PROFILE', label: 'Perfil', icon: <User size={24} /> },
  ];

  const activeTab = currentView === 'LIST' ? 'DASHBOARD' : currentView;

  return (
    <div className="flex flex-col h-screen w-full bg-surface text-on-surface overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Header com gradiente verde oficial vazio (Margem Segura / Branding) */}
        <header className="w-full h-10 shrink-0"
          style={{ background: 'linear-gradient(135deg, #006948 0%, #00855d 100%)', boxShadow: 'var(--shadow-primary)' }}
        />
        {children}
      </main>

      {/* Bottom Nav Premium */}
      <nav className="flex items-center justify-around bg-surface-container-lowest border-t border-outline-variant/30 pb-safe shrink-0 shadow-[0_-4px_20px_rgba(0,168,107,0.08)]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-2.5 transition-all"
            >
              <div className={clsx(
                "p-1.5 rounded-2xl transition-all duration-200",
                isActive ? "bg-primary/15 text-primary scale-110" : "text-outline hover:text-on-surface"
              )}>
                {item.icon}
              </div>
              <span className={clsx(
                "text-[10px] mt-0.5 font-semibold transition-colors",
                isActive ? "text-primary" : "text-outline"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
