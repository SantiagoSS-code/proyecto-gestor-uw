// Supabase integration temporarily stubbed out for Firebase-only deployment.
// This module returns a minimal stub so builds won't fail when the
// `@supabase/ssr` package is not installed.

let client: any = null

export function createClient() {
  if (client) return client

  client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: async () => ({ data: null }) }),
  }

  return client
}

export const createBrowserClient = createClient
