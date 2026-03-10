import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"
import { slugify } from "@/lib/utils"

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request)

    const [usersSnap, centerAdminsSnap] = await Promise.all([
      adminDb.collection("users").where("role", "==", "center_admin").get(),
      adminDb.collection("center_admins").get(),
    ])

    const merged = new Map<string, any>()

    for (const doc of usersSnap.docs) {
      const d = doc.data() as any
      const centerId = String(d.centerId || doc.id)
      merged.set(centerId, {
        uid: doc.id,
        email: d.email || null,
        firstName: d.firstName || null,
        lastName: d.lastName || null,
        phone: d.phone || null,
        centerId,
        centerName: null,
        status: d.status || null,
        onboardingCompleted: d.onboardingCompleted ?? null,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      })
    }

    for (const doc of centerAdminsSnap.docs) {
      const d = doc.data() as any
      const centerId = String(d.centerId || doc.id)
      const prev = merged.get(centerId)
      merged.set(centerId, {
        uid: prev?.uid || doc.id,
        email: prev?.email || d.email || null,
        firstName: prev?.firstName || d.first_name || null,
        lastName: prev?.lastName || d.last_name || null,
        phone: prev?.phone || d.phone || null,
        centerId,
        centerName: null,
        status: prev?.status || "active",
        onboardingCompleted: prev?.onboardingCompleted ?? null,
        createdAt: prev?.createdAt || d.createdAt?.toDate?.()?.toISOString() || null,
      })
    }

    const users = Array.from(merged.values())

    const centerRefs = users.map((u) => adminDb.collection("centers").doc(u.centerId))
    const centerSnaps = centerRefs.length ? await adminDb.getAll(...centerRefs) : []
    const centerNameById = new Map<string, string | null>()
    for (const centerSnap of centerSnaps) {
      centerNameById.set(centerSnap.id, centerSnap.exists ? ((centerSnap.data() as any)?.name || null) : null)
    }

    for (const user of users) {
      user.centerName = centerNameById.get(user.centerId) || null
    }

    users.sort((a, b) => {
      const aTs = a.createdAt ? Date.parse(a.createdAt) : 0
      const bTs = b.createdAt ? Date.parse(b.createdAt) : 0
      return bTs - aTs
    })

    return NextResponse.json({ users })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

type CreateCenterAdminPayload = {
  centerId?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export async function POST(
  request: Request
) {
  try {
    await requirePlatformAdmin(request)

    const body = (await request.json().catch(() => null)) as CreateCenterAdminPayload | null

    const centerId = String(body?.centerId || "").trim()
    const email = normalizeEmail(String(body?.email || ""))
    const password = String(body?.password || "")
    const firstName = String(body?.firstName || "").trim()
    const lastName = String(body?.lastName || "").trim()
    const phone = String(body?.phone || "").trim()

    if (!email || !password) {
      return NextResponse.json(
        { error: "email y password son obligatorios" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    const now = new Date()
    if (centerId) {
      const centerRef = adminDb.collection("centers").doc(centerId)
      const legacyCenterRef = adminDb.collection("padel_centers").doc(centerId)

      const [centerSnap, legacyCenterSnap] = await Promise.all([centerRef.get(), legacyCenterRef.get()])

      if (!centerSnap.exists && !legacyCenterSnap.exists) {
        return NextResponse.json({ error: "Centro no encontrado" }, { status: 404 })
      }

      const centerData = centerSnap.exists ? (centerSnap.data() as any) : (legacyCenterSnap.data() as any)
      const centerName = String(centerData?.name || "").trim() || "Club"
      const code = centerId.slice(0, 6).toLowerCase()
      const safeSlug = `${slugify(centerName) || "club"}-${code}`
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || centerName

      try {
        await adminAuth.getUser(centerId)
        await adminAuth.updateUser(centerId, {
          email,
          password,
          emailVerified: true,
          displayName,
        })
      } catch (e: any) {
        if (e?.code === "auth/user-not-found") {
          await adminAuth.createUser({
            uid: centerId,
            email,
            password,
            emailVerified: true,
            displayName,
          })
        } else {
          throw e
        }
      }

      await Promise.all([
        adminDb.collection("users").doc(centerId).set(
          {
            role: "center_admin",
            legacyRole: "padel_center_admin",
            centerId,
            email,
            firstName,
            lastName,
            phone,
            status: "active",
            updatedAt: now,
          },
          { merge: true }
        ),
        adminDb.collection("center_admins").doc(centerId).set(
          {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            centerId,
            updatedAt: now,
            createdAt: now,
          },
          { merge: true }
        ),
        centerRef.set(
          {
            name: centerData?.name || centerName,
            email,
            slug: centerData?.slug || safeSlug,
            updatedAt: now,
            createdAt: centerData?.createdAt || now,
          },
          { merge: true }
        ),
        legacyCenterRef.set(
          {
            name: centerData?.name || centerName,
            email,
            updatedAt: now,
            createdAt: centerData?.createdAt || now,
          },
          { merge: true }
        ),
      ])

      return NextResponse.json({
        ok: true,
        centerId,
        email,
        associatedToExistingClub: true,
        message: "Usuario creado/actualizado para el club seleccionado",
      })
    }

    const baseName = [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0] || "Nuevo Club"
    const createdUser = await adminAuth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: baseName,
    })

    const newCenterId = createdUser.uid
    const code = newCenterId.slice(0, 6).toLowerCase()
    const centerName = String(baseName || "Nuevo Club").trim() || "Nuevo Club"
    const safeSlug = `${slugify(centerName) || "club"}-${code}`

    await Promise.all([
      adminDb.collection("users").doc(newCenterId).set(
        {
          role: "center_admin",
          legacyRole: "padel_center_admin",
          centerId: newCenterId,
          email,
          firstName,
          lastName,
          phone,
          status: "active",
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
      adminDb.collection("center_admins").doc(newCenterId).set(
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          centerId: newCenterId,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
      adminDb.collection("centers").doc(newCenterId).set(
        {
          name: centerName,
          email,
          phone,
          slug: safeSlug,
          published: false,
          publicationReady: false,
          reviewStatus: "draft",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
      adminDb.collection("padel_centers").doc(newCenterId).set(
        {
          name: centerName,
          email,
          phone,
          plan: "free",
          status: "active",
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
      adminDb.collection("centers").doc(newCenterId).collection("settings").doc("booking").set(
        {
          timezone: "America/Argentina/Buenos_Aires",
          slotDurationMinutes: 60,
          openingHours: {},
          updatedAt: now,
        },
        { merge: true }
      ),
    ])

    return NextResponse.json({
      ok: true,
      centerId: newCenterId,
      email,
      associatedToExistingClub: false,
      message: "Usuario creado sin club asociado. Iniciará onboarding al loguearse.",
    })
  } catch (e: any) {
    if (e instanceof Response) return e

    if (e?.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Ese email ya está asociado a otro usuario" },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
