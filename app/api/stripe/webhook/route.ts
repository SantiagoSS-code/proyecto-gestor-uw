import Stripe from "stripe"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

let stripeClient: Stripe | null = null

function getStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecret)
  }

  return stripeClient
}

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error("Stripe webhook is not configured (missing STRIPE_WEBHOOK_SECRET)")
  }
  return webhookSecret
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency || "ARS",
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

// ─── Booking confirmation email ───────────────────────────────────────────────
async function sendBookingConfirmationEmail(params: {
  to: string
  customerName: string
  centerName: string
  bookingDate: string
  bookingTime: string
  paidNow: number
  reservationTotal: number
  remainingAmount: number
  currency: string
  remainingInstructions: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log("[Courtly] Booking confirmation email (no RESEND_API_KEY):", params)
    return
  }

  const paidNowText = formatMoney(params.paidNow, params.currency)
  const reservationTotalText = formatMoney(params.reservationTotal, params.currency)
  const remainingAmountText = formatMoney(params.remainingAmount, params.currency)

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Courtly <onboarding@resend.dev>",
      to: [params.to],
      subject: `Reserva confirmada en ${params.centerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <h2 style="margin: 0 0 12px;">Reserva confirmada ✅</h2>
          <p style="margin: 0 0 16px; color: #334155;">Hola ${params.customerName || ""}, tu reserva en <strong>${params.centerName}</strong> fue confirmada.</p>
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 14px; background: #f8fafc;">
            <p style="margin: 0 0 6px;"><strong>Fecha:</strong> ${params.bookingDate}</p>
            <p style="margin: 0 0 6px;"><strong>Horario:</strong> ${params.bookingTime}</p>
            <p style="margin: 0 0 6px;"><strong>Total de la reserva:</strong> ${reservationTotalText}</p>
            <p style="margin: 0 0 6px;"><strong>Pagado ahora:</strong> ${paidNowText}</p>
            <p style="margin: 0;"><strong>Saldo pendiente:</strong> ${remainingAmountText}</p>
          </div>
          <div style="border: 1px solid #dbeafe; border-radius: 10px; padding: 14px; background: #eff6ff;">
            <p style="margin: 0 0 8px;"><strong>¿Cómo pagar el saldo pendiente?</strong></p>
            <p style="margin: 0; white-space: pre-line; color: #1e293b;">${params.remainingInstructions || "El club se contactará para indicarte cómo abonar el saldo pendiente."}</p>
          </div>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[Courtly] Error sending booking confirmation email:", err)
  })
}

// ─── ClubOS plan activation email (to client) ────────────────────────────────
async function sendPlanActivationEmailToClient(params: {
  to: string
  centerId: string
  plan: string
  period: "monthly" | "annual"
  nextRenewalDate: Date
  amount: number
  currency: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log("[ClubOS] Plan activation email to client (no RESEND_API_KEY):", params)
    return
  }

  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const periodLabel = params.period === "annual" ? "Anual" : "Mensual"
  const renewalDateStr = params.nextRenewalDate.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  })
  const amountStr = formatMoney(params.amount, params.currency)

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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h1 style="margin: 0 0 8px; font-size: 24px; color: #16a34a;">¡Bienvenido a ClubOS! 🎉</h1>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 15px;">Tu suscripción fue activada correctamente. Ya podés acceder al panel de administración.</p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Detalles de tu plan</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Plan</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${planLabel}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Período</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${periodLabel}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Monto</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${amountStr}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Próxima renovación</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${renewalDateStr}</td></tr>
              </table>
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://voyd.com.ar"}/clubos/login" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
              Ingresar a ClubOS →
            </a>

            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Tu suscripción se renueva automáticamente. Podés cancelarla en cualquier momento desde el panel.
              Si tenés alguna duda, contactanos a <a href="mailto:soporte@voyd.com.ar" style="color: #16a34a;">soporte@voyd.com.ar</a>.
            </p>
          </div>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[ClubOS] Error sending activation email to client:", err)
  })
}

// ─── ClubOS plan activation email (internal notification to Voyd team) ────────
async function sendPlanActivationEmailToAdmin(params: {
  centerId: string
  email: string
  plan: string
  period: "monthly" | "annual"
  amount: number
  currency: string
  stripeSessionId: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const adminEmails = process.env.PLATFORM_ADMIN_EMAILS || process.env.NOTIFY_EMAIL_TO
  if (!RESEND_API_KEY || !adminEmails) {
    console.log("[ClubOS] Plan activation admin notification (no RESEND_API_KEY or admin emails):", params)
    return
  }

  const toList = adminEmails.split(",").map((e: string) => e.trim()).filter(Boolean)
  if (!toList.length) return

  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const periodLabel = params.period === "annual" ? "Anual" : "Mensual"
  const amountStr = formatMoney(params.amount, params.currency)
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
      subject: `[ClubOS] Nuevo pago confirmado — ${params.email} (${planLabel} ${periodLabel})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h2 style="margin: 0 0 16px; color: #0f172a;">💳 Nuevo pago de suscripción ClubOS</h2>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px; width: 140px;">Email</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${params.email}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Center ID</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${params.centerId}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Plan</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${planLabel}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Período</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${periodLabel}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Monto</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px; color: #16a34a;">${amountStr}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Fecha (ARG)</td><td style="padding: 5px 0; font-weight: 600; font-size: 14px;">${now}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-size: 14px;">Stripe Session</td><td style="padding: 5px 0; font-size: 13px; color: #64748b;">${params.stripeSessionId}</td></tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin: 0;">Este es un mensaje automático de ClubOS.</p>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[ClubOS] Error sending activation admin notification:", err)
  })
}

// ─── ClubOS renewal email (to client) ────────────────────────────────────────
async function sendRenewalEmailToClient(params: {
  to: string
  plan: string
  period: "monthly" | "annual"
  nextRenewalDate: Date
  amount: number
  currency: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return

  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const periodLabel = params.period === "annual" ? "anual" : "mensual"
  const renewalDateStr = params.nextRenewalDate.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  })
  const amountStr = formatMoney(params.amount, params.currency)

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Voyd ClubOS <onboarding@resend.dev>",
      to: [params.to],
      subject: `Tu suscripción ClubOS ${periodLabel} fue renovada ✅`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h1 style="margin: 0 0 8px; font-size: 22px; color: #0f172a;">Suscripción renovada ✅</h1>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 15px;">Tu suscripción ${periodLabel} a ClubOS fue renovada correctamente.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Plan</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${planLabel}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Monto cobrado</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 14px;">${amountStr}</td></tr>
                <tr><td style="padding: 4px 0; color: #374151; font-size: 14px;">Próxima renovación</td><td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${renewalDateStr}</td></tr>
              </table>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Si no reconocés este cargo, contactanos a <a href="mailto:soporte@voyd.com.ar" style="color: #16a34a;">soporte@voyd.com.ar</a>.
            </p>
          </div>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[ClubOS] Error sending renewal email to client:", err)
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    const webhookSecret = getWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed.", err)
    const message = err instanceof Error ? err.message : "Invalid signature"
    const status = message.includes("not configured") ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    const centerId = metadata.centerId
    const bookingId = metadata.bookingId

    // ── ClubOS plan activation ──────────────────────────────────────────────
    if (metadata.type === "clubos_plan_activation" && centerId) {
      const email = metadata.email || session.customer_email || ""
      const plan = metadata.plan || "profesional"
      const billing = (metadata.billing === "annual" ? "annual" : "monthly") as "monthly" | "annual"

      // Fetch next renewal date from the Stripe subscription
      let nextRenewalDate = new Date()
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null

      if (subscriptionId) {
        try {
          const stripe = getStripe()
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          nextRenewalDate = new Date(subscription.current_period_end * 1000)
        } catch (e) {
          // Fallback: compute locally
          nextRenewalDate = new Date()
          if (billing === "annual") {
            nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1)
          } else {
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1)
          }
        }
      }

      const amount = session.amount_total ? session.amount_total / 100 : 0
      const currency = (session.currency || "usd").toUpperCase()

      const activationData = {
        subscriptionStatus: "active",
        subscriptionStartDate: FieldValue.serverTimestamp(),
        subscriptionPeriod: billing,
        selectedPlan: plan,
        nextRenewalDate,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        updatedAt: FieldValue.serverTimestamp(),
      }

      await Promise.all([
        adminDb.collection("users").doc(centerId).set(activationData, { merge: true }),
        adminDb.collection("centers").doc(centerId).set(activationData, { merge: true }),
      ])

      await Promise.all([
        sendPlanActivationEmailToClient({ to: email, centerId, plan, period: billing, nextRenewalDate, amount, currency }),
        sendPlanActivationEmailToAdmin({ centerId, email, plan, period: billing, amount, currency, stripeSessionId: session.id }),
      ])

      console.log(`[ClubOS] Plan activated: centerId=${centerId}, plan=${plan}, billing=${billing}`)
    }

    // ── Booking payment confirmation ────────────────────────────────────────
    if (centerId && bookingId) {
      const bookingRef = adminDb.collection("padel_centers").doc(centerId).collection("bookings").doc(bookingId)
      await bookingRef.update({
        status: "confirmed",
        payment: {
          provider: "stripe",
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          paidAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      })

      const bookingSnap = await bookingRef.get()
      if (bookingSnap.exists) {
        const bookingData = bookingSnap.data() as any
        if (bookingData?.customerEmail) {
          const centerSnap = await adminDb.collection("padel_centers").doc(centerId).get()
          const centerData = centerSnap.exists ? (centerSnap.data() as any) : {}
          const operationsSnap = await adminDb.collection("padel_centers").doc(centerId).collection("settings").doc("operations").get()
          const operationsData = operationsSnap.exists ? (operationsSnap.data() as any) : {}

          const pricing = bookingData?.payment?.pricing || {}
          const reservationTotal = Number(pricing.reservationTotal || metadata.reservationTotal || 0)
          const paidNow = Number(pricing.totalChargedNow || metadata.totalChargedNow || 0)
          const remainingAmount = Math.max(0, Number((reservationTotal - paidNow).toFixed(2)))
          const currency = String(pricing.currency || (session.currency || "ARS").toUpperCase())

          const startAtDate = bookingData?.startAt?.toDate ? bookingData.startAt.toDate() : null
          const bookingDate = startAtDate ? startAtDate.toLocaleDateString("es-AR") : "-"
          const bookingTime = startAtDate
            ? startAtDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
            : "-"

          await sendBookingConfirmationEmail({
            to: String(bookingData.customerEmail),
            customerName: String(bookingData.customerName || ""),
            centerName: String(centerData?.name || "tu club"),
            bookingDate,
            bookingTime,
            paidNow,
            reservationTotal,
            remainingAmount,
            currency,
            remainingInstructions: String(operationsData?.remainingPaymentInstructions || ""),
          })
        }
      }
    }
  }

  // ── Subscription renewal ──────────────────────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    const billingReason = invoice.billing_reason

    // Only process renewals, not the initial payment (handled via checkout.session.completed)
    if (billingReason === "subscription_cycle" && invoice.subscription) {
      const subscriptionId = invoice.subscription as string
      try {
        const stripe = getStripe()
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const subMeta = subscription.metadata || {}
        const centerId = subMeta.centerId

        if (centerId) {
          const nextRenewalDate = new Date(subscription.current_period_end * 1000)
          const billing = (subMeta.billing === "annual" ? "annual" : "monthly") as "monthly" | "annual"
          const plan = subMeta.plan || "profesional"
          const email = subMeta.email || ""
          const amount = invoice.amount_paid ? invoice.amount_paid / 100 : 0
          const currency = (invoice.currency || "usd").toUpperCase()

          await adminDb.collection("users").doc(centerId).set({
            subscriptionStatus: "active",
            nextRenewalDate,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })

          if (email) {
            await sendRenewalEmailToClient({ to: email, plan, period: billing, nextRenewalDate, amount, currency })
          }

          console.log(`[ClubOS] Subscription renewed: centerId=${centerId}, plan=${plan}, nextRenewal=${nextRenewalDate.toISOString()}`)
        }
      } catch (e) {
        console.error("[ClubOS] Error processing subscription renewal:", e)
      }
    }
  }

  // ── Subscription cancelled/deleted ───────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const subMeta = subscription.metadata || {}
    const centerId = subMeta.centerId

    if (centerId) {
      await adminDb.collection("users").doc(centerId).set({
        subscriptionStatus: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch((e) => {
        console.error("[ClubOS] Error marking subscription as cancelled:", e)
      })

      console.log(`[ClubOS] Subscription cancelled: centerId=${centerId}`)
    }
  }

  // ── Booking session expired ───────────────────────────────────────────────
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    const centerId = metadata.centerId
    const bookingId = metadata.bookingId

    if (centerId && bookingId) {
      const bookingRef = adminDb.collection("padel_centers").doc(centerId).collection("bookings").doc(bookingId)
      await bookingRef.update({
        status: "expired",
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }

  return NextResponse.json({ received: true })
