import { NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { requirePlatformAdmin } from "@/lib/backoffice/server-auth"

async function sendCenterApprovalEmail(params: {
  centerId: string
  centerName: string
  adminEmail: string
  adminName: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY || !params.adminEmail) {
    console.log("[backoffice] approval email fallback (no key or email):", params)
    return
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Courtly <onboarding@resend.dev>",
        to: params.adminEmail,
        subject: `¡Tu centro ${params.centerName || ""} ya está publicado en Courtly! 🎉`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b">¡Tu centro ya está activo! 🎉</h2>
            <p style="color:#475569">Hola ${params.adminName || ""},</p>
            <p style="color:#475569">
              Revisamos la información de <strong>${params.centerName || "tu centro"}</strong>
              y ya está publicado en la plataforma de Courtly.
            </p>
            <p style="color:#475569">
              Los jugadores ya pueden encontrarte y generar reservas directamente desde la app.
            </p>
            <div style="margin:28px 0">
              <a
                href="${appUrl}/clubos/dashboard"
                style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600"
              >
                Ir al panel de gestión
              </a>
            </div>
            <p style="color:#94a3b8;font-size:13px">El equipo de Courtly</p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error("[backoffice] sendCenterApprovalEmail failed:", err)
  }
}

function isMissing(value: unknown) {
  return value === null || typeof value === "undefined" || String(value).trim() === ""
}

function hasSuspiciousText(value: unknown) {
  const text = String(value || "").trim()
  if (!text) return false

  const lowered = text.toLowerCase()
  if (/(test|asdf|qwerty|lorem ipsum|xxx)/i.test(lowered)) return true
  if (/\s{2,}/.test(text)) return true
  if (text.length >= 12 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(text)) return true
  return false
}

function buildReviewValidation(input: { center: any; courts: any[]; onboarding: any; operations: any }) {
  const { center, courts, onboarding, operations } = input
  const requiredIssues: string[] = []
  const textWarnings: string[] = []

  if (isMissing(center?.name)) requiredIssues.push("Falta nombre del club")
  if (isMissing(center?.email)) requiredIssues.push("Falta email del club")
  if (isMissing(center?.phone)) requiredIssues.push("Falta teléfono del club")
  if (isMissing(center?.slug)) requiredIssues.push("Falta slug público")
  if (isMissing(center?.description)) requiredIssues.push("Falta descripción del club")
  if (isMissing(center?.street) && isMissing(center?.address)) requiredIssues.push("Falta calle/dirección")
  if (isMissing(center?.city)) requiredIssues.push("Falta ciudad")
  if (isMissing(center?.country) && isMissing(center?.province)) requiredIssues.push("Falta país/provincia")
  if (!Array.isArray(center?.amenities) || center.amenities.length === 0) {
    requiredIssues.push("No hay amenities seleccionados")
  }
  if (!Array.isArray(center?.sports) || center.sports.length === 0) {
    requiredIssues.push("No hay deportes seleccionados")
  }
  if (isMissing(center?.coverImageUrl) && (!Array.isArray(center?.galleryImageUrls) || center.galleryImageUrls.length === 0)) {
    requiredIssues.push("Falta imagen principal o galería")
  }
  if (!Array.isArray(courts) || courts.length === 0) {
    requiredIssues.push("No hay canchas cargadas")
  } else {
    const unpublished = courts.filter((c) => c?.published !== true).length
    if (unpublished > 0) requiredIssues.push(`Hay ${unpublished} cancha(s) sin publicar`)
  }

  if (Array.isArray(courts)) {
    for (const court of courts) {
      if (isMissing(court?.name)) requiredIssues.push("Hay canchas sin nombre")
      if (isMissing(court?.sport)) requiredIssues.push("Hay canchas sin deporte")
    }
  }

  const textCandidates: Array<{ label: string; value: unknown }> = [
    { label: "Nombre del club", value: center?.name },
    { label: "Descripción", value: center?.description },
    { label: "Dirección", value: center?.address },
    { label: "Calle", value: center?.street },
    { label: "Ciudad", value: center?.city },
  ]

  for (const candidate of textCandidates) {
    if (candidate.value && hasSuspiciousText(candidate.value)) {
      textWarnings.push(`Revisar posible typo en: ${candidate.label}`)
    }
  }

  const onboardingComplete = onboarding?.onboardingComplete === true
  const operationsConfigured = operations && Object.keys(operations).length > 0

  return {
    requiredIssues,
    textWarnings,
    checklist: {
      profileStepComplete: onboarding?.completed?.profile === true,
      centerStepComplete: onboarding?.completed?.center === true,
      operationsStepComplete: onboarding?.completed?.operations === true,
      courtsStepComplete: onboarding?.completed?.courts === true,
      publishStepComplete: onboarding?.completed?.publish === true,
      onboardingComplete,
      operationsConfigured,
      centerPublished: center?.published === true,
      publicationReady: center?.publicationReady === true,
    },
    isReady: requiredIssues.length === 0,
  }
}

export async function GET(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    const centerRef = adminDb.collection("centers").doc(centerId)
    const snap = await centerRef.get()

    const legacyRef = adminDb.collection("padel_centers").doc(centerId)
    const legacySnap = snap.exists ? null : await legacyRef.get()
    if (!snap.exists && !legacySnap?.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const source = snap.exists ? "centers" : "padel_centers"
    const effectiveRef = snap.exists ? centerRef : legacyRef
    const effectiveSnap = snap.exists ? snap : (legacySnap as any)

    const [centersCourtsSnap, legacyCourtsSnap, onboardingSnap, operationsSnap, bookingSnap, userSnap, centerAdminSnap] = await Promise.all([
      centerRef.collection("courts").get(),
      legacyRef.collection("courts").get(),
      adminDb.collection("centers").doc(centerId).collection("settings").doc("onboarding").get(),
      adminDb.collection("centers").doc(centerId).collection("settings").doc("operations").get(),
      adminDb.collection("centers").doc(centerId).collection("settings").doc("booking").get(),
      adminDb.collection("users").doc(centerId).get(),
      adminDb.collection("center_admins").doc(centerId).get(),
    ])

    let bookingsCount = 0
    try {
      const bookingsSnap = await effectiveRef.collection("bookings").limit(100).get()
      bookingsCount = bookingsSnap.size
    } catch {
      // ignore
    }

    const data = {
      ...((legacySnap?.exists ? legacySnap.data() : {}) as any),
      ...((effectiveSnap.data() || {}) as any),
    }

    const mergedCourts = new Map<string, any>()
    legacyCourtsSnap.docs.forEach((courtDoc) => {
      mergedCourts.set(courtDoc.id, { id: courtDoc.id, ...(courtDoc.data() as any), source: "padel_centers" })
    })
    centersCourtsSnap.docs.forEach((courtDoc) => {
      mergedCourts.set(courtDoc.id, { id: courtDoc.id, ...(courtDoc.data() as any), source: "centers" })
    })

    const courts = Array.from(mergedCourts.values()).map((c: any) => ({
      id: c?.id,
      name: c?.name || "",
      sport: c?.sport || null,
      indoor: typeof c?.indoor === "boolean" ? c.indoor : null,
      surfaceType: c?.surfaceType || null,
      pricePerHour: typeof c?.pricePerHour === "number" ? c.pricePerHour : null,
      currency: c?.currency || null,
      published: c?.published === true,
      source: c?.source || null,
    }))

    const onboarding = onboardingSnap.exists ? (onboardingSnap.data() as any) : null
    const operations = operationsSnap.exists ? (operationsSnap.data() as any) : null
    const booking = bookingSnap.exists ? (bookingSnap.data() as any) : null
    const user = userSnap.exists ? (userSnap.data() as any) : null
    const centerAdmin = centerAdminSnap.exists ? (centerAdminSnap.data() as any) : null

    const validation = buildReviewValidation({ center: data || {}, courts, onboarding, operations })

    return NextResponse.json({
      center: { centerId: effectiveSnap.id, source, ...(data || {}) },
      courtsCount: courts.length,
      bookingsCount,
      courts,
      admin: {
        firstName: centerAdmin?.first_name || user?.firstName || user?.first_name || "",
        lastName: centerAdmin?.last_name || user?.lastName || user?.last_name || "",
        email: centerAdmin?.email || user?.email || "",
        phone: centerAdmin?.phone || user?.phone || "",
      },
      onboarding,
      operations,
      booking,
      reviewValidation: validation,
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, any> = {}
    let handledCustomUpdate = false

    if (typeof body.published === "boolean") {
      patch.published = body.published
      if (body.published === true) {
        patch.reviewStatus = "approved"
        patch.approvedAt = new Date()
      }
    }

    if (typeof body.status === "string") {
      if (!["active", "suspended"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      patch.status = body.status
    }

    if (body.featuredRank === null || typeof body.featuredRank === "number") {
      patch.featuredRank = body.featuredRank
    }

    const targetRef = adminDb.collection("centers").doc(centerId)
    const targetSnap = await targetRef.get()

    // If this center only exists in legacy, seed a minimal /centers doc so it shows up everywhere.
    if (!targetSnap.exists) {
      const legacySnap = await adminDb.collection("padel_centers").doc(centerId).get()
      if (legacySnap.exists) {
        const legacy = legacySnap.data() as any
        await targetRef.set(
          {
            name: legacy?.name ?? "",
            email: legacy?.email ?? "",
            phone: legacy?.phone ?? "",
            address: legacy?.address ?? "",
            city: legacy?.city ?? "",
            country: legacy?.country ?? "",
            coverImageUrl: legacy?.imageUrl ?? null,
            galleryImageUrls: legacy?.imageUrl ? [legacy.imageUrl] : [],
            published: false,
            featuredRank: null,
            createdAt: legacy?.createdAt ?? new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }
    }

    if (body?.account && typeof body.account === "object") {
      handledCustomUpdate = true
      const account = body.account as any
      const email = typeof account.email === "string" ? account.email.trim().toLowerCase() : undefined
      const firstName = typeof account.firstName === "string" ? account.firstName.trim() : undefined
      const lastName = typeof account.lastName === "string" ? account.lastName.trim() : undefined
      const phone = typeof account.phone === "string" ? account.phone.trim() : undefined

      const userPatch: Record<string, any> = { updatedAt: new Date() }
      const adminPatch: Record<string, any> = { updatedAt: new Date() }
      const centerPatch: Record<string, any> = { updatedAt: new Date() }

      if (typeof email !== "undefined") {
        userPatch.email = email
        adminPatch.email = email
        centerPatch.email = email
      }
      if (typeof firstName !== "undefined") {
        userPatch.firstName = firstName
        adminPatch.first_name = firstName
      }
      if (typeof lastName !== "undefined") {
        userPatch.lastName = lastName
        adminPatch.last_name = lastName
      }
      if (typeof phone !== "undefined") {
        userPatch.phone = phone
        adminPatch.phone = phone
      }

      await Promise.all([
        adminDb.collection("users").doc(centerId).set(userPatch, { merge: true }),
        adminDb.collection("center_admins").doc(centerId).set(adminPatch, { merge: true }),
        targetRef.set(centerPatch, { merge: true }),
      ])
    }

    if (body?.centerProfile && typeof body.centerProfile === "object") {
      handledCustomUpdate = true
      const c = body.centerProfile as any
      const allowed = [
        "name",
        "email",
        "phone",
        "slug",
        "description",
        "address",
        "street",
        "streetNumber",
        "city",
        "province",
        "country",
        "postalCode",
      ]
      const centerPatch: Record<string, any> = { updatedAt: new Date() }
      for (const key of allowed) {
        if (typeof c[key] === "string") centerPatch[key] = c[key].trim()
      }
      await targetRef.set(centerPatch, { merge: true })
    }

    if (body?.operations && typeof body.operations === "object") {
      handledCustomUpdate = true
      await targetRef.collection("settings").doc("operations").set(
        {
          ...(body.operations as Record<string, any>),
          updatedAt: new Date(),
        },
        { merge: true }
      )
    }

    if (body?.booking && typeof body.booking === "object") {
      handledCustomUpdate = true
      await targetRef.collection("settings").doc("booking").set(
        {
          ...(body.booking as Record<string, any>),
          updatedAt: new Date(),
        },
        { merge: true }
      )
    }

    if (body?.courtUpdate && typeof body.courtUpdate === "object") {
      handledCustomUpdate = true
      const courtUpdate = body.courtUpdate as any
      const courtId = typeof courtUpdate.courtId === "string" ? courtUpdate.courtId.trim() : ""
      const courtPatchInput = courtUpdate.patch && typeof courtUpdate.patch === "object" ? courtUpdate.patch : null
      if (!courtId || !courtPatchInput) {
        return NextResponse.json({ error: "Invalid courtUpdate payload" }, { status: 400 })
      }

      const allowedCourtFields = ["name", "sport", "surfaceType", "currency", "pricePerHour", "published", "indoor"]
      const courtPatch: Record<string, any> = { updatedAt: new Date() }

      for (const key of allowedCourtFields) {
        if (typeof courtPatchInput[key] === "undefined") continue
        if (["name", "sport", "surfaceType", "currency"].includes(key) && typeof courtPatchInput[key] === "string") {
          courtPatch[key] = String(courtPatchInput[key]).trim()
        } else if (key === "pricePerHour") {
          const n = Number(courtPatchInput[key])
          if (!Number.isNaN(n)) courtPatch[key] = n
        } else if (["published", "indoor"].includes(key)) {
          courtPatch[key] = Boolean(courtPatchInput[key])
        }
      }

      const legacyCourtRef = adminDb.collection("padel_centers").doc(centerId).collection("courts").doc(courtId)
      const [centerCourtSnap, legacyCourtSnap] = await Promise.all([
        targetRef.collection("courts").doc(courtId).get(),
        legacyCourtRef.get(),
      ])

      const targetCourtRef = centerCourtSnap.exists ? targetRef.collection("courts").doc(courtId) : legacyCourtSnap.exists ? legacyCourtRef : targetRef.collection("courts").doc(courtId)
      await targetCourtRef.set(courtPatch, { merge: true })
    }

    if (Object.keys(patch).length === 0 && !handledCustomUpdate) {
      return NextResponse.json({ error: "No changes" }, { status: 400 })
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date()
      await targetRef.set(patch, { merge: true })

      // If we just approved the center (published: true), send the admin an email
      if (patch.published === true) {
        try {
          const [centerSnap2, userSnap2, adminSnap2] = await Promise.all([
            targetRef.get(),
            adminDb.collection("users").doc(centerId).get(),
            adminDb.collection("center_admins").doc(centerId).get(),
          ])
          const cd = (centerSnap2.data() as any) || {}
          const ud = (userSnap2.data() as any) || {}
          const ad = (adminSnap2.data() as any) || {}

          const adminEmail = ad.email || ud.email || cd.email || ""
          const adminName = [
            ad.first_name || ud.firstName || ud.first_name || "",
            ad.last_name || ud.lastName || ud.last_name || "",
          ]
            .filter(Boolean)
            .join(" ")

          await sendCenterApprovalEmail({
            centerId,
            centerName: cd.name || centerId,
            adminEmail,
            adminName,
          })
        } catch (emailErr) {
          console.error("[backoffice] approval email failed (non-blocking):", emailErr)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { centerId: string } | Promise<{ centerId: string }> }) {
  try {
    await requirePlatformAdmin(request)

    const resolvedParams = await params
    const centerId = resolvedParams?.centerId
    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    // Delete from centers collection
    const centerRef = adminDb.collection("centers").doc(centerId)
    const centerSnap = await centerRef.get()
    
    if (centerSnap.exists) {
      // Delete subcollections first
      const subcollections = ["courts", "bookings", "settings", "classes", "availabilityRules"]
      for (const sub of subcollections) {
        const subSnap = await centerRef.collection(sub).get()
        const batch = adminDb.batch()
        subSnap.docs.forEach((doc) => batch.delete(doc.ref))
        if (subSnap.size > 0) await batch.commit()
      }
      await centerRef.delete()
    }

    // Delete from padel_centers (legacy) collection
    const legacyRef = adminDb.collection("padel_centers").doc(centerId)
    const legacySnap = await legacyRef.get()
    
    if (legacySnap.exists) {
      // Delete subcollections
      const legacySubcollections = ["courts", "bookings", "availability"]
      for (const sub of legacySubcollections) {
        const subSnap = await legacyRef.collection(sub).get()
        const batch = adminDb.batch()
        subSnap.docs.forEach((doc) => batch.delete(doc.ref))
        if (subSnap.size > 0) await batch.commit()
      }
      await legacyRef.delete()
    }

    // Delete user document
    const userRef = adminDb.collection("users").doc(centerId)
    const userSnap = await userRef.get()
    if (userSnap.exists) {
      await userRef.delete()
    }

    // Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(centerId)
    } catch (authError: any) {
      // Ignore if user doesn't exist in Auth
      if (authError?.code !== "auth/user-not-found") {
        console.error("Failed to delete auth user:", authError)
      }
    }

    return NextResponse.json({ success: true, message: "Center deleted successfully" })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || "Failed to delete center" }, { status: 500 })
  }
}
