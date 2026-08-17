-- Completa peças que o front-end do Balconista Pro já espera (EncartePage,
-- AiSettingsPage, AiCopilotPanel) mas nunca foram criadas neste banco:
--   1. policies de insert/update em `ai_settings` (a tabela existe, RLS
--      está ligado, mas não tinha nenhuma policy — todo insert/update
--      vindo do front-end caía em 403).
--   2. função `get_ai_settings_safe(org_id)` (front-end chama via RPC,
--      função nunca existia -> 404).
--   3. tabela `flyer_history` (nunca existia -> 404).
-- Tudo aditivo, segue o padrão já usado em `get_my_org_id()` /
-- `is_super_admin()` / "Super Admin Global Access" das tabelas
-- organizations/users. Não altera nem remove nada existente.

-- ==========================================
-- ai_settings: policies por organização + super admin
-- ==========================================
drop policy if exists "Users can view their own org ai_settings" on public.ai_settings;
create policy "Users can view their own org ai_settings"
  on public.ai_settings
  for select
  using (organization_id = public.get_my_org_id());

drop policy if exists "Users can insert their own org ai_settings" on public.ai_settings;
create policy "Users can insert their own org ai_settings"
  on public.ai_settings
  for insert
  with check (organization_id = public.get_my_org_id());

drop policy if exists "Users can update their own org ai_settings" on public.ai_settings;
create policy "Users can update their own org ai_settings"
  on public.ai_settings
  for update
  using (organization_id = public.get_my_org_id())
  with check (organization_id = public.get_my_org_id());

drop policy if exists "Super Admin Global Access" on public.ai_settings;
create policy "Super Admin Global Access"
  on public.ai_settings
  for all
  using (public.is_super_admin());

-- ==========================================
-- get_ai_settings_safe: leitura via RPC (SECURITY DEFINER, mesmo padrão
-- de is_balconista_admin/get_my_org_id) — usada por fetchAiSettings()
-- ==========================================
create or replace function public.get_ai_settings_safe(org_id uuid)
returns setof public.ai_settings
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.ai_settings
  where organization_id = org_id
    and (org_id = public.get_my_org_id() or public.is_super_admin());
$$;

-- ==========================================
-- flyer_history: histórico de encartes gerados (EncartePage)
-- ==========================================
create table if not exists public.flyer_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  image_url text not null,
  product_name text,
  layout_qty integer not null default 1,
  style_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists flyer_history_org_created_idx
  on public.flyer_history (organization_id, created_at desc);

alter table public.flyer_history enable row level security;

drop policy if exists "Users can view their own org flyer_history" on public.flyer_history;
create policy "Users can view their own org flyer_history"
  on public.flyer_history
  for select
  using (organization_id = public.get_my_org_id());

drop policy if exists "Users can insert their own org flyer_history" on public.flyer_history;
create policy "Users can insert their own org flyer_history"
  on public.flyer_history
  for insert
  with check (organization_id = public.get_my_org_id());

drop policy if exists "Users can delete their own org flyer_history" on public.flyer_history;
create policy "Users can delete their own org flyer_history"
  on public.flyer_history
  for delete
  using (organization_id = public.get_my_org_id());

drop policy if exists "Super Admin Global Access" on public.flyer_history;
create policy "Super Admin Global Access"
  on public.flyer_history
  for all
  using (public.is_super_admin());
