import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { getServerSessionUser } from "@/lib/auth/server-session"

function parseAllowlist(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function requirePlatformAdminPage() {
  const decoded = await getServerSessionUser()
  if (!decoded) redirect("/auth/login")

  const email = String(decoded.email || "").toLowerCase()
  const allowlist = parseAllowlist()

  const userRef = adminDb.collection("users").doc(decoded.uid)
  const userSnap = await userRef.get()
  const role = (userSnap.exists ? (userSnap.data() as any)?.role : null) as string | null

  const isAllowlisted = !!email && allowlist.includes(email)
  const isPlatformAdmin = role === "platform_admin" || isAllowlisted

  if (!isPlatformAdmin) redirect("/dashboard-centros")

  // Bootstrap doc + custom claim for allowlisted admins.
  if (isAllowlisted && role !== "platform_admin") {
    await userRef.set(
      {
        role: "platform_admin",
        status: "active",
        email,
        updatedAt: new Date(),
      },
      { merge: true }
    )
    await adminAuth.setCustomUserClaims(decoded.uid, { platform_admin: true })
  }

  return decoded
}
