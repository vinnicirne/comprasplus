-- Create sync_operations table
CREATE TABLE IF NOT EXISTS sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID NOT NULL,
    new_data JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS Policies
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;

-- 1. Clients can insert but ONLY with status = 'pending'
CREATE POLICY "Clients can insert pending sync operations"
    ON sync_operations
    FOR INSERT
    TO authenticated
    WITH CHECK (status = 'pending' AND user_id = auth.uid());

-- 2. Clients can read their own operations
CREATE POLICY "Clients can view their own sync operations"
    ON sync_operations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 3. Clients CANNOT update operations directly (prevent status manipulation)
-- No UPDATE policy created for authenticated users. 
-- Only service role (via RPC/Edge Function) should update the status.

-- Create index for faster querying by sync worker
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_operations_user ON sync_operations(user_id);
