"use client"

import { ArrowUpCircle } from "lucide-react"
import Link from "next/link"
import { minimumPlanFor, PLAN_FEATURES, FEATURE_LABELS, type FeatureId } from "@/lib/plans"

interface UpgradePromptProps {
  feature: FeatureId
  className?: string
}

export function UpgradePrompt({ feature, className }: UpgradePromptProps) {
  const requiredPlan = minimumPlanFor(feature)
  const planLabel = PLAN_FEATURES[requiredPlan].label
  const featureLabel = FEATURE_LABELS[feature]

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-dashed border-yellow-400 bg-yellow-50 p-6 text-center dark:border-yellow-600 dark:bg-yellow-950/30 ${className ?? ""}`}
    >
      <ArrowUpCircle className="h-10 w-10 text-yellow-500" />
      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
        <strong>{featureLabel}</strong> está disponible a partir del plan{" "}
        <strong>{planLabel}</strong>.
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-600"
      >
        <ArrowUpCircle className="h-4 w-4" />
        Mejorar plan
      </Link>
    </div>
  )
}
