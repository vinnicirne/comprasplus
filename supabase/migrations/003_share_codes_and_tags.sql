-- Add share capabilities to shopping_lists
ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;

-- Drop existing RLS policies to recreate them with sharing in mind
DROP POLICY IF EXISTS "Users can view their own lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON public.shopping_lists;

-- 1. View policy (Owner OR shared user with 'view' or 'edit' permission)
CREATE POLICY "Users can view lists they own or are shared with"
ON public.shopping_lists
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR 
  (shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid())))
);

-- 2. Update policy (Owner OR shared user with 'edit' permission)
CREATE POLICY "Users can update lists they own or can edit"
ON public.shopping_lists
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() 
  OR 
  (shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid(), 'permission', 'edit')))
);

-- Note: We are keeping the items stored as JSONB for now.
-- The application logic will be responsible for setting the `addedBy` and `checkedBy` properties inside each item.
