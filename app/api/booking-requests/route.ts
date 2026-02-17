import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      centerId,
      courtId,
      courtName,
      date,
      time,
      durationMinutes,
      customerName,
      customerEmail,
    } = body

    if (!centerId || !courtId || !date || !time || !customerName || !customerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const ref = adminDb.collection("padel_centers").doc(centerId).collection("booking_requests")
    await ref.add({
      courtId,
      courtName,
      date,
      time,
      durationMinutes,
      customerName,
      customerEmail,
      status: "pending",
      createdAt: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error creating booking request:", error)
    return NextResponse.json({ error: "Failed to create booking request" }, { status: 500 })
  }
}
