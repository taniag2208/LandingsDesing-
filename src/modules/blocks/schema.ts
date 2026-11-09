import { z } from "zod";

/**
 * TITA Block Schema v1 — contrato del documento de landing.
 *
 * Estado: CONTRATO DEFINIDO EN FASE 1. Renderizado (Fase 2), edición (Fase 3)
 * y datos comerciales en vivo (Fases 4–5) se construyen sobre este contrato.
 *
 * Reglas de diseño:
 *  1. El documento es DATOS, nunca código. No hay HTML, CSS ni JS libres:
 *     cada sección es un `type` de una lista cerrada con props validadas.
 *  2. Ningún precio, descuento o inventario se guarda en el documento. Los
 *     productos se referencian (`ProductRef`) y el Commerce Engine resuelve
 *     datos en vivo al renderizar y revalida antes de cada operación de carrito.
 *  3. El contenido que la IA no puede inventar (testimonios, condiciones
 *     comerciales) exige origen `user_provided`.
 *  4. Toda URL externa es https; los enlaces internos son anclas a secciones.
 */

export const BLOCK_SCHEMA_VERSION = 1 as const;

const id = z.string().regex(/^[a-z0-9_-]{6,32}$/i, "id inválido");
const text = (max: number) => z.string().trim().max(max);

export const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Solo se permiten URLs https");

// ---------------------------------------------------------------------------
// Referencias
// ---------------------------------------------------------------------------
export const productRefSchema = z.object({
  connectionId: z.uuid(),
  /** Id del producto en la plataforma (Shopify GID o VTEX productId). */
  productId: text(200).min(1),
  /** Variante/SKU preseleccionada opcional. */
  variantId: text(200).optional(),
});
export type ProductRef = z.infer<typeof productRefSchema>;

export const collectionRefSchema = z.object({
  connectionId: z.uuid(),
  /** Shopify collection GID o VTEX categoryId / collectionId. */
  collectionId: text(200).min(1),
});

export const imageRefSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("asset"), path: text(300).min(1), alt: text(160) }),
  z.object({ source: z.literal("product"), product: productRefSchema, alt: text(160) }),
]);

export const linkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), href: httpsUrl, newTab: z.boolean().default(false) }),
  z.object({ kind: z.literal("anchor"), sectionId: id }),
  z.object({ kind: z.literal("product"), product: productRefSchema }),
  z.object({ kind: z.literal("collection"), collection: collectionRefSchema }),
  z.object({ kind: z.literal("whatsapp"), message: text(300).default("") }),
]);

export const ctaSchema = z.object({
  label: text(40).min(1),
  link: linkSchema,
  style: z.enum(["primary", "secondary", "ghost"]).default("primary"),
});

/** Comportamiento comercial configurable por bloque. */
export const commerceModeSchema = z.enum(["inherit", "promotional", "transactional"]);

const contentOrigin = z.enum(["ai", "user", "user_provided"]);

const sectionBase = {
  id,
  visible: z.boolean().default(true),
  origin: contentOrigin.default("user"),
};

// ---------------------------------------------------------------------------
// Secciones (biblioteca aprobada de componentes)
// ---------------------------------------------------------------------------
export const heroSection = z.object({
  ...sectionBase,
  type: z.literal("hero"),
  variant: z.enum(["split", "centered", "fullbleed"]),
  props: z.object({
    eyebrow: text(60).default(""),
    title: text(120).min(1),
    subtitle: text(280).default(""),
    image: imageRefSchema.optional(),
    primaryCta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
  }),
});

export const productGridSection = z.object({
  ...sectionBase,
  type: z.literal("product_grid"),
  variant: z.enum(["grid", "carousel"]),
  commerce: z.object({ mode: commerceModeSchema.default("inherit") }).default({ mode: "inherit" }),
  props: z.object({
    title: text(120).default(""),
    source: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("manual"), products: z.array(productRefSchema).min(1).max(24) }),
      z.object({ kind: z.literal("collection"), collection: collectionRefSchema, limit: z.number().int().min(1).max(24) }),
    ]),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    showVariantPicker: z.boolean().default(false),
  }),
});

export const productSpotlightSection = z.object({
  ...sectionBase,
  type: z.literal("product_spotlight"),
  variant: z.enum(["left", "right"]),
  commerce: z.object({ mode: commerceModeSchema.default("inherit") }).default({ mode: "inherit" }),
  props: z.object({
    product: productRefSchema,
    headline: text(120).default(""),
    body: text(600).default(""),
  }),
});

export const benefitsSection = z.object({
  ...sectionBase,
  type: z.literal("benefits"),
  variant: z.enum(["icons", "cards"]),
  props: z.object({
    title: text(120).default(""),
    items: z
      .array(z.object({ icon: z.enum(["truck", "shield", "star", "gift", "clock", "leaf", "heart", "check"]), title: text(60).min(1), body: text(200).default("") }))
      .min(1)
      .max(8),
  }),
});

export const testimonialsSection = z.object({
  ...sectionBase,
  type: z.literal("testimonials"),
  // Los testimonios NUNCA pueden ser generados por IA.
  origin: z.literal("user_provided"),
  variant: z.enum(["cards", "quote"]),
  props: z.object({
    title: text(120).default(""),
    items: z.array(z.object({ quote: text(400).min(1), author: text(80).min(1), role: text(80).default("") })).min(1).max(12),
  }),
});

export const faqSection = z.object({
  ...sectionBase,
  type: z.literal("faq"),
  variant: z.enum(["accordion", "two_columns"]),
  props: z.object({
    title: text(120).default(""),
    items: z.array(z.object({ question: text(200).min(1), answer: text(1000).min(1) })).min(1).max(20),
  }),
});

export const richTextSection = z.object({
  ...sectionBase,
  type: z.literal("rich_text"),
  variant: z.enum(["narrow", "wide"]),
  props: z.object({
    // Texto estructurado: sin HTML. El renderer escapa todo el contenido.
    blocks: z
      .array(
        z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("heading"), text: text(160).min(1) }),
          z.object({ kind: z.literal("paragraph"), text: text(2000).min(1) }),
          z.object({ kind: z.literal("list"), items: z.array(text(300).min(1)).min(1).max(20) }),
        ]),
      )
      .min(1)
      .max(30),
  }),
});

export const leadFormSection = z.object({
  ...sectionBase,
  type: z.literal("lead_form"),
  variant: z.enum(["inline", "card"]),
  props: z.object({
    title: text(120).min(1),
    description: text(300).default(""),
    fields: z
      .array(z.object({ name: z.enum(["name", "email", "phone", "city", "message"]), required: z.boolean() }))
      .min(1)
      .max(5),
    submitLabel: text(40).min(1),
    consentText: text(400).min(1),
    successMessage: text(200).min(1),
  }),
});

export const ctaBannerSection = z.object({
  ...sectionBase,
  type: z.literal("cta_banner"),
  variant: z.enum(["solid", "gradient", "image"]),
  props: z.object({ title: text(120).min(1), subtitle: text(240).default(""), cta: ctaSchema }),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  productGridSection,
  productSpotlightSection,
  benefitsSection,
  testimonialsSection,
  faqSection,
  richTextSection,
  leadFormSection,
  ctaBannerSection,
]);
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];

// ---------------------------------------------------------------------------
// Toppings (funcionalidades globales). Catálogo completo en Fase 6.
// ---------------------------------------------------------------------------
export const toppingSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("countdown"),
    enabled: z.boolean(),
    // La fecha la define el usuario; la IA nunca la inventa.
    config: z.object({ endsAt: z.iso.datetime({ offset: true }), label: text(80), hideWhenExpired: z.boolean().default(true) }),
  }),
  z.object({
    type: z.literal("announcement_bar"),
    enabled: z.boolean(),
    config: z.object({ text: text(140).min(1), link: linkSchema.optional() }),
  }),
  z.object({
    type: z.literal("floating_cta"),
    enabled: z.boolean(),
    config: z.object({ cta: ctaSchema, showAfterScrollPercent: z.number().int().min(0).max(100).default(30) }),
  }),
  z.object({
    type: z.literal("whatsapp_button"),
    enabled: z.boolean(),
    config: z.object({ phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/), defaultMessage: text(300).default("") }),
  }),
  z.object({
    type: z.literal("side_cart"),
    enabled: z.boolean(),
    config: z.object({ freeShippingThreshold: z.null().default(null) }),
  }),
  z.object({
    type: z.literal("ga4"),
    enabled: z.boolean(),
    config: z.object({ measurementId: z.string().regex(/^G-[A-Z0-9]{4,12}$/) }),
  }),
]);
export type Topping = z.infer<typeof toppingSchema>;

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------
export const landingDocumentSchema = z
  .object({
    schemaVersion: z.literal(BLOCK_SCHEMA_VERSION),
    meta: z.object({
      title: text(70).min(1),
      description: text(160).default(""),
      locale: z.enum(["es-CO", "es-MX", "es-CL", "es-PE", "es-AR", "es", "en", "pt-BR"]).default("es-CO"),
      noindex: z.boolean().default(false),
    }),
    theme: z.object({
      source: z.literal("brand_kit"),
      overrides: z
        .object({
          colors: z.record(z.enum(["primary", "secondary", "accent", "background", "surface", "text"]), z.string().regex(/^#[0-9a-f]{6}$/i)).optional(),
          radius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
        })
        .default({}),
    }),
    commerce: z.object({
      connectionId: z.uuid().nullable(),
      defaultMode: z.enum(["promotional", "transactional"]),
    }),
    sections: z.array(sectionSchema).min(1).max(30),
    toppings: z.array(toppingSchema).max(20).default([]),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    doc.sections.forEach((s, i) => {
      if (ids.has(s.id)) ctx.addIssue({ code: "custom", path: ["sections", i, "id"], message: "id de sección duplicado" });
      ids.add(s.id);
    });
    // Los enlaces de tipo ancla deben apuntar a secciones existentes.
    const checkLink = (link: unknown, path: (string | number)[]) => {
      if (link && typeof link === "object" && (link as { kind?: string }).kind === "anchor") {
        const target = (link as { sectionId: string }).sectionId;
        if (!ids.has(target)) ctx.addIssue({ code: "custom", path, message: `ancla a sección inexistente: ${target}` });
      }
    };
    doc.sections.forEach((s, i) => {
      if (s.type === "hero") {
        checkLink(s.props.primaryCta?.link, ["sections", i, "props", "primaryCta", "link"]);
        checkLink(s.props.secondaryCta?.link, ["sections", i, "props", "secondaryCta", "link"]);
      }
      if (s.type === "cta_banner") checkLink(s.props.cta.link, ["sections", i, "props", "cta", "link"]);
    });
    // Productos y colecciones requieren una conexión de catálogo configurada y coherente.
    const json = JSON.stringify(doc.sections);
    const connectionIds = [...json.matchAll(/"connectionId":"([0-9a-f-]{36})"/g)].map((m) => m[1]);
    if (connectionIds.length > 0) {
      if (!doc.commerce.connectionId) {
        ctx.addIssue({ code: "custom", path: ["commerce", "connectionId"], message: "Hay productos referenciados sin conexión de catálogo" });
      } else if (connectionIds.some((c) => c !== doc.commerce.connectionId)) {
        ctx.addIssue({ code: "custom", path: ["sections"], message: "Todos los productos deben provenir de la conexión de la landing" });
      }
    }
    // Transaccional requiere carrito lateral.
    const transactional =
      doc.commerce.defaultMode === "transactional" ||
      doc.sections.some((s) => "commerce" in s && s.commerce?.mode === "transactional");
    if (transactional && !doc.toppings.some((t) => t.type === "side_cart" && t.enabled)) {
      ctx.addIssue({ code: "custom", path: ["toppings"], message: "Una landing transaccional requiere el carrito lateral activo" });
    }
  });

export type LandingDocument = z.infer<typeof landingDocumentSchema>;

export function parseLandingDocument(input: unknown) {
  return landingDocumentSchema.safeParse(input);
}
