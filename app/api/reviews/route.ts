import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const idToken = authHeader.replace("Bearer ", "").trim()
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid

    const body = await req.json()
    const { bookingId, rating, comment, userName } = body

    if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // bookingId format: "${centerId}__${docId}"
    const parts = bookingId.split("__")
    if (parts.length < 2) return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
    const centerId = parts[0]
    const docId = parts[1]

    // Verify booking exists and belongs to the requesting user
    const bookingRef = adminDb.collection("centers").doc(centerId).collection("bookings").doc(docId)
    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    const bookingData = bookingSnap.data()!
    if (bookingData.userId !== uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Prevent duplicate reviews for the same booking
    const existing = await adminDb
      .collection("centers").doc(centerId).collection("reviews")
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get()
    if (!existing.empty) {
      return NextResponse.json({ error: "Ya puntuaste esta reserva" }, { status: 409 })
    }

    const reviewerName = userName || decoded.name || decoded.email?.split("@")[0] || "Jugador"

    // Save review
    await adminDb.collection("centers").doc(centerId).collection("reviews").add({
      centerId,
      bookingId,
      userId: uid,
      userName: reviewerName,
      rating,
      comment: comment?.trim() || "",
      createdAt: FieldValue.serverTimestamp(),
    })

    // Mark booking as reviewed
    await bookingRef.update({ reviewSubmitted: true })

    // Recalculate center average rating using incremental formula
    await adminDb.runTransaction(async (tx) => {
      const centerRef = adminDb.collection("centers").doc(centerId)
      const centerSnap = await tx.get(centerRef)
      const data = centerSnap.data() || {}
      const oldCount: number = data.reviewCount || 0
      const oldRating: number = data.rating || 0
      const newCount = oldCount + 1
      const newRating = Math.round(((oldRating * oldCount + rating) / newCount) * 10) / 10
      tx.update(centerRef, { rating: newRating, reviewCount: newCount })
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("review submit error:", err)
    if (err?.code?.startsWith("auth/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
