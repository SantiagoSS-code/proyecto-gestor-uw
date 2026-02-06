import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function POST(request: Request, { params }: { params: { uid: string } | Promise<{ uid: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const uid = resolvedParams?.uid
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const status = body?.status
    if (status !== "active" && status !== "disabled") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const userRef = adminDb.collection("users").doc(uid)
    await userRef.set(
      {
        status,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
