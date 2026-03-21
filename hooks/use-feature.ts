"use client"

import { useAuth } from "@/lib/context/auth-context"
import { planHasFeature, type FeatureId, type PlanId } from "@/lib/plans"

/**
 * Returns `true` when the current center's plan includes the feature.
 * Assumes `auth-context` exposes a `centerPlan` field (defaults to "free").
 */
export function useFeature(feature: FeatureId): boolean {
  const { centerPlan } = useAuth() as { centerPlan?: PlanId }
  return planHasFeature(centerPlan ?? "free", feature)
}

/**
 * Returns the current center's plan id.
 */
export function usePlan(): PlanId {
  const { centerPlan } = useAuth() as { centerPlan?: PlanId }
  return centerPlan ?? "free"
}
