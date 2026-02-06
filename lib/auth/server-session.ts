import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebase/admin"

const SESSION_COOKIE_NAME = "__session"

export async function getServerSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  try {
    return await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }
}
