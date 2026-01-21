import { Suspense } from "react"
import { RegistroCentrosForm } from "@/components/auth/registro-centros-form"

export const metadata = {
  title: "Registro de Centros - Courtly",
  description: "Registra tu centro deportivo en Courtly",
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-2xl p-8 animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4" />
      <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-8" />
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded" />
        <div className="h-12 bg-muted rounded" />
      </div>
    </div>
  )
}

export default function RegistroCentrosPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <Suspense fallback={<LoadingFallback />}>
        <RegistroCentrosForm />
      </Suspense>
    </main>
  )
}
