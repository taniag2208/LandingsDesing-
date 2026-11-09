import { describe, expect, it } from "vitest";
import { checkLimit, hasFeature, type Entitlements } from "@/modules/billing/entitlements";

const base: Entitlements = {
  plan_code: "starter",
  plan_name: "Starter",
  status: "active",
  limits: { active_landings: 1, seats: 2, monthly_visits: -1 },
  features: { custom_domain: false, transactional_landings: true },
};

describe("entitlements", () => {
  it("permite consumir dentro del límite", () => {
    expect(checkLimit(base, "active_landings", 0)).toEqual({ allowed: true, remaining: 0 });
  });
  it("bloquea al superar el límite", () => {
    expect(checkLimit(base, "active_landings", 1)).toMatchObject({ allowed: false, reason: "limit_reached" });
  });
  it("-1 es ilimitado", () => {
    expect(checkLimit(base, "monthly_visits", 1e9)).toEqual({ allowed: true, remaining: "unlimited" });
  });
  it("límite ausente equivale a 0", () => {
    expect(checkLimit(base, "custom_domains", 0)).toMatchObject({ allowed: false });
  });
  it("suscripción cancelada bloquea límites y features", () => {
    const canceled = { ...base, status: "canceled" as const };
    expect(checkLimit(canceled, "seats", 0)).toMatchObject({ allowed: false, reason: "inactive_subscription" });
    expect(hasFeature(canceled, "transactional_landings")).toBe(false);
  });
  it("features", () => {
    expect(hasFeature(base, "custom_domain")).toBe(false);
    expect(hasFeature(base, "transactional_landings")).toBe(true);
  });
});
