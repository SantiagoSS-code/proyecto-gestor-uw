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

  useEffect(() => {
    if (loading || !isOnboarding) return

    const currentStep = ONBOARDING_STEPS[currentStepIndex]
    if (!currentStep) return

    const expectedPath = currentStep.href.split("?")[0] // strip query string for pathname comparison

    // Allow the user to be on the expected path
    // For "courts" step, also allow /clubos/dashboard/courts sub-routes
    // For "publish" step, also allow being on /clubos/dashboard/settings (same base as center)
    const isOnExpectedPath =
      pathname === expectedPath ||
      pathname.startsWith(expectedPath + "/") ||
      (currentStep.key === "courts" && pathname.startsWith("/clubos/dashboard/courts")) ||
      (currentStep.key === "publish" && pathname.startsWith("/clubos/dashboard/settings"))

    if (!isOnExpectedPath) {
      router.replace(expectedPath)
    }
  }, [loading, isOnboarding, currentStepIndex, pathname, router])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return <>{children}</>
}
