import { NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { slugify } from "@/lib/utils"

type Role = "platform_admin" | "center_admin" | "player"

function isDevRequest() {
  return process.env.NODE_ENV === "development" || process.env.USE_FIREBASE_EMULATOR === "true"
}

function requireToken(request: Request) {
  const required = process.env.DEV_BOOTSTRAP_TOKEN

  // Convenience for local dev: allow requests when emulators are enabled,
  // even if DEV_BOOTSTRAP_TOKEN wasn't set yet.
  if (!required) {
    const emulatorsEnabled = process.env.USE_FIREBASE_EMULATOR === "true"
    const isDev = process.env.NODE_ENV === "development"
    if (isDev && emulatorsEnabled) return { ok: true as const }
    return { ok: false as const, error: "DEV_BOOTSTRAP_TOKEN is not set" }
  }

  const got = request.headers.get("x-dev-bootstrap-token")
  if (!got || got !== required) {
    return { ok: false as const, error: "Invalid token" }
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  if (!isDevRequest()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const tokenCheck = requireToken(request)
  if (!tokenCheck.ok) {
    return NextResponse.json({ error: tokenCheck.error }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        email: string
        password: string
        role: Role
        centerName?: string
      }
    | null

  if (!body?.email || !body?.password || !body?.role) {
    return NextResponse.json({ error: "Missing email/password/role" }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  const password = body.password
  const role = body.role

  let user
  try {
    user = await adminAuth.getUserByEmail(email)
  } catch {
    user = await adminAuth.createUser({ email, password, emailVerified: true })
  }

  const now = new Date()

  if (role === "platform_admin") {
    await adminAuth.setCustomUserClaims(user.uid, { platform_admin: true })
    await adminDb.doc(`users/${user.uid}`).set(
      {
        role: "platform_admin",
        email,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    )
  }

  if (role === "center_admin") {
    const centerName = body.centerName?.trim() || email.split("@")[0] || "New Center"
    const slugBase = slugify(centerName)
    const slug = slugBase ? `${slugBase}-${user.uid.slice(0, 6)}` : `club-${user.uid.slice(0, 6)}`

    await adminDb.doc(`users/${user.uid}`).set(
      {
        role: "center_admin",
        legacyRole: "padel_center_admin",
        email,
        centerId: user.uid,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    )

    await adminDb.doc(`centers/${user.uid}`).set(
      {
        name: centerName,
        email,
        slug,
        published: false,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    )

    await adminDb.doc(`padel_centers/${user.uid}`).set(
      {
        name: centerName,
        email,
        createdAt: now,
        plan: "starter",
        status: "active",
        onboardingCompleted: false,
      },
      { merge: true }
    )
  }

  if (role === "player") {
    await adminDb.doc(`users/${user.uid}`).set(
      {
        role: "player",
        email,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    )
  }

  return NextResponse.json({ ok: true, uid: user.uid, email, role })
}
