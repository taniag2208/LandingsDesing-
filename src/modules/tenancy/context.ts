import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, OrganizationRow } from "@/lib/supabase/types";
import { can, type Permission } from "./permissions";

export const ACTIVE_ORG_COOKIE = "tls_active_org";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface OrgMembership {
  organization: Pick<OrganizationRow, "id" | "name" | "slug">;
  role: OrgRole;
}

export interface TenantContext {
  user: SessionUser;
  organization: OrganizationRow;
  role: OrgRole;
  memberships: OrgMembership[];
}

/**
 * Capa de acceso a datos (DAL) de sesión.
 * `getUser()` valida el token contra Supabase Auth: no se confía en la cookie.
 * Se memoiza por request con React.cache.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle();
  return { id: data.user.id, email: data.user.email ?? "", fullName: profile?.full_name ?? null };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export const getMemberships = cache(async (): Promise<OrgMembership[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data
    .filter((m) => m.organization)
    .map((m) => ({
      role: m.role as OrgRole,
      organization: m.organization as unknown as OrgMembership["organization"],
    }));
});

/**
 * Resuelve el tenant activo. La cookie solo es una preferencia: se valida
 * siempre contra las membresías reales del usuario (RLS).
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organization.id === preferred) ?? memberships[0];

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", active.organization.id)
    .single();
  if (!organization) return null;

  return { user, organization: organization as OrganizationRow, role: active.role, memberships };
});

/** Para páginas del estudio: exige sesión y organización. */
export async function requireTenant(): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getTenantContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** Para Server Actions: exige permiso; lanza si no lo tiene. */
export async function requirePermission(permission: Permission): Promise<TenantContext> {
  const ctx = await requireTenant();
  if (!can(ctx.role, permission)) {
    throw new Error("forbidden");
  }
  return ctx;
}
