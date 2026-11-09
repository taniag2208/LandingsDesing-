/**
 * Tipos de la base de datos. Escritos a mano para la Fase 1 y alineados con
 * supabase/migrations. Regenerables con:
 *   npx supabase gen types typescript --local > src/lib/supabase/database.generated.ts
 */
export type OrgRole = "owner" | "admin" | "editor" | "analyst";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  country: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRow {
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface BrandKitRow {
  organization_id: string;
  logo_path: string | null;
  logo_dark_path: string | null;
  colors: unknown;
  typography: unknown;
  images: unknown;
  tone: unknown;
  contact: unknown;
  social: unknown;
  version: number;
  completed_at: string | null;
  updated_at: string;
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: number;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MemberListItem {
  user_id: string;
  email: string;
  full_name: string | null;
  role: OrgRole;
  joined_at: string;
}
