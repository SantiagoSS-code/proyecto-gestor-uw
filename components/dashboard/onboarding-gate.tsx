"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useOnboarding, ONBOARDING_STEPS } from "@/lib/onboarding"
import { Loader2 } from "lucide-react"

/**
 * During onboarding, this component forces the user to stay on the current step's page.
 * If they try to navigate elsewhere, they get redirected.
 * Once onboarding is complete, it renders children normally.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isOnboarding, state, loading, currentStepIndex } = useOnboarding()
  const pathname = usePathname()
  const router = useRouter()

  const pathToStepKey = (path: string): (typeof ONBOARDING_STEPS)[number]["key"] | null => {
    if (path.startsWith("/clubos/dashboard/settings/publish")) return "publish"
    if (path.startsWith("/clubos/dashboard/settings/profile")) return "profile"
    if (path.startsWith("/clubos/dashboard/settings/operacion")) return "operations"
    if (path.startsWith("/clubos/dashboard/courts")) return "courts"

    if (path === "/clubos/dashboard/settings" || path.startsWith("/clubos/dashboard/settings/center")) {
      // Same base path is used by center and publish step.
      return state.currentStep === "publish" ? "publish" : "center"
    }

    return null
  }

  useEffect(() => {
    if (loading || !isOnboarding) return

    const currentStep = ONBOARDING_STEPS[currentStepIndex]
    if (!currentStep) return

    const expectedPath = currentStep.href.split("?")[0]
    const routeStep = pathToStepKey(pathname)

    // Allow current step and any previously completed onboarding step.
    const canStayOnRoute =
      routeStep !== null && (routeStep === state.currentStep || Boolean(state.completed[routeStep]))

    if (!canStayOnRoute) {
      router.replace(expectedPath)
    }
  }, [loading, isOnboarding, currentStepIndex, pathname, router, state.currentStep, state.completed])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return <>{children}</>
}
