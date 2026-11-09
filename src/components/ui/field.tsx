import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export const inputClasses =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 transition focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-coral-500";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string[] | string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}) {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium text-ink-800">
        {label}
        {optional && <span className="text-xs font-normal text-ink-400">Opcional</span>}
      </label>
      {children}
      {errors.length > 0 ? (
        <p id={`${htmlFor}-error`} className="text-xs text-coral-500" role="alert">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClasses, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClasses, "appearance-auto pr-8", className)} {...props} />;
}

/** Helpers de accesibilidad para inputs con error. */
export function a11yError(name: string, errors?: Record<string, string[]>) {
  const has = Boolean(errors?.[name]?.length);
  return { "aria-invalid": has || undefined, "aria-describedby": has ? `${name}-error` : undefined };
}
