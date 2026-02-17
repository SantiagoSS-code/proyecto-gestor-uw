import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function POST(request: Request, { params }: { params: { uid: string } | Promise<{ uid: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const uid = resolvedParams?.uid
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    await Promise.allSettled([
      adminDb.collection("users").doc(uid).delete(),
      adminDb.collection("players").doc(uid).delete(),
      adminAuth.deleteUser(uid),
    ])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
