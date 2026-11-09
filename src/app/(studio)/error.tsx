"use client";

import { Button } from "@/components/ui/button";

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="font-display text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-sm text-ink-500">No pudimos cargar esta sección. Tus datos guardados no se han perdido.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
