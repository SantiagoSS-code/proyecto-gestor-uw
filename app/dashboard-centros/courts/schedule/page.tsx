import { redirect } from "next/navigation"

export default function CourtsScheduleLegacyPage() {
  redirect("/clubos/dashboard/courts?tab=schedule")
}
