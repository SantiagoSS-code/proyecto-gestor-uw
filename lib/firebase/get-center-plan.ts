import { adminDb } from "@/lib/firebase/admin"
import type { PlanId } from "@/lib/plans"

/**
 * Maps the stored `selectedPlan` value (estandar/profesional/maestro)
 * to the internal PlanId used for feature gating.
 */
const SELECTED_PLAN_TO_PLAN_ID: Record<string, PlanId> = {
  estandar:    "starter",
  profesional: "pro",
  maestro:     "enterprise",
}

/**
 * Reads the `selectedPlan` field from `centers/{centerId}` and maps it
 * to the internal PlanId. Returns "free" when the field is absent.
 */
export async function getCenterPlan(centerId: string): Promise<PlanId> {
  const snap = await adminDb.doc(`centers/${centerId}`).get()
  const data = snap.data()
  const selectedPlan = data?.selectedPlan as string | undefined
  return SELECTED_PLAN_TO_PLAN_ID[selectedPlan ?? ""] ?? "free"
}
