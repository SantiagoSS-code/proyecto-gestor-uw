import { redirect } from "next/navigation"

export const metadata = {
  title: "Registro de Centros - Courtly",
  description: "Registra tu centro deportivo en Courtly",
}

export default function RegistroCentrosPage() {
  redirect("/clubos/login?invite_only=1")
}
