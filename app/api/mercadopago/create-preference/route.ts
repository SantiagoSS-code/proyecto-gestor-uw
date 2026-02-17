import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

export const runtime = "nodejs"

function getMpAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    throw new Error("Mercado Pago is not configured (missing MERCADOPAGO_ACCESS_TOKEN)")
  }
  return token
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { centerId, courtId, date, time, durationMinutes, customerName, customerEmail, userId } = body

    if (!centerId || !courtId || !date || !time || !durationMinutes || !customerName || !customerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    console.log("[MP] Looking for court:", { centerId, courtId, path: `centers/${centerId}/courts/${courtId}` })

    const courtRef = adminDb.collection("centers").doc(centerId).collection("courts").doc(courtId)
    const courtSnap = await courtRef.get()
    
    console.log("[MP] Court exists:", courtSnap.exists, courtSnap.data())
    
    if (!courtSnap.exists) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 })
    }

    const court = courtSnap.data() as {
      name: string
      pricePerHour: number
      currency: string
    }

    if (!Number.isFinite(court.pricePerHour) || court.pricePerHour <= 0) {
      return NextResponse.json({ error: "Court price is not configured" }, { status: 400 })
    }

    // Mercado Pago uses currency units (e.g. ARS), not cents.
    const amount = Number(((court.pricePerHour * parsedDurationMinutes) / 60).toFixed(2))
    const currencyId = (court.currency || "ARS").toUpperCase()

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const notificationUrl = `${origin}/api/mercadopago/webhook`

    const bookingsRef = adminDb.collection("centers").doc(centerId).collection("bookings")

    const bookingId = await adminDb.runTransaction(async (tx) => {
      const querySnap = await tx.get(
        bookingsRef.where("courtId", "==", courtId).where("dateKey", "==", dateKey).where("status", "in", ["pending", "confirmed"])
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

    const mpToken = getMpAccessToken()

    // Mercado Pago no acepta localhost para auto_return, solo usar en producción
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1")

    const preferencePayload: Record<string, any> = {
      external_reference: bookingId,
      items: [
        {
          title: `${court.name} - ${parsedDurationMinutes} min`,
          quantity: 1,
          unit_price: amount,
          currency_id: currencyId,
        },
      ],
      payer: {
        name: customerName,
        email: customerEmail,
      },
      back_urls: {
        success: `${origin}/booking/success?booking_id=${bookingId}`,
        pending: `${origin}/booking/pending?booking_id=${bookingId}`,
        failure: `${origin}/booking/cancel?booking_id=${bookingId}`,
      },
      notification_url: notificationUrl,
      metadata: {
        centerId,
        courtId,
        bookingId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
    }

    // Solo agregar auto_return en producción (no localhost)
    if (!isLocalhost) {
      preferencePayload.auto_return = "approved"
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    })

    const mpData = await mpRes.json().catch(() => null)

    if (!mpRes.ok) {
      const message = mpData?.message || mpData?.error || "Failed to create Mercado Pago preference"
      return NextResponse.json({ error: message, mp: mpData }, { status: 502 })
    }

    const checkoutUrl = mpData?.sandbox_init_point || mpData?.init_point
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Mercado Pago did not return a checkout URL", mp: mpData }, { status: 502 })
    }

    await bookingsRef.doc(bookingId).update({
      payment: {
        provider: "mercadopago",
        preferenceId: mpData.id,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ checkoutUrl, bookingId })
  } catch (error: any) {
    console.error("Error creating Mercado Pago preference:", error)

    if (error?.message === "Slot already booked") {
      return NextResponse.json({ error: "Slot already booked" }, { status: 409 })
    }

    if (typeof error?.message === "string" && error.message.includes("Mercado Pago is not configured")) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const message = typeof error?.message === "string" ? error.message : "Failed to create preference"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}