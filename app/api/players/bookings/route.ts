import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    // Verify Firebase ID token from Authorization header
    const authHeader = req.headers.get("authorization") || ""
    const idToken = authHeader.replace("Bearer ", "").trim()
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid

    // collectionGroup query across all centers/{id}/bookings
    const snap = await adminDb
      .collectionGroup("bookings")
      .where("userId", "==", uid)
      .orderBy("date", "desc")
      .limit(50)
      .get()

    const bookings = snap.docs.map((d) => {
      const data = d.data()
      // Encode compound bookingId so client can use booking-service helpers
      const clubId = d.ref.parent.parent?.id ?? ""
      const docId = d.id
      return {
        id: `${clubId}__${docId}`,
        clubId,
        clubName: data.clubName ?? "",
        courtId: data.courtId ?? "",
        courtName: data.courtName ?? "",
        sport: data.sport ?? "",
        date: data.date ?? "",
        startTime: data.startTime ?? "",
        endTime: data.endTime ?? "",
        durationMinutes: data.durationMinutes ?? 0,
        price: data.price ?? null,
        currency: data.currency ?? "ARS",
        bookingStatus: data.bookingStatus ?? "pending_payment",
        paymentStatus: data.paymentStatus ?? "pending",
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() ?? null,
      }
    })

    return NextResponse.json({ bookings })
  } catch (err: any) {
    console.error("player bookings error:", err)
    if (err?.code === "auth/argument-error" || err?.code === "auth/id-token-expired") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
