import { describe, expect, it } from "vitest";
import { parseLandingDocument, type LandingDocument } from "@/modules/blocks/schema";

const CONN = "0b7c9a2e-4d1f-4b8a-9c3e-2f1a0b9c8d7e";

function doc(overrides: Partial<LandingDocument> = {}): unknown {
  return {
    schemaVersion: 1,
    meta: { title: "Lanzamiento" },
    theme: { source: "brand_kit" },
    commerce: { connectionId: null, defaultMode: "promotional" },
    sections: [
      {
        id: "hero01",
        type: "hero",
        variant: "split",
        origin: "ai",
        props: { title: "Nuevo lanzamiento", primaryCta: { label: "Ver más", link: { kind: "anchor", sectionId: "faq001" } } },
      },
      { id: "faq001", type: "faq", variant: "accordion", props: { items: [{ question: "¿Envíos?", answer: "Sí" }] } },
    ],
    ...overrides,
  };
}

describe("TITA Block Schema v1", () => {
  it("acepta un documento promocional válido", () => {
    const r = parseLandingDocument(doc());
    expect(r.success).toBe(true);
  });

  it("rechaza tipos de sección desconocidos (no hay HTML/JS libre)", () => {
    const d = doc() as { sections: unknown[] };
    d.sections.push({ id: "html01", type: "custom_html", variant: "x", props: { html: "<script>alert(1)</script>" } });
    expect(parseLandingDocument(d).success).toBe(false);
  });

  it("rechaza URLs no https", () => {
    const d = doc() as { sections: { props: { primaryCta: unknown } }[] };
    d.sections[0].props.primaryCta = { label: "x", link: { kind: "url", href: "javascript:alert(1)" } };
    expect(parseLandingDocument(d).success).toBe(false);
  });

  it("rechaza anclas a secciones inexistentes", () => {
    const d = doc() as { sections: { props: { primaryCta: unknown } }[] };
    d.sections[0].props.primaryCta = { label: "x", link: { kind: "anchor", sectionId: "noexiste" } };
    expect(parseLandingDocument(d).success).toBe(false);
  });

  it("testimonios generados por IA no son válidos", () => {
    const d = doc() as { sections: unknown[] };
    d.sections.push({ id: "testi1", type: "testimonials", variant: "cards", origin: "ai", props: { items: [{ quote: "Excelente", author: "Inventado" }] } });
    expect(parseLandingDocument(d).success).toBe(false);
  });

  it("no existe campo de precio en las referencias de producto", () => {
    const d = doc({ commerce: { connectionId: CONN, defaultMode: "promotional" } }) as { sections: unknown[] };
    d.sections.push({ id: "grid01", type: "product_grid", variant: "grid", props: { source: { kind: "manual", products: [{ connectionId: CONN, productId: "gid://shopify/Product/1", price: 1000 }] } } });
    const r = parseLandingDocument(d);
    expect(r.success).toBe(true);
    if (r.success) {
      const grid = r.data.sections.find((s) => s.type === "product_grid");
      expect(JSON.stringify(grid)).not.toContain("price");
    }
  });

  it("productos requieren conexión de catálogo", () => {
    const d = doc() as { sections: unknown[] };
    d.sections.push({ id: "grid01", type: "product_grid", variant: "grid", props: { source: { kind: "manual", products: [{ connectionId: CONN, productId: "1" }] } } });
    expect(parseLandingDocument(d).success).toBe(false);
  });

  it("modo transaccional exige carrito lateral", () => {
    const d = doc({ commerce: { connectionId: CONN, defaultMode: "transactional" } });
    expect(parseLandingDocument(d).success).toBe(false);
    const withCart = doc({ commerce: { connectionId: CONN, defaultMode: "transactional" }, toppings: [{ type: "side_cart", enabled: true, config: { freeShippingThreshold: null } }] });
    expect(parseLandingDocument(withCart).success).toBe(true);
  });

  it("rechaza ids de sección duplicados", () => {
    const d = doc() as { sections: { id: string }[] };
    d.sections[1].id = "hero01";
    expect(parseLandingDocument(d).success).toBe(false);
  });
});
