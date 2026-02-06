import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const usersSnap = await adminDb.collection("users").get()
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

    const totalPlayers = users.filter((u) => u.role === "player").length
    const totalCenters = users.filter((u) => u.role === "center_admin" || u.role === "padel_center_admin").length

    const centersSnap = await adminDb.collection("centers").get()
    const totalCentersDocs = centersSnap.size

    // Bookings are optional in MVP: try collectionGroup('bookings') but fallback to 0.
    let totalBookings = 0
    let recentBookings: any[] = []
    try {
      const bookingsSnap = await adminDb
        .collectionGroup("bookings")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get()
      totalBookings = bookingsSnap.size
      recentBookings = bookingsSnap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...(d.data() as any) }))
    } catch {
      // ignore if no index / missing collection
    }

    const recentUsers = users
      .slice()
      .sort((a, b) => {
        const da = a.createdAt?.toDate?.() ?? a.createdAt ?? 0
        const db = b.createdAt?.toDate?.() ?? b.createdAt ?? 0
        return Number(db) - Number(da)
      })
      .slice(0, 10)

    return NextResponse.json({
      kpis: {
        totalPlayers,
        totalCenters: totalCentersDocs || totalCenters,
        totalBookings,
        revenue: null,
      },
      recent: {
        users: recentUsers,
        bookings: recentBookings,
      },
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
