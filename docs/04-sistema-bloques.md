# 4. Sistema JSON de componentes — TITA Block Schema v1

Fuente de verdad: [`src/modules/blocks/schema.ts`](../src/modules/blocks/schema.ts) (Zod) ·
Pruebas: [`tests/unit/blocks.test.ts`](../tests/unit/blocks.test.ts).

**Estado:** contrato definido y probado en Fase 1. Renderer (F2), editor (F3) y datos comerciales (F4/F5) pendientes.

## Principios

1. **Datos, no código.** Lista cerrada de `type` de sección; props validadas; ningún campo acepta HTML, CSS o JS.
   Un documento generado por IA que no valide se rechaza (y se reintenta), nunca se renderiza.
2. **Sin datos comerciales embebidos.** Productos y colecciones se referencian (`ProductRef`, `CollectionRef`).
   Precio, stock y variantes se resuelven en vivo con el Commerce Engine.
3. **Procedencia del contenido.** `origin: ai | user | user_provided`. Testimonios exigen `user_provided`.
   Fechas de campaña (countdown) las define el usuario.
4. **Comportamiento comercial por bloque.** `commerce.mode: inherit | promotional | transactional` en bloques de producto;
   el documento tiene `commerce.defaultMode`. Promocional y transaccional conviven en la misma landing.
5. **Tema derivado del Brand Kit.** `theme.source = "brand_kit"` + overrides acotados (colores hex, radio).
6. **Versionado del schema.** `schemaVersion: 1`; migraciones de documento explícitas cuando cambie.

## Estructura

```jsonc
{
  "schemaVersion": 1,
  "meta": { "title": "Lanzamiento Origen 2026", "description": "…", "locale": "es-CO", "noindex": false },
  "theme": { "source": "brand_kit", "overrides": {} },
  "commerce": { "connectionId": "<uuid>", "defaultMode": "promotional" },
  "sections": [
    {
      "id": "hero01", "type": "hero", "variant": "split", "visible": true, "origin": "ai",
      "props": {
        "title": "Café de origen, recién tostado",
        "subtitle": "…",
        "image": { "source": "asset", "path": "<org>/images/…webp", "alt": "…" },
        "primaryCta": { "label": "Ver colección", "link": { "kind": "anchor", "sectionId": "grid01" } }
      }
    },
    {
      "id": "grid01", "type": "product_grid", "variant": "grid",
      "commerce": { "mode": "transactional" },
      "props": {
        "title": "Elige tu café",
        "source": { "kind": "collection", "collection": { "connectionId": "<uuid>", "collectionId": "gid://shopify/Collection/1" }, "limit": 8 },
        "columns": 4, "showVariantPicker": true
      }
    }
  ],
  "toppings": [
    { "type": "side_cart", "enabled": true, "config": { "freeShippingThreshold": null } },
    { "type": "whatsapp_button", "enabled": true, "config": { "phone": "+573001234567", "defaultMessage": "" } }
  ]
}
```

## Catálogo inicial de secciones

| type | Variantes | Comercial | Notas |
|---|---|---|---|
| `hero` | split, centered, fullbleed | — | CTA primario/secundario |
| `product_grid` | grid, carousel | ✔ | Fuente manual (≤24) o colección |
| `product_spotlight` | left, right | ✔ | Un producto destacado |
| `benefits` | icons, cards | — | Íconos de lista cerrada |
| `testimonials` | cards, quote | — | Solo `user_provided` |
| `faq` | accordion, two_columns | — | |
| `rich_text` | narrow, wide | — | heading/paragraph/list estructurados |
| `lead_form` | inline, card | — | Campos de lista cerrada; consentimiento obligatorio |
| `cta_banner` | solid, gradient, image | — | |

Toppings globales iniciales: `countdown`, `announcement_bar`, `floating_cta`, `whatsapp_button`, `side_cart`, `ga4`.
El marketplace completo (pop-ups, galerías, videos, CRM, píxeles) se agrega en F6 ampliando la unión discriminada.

## Validaciones cruzadas (superRefine)

- IDs de sección únicos.
- Anclas apuntan a secciones existentes.
- Si hay productos, debe existir `commerce.connectionId` y todos deben pertenecer a esa conexión.
- Modo transaccional (global o en algún bloque) exige `side_cart` activo.

## Cómo lo usará cada módulo

- **IA (F2):** genera el documento con salida estructurada → `parseLandingDocument` → si falla, reintento con los errores como feedback; máximo N intentos y luego error visible.
- **Renderer (F2):** `registry[type][variant]` → componente React puro; los bloques comerciales piden datos al Commerce Engine.
- **Editor (F3):** operaciones atómicas (insertar, mover, actualizar props) sobre el documento con historial para deshacer/rehacer; cada guardado valida el documento completo.
- **Publicación (F7):** snapshot validado del documento + Brand Kit en `published_versions`.
