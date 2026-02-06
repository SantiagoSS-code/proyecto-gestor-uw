import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200)

    let items: any[] = []
    try {
      const snap = await adminDb.collectionGroup("bookings").orderBy("createdAt", "desc").limit(limit).get()
      items = snap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...(d.data() as any) }))
    } catch {
      try {
        const snap = await adminDb.collectionGroup("bookings").orderBy("startAt", "desc").limit(limit).get()
        items = snap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...(d.data() as any) }))
      } catch {
        items = []
      }
    }

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
