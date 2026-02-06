import { backofficeAdminAuth, backofficeAdminDb } from "@/lib/firebaseBackofficeAdmin"

export type BackofficeActor = {
  uid: string
  email?: string
}

const isDev = process.env.NODE_ENV === "development"

function parseBearerToken(headerValue: string | null) {
  if (!headerValue) return null
  const [scheme, token] = headerValue.split(" ")
  if (scheme?.toLowerCase() !== "bearer") return null
  return token || null
}

function getAdminAllowlist() {
  const raw = process.env.BACKOFFICE_PLATFORM_ADMIN_EMAILS || ""
  const allowlist = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
  return { allowlist, raw }
}

export async function requirePlatformAdmin(request: Request): Promise<BackofficeActor> {
  const token = parseBearerToken(request.headers.get("authorization"))
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  let decoded: { uid: string; email?: string }
  try {
    decoded = await backofficeAdminAuth.verifyIdToken(token)
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const userRef = backofficeAdminDb.collection("users").doc(decoded.uid)
  let snap: FirebaseFirestore.DocumentSnapshot | null = null

  const { allowlist, raw } = getAdminAllowlist()
  const emailLower = (decoded.email || "").toLowerCase()

  if (isDev) {
    const projectId = backofficeAdminAuth.app?.options?.projectId || "unknown"
    console.log(
      `[BackofficeAuth] user.email=${decoded.email || ""} uid=${decoded.uid} projectId=${projectId} allowlist=${raw || ""}`
    )
  }

  if (!raw || allowlist.size === 0) {
    throw new Response(
      JSON.stringify({
        error:
          "BACKOFFICE_PLATFORM_ADMIN_EMAILS is not set. Add it to .env.local (e.g. BACKOFFICE_PLATFORM_ADMIN_EMAILS=admin@example.com,other@example.com).",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const isAllowlisted = !!emailLower && allowlist.has(emailLower)

  try {
    snap = await userRef.get()
  } catch (error: any) {
    if (isDev) {
      console.warn(`[BackofficeAuth] Failed to read user doc: ${error?.message || error}`)
    }

    if (isAllowlisted) {
      // Allow allowlisted user even if Firestore is unavailable.
      try {
        await backofficeAdminAuth.setCustomUserClaims(decoded.uid, { platform_admin: true })
      } catch (claimError: any) {
        if (isDev) {
          console.warn(`[BackofficeAuth] Failed to set custom claims: ${claimError?.message || claimError}`)
        }
      }
      return { uid: decoded.uid, email: decoded.email }
    }

    throw new Response(
      JSON.stringify({
        error:
          "Backoffice Firestore is unavailable. Enable Firestore in the backoffice project or add the user to BACKOFFICE_PLATFORM_ADMIN_EMAILS.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  if (isDev && snap) {
    console.log(
      `[BackofficeAuth] roleDoc.exists=${snap.exists} roleDoc.data=${snap.exists ? JSON.stringify(snap.data() || {}) : "null"}`
    )
  }

  if (isAllowlisted) {
    // Allow allowlisted users even if role doc is missing or outdated.
    try {
      await userRef.set(
        {
          role: "platform_admin",
          lastLoginAt: new Date(),
        },
        { merge: true }
      )
    } catch (error: any) {
      if (isDev) {
        console.warn(`[BackofficeAuth] Failed to upsert role doc: ${error?.message || error}`)
      }
    }

    try {
      await backofficeAdminAuth.setCustomUserClaims(decoded.uid, { platform_admin: true })
    } catch (error: any) {
      if (isDev) {
        console.warn(`[BackofficeAuth] Failed to set custom claims: ${error?.message || error}`)
      }
    }

    return { uid: decoded.uid, email: decoded.email }
  }

  if (!snap.exists) {
    // Bootstrap: if the email is allowlisted, create platform_admin user doc.
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const data = snap.data() as any
  if (data?.role !== "platform_admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  await userRef.set({ lastLoginAt: new Date() }, { merge: true })
  return { uid: decoded.uid, email: decoded.email }
}
