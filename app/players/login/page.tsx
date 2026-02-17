import { LoginPlayersForm } from "@/components/auth/login-players-form"

export const metadata = {
  title: "Login Jugadores - Courtly",
  description: "Inicia sesión para reservar, encontrar partidos y jugar más",
}

export default function PlayerLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <LoginPlayersForm />
    </main>
  )
}
