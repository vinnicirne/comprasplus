-- ==========================================================
-- 001_sync_operations.sql
-- Tabela de Operações de Sincronização e Idempotência
-- ==========================================================

create table if not exists public.sync_operations (
  id uuid primary key,                          -- operation_id (UUID) gerado pelo cliente
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  operation_type text not null,                 -- 'create' | 'update' | 'delete' | 'complete_list'
  entity_type text not null,                    -- 'shopping_list' | 'shopping_item' | 'transaction'
  entity_id text not null,                      -- ID da entidade afetada
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',       -- 'pending' | 'processing' | 'synced' | 'failed'
  attempts integer not null default 0,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

create index if not exists idx_sync_ops_user_status on public.sync_operations(user_id, status);
create index if not exists idx_sync_ops_created_at on public.sync_operations(created_at desc);

alter table public.sync_operations enable row level security;

-- RLS 1: Usuário só visualiza suas próprias operações
drop policy if exists "sync_ops_select_own" on public.sync_operations;
create policy "sync_ops_select_own"
  on public.sync_operations for select
  using (auth.uid() = user_id);

-- RLS 2: Cliente SÓ PODE INSERIR com status = 'pending' e user_id = auth.uid()
drop policy if exists "sync_ops_insert_pending_only" on public.sync_operations;
create policy "sync_ops_insert_pending_only"
  on public.sync_operations for insert
  with check (
    auth.uid() is not null 
    and auth.uid() = user_id 
    and status = 'pending'
  );

-- RLS 3: CLIENTE NÃO PODE DAR UPDATE DIRETO (bloqueado para evitar forjar 'synced')
drop policy if exists "sync_ops_no_direct_update" on public.sync_operations;
create policy "sync_ops_no_direct_update"
  on public.sync_operations for update
  using (false);

-- RLS 4: CLIENTE NÃO PODE DELETAR
drop policy if exists "sync_ops_no_direct_delete" on public.sync_operations;
create policy "sync_ops_no_direct_delete"
  on public.sync_operations for delete
  using (false);

-- ==========================================================
-- RPC AUTORIZADA: PROCESSAR OPERAÇÃO COM IDEMPOTÊNCIA
-- ==========================================================
create or replace function public.process_sync_operation(
  p_operation_id uuid,
  p_operation_type text,
  p_entity_type text,
  p_entity_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autorizado. Usuário precisa estar autenticado.';
  end if;

  -- 1. Checagem de Idempotência
  select status into v_existing_status
  from public.sync_operations
  where id = p_operation_id;

  if v_existing_status = 'synced' then
    return jsonb_build_object('success', true, 'idempotent', true, 'message', 'Operação já processada anteriormente');
  end if;

  -- 2. Registra ou atualiza para 'processing'
  insert into public.sync_operations (id, user_id, operation_type, entity_type, entity_id, payload, status, attempts)
  values (p_operation_id, v_user_id, p_operation_type, p_entity_type, p_entity_id, p_payload, 'processing', 1)
  on conflict (id) do update set
    attempts = sync_operations.attempts + 1,
    status = 'processing';

  -- 3. A operação é atômica: se qualquer regra falhar, o PG dispara rollback automático

  -- 4. Marca como 'synced'
  update public.sync_operations
  set status = 'synced',
      processed_at = now()
  where id = p_operation_id;

  return jsonb_build_object('success', true, 'idempotent', false);
exception
  when others then
    update public.sync_operations
    set status = 'failed',
        error_message = SQLERRM,
        processed_at = now()
    where id = p_operation_id;
    raise;
end;
$$;
