"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "@/components/onboarding/StepIndicator"
import { RadioGroupCard } from "@/components/onboarding/RadioGroupCard"
import { CheckboxGroupCard } from "@/components/onboarding/CheckboxGroupCard"
import { PrimaryButton } from "@/components/ui/primary-button"

const ageOptions = [
  { label: "18–24", value: "18-24" },
  { label: "25–34", value: "25-34" },
  { label: "35–44", value: "35-44" },
  { label: "45–54", value: "45-54" },
  { label: "55+", value: "55+" },
]

const genderOptions = [
  { label: "Hombre", value: "male" },
  { label: "Mujer", value: "female" },
  { label: "No binario", value: "non-binary" },
  { label: "Prefiero no decir", value: "prefer-not-to-say" },
]

const sportsOptions = [
  { label: "Padel", value: "padel" },
  { label: "Tenis", value: "tennis" },
  { label: "Fútbol", value: "football" },
]

type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say"

export default function PersonalDetailsPage() {
  const router = useRouter()
  const [ageRange, setAgeRange] = useState<string | null>(null)
  const [gender, setGender] = useState<Gender | null>(null)
  const [sports, setSports] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const isNewAccount = typeof window !== "undefined" && localStorage.getItem("playerIsNew") === "true"
    if (!isNewAccount) {
      // If the user is already onboarded, send them to the dashboard.
      router.replace("/players/dashboard")
    }
  }, [router])

  const isValid = useMemo(() => {
    return Boolean(ageRange && gender && sports.length >= 1)
  }, [ageRange, gender, sports])

  const handleContinue = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    
    const onboardingData = {
      ageRange: ageRange ?? "",
      gender: (gender ?? "prefer-not-to-say") as Gender,
      sports,
    }

    console.info("[Onboarding] Personal details", onboardingData)
    if (typeof window !== "undefined") {
      localStorage.setItem("playerOnboarding", JSON.stringify(onboardingData))
      localStorage.removeItem("playerIsNew")
    }

    setTimeout(() => {
      router.push("/players/onboarding/skill-level")
    }, 200)
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <StepIndicator step={1} total={2} title="Contanos un poco sobre vos" />

        <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm text-black">
            Esto nos ayuda a encontrarte jugadores similares. Podés cambiarlo cuando quieras.
          </p>

          <div className="mt-6 space-y-8">
            <RadioGroupCard
              label="¿Qué edad tenés?"
              value={ageRange}
              options={ageOptions}
              onChange={setAgeRange}
            />

            <RadioGroupCard
              label="¿Con qué te identificás?"
              value={gender}
              options={genderOptions}
              onChange={(value) => setGender(value as Gender)}
            />

            <CheckboxGroupCard
              label="¿Qué deportes jugás?"
              values={sports}
              options={sportsOptions}
              onChange={setSports}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-black">
            Tiempo estimado: menos de 30 segundos
          </p>
          <PrimaryButton onClick={handleContinue} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Guardando..." : "Continuar"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
