import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    // Try subcollection first
    const favSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("favorites")
      .limit(20)
      .get()

    if (!favSnap.empty) {
      const favorites = favSnap.docs.map((d) => ({
        clubId: d.id,
        ...(d.data() as any),
      }))
      return NextResponse.json({ favorites })
    }

    // Fallback: read favoriteClubIds array from user doc
    const userSnap = await adminDb.collection("users").doc(uid).get()
    if (!userSnap.exists) return NextResponse.json({ favorites: [] })

    const userData = userSnap.data() as any
    const clubIds: string[] = userData.favoriteClubIds || []
    if (!clubIds.length) return NextResponse.json({ favorites: [] })

    const clubDocs = await Promise.all(
      clubIds.slice(0, 12).map((id) => adminDb.collection("centers").doc(id).get()),
    )

    const favorites = clubDocs
      .filter((d) => d.exists)
      .map((d) => {
        const data = d.data() as any
        return {
          clubId: d.id,
          clubName: data.name || data.clubName || "",
          city: data.city || null,
          sports: data.sports || [],
          slug: data.slug || null,
          heroImage: data.coverImageUrl || data.heroImage || data.imageUrl || null,
        }
      })

    return NextResponse.json({ favorites })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    const { clubId } = await req.json()
    if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 })

    await adminDb.collection("users").doc(uid).collection("favorites").doc(clubId).delete()

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
