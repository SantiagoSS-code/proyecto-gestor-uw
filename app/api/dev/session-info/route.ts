import { NextResponse } from "next/server"

import { cookies } from "next/headers"

import { adminAuth, adminDb } from "@/lib/firebase/admin"

const SESSION_COOKIE_NAME = "__session"

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    return null
  }
}

export async function GET() {
  const isDev = process.env.NODE_ENV === "development" || process.env.USE_FIREBASE_EMULATOR === "false"
  if (!isDev) return NextResponse.json({ error: "Not available" }, { status: 404 })

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value || null
  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (!token) {
    return NextResponse.json({
      ok: true,
      hasCookie: false,
      usingEmulators: process.env.USE_FIREBASE_EMULATOR === "true",
      allowlist,
    })
  }

  const jwtPayload = decodeJwtPayload(token)

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const email = String(decoded.email || "").toLowerCase()
    const userSnap = await adminDb.doc(`users/${decoded.uid}`).get()
    const role = userSnap.exists ? (userSnap.data() as any)?.role ?? null : null

    return NextResponse.json({
      ok: true,
      hasCookie: true,
      jwtPayload,
      decoded: {
        uid: decoded.uid,
        email,
      },
      role,
      allowlist,
      allowlisted: !!email && allowlist.includes(email),
      usingEmulators: process.env.USE_FIREBASE_EMULATOR === "true",
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      hasCookie: true,
      jwtPayload,
      error: e?.message || "Failed to verify cookie token",
      usingEmulators: process.env.USE_FIREBASE_EMULATOR === "true",
      allowlist,
    })
  }
}
