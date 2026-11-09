import Link from "next/link";
import { SignInForm } from "@/modules/auth/components/auth-forms";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/utils";

export const metadata = { title: "Ingresar" };

const MESSAGES: Record<string, { tone: "error" | "success"; text: string }> = {
  confirmed: { tone: "success", text: "Correo confirmado. Ya puedes ingresar." },
  link_invalid: { tone: "error", text: "El enlace no es válido o expiró. Solicita uno nuevo." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next) : undefined;
  const msg = typeof sp.m === "string" ? MESSAGES[sp.m] : undefined;
  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
        <p className="mt-2 text-sm text-ink-500">Ingresa para seguir construyendo tus landings.</p>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <SignInForm next={next} />
      <p className="text-center text-sm text-ink-500">
        ¿No tienes cuenta?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-semibold text-brand-600 hover:text-brand-700">
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
