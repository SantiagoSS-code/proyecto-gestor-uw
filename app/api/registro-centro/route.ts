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
  try {
    const body = await request.json()
    const {
      email,
      password,
      adminData,
      centerData,
      centerHours,
      centerImageUrl,
      isGoogleUser,
      userId: googleUserId,
    } = body

    let userId: string
    let isExistingUser = false

    if (isGoogleUser && googleUserId) {
      // For Google users, use the existing user ID
      userId = googleUserId
      isExistingUser = true
    } else {
      // For email/password users, try to create a new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email since we already verified with OTP
      })

      if (authError) {
        // Check if the error is because the user already exists
        if (authError.message.includes("already been registered") || authError.message.includes("email_exists")) {
          // User exists - try to find them and update their password
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find(u => u.email === email)
          
          if (existingUser) {
            // Check if this user already has a center_admin record
            const { data: existingAdmin } = await supabaseAdmin
              .from("center_admins")
              .select("id")
              .eq("user_id", existingUser.id)
              .single()
            
            if (existingAdmin) {
              return NextResponse.json({ 
                error: "Este email ya tiene un centro registrado. Por favor inicia sesión." 
              }, { status: 400 })
            }
            
            // User exists but has no center - update their password and use their ID
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: password,
              email_confirm: true,
            })
            
            userId = existingUser.id
            isExistingUser = true
          } else {
            return NextResponse.json({ error: authError.message }, { status: 400 })
          }
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }
      } else {
        userId = authData.user.id
      }
    }

    // 2. Insert admin profile and get the admin record ID
    const { data: adminResult, error: adminError } = await supabaseAdmin
      .from("center_admins")
      .insert({
        user_id: userId,
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        email: adminData.email,
        phone: adminData.phone,
      })
      .select()
      .single()

    if (adminError) {
      // Rollback: delete the auth user only if we created it (not for existing users)
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }

    console.log("[v0] Admin profile created with id:", adminResult.id)

    // 3. Insert center (admin_id references center_admins.id, not auth.users.id)
    const { data: centerResult, error: centerError } = await supabaseAdmin
      .from("centers")
      .insert({
        admin_id: adminResult.id,
        name: centerData.name,
        street: centerData.street,
        street_number: centerData.number,
        province: centerData.province,
        city: centerData.city,
        postal_code: centerData.postalCode,
        phone: centerData.phone,
        email: centerData.email,
        image_url: centerImageUrl,
      })
      .select()
      .single()

    if (centerError) {
      // Rollback
      await supabaseAdmin.from("center_admins").delete().eq("user_id", userId)
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      return NextResponse.json({ error: centerError.message }, { status: 400 })
    }

    console.log("[v0] Center created:", centerResult.id)

    // 4. Insert center hours (using correct column names from schema)
    const hoursToInsert = centerHours.map((hour: any) => ({
      center_id: centerResult.id,
      day_of_week: dayNameToNumber[hour.day.toLowerCase()] ?? 0,
      is_closed: !hour.isOpen,
      opening_time: hour.openTime,
      closing_time: hour.closeTime,
    }))

    const { error: hoursError } = await supabaseAdmin.from("center_hours").insert(hoursToInsert)

    if (hoursError) {
      console.log("[v0] Hours insert error:", hoursError.message)
      // Continue anyway, hours can be added later
    }

    console.log("[v0] Registration complete")

    return NextResponse.json({
      success: true,
      userId,
      centerId: centerResult.id,
    })
  } catch (error: any) {
    console.log("[v0] Unexpected error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
