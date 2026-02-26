import Link from "next/link"
import { Sparkles } from "lucide-react"

import { LoginCentrosForm } from "@/components/auth/login-centros-form"

export default function ClubOsLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            courtly
          </span>
        </Link>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Acceso ClubOS</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá con tu cuenta de club para administrar tu centro.
          </p>
        </div>

        <LoginCentrosForm />
      </div>
    </main>
  )
}
