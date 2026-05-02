-- VeltrixDrive database schema
-- Run this in the Supabase SQL editor.

-- =============================
-- USERS (profile + credits)
-- =============================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credits int not null default 10,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Auto-create profile row on new auth user, with 10 starter credits.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, credits)
  values (new.id, new.email, 10)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================
-- ANALYSES (history)
-- =============================
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  input_type text not null check (input_type in ('url', 'text')),
  input_value text not null,
  language text not null default 'en',
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (auth.uid() = user_id);

-- =============================
-- ATOMIC CREDIT CONSUMPTION RPC
-- =============================
-- Server-side RPC prevents race conditions and client tampering.
create or replace function public.consume_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  update public.users
     set credits = credits - 1
   where id = p_user_id
     and credits > 0
  returning credits into remaining;

  if remaining is null then
    raise exception 'insufficient_credits';
  end if;

  return remaining;
end;
$$;

revoke all on function public.consume_credit(uuid) from public;
grant execute on function public.consume_credit(uuid) to authenticated;
