"use client";

import { fontStack, googleFontsHref } from "../fonts";
import { readableOn } from "../contrast";
import type { BrandKit } from "../schema";

const RADIUS: Record<BrandKit["style"]["radius"], string> = { none: "0px", sm: "6px", md: "12px", lg: "20px", full: "999px" };

/**
 * Vista previa del Brand Kit aplicado a una mini-landing de ejemplo.
 * Es ilustrativa: los textos y productos de muestra NO provienen del catálogo.
 * El motor de componentes real (Fase 2) derivará los mismos tokens.
 */
export function BrandPreview({ kit, assetUrl, orgName }: { kit: BrandKit; assetUrl: (p: string) => string; orgName: string }) {
  const { colors, typography, style } = kit;
  const heading = fontStack(typography.heading);
  const body = fontStack(typography.body);
  const radius = RADIUS[style.radius];
  const onPrimary = readableOn(colors.primary);
  const button =
    style.buttonStyle === "solid"
      ? { background: colors.primary, color: onPrimary, border: `2px solid ${colors.primary}` }
      : style.buttonStyle === "outline"
        ? { background: "transparent", color: colors.primary, border: `2px solid ${colors.primary}` }
        : { background: `${colors.primary}1f`, color: colors.primary, border: "2px solid transparent" };
  const heroImage = kit.images[0];

  return (
    <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-ink-200" aria-label="Vista previa de la marca">
      <link rel="stylesheet" href={googleFontsHref([typography.heading, typography.body])} />
      <div className="flex items-center gap-1.5 bg-ink-100 px-3 py-2">
        <span className="size-2.5 rounded-full bg-coral-500/70" />
        <span className="size-2.5 rounded-full bg-amber-500/70" />
        <span className="size-2.5 rounded-full bg-aqua-500/70" />
        <span className="ml-3 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-ink-400">vista previa · {orgName}</span>
      </div>
      <div style={{ background: colors.background, color: colors.text, fontFamily: body, fontSize: typography.baseSize }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${colors.text}14` }}>
          {kit.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(kit.logoPath)} alt="Logo" className="h-7 w-auto max-w-[140px] object-contain" />
          ) : (
            <span style={{ fontFamily: heading, fontWeight: typography.headingWeight }} className="text-base">
              {orgName}
            </span>
          )}
          <span className="text-[0.75em] opacity-70">Colección · Ofertas · Contacto</span>
        </div>

        <div className="grid gap-4 px-5 py-7 sm:grid-cols-[1.1fr_1fr] sm:items-center">
          <div>
            <span className="inline-block px-2 py-0.5 text-[0.7em] font-semibold tracking-wider uppercase" style={{ background: `${colors.accent}26`, color: colors.text, borderRadius: radius === "999px" ? "999px" : "6px" }}>
              Nueva campaña
            </span>
            <h3 className="mt-3 leading-[1.05]" style={{ fontFamily: heading, fontWeight: typography.headingWeight, fontSize: "1.9em", color: colors.secondary === colors.background ? colors.text : colors.secondary }}>
              Tu próxima campaña empieza aquí
            </h3>
            <p className="mt-2 text-[0.85em] opacity-75">Texto de ejemplo con el tono {kit.tone.preset} de tu marca.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-4 py-2 text-[0.8em] font-semibold" style={{ ...button, borderRadius: radius }}>Comprar ahora</span>
              <span className="px-4 py-2 text-[0.8em] font-semibold" style={{ color: colors.text, border: `2px solid ${colors.text}26`, borderRadius: radius }}>Ver más</span>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden" style={{ borderRadius: radius === "999px" ? "24px" : radius, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
            {heroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(heroImage.path)} alt={heroImage.alt} className="size-full object-cover" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-6" style={{ background: colors.surface, paddingTop: "1.25rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden bg-white/70 p-2" style={{ borderRadius: radius === "999px" ? "16px" : radius }}>
              <div className="aspect-square" style={{ background: `${colors.primary}${i === 2 ? "33" : "1a"}`, borderRadius: radius === "999px" ? "12px" : radius }} />
              <div className="mt-2 h-2 w-3/4 rounded-full" style={{ background: `${colors.text}26` }} />
              <div className="mt-1.5 h-2 w-1/3 rounded-full" style={{ background: `${colors.text}40` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
