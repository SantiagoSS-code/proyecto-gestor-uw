import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"
import { CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const url = new URL(request.url)
    const q = (url.searchParams.get("q") || "").trim().toLowerCase()

    const [centersSnap, legacySnap, courtsSnap] = await Promise.all([
      adminDb.collection(FIRESTORE_COLLECTIONS.centers).get(),
      adminDb.collection(FIRESTORE_COLLECTIONS.legacyCenters).get(),
      adminDb.collectionGroup(CENTER_SUBCOLLECTIONS.courts).get(),
    ])

    const centersMap = new Map<string, any>()
    for (const doc of legacySnap.docs) {
      centersMap.set(doc.id, { centerId: doc.id, source: FIRESTORE_COLLECTIONS.legacyCenters, ...(doc.data() as any) })
    }
    for (const doc of centersSnap.docs) {
      centersMap.set(doc.id, { centerId: doc.id, source: FIRESTORE_COLLECTIONS.centers, ...(doc.data() as any) })
    }

    const centerIds = Array.from(centersMap.keys())
    const adminRefs = centerIds.map((id) => adminDb.collection("center_admins").doc(id))
    const adminSnaps = adminRefs.length ? await adminDb.getAll(...adminRefs) : []
    const adminMap = new Map<string, any>()
    for (const snap of adminSnaps) {
      if (snap.exists) adminMap.set(snap.id, snap.data())
    }

    const items = courtsSnap.docs
      .map((doc) => {
        const parent = doc.ref.parent.parent
        const centerId = parent?.id || ""
        const data = doc.data() as any
        const center = centersMap.get(centerId) || {}
        const owner = adminMap.get(centerId) || {}

        return {
          courtId: doc.id,
          centerId,
          centerName: center?.name || center?.displayName || "—",
          centerEmail: center?.email || center?.contactEmail || "—",
          ownerEmail: owner?.email || "—",
          sport: data?.sport || "padel",
          indoor: !!data?.indoor,
          surfaceType: data?.surfaceType || "—",
          pricePerHour: data?.pricePerHour ?? null,
          currency: data?.currency || "ARS",
          published: data?.published !== false,
          source: parent?.parent?.id || "unknown",
        }
      })
      .filter((row) => row.centerId)

    const filtered = q
      ? items.filter((row) => {
          const blob = [
            row.centerId,
            row.centerName,
            row.centerEmail,
            row.ownerEmail,
            row.courtId,
            row.sport,
            row.surfaceType,
          ]
            .join(" ")
            .toLowerCase()
          return blob.includes(q)
        })
      : items

    return NextResponse.json({ items: filtered })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
