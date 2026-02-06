import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { FieldPath } from "firebase-admin/firestore"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get("booking_id")

  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 })
  }

  const snapshot = await adminDb
    .collectionGroup("bookings")
    .where(FieldPath.documentId(), "==", bookingId)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const docSnap = snapshot.docs[0]
  return NextResponse.json({ id: docSnap.id, ...docSnap.data() })
}
