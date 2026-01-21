import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardCentrosContent } from "@/components/dashboard/dashboard-centros-content"

export const metadata = {
  title: "Dashboard - Courtly Centros",
  description: "Panel de administración de tu centro deportivo",
}

export default async function DashboardCentrosPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login-centros")
  }

  // Check if user has completed registration
  const { data: admin } = await supabase.from("center_admins").select("*, centers(*)").eq("user_id", user.id).single()

  // centers is an array - check if it exists and has at least one center
  if (!admin || !admin.centers || admin.centers.length === 0) {
    redirect("/registro-centros")
  }

  // Pass the first center (admins currently have one center)
  return <DashboardCentrosContent admin={admin} center={admin.centers[0]} />
}
