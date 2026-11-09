import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { requireTenant } from "@/modules/tenancy/context";
import { assignableRoles, can, ROLE_LABELS } from "@/modules/tenancy/permissions";
import { getEntitlements, listMembers, listPendingInvitations } from "@/modules/tenancy/data";
import { InviteForm, MemberRow, RoleLegend } from "@/modules/tenancy/components/team-manager";
import { revokeInvitationAction } from "@/modules/tenancy/actions";
import { formatLimit } from "@/modules/billing/entitlements";

export const metadata = { title: "Equipo" };

export default async function TeamPage() {
  const ctx = await requireTenant();
  const canManage = can(ctx.role, "members.manage");
  const [members, invitations, ent] = await Promise.all([
    listMembers(ctx.organization.id),
    canManage ? listPendingInvitations(ctx.organization.id) : Promise.resolve([]),
    getEntitlements(ctx.organization.id),
  ]);
  const seats = ent?.limits.seats;
  const used = members.length + invitations.length;

  return (
    <>
      {canManage && (
        <Card>
          <CardHeader
            title="Invitar al equipo"
            description="Cada persona accede con su propia cuenta y rol."
            action={<Badge tone={seats !== undefined && seats >= 0 && used >= seats ? "warning" : "neutral"}>{used}/{formatLimit(seats)} asientos</Badge>}
          />
          <InviteForm roles={assignableRoles(ctx.role)} />
        </Card>
      )}

      <Card>
        <CardHeader title="Miembros" description={`${members.length} ${members.length === 1 ? "persona" : "personas"} en ${ctx.organization.name}`} />
        <ul className="divide-y divide-ink-100">
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} actorRole={ctx.role} actorId={ctx.user.id} assignable={assignableRoles(ctx.role)} />
          ))}
        </ul>
      </Card>

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader title="Invitaciones pendientes" />
          <ul className="divide-y divide-ink-100">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-ink-500">{ROLE_LABELS[inv.role]} · expira {formatDate(inv.expires_at)}</p>
                </div>
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="invitationId" value={inv.id} />
                  <button type="submit" className="rounded-lg px-2 py-1 text-xs font-medium text-coral-500 hover:bg-coral-100/60">Revocar</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Roles y permisos" />
        <RoleLegend />
      </Card>
    </>
  );
}
