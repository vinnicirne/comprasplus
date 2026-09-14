import { createClient } from '@supabase/supabase-js';

const getInitialSupabaseUrl = () => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const val = window.__ENV__.NEXT_PUBLIC_SUPABASE_URL || 
                window.__ENV__.NEXT_SUPABASE_URL || 
                window.__ENV__.SUPABASE_URL;
    if (val && String(val).trim()) return String(val).trim();
  }
  return 'https://xlxuwqcszhxxzofebkjb.supabase.co';
};

const getInitialSupabaseKey = () => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const val = window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                window.__ENV__.NEXT_PUBLIC_SUPABASE_KEY || 
                window.__ENV__.NEXT_SUPABASE_KEY || 
                window.__ENV__.NEXT_SUPABASE_ANON_KEY || 
                window.__ENV__.SUPABASE_KEY;
    if (val && String(val).trim()) return String(val).trim();
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhseHV3cWNzemh4eHpvZmVia2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjUxNzYsImV4cCI6MjEwNDY0MTE3Nn0.ME_Zo11tBK-U5CuYnLtAGvwuok-YZFcPfuLbaZxiVjE';
};

const supabaseUrl = getInitialSupabaseUrl();
const supabaseKey = getInitialSupabaseKey();

export const supabase = createClient(supabaseUrl, supabaseKey);
