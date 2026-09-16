import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { AuthForm } from '../components/AuthForm';

export const LoginView: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Luzes de fundo ambientes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-fixed/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Logotipo Central */}
      <div className="flex flex-col items-center gap-2 mb-10 z-10">
        <div className="relative">
          <ShoppingBag size={56} className="text-primary drop-shadow-md" strokeWidth={1.5} />
          <span className="absolute -bottom-1 -right-2 text-[20px] font-black text-primary">+</span>
        </div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mt-2">
          Compras <span className="text-primary">PLUS</span>
        </h1>
      </div>

      {/* Painel Formulário */}
      <AuthForm />
      
    </div>
  );
};
