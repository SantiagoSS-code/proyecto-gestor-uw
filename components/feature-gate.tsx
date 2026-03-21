"use client"

import type { ReactNode } from "react"
import type { FeatureId } from "@/lib/plans"
import { useFeature } from "@/hooks/use-feature"
import { UpgradePrompt } from "@/components/upgrade-prompt"

interface FeatureGateProps {
  feature: FeatureId
  /** Render nothing instead of the upgrade prompt when the feature is locked */
  hideWhenLocked?: boolean
  /** Custom fallback instead of the default UpgradePrompt */
  fallback?: ReactNode
  children: ReactNode
}

export function FeatureGate({
  feature,
  hideWhenLocked = false,
  fallback,
  children,
}: FeatureGateProps) {
  const allowed = useFeature(feature)

  if (allowed) return <>{children}</>

  if (hideWhenLocked) return null

  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>
}
