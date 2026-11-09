-- TITA Landing Studio · Fase 1 · instalación completa en Supabase Cloud
-- Pegar en Supabase > SQL Editor y ejecutar UNA sola vez en un proyecto vacío.
-- Generado a partir de supabase/migrations (fuente de verdad).

-- ===== supabase/migrations/20261109000100_core_tenancy.sql =====
-- =============================================================================
-- TITA Landing Studio — Fase 1: base SaaS multi-tenant
-- Organizaciones, membresías, roles, invitaciones, planes configurables,
-- suscripciones, administradores de plataforma y auditoría.
--
-- Principios:
--   * Toda tabla de negocio tiene RLS activado. El cliente (anon/authenticated)
--     nunca escribe directamente en tablas sensibles: las mutaciones con reglas
--     de negocio pasan por funciones SECURITY DEFINER que validan permisos.
--   * Las funciones SECURITY DEFINER fijan search_path = '' y usan nombres
--     calificados para evitar secuestro de search_path.
--   * Los precios NO viven aquí: los planes definen límites y features
--     configurables. Los precios se gestionan en el proveedor de pagos (Fase 8).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.org_role as enum ('owner', 'admin', 'editor', 'analyst');

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'paused'
);

-- -----------------------------------------------------------------------------
-- Utilidades genéricas
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Convierte texto a uuid sin lanzar excepción (útil en políticas de Storage).
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) between 1 and 120),
  avatar_url  text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(v_name, 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Administradores de plataforma (equipo interno de Tita Media)
-- Se gestiona solo con service role / SQL. Nunca desde la app cliente.
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Planes (configurables desde el panel interno; sin precios)
-- -----------------------------------------------------------------------------
create table public.plans (
  code        text primary key check (code ~ '^[a-z0-9][a-z0-9_-]{1,31}$'),
  name        text not null check (char_length(name) between 2 and 60),
  description text check (description is null or char_length(description) <= 500),
  sort_order  integer not null default 0,
  is_public   boolean not null default true,
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  -- Límites numéricos. -1 = ilimitado. Ver src/modules/billing/entitlements.ts
  limits      jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  -- Features booleanas (dominio propio, toppings premium, etc.)
  features    jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  -- Referencias a precios en el proveedor de pagos (Fase 8). Nunca el precio en sí.
  provider_price_refs jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_price_refs) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Solo un plan por defecto.
create unique index plans_single_default on public.plans (is_default) where is_default;

create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Valores iniciales PROVISIONALES. Se ajustan desde el panel interno (Fase 8/12).
insert into public.plans (code, name, description, sort_order, is_default, limits, features) values
  ('starter', 'Starter', 'Para marcas que lanzan sus primeras campañas.', 10, true,
    '{"active_landings": 1, "seats": 2, "ai_generations_monthly": 20, "storage_mb": 500,
      "monthly_visits": 5000, "commerce_connections": 1, "custom_domains": 0}',
    '{"custom_domain": false, "premium_toppings": false, "transactional_landings": true,
      "remove_branding": false, "ab_testing": false, "crm_integrations": false}'),
  ('growth', 'Growth', 'Para equipos con campañas recurrentes.', 20, false,
    '{"active_landings": 5, "seats": 5, "ai_generations_monthly": 100, "storage_mb": 2000,
      "monthly_visits": 50000, "commerce_connections": 2, "custom_domains": 1}',
    '{"custom_domain": true, "premium_toppings": true, "transactional_landings": true,
      "remove_branding": true, "ab_testing": false, "crm_integrations": true}'),
  ('pro', 'Pro', 'Para operaciones de ecommerce con alto volumen.', 30, false,
    '{"active_landings": 20, "seats": 15, "ai_generations_monthly": 500, "storage_mb": 10000,
      "monthly_visits": 250000, "commerce_connections": 5, "custom_domains": 5}',
    '{"custom_domain": true, "premium_toppings": true, "transactional_landings": true,
      "remove_branding": true, "ab_testing": true, "crm_integrations": true}')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Organizaciones (tenant)
-- -----------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  website     text check (website is null or website ~ '^https?://'),
  industry    text check (industry is null or char_length(industry) <= 60),
  country     text not null default 'CO' check (country ~ '^[A-Z]{2}$'),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Membresías
-- -----------------------------------------------------------------------------
create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            public.org_role not null default 'editor',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create trigger memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- Helpers de autorización usados por las políticas RLS.
-- SECURITY DEFINER evita recursión de RLS sobre memberships.
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function public.shares_org_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;

-- -----------------------------------------------------------------------------
-- Suscripciones (una por organización). Se escriben solo desde el backend
-- (RPC de creación de organización o webhooks de pago con service role).
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  organization_id          uuid primary key references public.organizations (id) on delete cascade,
  plan_code                text not null references public.plans (code),
  status                   public.subscription_status not null default 'trialing',
  current_period_start     timestamptz not null default now(),
  current_period_end       timestamptz,
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  -- Excepciones negociadas por cliente (se combinan sobre los límites del plan).
  limit_overrides          jsonb not null default '{}'::jsonb check (jsonb_typeof(limit_overrides) = 'object'),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Invitaciones. El token se entrega una sola vez; solo se guarda su hash.
-- -----------------------------------------------------------------------------
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role            public.org_role not null default 'editor' check (role <> 'owner'),
  token_hash      text not null unique,
  invited_by      uuid references auth.users (id) on delete set null,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users (id) on delete set null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index invitations_org_idx on public.invitations (organization_id);
create unique index invitations_pending_unique
  on public.invitations (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- Auditoría (solo escritura por triggers / funciones definer)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  -- Sin FK: el rastro de auditoría se conserva aunque se elimine la organización.
  organization_id uuid,
  actor_id        uuid,
  action          text not null,
  entity_type     text not null,
  entity_id       text,
  -- Solo metadatos (claves cambiadas), nunca valores con posible PII o secretos.
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_org uuid;
  v_entity text;
  v_changed text[];
begin
  v_org := coalesce(
    (v_row ->> 'organization_id')::uuid,
    case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid end
  );
  v_entity := coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'organization_id');

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}') into v_changed
    from jsonb_object_keys(v_new) k
    where k not in ('updated_at', 'version') and v_new -> k is distinct from v_old -> k;
    if cardinality(v_changed) = 0 then
      return new;
    end if;
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_org,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    v_entity,
    case
      when tg_op = 'UPDATE' then jsonb_build_object('changed', to_jsonb(v_changed))
      when tg_table_name = 'memberships' then jsonb_build_object('role', v_row ->> 'role', 'user_id', v_row ->> 'user_id')
      when tg_table_name = 'invitations' then jsonb_build_object('role', v_row ->> 'role')
      else '{}'::jsonb
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_organizations after update on public.organizations
  for each row execute function public.audit_row_change();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();
create trigger audit_subscriptions after update on public.subscriptions
  for each row execute function public.audit_row_change();
create trigger audit_invitations after insert or update on public.invitations
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Entitlements: límites efectivos = límites del plan + overrides del cliente.
-- -----------------------------------------------------------------------------
create or replace function public.org_entitlements(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not (public.is_org_member(p_org) or public.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'plan_code', p.code,
    'plan_name', p.name,
    'status', s.status,
    'limits', p.limits || s.limit_overrides,
    'features', p.features
  ) into v
  from public.subscriptions s
  join public.plans p on p.code = s.plan_code
  where s.organization_id = p_org;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: crear organización (organización + owner + suscripción por defecto)
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_plan text;
  v_owned int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Antiabuso: un usuario puede crear un número acotado de organizaciones.
  select count(*) into v_owned from public.organizations where created_by = v_uid;
  if v_owned >= 5 then
    raise exception 'org_limit_reached' using errcode = 'P0001';
  end if;

  select code into v_plan from public.plans where is_default and is_active limit 1;
  if v_plan is null then
    raise exception 'no_default_plan' using errcode = 'P0001';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), lower(trim(p_slug)), v_uid)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_uid, 'owner');

  insert into public.subscriptions (organization_id, plan_code, status, current_period_end)
  values (v_org, v_plan, 'trialing', now() + interval '14 days');

  return v_org;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: invitaciones
-- -----------------------------------------------------------------------------
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.org_role)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_seats int;
  v_used int;
  v_email text := lower(trim(p_email));
begin
  if not public.has_org_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'cannot_invite_owner' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  select coalesce(((p.limits || s.limit_overrides) ->> 'seats')::int, -1) into v_seats
  from public.subscriptions s join public.plans p on p.code = s.plan_code
  where s.organization_id = p_org;

  select
    (select count(*) from public.memberships where organization_id = p_org)
    + (select count(*) from public.invitations
       where organization_id = p_org and accepted_at is null and revoked_at is null and expires_at > now())
  into v_used;

  if v_seats is not null and v_seats >= 0 and v_used >= v_seats then
    raise exception 'seat_limit_reached' using errcode = 'P0001';
  end if;

  -- Reemplaza invitaciones pendientes previas al mismo correo.
  update public.invitations set revoked_at = now()
  where organization_id = p_org and lower(email) = v_email
    and accepted_at is null and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitations (organization_id, email, role, token_hash, invited_by)
  values (p_org, v_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));

  return v_token;
end;
$$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.invitations where id = p_invitation;
  if v_org is null or not public.has_org_role(v_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.invitations set revoked_at = now()
  where id = p_invitation and accepted_at is null and revoked_at is null;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invitations;
  v_email text;
  v_confirmed timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then
    raise exception 'email_not_confirmed' using errcode = 'P0001';
  end if;

  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.accepted_at is not null
     or v_inv.expires_at <= now() then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  if lower(v_inv.email) <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (v_inv.organization_id, v_uid, v_inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;

  return v_inv.organization_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: gestión de miembros
-- -----------------------------------------------------------------------------
create or replace function public.update_member_role(p_org uuid, p_user uuid, p_role public.org_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.org_role;
  v_target_role public.org_role;
  v_owners int;
begin
  select role into v_actor_role from public.memberships
  where organization_id = p_org and user_id = (select auth.uid());
  select role into v_target_role from public.memberships
  where organization_id = p_org and user_id = p_user;

  if v_actor_role is null or v_actor_role not in ('owner', 'admin') or v_target_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Un admin no puede tocar owners ni otorgar el rol owner.
  if v_actor_role = 'admin' and (v_target_role = 'owner' or p_role = 'owner') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_target_role = 'owner' and p_role <> 'owner' then
    select count(*) into v_owners from public.memberships
    where organization_id = p_org and role = 'owner';
    if v_owners <= 1 then
      raise exception 'last_owner' using errcode = 'P0001';
    end if;
  end if;

  update public.memberships set role = p_role
  where organization_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_actor_role public.org_role;
  v_target_role public.org_role;
  v_owners int;
begin
  select role into v_actor_role from public.memberships where organization_id = p_org and user_id = v_uid;
  select role into v_target_role from public.memberships where organization_id = p_org and user_id = p_user;

  if v_actor_role is null or v_target_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Se permite salir uno mismo; quitar a otros requiere owner/admin.
  if p_user <> v_uid then
    if v_actor_role not in ('owner', 'admin') or (v_actor_role = 'admin' and v_target_role = 'owner') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  if v_target_role = 'owner' then
    select count(*) into v_owners from public.memberships where organization_id = p_org and role = 'owner';
    if v_owners <= 1 then
      raise exception 'last_owner' using errcode = 'P0001';
    end if;
  end if;

  delete from public.memberships where organization_id = p_org and user_id = p_user;
end;
$$;

-- Lista de miembros con email (auth.users no es accesible por RLS al cliente).
create or replace function public.list_org_members(p_org uuid)
returns table (user_id uuid, email text, full_name text, role public.org_role, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select m.user_id, u.email::text, p.full_name, m.role, m.created_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.platform_admins enable row level security;
alter table public.plans           enable row level security;
alter table public.organizations   enable row level security;
alter table public.memberships     enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.invitations     enable row level security;
alter table public.audit_logs      enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- platform_admins: sin políticas => solo service role.

-- plans: catálogo legible por usuarios autenticados.
create policy plans_select on public.plans for select to authenticated
  using (is_active or public.is_platform_admin());

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id) or public.is_platform_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.org_role[]));

-- memberships (escrituras solo vía RPC)
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- subscriptions (escrituras solo backend/service role)
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- invitations (escrituras solo vía RPC)
create policy invitations_select on public.invitations for select to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

-- audit_logs (solo lectura para owner/admin)
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[])
         or public.is_platform_admin());

-- Columnas que el cliente puede modificar en organizations (slug y created_by son inmutables).
revoke update on public.organizations from authenticated, anon;
grant update (name, website, industry, country) on public.organizations to authenticated;

revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Las RPC sensibles no deben ser invocables por anon.
revoke execute on function public.create_organization(text, text) from public, anon;
revoke execute on function public.create_invitation(uuid, text, public.org_role) from public, anon;
revoke execute on function public.revoke_invitation(uuid) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.update_member_role(uuid, uuid, public.org_role) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.list_org_members(uuid) from public, anon;
revoke execute on function public.org_entitlements(uuid) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.org_role) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.update_member_role(uuid, uuid, public.org_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.list_org_members(uuid) to authenticated;
grant execute on function public.org_entitlements(uuid) to authenticated;

-- Funciones internas de triggers: nadie las invoca directamente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

-- Defensa en profundidad: además de RLS, se retiran privilegios de escritura
-- directa que Supabase concede por defecto a anon/authenticated.
revoke all on public.profiles, public.platform_admins, public.plans, public.organizations,
  public.memberships, public.subscriptions, public.invitations, public.audit_logs from anon;
revoke insert, update, delete on public.memberships, public.subscriptions, public.invitations,
  public.audit_logs, public.plans, public.platform_admins from authenticated;
revoke insert, delete on public.organizations, public.profiles from authenticated;

-- ===== supabase/migrations/20261109000200_brand_kit.sql =====
-- =============================================================================
-- TITA Landing Studio — Fase 1: Brand Kit + almacenamiento de activos de marca
-- =============================================================================

create table public.brand_kits (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- Rutas dentro del bucket brand-assets (formato: <org_id>/<carpeta>/<archivo>)
  logo_path       text check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}/'),
  logo_dark_path  text check (logo_dark_path is null or logo_dark_path ~ '^[0-9a-f-]{36}/'),
  -- La forma detallada de cada JSON se valida en la app con Zod
  -- (src/modules/brand-kit/schema.ts). Aquí se garantiza el tipo base.
  colors          jsonb not null default '{}'::jsonb check (jsonb_typeof(colors) = 'object'),
  typography      jsonb not null default '{}'::jsonb check (jsonb_typeof(typography) = 'object'),
  style           jsonb not null default '{}'::jsonb check (jsonb_typeof(style) = 'object'),
  images          jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 24),
  tone            jsonb not null default '{}'::jsonb check (jsonb_typeof(tone) = 'object'),
  contact         jsonb not null default '{}'::jsonb check (jsonb_typeof(contact) = 'object'),
  social          jsonb not null default '{}'::jsonb check (jsonb_typeof(social) = 'object'),
  -- Control de concurrencia optimista: el cliente envía la versión que editó.
  version         integer not null default 1,
  completed_at    timestamptz,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.brand_kits_bump_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger brand_kits_version before update on public.brand_kits
  for each row execute function public.brand_kits_bump_version();

create trigger audit_brand_kits after update on public.brand_kits
  for each row execute function public.audit_row_change();

-- Cada organización nace con un Brand Kit vacío.
create or replace function public.create_default_brand_kit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.brand_kits (organization_id) values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_default_brand_kit() from public, anon, authenticated;

create trigger organizations_brand_kit after insert on public.organizations
  for each row execute function public.create_default_brand_kit();

alter table public.brand_kits enable row level security;

create policy brand_kits_select on public.brand_kits for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy brand_kits_update on public.brand_kits for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'editor']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'editor']::public.org_role[]));

revoke update on public.brand_kits from authenticated, anon;
grant update (logo_path, logo_dark_path, colors, typography, style, images, tone, contact, social, completed_at)
  on public.brand_kits to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: bucket público de lectura (los activos se muestran en landings
-- publicadas), escritura restringida a miembros con rol de edición y
-- confinada a la carpeta de su organización. SVG excluido (riesgo XSS).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy brand_assets_select on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.is_org_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy brand_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.has_org_role(
      public.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin', 'editor']::public.org_role[]
    )
  );

create policy brand_assets_update on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.has_org_role(
      public.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin', 'editor']::public.org_role[]
    )
  );

create policy brand_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.has_org_role(
      public.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin', 'editor']::public.org_role[]
    )
  );

revoke all on public.brand_kits from anon;
revoke insert, delete on public.brand_kits from authenticated;

