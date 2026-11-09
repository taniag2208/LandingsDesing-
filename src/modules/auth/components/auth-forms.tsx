"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Field, Input, a11yError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "../actions";

type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function useForm(action: FormAction) {
  return useActionState<ActionState, FormData>(action, idle);
}

function FormError({ state }: { state: ActionState }) {
  return state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null;
}

function errs(state: ActionState) {
  return state.status === "error" ? state.fieldErrors : undefined;
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useForm(signInAction);
  const fe = errs(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required {...a11yError("email", fe)} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={fe?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required {...a11yError("password", fe)} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}

const PASSWORD_RULES = [
  { label: "10+ caracteres", test: (v: string) => v.length >= 10 },
  { label: "Mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "Número", test: (v: string) => /[0-9]/.test(v) },
];

function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Requisitos de contraseña">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li
            key={r.label}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${ok ? "bg-aqua-100 text-[#00756a]" : "bg-ink-100 text-ink-500"}`}
          >
            {ok ? "✓ " : ""}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useForm(signUpAction);
  const [password, setPassword] = useState("");
  const fe = errs(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Nombre completo" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required {...a11yError("fullName", fe)} />
      </Field>
      <Field label="Correo de trabajo" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required {...a11yError("email", fe)} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={fe?.password} hint={<PasswordRules value={password} />}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          {...a11yError("password", fe)}
        />
      </Field>
      <label className="flex items-start gap-2.5 text-sm text-ink-600">
        <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 rounded accent-brand-500" required />
        <span>Acepto los términos del servicio y la política de tratamiento de datos.</span>
      </label>
      {fe?.acceptTerms && <p className="text-xs text-coral-500">{fe.acceptTerms[0]}</p>}
      <SubmitButton className="w-full" size="lg" pendingLabel="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useForm(forgotPasswordAction);
  const fe = errs(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Correo" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required {...a11yError("email", fe)} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Enviando…">
        Enviar enlace de recuperación
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useForm(resetPasswordAction);
  const [password, setPassword] = useState("");
  const fe = errs(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Nueva contraseña" htmlFor="password" error={fe?.password} hint={<PasswordRules value={password} />}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...a11yError("password", fe)}
        />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm" error={fe?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required {...a11yError("confirm", fe)} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Guardando…">
        Actualizar contraseña
      </SubmitButton>
    </form>
  );
}
