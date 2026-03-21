import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      uid?: string
      centerId?: string
    } | null

    if (!body?.uid || !body?.centerId) {
      return NextResponse.json({ error: "Missing uid or centerId" }, { status: 400 })
    }

    const { uid, centerId } = body

    // Delete Firestore team entry
    await adminDb.doc(`centers/${centerId}/team/${uid}`).delete()

    // Delete users/{uid}
    await adminDb.doc(`users/${uid}`).delete().catch(() => null)

    // Delete Firebase Auth user
    await adminAuth.deleteUser(uid).catch((err: any) => {
      // User might not exist if it was created without auth
      if (err?.code !== "auth/user-not-found") throw err
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[team/delete-member] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
