import Link from "next/link";

export const metadata = { title: "Revisa tu correo" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email.slice(0, 254) : "tu correo";
  const recovery = sp.type === "recovery";
  return (
    <div className="animate-fade-up space-y-6 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-100 text-2xl" aria-hidden="true">
        ✉️
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Revisa tu correo</h1>
        <p className="mt-3 text-sm text-ink-500">
          {recovery
            ? "Si existe una cuenta asociada a "
            : "Enviamos un enlace de confirmación a "}
          <strong className="text-ink-800">{email}</strong>
          {recovery ? ", recibirás un enlace para restablecer tu contraseña." : ". Ábrelo para activar tu cuenta."}
        </p>
        <p className="mt-2 text-xs text-ink-400">El enlace expira en 1 hora. Revisa también la carpeta de spam.</p>
      </div>
      <Link href="/login" className="inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
        Volver a ingresar
      </Link>
    </div>
  );
}
