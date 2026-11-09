"use client";
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_NAME, browserSupabaseUrl } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente de navegador (subidas directas a Storage protegidas por RLS). */
export function createBrowserSupabase() {
  if (!client) {
    client = createBrowserClient(browserSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookieOptions: { name: AUTH_COOKIE_NAME },
    });
  }
  return client;
}
