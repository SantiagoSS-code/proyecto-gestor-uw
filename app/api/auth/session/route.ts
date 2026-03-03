import { NextResponse } from "next/server"

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
      console.log(
        `[AuthSession] token.uid=${payload?.sub || ""} token.email=${payload?.email || ""}`
      )
    }

    // Verify first so we don't set junk tokens.
    let verificationError: any = null
    
    // Skip verification in development if admin credentials not available
    if (process.env.NODE_ENV !== "development") {
      try {
        const { adminAuth } = await import("@/lib/firebase/admin")
        await adminAuth.verifyIdToken(idToken)
      } catch (err) {
        verificationError = err
      }
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

    if (process.env.NODE_ENV === "development") {
      console.log("[AuthSession] Token verification passed or skipped in development")
    }

    // Keep it simple for MVP: store the ID token itself.
    // (If you want long-lived sessions later, swap to createSessionCookie.)
    const res = NextResponse.json({
      ok: true,
      verified: !verificationError,
      warning: verificationError ? "Token verification skipped in development." : undefined,
    })
    
    // Set the session cookie
    const cookieOptions = {
      name: SESSION_COOKIE_NAME,
      value: idToken,
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
    
    res.cookies.set(cookieOptions)
    
    if (process.env.NODE_ENV === "development") {
      console.log("[AuthSession] Cookie set with options:", {
        ...cookieOptions,
        value: "[REDACTED]",
      })
    }
    
    return res
  } catch (e: any) {
    console.error("[AuthSession] Error:", e?.message || e)
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
