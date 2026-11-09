"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { acceptInvitationAction } from "../actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(acceptInvitationAction, idle);
  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Uniéndote…">Aceptar invitación</SubmitButton>
    </form>
  );
}
