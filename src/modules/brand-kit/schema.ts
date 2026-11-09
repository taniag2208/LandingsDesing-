import { z } from "zod";
import { FONT_FAMILIES } from "./fonts";

/**
 * Contrato del Brand Kit. Es consumido por:
 *  - el editor del Brand Kit (Fase 1),
 *  - el motor de generación IA para adaptar tono y estilo (Fase 2),
 *  - el motor de componentes para derivar design tokens (Fase 2/3).
 */

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal #RRGGBB")
  .transform((v) => v.toLowerCase());

export const colorsSchema = z.object({
  primary: hex,
  secondary: hex,
  accent: hex,
  background: hex,
  surface: hex,
  text: hex,
});

export const typographySchema = z.object({
  heading: z.enum(FONT_FAMILIES),
  body: z.enum(FONT_FAMILIES),
  headingWeight: z.union([z.literal(500), z.literal(600), z.literal(700), z.literal(800)]),
  baseSize: z.union([z.literal(15), z.literal(16), z.literal(17), z.literal(18)]),
});

export const styleSchema = z.object({
  radius: z.enum(["none", "sm", "md", "lg", "full"]),
  buttonStyle: z.enum(["solid", "outline", "soft"]),
});

/** Ruta de Storage confinada a la organización: <orgId>/<carpeta>/<archivo>. */
export const storagePathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/(logo|images)\/[a-zA-Z0-9_-]{8,64}\.(png|jpe?g|webp|avif|gif)$/,
    "Ruta de archivo inválida",
  );

export const brandImageSchema = z.object({
  path: storagePathSchema,
  alt: z.string().trim().max(160, "Máximo 160 caracteres"),
});

export const TONE_PRESETS = [
  { value: "cercano", label: "Cercano", hint: "Amigable, conversacional, empático." },
  { value: "profesional", label: "Profesional", hint: "Claro, confiable, preciso." },
  { value: "premium", label: "Premium", hint: "Sofisticado, sobrio, aspiracional." },
  { value: "juvenil", label: "Juvenil", hint: "Energético, directo, con actitud." },
  { value: "tecnico", label: "Técnico", hint: "Especializado, basado en datos." },
  { value: "inspirador", label: "Inspirador", hint: "Emocional, motivador, de propósito." },
] as const;

const wordList = z
  .array(z.string().trim().min(1).max(40))
  .max(15, "Máximo 15 palabras")
  .transform((arr) => [...new Set(arr.map((w) => w.trim()).filter(Boolean))]);

export const toneSchema = z.object({
  preset: z.enum(TONE_PRESETS.map((t) => t.value) as [string, ...string[]]),
  formality: z.enum(["tu", "usted"]),
  language: z.enum(["es", "en", "pt"]),
  description: z.string().trim().max(500, "Máximo 500 caracteres"),
  wordsToUse: wordList,
  wordsToAvoid: wordList,
});

const optionalText = (max: number) => z.string().trim().max(max);

export const contactSchema = z.object({
  email: z.union([z.literal(""), z.email("Correo inválido").trim().toLowerCase()]),
  phone: optionalText(30).refine((v) => v === "" || /^\+?[0-9 ()-]{7,30}$/.test(v), "Teléfono inválido"),
  whatsapp: optionalText(20).refine(
    (v) => v === "" || /^\+?[1-9][0-9]{7,14}$/.test(v.replace(/[\s-]/g, "")),
    "Usa formato internacional, ej. +573001234567",
  ),
  address: optionalText(200),
  city: optionalText(80),
  businessHours: optionalText(120),
});

const SOCIAL_HOSTS = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  tiktok: ["tiktok.com"],
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  youtube: ["youtube.com", "youtu.be"],
  pinterest: ["pinterest.com"],
} as const;

export type SocialNetwork = keyof typeof SOCIAL_HOSTS;
export const SOCIAL_NETWORKS = Object.keys(SOCIAL_HOSTS) as SocialNetwork[];

function socialUrl(network: SocialNetwork) {
  const hosts: readonly string[] = SOCIAL_HOSTS[network];
  return z
    .string()
    .trim()
    .max(200)
    .refine((v) => {
      if (v === "") return true;
      try {
        const u = new URL(v);
        const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
        return u.protocol === "https:" && hosts.some((h) => host === h || host.endsWith(`.${h}`));
      } catch {
        return false;
      }
    }, `Ingresa un enlace https de ${hosts[0]}`);
}

export const socialSchema = z.object(
  Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, socialUrl(n)])) as {
    [K in SocialNetwork]: ReturnType<typeof socialUrl>;
  },
);

export const brandKitSchema = z.object({
  logoPath: storagePathSchema.nullable(),
  logoDarkPath: storagePathSchema.nullable(),
  colors: colorsSchema,
  typography: typographySchema,
  style: styleSchema,
  images: z.array(brandImageSchema).max(24, "Máximo 24 imágenes"),
  tone: toneSchema,
  contact: contactSchema,
  social: socialSchema,
});

export type BrandKit = z.infer<typeof brandKitSchema>;
export type BrandKitInput = z.input<typeof brandKitSchema>;

export const saveBrandKitSchema = z.object({
  expectedVersion: z.number().int().positive(),
  kit: brandKitSchema,
});

/** Verifica que todas las rutas de archivos pertenezcan a la organización. */
export function pathsBelongToOrg(kit: BrandKit, orgId: string): boolean {
  const paths = [kit.logoPath, kit.logoDarkPath, ...kit.images.map((i) => i.path)].filter(
    (p): p is string => Boolean(p),
  );
  return paths.every((p) => p.startsWith(`${orgId}/`));
}
