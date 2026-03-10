import { randomBytes, createHash } from "crypto"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

type CreateRegistrationLinkPayload = {
  centerId?: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  expiresInDays?: number
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

async function sendRegistrationWelcomeEmail(params: {
  to: string
  centerName: string
  registrationUrl: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada")
  }

  const from = process.env.RESEND_FROM_EMAIL || "Voyd <onboarding@resend.dev>"
  const subject = `Bienvenido a Voyd · Activá tu cuenta de ${params.centerName}`

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <div style="padding: 24px 0; border-bottom: 1px solid #e2e8f0;">
        <h1 style="margin: 0; font-size: 24px;">Bienvenido a <span style="color:#2563eb">Voyd</span></h1>
      </div>
      <div style="padding: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 16px;">Te invitamos a activar tu cuenta de administrador para <strong>${params.centerName}</strong>.</p>
        <p style="margin: 0 0 20px; color:#475569;">Completá tu registro con email y contraseña para ingresar por primera vez a ClubOS y comenzar el onboarding.</p>
        <a href="${params.registrationUrl}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">Crear mi usuario</a>
        <p style="margin: 20px 0 0; font-size:12px; color:#64748b;">Si el botón no funciona, copiá y pegá este link en tu navegador:</p>
        <p style="margin: 6px 0 0; font-size:12px; color:#334155; word-break:break-all;">${params.registrationUrl}</p>
      </div>
    </div>
  `

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`No se pudo enviar el email de invitación (${res.status}) ${detail}`)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePlatformAdmin(request)

    const body = (await request.json().catch(() => null)) as CreateRegistrationLinkPayload | null
    const centerId = String(body?.centerId || "").trim()
    const email = normalizeEmail(String(body?.email || ""))
    const firstName = String(body?.firstName || "").trim()
    const lastName = String(body?.lastName || "").trim()
    const phone = String(body?.phone || "").trim()
    const expiresInDaysRaw = Number(body?.expiresInDays ?? 7)
    const expiresInDays = Number.isFinite(expiresInDaysRaw)
      ? Math.min(30, Math.max(1, Math.floor(expiresInDaysRaw)))
      : 7

    if (!email) {
      return NextResponse.json({ error: "Debes indicar el email del administrador" }, { status: 400 })
    }

    let centerSnap: FirebaseFirestore.DocumentSnapshot | null = null
    let legacyCenterSnap: FirebaseFirestore.DocumentSnapshot | null = null
    if (centerId) {
      const centerRef = adminDb.collection("centers").doc(centerId)
      const legacyCenterRef = adminDb.collection("padel_centers").doc(centerId)
      const snaps = await Promise.all([centerRef.get(), legacyCenterRef.get()])
      centerSnap = snaps[0]
      legacyCenterSnap = snaps[1]

      if (!centerSnap.exists && !legacyCenterSnap.exists) {
        return NextResponse.json({ error: "Club no encontrado" }, { status: 404 })
      }
    }

    const token = randomBytes(32).toString("hex")
    const tokenHash = hashToken(token)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)

    const docRef = adminDb.collection("clubos_registration_links").doc()
    await docRef.set({
      centerId: centerId || null,
      email,
      firstName,
      lastName,
      phone,
      tokenHash,
      createdAt: now,
      expiresAt,
      usedAt: null,
      usedByUid: null,
      usedByEmail: null,
      createdByUid: actor.uid,
      createdByEmail: actor.email || null,
    })

    const origin = new URL(request.url).origin
    const url = `${origin}/clubos/register?token=${token}`

    const centerName =
      String(
        (
          centerSnap?.exists
            ? (centerSnap.data() as any)?.name
            : legacyCenterSnap?.exists
              ? (legacyCenterSnap.data() as any)?.name
              : "Nuevo Club"
        ) || "Nuevo Club"
      ) || "Nuevo Club"

    await sendRegistrationWelcomeEmail({
      to: email,
      centerName,
      registrationUrl: url,
    })

    return NextResponse.json({
      ok: true,
      url,
      expiresAt: expiresAt.toISOString(),
      centerId,
      email,
      message: "Link de registro creado correctamente",
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
