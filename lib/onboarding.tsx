"use client"

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"

/* ────────── constants ────────── */
export const ONBOARDING_STEPS = [
  { key: "profile", label: "Mi cuenta", href: "/clubos/dashboard/settings/profile", number: 1 },
  { key: "center", label: "Centro", href: "/clubos/dashboard/settings", number: 2 },
  { key: "operations", label: "Operación", href: "/clubos/dashboard/settings/operacion", number: 3 },
  { key: "courts", label: "Canchas", href: "/clubos/dashboard/courts", number: 4 },
  { key: "publish", label: "Publicar", href: "/clubos/dashboard/settings?step=publish", number: 5 },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]

export type OnboardingState = {
  completed: Record<OnboardingStepKey, boolean>
  currentStep: OnboardingStepKey
  onboardingComplete: boolean
  updatedAt?: any
}

const DEFAULT_STATE: OnboardingState = {
  completed: {
    profile: false,
    center: false,
    operations: false,
    courts: false,
    publish: false,
  },
  currentStep: "profile",
  onboardingComplete: false,
}

/* ────────── context ────────── */
type OnboardingContextValue = {
  state: OnboardingState
  loading: boolean
  /** Mark a step as completed and return the next step's href (or null if done) */
  completeStep: (step: OnboardingStepKey) => Promise<string | null>
  /** Whether we are currently in onboarding mode (not yet finished all steps) */
  isOnboarding: boolean
  /** Index (0-based) of current step */
  currentStepIndex: number
  /** Total step count */
  totalSteps: number
  /** Reload onboarding state from Firestore */
  refresh: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue>({
  state: DEFAULT_STATE,
  loading: true,
  completeStep: async () => null,
  isOnboarding: false,
  currentStepIndex: 0,
  totalSteps: ONBOARDING_STEPS.length,
  refresh: async () => {},
})

export const useOnboarding = () => useContext(OnboardingContext)

/* ────────── provider ────────── */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<OnboardingState>({ ...DEFAULT_STATE })
  const [loading, setLoading] = useState(true)

  const firestorePath = useMemo(
    () => (user ? doc(db, "centers", user.uid, "settings", "onboarding") : null),
    [user]
  )

  const load = useCallback(async () => {
    if (!firestorePath) {
      setLoading(false)
      return
    }
    try {
      const snap = await getDoc(firestorePath)
      if (snap.exists()) {
        const data = snap.data() as Partial<OnboardingState>
        setState({
          completed: { ...DEFAULT_STATE.completed, ...(data.completed || {}) },
          currentStep: data.currentStep || DEFAULT_STATE.currentStep,
          onboardingComplete: Boolean(data.onboardingComplete),
        })
      }
    } catch (err) {
      console.error("[Onboarding] Error loading state:", err)
    } finally {
      setLoading(false)
    }
  }, [firestorePath])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  const completeStep = useCallback(
    async (step: OnboardingStepKey): Promise<string | null> => {
      if (!firestorePath) return null

      const nextCompleted = { ...state.completed, [step]: true }

      // determine next incomplete step
      const nextStep = ONBOARDING_STEPS.find((s) => !nextCompleted[s.key])
      const nextStepKey = nextStep?.key || "publish"
      const allDone = ONBOARDING_STEPS.every((s) => nextCompleted[s.key])

      const nextState: OnboardingState = {
        completed: nextCompleted,
        currentStep: nextStepKey,
        onboardingComplete: allDone,
      }

      setState(nextState)

      try {
        await setDoc(firestorePath, { ...nextState, updatedAt: serverTimestamp() }, { merge: true })
      } catch (err) {
        console.error("[Onboarding] Error saving state:", err)
      }

      if (allDone) return null
      return nextStep?.href || null
    },
    [firestorePath, state]
  )

  const isOnboarding = useMemo(() => !state.onboardingComplete, [state.onboardingComplete])

  const currentStepIndex = useMemo(
    () => Math.max(0, ONBOARDING_STEPS.findIndex((s) => s.key === state.currentStep)),
    [state.currentStep]
  )

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      loading,
      completeStep,
      isOnboarding,
      currentStepIndex,
      totalSteps: ONBOARDING_STEPS.length,
      refresh: load,
    }),
    [state, loading, completeStep, isOnboarding, currentStepIndex, load]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}
