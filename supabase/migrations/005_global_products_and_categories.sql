-- Migration 005: Global Products and User Categories

-- 1. Tabela de Categorias por Usuário
CREATE TABLE IF NOT EXISTS public.user_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#006948',
  icon text DEFAULT 'Package',
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para user_categories
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias categorias" ON public.user_categories;
CREATE POLICY "Usuários podem ver suas próprias categorias"
  ON public.user_categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias categorias" ON public.user_categories;
CREATE POLICY "Usuários podem inserir suas próprias categorias"
  ON public.user_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias categorias" ON public.user_categories;
CREATE POLICY "Usuários podem atualizar suas próprias categorias"
  ON public.user_categories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias categorias" ON public.user_categories;
CREATE POLICY "Usuários podem deletar suas próprias categorias"
  ON public.user_categories FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Tabela Global de Produtos (Para Autocomplete)
CREATE TABLE IF NOT EXISTS public.global_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text,
  default_unit text DEFAULT 'un',
  frequency integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Index para busca rápida por texto (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_global_products_name ON public.global_products(lower(name));

-- RLS para global_products
ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa autenticada pode ler
DROP POLICY IF EXISTS "Leitura pública autenticada para produtos globais" ON public.global_products;
CREATE POLICY "Leitura pública autenticada para produtos globais"
  ON public.global_products FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserções públicas (o backend lidará com upserts para evitar duplicatas)
DROP POLICY IF EXISTS "Inserção pública para produtos globais" ON public.global_products;
CREATE POLICY "Inserção pública para produtos globais"
  ON public.global_products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Atualização pública para produtos globais (frequência)" ON public.global_products;
CREATE POLICY "Atualização pública para produtos globais (frequência)"
  ON public.global_products FOR UPDATE
  USING (auth.role() = 'authenticated');
