import { createClient } from '@supabase/supabase-js';

const getInitialSupabaseUrl = () => {
  // 1. Vite env (lido diretamente do .env em tempo de compilação/dev)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    if (v && String(v).trim()) return String(v).trim();
  }
  // 2. window.__ENV__ (gerado por generate-env.js para web/Vercel/Capacitor)
  if (typeof window !== 'undefined' && window.__ENV__) {
    const val = window.__ENV__.VITE_SUPABASE_URL ||
                window.__ENV__.NEXT_PUBLIC_SUPABASE_URL || 
                window.__ENV__.NEXT_SUPABASE_URL || 
                window.__ENV__.SUPABASE_URL;
    if (val && String(val).trim()) return String(val).trim();
  }
  // 3. Fallback seguro
  return 'https://xlxuwqcszhxxzofebkjb.supabase.co';
};

const getInitialSupabaseKey = () => {
  // 1. Vite env (lido diretamente do .env em tempo de compilação/dev)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (v && String(v).trim()) return String(v).trim();
  }
  // 2. window.__ENV__ (gerado por generate-env.js para web/Vercel/Capacitor)
  if (typeof window !== 'undefined' && window.__ENV__) {
    const val = window.__ENV__.VITE_SUPABASE_ANON_KEY ||
                window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                window.__ENV__.NEXT_PUBLIC_SUPABASE_KEY || 
                window.__ENV__.NEXT_SUPABASE_KEY || 
                window.__ENV__.NEXT_SUPABASE_ANON_KEY || 
                window.__ENV__.SUPABASE_KEY;
    if (val && String(val).trim()) return String(val).trim();
  }
  // 3. Fallback seguro
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhseHV3cWNzemh4eHpvZmVia2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjUxNzYsImV4cCI6MjEwNDY0MTE3Nn0.ME_Zo11tBK-U5CuYnLtAGvwuok-YZFcPfuLbaZxiVjE';
};

export const supabaseUrl = getInitialSupabaseUrl();
export const supabaseKey = getInitialSupabaseKey();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

