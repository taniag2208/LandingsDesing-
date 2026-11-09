import { Card, CardHeader } from "@/components/ui/card";
import { requireTenant } from "@/modules/tenancy/context";
import { can } from "@/modules/tenancy/permissions";
import { OrgSettingsForm } from "@/modules/tenancy/components/org-settings-form";

export const metadata = { title: "Organización" };

export default async function OrganizationSettingsPage() {
  const ctx = await requireTenant();
  return (
    <Card>
      <CardHeader title="Información de la empresa" description={can(ctx.role, "org.update") ? "Visible para todo tu equipo." : "Solo propietarios y administradores pueden editar estos datos."} />
      <OrgSettingsForm org={ctx.organization} canEdit={can(ctx.role, "org.update")} />
    </Card>
  );
}
