# TITA Landing Studio

**Imagina. Personaliza. Publica.** — SaaS de Tita Media para crear, conectar y publicar landings
promocionales y transaccionales conectadas a Shopify y VTEX, con IA y en autoservicio.

## Estado

| Fase | Módulo | Estado |
|---|---|---|
| F1 | Base SaaS, auth, organizaciones, equipo, Brand Kit | ✅ Implementada y probada |
| F1 | Contratos: Block Schema v1, Commerce Engine, entitlements | ✅ Definidos y probados (sin implementación de motores) |
| F2 | Discovery, motor de bloques, generación IA | 🔜 |
| F3 | Editor visual | 🔜 |
| F4 | Shopify + catálogo manual | 🔜 |
| F5 | VTEX | 🔜 |
| F6 | Toppings | 🔜 |
| F7 | Publicación y dominios | 🔜 |
| F8 | Analítica, planes, pagos, admin interno | 🔜 |
| F9 | QA integral y lanzamiento | 🔜 |

Ninguna integración externa (Shopify, VTEX, IA, pagos, dominios) está conectada todavía.

## Inicio rápido

Requisitos: Node 22+, Docker.

```bash
npm install
npm run db:start                 # Supabase local
npm run db:reset                 # migraciones
cp .env.example .env.local       # valores de `npx supabase status -o env`
npm run dev                      # http://localhost:3000
```

Correos de confirmación/recuperación en local: Mailpit en http://127.0.0.1:54324.

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` / `build` / `start` | App |
| `npm run typecheck` · `npm run lint` | Estáticas |
| `npm test` | Unitarias (Vitest) |
| `npm run test:db` | RLS y reglas de negocio (pgTAP, requiere Supabase local) |
| `npm run test:e2e` | E2E real con Playwright (requiere app en :3000 y Supabase local) |

## Documentación

1. [Análisis y dependencias](docs/00-analisis-y-dependencias.md)
2. [Arquitectura y estructura](docs/01-arquitectura.md)
3. [Mapa de navegación](docs/02-mapa-navegacion.md)
4. [Modelo de datos](docs/03-modelo-datos.md)
5. [Sistema JSON de componentes](docs/04-sistema-bloques.md)
6. [Commerce Engine: Shopify y VTEX](docs/05-commerce-engine.md)
7. [Riesgos de autoservicio](docs/06-riesgos-autoservicio.md)
8. [Backlog por fases](docs/07-backlog.md)
9. [Entrega Fase 1](docs/fases/fase-1.md)

## Seguridad

- Nunca subas `.env.local` ni credenciales. Usa `.env.example` como referencia.
- Toda tabla tiene RLS; las escrituras sensibles pasan por funciones con validación de rol.
- Información de clientes y proyectos: confidencial.
