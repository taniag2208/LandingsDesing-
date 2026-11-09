/** Nombre fijo de la cookie de sesión: idéntico en servidor y navegador aunque cambie el host de Supabase. */
export const AUTH_COOKIE_NAME = "sb-tls-auth-token";

/**
 * Prefijo opcional para servir Supabase a través de la propia app (solo desarrollo/preview,
 * cuando Supabase corre en un host no accesible desde el navegador). Ver SUPABASE_PROXY_TARGET.
 */
export const SUPABASE_PROXY_PATH = process.env.NEXT_PUBLIC_SUPABASE_PROXY_PATH || "";

/** URL de Supabase vista por el navegador. */
export function browserSupabaseUrl(): string {
  if (SUPABASE_PROXY_PATH && typeof window !== "undefined") return `${window.location.origin}${SUPABASE_PROXY_PATH}`;
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/** Base para URLs públicas de activos que se renderizan en el navegador (puede ser relativa). */
export function assetBaseUrl(serverUrl: string): string {
  return SUPABASE_PROXY_PATH || serverUrl;
}
