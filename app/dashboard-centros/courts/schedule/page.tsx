import { redirect } from "next/navigation"

export default function CourtsScheduleLegacyPage() {
  redirect("/dashboard-centros/courts?tab=schedule")
}
