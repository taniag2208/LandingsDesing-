import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // Gradiente en CSS (no <linearGradient>): evita ids SVG duplicados cuando el logo se renderiza varias veces.
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-brand-400 to-aqua-500", className)} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="size-full">
        <path d="M9 10h14M16 10v13" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="23" cy="22" r="2.2" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display leading-none", inverted ? "text-white" : "text-ink-900")}>
        <span className="block text-[15px] font-extrabold tracking-tight">TITA</span>
        <span className={cn("block text-[11px] font-medium tracking-wide", inverted ? "text-ink-300" : "text-ink-500")}>
          Landing Studio
        </span>
      </span>
    </span>
  );
}
