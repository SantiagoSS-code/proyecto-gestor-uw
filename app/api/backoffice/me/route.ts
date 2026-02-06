import { NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

export async function GET(request: Request) {
  const { uid, email } = await requirePlatformAdmin(request)
  return NextResponse.json({ ok: true, uid, email, role: "platform_admin" })
}
