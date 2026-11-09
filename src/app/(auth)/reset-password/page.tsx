import { ResetPasswordForm } from "@/modules/auth/components/auth-forms";
import { requireUser } from "@/modules/tenancy/context";

export const metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage() {
  // La sesión de recuperación la establece /auth/confirm.
  await requireUser();
  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Crea una nueva contraseña</h1>
        <p className="mt-2 text-sm text-ink-500">Usa una contraseña única que no utilices en otros servicios.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
