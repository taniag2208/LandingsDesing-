import { Logo } from "@/components/ui/logo";
import { AcceptInviteForm } from "@/modules/tenancy/components/accept-invite-form";
import { requireUser } from "@/modules/tenancy/context";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Invitación" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const valid = /^[0-9a-f]{64}$/.test(token);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-soft ring-1 ring-ink-200/70">
        <Logo />
        <div>
          <h1 className="font-display text-2xl font-bold">Te invitaron a un equipo</h1>
          <p className="mt-2 text-sm text-ink-500">
            Aceptarás como <strong className="text-ink-800">{user.email}</strong>. La invitación solo es válida para el correo al que fue enviada.
          </p>
        </div>
        {valid ? <AcceptInviteForm token={token} /> : <Alert tone="error">El enlace de invitación no es válido.</Alert>}
      </div>
    </div>
  );
}
