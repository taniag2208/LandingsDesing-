import { z } from "zod";

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Usa minúsculas, números y guiones (3–48 caracteres)"),
});

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v), "Ingresa una URL válida (https://…)")
  .transform((v) => (v === "" ? null : v));

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  website: optionalUrl,
  industry: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v)),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Código de país ISO de 2 letras"),
});

export const roleSchema = z.enum(["owner", "admin", "editor", "analyst"]);

export const inviteSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase().max(254),
  role: roleSchema.exclude(["owner"]),
});
