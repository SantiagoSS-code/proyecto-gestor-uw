import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import type { RoleId, TeamMember } from "@/lib/permissions"
import { hasFeature } from "@/lib/permissions"
import { getCenterPlan } from "@/lib/firebase/get-center-plan"
import { PLAN_FEATURES } from "@/lib/plans"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string
      email?: string
      password?: string
      role?: RoleId
      centerId?: string
    } | null

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { name, email, password, role, centerId } = body

    if (!name || !email || !password || !role || !centerId) {
      return NextResponse.json({ error: "Missing required fields: name, email, password, role, centerId" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
    }

    // ── Feature gate: multi_user ──────────────────────────────────
    const centerPlan = await getCenterPlan(centerId)

    if (!hasFeature(centerPlan, "multi_user")) {
      return NextResponse.json(
        {
          error:
            "Tu plan actual no permite agregar múltiples usuarios. Mejorá tu plan para desbloquear esta función.",
          code: "PLAN_FEATURE_LOCKED",
          requiredFeature: "multi_user",
        },
        { status: 403 },
      )
    }

    // ── Limit: max team members ───────────────────────────────────
    const planDef = PLAN_FEATURES[centerPlan]
    if (planDef.limits.maxTeamMembers !== -1) {
      const teamSnap = await adminDb
        .collection(`centers/${centerId}/team`)
        .where("status", "==", "active")
        .get()
      if (teamSnap.size >= planDef.limits.maxTeamMembers) {
        return NextResponse.json(
          {
            error: `Tu plan (${planDef.label}) permite hasta ${planDef.limits.maxTeamMembers} miembros activos. Mejorá tu plan para agregar más.`,
            code: "PLAN_LIMIT_REACHED",
          },
          { status: 403 },
        )
      }
    }

    // Create Firebase Auth user (or reuse if already exists)
    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email: email.toLowerCase().trim(),
        password,
        displayName: name.trim(),
      })
    } catch (err: any) {
      if (err?.code === "auth/email-already-exists") {
        // Auth user was already created (e.g. previous attempt failed mid-way).
        // Reuse the existing uid, update password and display name, then continue writing Firestore docs.
        userRecord = await adminAuth.getUserByEmail(email.toLowerCase().trim())
        await adminAuth.updateUser(userRecord.uid, {
          password,
          displayName: name.trim(),
        })
      } else {
        throw err
      }
    }

    const uid = userRecord.uid
    const now = new Date().toISOString()

    // Create users/{uid} so auth-context resolves the correct centerId
    await adminDb.doc(`users/${uid}`).set({
      uid,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      centerId,
      role,
      isTeamMember: true,
      createdAt: now,
    })

    // Create centers/{centerId}/team/{uid} with full member record
    const member: TeamMember = {
      id: uid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
      status: "active",
      createdAt: now,
    }
    await adminDb.doc(`centers/${centerId}/team/${uid}`).set(member)

    return NextResponse.json({ ok: true, member })
  } catch (err: any) {
    console.error("[team/create-member] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
