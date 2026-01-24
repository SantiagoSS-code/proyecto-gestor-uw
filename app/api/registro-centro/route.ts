import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Use service role to bypass RLS - this runs on the server only
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Map day names to integers (0 = Sunday, 1 = Monday, etc.)
const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export async function POST(request: Request) {
  return NextResponse.json({ error: "Registration is currently disabled. Supabase integration will be replaced with Firebase in the future." }, { status: 503 })
}
