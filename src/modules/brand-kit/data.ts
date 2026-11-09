import "server-only";
import { createClient } from "@/lib/supabase/server";
import { brandKitFromRow } from "./defaults";
import type { BrandKit } from "./schema";

export interface StoredBrandKit {
  kit: BrandKit;
  version: number;
  updatedAt: string;
}

/** Lee el Brand Kit de una organización (RLS garantiza la pertenencia). */
export async function getBrandKit(organizationId: string): Promise<StoredBrandKit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .select("logo_path, logo_dark_path, colors, typography, style, images, tone, contact, social, version, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return { kit: brandKitFromRow(data), version: data.version, updatedAt: data.updated_at };
}
