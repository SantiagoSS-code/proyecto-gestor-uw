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
    // Omit `apiVersion` so Stripe uses the account default.
    // This avoids TypeScript literal mismatches when Stripe typings update.
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
      ",
    }),
  }).catch((err) => {
    console.error("[Courtly] Error sending booking confirmation email:", err)
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
}
