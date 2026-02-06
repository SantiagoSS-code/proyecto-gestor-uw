import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await adminAuth.getUserByEmail(email)
    console.log("Found user:", user.uid)
    
    await adminAuth.deleteUser(user.uid)
    console.log("User deleted:", email)
    
    return NextResponse.json({ success: true, message: `User ${email} deleted successfully`, uid: user.uid })
  } catch (error: any) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 })
  }
}
