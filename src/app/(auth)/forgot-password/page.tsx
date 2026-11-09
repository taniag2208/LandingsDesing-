import Link from "next/link";
import { ForgotPasswordForm } from "@/modules/auth/components/auth-forms";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Recupera tu acceso</h1>
        <p className="mt-2 text-sm text-ink-500">Te enviaremos un enlace seguro para crear una nueva contraseña.</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
