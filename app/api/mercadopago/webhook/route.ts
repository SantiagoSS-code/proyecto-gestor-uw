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
  const bookingData = docSnap.data() as any

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

    const centerId = docSnap.ref.parent.parent?.id || bookingData?.centerId
    if (centerId && bookingData?.customerEmail) {
      const centerSnap = await adminDb.collection("centers").doc(centerId).get()
      const centerData = centerSnap.exists ? (centerSnap.data() as any) : {}
      const operationsSnap = await adminDb.collection("centers").doc(centerId).collection("settings").doc("operations").get()
      const operationsData = operationsSnap.exists ? (operationsSnap.data() as any) : {}

      const pricing = bookingData?.payment?.pricing || {}
      const reservationTotal = Number(pricing.reservationTotal || payment.transaction_amount || 0)
      const paidNow = Number(pricing.totalChargedNow || payment.transaction_amount || 0)
      const remainingAmount = Math.max(0, Number((reservationTotal - paidNow).toFixed(2)))
      const currency = String(pricing.currency || payment.currency_id || "ARS")

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
