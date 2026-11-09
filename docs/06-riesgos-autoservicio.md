# 6. Riesgos que pueden bloquear el autoservicio

Severidad: 🔴 bloqueante · 🟠 alto · 🟡 medio.

| # | Riesgo | Sev. | Mitigación | Cuándo se resuelve |
|---|---|---|---|---|
| R1 | **Distribución de la app de Shopify.** Una app pública requiere revisión de Shopify antes de que cualquier tienda la instale; la distribución personalizada no escala a múltiples clientes. Las políticas sobre apps creadas desde el admin han cambiado recientemente — **verificar el estado vigente**. | 🔴 | Iniciar el registro en Partners y la revisión de la app en paralelo a F2–F3. Mientras tanto, modo promocional con catálogo manual/CSV. | Antes de F4 |
| R2 | **Credenciales VTEX manuales.** El cliente debe crear appKey/appToken con un rol adecuado; es fricción y riesgo de sobrepermisos. | 🟠 | Asistente paso a paso con capturas, rol mínimo recomendado, prueba de conexión inmediata y mensajes de error accionables. Evaluar app VTEX IO. | F5 |
| R3 | **Checkout cross-domain en VTEX.** El carrito vive en cookies del dominio de la tienda. | 🔴 | Handoff por URL de carrito; validar con una cuenta real (p. ej. sandbox de un cliente Gold Partner) al inicio de F5. | Inicio F5 |
| R4 | **Dominios propios y HTTPS.** DNS mal configurado por el cliente. | 🟠 | Asistente con verificación en vivo (TXT/CNAME), estados claros y subdominio Tita siempre disponible como respaldo. | F7 |
| R5 | **Calidad/alucinación de la IA.** Copys con promesas, precios o descuentos inventados. | 🟠 | Schema prohíbe precios en documento; testimonios solo `user_provided`; prompt con brief estructurado; validación y regeneración por sección; el usuario revisa antes de publicar. | F2 |
| R6 | **Costo de IA sin control.** | 🟠 | Límite por plan, contador `usage_counters`, rate limit por organización, modelos más económicos para tareas ligeras. | F2 / F8 |
| R7 | **Ediciones que rompen lo publicado.** | 🟠 | Borrador separado de `published_versions` inmutable; publicar requiere validación automática. | F3 / F7 |
| R8 | **Precios desactualizados en landings.** | 🟠 | Precio nunca embebido; caché corta; revalidación en carrito con avisos. | F4 / F5 |
| R9 | **Filtración entre clientes.** | 🔴 | RLS + RPC + pgTAP + E2E de aislamiento (hecho en F1); revisión de seguridad por fase. | Continuo |
| R10 | **Datos personales (leads).** Ley 1581 de 2012 y equivalentes. | 🟠 | Consentimiento obligatorio en formularios, finalidad declarada, exportación y supresión, retención configurable. | F6 / F8 |
| R11 | **Cobro en COP.** Proveedores internacionales pueden no cubrir medios locales. | 🟡 | Adaptador `BillingProvider`; evaluar proveedor local y uno internacional. | F8 |
| R12 | **Correo transaccional.** El SMTP por defecto de Supabase tiene límites estrictos y no es apto para producción. | 🟠 | Configurar SMTP propio (dominio verificado SPF/DKIM) antes de abrir registros. | Antes de lanzamiento |
| R13 | **Activos huérfanos en Storage.** Subidas no guardadas quedan en el bucket. | 🟡 | Limpieza al guardar (hecho) + job periódico para archivos sin referencia. | F7 |
| R14 | **Paleta oficial de Tita no validada.** | 🟡 | Tokens centralizados; reemplazo en un solo archivo. | Al confirmar identidad |
