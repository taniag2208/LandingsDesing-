"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Icon } from "./icon";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (item.phase) {
          return (
            <div
              key={item.href}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-500"
              title={`Se habilita en la Fase ${item.phase} del producto`}
              aria-disabled="true"
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-400 ring-1 ring-white/10">
                F{item.phase}
              </span>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon name={item.icon} />
            {item.label}
            {active && <span className="ml-auto size-1.5 rounded-full bg-aqua-500" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
