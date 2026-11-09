import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SidebarNav } from "@/components/studio/sidebar-nav";
import { OrgSwitcher } from "@/components/studio/org-switcher";
import { MobileNav } from "@/components/studio/mobile-nav";
import { UserMenu } from "@/components/studio/user-menu";
import { requireTenant } from "@/modules/tenancy/context";

export default async function StudioLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireTenant();
  const current = ctx.memberships.find((m) => m.organization.id === ctx.organization.id)!;
  const footer = (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <OrgSwitcher current={{ ...current, organization: { ...current.organization, name: ctx.organization.name } }} memberships={ctx.memberships} />
      <UserMenu user={ctx.user} />
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <MobileNav footer={footer} />
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-ink-950 p-4 lg:flex">
        <div className="space-y-8">
          <Link href="/dashboard" className="block px-2 pt-1" aria-label="Inicio">
            <Logo inverted />
          </Link>
          <SidebarNav />
        </div>
        {footer}
      </aside>
      <main id="main" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
