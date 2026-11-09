"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { saveBrandKitAction } from "../actions";
import { contrastLevel, contrastRatio } from "../contrast";
import { brandKitCompletion } from "../defaults";
import { FONT_OPTIONS, type FontFamily } from "../fonts";
import { brandKitSchema, SOCIAL_NETWORKS, TONE_PRESETS, type BrandKit, type SocialNetwork } from "../schema";
import { publicAssetUrl } from "../storage";
import { DropZone, useAssetUpload } from "./asset-uploader";
import { BrandPreview } from "./brand-preview";
import { ColorField } from "./color-field";
import { WordChips } from "./word-chips";

type Errors = Record<string, string[]>;

const SECTIONS = [
  { id: "identidad", label: "Identidad", key: "logo" },
  { id: "colores", label: "Colores", key: "colors" },
  { id: "tipografia", label: "Tipografía y estilo", key: "typography" },
  { id: "imagenes", label: "Imágenes", key: "images" },
  { id: "tono", label: "Tono", key: "tone" },
  { id: "contacto", label: "Contacto", key: "contact" },
  { id: "redes", label: "Redes", key: "social" },
] as const;

const COLOR_FIELDS: { key: keyof BrandKit["colors"]; label: string; description: string }[] = [
  { key: "primary", label: "Primario", description: "Botones y llamados a la acción" },
  { key: "secondary", label: "Secundario", description: "Titulares y bloques de contraste" },
  { key: "accent", label: "Acento", description: "Etiquetas, insignias y detalles" },
  { key: "background", label: "Fondo", description: "Fondo principal de la landing" },
  { key: "surface", label: "Superficie", description: "Tarjetas y secciones alternas" },
  { key: "text", label: "Texto", description: "Color del texto principal" },
];

const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  pinterest: "Pinterest",
};

export interface BrandKitEditorProps {
  orgId: string;
  orgName: string;
  initialKit: BrandKit;
  initialVersion: number;
  supabaseUrl: string;
  canEdit: boolean;
  welcome?: boolean;
}

export function BrandKitEditor({ orgId, orgName, initialKit, initialVersion, supabaseUrl, canEdit, welcome }: BrandKitEditorProps) {
  const [kit, setKit] = useState<BrandKit>(initialKit);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initialKit));
  const [version, setVersion] = useState(initialVersion);
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  const dirty = JSON.stringify(kit) !== saved;
  const completion = useMemo(() => brandKitCompletion(kit), [kit]);
  const assetUrl = useCallback((p: string) => publicAssetUrl(supabaseUrl, p), [supabaseUrl]);

  const logoUpload = useAssetUpload(orgId, "logo");
  const imageUpload = useAssetUpload(orgId, "images");

  function update<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setKit((k) => ({ ...k, [key]: value }));
    setFeedback(null);
  }
  function patch<K extends "colors" | "typography" | "style" | "tone" | "contact" | "social">(key: K, value: Partial<BrandKit[K]>) {
    setKit((k) => ({ ...k, [key]: { ...k[key], ...value } }));
    setFeedback(null);
  }

  const save = useCallback(() => {
    if (!canEdit) return;
    const parsed = brandKitSchema.safeParse(kit);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) (errs[i.path.join(".")] ??= []).push(i.message);
      setErrors(errs);
      setFeedback({ tone: "error", text: "Revisa los campos marcados antes de guardar." });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await saveBrandKitAction({ expectedVersion: version, kit: parsed.data });
      if (res.status === "success" && res.data) {
        setVersion(res.data.version);
        setSaved(JSON.stringify(parsed.data));
        setKit(parsed.data);
        setFeedback({ tone: "success", text: "Brand Kit guardado." });
      } else if (res.status === "error") {
        const fe: Errors = {};
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) fe[k.replace(/^kit\./, "")] = v;
        setErrors(fe);
        setFeedback({ tone: "error", text: res.message });
      }
    });
  }, [canEdit, kit, version]);

  // Atajo Ctrl/Cmd+S y aviso de cambios sin guardar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !pending) save();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty, pending, save]);

  const err = (path: string) => errors[path]?.[0];
  const textContrast = contrastRatio(kit.colors.text, kit.colors.background);
  const buttonContrast = Math.max(contrastRatio(kit.colors.primary, "#ffffff"), contrastRatio(kit.colors.primary, "#0b0b14"));
  const disabled = !canEdit;

  return (
    <div className="grid gap-8 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        {welcome && (
          <Alert tone="info" title="¡Tu organización está lista!">
            Configura tu marca. La IA y el motor de componentes usarán este Brand Kit para que cada landing se vea y suene como tú.
          </Alert>
        )}
        {!canEdit && <Alert tone="warning">Tu rol es de solo lectura. Pide a un administrador o editor que actualice el Brand Kit.</Alert>}

        <nav aria-label="Secciones del Brand Kit" className="sticky top-[60px] z-20 -mx-1 flex gap-1 overflow-x-auto bg-ink-50/90 px-1 py-2 backdrop-blur lg:top-0">
          {SECTIONS.map((s) => {
            const item = completion.items.find((i) => i.key === s.key);
            return (
              <a key={s.id} href={`#${s.id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-white hover:text-ink-900">
                <span className={cn("size-1.5 rounded-full", item?.done ? "bg-aqua-500" : "bg-ink-300")} aria-hidden="true" />
                {s.label}
              </a>
            );
          })}
        </nav>

        <div className="xl:hidden">
          <Button variant="secondary" size="sm" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
            {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
          </Button>
          {showPreview && <div className="mt-4"><BrandPreview kit={kit} assetUrl={assetUrl} orgName={orgName} /></div>}
        </div>

        {/* Identidad */}
        <Card id="identidad" className="scroll-mt-28">
          <CardHeader title="Identidad" description="Tu logo en versión para fondos claros y, opcionalmente, para fondos oscuros." />
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {(["logoPath", "logoDarkPath"] as const).map((key) => {
              const path = kit[key];
              const dark = key === "logoDarkPath";
              return (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-medium text-ink-800">{dark ? "Logo para fondo oscuro" : "Logo principal"}</p>
                  <DropZone
                    label={path ? "Reemplazar" : "Subir logo"}
                    hint="PNG, JPG, WEBP o AVIF · máx. 5 MB"
                    uploading={logoUpload.uploading}
                    disabled={disabled}
                    className={cn("min-h-40", dark && "border-ink-700 bg-ink-900 hover:border-ink-500")}
                    onFiles={async ([file]) => {
                      const res = await logoUpload.upload(file);
                      if (res) update(key, res.path);
                    }}
                  >
                    {path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(path)} alt={dark ? "Logo para fondo oscuro" : "Logo principal"} className="max-h-16 max-w-[80%] object-contain" />
                    ) : (
                      <span className={cn("text-3xl", dark ? "text-ink-500" : "text-ink-300")} aria-hidden="true">◎</span>
                    )}
                  </DropZone>
                  {path && !disabled && (
                    <button type="button" className="text-xs font-medium text-coral-500 hover:underline" onClick={() => update(key, null)}>
                      Quitar
                    </button>
                  )}
                </div>
              );
            })}
            {logoUpload.error && <Alert tone="error" className="sm:col-span-2">{logoUpload.error}</Alert>}
          </div>
        </Card>

        {/* Colores */}
        <Card id="colores" className="scroll-mt-28">
          <CardHeader title="Colores" description="Definen los tokens de diseño de todas tus landings." />
          <div className="space-y-5 p-6">
            <div className="grid gap-3 md:grid-cols-2">
              {COLOR_FIELDS.map((f) => (
                <ColorField key={f.key} label={f.label} description={f.description} value={kit.colors[f.key]} error={err(`colors.${f.key}`)} disabled={disabled} onChange={(v) => patch("colors", { [f.key]: v })} />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContrastCheck label="Texto sobre fondo" ratio={textContrast} />
              <ContrastCheck label="Texto de botón sobre primario" ratio={buttonContrast} />
            </div>
          </div>
        </Card>

        {/* Tipografía */}
        <Card id="tipografia" className="scroll-mt-28">
          <CardHeader title="Tipografía y estilo" description="Fuentes curadas, optimizadas para web y compatibles con la publicación." />
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <FontSelect id="heading" label="Titulares" value={kit.typography.heading} disabled={disabled} onChange={(v) => patch("typography", { heading: v })} />
            <FontSelect id="body" label="Texto" value={kit.typography.body} disabled={disabled} onChange={(v) => patch("typography", { body: v })} />
            <Field label="Peso de titulares" htmlFor="headingWeight">
              <Select id="headingWeight" disabled={disabled} value={kit.typography.headingWeight} onChange={(e) => patch("typography", { headingWeight: Number(e.target.value) as BrandKit["typography"]["headingWeight"] })}>
                <option value={500}>Medio</option>
                <option value={600}>Semi negrita</option>
                <option value={700}>Negrita</option>
                <option value={800}>Extra negrita</option>
              </Select>
            </Field>
            <Field label="Tamaño base de texto" htmlFor="baseSize">
              <Select id="baseSize" disabled={disabled} value={kit.typography.baseSize} onChange={(e) => patch("typography", { baseSize: Number(e.target.value) as BrandKit["typography"]["baseSize"] })}>
                {[15, 16, 17, 18].map((s) => <option key={s} value={s}>{s}px</option>)}
              </Select>
            </Field>
            <Segmented
              label="Esquinas"
              value={kit.style.radius}
              disabled={disabled}
              options={[{ value: "none", label: "Rectas" }, { value: "sm", label: "Suaves" }, { value: "md", label: "Medias" }, { value: "lg", label: "Amplias" }, { value: "full", label: "Píldora" }]}
              onChange={(v) => patch("style", { radius: v })}
            />
            <Segmented
              label="Botones"
              value={kit.style.buttonStyle}
              disabled={disabled}
              options={[{ value: "solid", label: "Sólido" }, { value: "outline", label: "Contorno" }, { value: "soft", label: "Suave" }]}
              onChange={(v) => patch("style", { buttonStyle: v })}
            />
          </div>
        </Card>

        {/* Imágenes */}
        <Card id="imagenes" className="scroll-mt-28">
          <CardHeader title="Imágenes de marca" description="Fotografías de producto, lifestyle o campaña para usar en tus landings." action={<Badge>{kit.images.length}/24</Badge>} />
          <div className="space-y-4 p-6">
            <DropZone
              label="Agregar imágenes"
              hint="Arrastra hasta 24 imágenes · máx. 5 MB c/u"
              multiple
              uploading={imageUpload.uploading}
              disabled={disabled || kit.images.length >= 24}
              onFiles={async (files) => {
                const room = 24 - kit.images.length;
                for (const file of files.slice(0, room)) {
                  const res = await imageUpload.upload(file);
                  if (res) {
                    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 160);
                    setKit((k) => ({ ...k, images: [...k.images, { path: res.path, alt }] }));
                  }
                }
              }}
            />
            {imageUpload.error && <Alert tone="error">{imageUpload.error}</Alert>}
            {kit.images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {kit.images.map((img, idx) => (
                  <li key={img.path} className="group overflow-hidden rounded-xl bg-white ring-1 ring-ink-200">
                    <div className="relative aspect-[4/3] bg-ink-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(img.path)} alt={img.alt} className="size-full object-cover" loading="lazy" />
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => update("images", kit.images.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-coral-500 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                        >
                          Quitar
                        </button>
                      )}
                      {idx === 0 && <Badge tone="brand" className="absolute top-2 left-2">Principal</Badge>}
                    </div>
                    <label className="block p-2">
                      <span className="sr-only">Texto alternativo de la imagen {idx + 1}</span>
                      <input
                        value={img.alt}
                        disabled={disabled}
                        maxLength={160}
                        placeholder="Describe la imagen (accesibilidad)"
                        onChange={(e) => update("images", kit.images.map((x, i) => (i === idx ? { ...x, alt: e.target.value } : x)))}
                        className="w-full rounded-md px-1.5 py-1 text-xs text-ink-700 outline-none focus:bg-ink-50"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Tono */}
        <Card id="tono" className="scroll-mt-28">
          <CardHeader title="Tono de comunicación" description="Guía para que la IA escriba como tu marca. Nunca inventará precios ni promociones." />
          <div className="space-y-5 p-6">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-800">Personalidad</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {TONE_PRESETS.map((t) => {
                  const active = kit.tone.preset === t.value;
                  return (
                    <label key={t.value} className={cn("cursor-pointer rounded-xl p-3 ring-1 transition", active ? "bg-brand-50 ring-2 ring-brand-500" : "ring-ink-200 hover:ring-ink-300", disabled && "cursor-not-allowed")}>
                      <input type="radio" name="tone-preset" value={t.value} checked={active} disabled={disabled} onChange={() => patch("tone", { preset: t.value })} className="sr-only" />
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className="block text-xs text-ink-500">{t.hint}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Segmented label="Trato" value={kit.tone.formality} disabled={disabled} options={[{ value: "tu", label: "Tú" }, { value: "usted", label: "Usted" }]} onChange={(v) => patch("tone", { formality: v })} />
              <Segmented label="Idioma principal" value={kit.tone.language} disabled={disabled} options={[{ value: "es", label: "Español" }, { value: "en", label: "Inglés" }, { value: "pt", label: "Portugués" }]} onChange={(v) => patch("tone", { language: v })} />
            </div>
            <Field label="Describe cómo habla tu marca" htmlFor="tone-description" error={err("tone.description")} hint={`${kit.tone.description.length}/500 · Ej.: "Hablamos como un amigo experto en café: cálidos, orgullosos del origen colombiano, sin tecnicismos."`}>
              <Textarea id="tone-description" maxLength={500} disabled={disabled} value={kit.tone.description} onChange={(e) => patch("tone", { description: e.target.value })} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <WordChips label="Palabras que usamos" values={kit.tone.wordsToUse} disabled={disabled} placeholder="origen, artesanal…" onChange={(v) => patch("tone", { wordsToUse: v })} />
              <WordChips label="Palabras que evitamos" values={kit.tone.wordsToAvoid} disabled={disabled} placeholder="barato, oferta…" onChange={(v) => patch("tone", { wordsToAvoid: v })} />
            </div>
          </div>
        </Card>

        {/* Contacto */}
        <Card id="contacto" className="scroll-mt-28">
          <CardHeader title="Datos de contacto" description="Se usan en formularios, botones de WhatsApp y pies de página." />
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Correo" htmlFor="c-email" error={err("contact.email")} optional>
              <Input id="c-email" type="email" disabled={disabled} value={kit.contact.email} onChange={(e) => patch("contact", { email: e.target.value })} />
            </Field>
            <Field label="Teléfono" htmlFor="c-phone" error={err("contact.phone")} optional>
              <Input id="c-phone" type="tel" disabled={disabled} value={kit.contact.phone} onChange={(e) => patch("contact", { phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp" htmlFor="c-wa" error={err("contact.whatsapp")} hint="Formato internacional: +573001234567" optional>
              <Input id="c-wa" type="tel" disabled={disabled} value={kit.contact.whatsapp} onChange={(e) => patch("contact", { whatsapp: e.target.value })} />
            </Field>
            <Field label="Ciudad" htmlFor="c-city" error={err("contact.city")} optional>
              <Input id="c-city" disabled={disabled} value={kit.contact.city} onChange={(e) => patch("contact", { city: e.target.value })} />
            </Field>
            <Field label="Dirección" htmlFor="c-address" error={err("contact.address")} optional>
              <Input id="c-address" disabled={disabled} value={kit.contact.address} onChange={(e) => patch("contact", { address: e.target.value })} />
            </Field>
            <Field label="Horario de atención" htmlFor="c-hours" error={err("contact.businessHours")} optional>
              <Input id="c-hours" disabled={disabled} placeholder="Lun–Vie 8:00–18:00" value={kit.contact.businessHours} onChange={(e) => patch("contact", { businessHours: e.target.value })} />
            </Field>
          </div>
        </Card>

        {/* Redes */}
        <Card id="redes" className="scroll-mt-28">
          <CardHeader title="Redes sociales" description="Enlaces https a tus perfiles oficiales." />
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map((n) => (
              <Field key={n} label={SOCIAL_LABELS[n]} htmlFor={`s-${n}`} error={err(`social.${n}`)} optional>
                <Input id={`s-${n}`} type="url" inputMode="url" disabled={disabled} placeholder={`https://${n === "x" ? "x" : n}.com/tu-marca`} value={kit.social[n]} onChange={(e) => patch("social", { [n]: e.target.value })} />
              </Field>
            ))}
          </div>
        </Card>

        <div className="h-20" aria-hidden="true" />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-800">Vista previa en vivo</p>
            <Badge tone={completion.percent === 100 ? "success" : "brand"}>{completion.percent}% completo</Badge>
          </div>
          <BrandPreview kit={kit} assetUrl={assetUrl} orgName={orgName} />
          <Card className="p-4">
            <ul className="space-y-1.5 text-sm">
              {completion.items.map((i) => (
                <li key={i.key} className={cn("flex items-center gap-2", i.done ? "text-ink-700" : "text-ink-400")}>
                  <span className={cn("grid size-4 place-items-center rounded-full text-[10px]", i.done ? "bg-aqua-500 text-white" : "ring-1 ring-ink-300")} aria-hidden="true">{i.done ? "✓" : ""}</span>
                  {i.label}
                  <span className="sr-only">{i.done ? "(completo)" : "(pendiente)"}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </aside>

      {/* Barra de guardado */}
      {canEdit && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:pl-[260px]">
          <div className={cn("pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10 transition-all", dirty || pending || feedback ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
            <span className="flex-1 text-sm" role="status" aria-live="polite">
              {pending ? "Guardando…" : feedback ? (
                <span className={feedback.tone === "error" ? "text-coral-100" : "text-aqua-100"}>{feedback.text}</span>
              ) : dirty ? "Tienes cambios sin guardar" : "Todo guardado"}
            </span>
            {dirty && !pending && (
              <Button variant="ghost" size="sm" className="text-ink-300 hover:bg-white/10 hover:text-white" onClick={() => { setKit(JSON.parse(saved)); setErrors({}); setFeedback(null); }}>
                Descartar
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || pending}>
              {pending && <Spinner />} Guardar <kbd className="hidden rounded bg-white/15 px-1 text-[10px] sm:inline">⌘S</kbd>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContrastCheck({ label, ratio }: { label: string; ratio: number }) {
  const level = contrastLevel(ratio);
  const tone = level === "fail" ? "danger" : level === "AA-large" ? "warning" : "success";
  const text = level === "fail" ? "Insuficiente" : level === "AA-large" ? "Solo textos grandes" : `Cumple ${level}`;
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5">
      <span className="text-sm text-ink-600">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-ink-500">{ratio.toFixed(2)}:1</span>
        <Badge tone={tone}>{text}</Badge>
      </span>
    </div>
  );
}

function FontSelect({ id, label, value, onChange, disabled }: { id: string; label: string; value: FontFamily; onChange: (v: FontFamily) => void; disabled?: boolean }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as FontFamily)}>
        {(["sans", "serif", "display"] as const).map((cat) => (
          <optgroup key={cat} label={cat === "sans" ? "Sans serif" : cat === "serif" ? "Serif" : "Display"}>
            {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
              <option key={f.family} value={f.family}>{f.family}</option>
            ))}
          </optgroup>
        ))}
      </Select>
    </Field>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-800">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
        {options.map((o) => (
          <label key={o.value} className={cn("flex-1 cursor-pointer rounded-lg px-2.5 py-1.5 text-center text-xs font-medium whitespace-nowrap transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500", value === o.value ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800", disabled && "cursor-not-allowed")}>
            <input type="radio" className="sr-only" checked={value === o.value} disabled={disabled} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
