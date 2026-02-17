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
