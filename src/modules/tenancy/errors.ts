/**
 * Traduce errores de Postgres/Supabase a mensajes de usuario en español.
 * Nunca se exponen mensajes internos de la base de datos al cliente.
 */
const KNOWN: Record<string, string> = {
  not_authenticated: "Tu sesión expiró. Inicia sesión de nuevo.",
  forbidden: "No tienes permisos para realizar esta acción.",
  org_limit_reached: "Alcanzaste el máximo de organizaciones que puedes crear.",
  no_default_plan: "No hay un plan disponible. Contacta a soporte.",
  cannot_invite_owner: "No es posible invitar directamente como propietario.",
  already_member: "Esa persona ya es miembro de la organización.",
  seat_limit_reached: "Tu plan no tiene más asientos disponibles.",
  invalid_invitation: "La invitación no es válida, ya fue usada o expiró.",
  invitation_email_mismatch: "Esta invitación fue enviada a otro correo. Inicia sesión con ese correo.",
  email_not_confirmed: "Confirma tu correo antes de aceptar la invitación.",
  last_owner: "La organización debe conservar al menos un propietario.",
};

export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

export function toUserMessage(error: DbErrorLike | null | undefined, fallback = "Ocurrió un error inesperado."): string {
  if (!error) return fallback;
  if (error.message && KNOWN[error.message]) return KNOWN[error.message];
  if (error.code === "23505") {
    if (error.message?.includes("slug")) return "Ese identificador ya está en uso. Prueba con otro.";
    return "Ya existe un registro con esos datos.";
  }
  if (error.code === "23514") return "Algún dato no tiene el formato válido.";
  if (error.code === "42501") return KNOWN.forbidden;
  return fallback;
}
