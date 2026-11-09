"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { requireTenant } from "@/modules/tenancy/context";
import { can } from "@/modules/tenancy/permissions";
import { toUserMessage } from "@/modules/tenancy/errors";
import { pathsBelongToOrg, saveBrandKitSchema } from "./schema";
import { brandKitCompletion } from "./defaults";
import { BRAND_ASSETS_BUCKET } from "./storage";

export type SaveBrandKitResult = ActionState<{ version: number; updatedAt: string }>;

/**
 * Guarda el Brand Kit completo con control de concurrencia optimista:
 * si otra persona guardó antes, se rechaza en lugar de sobrescribir.
 */
export async function saveBrandKitAction(payload: unknown): Promise<SaveBrandKitResult> {
  const ctx = await requireTenant();
  if (!can(ctx.role, "brandkit.update")) {
    return { status: "error", message: toUserMessage({ code: "42501" }) };
  }

  const parsed = saveBrandKitSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "error", message: "Hay campos con errores.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const { kit, expectedVersion } = parsed.data;
  const orgId = ctx.organization.id;

  if (!pathsBelongToOrg(kit, orgId)) {
    return { status: "error", message: "Algún archivo no pertenece a esta organización." };
  }

  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("brand_kits")
    .select("logo_path, logo_dark_path, images")
    .eq("organization_id", orgId)
    .maybeSingle();

  const completion = brandKitCompletion(kit);
  const { data, error } = await supabase
    .from("brand_kits")
    .update({
      logo_path: kit.logoPath,
      logo_dark_path: kit.logoDarkPath,
      colors: kit.colors,
      typography: kit.typography,
      style: kit.style,
      images: kit.images,
      tone: kit.tone,
      contact: kit.contact,
      social: kit.social,
      completed_at: completion.percent === 100 ? new Date().toISOString() : null,
    })
    .eq("organization_id", orgId)
    .eq("version", expectedVersion)
    .select("version, updated_at");

  if (error) return { status: "error", message: toUserMessage(error, "No pudimos guardar el Brand Kit.") };
  if (!data || data.length === 0) {
    return {
      status: "error",
      message: "Alguien más actualizó el Brand Kit. Recarga la página para ver la última versión antes de guardar.",
    };
  }

  // Limpieza best-effort de archivos que dejaron de usarse.
  if (previous) {
    const prevPaths = [
      previous.logo_path,
      previous.logo_dark_path,
      ...((Array.isArray(previous.images) ? previous.images : []) as { path?: string }[]).map((i) => i.path),
    ].filter((p): p is string => typeof p === "string" && p.startsWith(`${orgId}/`));
    const current = new Set([kit.logoPath, kit.logoDarkPath, ...kit.images.map((i) => i.path)]);
    const orphaned = prevPaths.filter((p) => !current.has(p));
    if (orphaned.length) await supabase.storage.from(BRAND_ASSETS_BUCKET).remove(orphaned);
  }

  revalidatePath("/brand-kit");
  revalidatePath("/dashboard");
  return { status: "success", message: "Brand Kit guardado.", data: { version: data[0].version, updatedAt: data[0].updated_at } };
}
