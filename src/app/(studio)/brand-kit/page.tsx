import { PageHeader } from "@/components/studio/page-header";
import { Alert } from "@/components/ui/alert";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { BrandKitEditor } from "@/modules/brand-kit/components/brand-kit-editor";
import { getBrandKit } from "@/modules/brand-kit/data";
import { requireTenant } from "@/modules/tenancy/context";
import { can } from "@/modules/tenancy/permissions";

export const metadata = { title: "Brand Kit" };

export default async function BrandKitPage({ searchParams }: PageProps<"/brand-kit">) {
  const ctx = await requireTenant();
  const sp = await searchParams;
  const stored = await getBrandKit(ctx.organization.id);

  return (
    <>
      <PageHeader
        eyebrow="Marca"
        title="Brand Kit"
        description="La identidad que la IA y el editor aplicarán automáticamente a cada landing."
        actions={stored ? <span className="text-xs text-ink-400">Última actualización: {formatDate(stored.updatedAt)}</span> : null}
      />
      {stored ? (
        <BrandKitEditor
          orgId={ctx.organization.id}
          orgName={ctx.organization.name}
          initialKit={stored.kit}
          initialVersion={stored.version}
          supabaseUrl={publicEnv().NEXT_PUBLIC_SUPABASE_URL}
          canEdit={can(ctx.role, "brandkit.update")}
          welcome={sp.welcome === "1"}
        />
      ) : (
        <div className="p-8">
          <Alert tone="error" title="No pudimos cargar el Brand Kit">Recarga la página. Si el problema continúa, contacta a soporte.</Alert>
        </div>
      )}
    </>
  );
}
