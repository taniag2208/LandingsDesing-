import Link from "next/link";
import { SignUpForm } from "@/modules/auth/components/auth-forms";
import { safeNextPath } from "@/lib/utils";

export const metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next, "/onboarding") : undefined;
  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Crea tu estudio</h1>
        <p className="mt-2 text-sm text-ink-500">En minutos tendrás tu marca lista para generar landings.</p>
      </div>
      <SignUpForm next={next} />
      <p className="text-center text-sm text-ink-500">
        ¿Ya tienes cuenta?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-600 hover:text-brand-700">
          Ingresa
        </Link>
      </p>
    </div>
  );
}
