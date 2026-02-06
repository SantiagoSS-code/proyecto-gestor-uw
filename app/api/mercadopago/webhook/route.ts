import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldPath, FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

function getMpAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    throw new Error("Mercado Pago is not configured (missing MERCADOPAGO_ACCESS_TOKEN)")
  }
  return token
}

type MpPayment = {
  id: number
  status: string
  status_detail?: string
  external_reference?: string
  transaction_amount?: number
  currency_id?: string
  date_approved?: string
}

async function handleNotification(request: Request) {
  let paymentId: string | null = null

  // Querystring formats
  const url = new URL(request.url)
  paymentId = url.searchParams.get("data.id") || url.searchParams.get("id")

  // Body formats
  if (!paymentId) {
    const bodyText = await request.text()
    try {
      const parsed = JSON.parse(bodyText)
      paymentId = parsed?.data?.id?.toString?.() || parsed?.id?.toString?.() || null
    } catch {
      // ignore
    }
  }

  if (!paymentId) {
    // Mercado Pago can send other topics; acknowledge to avoid retries.
    return NextResponse.json({ received: true })
  }

  let payment: MpPayment | null = null
  try {
    const mpToken = getMpAccessToken()
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.error("Failed to fetch Mercado Pago payment:", data)
      return NextResponse.json({ received: true })
    }

    payment = data as MpPayment
  } catch (err) {
    console.error("Error fetching Mercado Pago payment:", err)
    return NextResponse.json({ received: true })
  }

  const bookingId = payment.external_reference
  if (!bookingId) {
    return NextResponse.json({ received: true })
  }

  const bookingSnap = await adminDb
    .collectionGroup("bookings")
    .where(FieldPath.documentId(), "==", bookingId)
    .limit(1)
    .get()

  if (bookingSnap.empty) {
    return NextResponse.json({ received: true })
  }

  const docSnap = bookingSnap.docs[0]

  // Update state based on payment status.
  if (payment.status === "approved") {
    await docSnap.ref.update({
      status: "confirmed",
      payment: {
        provider: "mercadopago",
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail || null,
        amount: payment.transaction_amount ?? null,
        currency: payment.currency_id || null,
        approvedAt: payment.date_approved || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else if (["rejected", "cancelled"].includes(payment.status)) {
    await docSnap.ref.update({
      status: "payment_failed",
      payment: {
        provider: "mercadopago",
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail || null,
        amount: payment.transaction_amount ?? null,
        currency: payment.currency_id || null,
        approvedAt: payment.date_approved || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  return NextResponse.json({ received: true })
}

export async function GET(request: Request) {
  try {
    return await handleNotification(request)
  } catch (err) {
    console.error("Mercado Pago webhook GET error:", err)
    return NextResponse.json({ received: true })
  }
}

export async function POST(request: Request) {
  try {
    return await handleNotification(request)
  } catch (err) {
    console.error("Mercado Pago webhook POST error:", err)
    return NextResponse.json({ received: true })
  }
}
