import { LoginCentrosForm } from "@/components/auth/login-centros-form"

export const metadata = {
  title: "Login Centros - Courtly",
  description: "Inicia sesión o registra tu centro deportivo en Courtly",
}

export default function LoginCentrosPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoginCentrosForm />
    </main>
  )
}
