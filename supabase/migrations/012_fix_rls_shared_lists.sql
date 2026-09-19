-- Drop existing RLS policies to recreate them with explicit TEXT casting for JSONB compatibility
DROP POLICY IF EXISTS "Users can view lists they own or are shared with" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update lists they own or can edit" ON public.shopping_lists;

-- 1. View policy (Owner OR shared user with 'view' or 'edit' permission)
CREATE POLICY "Users can view lists they own or are shared with"
ON public.shopping_lists
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR 
  (shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text)))
);

-- 2. Update policy (Owner OR shared user with 'edit' permission)
CREATE POLICY "Users can update lists they own or can edit"
ON public.shopping_lists
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() 
  OR 
  (shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text, 'permission', 'edit')))
);
