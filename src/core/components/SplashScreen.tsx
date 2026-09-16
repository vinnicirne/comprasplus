import React, { useEffect, useState } from 'react';

const steps = [
  { at: 85, text: 'Carregando cotações locais...' },
  { at: 94, text: 'Preparando seu carrinho...' },
  { at: 100, text: 'Pronto para comprar!' },
];

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(72);
  const [statusText, setStatusText] = useState('Sincronizando suas listas...');
  const [done, setDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDone(true);
          // Fade out then call onComplete
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500);
          }, 600);
          return 100;
        }
        const next = prev + 1;
        const step = steps.find(s => s.at === next);
        if (step) setStatusText(step.text);
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col min-h-screen bg-surface transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-28 w-72 h-72 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed-dim/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col w-full min-h-screen justify-between items-center px-5 py-8 relative overflow-hidden pt-safe pb-safe">
        
        {/* Header */}
        <header className="w-full flex justify-between items-center z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Controle Inteligente</span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold">
            v2.4.0
          </div>
        </header>

        {/* Main content */}
        <main className="w-full flex flex-col items-center text-center z-10 my-auto py-4 max-w-xs">
          {/* Icon */}
          <div className="relative group mb-6">
            <div className="absolute inset-0 bg-primary/25 rounded-3xl blur-xl transform scale-110 group-hover:scale-125 transition-transform duration-700" />
            <div className="relative w-28 h-28 rounded-3xl bg-surface-container-lowest p-2 shadow-xl flex items-center justify-center overflow-hidden">
              <img
                src="/icon-512.png"
                alt="Compras Plus"
                className="w-full h-full object-cover rounded-2xl drop-shadow-sm transform hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-[30px] leading-[36px] font-black tracking-tight text-on-surface">
              Compras <span className="text-primary">Plus</span>
            </h1>
            <p className="text-sm text-on-surface-variant leading-snug px-2">
              Economize tempo e dinheiro em cada compra no mercado.
            </p>
          </div>

          {/* Tags */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 text-primary text-xs font-bold bg-primary-fixed/30 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
              Feito no Brasil
            </span>
            <span className="inline-flex items-center gap-1 text-on-secondary-container text-xs font-bold bg-secondary-container/40 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>savings</span>
              Economia Real
            </span>
          </div>
        </main>

        {/* Footer with progress */}
        <footer className="w-full flex flex-col items-center gap-4 z-10 pb-1 max-w-sm">
          <div className="w-full bg-surface-container-lowest p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-primary ${done ? '' : 'animate-spin'}`}
                  style={{ fontSize: '18px' }}
                >
                  {done ? 'check_circle' : 'sync'}
                </span>
                <span className="text-[13px] font-semibold text-on-surface">{statusText}</span>
              </div>
              <span className="text-[13px] font-bold text-primary tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '15px' }}>lock</span>
              <span>Criptografia de ponta a ponta</span>
              <span>•</span>
              <span className="text-primary font-semibold">100% Seguro</span>
            </div>
            <p className="text-[11px] text-outline">
              Compras Plus Tecnologia Ltda.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
