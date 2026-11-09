/**
 * Catálogo curado de tipografías (Google Fonts). Se usa una lista cerrada:
 * evita inyección de CSS/URLs arbitrarias y garantiza que el motor de
 * componentes (Fase 2) y el motor de publicación (Fase 7) puedan servirlas.
 */
export const FONT_OPTIONS = [
  { family: "Inter", category: "sans" },
  { family: "Manrope", category: "sans" },
  { family: "DM Sans", category: "sans" },
  { family: "Plus Jakarta Sans", category: "sans" },
  { family: "Poppins", category: "sans" },
  { family: "Montserrat", category: "sans" },
  { family: "Outfit", category: "sans" },
  { family: "Sora", category: "sans" },
  { family: "Space Grotesk", category: "sans" },
  { family: "Work Sans", category: "sans" },
  { family: "Nunito", category: "sans" },
  { family: "Raleway", category: "sans" },
  { family: "IBM Plex Sans", category: "sans" },
  { family: "Archivo", category: "sans" },
  { family: "Playfair Display", category: "serif" },
  { family: "Fraunces", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "Bebas Neue", category: "display" },
  { family: "Oswald", category: "display" },
] as const;

export type FontFamily = (typeof FONT_OPTIONS)[number]["family"];
export const FONT_FAMILIES = FONT_OPTIONS.map((f) => f.family) as [FontFamily, ...FontFamily[]];

const FALLBACK: Record<string, string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  display: "Impact, ui-sans-serif, sans-serif",
};

export function fontStack(family: FontFamily): string {
  const opt = FONT_OPTIONS.find((f) => f.family === family);
  return `"${family}", ${FALLBACK[opt?.category ?? "sans"]}`;
}

/** URL de Google Fonts CSS2 para una lista de familias permitidas. */
export function googleFontsHref(families: FontFamily[]): string {
  const unique = [...new Set(families)].filter((f) => FONT_FAMILIES.includes(f));
  const params = unique
    .map((f) => {
      const single = f === "Bebas Neue" || f === "DM Serif Display";
      return `family=${encodeURIComponent(f).replace(/%20/g, "+")}${single ? "" : ":wght@400;500;600;700;800"}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
