# 2. Mapa de navegación

Leyenda: ✅ implementado (F1) · 🔜 fase en que se habilita.

```
Público
├── /                         Presentación del producto                 ✅
├── /signup                   Registro                                  ✅  (P1)
├── /login                    Acceso                                    ✅  (P1)
├── /forgot-password          Solicitar recuperación                    ✅  (P1)
├── /check-email              Confirmación enviada                      ✅
├── /auth/confirm             Verificación de enlace (token_hash)       ✅
└── <slug>.tita.site | dominio propio   Landing publicada               🔜 F7

Autenticado sin organización
├── /onboarding               Registrar empresa                         ✅  (P1)
├── /reset-password           Nueva contraseña                          ✅  (P1)
└── /invite/[token]           Aceptar invitación                        ✅

Estudio (requiere organización)
├── /dashboard                Inicio + Mis landings                     ✅ shell · 🔜 F2/F3 landings  (P2)
├── /brand-kit                Brand Kit                                 ✅  (P3)
├── /integrations             Conectar ecommerce                        🔜 F4/F5  (P4)
│   ├── /integrations/shopify/callback
│   └── /integrations/[id]    Catálogo, sync, reconexión
├── /discovery                Discovery inteligente (wizard)            🔜 F2  (P5)
├── /landings/[id]/generate   Generación con IA                         🔜 F2  (P6)
├── /landings/[id]/edit       Landing Builder                           🔜 F3  (P7)
├── /toppings                 Marketplace de toppings                   🔜 F6  (P8)
├── /landings/[id]/publish    Publicación, dominio, SEO, versiones      🔜 F7  (P9)
├── /analytics                Analytics y comparación                   🔜 F8  (P10)
└── /settings                 Administración de cuenta                  ✅ parcial (P11)
    ├── /settings             Empresa                                   ✅
    ├── /settings/team        Usuarios y permisos, invitaciones         ✅
    ├── /settings/plan        Plan, límites y consumo                   ✅ lectura · 🔜 F8 cobro
    ├── /settings/activity    Auditoría                                 ✅
    └── /settings/billing     Facturación                               🔜 F8

Administración interna Tita (platform_admins)
└── /admin                    Clientes, planes, plantillas, toppings,   🔜 F8  (P12)
                              límites, conexiones, errores, métricas
```

## Flujo principal de autoservicio

```
Registro → confirmar correo → crear organización → Brand Kit
   → conectar tienda (F4/F5) → discovery (F2) → generación IA (F2)
   → builder (F3) → toppings (F6) → publicar (F7) → analytics (F8)
```

Reglas de UX:
- Ninguna pantalla depende de aprobación manual de Tita.
- Las secciones aún no habilitadas se muestran deshabilitadas con su fase (`F4`, `F2`…), nunca como botones decorativos que aparenten funcionar.
- El dashboard muestra un checklist de primeros pasos que refleja el estado real.
