"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, a11yError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import type { OrganizationRow } from "@/lib/supabase/types";
import { updateOrganizationAction } from "../actions";

export function OrgSettingsForm({ org, canEdit }: { org: OrganizationRow; canEdit: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateOrganizationAction, idle);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5 p-6" noValidate>
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={fe?.name}>
          <Input id="name" name="name" defaultValue={org.name} disabled={!canEdit} required {...a11yError("name", fe)} />
        </Field>
        <Field label="Identificador" htmlFor="slug" hint="Inmutable: se usa en tu subdominio.">
          <Input id="slug" value={org.slug} disabled readOnly />
        </Field>
        <Field label="Sitio web" htmlFor="website" error={fe?.website} optional>
          <Input id="website" name="website" type="url" placeholder="https://" defaultValue={org.website ?? ""} disabled={!canEdit} {...a11yError("website", fe)} />
        </Field>
        <Field label="Industria" htmlFor="industry" error={fe?.industry} optional>
          <Input id="industry" name="industry" placeholder="Moda, alimentos, hogar…" defaultValue={org.industry ?? ""} disabled={!canEdit} />
        </Field>
        <Field label="País (ISO)" htmlFor="country" error={fe?.country}>
          <Input id="country" name="country" maxLength={2} defaultValue={org.country} disabled={!canEdit} className="uppercase" {...a11yError("country", fe)} />
        </Field>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
        </div>
      )}
    </form>
  );
}
