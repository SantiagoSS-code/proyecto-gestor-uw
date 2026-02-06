import { NextResponse } from "next/server"

export async function GET() {
  const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ""
  return NextResponse.json({
    length: pk.length,
    first50: pk.slice(0, 50),
    last30: pk.slice(-30),
    hasYourPrivateKey: pk.includes("your-private-key"),
    hasRealKey: pk.includes("MIIEv"),
  })
}
