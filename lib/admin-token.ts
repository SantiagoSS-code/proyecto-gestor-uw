import { headers } from "next/headers"

export async function getAdminGuardInput(searchParamsToken?: string | null) {
  const headerStore = await headers()
  return {
    providedToken: searchParamsToken || headerStore.get("x-admin-token"),
    expectedToken: process.env.ADMIN_TOKEN,
  }
}

export function isAdminAuthorized({
  expectedToken,
  providedToken,
}: {
  expectedToken?: string
  providedToken?: string | null
}) {
  if (!expectedToken) return true
  return providedToken === expectedToken
}

export function buildTokenQuery(token?: string | null) {
  if (!token) return ""
  return `?token=${encodeURIComponent(token)}`
}
