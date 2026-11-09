"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function ColorField({
  label,
  description,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Sincroniza el borrador cuando el valor cambia desde fuera (patrón "derivar en render").
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  function commit(v: string) {
    const normalized = v.startsWith("#") ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) onChange(normalized.toLowerCase());
    else setDraft(value);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-ink-200/70 transition focus-within:ring-brand-500">
      <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: value }}>
        <span className="sr-only">Selector de color para {label}</span>
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-ink-800">{label}</label>
        {description && <p className="truncate text-xs text-ink-400">{description}</p>}
      </div>
      <input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit((e.target as HTMLInputElement).value.trim()))}
        aria-invalid={Boolean(error) || undefined}
        maxLength={7}
        className={cn("w-24 rounded-lg bg-ink-50 px-2 py-1.5 font-mono text-xs uppercase ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none", error && "ring-coral-500")}
        spellCheck={false}
      />
    </div>
  );
}
