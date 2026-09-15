-- ==========================================================
-- 004_rpc_shopping.sql
-- RPC Transacional & Atômica: Finalização Completa de Lista de Compras
-- Idempotente via sync_operations e integrada ao Ledger Financeiro
-- ==========================================================

create or replace function public.complete_shopping_list(
  p_operation_id uuid,
  p_list_id text,
  p_payment_method text default 'Cartão / Dinheiro',
  p_category text default 'Supermercado'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_list record;
  v_item jsonb;
  v_total_spent numeric(12, 2) := 0.00;
  v_savings numeric(12, 2) := 0.00;
  v_qty numeric;
  v_price numeric;
  v_existing_status text;
  v_history_id text;
  v_trans_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Acesso negado: usuário não autenticado.';
  end if;

  -- 1. Checagem de Idempotência
  select status into v_existing_status
  from public.sync_operations
  where id = p_operation_id;

  if v_existing_status = 'synced' then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Compra já processada anteriormente.'
    );
  end if;

  -- 2. Busca e validação da lista
  select * into v_list
  from public.listas
  where id = p_list_id and user_id = v_user_id;

  if not found then
    raise exception 'Lista não encontrada ou sem permissão de acesso.';
  end if;

  -- 3. Cálculo do total real a partir dos itens marcados como comprados (checked)
  if v_list.items is not null and jsonb_array_length(v_list.items) > 0 then
    for v_item in select * from jsonb_array_elements(v_list.items)
    loop
      if coalesce((v_item->>'checked')::boolean, false) = true then
        v_qty := coalesce((v_item->>'quantity')::numeric, 1);
        v_price := coalesce((v_item->>'price')::numeric, 0);
        v_total_spent := v_total_spent + (v_qty * v_price);
      end if;
    end loop;
  end if;

  -- Economia = Orçamento Previsto - Total Efetivamente Gasto
  if v_list.budget > v_total_spent then
    v_savings := v_list.budget - v_total_spent;
  end if;

  -- 4. Atualiza o status da lista para 'concluida'
  update public.listas
  set status = 'concluida',
      concluida_at = now()
  where id = p_list_id and user_id = v_user_id;

  -- 5. Criação do registro no Histórico de Compras
  v_history_id := 'hist_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);
  
  insert into public.historico_compras (
    id,
    user_id,
    list_id,
    list_name,
    category,
    budget,
    total_spent,
    savings,
    items,
    day,
    month,
    year,
    purchased_at
  ) values (
    v_history_id,
    v_user_id,
    p_list_id,
    v_list.name,
    coalesce(v_list.category, p_category),
    v_list.budget,
    v_total_spent,
    v_savings,
    v_list.items,
    extract(day from now())::integer,
    extract(month from now())::integer,
    extract(year from now())::integer,
    now()
  );

  -- 6. Criação do movimento imutável no Ledger Financeiro (carteira_entradas / despesas)
  v_trans_id := 'trans_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);

  insert into public.carteira_entradas (
    id,
    user_id,
    title,
    amount,
    category,
    status,
    entry_date,
    day,
    month,
    year,
    created_at
  ) values (
    v_trans_id,
    v_user_id,
    'Compra: ' || v_list.name || ' (' || coalesce(v_list.store, 'Mercado') || ')',
    v_total_spent,
    coalesce(v_list.category, p_category),
    'pago', -- registro consolidado
    current_date,
    extract(day from now())::integer,
    extract(month from now())::integer,
    extract(year from now())::integer,
    now()
  );

  -- 7. Marca a operação como 'synced' na tabela de idempotência
  insert into public.sync_operations (
    id,
    user_id,
    operation_type,
    entity_type,
    entity_id,
    payload,
    status,
    attempts,
    processed_at
  ) values (
    p_operation_id,
    v_user_id,
    'complete_list',
    'shopping_list',
    p_list_id,
    jsonb_build_object(
      'total_spent', v_total_spent,
      'savings', v_savings,
      'history_id', v_history_id,
      'transaction_id', v_trans_id
    ),
    'synced',
    1,
    now()
  )
  on conflict (id) do update set
    status = 'synced',
    processed_at = now();

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'total_spent', v_total_spent,
    'savings', v_savings,
    'history_id', v_history_id,
    'transaction_id', v_trans_id
  );
end;
$$;
