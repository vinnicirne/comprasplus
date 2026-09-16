import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../../core/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null, session: Session | null) => void;
  signInWithEmail: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  setUser: (user, session) => set({ user, session, isLoading: false }),
  clearError: () => set({ error: null }),
  
  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Allow passwordless sign in if password is not provided
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        set({ user: data.user, session: data.session, isLoading: false });
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      if (!password) throw new Error('Password is required for signup');
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      set({ user: data.user, session: data.session, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, isLoading: false });
    } catch (error) {
      console.error('Error signing out', error);
      set({ isLoading: false });
    }
  }
}));
