-- Criar tabela de transações financeiras
CREATE TABLE public.finance_transactions (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING')),
    category TEXT NOT NULL,
    due_date DATE NOT NULL,
    is_recurrent BOOLEAN DEFAULT false,
    recurrence_period TEXT, -- 'MONTHLY', 'WEEKLY', 'YEARLY'
    is_installment BOOLEAN DEFAULT false,
    installment_info TEXT, -- Ex: '1/12'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver suas próprias transações"
    ON public.finance_transactions FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Usuários podem inserir suas próprias transações"
    ON public.finance_transactions FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
    ON public.finance_transactions FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Usuários podem deletar suas próprias transações"
    ON public.finance_transactions FOR DELETE
    USING (auth.uid() = owner_id);
