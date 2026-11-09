import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Cache Components desactivado en Fase 1: la app del estudio es 100% por
  // sesión. Se evaluará para el motor de publicación (Fase 7).
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Solo desarrollo/preview: expone Supabase local bajo /supabase cuando el navegador
  // no puede alcanzarlo directamente. Requiere NEXT_PUBLIC_SUPABASE_PROXY_PATH=/supabase.
  async rewrites() {
    const target = process.env.SUPABASE_PROXY_TARGET;
    if (!target || process.env.NODE_ENV === "production" && process.env.ALLOW_SUPABASE_PROXY !== "1") return [];
    return [{ source: "/supabase/:path*", destination: `${target.replace(/\/$/, "")}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
