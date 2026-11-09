import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl font-bold text-brand-500">404</p>
      <h1 className="font-display text-xl font-semibold">No encontramos esta página</h1>
      <ButtonLink href="/dashboard" variant="secondary">Volver al inicio</ButtonLink>
    </div>
  );
}
