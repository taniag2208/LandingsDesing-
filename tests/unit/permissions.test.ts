import { describe, expect, it } from "vitest";
import { assignableRoles, can, PERMISSIONS } from "@/modules/tenancy/permissions";
import { toUserMessage } from "@/modules/tenancy/errors";

describe("permisos", () => {
  it("solo owner gestiona facturación", () => {
    expect(can("owner", "billing.manage")).toBe(true);
    expect(can("admin", "billing.manage")).toBe(false);
  });
  it("analista es solo lectura", () => {
    const writes = Object.keys(PERMISSIONS).filter((p) => !p.endsWith(".read")) as (keyof typeof PERMISSIONS)[];
    for (const p of writes) expect(can("analyst", p)).toBe(false);
  });
  it("editor edita Brand Kit pero no gestiona equipo", () => {
    expect(can("editor", "brandkit.update")).toBe(true);
    expect(can("editor", "members.manage")).toBe(false);
  });
  it("sin rol no hay permisos", () => {
    expect(can(null, "org.read")).toBe(false);
  });
  it("un admin no puede asignar owner", () => {
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("editor")).toEqual([]);
  });
});

describe("mensajes de error", () => {
  it("traduce errores de negocio sin exponer detalles internos", () => {
    expect(toUserMessage({ code: "P0001", message: "seat_limit_reached" })).toMatch(/asientos/);
    expect(toUserMessage({ code: "23505", message: 'duplicate key value violates unique constraint "organizations_slug_key"' })).toMatch(/identificador/);
    expect(toUserMessage({ code: "XX000", message: "internal: relation secret_table" })).toBe("Ocurrió un error inesperado.");
  });
});
