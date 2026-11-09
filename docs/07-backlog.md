# 7. Backlog priorizado por fases

Las fases son orden de implementación, no versiones comerciales. El MVP comercial requiere F1–F9
(Shopify y VTEX, promocional y transaccional). Cada fase cierra con pruebas automatizadas y criterios verificables.

## F1 · Base SaaS, autenticación, organizaciones y Brand Kit — ✅ entregada
Ver [fases/fase-1.md](fases/fase-1.md).

## F2 · Discovery, motor de bloques y generación IA
1. Tablas `landings`, `landing_revisions`, `discovery_sessions`, `ai_generations`, `usage_counters`.
2. Wizard de discovery por etapas con preguntas condicionales + brief estructurado en vivo (Pantalla 5).
3. Adaptador de IA con salida estructurada → `parseLandingDocument` → reintentos con errores como feedback.
4. Prompting con Brand Kit + brief; reglas anti-invención (precios, descuentos, testimonios, condiciones).
5. Renderer: registry `type/variant → componente` y tokens derivados del Brand Kit.
6. Pantalla 6: generación con progreso por etapa, propuesta de arquitectura y toppings recomendados.
7. Control de consumo por plan y rate limit.
8. Pruebas: schema, prompts con fixtures, límite de consumo, E2E discovery → borrador.

## F3 · Editor visual (Landing Builder)
1. Layout de 3 paneles (estructura/biblioteca · canvas · propiedades).
2. Edición inline de texto, reemplazo de imágenes (activos del Brand Kit), reordenamiento drag & drop accesible.
3. Historial deshacer/rehacer; autosave con debounce y concurrencia optimista.
4. Vista desktop/móvil; regeneración IA por sección; versiones con etiqueta y restauración.
5. Dashboard: listado real de landings con estado, duplicar, eliminar (soft delete).

## F4 · Shopify + catálogo manual
1. Decisión de distribución (R1) y registro de la app. 2. OAuth + almacenamiento cifrado (Vault).
3. Sync inicial (bulk) + webhooks con HMAC e idempotencia + sync programada. 4. Buscador de catálogo y selector de productos/colecciones en el builder.
5. Storefront Cart API: carrito lateral, variantes, cantidades, revalidación y `checkoutUrl`.
6. Catálogo manual/CSV (promocional). 7. Pantalla 4: estado, reconexión, desinstalación.

## F5 · VTEX
1. Asistente de appKey/appToken + prueba de conexión. 2. Catálogo/búsqueda + simulación de precio/stock por `sc`/seller/región.
3. Checkout API (orderForm) + handoff validado (R3). 4. Sync y eventos. 5. Paridad funcional con Shopify en builder y carrito.

## F6 · Toppings y marketplace
Catálogo `toppings_catalog`, pantalla 8, configuración validada por topping, gating de premium por plan,
formularios con consentimiento y `leads`, WhatsApp, CRM (webhook genérico primero), GA4 y píxeles.

## F7 · Publicación, dominios y versiones
Validación pre-publicación, `published_versions` inmutables, subdominio Tita, asistente de dominio propio con
verificación DNS y HTTPS automático, SEO básico, despublicar, restaurar versión, limpieza de activos huérfanos.

## F8 · Analítica, planes, pagos y administración
Ingesta de eventos (observados vs. atribuidos vs. compras confirmadas), dashboard y comparación de campañas,
exportación CSV, `BillingProvider` + webhooks de pago, cambio de plan autoservicio, envío de invitaciones por correo,
panel interno de Tita (Pantalla 12): clientes, planes/límites editables, plantillas, toppings, conexiones, errores, métricas.

## F9 · QA integral y lanzamiento
Pruebas con tiendas reales Shopify/VTEX, pruebas de carga del renderer público, revisión de seguridad (OWASP / LLM),
accesibilidad WCAG 2.2 AA, SMTP productivo, monitoreo y alertas, runbooks, términos y política de datos revisados por un humano.
