-- Perfis do Balconista Pro IA. auth.users é compartilhado com outros
-- produtos no mesmo projeto Supabase (ex: tecvancel-studio) — por isso
-- toda tabela/função aqui usa o prefixo `balconista_` e o acesso ao
-- app é sempre condicionado a ter uma linha nesta tabela.

create table if not exists public.balconista_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  farmacia_nome text,
  created_at timestamptz not null default now()
);

alter table public.balconista_profiles enable row level security;

-- SECURITY DEFINER pra evitar recursão de RLS ao checar se o usuário é admin.
create or replace function public.is_balconista_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.balconista_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "balconista read own profile" on public.balconista_profiles;
create policy "balconista read own profile"
  on public.balconista_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "balconista admin reads all profiles" on public.balconista_profiles;
create policy "balconista admin reads all profiles"
  on public.balconista_profiles
  for select
  using (public.is_balconista_admin());

-- Sem policy de insert/update/delete: contas de cliente só são criadas
-- pela Edge Function balconista-create-client, que usa a service_role key.
