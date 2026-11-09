"use client";

import { useId, useState } from "react";

export function WordChips({ label, values, onChange, placeholder, max = 15, disabled }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; disabled?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const words = raw.split(",").map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 40);
    if (!words.length) return;
    const next = [...new Set([...values, ...words])].slice(0, max);
    onChange(next);
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-800">{label}</label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-white p-1.5 ring-1 ring-ink-200 focus-within:ring-2 focus-within:ring-brand-500">
        {values.map((w) => (
          <span key={w} className="inline-flex items-center gap-1 rounded-lg bg-ink-100 py-1 pr-1 pl-2.5 text-xs font-medium text-ink-700">
            {w}
            <button type="button" disabled={disabled} onClick={() => onChange(values.filter((x) => x !== w))} className="rounded px-1 text-ink-400 hover:bg-ink-200 hover:text-ink-700" aria-label={`Quitar ${w}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled || values.length >= max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={values.length >= max ? `Máximo ${max}` : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-ink-400"
        />
      </div>
      <p className="text-xs text-ink-400">Presiona Enter o coma para agregar.</p>
    </div>
  );
}
