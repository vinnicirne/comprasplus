-- ==========================================================
-- Schema SaaS Oficial: Compras Plus
-- Suporte Multi-inquilino com Supabase Auth & Row Level Security (RLS)
-- Tabela de Perfis & Telefones para Marketing Futuro
-- Execute este script no SQL Editor do seu painel Supabase
-- ==========================================================

-- 1. Criação ou Migração da tabela 'listas' com coluna 'user_id'
create table if not exists public.listas (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  category text not null,
  budget numeric(12, 2) not null default 0.00,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adiciona a coluna 'user_id' e 'store' caso a tabela já tenha sido criada anteriormente sem elas
alter table public.listas add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.listas add column if not exists store text;

-- 2. Índices de performance para consultas ultra-rápidas por usuário e data
create index if not exists idx_listas_user_id on public.listas(user_id);
create index if not exists idx_listas_created_at on public.listas(created_at desc);

-- 3. Habilitação de Segurança por Linha (RLS - Row Level Security)
alter table public.listas enable row level security;

-- 4. Remoção de políticas legadas caso existam
drop policy if exists "Permitir leitura pública de listas" on public.listas;
drop policy if exists "Permitir inserção de listas" on public.listas;
drop policy if exists "Permitir atualização de listas" on public.listas;
drop policy if exists "Permitir exclusão de listas" on public.listas;
drop policy if exists "SaaS: Usuários veem suas próprias listas" on public.listas;
drop policy if exists "SaaS: Usuários criam suas próprias listas" on public.listas;
drop policy if exists "SaaS: Usuários atualizam suas próprias listas" on public.listas;
drop policy if exists "SaaS: Usuários excluem suas próprias listas" on public.listas;

-- 5. Função de Checagem de Administrador (Security Definer para evitar recursão de RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    lower(trim(coalesce(auth.jwt()->>'email', ''))) = 'viniciuscirne@gmail.com'
    or coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Políticas SaaS de Isolamento Estrito por Usuário (Autenticação Obrigatória)
-- Remove qualquer lista órfã sem dono criada anteriormente
delete from public.listas where user_id is null;

drop policy if exists "SaaS: Usuários veem suas próprias listas" on public.listas;
drop policy if exists "SaaS: Usuários veem suas próprias listas ou compartilhadas" on public.listas;
create policy "SaaS: Usuários veem suas próprias listas ou compartilhadas" 
  on public.listas for select 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "SaaS: Usuários criam suas próprias listas" 
  on public.listas for insert 
  with check (
    auth.uid() is not null and auth.uid() = user_id
  );

create policy "SaaS: Usuários atualizam suas próprias listas" 
  on public.listas for update 
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

create policy "SaaS: Usuários excluem suas próprias listas" 
  on public.listas for delete 
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

-- 6. Habilitar Realtime para atualizações imediatas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listas'
  ) then
    alter publication supabase_realtime add table public.listas;
  end if;
end $$;

-- 7. Tabela de Perfis de Usuários (Telefone/WhatsApp para Marketing Futuro & Gestão de Funções)
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  email text,
  phone text,
  marketing_consent boolean default true,
  role text not null default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adiciona a coluna 'role' caso a tabela já tenha sido criada anteriormente
alter table public.user_profiles add column if not exists role text not null default 'user';

alter table public.user_profiles enable row level security;

-- Política de RLS para o próprio usuário: leitura
drop policy if exists "Usuários podem visualizar seu próprio perfil" on public.user_profiles;
create policy "Usuários podem visualizar seu próprio perfil" 
  on public.user_profiles for select 
  using (auth.uid() = id or public.is_admin());

-- Política de RLS para o próprio usuário: inserção
drop policy if exists "Usuários podem criar seu próprio perfil" on public.user_profiles;
create policy "Usuários podem criar seu próprio perfil" 
  on public.user_profiles for insert 
  with check (auth.uid() = id and role = 'user');

-- Política de RLS para o próprio usuário: atualização de dados (sem alterar role)
drop policy if exists "Usuários podem gerenciar seu próprio perfil" on public.user_profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on public.user_profiles;
create policy "Usuários podem atualizar seu próprio perfil" 
  on public.user_profiles for update 
  using (auth.uid() = id) 
  with check (
    auth.uid() = id 
    and role = (select p.role from public.user_profiles p where p.id = auth.uid())
  );

-- Política de RLS para o Administrador visualizar todos os perfis e leads (SEM RECURSÃO)
drop policy if exists "Admins podem visualizar todos os perfis" on public.user_profiles;
create policy "Admins podem visualizar todos os perfis" 
  on public.user_profiles for select 
  using (
    auth.uid() = id
    or lower(trim(coalesce(auth.jwt()->>'email', ''))) = 'viniciuscirne@gmail.com'
    or coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

-- 8. Trigger automática: copia Nome, Telefone, E-mail e define 'admin' para viniciuscirne@gmail.com
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role text;
begin
  -- Se o e-mail for viniciuscirne@gmail.com, atribui privilégio de ADMIN automaticamente
  if lower(trim(new.email)) = 'viniciuscirne@gmail.com' then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  end if;

  insert into public.user_profiles (id, name, email, phone, marketing_consent, role)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, true),
    assigned_role
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    marketing_consent = excluded.marketing_consent,
    role = case 
      when lower(trim(excluded.email)) = 'viniciuscirne@gmail.com' then 'admin' 
      else user_profiles.role 
    end;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Elevação Imediata: Transforma viniciuscirne@gmail.com em ADMIN no banco
update public.user_profiles
set role = 'admin'
where lower(trim(email)) = 'viniciuscirne@gmail.com';

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where lower(trim(email)) = 'viniciuscirne@gmail.com';

-- ==========================================================
-- 10. Tabela de Histórico de Compras (Dia, Mês, Ano e Gastos)
-- ==========================================================
create table if not exists public.historico_compras (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  list_id text,
  list_name text not null,
  category text not null,
  budget numeric(12, 2) not null default 0.00,
  total_spent numeric(12, 2) not null default 0.00,
  savings numeric(12, 2) not null default 0.00,
  items jsonb not null default '[]'::jsonb,
  day integer not null,
  month integer not null,
  year integer not null,
  purchased_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrações: adiciona colunas caso a tabela já exista sem elas
alter table public.historico_compras add column if not exists list_id text;
alter table public.historico_compras add column if not exists savings numeric(12, 2) not null default 0.00;
alter table public.historico_compras add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.historico_compras add column if not exists day integer not null default 1;
alter table public.historico_compras add column if not exists month integer not null default 1;
alter table public.historico_compras add column if not exists year integer not null default 2025;

create index if not exists idx_historico_user_id on public.historico_compras(user_id);
create index if not exists idx_historico_purchased_at on public.historico_compras(purchased_at desc);
create index if not exists idx_historico_year_month on public.historico_compras(year, month);

alter table public.historico_compras enable row level security;

drop policy if exists "SaaS: Usuários veem seu próprio histórico" on public.historico_compras;
create policy "SaaS: Usuários veem seu próprio histórico" 
  on public.historico_compras for select 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

drop policy if exists "SaaS: Usuários criam seu próprio histórico" on public.historico_compras;
create policy "SaaS: Usuários criam seu próprio histórico" 
  on public.historico_compras for insert 
  with check (
    auth.uid() is not null and auth.uid() = user_id
  );

drop policy if exists "SaaS: Usuários atualizam seu próprio histórico" on public.historico_compras;
create policy "SaaS: Usuários atualizam seu próprio histórico" 
  on public.historico_compras for update 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

drop policy if exists "SaaS: Usuários excluem seu próprio histórico" on public.historico_compras;
create policy "SaaS: Usuários excluem seu próprio histórico" 
  on public.historico_compras for delete 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- Habilitar Realtime para historico_compras
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'historico_compras'
  ) then
    alter publication supabase_realtime add table public.historico_compras;
  end if;
end $$;

-- ==========================================================
-- 11. Tabela de Carteira Financeira (Entradas, Salário e Renda Extra)
-- ==========================================================
create table if not exists public.carteira_entradas (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  description text not null,
  amount numeric(12, 2) not null default 0.00,
  category text not null default 'Salário',
  status text not null default 'recebido', -- 'recebido' ou 'a_receber'
  entry_date date not null default current_date,
  day integer not null,
  month integer not null,
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrações: adiciona colunas caso a tabela já exista sem elas
alter table public.carteira_entradas add column if not exists status text not null default 'recebido';
alter table public.carteira_entradas add column if not exists entry_date date not null default current_date;
alter table public.carteira_entradas add column if not exists day integer not null default 1;
alter table public.carteira_entradas add column if not exists month integer not null default 1;
alter table public.carteira_entradas add column if not exists year integer not null default 2025;

create index if not exists idx_carteira_user_id on public.carteira_entradas(user_id);
create index if not exists idx_carteira_date on public.carteira_entradas(entry_date desc);
create index if not exists idx_carteira_year_month on public.carteira_entradas(year, month);

alter table public.carteira_entradas enable row level security;

drop policy if exists "SaaS: Usuários veem suas próprias entradas da carteira" on public.carteira_entradas;
create policy "SaaS: Usuários veem suas próprias entradas da carteira" 
  on public.carteira_entradas for select 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

drop policy if exists "SaaS: Usuários criam suas entradas da carteira" on public.carteira_entradas;
create policy "SaaS: Usuários criam suas entradas da carteira" 
  on public.carteira_entradas for insert 
  with check (
    auth.uid() is not null and auth.uid() = user_id
  );

drop policy if exists "SaaS: Usuários atualizam suas entradas da carteira" on public.carteira_entradas;
create policy "SaaS: Usuários atualizam suas entradas da carteira" 
  on public.carteira_entradas for update 
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

drop policy if exists "SaaS: Usuários excluem suas entradas da carteira" on public.carteira_entradas;
create policy "SaaS: Usuários excluem suas entradas da carteira" 
  on public.carteira_entradas for delete 
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

-- Habilitar Realtime para carteira_entradas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'carteira_entradas'
  ) then
    alter publication supabase_realtime add table public.carteira_entradas;
  end if;
end $$;

-- ==========================================================
-- 12. Tabela de Listas Compartilhadas (Modo Aberto vs Fechado)
-- ==========================================================
create table if not exists public.lista_compartilhamentos (
  id text primary key,
  lista_id text not null references public.listas(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  permission text not null check (permission in ('aberto', 'fechado')) default 'fechado',
  invite_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrações: adiciona colunas caso a tabela já exista sem elas
-- lista_id: adicionada como nullable primeiro para não quebrar linhas existentes
alter table public.lista_compartilhamentos add column if not exists lista_id text references public.listas(id) on delete cascade;
alter table public.lista_compartilhamentos add column if not exists shared_with_user_id uuid references auth.users(id) on delete cascade;
alter table public.lista_compartilhamentos add column if not exists permission text not null default 'fechado';
alter table public.lista_compartilhamentos add column if not exists invite_code text;

-- Adiciona constraint de check em permission se ainda não existir (ignora erro se já existe)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lista_compartilhamentos_permission_check'
  ) then
    alter table public.lista_compartilhamentos
      add constraint lista_compartilhamentos_permission_check
      check (permission in ('aberto', 'fechado'));
  end if;
end $$;

-- Índice único para invite_code (idempotente)
create unique index if not exists idx_compartilhamentos_invite_code_unique on public.lista_compartilhamentos(invite_code) where invite_code is not null;

create index if not exists idx_compartilhamentos_lista on public.lista_compartilhamentos(lista_id);
create index if not exists idx_compartilhamentos_target_user on public.lista_compartilhamentos(shared_with_user_id);
create index if not exists idx_compartilhamentos_target_email on public.lista_compartilhamentos(lower(trim(shared_with_email)));
create index if not exists idx_compartilhamentos_code on public.lista_compartilhamentos(invite_code);

alter table public.lista_compartilhamentos enable row level security;

-- Políticas de RLS para compartilhamento
drop policy if exists "SaaS: Usuários veem compartilhamentos onde são dono ou convidados" on public.lista_compartilhamentos;
drop policy if exists "SaaS: Usuários veem compartilhamentos onde são dono ou convidados ou por convite" on public.lista_compartilhamentos;
drop policy if exists "Anon: Leitura de convite por código" on public.lista_compartilhamentos;

-- Política para usuários autenticados: apenas donos ou membros expressamente vinculados
create policy "SaaS: Usuários veem compartilhamentos onde são dono ou convidados" 
  on public.lista_compartilhamentos for select 
  using (
    auth.uid() = owner_id 
    or auth.uid() = shared_with_user_id 
    or lower(trim(shared_with_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    or public.is_admin()
  );

drop policy if exists "SaaS: Dono cria compartilhamentos de sua lista" on public.lista_compartilhamentos;
drop policy if exists "SaaS: Dono ou convidado cria compartilhamento" on public.lista_compartilhamentos;
create policy "SaaS: Dono ou convidado cria compartilhamento" 
  on public.lista_compartilhamentos for insert 
  with check (
    auth.uid() = owner_id 
    or auth.uid() = shared_with_user_id
  );

drop policy if exists "SaaS: Dono atualiza compartilhamentos de sua lista" on public.lista_compartilhamentos;
drop policy if exists "SaaS: Dono ou convidado por código atualiza compartilhamento" on public.lista_compartilhamentos;
drop policy if exists "SaaS: Dono ou convidado atualiza compartilhamento" on public.lista_compartilhamentos;
create policy "SaaS: Dono ou convidado atualiza compartilhamento" 
  on public.lista_compartilhamentos for update 
  using (
    auth.uid() = owner_id 
    or auth.uid() = shared_with_user_id
    or public.is_admin()
  )
  with check (
    auth.uid() = owner_id 
    or auth.uid() = shared_with_user_id
    or public.is_admin()
  );

drop policy if exists "SaaS: Dono ou convidado exclui compartilhamento" on public.lista_compartilhamentos;
create policy "SaaS: Dono ou convidado exclui compartilhamento" 
  on public.lista_compartilhamentos for delete 
  using (
    auth.uid() = owner_id 
    or auth.uid() = shared_with_user_id 
    or lower(trim(shared_with_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    or public.is_admin()
  );

-- Atualização das Políticas da tabela 'listas' para considerar permissões de compartilhamento vinculadas
drop policy if exists "SaaS: Usuários veem suas próprias listas ou compartilhadas" on public.listas;
create policy "SaaS: Usuários veem suas próprias listas ou compartilhadas" 
  on public.listas for select 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
    or exists (
      select 1 from public.lista_compartilhamentos c 
      where c.lista_id = listas.id 
      and (
        c.shared_with_user_id = auth.uid() 
        or lower(trim(c.shared_with_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
      )
    )
  );

drop policy if exists "SaaS: Usuários atualizam suas próprias listas ou compartilhadas em modo aberto" on public.listas;
create policy "SaaS: Usuários atualizam suas próprias listas ou compartilhadas em modo aberto" 
  on public.listas for update 
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
    or exists (
      select 1 from public.lista_compartilhamentos c 
      where c.lista_id = listas.id 
      and c.permission = 'aberto'
      and (
        c.shared_with_user_id = auth.uid() 
        or lower(trim(c.shared_with_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
      )
    )
  );

-- Habilitar Realtime para lista_compartilhamentos
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lista_compartilhamentos'
  ) then
    alter publication supabase_realtime add table public.lista_compartilhamentos;
  end if;
end $$;

-- 13. Colunas adicionais na tabela 'listas' para data específica e status de conclusão
alter table public.listas add column if not exists date text;
alter table public.listas add column if not exists status text default 'aberta';
alter table public.listas add column if not exists concluida_at timestamp with time zone;

-- 14. Geração automática de ID e suporte à coluna 'store' (Supermercado / Loja)
alter table public.listas alter column id set default gen_random_uuid()::text;
alter table public.listas add column if not exists store text;

-- 15. RPC Segura: Conectar a Lista Compartilhada por Código (Sem expor lista_compartilhamentos indiscriminadamente)
create or replace function public.connect_shared_list_by_code(p_invite_code text)
returns jsonb as $$
declare
  v_share record;
  v_list record;
  v_user_id uuid := auth.uid();
  v_user_email text := lower(trim(coalesce(auth.jwt()->>'email', '')));
begin
  if v_user_id is null then
    raise exception 'Você precisa estar autenticado para conectar a uma lista.';
  end if;

  select * into v_share
  from public.lista_compartilhamentos
  where upper(trim(invite_code)) = upper(trim(p_invite_code))
  limit 1;

  if v_share.id is null then
    raise exception 'Código de convite não encontrado ou expirado.';
  end if;

  select * into v_list
  from public.listas
  where id = v_share.lista_id;

  if v_list.id is null then
    raise exception 'Lista vinculada não encontrada.';
  end if;

  -- Se não for o dono, registra o usuário autenticado como colaborador convidado
  if v_share.owner_id <> v_user_id then
    update public.lista_compartilhamentos
    set shared_with_user_id = v_user_id,
        shared_with_email = case 
          when shared_with_email like 'convite_link@%' then v_user_email 
          else shared_with_email 
        end
    where id = v_share.id;
  end if;

  return jsonb_build_object(
    'id', v_list.id,
    'name', v_list.name,
    'category', v_list.category,
    'budget', v_list.budget,
    'items', v_list.items,
    'permission', v_share.permission,
    'owner_id', v_share.owner_id
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 16. Expansão Financeira (Despesas, Parcelamento, Contas a Pagar & Recorrência) e Autoria
alter table public.carteira_entradas add column if not exists type text not null default 'entrada';
alter table public.carteira_entradas add column if not exists status text not null default 'recebido';
alter table public.carteira_entradas add column if not exists due_date date;
alter table public.carteira_entradas add column if not exists paid_at timestamptz;
alter table public.carteira_entradas add column if not exists is_recurrent boolean default false;
alter table public.carteira_entradas add column if not exists recurrent_period text default 'mensal';
alter table public.carteira_entradas add column if not exists is_installment boolean default false;
alter table public.carteira_entradas add column if not exists installment_current integer;
alter table public.carteira_entradas add column if not exists installment_total integer;
alter table public.carteira_entradas add column if not exists parent_id text;
alter table public.carteira_entradas add column if not exists category text;
alter table public.carteira_entradas add column if not exists related_list_id text;

-- Autoria em listas
alter table public.listas add column if not exists owner_id uuid;
alter table public.listas add column if not exists owner_name text;
alter table public.listas add column if not exists owner_email text;

-- ==========================================================
-- 17. Tabela Global de Produtos (Pré-Lista / Autocomplete)
-- ==========================================================
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- (Opcional) Índice único case-insensitive extra, se necessário, mas a constraint unique acima já cobre o onConflict
create unique index if not exists idx_produtos_name_lower on public.produtos(lower(trim(name)));

alter table public.produtos enable row level security;

-- Política de leitura global: qualquer pessoa (mesmo anônimo, dependendo da config) pode ler para autocomplete.
-- Porém, vamos restringir para usuários autenticados para mais segurança ou deixar liberado para todos visualizarem as sugestões.
drop policy if exists "Leitura global de produtos" on public.produtos;
create policy "Leitura global de produtos" 
  on public.produtos for select 
  using (true);

-- Política de inserção: qualquer usuário autenticado pode cadastrar um novo produto implicitamente.
drop policy if exists "Inserção de produtos autenticada" on public.produtos;
create policy "Inserção de produtos autenticada" 
  on public.produtos for insert 
  with check (auth.uid() is not null);

