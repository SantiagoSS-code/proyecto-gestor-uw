import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const url = new URL(request.url)
    const q = (url.searchParams.get("q") || "").trim().toLowerCase()

    const snap = await adminDb.collection("users").where("role", "==", "player").limit(200).get()
    const items = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }))

    const filtered = q
      ? items.filter((u) => {
          const email = String(u.email || "").toLowerCase()
          const name = String(u.name || u.displayName || "").toLowerCase()
          return email.includes(q) || name.includes(q) || String(u.uid).includes(q)
        })
      : items

    return NextResponse.json({ items: filtered })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
