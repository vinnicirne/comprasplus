-- Migration 008: Enforce Unique User Categories
-- Prevent users from creating duplicated categories with the same name (case-insensitive)

-- Remove any existing duplicates if there are any (keeping the oldest one)
DELETE FROM public.user_categories a USING (
  SELECT MIN(created_at) as min_date, user_id, lower(name) as lower_name
  FROM public.user_categories
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id 
AND lower(a.name) = b.lower_name 
AND a.created_at <> b.min_date;

-- Add a unique constraint to ensure no duplicate category names per user
-- We use a unique index on lower(name) so 'Mercado' and 'mercado' are considered duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_category 
ON public.user_categories (user_id, lower(name));
