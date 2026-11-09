import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { requireTenant } from "@/modules/tenancy/context";
import { can } from "@/modules/tenancy/permissions";
import { countMembers, getEntitlements } from "@/modules/tenancy/data";
import { FEATURE_KEYS, FEATURE_LABELS, LIMIT_KEYS, LIMIT_LABELS, formatLimit, type LimitKey } from "@/modules/billing/entitlements";

export const metadata = { title: "Plan y consumo" };

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "brand" }> = {
  trialing: { label: "Periodo de prueba", tone: "brand" },
  active: { label: "Activo", tone: "success" },
  past_due: { label: "Pago pendiente", tone: "warning" },
  canceled: { label: "Cancelado", tone: "danger" },
  paused: { label: "Pausado", tone: "warning" },
};

export default async function PlanPage() {
  const ctx = await requireTenant();
  if (!can(ctx.role, "billing.read")) {
    return <Alert tone="warning">Solo propietarios y administradores pueden ver el plan.</Alert>;
  }
  const [ent, members] = await Promise.all([getEntitlements(ctx.organization.id), countMembers(ctx.organization.id)]);
  if (!ent) return <Alert tone="error">No pudimos cargar la información del plan.</Alert>;

  // Consumo medido hoy. Las demás métricas se instrumentan en su fase.
  const usage: Partial<Record<LimitKey, number>> = { seats: members };
  const status = STATUS[ent.status];

  return (
    <>
      <Card>
        <CardHeader title={`Plan ${ent.plan_name}`} description="Límites configurables por Tita Media. Los precios y el cobro se gestionan en la Fase 8." action={<Badge tone={status.tone}>{status.label}</Badge>} />
        <ul className="divide-y divide-ink-100">
          {LIMIT_KEYS.map((k) => {
            const limit = ent.limits[k];
            const used = usage[k];
            const pct = used !== undefined && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            return (
              <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-6 py-3.5">
                <span className="text-sm text-ink-700">{LIMIT_LABELS[k]}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {used !== undefined ? `${used} / ` : ""}{formatLimit(limit)}
                  {used === undefined && <span className="ml-2 text-xs font-normal text-ink-400">consumo aún no medido</span>}
                </span>
                {used !== undefined && limit > 0 && (
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${pct >= 90 ? "bg-coral-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Funcionalidades incluidas" />
        <ul className="grid gap-2 p-6 sm:grid-cols-2">
          {FEATURE_KEYS.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <span className={`grid size-5 place-items-center rounded-full text-[11px] ${ent.features[f] ? "bg-aqua-500 text-white" : "bg-ink-100 text-ink-400"}`} aria-hidden="true">{ent.features[f] ? "✓" : "–"}</span>
              <span className={ent.features[f] ? "text-ink-800" : "text-ink-400"}>{FEATURE_LABELS[f]}</span>
              <span className="sr-only">{ent.features[f] ? "incluida" : "no incluida"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
