/**
 * TEST-ONLY endpoint — simulates a confirmed payment without Stripe.
 * Activates the account in Firestore and sends confirmation emails.
 * Remove or gate behind a flag before going to production.
 */
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

type Payload = {
  centerId?: string
  email?: string
  plan?: string
  billing?: string
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

async function sendActivationEmailToClient(params: {
  to: string
  plan: string
  period: string
  nextRenewalDate: Date
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return

  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const periodLabel = params.period === "annual" ? "Anual" : "Mensual"
  const renewalDateStr = params.nextRenewalDate.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Voyd ClubOS <onboarding@resend.dev>",
      to: [params.to],
      subject: "¡Tu suscripción a ClubOS está activa! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #0f172a;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h1 style="margin: 0 0 8px; font-size: 24px; color: #16a34a;">¡Bienvenido a ClubOS! 🎉</h1>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 15px;">Tu suscripción fue activada correctamente. Ya podés acceder al panel de administración.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Detalles de tu plan</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Plan</td><td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${planLabel}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Período</td><td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${periodLabel}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Próxima renovación</td><td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${renewalDateStr}</td></tr>
              </table>
            </div>
            <a href="${appUrl}/clubos/login"
               style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
              Ingresar a ClubOS →
            </a>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Si tenés alguna duda, contactanos a <a href="mailto:soporte@voyd.com.ar" style="color: #16a34a;">soporte@voyd.com.ar</a>.
            </p>
          </div>
        </div>
      `,
    }),
  }).catch((err) => console.error("[simulate-payment] Error sending client email:", err))
}

async function sendActivationEmailToAdmin(params: {
  centerId: string
  email: string
  plan: string
  period: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const adminEmails = process.env.PLATFORM_ADMIN_EMAILS || process.env.NOTIFY_EMAIL_TO
  if (!RESEND_API_KEY || !adminEmails) return

  const toList = adminEmails.split(",").map((e: string) => e.trim()).filter(Boolean)
  if (!toList.length) return

  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const periodLabel = params.period === "annual" ? "Anual" : "Mensual"
  const now = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Voyd ClubOS <onboarding@resend.dev>",
      to: toList,
      subject: `[ClubOS TEST] Pago simulado confirmado — ${params.email} (${planLabel} ${periodLabel})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h2 style="margin: 0 0 4px; color: #0f172a;">💳 Pago simulado (TEST)</h2>
          <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">Este es un pago de prueba — no se procesó cargo real.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px; width: 140px;">Email</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${params.email}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Center ID</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${params.centerId}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Plan</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${planLabel}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Período</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${periodLabel}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Fecha (ARG)</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${now}</td></tr>
            </table>
          </div>
        </div>
      `,
    }),
  }).catch((err) => console.error("[simulate-payment] Error sending admin email:", err))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Payload | null
    const centerId = String(body?.centerId || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const plan = String(body?.plan || "profesional").toLowerCase()
    const billing = String(body?.billing || "monthly") === "annual" ? "annual" : "monthly"

    if (!centerId || !email) {
      return NextResponse.json({ error: "centerId y email son obligatorios" }, { status: 400 })
    }

    // Compute next renewal date
    const nextRenewalDate = new Date()
    if (billing === "annual") {
      nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1)
    } else {
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1)
    }

    const activationData = {
      subscriptionStatus: "active",
      subscriptionStartDate: FieldValue.serverTimestamp(),
      subscriptionPeriod: billing,
      selectedPlan: plan,
      nextRenewalDate,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await Promise.all([
      adminDb.collection("users").doc(centerId).set(activationData, { merge: true }),
      adminDb.collection("centers").doc(centerId).set(activationData, { merge: true }),
    ])

    // Fire emails in background — don't let email errors block the response
    Promise.all([
      sendActivationEmailToClient({ to: email, plan, period: billing, nextRenewalDate }),
      sendActivationEmailToAdmin({ centerId, email, plan, period: billing }),
    ]).catch((e) => console.error("[simulate-payment] Email error:", e))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
