# 5. TITA Commerce Engine — interfaces Shopify y VTEX

Contrato: [`src/modules/commerce/types.ts`](../src/modules/commerce/types.ts).
**Estado:** interfaz definida en F1. Ningún adaptador está implementado ni conectado todavía.

## Diseño

```
CommerceAdapter (CatalogAdapter + cart: CartAdapter | null)
 ├── ShopifyAdapter   (F4)  Admin GraphQL API (catálogo/sync) + Storefront API (carrito)
 ├── VtexAdapter      (F5)  Catalog / Intelligent Search + Checkout API (orderForm)
 └── ManualAdapter    (F4)  Catálogo manual o CSV — solo promocional (cart = null)
```

- Modelo normalizado (`Product`, `ProductVariant`, `Money` en unidades menores, `Availability`).
- `capabilities` declara lo que cada plataforma soporta; la UI se adapta en lugar de simular.
- `CommerceContext` viaja en cada llamada (Shopify: país/idioma de mercado; VTEX: `sc`, región, seller).
- Errores normalizados (`CommerceError`): `unauthorized` dispara el estado "requiere reconexión".
- Todas las llamadas a plataformas ocurren **en servidor**; el navegador nunca ve credenciales.

## Shopify (F4)

| Necesidad | Mecanismo oficial previsto | A validar |
|---|---|---|
| Conexión | App de Shopify con OAuth (authorization code grant), scopes mínimos de lectura de productos | Modelo de distribución (ver riesgo R1) |
| Catálogo y sync | Admin GraphQL API (`products`, `collections`, variantes, inventario); bulk operations para sync inicial | Límites de costo de query por plan de la tienda |
| Webhooks | `products/create|update|delete`, `collections/*`, `app/uninstalled` + webhooks obligatorios de privacidad para apps públicas; verificación HMAC | |
| Carrito | Storefront API Cart: `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`; token de Storefront creado tras la instalación | Requiere que los productos estén publicados en el canal de la app |
| Checkout | `cart.checkoutUrl` → redirección al checkout oficial | |
| Contexto | Directiva `@inContext(country, language)` para precios de mercado | Tiendas con Shopify Markets |

## VTEX (F5)

| Necesidad | Mecanismo oficial previsto | A validar |
|---|---|---|
| Conexión | `appKey`/`appToken` generados por el cliente en el License Manager con un rol de permisos mínimos; se validan con una llamada de prueba | Alternativa: app VTEX IO instalable (mejor UX, más esfuerzo) |
| Catálogo | Intelligent Search API o Catalog API pública; SKUs y especificaciones | Diferencias entre cuentas con/sin Intelligent Search |
| Precio y stock | Simulación de carrito (`/api/checkout/pub/orderForms/simulation?sc=`) por seller y política comercial | Multi-seller / white label |
| Carrito | Checkout API: crear `orderForm`, agregar/actualizar ítems | |
| Checkout | Handoff al dominio de la tienda: URL de agregado a carrito (`/checkout/cart/add?sku=…&qty=…&seller=…&sc=…`) o `orderFormId` en la URL de checkout | Comportamiento cross-domain con cuenta real — **bloqueante a validar al inicio de F5** |
| Eventos | Notificaciones de catálogo/inventario (afiliado o broadcaster) o sync programada | Disponibilidad por cuenta |

## Reglas comunes

1. **Caché ≠ verdad comercial.** El catálogo cacheado sirve para selección y render; cada operación de carrito revalida precio y stock en vivo y devuelve `CartWarning` si cambió.
2. **Sin datos de pago.** Nunca se reciben ni almacenan datos de tarjeta.
3. **Aislamiento.** Cada conexión pertenece a una organización; el adaptador se instancia con credenciales leídas en servidor tras validar membresía.
4. **Resiliencia.** Reintentos con backoff ante `rate_limited`; estado de conexión visible (`healthy/degraded/unauthorized/unreachable`).
5. **Idempotencia de webhooks.** `webhook_events.external_event_id` único.
