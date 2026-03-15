import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    // Read both collections in parallel
    const [userSnap, playerSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("players").doc(uid).get(),
    ])

    const u = userSnap.exists ? (userSnap.data() as any) : {}
    const p = playerSnap.exists ? (playerSnap.data() as any) : {}

    // Build profile merging both sources
    const firstName =
      u.firstName ||
      (u.displayName || decoded.name || "").split(" ")[0] ||
      p.name?.split(" ")[0] ||
      null

    const lastName =
      u.lastName ||
      (u.displayName || decoded.name || "").split(" ").slice(1).join(" ") ||
      null

    return NextResponse.json({
      profile: {
        firstName,
        lastName,
        email: u.email || decoded.email || p.email || null,
        phone: u.phone || p.phone || null,
        avatarUrl: u.avatarUrl || u.photoURL || decoded.picture || null,
        city: u.city || p.city || null,
        favoriteClubId: u.favoriteClubId || null,
        favoriteClubName: u.favoriteClubName || null,
        sports: p.sports || u.sports || [],
        ageRange: p.ageRange || null,
      },
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
