import { z } from "zod";

/** Debe coincidir con supabase/config.toml ([auth] minimum_password_length / password_requirements). */
export const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[a-z]/, "Incluye una minúscula")
  .regex(/[A-Z]/, "Incluye una mayúscula")
  .regex(/[0-9]/, "Incluye un número");

export const emailSchema = z.email("Correo inválido").trim().toLowerCase().max(254);

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa tu nombre").max(120),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal("on", { error: "Debes aceptar los términos" }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(72),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });
