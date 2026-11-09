import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "email_change", "email", "magiclink"];

/**
 * Verifica enlaces de correo (confirmación de cuenta y recuperación).
 * Las plantillas de Supabase deben apuntar a:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<tipo>&next=...
 * (ver supabase/templates y docs/fases/fase-1.md).
 * También acepta `code` (flujo PKCE) por compatibilidad con plantillas por defecto.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const fallback = type === "recovery" ? "/reset-password" : "/onboarding";
  const next = safeNextPath(searchParams.get("next"), fallback);

  const supabase = await createClient();

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?m=link_invalid", origin));
}
