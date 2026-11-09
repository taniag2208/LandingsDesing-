# 1. Arquitectura y estructura del proyecto

## Stack

| Capa | Tecnología | Nota |
|---|---|---|
| App SaaS | Next.js 16 (App Router), React 19, TypeScript estricto | `proxy.ts` (antes `middleware`) refresca sesión y protege rutas. |
| Estilos | Tailwind CSS 4 con tokens en `@theme` | Tokens provisionales en `src/app/globals.css`. |
| Datos | Supabase Postgres + RLS | Migraciones versionadas en `supabase/migrations`. |
| Auth | Supabase Auth (email + contraseña, confirmación por `token_hash`) | SSR con `@supabase/ssr`; `getUser()`/`getClaims()` validan el JWT. |
| Archivos | Supabase Storage | Bucket `brand-assets` con políticas por carpeta de organización. |
| Validación | Zod 4 | Mismo esquema en cliente, Server Actions y contratos (bloques, commerce). |
| Pruebas | Vitest (unidad), pgTAP (RLS), Playwright (E2E real) | Ver `docs/fases/fase-1.md`. |
| IA (F2) | Proveedor intercambiable vía adaptador | Recomendado: Claude con salida estructurada validada por Zod. |
| Publicación (F7) | Infra con API de dominios + certificados automáticos | Decisión documentada en F7. |
| Pagos SaaS (F8) | Adaptador `BillingProvider` | Evaluar proveedor local (COP) además de uno internacional. |

## Separación en módulos

Monolito modular: una sola app Next.js, con límites explícitos por carpeta. Cada módulo expone
contratos tipados y no importa internals de otro. Si un módulo necesita escalar por separado
(p. ej. renderer de landings publicadas o ingesta de analítica) se extrae sin reescribir el dominio.

```
src/
├── app/                    # Rutas (UI). Solo composición; sin reglas de negocio.
│   ├── (auth)/             # Pantalla 1: login, registro, recuperación
│   ├── (studio)/           # Shell autenticado: dashboard, brand-kit, settings…
│   ├── auth/confirm/       # Verificación de enlaces de correo
│   ├── onboarding/         # Creación de organización
│   └── invite/[token]/     # Aceptación de invitaciones
├── modules/
│   ├── auth/               # 1. App SaaS — autenticación
│   ├── tenancy/            # 1. App SaaS — organizaciones, roles, equipo, DAL de sesión
│   ├── brand-kit/          # 1. App SaaS — identidad de marca (insumo de IA y componentes)
│   ├── blocks/             # 3. Motor de componentes — contrato Block Schema v1
│   ├── commerce/           # 5. Commerce Engine — contrato normalizado + adaptadores (F4/F5)
│   ├── billing/            # 8. Facturación — planes, límites, entitlements
│   ├── ai/                 # 2. Motor IA (F2)
│   ├── editor/             # 4. Editor visual (F3)
│   ├── publishing/         # 6. Motor de publicación (F7)
│   ├── analytics/          # 7. Analítica (F8)
│   └── admin/              # 9. Administración interna (F8)
├── components/ui|studio    # Design system y shell
├── lib/                    # Supabase clients, env, utilidades
└── proxy.ts                # Sesión + protección de rutas
supabase/
├── migrations/             # Esquema + RLS + RPC
├── templates/              # Correos de auth
└── tests/database/         # pgTAP
tests/unit | tests/e2e
docs/
```

## Flujo de autorización (defensa en profundidad)

1. **Proxy**: sin sesión válida → redirección a `/login?next=…`. No autoriza datos.
2. **DAL** (`modules/tenancy/context.ts`): resuelve usuario (`getUser()` contra Auth), membresías y
   organización activa. La cookie `tls_active_org` es solo una preferencia; se valida contra membresías.
3. **Server Actions**: revalidan sesión + permiso (`can(role, permission)`) y validan con Zod.
4. **Postgres RLS**: única barrera que no se puede saltar desde la app. Escrituras sensibles
   (membresías, invitaciones, planes) solo vía funciones `SECURITY DEFINER` con reglas de negocio.
5. **Privilegios por columna**: el cliente no puede cambiar `slug`, `created_by`, `version`, etc.

## Seguridad transversal (OWASP Top 10 / LLM Top 10)

| Riesgo | Control |
|---|---|
| A01 Broken Access Control | RLS + RPC + pruebas pgTAP de aislamiento; cookie de org validada. |
| A02 Cryptographic Failures | Tokens de invitación: solo hash SHA-256 en BD. Credenciales de tienda cifradas (F4/F5). |
| A03 Injection | Supabase parametriza; colores/fuentes/URLs con listas cerradas y regex; sin HTML libre en bloques. |
| A04 Insecure Design | Concurrencia optimista en Brand Kit; snapshots inmutables al publicar (F7). |
| A05 Misconfiguration | Cabeceras de seguridad en `next.config.ts`; SVG excluido del bucket público. |
| A07 Auth Failures | Contraseña ≥10 con mayúsculas/minúsculas/números; confirmación de correo; mensajes que no enumeran usuarios. |
| A08 Integrity | Webhooks con verificación HMAC e idempotencia (F4/F5). |
| A10 SSRF | Adaptadores solo llaman hosts de plataforma conocidos (`*.myshopify.com`, `*.vtexcommercestable.com.br`). |
| LLM01 Prompt Injection | La salida de IA es datos validados por Zod; nunca código. El contenido del usuario se delimita en el prompt. |
| LLM02 Insecure Output | Renderer con lista cerrada de componentes; todo texto se escapa. |
| LLM04 DoS / costo | Límite mensual por plan + rate limit por organización. |
| LLM09 Overreliance | El schema impide que la IA genere testimonios o precios; condiciones comerciales las define el usuario. |

## Publicación (diseño F7)

- Las landings publicadas se sirven desde la misma base de código vía reescritura por `Host`
  (subdominio `<slug>.<dominio-tita>` o dominio propio verificado) hacia una ruta interna de render.
- El render lee **solo** `published_versions` (snapshot inmutable) — nunca el borrador.
- Datos de producto: caché corta + revalidación; operaciones de carrito siempre en vivo contra la plataforma.
- Evaluar `cacheComponents` para el renderer público (desactivado hoy en el estudio por ser 100 % por sesión).
