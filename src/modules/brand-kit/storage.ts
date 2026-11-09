export const BRAND_ASSETS_BUCKET = "brand-assets";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"] as const;

const EXT: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type UploadFolder = "logo" | "images";

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato no permitido. Usa PNG, JPG, WEBP, AVIF o GIF.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "El archivo supera 5 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

export function buildAssetPath(orgId: string, folder: UploadFolder, mime: string, id: string): string {
  const ext = EXT[mime as keyof typeof EXT];
  if (!ext) throw new Error("unsupported_mime");
  return `${orgId}/${folder}/${id.replace(/[^a-zA-Z0-9_-]/g, "")}.${ext}`;
}

export function publicAssetUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BRAND_ASSETS_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
