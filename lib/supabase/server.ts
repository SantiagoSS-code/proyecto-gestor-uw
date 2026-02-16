// Supabase server helpers stubbed for Firebase-only deployment.
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
    cookies: cookieStore,
  }
}

export { createClient as createServerClient }
