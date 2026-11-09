# 3. Esquema de base de datos

Postgres (Supabase). Toda tabla de negocio lleva `organization_id` (directo o vía FK) y RLS.
✅ = migrado en Fase 1 · 🔜 = diseño inicial, se migra en la fase indicada.

## Implementado (Fase 1)

| Tabla | Propósito | Escritura desde el cliente |
|---|---|---|
| `profiles` ✅ | Datos del usuario (1:1 `auth.users`), creado por trigger | Solo `full_name`, `avatar_url` propios |
| `platform_admins` ✅ | Equipo interno de Tita | Ninguna (service role) |
| `plans` ✅ | Starter/Growth/Pro: `limits` y `features` JSONB, `provider_price_refs`. **Sin precios.** | Ninguna |
| `organizations` ✅ | Tenant. `slug` único e inmutable (subdominio) | `name, website, industry, country` (owner/admin) |
| `memberships` ✅ | Usuario ↔ organización con rol `owner/admin/editor/analyst` | Solo RPC |
| `subscriptions` ✅ | Plan vigente + `limit_overrides` por cliente + refs del proveedor | Ninguna (backend/webhooks) |
| `invitations` ✅ | Invitaciones con `token_hash` (SHA-256), expiración 7 días | Solo RPC |
| `brand_kits` ✅ | Logo, colores, tipografía, estilo, imágenes, tono, contacto, redes; `version` para concurrencia optimista | Columnas de contenido (owner/admin/editor) |
| `audit_logs` ✅ | Rastro de cambios (solo claves modificadas, sin valores) | Ninguna (triggers) |
| `storage.objects` (`brand-assets`) ✅ | Activos de marca en `<org_id>/<logo|images>/…` | Por carpeta de organización (owner/admin/editor) |

RPC (`SECURITY DEFINER`, `search_path=''`): `create_organization`, `create_invitation`,
`accept_invitation`, `revoke_invitation`, `update_member_role`, `remove_member`, `list_org_members`,
`org_entitlements`. Helpers de RLS: `is_org_member`, `has_org_role`, `shares_org_with`, `is_platform_admin`.

## Diseño inicial de fases siguientes

```sql
-- F2: Discovery + IA
discovery_sessions (id, organization_id, landing_id?, answers jsonb, brief jsonb, step, status, created_by, …)
ai_generations     (id, organization_id, landing_id, kind ['structure'|'copy'|'regenerate_section'],
                    model, input_tokens, output_tokens, status, error_code, prompt_hash, created_at)
                    -- consumo medible por plan; sin guardar prompts completos con PII

-- F2/F3: Landings
landings          (id, organization_id, name, kind ['promotional'|'transactional'|'mixed'],
                   status ['draft'|'published'|'paused'|'archived'], draft_document jsonb,
                   draft_version int, commerce_connection_id?, published_version_id?,
                   created_by, updated_at, deleted_at)
landing_revisions (id, landing_id, organization_id, document jsonb, version int, created_by,
                   created_at, label?)            -- historial para deshacer/restaurar (versionado)

-- F4/F5: Commerce Engine
commerce_connections (id, organization_id, platform ['shopify'|'vtex'|'manual'], shop_domain|account_name,
                      status ['pending'|'active'|'error'|'revoked'], scopes text[],
                      credentials_secret_id uuid  -- referencia a Supabase Vault, nunca el secreto
                      context jsonb (sales_channel, seller, country), last_sync_at, last_error, …)
catalog_products     (connection_id, organization_id, external_id, handle, title, data jsonb,
                      search tsvector, synced_at)   -- caché; nunca fuente de verdad para precio de compra
catalog_collections  (connection_id, organization_id, external_id, title, handle, synced_at)
sync_jobs            (id, connection_id, kind ['initial'|'scheduled'|'webhook'], status, stats jsonb, …)
webhook_events       (id, platform, connection_id, topic, external_event_id UNIQUE, payload_hash,
                      received_at, processed_at, error)   -- idempotencia + auditoría
catalog_manual_items (id, organization_id, title, description, image_path, url, price_display?)  -- CSV

-- F6: Toppings y leads
toppings_catalog (code PK, name, category, is_premium, config_schema jsonb, is_active)
leads            (id, organization_id, landing_id, data jsonb (cifrado a nivel de columna para PII),
                  consent_text, consent_at, source, created_at, delete_after)

-- F7: Publicación
published_versions (id, landing_id, organization_id, document jsonb INMUTABLE, brand_snapshot jsonb,
                    published_by, published_at, unpublished_at?)
domains            (id, organization_id, landing_id?, hostname UNIQUE, kind ['subdomain'|'custom'],
                    verification_status, ssl_status, provider_ref, verified_at)

-- F8: Analítica, consumo y facturación
analytics_events (id, organization_id, landing_id, published_version_id, event
                  ['page_view'|'cta_click'|'lead'|'add_to_cart'|'begin_checkout'|'purchase_attributed'],
                  session_id, ts, props jsonb)    -- particionada por mes
purchases_confirmed (id, organization_id, landing_id, platform_order_id, amount_minor, currency,
                     source ['webhook'], confirmed_at)  -- solo con integración de atribución real
usage_counters   (organization_id, metric, period_start, value, PRIMARY KEY (...))
invoices         (id, organization_id, provider, provider_invoice_id, status, amount_minor, currency, …)
templates        (id, name, document jsonb, category, is_active)  -- gestionadas por Tita
```

### Reglas de modelado

- Los precios de productos **nunca** se guardan en documentos de landing (solo `ProductRef`).
- Las credenciales de tiendas van en Vault; la tabla solo guarda la referencia.
- `analytics_events` distingue observado vs. atribuido; `purchases_confirmed` solo existe si la plataforma lo confirma por webhook.
- Borrado de organización: cascada sobre datos de negocio; `audit_logs` se conserva (sin FK).
