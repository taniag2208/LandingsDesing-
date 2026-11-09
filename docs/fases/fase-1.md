# Fase 1 · Base SaaS, autenticación, organizaciones y Brand Kit

## 1. Objetivo
Que una empresa pueda registrarse, confirmar su correo, crear su organización, invitar a su equipo con
roles y configurar un Brand Kit persistente — con aislamiento total entre clientes — sin intervención de Tita.

## 2. Alcance

| Funcionalidad | Estado |
|---|---|
| Registro, confirmación por correo, login, logout, recuperación de contraseña | ✅ Real (Supabase Auth) |
| Creación de organización con plan por defecto y Brand Kit inicial | ✅ Real |
| Organización activa por usuario (cambio entre organizaciones) | ✅ Real |
| Roles owner/admin/editor/analyst + matriz de permisos | ✅ Real (UI + RLS) |
| Invitaciones con enlace de un solo uso y límite de asientos | ✅ Real · el **envío por correo** queda para F8 (hoy se copia el enlace) |
| Cambio de rol, retiro de miembros, salida voluntaria, protección del último owner | ✅ Real |
| Brand Kit: logo claro/oscuro, 6 colores con contraste WCAG, tipografías curadas, estilo, imágenes con alt, tono, contacto, redes | ✅ Real (Storage + Postgres) |
| Vista previa en vivo del Brand Kit | ✅ Ilustrativa (contenido de ejemplo, no catálogo) |
| Concurrencia optimista (no sobrescribir cambios de otra persona) | ✅ Real |
| Auditoría de cambios | ✅ Real |
| Plan y límites (lectura) | ✅ Real · consumo medido solo para asientos; resto se instrumenta en su fase |
| Contratos Block Schema v1 y Commerce Engine | ✅ Definidos y probados · sin renderer ni adaptadores |
| Cobro, cambio de plan, panel interno de Tita | 🔜 F8 |

## 3. Arquitectura afectada
App SaaS (`modules/auth`, `modules/tenancy`, `modules/brand-kit`), Facturación (`modules/billing` – entitlements),
contratos de Motor de componentes (`modules/blocks`) y Commerce Engine (`modules/commerce`), `proxy.ts`, Supabase (Auth, Postgres, Storage).

## 4. Componentes
- UI base: `Button`, `ButtonLink`, `Field/Input/Select/Textarea`, `Card`, `Badge`, `Alert`, `SubmitButton`, `Spinner`, `Logo`.
- Shell: `SidebarNav` (secciones futuras deshabilitadas con su fase), `MobileNav`, `OrgSwitcher`, `UserMenu`, `PageHeader`, `SettingsTabs`.
- Auth: `SignInForm`, `SignUpForm` (requisitos de contraseña en vivo), `ForgotPasswordForm`, `ResetPasswordForm`.
- Tenancy: `CreateOrgForm` (slug automático), `AcceptInviteForm`, `OrgSettingsForm`, `InviteForm`, `MemberRow`, `RoleLegend`.
- Brand Kit: `BrandKitEditor` (barra de guardado, Ctrl/⌘+S, aviso de cambios sin guardar), `BrandPreview`, `ColorField`, `DropZone` + `useAssetUpload`, `WordChips`.

## 5. Modelo de datos
Migraciones `supabase/migrations/20261109000100_core_tenancy.sql` y `20261109000200_brand_kit.sql`.
Detalle en [03-modelo-datos.md](../03-modelo-datos.md).

## 6. Endpoints y servicios

| Tipo | Nombre | Descripción |
|---|---|---|
| Route Handler | `GET /auth/confirm` | Verifica `token_hash` (o `code` PKCE) y redirige a `next` interno |
| Server Action | `signUpAction`, `signInAction`, `forgotPasswordAction`, `resetPasswordAction`, `signOutAction` | Auth |
| Server Action | `createOrganizationAction`, `switchOrganizationAction`, `updateOrganizationAction` | Organizaciones |
| Server Action | `inviteMemberAction`, `revokeInvitationAction`, `acceptInvitationAction`, `changeMemberRoleAction`, `removeMemberAction` | Equipo |
| Server Action | `saveBrandKitAction` | Guarda Brand Kit con `expectedVersion` |
| RPC Postgres | `create_organization`, `create_invitation`, `accept_invitation`, `revoke_invitation`, `update_member_role`, `remove_member`, `list_org_members`, `org_entitlements` | Reglas de negocio en BD |
| Storage | `brand-assets/<org_id>/(logo|images)/<uuid>.<ext>` | Subida directa desde el navegador, autorizada por RLS |

## 7. Código implementado
Ver árbol en [01-arquitectura.md](../01-arquitectura.md). Puntos clave:
- `src/modules/tenancy/context.ts` — Data Access Layer (usuario validado, membresías, tenant activo).
- `src/modules/brand-kit/schema.ts` — contrato del Brand Kit (consumido por IA y componentes en F2).
- `src/modules/billing/entitlements.ts` — chequeo de límites/features reutilizable en todas las fases.

## 8. Configuración requerida

**Local**
```bash
npm install
npm run db:start          # Supabase local (Docker)
npm run db:reset          # aplica migraciones
cp .env.example .env.local  # completar con `npx supabase status -o env`
npm run dev
```
Correos locales en Mailpit: http://127.0.0.1:54324

**Producción (Supabase Cloud)**
1. Crear proyecto y aplicar migraciones: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
2. Auth → URL Configuration: `Site URL` = dominio de la app; Redirect URLs = `https://<app>/auth/confirm**`.
3. Auth → Email Templates: copiar `supabase/templates/confirmation.html` y `recovery.html` (usan `token_hash`).
4. Auth → Providers → Email: confirmación obligatoria; política de contraseña ≥10 con mayúsculas, minúsculas y dígitos.
5. Auth → SMTP: configurar SMTP propio con dominio verificado (el de Supabase no es apto para producción).
6. Variables en el hosting: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   `SUPABASE_SECRET_KEY` solo en servidor y aún no se usa en runtime.
7. Dar de alta administradores internos: `insert into platform_admins (user_id) values ('<uuid>');` (SQL, service role).

## 9. Pruebas

| Suite | Comando | Resultado |
|---|---|---|
| Unitarias (Vitest) | `npm test` | 48 pruebas: schemas, permisos, entitlements, contraste, storage, Block Schema |
| Base de datos (pgTAP) | `npm run test:db` | 36 pruebas: aislamiento entre organizaciones, escrituras prohibidas, invitaciones, asientos, último owner, auditoría |
| E2E real (Playwright) | `npm run build && npm start` + `npm run test:e2e` | 17 verificaciones contra Supabase local: registro → correo → organización → Brand Kit con logo → persistencia → concurrencia → invitación → límite de asientos → permisos de editor → manipulación de cookie de tenant → auditoría → recuperación de contraseña → móvil |
| Estáticas | `npm run typecheck` · `npm run lint` · `npm run build` | Sin errores |

## 10. Criterios de aceptación
- [x] Un usuario nuevo completa registro → confirmación → organización → Brand Kit sin ayuda.
- [x] Sin correo confirmado no hay sesión.
- [x] Un usuario no puede leer ni modificar datos de otra organización (probado en BD y en E2E manipulando la cookie).
- [x] Un editor no gestiona equipo ni datos de empresa; un analista solo lee.
- [x] El límite de asientos del plan se respeta en la base de datos.
- [x] El Brand Kit persiste, valida colores/URLs/fuentes, y no sobrescribe cambios concurrentes.
- [x] Los activos solo se pueden escribir en la carpeta de la propia organización; SVG no permitido.
- [x] La interfaz funciona en móvil sin desbordamiento horizontal y tiene estados de carga, vacío y error.
- [x] Las secciones futuras se muestran deshabilitadas con su fase; no hay botones decorativos.

## Pendientes conocidos (declarados)
- Envío de invitaciones por correo (F8). Hoy el enlace se copia y comparte manualmente.
- Edición del perfil del usuario (nombre/avatar) en UI: la BD lo permite; pantalla en F8.
- Eliminación de organización y exportación de datos: F8.
- Rate limiting propio de acciones (Supabase Auth ya limita auth): F2 junto con el control de consumo de IA.
- Paleta visual oficial de Tita Media pendiente de confirmar (tokens provisionales).
