import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tones = {
  error: "bg-coral-100/70 text-[#8f1c33] ring-coral-500/20",
  success: "bg-aqua-100/70 text-[#005a51] ring-aqua-500/20",
  info: "bg-brand-50 text-brand-700 ring-brand-500/15",
  warning: "bg-amber-100/70 text-[#6e4800] ring-amber-500/20",
} as const;

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm ring-1 animate-fade-up", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
    </div>
  );
}
