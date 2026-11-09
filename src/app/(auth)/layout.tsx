import { Logo } from "@/components/ui/logo";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit" aria-label="TITA Landing Studio, inicio">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-xs text-ink-400">© {new Date().getFullYear()} Tita Media</p>
      </div>
      <aside className="bg-studio-glow relative hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute inset-0 flex flex-col justify-center gap-12 overflow-hidden p-14">
          <div>
            <p className="mb-6 font-display text-sm font-semibold tracking-[0.3em] text-brand-300 uppercase">Landing Studio</p>
            <h2 className="font-display text-5xl leading-[1.05] font-bold text-white">
              Imagina.
              <br />
              Personaliza.
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-aqua-500 bg-clip-text text-transparent">Publica.</span>
            </h2>
            <p className="mt-6 max-w-md text-base text-ink-300">
              Landings promocionales y transaccionales conectadas a tu catálogo de Shopify o VTEX, sin escribir código.
            </p>
          </div>
          <MockPreview />
        </div>
      </aside>
    </div>
  );
}

function MockPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg rotate-[-2deg] rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur">
      <div className="mb-2 flex gap-1.5">
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
      </div>
      <div className="rounded-xl bg-white p-5">
        <div className="h-3 w-20 rounded-full bg-brand-100" />
        <div className="mt-3 h-6 w-3/4 rounded-md bg-ink-900" />
        <div className="mt-2 h-3 w-1/2 rounded-full bg-ink-200" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square rounded-lg bg-gradient-to-br from-brand-100 to-aqua-100" />
              <div className="h-2 w-3/4 rounded-full bg-ink-200" />
              <div className="h-6 rounded-md bg-brand-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
