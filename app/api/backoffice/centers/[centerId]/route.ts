import { NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    const centerRef = adminDb.collection("centers").doc(centerId)
    const snap = await centerRef.get()

    const legacyRef = adminDb.collection("padel_centers").doc(centerId)
    const legacySnap = snap.exists ? null : await legacyRef.get()
    if (!snap.exists && !legacySnap?.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const source = snap.exists ? "centers" : "padel_centers"
    const effectiveRef = snap.exists ? centerRef : legacyRef
    const effectiveSnap = snap.exists ? snap : (legacySnap as any)

    const courtsSnap = await effectiveRef.collection("courts").get()

    let bookingsCount = 0
    try {
      const bookingsSnap = await effectiveRef.collection("bookings").limit(100).get()
      bookingsCount = bookingsSnap.size
    } catch {
      // ignore
    }

    const data = effectiveSnap.data() as any

    return NextResponse.json({
      center: { centerId: effectiveSnap.id, source, ...(data || {}) },
      courtsCount: courtsSnap.size,
      bookingsCount,
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, any> = {}

    if (typeof body.published === "boolean") patch.published = body.published

    if (typeof body.status === "string") {
      if (!["active", "suspended"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      patch.status = body.status
    }

    if (body.featuredRank === null || typeof body.featuredRank === "number") {
      patch.featuredRank = body.featuredRank
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 })
    }

    patch.updatedAt = new Date()

    const targetRef = adminDb.collection("centers").doc(centerId)
    const targetSnap = await targetRef.get()

    // If this center only exists in legacy, seed a minimal /centers doc so it shows up everywhere.
    if (!targetSnap.exists) {
      const legacySnap = await adminDb.collection("padel_centers").doc(centerId).get()
      if (legacySnap.exists) {
        const legacy = legacySnap.data() as any
        await targetRef.set(
          {
            name: legacy?.name ?? "",
            email: legacy?.email ?? "",
            phone: legacy?.phone ?? "",
            address: legacy?.address ?? "",
            city: legacy?.city ?? "",
            country: legacy?.country ?? "",
            coverImageUrl: legacy?.imageUrl ?? null,
            galleryImageUrls: legacy?.imageUrl ? [legacy.imageUrl] : [],
            published: false,
            featuredRank: null,
            createdAt: legacy?.createdAt ?? new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }
    }

    await targetRef.set(patch, { merge: true })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    // Delete from centers collection
    const centerRef = adminDb.collection("centers").doc(centerId)
    const centerSnap = await centerRef.get()
    
    if (centerSnap.exists) {
      // Delete subcollections first
      const subcollections = ["courts", "bookings", "settings", "classes", "availabilityRules"]
      for (const sub of subcollections) {
        const subSnap = await centerRef.collection(sub).get()
        const batch = adminDb.batch()
        subSnap.docs.forEach((doc) => batch.delete(doc.ref))
        if (subSnap.size > 0) await batch.commit()
      }
      await centerRef.delete()
    }

    // Delete from padel_centers (legacy) collection
    const legacyRef = adminDb.collection("padel_centers").doc(centerId)
    const legacySnap = await legacyRef.get()
    
    if (legacySnap.exists) {
      // Delete subcollections
      const legacySubcollections = ["courts", "bookings", "availability"]
      for (const sub of legacySubcollections) {
        const subSnap = await legacyRef.collection(sub).get()
        const batch = adminDb.batch()
        subSnap.docs.forEach((doc) => batch.delete(doc.ref))
        if (subSnap.size > 0) await batch.commit()
      }
      await legacyRef.delete()
    }

    // Delete user document
    const userRef = adminDb.collection("users").doc(centerId)
    const userSnap = await userRef.get()
    if (userSnap.exists) {
      await userRef.delete()
    }

    // Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(centerId)
    } catch (authError: any) {
      // Ignore if user doesn't exist in Auth
      if (authError?.code !== "auth/user-not-found") {
        console.error("Failed to delete auth user:", authError)
      }
    }

    return NextResponse.json({ success: true, message: "Center deleted successfully" })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed to delete center" }, { status: 500 })
  }
}
