-- ==========================================================
-- 005_allow_direct_persistence.sql
-- Garante persistência direta nas tabelas do Supabase via .env
-- Habilita políticas para usuários autenticados e chave anon
-- ==========================================================

-- 1. Tabela listas
alter table if exists public.listas enable row level security;

drop policy if exists "listas_select_all" on public.listas;
create policy "listas_select_all"
  on public.listas for select
  using (true);

drop policy if exists "listas_insert_all" on public.listas;
create policy "listas_insert_all"
  on public.listas for insert
  with check (true);

drop policy if exists "listas_update_all" on public.listas;
create policy "listas_update_all"
  on public.listas for update
  using (true)
  with check (true);

drop policy if exists "listas_delete_all" on public.listas;
create policy "listas_delete_all"
  on public.listas for delete
  using (true);

-- 2. Tabela carteira_entradas
alter table if exists public.carteira_entradas enable row level security;

drop policy if exists "carteira_select_all" on public.carteira_entradas;
create policy "carteira_select_all"
  on public.carteira_entradas for select
  using (true);

drop policy if exists "carteira_insert_all" on public.carteira_entradas;
create policy "carteira_insert_all"
  on public.carteira_entradas for insert
  with check (true);

drop policy if exists "carteira_update_all" on public.carteira_entradas;
create policy "carteira_update_all"
  on public.carteira_entradas for update
  using (true)
  with check (true);

drop policy if exists "carteira_delete_all" on public.carteira_entradas;
create policy "carteira_delete_all"
  on public.carteira_entradas for delete
  using (true);

-- 3. Tabela historico_compras
alter table if exists public.historico_compras enable row level security;

drop policy if exists "historico_select_all" on public.historico_compras;
create policy "historico_select_all"
  on public.historico_compras for select
  using (true);

drop policy if exists "historico_insert_all" on public.historico_compras;
create policy "historico_insert_all"
  on public.historico_compras for insert
  with check (true);

drop policy if exists "historico_update_all" on public.historico_compras;
create policy "historico_update_all"
  on public.historico_compras for update
  using (true)
  with check (true);

drop policy if exists "historico_delete_all" on public.historico_compras;
create policy "historico_delete_all"
  on public.historico_compras for delete
  using (true);

-- 4. Tabela user_profiles
alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_all" on public.user_profiles;
create policy "user_profiles_select_all"
  on public.user_profiles for select
  using (true);

drop policy if exists "user_profiles_insert_all" on public.user_profiles;
create policy "user_profiles_insert_all"
  on public.user_profiles for insert
  with check (true);

drop policy if exists "user_profiles_update_all" on public.user_profiles;
create policy "user_profiles_update_all"
  on public.user_profiles for update
  using (true)
  with check (true);
