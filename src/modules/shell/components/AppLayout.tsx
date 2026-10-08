import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-surface text-on-surface overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
