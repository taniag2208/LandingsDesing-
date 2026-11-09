import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { CreateOrgForm } from "@/modules/tenancy/components/create-org-form";
import { getMemberships, requireUser } from "@/modules/tenancy/context";

export const metadata = { title: "Crea tu organización" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const memberships = await getMemberships();
  const sp = await searchParams;
  if (memberships.length > 0 && sp.new !== "1") redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="flex items-center justify-between px-6 py-6">
        <Logo />
        {memberships.length > 0 && (
          <Link href="/dashboard" className="text-sm font-medium text-ink-500 hover:text-ink-800">Cancelar</Link>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-20">
        <ol className="mb-8 flex items-center gap-2 text-xs font-medium text-ink-400" aria-label="Progreso">
          <li className="flex items-center gap-2 text-ink-800"><span className="grid size-6 place-items-center rounded-full bg-aqua-500 text-white">✓</span> Cuenta</li>
          <li aria-hidden="true" className="h-px w-8 bg-ink-200" />
          <li className="flex items-center gap-2 text-brand-600" aria-current="step"><span className="grid size-6 place-items-center rounded-full bg-brand-500 text-white">2</span> Empresa</li>
          <li aria-hidden="true" className="h-px w-8 bg-ink-200" />
          <li className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-ink-200 text-ink-600">3</span> Marca</li>
        </ol>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {memberships.length ? "Nueva organización" : `Hola${user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋`}
        </h1>
        <p className="mt-2 mb-8 text-sm text-ink-500">
          Registra tu empresa. Todo lo que crees (marca, catálogo, landings) quedará aislado dentro de ella y podrás invitar a tu equipo.
        </p>
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-200/70">
          <CreateOrgForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">¿Te invitaron a un equipo? Abre el enlace de invitación que recibiste.</p>
      </main>
    </div>
  );
}
