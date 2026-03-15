import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { slugify } from "@/lib/utils"

type RegisterPayload = {
  token?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

async function findValidLinkByToken(token: string) {
  const tokenHash = hashToken(token)
  const snap = await adminDb
    .collection("clubos_registration_links")
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get()

  if (snap.empty) {
    return { ok: false as const, status: 404, error: "Link inválido o inexistente" }
  }

  const linkDoc = snap.docs[0]
  const data = linkDoc.data() as any
  const now = Date.now()
  const expiresAtMs = data?.expiresAt?.toDate?.()?.getTime?.() || 0

  if (data?.usedAt) {
    return { ok: false as const, status: 410, error: "Este link ya fue utilizado" }
  }

  if (!expiresAtMs || expiresAtMs < now) {
    return { ok: false as const, status: 410, error: "Este link expiró" }
  }

  return {
    ok: true as const,
    doc: linkDoc,
    data,
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = String(url.searchParams.get("token") || "").trim()
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    const lookup = await findValidLinkByToken(token)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    const centerId = String(lookup.data?.centerId || "")
    let centerName: string | null = null
    if (centerId) {
      const centerSnap = await adminDb.collection("centers").doc(centerId).get()
      centerName = centerSnap.exists ? ((centerSnap.data() as any)?.name || null) : null
    }

    return NextResponse.json({
      ok: true,
      invite: {
        centerId,
        centerName,
        email: lookup.data?.email || null,
        firstName: lookup.data?.firstName || null,
        lastName: lookup.data?.lastName || null,
        phone: lookup.data?.phone || null,
        expiresAt: lookup.data?.expiresAt?.toDate?.()?.toISOString?.() || null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as RegisterPayload | null
    const token = String(body?.token || "").trim()
    const email = normalizeEmail(String(body?.email || ""))
    const password = String(body?.password || "")
    const firstName = String(body?.firstName || "").trim()
    const lastName = String(body?.lastName || "").trim()
    const phone = String(body?.phone || "").trim()

    if (!token || !email || !password) {
      return NextResponse.json({ error: "token, email y contraseña son obligatorios" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }

    const lookup = await findValidLinkByToken(token)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    const centerId = String(lookup.data?.centerId || "").trim()

    const invitedEmail = normalizeEmail(String(lookup.data?.email || ""))
    if (invitedEmail && invitedEmail !== email) {
      return NextResponse.json({ error: "Este link está asociado a otro email" }, { status: 403 })
    }

    const effectiveFirstName = firstName || String(lookup.data?.firstName || "").trim()
    const effectiveLastName = lastName || String(lookup.data?.lastName || "").trim()
    const effectivePhone = phone || String(lookup.data?.phone || "").trim()
    const now = new Date()

    if (centerId) {
      const centerRef = adminDb.collection("centers").doc(centerId)
      const legacyCenterRef = adminDb.collection("padel_centers").doc(centerId)
      const [centerSnap, legacyCenterSnap] = await Promise.all([centerRef.get(), legacyCenterRef.get()])
      if (!centerSnap.exists && !legacyCenterSnap.exists) {
        return NextResponse.json({ error: "Club no encontrado" }, { status: 404 })
      }

      const centerData = centerSnap.exists ? (centerSnap.data() as any) : (legacyCenterSnap.data() as any)
      const centerName = String(centerData?.name || "").trim() || "Club"
      const displayName = [effectiveFirstName, effectiveLastName].filter(Boolean).join(" ") || centerName

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
            firstName: effectiveFirstName,
            lastName: effectiveLastName,
            phone: effectivePhone,
            status: "active",
            onboardingCompleted: false,
            subscriptionStatus: "pending_payment",
            updatedAt: now,
            createdAt: centerData?.createdAt || now,
          },
          { merge: true }
        ),
        adminDb.collection("center_admins").doc(centerId).set(
          {
            first_name: effectiveFirstName,
            last_name: effectiveLastName,
            email,
            phone: effectivePhone,
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
        lookup.doc.ref.set(
          {
            usedAt: now,
            usedByUid: centerId,
            usedByEmail: email,
          },
          { merge: true }
        ),
      ])

      return NextResponse.json({
        ok: true,
        centerId,
        email,
        message: "Registro completado. Ya podés iniciar sesión en ClubOS.",
      })
    }

    const baseName = [effectiveFirstName, effectiveLastName].filter(Boolean).join(" ").trim() || email.split("@")[0] || "Nuevo Club"
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
          firstName: effectiveFirstName,
          lastName: effectiveLastName,
          phone: effectivePhone,
          status: "active",
          onboardingCompleted: false,
          subscriptionStatus: "pending_payment",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
      adminDb.collection("center_admins").doc(newCenterId).set(
        {
          first_name: effectiveFirstName,
          last_name: effectiveLastName,
          email,
          phone: effectivePhone,
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
          phone: effectivePhone,
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
          phone: effectivePhone,
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
      lookup.doc.ref.set(
        {
          usedAt: now,
          usedByUid: newCenterId,
          usedByEmail: email,
        },
        { merge: true }
      ),
    ])

    return NextResponse.json({
      ok: true,
      centerId: newCenterId,
      email,
      message: "Registro completado. Ya podés iniciar sesión en ClubOS.",
    })
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Ese email ya está asociado a otro usuario" }, { status: 409 })
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
