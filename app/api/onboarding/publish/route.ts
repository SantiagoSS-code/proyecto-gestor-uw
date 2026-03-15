import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"

async function sendPublishReviewEmail(params: {
  centerId: string
  centerName: string
  adminEmail: string
  adminName: string
  courtsTotal: number
  courtsPublished: number
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const notifyTo = process.env.NOTIFY_EMAIL_TO

  if (!RESEND_API_KEY || !notifyTo) {
    console.log("[onboarding/publish] notification fallback", params)
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Courtly <onboarding@resend.dev>",
      to: notifyTo,
      subject: `Nuevo centro para revisión: ${params.centerName || params.centerId}`,
      html: `
        <h2>Nuevo envío de publicación</h2>
        <p><strong>Centro:</strong> ${params.centerName || "(sin nombre)"}</p>
        <p><strong>Center ID:</strong> ${params.centerId}</p>
        <p><strong>Administrador:</strong> ${params.adminName || "-"}</p>
        <p><strong>Email:</strong> ${params.adminEmail || "-"}</p>
        <p><strong>Canchas:</strong> ${params.courtsPublished}/${params.courtsTotal} publicadas</p>
        <p><a href="${appUrl}/backoffice/centers/${params.centerId}">Abrir en Backoffice</a></p>
      `,
    }),
  })
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)
    const centerId = decoded.uid

    const centerRef = adminDb.collection("centers").doc(centerId)
    const legacyCenterRef = adminDb.collection("padel_centers").doc(centerId)
    const userRef = adminDb.collection("users").doc(centerId)
    const newCourtsRef = adminDb.collection("centers").doc(centerId).collection("courts")
    const legacyCourtsRef = adminDb.collection("padel_centers").doc(centerId).collection("courts")

    const [centerSnap, userSnap, newCourtsSnap, legacyCourtsSnap] = await Promise.all([
      centerRef.get(),
      userRef.get(),
      newCourtsRef.get(),
      legacyCourtsRef.get(),
    ])

    const center = centerSnap.exists ? (centerSnap.data() as any) : {}
    const user = userSnap.exists ? (userSnap.data() as any) : {}

    // Merge both collections — same pattern as the rest of the app
    const mergedCourts = new Map<string, any>()
    legacyCourtsSnap.docs.forEach((d) => mergedCourts.set(d.id, d.data()))
    newCourtsSnap.docs.forEach((d) => mergedCourts.set(d.id, d.data()))
    const courts = Array.from(mergedCourts.values())

    const courtsTotal = courts.length
    const courtsPublished = courts.filter((c) => c.published === true).length

    if (courtsTotal === 0 || courtsPublished !== courtsTotal) {
      return NextResponse.json(
        { error: "Debes publicar todas las canchas antes de enviar a revisión." },
        { status: 400 }
      )
    }

    const reviewPayload = {
      published: false,
      reviewStatus: "pending",
      submittedForReviewAt: new Date(),
      updatedAt: new Date(),
    }

    await Promise.all([
      centerRef.set(reviewPayload, { merge: true }),
      legacyCenterRef.set(reviewPayload, { merge: true }),
    ])

    await sendPublishReviewEmail({
      centerId,
      centerName: center?.name || "",
      adminEmail: user?.email || decoded.email || "",
      adminName: [user?.firstName || user?.first_name, user?.lastName || user?.last_name].filter(Boolean).join(" "),
      courtsTotal,
      courtsPublished,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[onboarding/publish] error", error)
    return NextResponse.json({ error: error?.message || "Publish failed" }, { status: 500 })
  }
}
