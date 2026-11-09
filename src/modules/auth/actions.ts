"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/utils";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const next = safeNextPath(formData.get("next"), "/onboarding");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", message: "La contraseña no cumple los requisitos de seguridad." };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { status: "error", message: "Demasiados intentos. Espera un momento e inténtalo de nuevo." };
    }
    // No revelamos si el correo ya existe (evita enumeración de usuarios).
    if (error.code !== "user_already_exists") {
      return { status: "error", message: "No pudimos crear tu cuenta. Inténtalo de nuevo." };
    }
  }
  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&type=signup`);
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada." };
    }
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Ingresa un correo válido.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });
  // Respuesta idéntica exista o no la cuenta.
  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&type=recovery`);
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { status: "error", message: "El enlace expiró. Solicita uno nuevo." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", message: "La nueva contraseña debe ser diferente a la anterior." };
    }
    return { status: "error", message: "No pudimos actualizar la contraseña." };
  }
  redirect("/dashboard?password=updated");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
