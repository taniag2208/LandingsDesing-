import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary:
    "bg-brand-500 text-white shadow-[0_8px_20px_-8px_rgb(91_61_245/0.6)] hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300",
  secondary: "bg-white text-ink-900 ring-1 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-ink-100 disabled:text-ink-400",
  danger: "bg-white text-coral-500 ring-1 ring-coral-100 hover:bg-coral-100/60",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-all duration-150",
    "disabled:cursor-not-allowed active:scale-[0.98] disabled:active:scale-100",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
