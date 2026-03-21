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
  { key: "publish", label: "Publicar", href: "/clubos/dashboard/settings/publish", number: 5 },
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

function normalizeState(input?: Partial<OnboardingState>): OnboardingState {
  const rawCompleted = { ...DEFAULT_STATE.completed, ...(input?.completed || {}) }
  const normalizedCompleted = { ...DEFAULT_STATE.completed }

  let allowComplete = true
  for (const step of ONBOARDING_STEPS) {
    const done = Boolean(rawCompleted[step.key]) && allowComplete
    normalizedCompleted[step.key] = done
    if (!done) allowComplete = false
  }

  const firstIncomplete = ONBOARDING_STEPS.find((step) => !normalizedCompleted[step.key])
  const onboardingComplete = !firstIncomplete

  return {
    completed: normalizedCompleted,
    currentStep: onboardingComplete ? "publish" : firstIncomplete.key,
    onboardingComplete,
    updatedAt: input?.updatedAt,
  }
}

function getNextStepHref(state: OnboardingState): string | null {
  if (state.onboardingComplete) return null
  const step = ONBOARDING_STEPS.find((s) => s.key === state.currentStep)
  return step?.href || null
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
const TEAM_MEMBER_ROLES = new Set(["owner", "manager", "reception", "trainer"])

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<OnboardingState>({ ...DEFAULT_STATE })
  const [loading, setLoading] = useState(true)

  const firestorePath = useMemo(
    () => (user ? doc(db, "centers", user.uid, "settings", "onboarding") : null),
    [user]
  )

  const ONBOARDING_COMPLETE_STATE = useMemo(() => normalizeState({
    completed: { profile: true, center: true, operations: true, courts: true, publish: true },
  }), [])

  const load = useCallback(async () => {
    if (!firestorePath || !user) {
      setLoading(false)
      return
    }
    try {
      // Team members (reception, trainer, manager, owner-as-employee) skip onboarding
      const userSnap = await getDoc(doc(db, "users", user.uid))
      if (userSnap.exists()) {
        const userData = userSnap.data() as { isTeamMember?: boolean; role?: string }
        if (userData.isTeamMember === true || TEAM_MEMBER_ROLES.has(userData.role ?? "")) {
          setState(ONBOARDING_COMPLETE_STATE)
          setLoading(false)
          return
        }
      }

      const snap = await getDoc(firestorePath)
      if (snap.exists()) {
        const data = snap.data() as Partial<OnboardingState>
        setState(normalizeState(data))
      }
    } catch (err) {
      console.error("[Onboarding] Error loading state:", err)
    } finally {
      setLoading(false)
    }
  }, [firestorePath, user, ONBOARDING_COMPLETE_STATE])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  const completeStep = useCallback(
    async (step: OnboardingStepKey): Promise<string | null> => {
      if (!firestorePath) return null

      const currentState = normalizeState(state)
      const alreadyDone = currentState.completed[step]

      // Enforce strict sequence: only current step can be completed.
      if (!alreadyDone && step !== currentState.currentStep) {
        return getNextStepHref(currentState)
      }

      const nextState = normalizeState({
        completed: {
          ...currentState.completed,
          [step]: true,
        },
      })

      setState(nextState)

      try {
        await setDoc(firestorePath, { ...nextState, updatedAt: serverTimestamp() }, { merge: true })
      } catch (err) {
        console.error("[Onboarding] Error saving state:", err)
      }

      return getNextStepHref(nextState)
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
