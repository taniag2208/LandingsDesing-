import { switchOrganizationAction } from "@/modules/tenancy/actions";
import type { OrgMembership } from "@/modules/tenancy/context";
import { ROLE_LABELS } from "@/modules/tenancy/permissions";
import Link from "next/link";

export function OrgSwitcher({ current, memberships }: { current: OrgMembership; memberships: OrgMembership[] }) {
  const others = memberships.filter((m) => m.organization.id !== current.organization.id);
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-aqua-500 font-display text-sm font-bold text-white">
          {current.organization.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{current.organization.name}</span>
          <span className="block text-xs text-ink-400">{ROLE_LABELS[current.role]}</span>
        </span>
        <svg viewBox="0 0 20 20" className="size-4 text-ink-400 transition group-open:rotate-180" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl bg-ink-800 p-1.5 shadow-2xl ring-1 ring-white/10">
        {others.map((m) => (
          <form key={m.organization.id} action={switchOrganizationAction}>
            <input type="hidden" name="organizationId" value={m.organization.id} />
            <button type="submit" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-200 hover:bg-white/5">
              <span className="truncate">{m.organization.name}</span>
              <span className="text-xs text-ink-500">{ROLE_LABELS[m.role]}</span>
            </button>
          </form>
        ))}
        <Link href="/onboarding?new=1" className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-300 hover:bg-white/5">
          + Nueva organización
        </Link>
      </div>
    </details>
  );
}
