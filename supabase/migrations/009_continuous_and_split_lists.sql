-- Migration 009: Continuous and Split Lists

-- 1. Add list_type and split_strategy to shopping_lists
ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS list_type TEXT DEFAULT 'normal' CHECK (list_type IN ('normal', 'continua', 'rateada')),
ADD COLUMN IF NOT EXISTS split_strategy TEXT DEFAULT 'products' CHECK (split_strategy IN ('products', 'value'));

-- 2. Create RPC to insert finance transactions for multiple users bypassing RLS.
-- This is needed because RLS on finance_transactions only allows users to insert their own records.
-- We want the list owner/admin to be able to finalize the list and charge the other participants.

CREATE OR REPLACE FUNCTION public.insert_split_transactions(
  p_list_id uuid,
  p_transactions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_list RECORD;
  v_user_id uuid;
  v_has_permission boolean := false;
  v_shared_user jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 1. Verifica se a lista existe e pega os dados
  SELECT * INTO v_list
  FROM public.shopping_lists
  WHERE id = p_list_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista não encontrada';
  END IF;

  -- 2. Verifica se o usuário tem permissão (Owner ou Admin)
  IF v_list.owner_id = v_user_id THEN
    v_has_permission := true;
  ELSE
    -- Procura o usuário no array shared_users para ver se ele é admin
    FOR v_shared_user IN SELECT * FROM jsonb_array_elements(COALESCE(v_list.shared_users, '[]'::jsonb))
    LOOP
      IF (v_shared_user->>'id')::uuid = v_user_id AND (v_shared_user->>'role') = 'admin' THEN
        v_has_permission := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta lista rateada';
  END IF;

  -- 3. Insere as transações
  -- A função jsonb_populate_recordset pega o JSON e converte para records da tabela
  INSERT INTO public.finance_transactions (
    id, owner_id, description, amount, type, status, category, due_date, created_at
  )
  SELECT 
    (t->>'id')::uuid,
    (t->>'owner_id')::uuid,
    t->>'description',
    (t->>'amount')::numeric,
    t->>'type',
    t->>'status',
    t->>'category',
    (t->>'due_date')::date,
    NOW()
  FROM jsonb_array_elements(p_transactions) AS t;

END;
$$;
