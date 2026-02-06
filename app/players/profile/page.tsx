"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrimaryButton } from "@/components/ui/primary-button"

interface PlayerProfile {
  identifier?: string
  name?: string
  email?: string
  ageRange?: string
  gender?: string
  sports?: string[]
}

export default function PlayerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedOnboarding = typeof window !== "undefined"
      ? localStorage.getItem("playerOnboarding")
      : null
    const storedIdentifier = typeof window !== "undefined"
      ? localStorage.getItem("playerIdentifier")
      : null
    const storedSignup = typeof window !== "undefined"
      ? localStorage.getItem("playerSignup")
      : null

    let signupData: Partial<PlayerProfile> = {}
    if (storedSignup) {
      try {
        signupData = JSON.parse(storedSignup) as Partial<PlayerProfile>
      } catch {
        signupData = {}
      }
    }

    if (storedOnboarding) {
      try {
        const data = JSON.parse(storedOnboarding) as PlayerProfile
        setProfile({ ...signupData, ...data, identifier: storedIdentifier || signupData.email || undefined })
      } catch {
        setProfile(
          storedIdentifier || Object.keys(signupData).length
            ? { ...signupData, identifier: storedIdentifier || signupData.email }
            : null
        )
      }
    } else {
      setProfile(
        storedIdentifier || Object.keys(signupData).length
          ? { ...signupData, identifier: storedIdentifier || signupData.email }
          : null
      )
    }

    setIsLoading(false)
  }, [])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-900">Mi perfil de jugador</CardTitle>
          <CardDescription className="text-gray-600">
            Tus preferencias y datos de juego
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-gray-600 text-center">Cargando perfil...</p>
          ) : profile ? (
            <div className="space-y-4 text-gray-900">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="text-base font-medium">{profile.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email o teléfono</p>
                <p className="text-base font-medium">{profile.identifier || profile.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rango de edad</p>
                <p className="text-base font-medium">{profile.ageRange || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Género</p>
                <p className="text-base font-medium">{profile.gender || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deportes</p>
                <p className="text-base font-medium">
                  {profile.sports?.length ? profile.sports.join(", ") : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-gray-900">
              <div>
                <p className="text-sm text-gray-500">Email o teléfono</p>
                <p className="text-base font-medium">—</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rango de edad</p>
                <p className="text-base font-medium">—</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Género</p>
                <p className="text-base font-medium">—</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deportes</p>
                <p className="text-base font-medium">—</p>
              </div>
              <p className="text-sm text-gray-600">
                Todavía no completaste tu perfil. Termínalo para desbloquear matches y reservas rápidas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <PrimaryButton onClick={() => router.push("/players/onboarding/personal-details")}>
                  Completar mi perfil
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => router.push("/players")}
                  className="h-12 rounded-full border border-gray-200 px-6 text-gray-700 hover:border-gray-300"
                >
                  Ir a mi dashboard
                </button>
              </div>
            </div>
          )}

          {profile && (
            <div className="flex justify-center">
              <PrimaryButton onClick={() => router.push("/players")}>
                Ir a mi dashboard
              </PrimaryButton>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
