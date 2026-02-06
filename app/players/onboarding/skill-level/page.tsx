"use client"

import { useRouter } from "next/navigation"
import { StepIndicator } from "@/components/onboarding/StepIndicator"
import { PrimaryButton } from "@/components/ui/primary-button"

export default function SkillLevelPage() {
  const router = useRouter()

  const resolveNext = () => {
    if (typeof window === "undefined") return null
    const value = localStorage.getItem("playerNext")
    if (!value) return null
    if (!value.startsWith("/")) return null
    if (value.startsWith("//")) return null
    return value
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <StepIndicator step={2} total={2} title="Nivel de juego" />

        <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm text-black">
            Este paso es un placeholder para la próxima pantalla de onboarding.
          </p>
        </div>

        <div className="flex justify-end">
          <PrimaryButton
            onClick={() => {
              const nextDestination = resolveNext()
              if (typeof window !== "undefined" && nextDestination) {
                localStorage.removeItem("playerNext")
              }
              // Onboarding finished: land on the dashboard unless a safe next exists.
              router.push(nextDestination || "/players/dashboard")
            }}
          >
            Finalizar
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
