import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { leadStatusSchema } from "@/lib/demo-request"

export const runtime = "nodejs"

function isAuthorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) return true

  const fromHeader = request.headers.get("x-admin-token")
  const fromQuery = request.nextUrl.searchParams.get("token")
  return fromHeader === expected || fromQuery === expected
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const formData = await request.formData()
  const statusRaw = formData.get("status")

  const parsed = leadStatusSchema.safeParse(statusRaw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 })
  }

  await adminDb.collection("demo_requests").doc(id).update({
    status: parsed.data,
    updatedAt: new Date(),
  })

  const redirectUrl = new URL(`/admin/leads/${id}`, request.url)
  const token = request.nextUrl.searchParams.get("token")
  if (token) {
    redirectUrl.searchParams.set("token", token)
  }

  return NextResponse.redirect(redirectUrl, { status: 303 })
}
