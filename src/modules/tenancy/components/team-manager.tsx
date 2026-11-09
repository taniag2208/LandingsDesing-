"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, a11yError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import type { MemberListItem, OrgRole } from "@/lib/supabase/types";
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction } from "../actions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../permissions";

export function InviteForm({ roles }: { roles: OrgRole[] }) {
  const [state, action] = useActionState<ActionState<{ link: string; email: string }>, FormData>(inviteMemberAction, idle);
  const [copied, setCopied] = useState(false);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  const invitable = roles.filter((r) => r !== "owner");
  return (
    <div className="space-y-4 p-6">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end" noValidate>
        <Field label="Correo" htmlFor="invite-email" error={fe?.email}>
          <Input id="invite-email" name="email" type="email" required placeholder="persona@empresa.com" {...a11yError("email", fe)} />
        </Field>
        <Field label="Rol" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="editor">
            {invitable.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        <SubmitButton pendingLabel="Creando…">Invitar</SubmitButton>
      </form>
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && state.data && (
        <Alert tone="success" title={`Invitación creada para ${state.data.email}`}>
          <p>Comparte este enlace de un solo uso (válido 7 días). El envío automático por correo se habilita en la Fase 8.</p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white/70 px-2 py-1.5 text-xs">{state.data.link}</code>
            <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(state.data!.link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}

export function MemberRow({ member, actorRole, actorId, assignable }: { member: MemberListItem; actorRole: OrgRole; actorId: string; assignable: OrgRole[] }) {
  const [roleState, roleAction] = useActionState<ActionState, FormData>(changeMemberRoleAction, idle);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removeMemberAction, idle);
  const isSelf = member.user_id === actorId;
  const canManage = (actorRole === "owner" || (actorRole === "admin" && member.role !== "owner")) && assignable.length > 0;
  const error = roleState.status === "error" ? roleState.message : removeState.status === "error" ? removeState.message : null;

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700" aria-hidden="true">
          {(member.full_name ?? member.email).slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {member.full_name ?? "Sin nombre"} {isSelf && <Badge tone="neutral">Tú</Badge>}
          </p>
          <p className="truncate text-xs text-ink-500">{member.email}</p>
        </div>
        {canManage && !isSelf ? (
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={member.user_id} />
            <label className="sr-only" htmlFor={`role-${member.user_id}`}>Rol de {member.email}</label>
            <Select id={`role-${member.user_id}`} name="role" defaultValue={member.role} className="w-40 py-1.5" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
              {assignable.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </form>
        ) : (
          <Badge tone={member.role === "owner" ? "brand" : "neutral"}>{ROLE_LABELS[member.role]}</Badge>
        )}
        {(isSelf || canManage) && (
          <form
            action={removeAction}
            onSubmit={(e) => {
              if (!confirm(isSelf ? "¿Seguro que quieres salir de esta organización?" : `¿Retirar a ${member.email} de la organización?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="userId" value={member.user_id} />
            <SubmitButton variant="ghost" size="sm">{isSelf ? "Salir" : "Retirar"}</SubmitButton>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-coral-500" role="alert">{error}</p>}
      {roleState.status === "success" && <p className="mt-2 text-xs text-[#00756a]" role="status">{roleState.message}</p>}
    </li>
  );
}

export function RoleLegend() {
  return (
    <dl className="grid gap-3 p-6 sm:grid-cols-2">
      {(Object.keys(ROLE_LABELS) as OrgRole[]).map((r) => (
        <div key={r} className="rounded-xl bg-ink-50 p-3">
          <dt className="text-sm font-semibold">{ROLE_LABELS[r]}</dt>
          <dd className="text-xs text-ink-500">{ROLE_DESCRIPTIONS[r]}</dd>
        </div>
      ))}
    </dl>
  );
}
