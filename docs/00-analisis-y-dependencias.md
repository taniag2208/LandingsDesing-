# 0. Análisis del producto y dependencias técnicas

## Qué estamos construyendo

TITA Landing Studio es un SaaS multi-tenant de autoservicio. Su valor está en la cadena completa
**marca → catálogo real → generación IA → edición visual → publicación → medición**. Si falla un
eslabón, el producto pierde su promesa de autoservicio. Por eso el orden de construcción sigue las
dependencias técnicas, no la importancia comercial.

## Grafo de dependencias

```
Auth + Organizaciones + Roles (F1)
 ├── Brand Kit (F1) ─────────────────────────────┐
 ├── Planes / entitlements (F1 esquema, F8 cobro)│
 │                                               ▼
 ├── Block Schema v1 (contrato F1) ──► Motor de componentes (F2) ──► Editor visual (F3)
 │                                       ▲          ▲                    │
 │   Discovery + Brief (F2) ──► Motor IA (F2)       │                    │
 │                                                  │                    ▼
 ├── Commerce Engine contrato (F1) ──► Shopify (F4) / VTEX (F5) ──► Toppings ecommerce (F6)
 │                                                                       │
 └──────────────────────────────────────────────► Publicación + dominios (F7)
                                                                         │
                                                       Analítica + facturación + admin (F8)
```

## Dependencias críticas detectadas

| # | Dependencia | Por qué bloquea | Decisión |
|---|---|---|---|
| D1 | **Aislamiento multi-tenant** | Todo dato (marca, credenciales de tienda, leads) pertenece a una organización. Corregirlo después es una reescritura. | RLS en todas las tablas desde F1 + pruebas pgTAP de aislamiento. |
| D2 | **Contrato del documento de landing** | IA, renderer, editor, publicación y analítica leen/escriben el mismo JSON. | Block Schema v1 con Zod definido en F1 (`src/modules/blocks/schema.ts`). |
| D3 | **Separar datos comerciales del documento** | Si el JSON guarda precios, la landing publicada miente cuando cambian. | El documento solo guarda `ProductRef`; precios y stock se resuelven en vivo y se revalidan en carrito. |
| D4 | **Credenciales de tienda** | Shopify (OAuth) y VTEX (appKey/appToken) requieren almacenamiento cifrado y rotación. | Supabase Vault / cifrado en reposo con clave en variable de entorno; nunca en el cliente. Se implementa en F4. |
| D5 | **Distribución de la app de Shopify** | Una app pública requiere revisión de Shopify; una app de distribución personalizada solo sirve a una tienda. Afecta el autoservicio. | Ver riesgos R1. Se valida al inicio de F4. |
| D6 | **Checkout cross-domain en VTEX** | El `orderForm` vive en cookies del dominio de la tienda; la landing está en otro dominio. | Handoff por URL (`/checkout/cart/add` u `orderFormId`). Validar con cuenta real en F5. |
| D7 | **Publicación multi-dominio con HTTPS** | Subdominios comodín + dominios propios con certificados automáticos. | Proveedor con API de dominios (p. ej. Vercel Domains API o Cloudflare for SaaS). Decisión al inicio de F7. |
| D8 | **Inmutabilidad de lo publicado** | Editar no puede romper la landing en vivo. | Borradores y versiones publicadas en tablas separadas; publicar = snapshot inmutable. |
| D9 | **Costo de IA** | Generaciones ilimitadas destruyen el margen. | Límite `ai_generations_monthly` por plan desde F1; contador de consumo en F2. |
| D10 | **Datos personales de leads** | Ley 1581 de 2012 (Colombia) y equivalentes: consentimiento, finalidad, supresión. | Texto de consentimiento obligatorio en el bloque `lead_form` del schema; retención y exportación en F6/F8. |

## Supuestos explícitos

- La identidad visual de titamedia.com **no pudo consultarse** desde el entorno de desarrollo (dominio
  bloqueado por la red de la sesión). Los tokens de diseño son provisionales y viven en un único archivo
  (`src/app/globals.css`) para ajustarlos al confirmar la paleta oficial.
- Moneda y país por defecto: COP / CO. El modelo soporta otros mercados.
- No construimos pasarela de pagos para compradores: el checkout es siempre el oficial de Shopify/VTEX.
