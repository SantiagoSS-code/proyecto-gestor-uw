import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request, { params }: { params: { uid: string } | Promise<{ uid: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const uid = resolvedParams?.uid
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const userRef = adminDb.collection("users").doc(uid)
    const snap = await userRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    let playerProfile: Record<string, any> | null = null
    try {
      const playerSnap = await adminDb.collection("players").doc(uid).get()
      playerProfile = playerSnap.exists ? (playerSnap.data() as any) : null
    } catch {
      playerProfile = null
    }

    let bookings: any[] = []
    try {
      const bookingsSnap = await adminDb
        .collectionGroup("bookings")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
      bookings = bookingsSnap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...(d.data() as any) }))
    } catch {
      // ignore
    }

    return NextResponse.json({
      user: { ...(snap.data() as any), uid: snap.id },
      player: playerProfile,
      bookings,
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
