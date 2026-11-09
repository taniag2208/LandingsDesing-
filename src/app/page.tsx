import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getSessionUser } from "@/modules/tenancy/context";

const STEPS = [
  { n: "01", title: "Tu marca", body: "Logo, colores, tipografías y tono en un Brand Kit reutilizable." },
  { n: "02", title: "Tu catálogo", body: "Conecta Shopify o VTEX y usa productos, precios y stock reales." },
  { n: "03", title: "Tu landing", body: "Un discovery guiado y la IA proponen la estructura; tú la ajustas visualmente." },
  { n: "04", title: "Publica", body: "Subdominio o dominio propio, con versiones y analítica de conversión." },
];

export default async function Home() {
  const user = await getSessionUser();
  return (
    <div className="bg-studio-glow min-h-dvh text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo inverted />
        <nav className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/dashboard" variant="primary">Ir a mi estudio</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" className="text-white hover:bg-white/10">Ingresar</ButtonLink>
              <ButtonLink href="/signup">Crear cuenta</ButtonLink>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <p className="text-sm font-semibold tracking-[0.3em] text-brand-300 uppercase animate-fade-up">TITA Landing Studio</p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl animate-fade-up">
          Imagina. Personaliza.{" "}
          <span className="bg-gradient-to-r from-brand-300 to-aqua-500 bg-clip-text text-transparent">Publica.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-300">
          Crea landings promocionales y transaccionales conectadas a tu ecommerce, con IA y sin depender de nadie.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href={user ? "/dashboard" : "/signup"} size="lg">
            {user ? "Continuar" : "Empezar ahora"}
          </ButtonLink>
        </div>
        <ol className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/[0.08]">
              <span className="font-display text-sm font-bold text-aqua-500">{s.n}</span>
              <h2 className="mt-3 font-display text-lg font-semibold">{s.title}</h2>
              <p className="mt-1.5 text-sm text-ink-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
