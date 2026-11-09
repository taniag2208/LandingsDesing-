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
