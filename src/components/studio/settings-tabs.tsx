"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Organización" },
  { href: "/settings/team", label: "Equipo" },
  { href: "/settings/plan", label: "Plan y consumo" },
  { href: "/settings/activity", label: "Actividad" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Configuración" className="flex gap-1 overflow-x-auto border-b border-ink-200/70 bg-white px-5 sm:px-8">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("relative px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors", active ? "text-ink-900" : "text-ink-500 hover:text-ink-800")}>
            {t.label}
            {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </Link>
        );
      })}
    </nav>
  );
}
