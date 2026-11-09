import { describe, expect, it } from "vitest";
import { safeNextPath, slugify } from "@/lib/utils";
import { SLUG_REGEX } from "@/modules/tenancy/schemas";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/brand-kit?x=1")).toBe("/brand-kit?x=1");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", 42, null])("rechaza redirecciones externas: %s", (v) => {
    expect(safeNextPath(v)).toBe("/dashboard");
  });
});

describe("slugify", () => {
  it("normaliza acentos y espacios", () => {
    expect(slugify("Café de Origen Ñandú")).toBe("cafe-de-origen-nandu");
  });
  it("siempre produce un slug válido para la BD", () => {
    for (const input of ["A", "!!!", "  Marca   Ñ  ", "x".repeat(100), "Nike Colombia"]) {
      expect(slugify(input)).toMatch(SLUG_REGEX);
    }
  });
});
