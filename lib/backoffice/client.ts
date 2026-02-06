import { authBackoffice } from "@/lib/firebaseBackofficeClient"

export class BackofficeRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function backofficeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = authBackoffice.currentUser
  if (!user) throw new Error("Not signed in")
  const token = await user.getIdToken()

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  const contentType = res.headers.get("content-type") || ""

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let raw = ""

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null)
      message = data?.error || data?.message || message
    } else {
      raw = await res.text().catch(() => "")
    }

    if (raw) {
      const preview = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
      console.error("[Backoffice] API error response", res.status, preview)
    } else {
      console.error("[Backoffice] API error response", res.status, message)
    }

    throw new BackofficeRequestError(res.status, message)
  }

  if (!contentType.includes("application/json")) {
    const raw = await res.text().catch(() => "")
    const preview = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
    console.error("[Backoffice] Non-JSON API response", res.status, preview)
    throw new BackofficeRequestError(res.status, "Expected JSON response from API")
  }

  return (await res.json()) as T
}
