import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Auth callback disabled - Supabase integration will be replaced with Firebase
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login-centros?error=auth_disabled`)
}
