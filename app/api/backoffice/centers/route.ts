import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const url = new URL(request.url)
    const q = (url.searchParams.get("q") || "").trim().toLowerCase()

    const [centersSnap, legacySnap, courtsSnap] = await Promise.all([
      adminDb.collection(FIRESTORE_COLLECTIONS.centers).limit(200).get(),
      adminDb.collection(FIRESTORE_COLLECTIONS.legacyCenters).limit(200).get(),
      adminDb.collectionGroup(CENTER_SUBCOLLECTIONS.courts).get(),
    ])

    const fromCenters = centersSnap.docs.map((d) => ({
      centerId: d.id,
      source: FIRESTORE_COLLECTIONS.centers,
      ...(d.data() as any),
    }))
    const fromLegacy = legacySnap.docs.map((d) => ({
      centerId: d.id,
      source: FIRESTORE_COLLECTIONS.legacyCenters,
      ...(d.data() as any),
      // Normalize legacy shape
      slug: (d.data() as any)?.slug ?? null,
      published: (d.data() as any)?.published ?? false,
    }))

    // Prefer new model if both exist
    const map = new Map<string, any>()
    for (const item of fromLegacy) map.set(String(item.centerId), item)
    for (const item of fromCenters) map.set(String(item.centerId), item)

    const courtsByCenter = new Map<string, { count: number; sports: Set<string> }>()
    for (const doc of courtsSnap.docs) {
      const parent = doc.ref.parent.parent
      const centerId = parent?.id
      if (!centerId) continue
      const data = doc.data() as any
      const sport = String(data?.sport || "").toLowerCase()
      const entry = courtsByCenter.get(centerId) || { count: 0, sports: new Set<string>() }
      entry.count += 1
      if (sport) entry.sports.add(sport)
      courtsByCenter.set(centerId, entry)
    }

    const centerIds = Array.from(map.keys())
    const adminRefs = centerIds.map((id) => adminDb.collection("center_admins").doc(id))
    const adminSnaps = adminRefs.length ? await adminDb.getAll(...adminRefs) : []
    const adminMap = new Map<string, any>()
    for (const snap of adminSnaps) {
      if (snap.exists) adminMap.set(snap.id, snap.data())
    }

    const items = Array.from(map.values()).map((item) => {
      const stats = courtsByCenter.get(String(item.centerId))
      const owner = adminMap.get(String(item.centerId))
      return {
        ...item,
        ownerEmail: owner?.email || null,
        courtsCount: stats?.count ?? 0,
        sports: stats ? Array.from(stats.sports.values()) : [],
      }
    })

    const filtered = q
      ? items.filter((c) => {
          const name = String(c.name || "").toLowerCase()
          const email = String(c.email || "").toLowerCase()
          const ownerEmail = String(c.ownerEmail || "").toLowerCase()
          const slug = String(c.slug || "").toLowerCase()
          return (
            name.includes(q) ||
            email.includes(q) ||
            ownerEmail.includes(q) ||
            slug.includes(q) ||
            String(c.centerId).includes(q)
          )
        })
      : items

    return NextResponse.json({ items: filtered })
  } catch (e: any) {
    if (e instanceof Response) return e
    console.error("[BackofficeCenters] Error:", e?.message || e, e?.stack)
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
