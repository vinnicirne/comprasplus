-- Migration 007: Join List RPC
-- Permite que usuários entrem em uma lista via código de compartilhamento,
-- contornando o RLS que impede leitura de listas as quais o usuário ainda não pertence.

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

  UPDATE public.shopping_lists
  SET shared_users = v_shared_users
  WHERE id = v_list.id
  RETURNING * INTO v_list;

  RETURN row_to_json(v_list);
END;
$$;
