import { describe, expect, it } from "vitest";
import { brandKitSchema, pathsBelongToOrg, socialSchema, contactSchema } from "@/modules/brand-kit/schema";
import { brandKitCompletion, brandKitFromRow, DEFAULT_BRAND_KIT } from "@/modules/brand-kit/defaults";
import { contrastLevel, contrastRatio, readableOn } from "@/modules/brand-kit/contrast";
import { buildAssetPath, publicAssetUrl, validateImageFile } from "@/modules/brand-kit/storage";
import { googleFontsHref } from "@/modules/brand-kit/fonts";

const ORG = "6f1c1b4e-2a52-4c64-9a7e-3c1a2b3c4d5e";

describe("schema del Brand Kit", () => {
  it("los valores por defecto son válidos", () => {
    expect(brandKitSchema.safeParse(DEFAULT_BRAND_KIT).success).toBe(true);
  });
  it("rechaza colores no hexadecimales (posible inyección CSS)", () => {
    const bad = { ...DEFAULT_BRAND_KIT, colors: { ...DEFAULT_BRAND_KIT.colors, primary: "red;background:url(x)" } };
    expect(brandKitSchema.safeParse(bad).success).toBe(false);
  });
  it("rechaza fuentes fuera del catálogo", () => {
    const bad = { ...DEFAULT_BRAND_KIT, typography: { ...DEFAULT_BRAND_KIT.typography, heading: "Comic Sans" } };
    expect(brandKitSchema.safeParse(bad).success).toBe(false);
  });
  it("normaliza colores a minúsculas", () => {
    const kit = brandKitSchema.parse({ ...DEFAULT_BRAND_KIT, colors: { ...DEFAULT_BRAND_KIT.colors, primary: "#AABBCC" } });
    expect(kit.colors.primary).toBe("#aabbcc");
  });
  it("valida redes por dominio y https", () => {
    const ok = socialSchema.safeParse({ ...DEFAULT_BRAND_KIT.social, instagram: "https://www.instagram.com/marca" });
    expect(ok.success).toBe(true);
    for (const bad of ["http://instagram.com/x", "https://instagram.com.evil.io/x", "javascript:alert(1)"]) {
      expect(socialSchema.safeParse({ ...DEFAULT_BRAND_KIT.social, instagram: bad }).success).toBe(false);
    }
  });
  it("valida WhatsApp en formato internacional", () => {
    expect(contactSchema.safeParse({ ...DEFAULT_BRAND_KIT.contact, whatsapp: "+57 300 123 4567" }).success).toBe(true);
    expect(contactSchema.safeParse({ ...DEFAULT_BRAND_KIT.contact, whatsapp: "abc" }).success).toBe(false);
  });
  it("deduplica palabras de tono", () => {
    const kit = brandKitSchema.parse({ ...DEFAULT_BRAND_KIT, tone: { ...DEFAULT_BRAND_KIT.tone, wordsToUse: ["origen", "origen", " café "] } });
    expect(kit.tone.wordsToUse).toEqual(["origen", "café"]);
  });
  it("rutas de archivos confinadas a la organización", () => {
    const path = buildAssetPath(ORG, "logo", "image/png", "abcdef1234567890");
    const kit = brandKitSchema.parse({ ...DEFAULT_BRAND_KIT, logoPath: path });
    expect(pathsBelongToOrg(kit, ORG)).toBe(true);
    expect(pathsBelongToOrg(kit, "00000000-0000-0000-0000-000000000000")).toBe(false);
  });
  it("rechaza rutas con traversal", () => {
    expect(brandKitSchema.safeParse({ ...DEFAULT_BRAND_KIT, logoPath: `${ORG}/logo/../../otro.png` }).success).toBe(false);
  });
});

describe("brandKitFromRow", () => {
  it("tolera filas vacías o corruptas", () => {
    const kit = brandKitFromRow({ logo_path: null, logo_dark_path: null, colors: { primary: "nope" }, typography: null, images: "x", tone: {}, contact: {}, social: {} });
    expect(kit.colors).toEqual(DEFAULT_BRAND_KIT.colors);
    expect(kit.images).toEqual([]);
  });
  it("conserva valores válidos", () => {
    const kit = brandKitFromRow({ logo_path: null, logo_dark_path: null, colors: { primary: "#112233" }, typography: {}, images: [], tone: { description: "Hola" }, contact: {}, social: {} });
    expect(kit.colors.primary).toBe("#112233");
    expect(kit.tone.description).toBe("Hola");
  });
});

describe("completitud", () => {
  it("un kit por defecto está incompleto", () => {
    expect(brandKitCompletion(DEFAULT_BRAND_KIT).percent).toBe(0);
  });
});

describe("contraste WCAG", () => {
  it("negro sobre blanco = 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastLevel(21)).toBe("AAA");
  });
  it("detecta contraste insuficiente", () => {
    expect(contrastLevel(contrastRatio("#cccccc", "#ffffff"))).toBe("fail");
  });
  it("elige texto legible", () => {
    expect(readableOn("#5b3df5")).toBe("#ffffff");
    expect(readableOn("#ffe066")).toBe("#0b0b14");
  });
});

describe("storage", () => {
  it("valida tipo y tamaño", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 100 })).toMatch(/Formato/);
    expect(validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validateImageFile({ type: "image/webp", size: 1000 })).toBeNull();
  });
  it("construye URLs públicas codificadas", () => {
    expect(publicAssetUrl("http://x.test/", `${ORG}/logo/a.png`)).toBe(`http://x.test/storage/v1/object/public/brand-assets/${ORG}/logo/a.png`);
  });
  it("URL de Google Fonts solo con familias permitidas", () => {
    const href = googleFontsHref(["Inter", "Playfair Display", "Inter"]);
    expect(href).toContain("family=Inter:wght");
    expect(href).toContain("family=Playfair+Display");
    expect(href.match(/family=/g)).toHaveLength(2);
  });
});
