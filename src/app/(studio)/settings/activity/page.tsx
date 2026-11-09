import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { requireTenant } from "@/modules/tenancy/context";
import { can } from "@/modules/tenancy/permissions";
import { listAuditLogs, listMembers } from "@/modules/tenancy/data";

export const metadata = { title: "Actividad" };

const ENTITY: Record<string, string> = {
  organizations: "la organización",
  memberships: "una membresía",
  brand_kits: "el Brand Kit",
  invitations: "una invitación",
  subscriptions: "la suscripción",
};
const ACTION: Record<string, string> = { insert: "creó", update: "actualizó", delete: "eliminó" };

export default async function ActivityPage() {
  const ctx = await requireTenant();
  if (!can(ctx.role, "audit.read")) return <Alert tone="warning">Solo propietarios y administradores pueden ver la actividad.</Alert>;
  const [logs, members] = await Promise.all([listAuditLogs(ctx.organization.id), listMembers(ctx.organization.id)]);
  const names = new Map(members.map((m) => [m.user_id, m.full_name ?? m.email]));

  return (
    <Card>
      <CardHeader title="Registro de actividad" description="Últimos 50 cambios. Se registran claves modificadas, nunca valores sensibles." />
      {logs.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-500">Aún no hay actividad registrada.</p>
      ) : (
        <ol className="divide-y divide-ink-100">
          {logs.map((l) => {
            const changed = Array.isArray(l.metadata?.changed) ? (l.metadata.changed as string[]) : [];
            return (
              <li key={l.id} className="flex flex-wrap items-baseline gap-x-2 px-6 py-3 text-sm">
                <span className="font-medium">{(l.actor_id && names.get(l.actor_id)) ?? "Sistema"}</span>
                <span className="text-ink-600">{ACTION[l.action] ?? l.action} {ENTITY[l.entity_type] ?? l.entity_type}</span>
                {changed.length > 0 && <span className="text-xs text-ink-400">({changed.join(", ")})</span>}
                <time className="ml-auto text-xs text-ink-400" dateTime={l.created_at}>{formatDate(l.created_at)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
