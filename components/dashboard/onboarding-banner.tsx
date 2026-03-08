"use client"

import { ONBOARDING_STEPS, useOnboarding } from "@/lib/onboarding"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function OnboardingBanner() {
  const { isOnboarding, currentStepIndex, state, loading } = useOnboarding()

  if (loading || !isOnboarding) return null

  const completedCount = ONBOARDING_STEPS.filter((s) => state.completed[s.key]).length

  return (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div className="container mx-auto max-w-7xl px-4 md:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase opacity-80">
              Configuración inicial
            </h2>
            <p className="text-base font-medium mt-0.5">
              Paso {currentStepIndex + 1} de {ONBOARDING_STEPS.length}:{" "}
              {ONBOARDING_STEPS[currentStepIndex]?.label}
            </p>
          </div>
          <p className="text-sm opacity-80">{completedCount}/{ONBOARDING_STEPS.length} completados</p>
        </div>

        {/* Step indicators */}
        <div className="mt-3 flex items-center gap-1">
          {ONBOARDING_STEPS.map((step, idx) => {
            const done = state.completed[step.key]
            const isCurrent = idx === currentStepIndex
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0 gap-1">
                <div
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    done
                      ? "bg-white"
                      : isCurrent
                        ? "bg-white/60"
                        : "bg-white/20"
                  )}
                />
              </div>
            )
          })}
        </div>

        {/* Step labels (desktop) */}
        <div className="hidden sm:flex items-stretch mt-2 gap-1">
          {ONBOARDING_STEPS.map((step, idx) => {
            const done = state.completed[step.key]
            const isCurrent = idx === currentStepIndex
            return (
              <div key={step.key} className="flex-1 min-w-0 text-center">
                <span
                  className={cn(
                    "text-[11px] leading-tight inline-flex items-center gap-1",
                    done
                      ? "text-white font-medium"
                      : isCurrent
                        ? "text-white/80 font-medium"
                        : "text-white/40"
                  )}
                >
                  {done ? <CheckCircle className="w-3 h-3 shrink-0" /> : null}
                  <span className="truncate">{step.label}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
