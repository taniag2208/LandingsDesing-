import type { BrandKit } from "./schema";
import { brandKitSchema, colorsSchema, contactSchema, socialSchema, styleSchema, toneSchema, typographySchema } from "./schema";
import type { BrandKitRow } from "@/lib/supabase/types";
import type { z } from "zod";

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoPath: null,
  logoDarkPath: null,
  colors: {
    primary: "#5b3df5",
    secondary: "#0f0d1f",
    accent: "#00d1b2",
    background: "#ffffff",
    surface: "#f5f4fb",
    text: "#14121f",
  },
  typography: { heading: "Plus Jakarta Sans", body: "Inter", headingWeight: 700, baseSize: 16 },
  style: { radius: "md", buttonStyle: "solid" },
  images: [],
  tone: { preset: "cercano", formality: "tu", language: "es", description: "", wordsToUse: [], wordsToAvoid: [] },
  contact: { email: "", phone: "", whatsapp: "", address: "", city: "", businessHours: "" },
  social: { instagram: "", facebook: "", tiktok: "", x: "", linkedin: "", youtube: "", pinterest: "" },
};

/** Combina un sub-objeto guardado con los valores por defecto, descartando datos inválidos. */
function mergeSection<S extends z.ZodType>(schema: S, stored: unknown, fallback: z.infer<S>): z.infer<S> {
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const merged = { ...(fallback as object), ...(stored as object) };
    const parsed = schema.safeParse(merged);
    if (parsed.success) return parsed.data;
  }
  return fallback;
}

/** Convierte la fila de BD en un BrandKit válido y completo (tolerante a datos legados). */
export function brandKitFromRow(row: Pick<BrandKitRow, "logo_path" | "logo_dark_path" | "colors" | "typography" | "images" | "tone" | "contact" | "social"> & { style?: unknown }): BrandKit {
  const d = DEFAULT_BRAND_KIT;
  const candidate: BrandKit = {
    logoPath: row.logo_path,
    logoDarkPath: row.logo_dark_path,
    colors: mergeSection(colorsSchema, row.colors, d.colors),
    typography: mergeSection(typographySchema, row.typography, d.typography),
    style: mergeSection(styleSchema, row.style, d.style),
    images: Array.isArray(row.images) ? (row.images as BrandKit["images"]) : [],
    tone: mergeSection(toneSchema, row.tone, d.tone),
    contact: mergeSection(contactSchema, row.contact, d.contact),
    social: mergeSection(socialSchema, row.social, d.social),
  };
  const parsed = brandKitSchema.safeParse(candidate);
  return parsed.success ? parsed.data : { ...candidate, images: [] };
}

export interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
}

/** Checklist de completitud: guía al usuario sin bloquearlo. */
export function brandKitCompletion(kit: BrandKit): { percent: number; items: CompletionItem[] } {
  const items: CompletionItem[] = [
    { key: "logo", label: "Logo", done: Boolean(kit.logoPath) },
    {
      key: "colors",
      label: "Colores de marca",
      done: JSON.stringify(kit.colors) !== JSON.stringify(DEFAULT_BRAND_KIT.colors),
    },
    {
      key: "typography",
      label: "Tipografías",
      done: JSON.stringify(kit.typography) !== JSON.stringify(DEFAULT_BRAND_KIT.typography),
    },
    { key: "images", label: "Imágenes de marca", done: kit.images.length > 0 },
    { key: "tone", label: "Tono de comunicación", done: kit.tone.description.length >= 20 },
    {
      key: "contact",
      label: "Datos de contacto",
      done: Boolean(kit.contact.email || kit.contact.phone || kit.contact.whatsapp),
    },
    { key: "social", label: "Redes sociales", done: Object.values(kit.social).some(Boolean) },
  ];
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { percent, items };
}
