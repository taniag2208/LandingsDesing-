"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, a11yError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/utils";
import { createOrganizationAction } from "../actions";

export function CreateOrgForm() {
  const [state, action] = useActionState<ActionState, FormData>(createOrganizationAction, idle);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  const effectiveSlug = slugTouched ? slug : name.trim().length >= 2 ? slugify(name) : "";

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      <Field label="Nombre de la empresa o marca" htmlFor="name" error={fe?.name}>
        <Input id="name" name="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Café de Origen" {...a11yError("name", fe)} />
      </Field>
      <Field label="Identificador" htmlFor="slug" error={fe?.slug} hint="Se usará en tu subdominio de publicación. No se puede cambiar después.">
        <div className="flex items-center rounded-xl bg-white ring-1 ring-ink-200 focus-within:ring-2 focus-within:ring-brand-500">
          <Input
            id="slug"
            name="slug"
            required
            className="ring-0 focus:ring-0"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            {...a11yError("slug", fe)}
          />
          <span className="pr-3.5 text-sm whitespace-nowrap text-ink-400">.tita.site</span>
        </div>
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Creando tu estudio…">
        Crear organización
      </SubmitButton>
    </form>
  );
}
