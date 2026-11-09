import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { requireTenant } from "@/modules/tenancy/context";
import { getBrandKit } from "@/modules/brand-kit/data";
import { brandKitCompletion } from "@/modules/brand-kit/defaults";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const ctx = await requireTenant();
  const sp = await searchParams;
  const stored = await getBrandKit(ctx.organization.id);
  const completion = stored ? brandKitCompletion(stored.kit) : { percent: 0, items: [] };
  const firstName = ctx.user.fullName?.split(" ")[0];

  const steps = [
    { title: "Configura tu Brand Kit", body: "Logo, colores, tipografías y tono.", href: "/brand-kit", done: completion.percent === 100, progress: completion.percent, available: true },
    { title: "Conecta tu ecommerce", body: "Shopify o VTEX para usar productos reales.", phase: 4, available: false, done: false },
    { title: "Crea tu primera landing", body: "Discovery guiado + generación con IA.", phase: 2, available: false, done: false },
  ];

  return (
    <>
      <PageHeader
        eyebrow={ctx.organization.name}
        title={firstName ? `Hola, ${firstName}` : "Inicio"}
        description="Este es tu estudio. Desde aquí gestionas marca, catálogo, landings y resultados."
      />
      <div className="space-y-8 px-5 py-8 sm:px-8">
        {sp.joined === "1" && <Alert tone="success">Te uniste a {ctx.organization.name}.</Alert>}
        {sp.password === "updated" && <Alert tone="success">Tu contraseña fue actualizada.</Alert>}

        <section aria-labelledby="getting-started">
          <h2 id="getting-started" className="mb-4 font-display text-lg font-semibold">Primeros pasos</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <Card className={cn("relative h-full p-5 transition", s.available && "hover:-translate-y-0.5 hover:shadow-lift")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("grid size-8 place-items-center rounded-full font-display text-sm font-bold", s.done ? "bg-aqua-500 text-white" : s.available ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-400")}>
                      {s.done ? "✓" : i + 1}
                    </span>
                    {!s.available && <Badge tone="soon">Fase {s.phase}</Badge>}
                    {s.available && !s.done && <Badge tone="brand">{s.progress}%</Badge>}
                  </div>
                  <h3 className={cn("mt-4 font-semibold", !s.available && "text-ink-500")}>{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{s.body}</p>
                  {s.available && (
                    <>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del Brand Kit">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-500 transition-all" style={{ width: `${s.progress}%` }} />
                      </div>
                      <Link href={s.href!} className="absolute inset-0 rounded-2xl" aria-label={s.title} />
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="landings">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="landings" className="font-display text-lg font-semibold">Mis landings</h2>
            <Badge tone="soon">Constructor en Fase 2–3</Badge>
          </div>
          <Card className="flex flex-col items-center px-6 py-14 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-aqua-100 text-2xl" aria-hidden="true">✦</div>
            <h3 className="mt-4 font-display text-lg font-semibold">Aún no tienes landings</h3>
            <p className="mt-1.5 max-w-md text-sm text-ink-500">
              Cuando el constructor esté habilitado verás aquí tus campañas con estado, visitas y conversiones. Mientras tanto, deja tu marca lista: la IA la usará para generar tu primera propuesta.
            </p>
            <ButtonLink href="/brand-kit" variant="secondary" className="mt-6">Completar Brand Kit</ButtonLink>
          </Card>
        </section>
      </div>
    </>
  );
}
