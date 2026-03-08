import Stripe from "stripe"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

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

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

type CenterOperationSettings = {
  depositEnabled?: boolean
  depositPercent?: number
}

async function loadOperationSettings(centerId: string): Promise<CenterOperationSettings> {
  const refs = [
    adminDb.collection("centers").doc(centerId).collection("settings").doc("operations"),
    adminDb.collection("padel_centers").doc(centerId).collection("settings").doc("operations"),
  ]

  for (const ref of refs) {
    const snap = await ref.get()
    if (snap.exists) {
      const data = snap.data() as CenterOperationSettings
      return {
        depositEnabled: Boolean(data?.depositEnabled),
        depositPercent: Number.isFinite(Number(data?.depositPercent)) ? Number(data?.depositPercent) : 0,
      }
    }
  }

  return { depositEnabled: false, depositPercent: 0 }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { centerId, courtId, date, time, durationMinutes, customerName, customerEmail, userId } = body

    if (!centerId || !courtId || !date || !time || !durationMinutes || !customerName || !customerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const courtRef = adminDb.collection("padel_centers").doc(centerId).collection("courts").doc(courtId)
    const courtSnap = await courtRef.get()
    if (!courtSnap.exists) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 })
    }

    const court = courtSnap.data() as {
      name: string
      pricePerHour: number
      currency: string
    }

    const parsedDurationMinutes = Number(durationMinutes)
    if (!Number.isFinite(parsedDurationMinutes) || parsedDurationMinutes <= 0) {
      return NextResponse.json({ error: "Invalid durationMinutes" }, { status: 400 })
    }

    const startAt = new Date(`${date}T${time}:00`)
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 })
    }

    const endAt = addMinutes(startAt, parsedDurationMinutes)
    const dateKey = date
    const expiresAt = addMinutes(new Date(), 10)

    const bookingsRef = adminDb.collection("padel_centers").doc(centerId).collection("bookings")

    const bookingId = await adminDb.runTransaction(async (tx) => {
      const querySnap = await tx.get(
        bookingsRef
          .where("courtId", "==", courtId)
          .where("dateKey", "==", dateKey)
          .where("status", "in", ["pending", "confirmed"])
      )

      const now = new Date()
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data()
        if (data.status === "pending" && data.expiresAt?.toDate && data.expiresAt.toDate() < now) {
          continue
        }
        const existingStart = data.startAt?.toDate ? data.startAt.toDate() : null
        const existingEnd = data.endAt?.toDate ? data.endAt.toDate() : null
        if (!existingStart || !existingEnd) continue
        const overlaps = existingStart < endAt && existingEnd > startAt
        if (overlaps) {
          throw new Error("Slot already booked")
        }
      }

      const newRef = bookingsRef.doc()
      tx.set(newRef, {
        courtId,
        userId: userId || null,
        customerName,
        customerEmail,
        dateKey,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        status: "pending",
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      return newRef.id
    })

    if (!Number.isFinite(court.pricePerHour) || court.pricePerHour <= 0) {
      return NextResponse.json({ error: "Court price is not configured" }, { status: 400 })
    }

    const reservationTotal = (court.pricePerHour * parsedDurationMinutes) / 60
    const currency = (court.currency || "USD").toLowerCase()

    const operationSettings = await loadOperationSettings(centerId)
    const depositEnabled = Boolean(operationSettings.depositEnabled)
    const depositPercentRaw = Number(operationSettings.depositPercent || 0)
    const depositPercent = Math.max(0, Math.min(100, depositPercentRaw))

    const reservationAmountToCharge = depositEnabled ? (reservationTotal * depositPercent) / 100 : reservationTotal

    const reservationAmountCents = Math.round(reservationAmountToCharge * 100)
    const totalChargedNowCents = reservationAmountCents

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: reservationAmountCents,
            product_data: {
              name: depositEnabled ? `Seña de reserva - ${court.name}` : `${court.name} - ${parsedDurationMinutes} min`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/cancel?booking_id=${bookingId}`,
      metadata: {
        centerId,
        courtId,
        bookingId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reservationTotal: reservationTotal.toFixed(2),
        depositEnabled: String(depositEnabled),
        depositPercent: String(depositEnabled ? depositPercent : 100),
        reservationAmountCharged: (reservationAmountCents / 100).toFixed(2),
        totalChargedNow: (totalChargedNowCents / 100).toFixed(2),
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a Checkout URL" }, { status: 502 })
    }

    await bookingsRef.doc(bookingId).update({
      payment: {
        provider: "stripe",
        sessionId: session.id,
        pricing: {
          reservationTotal: Number(reservationTotal.toFixed(2)),
          depositEnabled,
          depositPercent: depositEnabled ? depositPercent : 100,
          reservationAmountCharged: Number((reservationAmountCents / 100).toFixed(2)),
          totalChargedNow: Number((totalChargedNowCents / 100).toFixed(2)),
          currency: currency.toUpperCase(),
        },
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ sessionUrl: session.url, bookingId })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)

    if (error?.message === "Slot already booked") {
      return NextResponse.json({ error: "Slot already booked" }, { status: 409 })
    }

    if (typeof error?.message === "string" && error.message.includes("Stripe is not configured")) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const message = typeof error?.message === "string" ? error.message : "Failed to create session"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
