import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { Resend } from "resend"
import { adminDb } from "@/lib/firebase/admin"
import { demoRequestSchema } from "@/lib/demo-request"

export const runtime = "nodejs"

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 10
const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIp(request: NextRequest) {
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return request.headers.get("x-real-ip") || "unknown"
}

function isRateLimited(ip: string) {
  const now = Date.now()
  const current = rateLimitStore.get(ip)

  if (!current || current.resetAt < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  current.count += 1
  rateLimitStore.set(ip, current)
  return false
}

async function sendLeadNotificationEmail({
  id,
  payload,
}: {
  id: string
  payload: {
    nombre: string
    apellido: string
    email: string
    telefono: string
    rol: string
    nombreClub: string
    tipoClub: string
    tipoCanchas: string
    cantidadCanchas: number
    deporte: string
    pais: string
    ciudad: string
    marketingOptIn: boolean
  }
}) {
  const apiKey = process.env.RESEND_API_KEY
  const notifyTo = process.env.NOTIFY_EMAIL_TO

  if (!apiKey || !notifyTo) return

  const resend = new Resend(apiKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const leadUrl = `${appUrl}/admin/leads/${id}`

  await resend.emails.send({
    from: "Courtly Leads <onboarding@resend.dev>",
    to: notifyTo,
    subject: `Nuevo lead demo: ${payload.nombreClub} (${payload.nombre} ${payload.apellido})`,
    html: `
      <h2>Nuevo lead desde pricing</h2>
      <p><strong>Nombre:</strong> ${payload.nombre} ${payload.apellido}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Teléfono:</strong> ${payload.telefono}</p>
      <p><strong>Rol:</strong> ${payload.rol}</p>
      <p><strong>Club:</strong> ${payload.nombreClub}</p>
      <p><strong>Tipo de club:</strong> ${payload.tipoClub}</p>
      <p><strong>Tipo de canchas:</strong> ${payload.tipoCanchas}</p>
      <p><strong>Cantidad de canchas:</strong> ${payload.cantidadCanchas}</p>
      <p><strong>Deporte:</strong> ${payload.deporte}</p>
      <p><strong>Ubicación:</strong> ${payload.ciudad}, ${payload.pais}</p>
      <p><strong>Marketing Opt-in:</strong> ${payload.marketingOptIn ? "Sí" : "No"}</p>
      <p><a href="${leadUrl}">Abrir lead en admin</a></p>
    `,
  })
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    // Simple in-memory limiter (good for local/dev and single instance).
    // TODO (production): move to Upstash/Redis/KV for distributed rate limiting.
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas solicitudes. Intentá de nuevo en unos minutos." },
        { status: 429 }
      )
    }

    const rawBody = await request.json()

    const parsed = demoRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // TODO: Optional reCAPTCHA verification hook
    // if (data.recaptchaToken) { ... verify token with Google endpoint ... }

    const payload = {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      rol: data.rol,
      nombreClub: data.nombreClub,
      tipoClub: data.tipoClub,
      tipoCanchas: data.tipoCanchas,
      cantidadCanchas: data.cantidadCanchas,
      deporte: data.deporte,
      pais: data.pais,
      ciudad: data.ciudad,
      marketingOptIn: data.marketingOptIn,
      status: "new" as const,
      source: "pricing_form" as const,
      createdAt: FieldValue.serverTimestamp(),
      userAgent: request.headers.get("user-agent") || "unknown",
      ip,
    }

    const ref = await adminDb.collection("demo_requests").add(payload)

    try {
      await sendLeadNotificationEmail({
        id: ref.id,
        payload: {
          nombre: payload.nombre,
          apellido: payload.apellido,
          email: payload.email,
          telefono: payload.telefono,
          rol: payload.rol,
          nombreClub: payload.nombreClub,
          tipoClub: payload.tipoClub,
          tipoCanchas: payload.tipoCanchas,
          cantidadCanchas: payload.cantidadCanchas,
          deporte: payload.deporte,
          pais: payload.pais,
          ciudad: payload.ciudad,
          marketingOptIn: payload.marketingOptIn,
        },
      })
    } catch (notifyError) {
      console.error("[demo-request] notification email failed:", notifyError)
      // Do not fail lead creation if notification fails.
    }

    return NextResponse.json({ ok: true, id: ref.id })
  } catch (error) {
    console.error("[demo-request] POST error:", error)
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la solicitud." },
      { status: 500 }
    )
  }
}
