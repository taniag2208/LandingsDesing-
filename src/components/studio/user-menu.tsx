import { signOutAction } from "@/modules/auth/actions";
import type { SessionUser } from "@/modules/tenancy/context";

export function UserMenu({ user }: { user: SessionUser }) {
  const initials = (user.fullName ?? user.email).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white">{initials}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">{user.fullName ?? "Sin nombre"}</span>
        <span className="block truncate text-xs text-ink-400">{user.email}</span>
      </span>
      <form action={signOutAction}>
        <button type="submit" className="rounded-lg px-2 py-1 text-xs font-medium text-ink-400 hover:bg-white/5 hover:text-white">
          Salir
        </button>
      </form>
    </div>
  );
}
