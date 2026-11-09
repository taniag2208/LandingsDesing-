import { z } from "zod";

/**
 * Límites y features configurables por plan (tabla public.plans).
 * -1 representa "ilimitado". Los precios NO se modelan aquí.
 */
export const LIMIT_KEYS = [
  "active_landings",
  "seats",
  "ai_generations_monthly",
  "storage_mb",
  "monthly_visits",
  "commerce_connections",
  "custom_domains",
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export const FEATURE_KEYS = [
  "custom_domain",
  "premium_toppings",
  "transactional_landings",
  "remove_branding",
  "ab_testing",
  "crm_integrations",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const LIMIT_LABELS: Record<LimitKey, string> = {
  active_landings: "Landings activas",
  seats: "Usuarios",
  ai_generations_monthly: "Generaciones IA / mes",
  storage_mb: "Almacenamiento (MB)",
  monthly_visits: "Visitas / mes",
  commerce_connections: "Tiendas conectadas",
  custom_domains: "Dominios propios",
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  custom_domain: "Dominio propio",
  premium_toppings: "Toppings premium",
  transactional_landings: "Landings transaccionales",
  remove_branding: "Sin marca Tita",
  ab_testing: "Experimentos A/B",
  crm_integrations: "Integraciones CRM",
};

export const entitlementsSchema = z.object({
  plan_code: z.string(),
  plan_name: z.string(),
  status: z.enum(["trialing", "active", "past_due", "canceled", "paused"]),
  limits: z.record(z.string(), z.number().int()),
  features: z.record(z.string(), z.boolean()),
});
export type Entitlements = z.infer<typeof entitlementsSchema>;

export type LimitCheck =
  | { allowed: true; remaining: number | "unlimited" }
  | { allowed: false; reason: "limit_reached" | "inactive_subscription"; limit: number };

const BLOCKING_STATUSES = new Set(["canceled", "paused"]);

/** Verifica si consumir `amount` unidades de un límite está permitido. */
export function checkLimit(ent: Entitlements, key: LimitKey, used: number, amount = 1): LimitCheck {
  const limit = ent.limits[key] ?? 0;
  if (BLOCKING_STATUSES.has(ent.status)) {
    return { allowed: false, reason: "inactive_subscription", limit };
  }
  if (limit < 0) return { allowed: true, remaining: "unlimited" };
  if (used + amount > limit) return { allowed: false, reason: "limit_reached", limit };
  return { allowed: true, remaining: limit - used - amount };
}

export function hasFeature(ent: Entitlements, key: FeatureKey): boolean {
  if (BLOCKING_STATUSES.has(ent.status)) return false;
  return ent.features[key] === true;
}

export function formatLimit(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value < 0) return "Ilimitado";
  return new Intl.NumberFormat("es-CO").format(value);
}
