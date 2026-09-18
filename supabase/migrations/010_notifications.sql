-- Enable pg_net for HTTP requests if not already enabled
create extension if not exists pg_net;

-- Create notifications table
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    body text not null,
    link text,
    is_read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies for notifications
create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Users can update their own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Create tokens table
create table public.user_fcm_tokens (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    token text not null,
    platform text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, token)
);

-- Enable RLS
alter table public.user_fcm_tokens enable row level security;

-- Policies for tokens
create policy "Users can view their own tokens"
    on public.user_fcm_tokens for select
    using (auth.uid() = user_id);

create policy "Users can insert their own tokens"
    on public.user_fcm_tokens for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own tokens"
    on public.user_fcm_tokens for delete
    using (auth.uid() = user_id);

-- Setup realtime for notifications
alter publication supabase_realtime add table public.notifications;

-- Function to update updated_at on fcm tokens
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger on_fcm_token_updated
    before update on public.user_fcm_tokens
    for each row execute procedure public.handle_updated_at();


