import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, EyeOff, Eye, AlertCircle } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { signInWithEmail, signUp, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isLogin) {
      await signInWithEmail(email, password);
    } else {
      await signUp(email, password);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/30 rounded-[28px] p-6 shadow-xl z-10 flex flex-col gap-5"
    >
      {/* Toggle Login / Register */}
      <div className="flex bg-surface-container rounded-2xl p-1 relative mb-2">
        <div 
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-xl transition-all duration-300 shadow-sm ${!isLogin ? 'translate-x-full left-1' : 'left-1'}`}
        ></div>
        <button 
          type="button"
          onClick={() => { setIsLogin(true); clearError(); }}
          className={`flex-1 py-2.5 text-[13px] font-bold z-10 transition-colors ${isLogin ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Entrar
        </button>
        <button 
          type="button"
          onClick={() => { setIsLogin(false); clearError(); }}
          className={`flex-1 py-2.5 text-[13px] font-bold z-10 transition-colors ${!isLogin ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Criar Conta
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 bg-error-container text-on-error-container p-3 rounded-2xl text-[13px] border border-error/20">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="leading-snug">{error}</p>
        </div>
      )}

      {/* Campo de Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-on-surface-variant ml-1">Email</label>
        <div className="relative flex items-center group">
          <Mail size={18} className="absolute left-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input 
            type="email" 
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 bg-surface border border-outline-variant/50 rounded-2xl pl-11 pr-4 text-on-surface placeholder-outline text-[15px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            required
          />
        </div>
      </div>

      {/* Campo de Senha */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-on-surface-variant ml-1">Senha</label>
        <div className="relative flex items-center group">
          <Lock size={18} className="absolute left-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-14 bg-surface border border-outline-variant/50 rounded-2xl pl-11 pr-12 text-on-surface placeholder-outline text-[15px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            required
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-outline hover:text-on-surface-variant transition-colors"
          >
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {/* Botão Principal de Ação */}
      <button 
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full h-14 bg-primary hover:bg-primary-container text-on-primary font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
        ) : (
          isLogin ? 'ENTRAR' : 'CRIAR CONTA'
        )}
      </button>

    </form>
  );
};
