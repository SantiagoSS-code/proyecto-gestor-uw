import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"

const SESSION_COOKIE_NAME = "__session"

function decodeJwtPayload(token: string) {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, any>
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as null | { idToken?: string }
    const idToken = body?.idToken

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
    }

    const payload = decodeJwtPayload(idToken)

    if (process.env.NODE_ENV === "development") {
      const adminProjectId = adminAuth.app?.options?.projectId || "unknown"
      console.log(
        `[AuthSession] adminProjectId=${adminProjectId} token.aud=${payload?.aud || "unknown"} token.uid=${payload?.sub || ""} token.email=${payload?.email || ""}`
      )
    }

    // Verify first so we don't set junk tokens.
    let verificationError: any = null
    try {
      await adminAuth.verifyIdToken(idToken)
    } catch (err) {
      verificationError = err
    }

    const allowUnverifiedInDev = process.env.NODE_ENV === "development"
    if (verificationError && !allowUnverifiedInDev) {
      throw verificationError
    }
    if (verificationError && allowUnverifiedInDev) {
      console.warn(
        `[AuthSession] Skipping token verification in development: ${verificationError?.message || verificationError}`
      )
    }

    // Keep it simple for MVP: store the ID token itself.
    // (If you want long-lived sessions later, swap to createSessionCookie.)
    const res = NextResponse.json({
      ok: true,
      verified: !verificationError,
      warning: verificationError ? "Token verification skipped in development." : undefined,
    })
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: idToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return res
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Failed to create session",
        code: e?.code || e?.errorInfo?.code || null,
      },
      { status: 401 }
    )
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return res
}
