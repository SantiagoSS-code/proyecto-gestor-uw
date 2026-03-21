"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"
import type { FeatureId } from "@/lib/plans"
import { useFeature } from "@/hooks/use-feature"
import { FEATURE_LABELS, minimumPlanFor, PLAN_FEATURES } from "@/lib/plans"

interface SidebarFeatureItemProps {
  feature: FeatureId
  href: string
  icon?: ReactNode
  label: string
  active?: boolean
}

export function SidebarFeatureItem({
  feature,
  href,
  icon,
  label,
  active,
}: SidebarFeatureItemProps) {
  const allowed = useFeature(feature)
  const requiredPlan = minimumPlanFor(feature)
  const planLabel = PLAN_FEATURES[requiredPlan].label

  if (!allowed) {
    return (
      <div
        className="group relative flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-50"
        title={`Disponible en el plan ${planLabel}`}
      >
        {icon}
        <span>{label}</span>
        <Lock className="ml-auto h-3.5 w-3.5" />
        {/* Tooltip on hover */}
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs shadow opacity-0 transition-opacity group-hover:opacity-100">
          Plan {planLabel} requerido
        </span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
        active ? "bg-accent font-medium" : ""
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
