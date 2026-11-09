import type { OrgRole } from "@/lib/supabase/types";

/**
 * Matriz de permisos de la aplicación. Es la fuente de verdad para la UI;
 * la base de datos aplica las mismas reglas con RLS/RPC (defensa en profundidad).
 * Al agregar permisos de fases futuras, reflejarlos también en las políticas SQL.
 */
export const PERMISSIONS = {
  "org.read": ["owner", "admin", "editor", "analyst"],
  "org.update": ["owner", "admin"],
  "members.read": ["owner", "admin", "editor", "analyst"],
  "members.manage": ["owner", "admin"],
  "audit.read": ["owner", "admin"],
  "billing.read": ["owner", "admin"],
  "billing.manage": ["owner"],
  "brandkit.read": ["owner", "admin", "editor", "analyst"],
  "brandkit.update": ["owner", "admin", "editor"],
  // Fases siguientes (declarados para mantener la matriz completa)
  "landings.read": ["owner", "admin", "editor", "analyst"],
  "landings.edit": ["owner", "admin", "editor"],
  "landings.publish": ["owner", "admin"],
  "integrations.manage": ["owner", "admin"],
  "analytics.read": ["owner", "admin", "editor", "analyst"],
} as const satisfies Record<string, readonly OrgRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly OrgRole[]).includes(role);
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  analyst: "Analista",
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: "Control total, incluida la facturación.",
  admin: "Gestiona equipo, integraciones y publicación.",
  editor: "Crea y edita landings y el Brand Kit.",
  analyst: "Consulta resultados sin editar.",
};

/** Roles que un actor puede asignar a otros. */
export function assignableRoles(actor: OrgRole): OrgRole[] {
  if (actor === "owner") return ["owner", "admin", "editor", "analyst"];
  if (actor === "admin") return ["admin", "editor", "analyst"];
  return [];
}
