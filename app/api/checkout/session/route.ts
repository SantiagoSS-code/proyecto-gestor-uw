import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
  }

  const snapshot = await adminDb.collectionGroup("bookings").where("payment.sessionId", "==", sessionId).limit(1).get()

  if (snapshot.empty) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const docSnap = snapshot.docs[0]
  return NextResponse.json({ id: docSnap.id, ...docSnap.data() })
}
