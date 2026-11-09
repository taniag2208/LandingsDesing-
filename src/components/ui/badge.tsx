import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tones = {
  neutral: "bg-ink-100 text-ink-600",
  brand: "bg-brand-100 text-brand-700",
  success: "bg-aqua-100 text-[#00756a]",
  warning: "bg-amber-100 text-[#8a5a00]",
  danger: "bg-coral-100 text-[#b4233f]",
  soon: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}
