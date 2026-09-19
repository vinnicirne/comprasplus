-- MIGRATION 011: SECURITY PATCHES
-- Aplica as correções das vulnerabilidades (SEC-001, SEC-002 e SEC-003) no banco de dados ativo

-- ==========================================
-- CORREÇÃO SEC-002: IDOR em finance_transactions
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON public.finance_transactions;

CREATE POLICY "Usuários podem atualizar suas próprias transações"
    ON public.finance_transactions FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- CORREÇÃO SEC-003: Impede hijacking em shopping_lists
-- ==========================================
CREATE OR REPLACE FUNCTION public.prevent_owner_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.joining_list', true) = 'true' THEN
    -- Bypass para permitir a entrada de usuários na lista
    NULL;
  ELSIF auth.uid() != OLD.owner_id THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Não é permitido alterar o proprietário da lista.' USING ERRCODE = '42501';
    END IF;
    IF NEW.shared_users IS DISTINCT FROM OLD.shared_users THEN
      RAISE EXCEPTION 'Apenas o dono pode gerenciar o compartilhamento da lista.' USING ERRCODE = '42501';
    END IF;
    IF NEW.share_code IS DISTINCT FROM OLD.share_code THEN
      RAISE EXCEPTION 'Apenas o dono pode alterar o código de compartilhamento.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- (O trigger trg_prevent_owner_id_change que usa essa função já existe e será atualizado automaticamente pois a função foi substituída)

-- ==========================================
-- CORREÇÃO SEC-001: Mass Assignment na entrada de listas
-- ==========================================
CREATE OR REPLACE FUNCTION public.join_shopping_list(
  p_share_code text,
  p_permission text,
  p_user_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list RECORD;
  v_shared_users jsonb;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- BLOQUEIO DE SEGURANÇA: Restringe p_permission
  IF p_permission NOT IN ('view', 'edit') THEN
    RAISE EXCEPTION 'Permissão inválida. Apenas view ou edit permitidos.';
  END IF;

  SELECT * INTO v_list
  FROM public.shopping_lists
  WHERE share_code = p_share_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código não encontrado';
  END IF;

  -- Se já for o dono, não faz nada e retorna a lista
  IF v_list.owner_id = v_user_id THEN
    RETURN row_to_json(v_list);
  END IF;

  v_shared_users := COALESCE(v_list.shared_users, '[]'::jsonb);

  -- Recria o array de usuários filtrando o usuário atual (se já existia) e adicionando-o com a nova permissão
  WITH new_users AS (
    SELECT user_elem
    FROM jsonb_array_elements(v_shared_users) AS user_elem
    WHERE user_elem->>'id' != v_user_id::text
    UNION ALL
    SELECT json_build_object('id', v_user_id, 'permission', p_permission, 'name', p_user_name)::jsonb
  )
  SELECT jsonb_agg(user_elem) INTO v_shared_users FROM new_users;

  -- Sinaliza para o trigger que estamos dentro do RPC de entrar na lista
  PERFORM set_config('app.joining_list', 'true', true);

  UPDATE public.shopping_lists
  SET shared_users = v_shared_users
  WHERE id = v_list.id
  RETURNING * INTO v_list;

  RETURN row_to_json(v_list);
END;
$$;
