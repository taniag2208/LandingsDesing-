import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogRow, InvitationRow, MemberListItem } from "@/lib/supabase/types";
import { entitlementsSchema, type Entitlements } from "@/modules/billing/entitlements";

export async function listMembers(orgId: string): Promise<MemberListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_org_members", { p_org: orgId });
  if (error || !data) return [];
  return data as MemberListItem[];
}

export async function listPendingInvitations(orgId: string): Promise<InvitationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("id, organization_id, email, role, expires_at, accepted_at, revoked_at, created_at")
    .eq("organization_id", orgId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []) as InvitationRow[];
}

export async function getEntitlements(orgId: string): Promise<Entitlements | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("org_entitlements", { p_org: orgId });
  if (error || !data) return null;
  const parsed = entitlementsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function listAuditLogs(orgId: string, limit = 50): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditLogRow[];
}

export async function countMembers(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("memberships").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
  return count ?? 0;
}
