import { z } from "zod"

const trimmedString = z.string().trim()

export const demoRequestSchema = z
  .object({
    nombre: trimmedString.min(2, "Nombre inválido").max(80),
    apellido: trimmedString.min(2, "Apellido inválido").max(80),
    email: trimmedString.email("Email inválido").max(120),
    telefono: trimmedString
      .min(7, "Teléfono inválido")
      .max(30)
      .regex(/^[+\d()\-\s]{7,30}$/, "Teléfono inválido"),
    rol: z.enum(["owner", "manager", "admin", "other"]),
    nombreClub: trimmedString.min(2, "Nombre del club inválido").max(120),
    tipoClub: z.enum(["single", "multi", "academy"]),
    tipoCanchas: z.enum(["indoor", "outdoor", "covered", "mixed"]),
    cantidadCanchas: z.coerce.number().int().min(1).max(1000),
    deporte: trimmedString.min(2, "Deporte inválido").max(80),
    pais: trimmedString.min(2, "País inválido").max(80),
    ciudad: trimmedString.min(2, "Ciudad inválida").max(80),
    marketingOptIn: z.boolean(),
    recaptchaToken: z.string().trim().optional(),
  })
  .strict()

export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "closed"])

export type DemoRequestInput = z.infer<typeof demoRequestSchema>
export type LeadStatus = z.infer<typeof leadStatusSchema>
