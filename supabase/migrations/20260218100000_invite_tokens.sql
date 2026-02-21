create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  role public.app_role not null default 'staff',
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invite_tokens enable row level security;

-- Admins can insert/select/delete tokens
create policy "admins_can_manage_invite_tokens"
  on public.invite_tokens
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Anyone (including unauthenticated) can read a token to validate it during registration
create policy "anyone_can_read_invite_token"
  on public.invite_tokens
  for select
  using (true);
