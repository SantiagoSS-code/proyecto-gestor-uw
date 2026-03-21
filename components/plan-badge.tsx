"use client"

import { usePlan } from "@/hooks/use-feature"
import { PLAN_FEATURES, type PlanId } from "@/lib/plans"

const PLAN_COLORS: Record<PlanId, string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  enterprise: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
}

export function PlanBadge({ className }: { className?: string }) {
  const plan = usePlan()
  const label = PLAN_FEATURES[plan].label

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[plan]} ${className ?? ""}`}
    >
      {label}
    </span>
  )
}
