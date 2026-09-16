-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    store TEXT,
    category TEXT NOT NULL,
    budget NUMERIC,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'aberta',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_name TEXT,
    "isShared" BOOLEAN DEFAULT false
);

-- RLS Policies
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- 1. Users can create their own lists
CREATE POLICY "Users can create their own lists"
    ON public.shopping_lists
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- 2. Users can view their own lists or shared lists
CREATE POLICY "Users can view their own lists"
    ON public.shopping_lists
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

-- 3. Users can update their own lists
CREATE POLICY "Users can update their own lists"
    ON public.shopping_lists
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

-- 4. Users can delete their own lists
CREATE POLICY "Users can delete their own lists"
    ON public.shopping_lists
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_lists_owner ON public.shopping_lists(owner_id);
