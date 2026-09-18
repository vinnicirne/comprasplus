-- Migration 006: Security Hardening
-- Corrige SEC-003 (global_products UPDATE sem ownership) e SEC-007 (owner_id hijack em listas compartilhadas)

-- =========================================================
-- SEC-003: Adiciona created_by em global_products
-- e restringe UPDATE apenas ao criador do produto
-- =========================================================

ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove a policy de UPDATE permissiva
DROP POLICY IF EXISTS "Atualização pública para produtos globais (frequência)" ON public.global_products;

-- Nova policy: apenas o criador pode atualizar
CREATE POLICY "Apenas o criador pode atualizar produto global"
  ON public.global_products FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Novos inserts devem registrar o criador
DROP POLICY IF EXISTS "Inserção pública para produtos globais" ON public.global_products;
CREATE POLICY "Inserção pública para produtos globais"
  ON public.global_products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- =========================================================
-- SEC-007: Trigger para impedir alteração de owner_id
-- em shopping_lists (evita sequestro de lista compartilhada)
-- =========================================================

CREATE OR REPLACE FUNCTION public.prevent_owner_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != OLD.owner_id THEN
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

-- Remove trigger se já existir (idempotente)
DROP TRIGGER IF EXISTS trg_prevent_owner_id_change ON public.shopping_lists;

CREATE TRIGGER trg_prevent_owner_id_change
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_id_change();
