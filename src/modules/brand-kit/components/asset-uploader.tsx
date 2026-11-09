"use client";

import { useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { BRAND_ASSETS_BUCKET, buildAssetPath, validateImageFile, type UploadFolder } from "../storage";

export interface UploadResult {
  path: string;
}

/**
 * Sube imágenes directamente a Supabase Storage desde el navegador.
 * La seguridad no depende de este componente: el bucket valida tipo/tamaño
 * y las políticas RLS solo permiten escribir en la carpeta de la organización
 * a usuarios con rol de edición.
 */
export function useAssetUpload(orgId: string, folder: UploadFolder) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<UploadResult | null> {
    setError(null);
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setUploading(true);
    try {
      const path = buildAssetPath(orgId, folder, file.type, crypto.randomUUID().replace(/-/g, ""));
      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage.from(BRAND_ASSETS_BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) {
        setError(upErr.message.includes("row-level security") ? "No tienes permisos para subir archivos." : "No pudimos subir el archivo. Inténtalo de nuevo.");
        return null;
      }
      return { path };
    } catch {
      setError("No pudimos subir el archivo. Revisa tu conexión.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, setError };
}

export function DropZone({
  label,
  hint,
  onFiles,
  uploading,
  multiple,
  className,
  children,
  disabled,
}: {
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
  uploading?: boolean;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
        over ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-ink-50/60 hover:border-ink-300",
        disabled && "opacity-60",
        className,
      )}
    >
      {children}
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-100/60 disabled:cursor-not-allowed"
      >
        {uploading && <Spinner />}
        {uploading ? "Subiendo…" : label}
      </button>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
