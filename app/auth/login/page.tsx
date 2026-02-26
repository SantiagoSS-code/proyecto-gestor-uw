import { redirect } from "next/navigation"

export default function LegacyAuthLoginRedirect() {
  redirect("/clubos/login")
}