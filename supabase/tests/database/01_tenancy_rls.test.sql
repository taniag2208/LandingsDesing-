-- Pruebas de aislamiento multi-tenant y reglas de negocio de la Fase 1.
-- Ejecutar con: npm run test:db   (requiere `supabase start`)
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ---------------------------------------------------------------------------
-- Fixtures: tres usuarios confirmados
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@marca-a.test',   now(), '{"full_name":"Ana"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@marca-b.test',  now(), '{"full_name":"Beto"}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'caro@marca-a.test',  now(), '{"full_name":"Caro"}', 'authenticated', 'authenticated');

select is((select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana', 'El trigger crea el perfil al registrarse');

create or replace function pg_temp.login(p_uid uuid, p_email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------
-- Creación de organizaciones
-- ---------------------------------------------------------------------------
select pg_temp.login('11111111-1111-1111-1111-111111111111', 'ana@marca-a.test');
select lives_ok($$ select public.create_organization('Marca A', 'marca-a') $$, 'Ana crea su organización');
select pg_temp.logout();
select pg_temp.login('22222222-2222-2222-2222-222222222222', 'beto@marca-b.test');
select lives_ok($$ select public.create_organization('Marca B', 'marca-b') $$, 'Beto crea su organización');
select pg_temp.logout();

create temp table ctx as select
  (select id from public.organizations where slug = 'marca-a') as org_a,
  (select id from public.organizations where slug = 'marca-b') as org_b;
grant select on ctx to authenticated;

select is((select role::text from public.memberships m, ctx
           where m.organization_id = ctx.org_a and m.user_id = '11111111-1111-1111-1111-111111111111'),
  'owner', 'El creador queda como owner');
select is((select plan_code from public.subscriptions s, ctx where s.organization_id = ctx.org_a),
  'starter', 'La organización recibe el plan por defecto');
select is((select count(*)::int from public.brand_kits b, ctx where b.organization_id = ctx.org_a),
  1, 'La organización nace con Brand Kit');

select throws_ok($$ select public.create_organization('Sin sesion', 'sin-sesion') $$,
  '42501', 'not_authenticated', 'Sin sesión no se crea organización');

select pg_temp.login('11111111-1111-1111-1111-111111111111', 'ana@marca-a.test');
select throws_ok($$ select public.create_organization('Duplicada', 'marca-b') $$,
  '23505', null, 'El slug es único');
select throws_ok($$ select public.create_organization('Mal slug', 'Mal Slug!') $$,
  '23514', null, 'El slug se valida');

-- ---------------------------------------------------------------------------
-- Aislamiento: Ana (org A) no ve nada de la org B
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.organizations), 1, 'Ana solo ve su organización');
select is((select count(*)::int from public.brand_kits b, ctx where b.organization_id = ctx.org_b),
  0, 'Ana no ve el Brand Kit de B');
select is((select count(*)::int from public.subscriptions s, ctx where s.organization_id = ctx.org_b),
  0, 'Ana no ve la suscripción de B');
select is((select count(*)::int from public.memberships m, ctx where m.organization_id = ctx.org_b),
  0, 'Ana no ve miembros de B');
select is((select count(*)::int from public.profiles), 1, 'Ana solo ve perfiles con quienes comparte org');

update public.brand_kits set tone = '{"voice":"hackeado"}' where organization_id = (select org_b from ctx);
update public.organizations set name = 'Hackeada' where id = (select org_b from ctx);
select throws_ok($$ select public.org_entitlements((select org_b from ctx)) $$,
  '42501', 'forbidden', 'Ana no puede leer entitlements de B');
select throws_ok($$ select * from public.list_org_members((select org_b from ctx)) $$,
  '42501', 'forbidden', 'Ana no lista miembros de B');
select throws_ok($$ select public.create_invitation((select org_b from ctx), 'x@y.test', 'editor') $$,
  '42501', 'forbidden', 'Ana no invita en B');
select pg_temp.logout();

select is((select tone::text from public.brand_kits b, ctx where b.organization_id = ctx.org_b),
  '{}', 'El update cruzado sobre Brand Kit no tuvo efecto');
select is((select name from public.organizations where slug = 'marca-b'),
  'Marca B', 'El update cruzado sobre organización no tuvo efecto');

-- ---------------------------------------------------------------------------
-- Escrituras directas prohibidas
-- ---------------------------------------------------------------------------
select pg_temp.login('11111111-1111-1111-1111-111111111111', 'ana@marca-a.test');
select throws_ok($$ insert into public.memberships (organization_id, user_id, role)
                   select org_b, '11111111-1111-1111-1111-111111111111', 'owner' from ctx $$,
  '42501', null, 'No se puede auto-insertar membresía');
select throws_ok($$ update public.subscriptions set plan_code = 'pro' $$,
  '42501', null, 'El cliente no puede cambiar su plan');
select throws_ok($$ update public.organizations set slug = 'otro' $$,
  '42501', null, 'El slug es inmutable para el cliente');
select throws_ok($$ insert into public.platform_admins values ('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'Nadie se autopromueve a admin de plataforma');

-- Ana sí edita su Brand Kit y la versión sube
update public.brand_kits set tone = '{"voice":"cercano"}' where organization_id = (select org_a from ctx);
select is((select version from public.brand_kits b, ctx where b.organization_id = ctx.org_a),
  2, 'Editar el Brand Kit incrementa la versión');

-- ---------------------------------------------------------------------------
-- Invitaciones
-- ---------------------------------------------------------------------------
create temp table inv as select public.create_invitation((select org_a from ctx), 'Caro@marca-a.test', 'editor') as token;
grant select on inv to authenticated;
select throws_ok($$ select public.create_invitation((select org_a from ctx), 'z@z.test', 'owner') $$,
  'P0001', 'cannot_invite_owner', 'No se invita como owner');
-- Límite de asientos del plan starter = 2 (1 miembro + 1 invitación pendiente)
select throws_ok($$ select public.create_invitation((select org_a from ctx), 'otro@marca-a.test', 'editor') $$,
  'P0001', 'seat_limit_reached', 'Se respeta el límite de asientos del plan');
select pg_temp.logout();

select pg_temp.login('22222222-2222-2222-2222-222222222222', 'beto@marca-b.test');
select throws_ok($$ select public.accept_invitation((select token from inv)) $$,
  'P0001', 'invitation_email_mismatch', 'Solo el correo invitado puede aceptar');
select pg_temp.logout();

select pg_temp.login('33333333-3333-3333-3333-333333333333', 'caro@marca-a.test');
select is(public.accept_invitation((select token from inv)), (select org_a from ctx), 'Caro acepta la invitación');
select throws_ok($$ select public.accept_invitation((select token from inv)) $$,
  'P0001', 'invalid_invitation', 'El token es de un solo uso');
-- Un editor no puede gestionar miembros ni editar la organización
select throws_ok($$ select public.update_member_role((select org_a from ctx), '33333333-3333-3333-3333-333333333333', 'admin') $$,
  '42501', 'forbidden', 'Un editor no se autoasciende');
update public.organizations set name = 'Cambio editor' where id = (select org_a from ctx);
select pg_temp.logout();
select is((select name from public.organizations where slug = 'marca-a'), 'Marca A',
  'Un editor no puede editar datos de la organización');

-- ---------------------------------------------------------------------------
-- Protección del último owner y auditoría
-- ---------------------------------------------------------------------------
select pg_temp.login('11111111-1111-1111-1111-111111111111', 'ana@marca-a.test');
select throws_ok($$ select public.update_member_role((select org_a from ctx), '11111111-1111-1111-1111-111111111111', 'editor') $$,
  'P0001', 'last_owner', 'No se puede degradar al último owner');
select throws_ok($$ select public.remove_member((select org_a from ctx), '11111111-1111-1111-1111-111111111111') $$,
  'P0001', 'last_owner', 'El último owner no puede salir');
select lives_ok($$ select public.update_member_role((select org_a from ctx), '33333333-3333-3333-3333-333333333333', 'analyst') $$,
  'El owner cambia roles');
select ok((select count(*) from public.audit_logs a, ctx where a.organization_id = ctx.org_a) >= 3,
  'Los cambios quedan en auditoría visible para owner');
select pg_temp.logout();

select pg_temp.login('33333333-3333-3333-3333-333333333333', 'caro@marca-a.test');
select is((select count(*)::int from public.audit_logs), 0, 'Un analista no ve la auditoría');
select pg_temp.logout();

select * from finish();
rollback;
