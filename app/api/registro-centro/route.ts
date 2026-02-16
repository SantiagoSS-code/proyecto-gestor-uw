import { NextResponse } from "next/server"

export async function POST(request: Request) {
  return NextResponse.json({ error: "Registration is currently disabled. Supabase integration will be replaced with Firebase in the future." }, { status: 503 })
}
