/** Resultado estándar de Server Actions consumidas con useActionState. */
export type ActionState<T = undefined> =
  | { status: "idle" }
  | { status: "success"; message?: string; data?: T }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export const idle: ActionState<never> = { status: "idle" };

export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
