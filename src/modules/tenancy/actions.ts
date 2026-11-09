"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { ACTIVE_ORG_COOKIE, getMemberships, requireTenant, requireUser } from "./context";
import { can } from "./permissions";
import { toUserMessage } from "./errors";
import { createOrganizationSchema, inviteSchema, roleSchema, updateOrganizationSchema } from "./schemas";
import { z } from "zod";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 };

export async function createOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = createOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });
  if (error || !orgId) {
    const message = toUserMessage(error, "No pudimos crear la organización.");
    const fieldErrors = error?.code === "23505" ? { slug: [message] } : undefined;
    return { status: "error", message, fieldErrors };
  }
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId as string, COOKIE_OPTS);
  redirect("/brand-kit?welcome=1");
}

export async function switchOrganizationAction(formData: FormData) {
  const orgId = z.uuid().safeParse(formData.get("organizationId"));
  if (!orgId.success) return;
  const memberships = await getMemberships();
  // Solo se acepta una organización de la que el usuario es miembro.
  if (!memberships.some((m) => m.organization.id === orgId.data)) return;
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId.data, COOKIE_OPTS);
  redirect("/dashboard");
}

export async function updateOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  if (!can(ctx.role, "org.update")) return { status: "error", message: toUserMessage({ code: "42501" }) };
  const parsed = updateOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", ctx.organization.id)
    .select("id");
  if (error || !data?.length) return { status: "error", message: toUserMessage(error, "No pudimos guardar los cambios.") };
  revalidatePath("/", "layout");
  return { status: "success", message: "Cambios guardados." };
}

export async function inviteMemberAction(
  _prev: ActionState<{ link: string; email: string }>,
  formData: FormData,
): Promise<ActionState<{ link: string; email: string }>> {
  const ctx = await requireTenant();
  if (!can(ctx.role, "members.manage")) return { status: "error", message: toUserMessage({ code: "42501" }) };
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  if (parsed.data.role === "admin" && ctx.role !== "owner" && ctx.role !== "admin") {
    return { status: "error", message: toUserMessage({ code: "42501" }) };
  }
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", {
    p_org: ctx.organization.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error || !token) return { status: "error", message: toUserMessage(error, "No pudimos crear la invitación.") };
  revalidatePath("/settings/team");
  return {
    status: "success",
    message: "Invitación creada.",
    data: { email: parsed.data.email, link: `${publicEnv().NEXT_PUBLIC_SITE_URL}/invite/${token as string}` },
  };
}

export async function revokeInvitationAction(formData: FormData) {
  const ctx = await requireTenant();
  const id = z.uuid().safeParse(formData.get("invitationId"));
  if (!id.success || !can(ctx.role, "members.manage")) return;
  const supabase = await createClient();
  await supabase.rpc("revoke_invitation", { p_invitation: id.data });
  revalidatePath("/settings/team");
}

export async function changeMemberRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  const userId = z.uuid().safeParse(formData.get("userId"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!userId.success || !role.success) return { status: "error", message: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_org: ctx.organization.id,
    p_user: userId.data,
    p_role: role.data,
  });
  if (error) return { status: "error", message: toUserMessage(error) };
  revalidatePath("/settings/team");
  return { status: "success", message: "Rol actualizado." };
}

export async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return { status: "error", message: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_org: ctx.organization.id, p_user: userId.data });
  if (error) return { status: "error", message: toUserMessage(error) };
  if (userId.data === ctx.user.id) {
    (await cookies()).delete(ACTIVE_ORG_COOKIE);
    redirect("/dashboard");
  }
  revalidatePath("/settings/team");
  return { status: "success", message: "Miembro retirado." };
}

export async function acceptInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const token = z.string().regex(/^[0-9a-f]{64}$/).safeParse(formData.get("token"));
  if (!token.success) return { status: "error", message: toUserMessage({ message: "invalid_invitation" }) };
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token.data });
  if (error || !orgId) return { status: "error", message: toUserMessage(error, "No pudimos aceptar la invitación.") };
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId as string, COOKIE_OPTS);
  redirect("/dashboard?joined=1");
}
