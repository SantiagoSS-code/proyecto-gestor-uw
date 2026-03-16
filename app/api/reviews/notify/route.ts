import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

function formatDateEs(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function reviewEmailHtml(params: {
  userName: string
  centerName: string
  date: string
  startTime: string
  endTime: string
  dashboardUrl: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #0f172a;">
      <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 8px; font-size: 22px;">¿Cómo estuvo tu turno? ⭐</h2>
        <p style="margin: 0 0 20px; color: #64748b; font-size: 15px;">
          Hola ${params.userName}, jugaste en <strong>${params.centerName}</strong> el ${formatDateEs(params.date)} de ${params.startTime} a ${params.endTime}.
          Tu opinión ayuda a otros jugadores a elegir el mejor centro.
        </p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #475569;">
            📍 <strong>${params.centerName}</strong><br/>
            🗓️ ${formatDateEs(params.date)}<br/>
            🕐 ${params.startTime} – ${params.endTime}
          </p>
        </div>
        <a href="${params.dashboardUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Dejar mi puntuación
        </a>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
          Solo toma 30 segundos. Tu rating contribuye a mejorar la plataforma para todos.
        </p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const idToken = authHeader.replace("Bearer ", "").trim()
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const userEmail = decoded.email
    if (!userEmail) return NextResponse.json({ ok: true, skipped: true })

    // Find confirmed past bookings that haven't had a review email sent yet
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)

    const snap = await adminDb
      .collectionGroup("bookings")
      .where("userId", "==", uid)
      .where("bookingStatus", "==", "confirmed")
      .where("date", "<=", todayKey)
      .get()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://voyd.app"
    const dashboardUrl = `${appUrl}/players/dashboard`

    let emailsSent = 0

    for (const docSnap of snap.docs) {
      const data = docSnap.data()

      // Skip if email already sent or review already submitted
      if (data.reviewEmailSent || data.reviewSubmitted) continue

      // Check the booking has actually ended
      const dateKey: string = data.date ?? ""
      const endTime: string = data.endTime ?? "23:59"
      if (!dateKey) continue

      const [y, m, d] = dateKey.split("-").map(Number)
      const [eh, em] = endTime.split(":").map(Number)
      const bookingEnd = new Date(y, m - 1, d, eh, em)
      if (bookingEnd > now) continue // not ended yet

      const centerId = docSnap.ref.parent.parent?.id ?? ""
      const docId = docSnap.id
      const centerName: string = data.clubName ?? data.centerName ?? "el centro"
      const userName = decoded.name || userEmail.split("@")[0] || "Jugador"

      // Send the email
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "VOYD <onboarding@resend.dev>",
          to: [userEmail],
          subject: `¿Cómo estuvo tu turno en ${centerName}? ⭐`,
          html: reviewEmailHtml({
            userName,
            centerName,
            date: dateKey,
            startTime: data.startTime ?? "",
            endTime,
            dashboardUrl,
          }),
        }),
      })

      // Mark booking so we don't re-send
      await adminDb
        .collection("centers").doc(centerId)
        .collection("bookings").doc(docId)
        .update({ reviewEmailSent: true, reviewEmailSentAt: FieldValue.serverTimestamp() })

      emailsSent++
    }

    return NextResponse.json({ ok: true, emailsSent })
  } catch (err: any) {
    console.error("reviews/notify error:", err)
    if (err?.code?.startsWith("auth/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
