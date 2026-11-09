import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-200/70 bg-white px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div>
        {eyebrow && <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
