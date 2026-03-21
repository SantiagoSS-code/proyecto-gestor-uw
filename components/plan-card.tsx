"use client"

import Link from "next/link"
import { ArrowUpCircle, CheckCircle2, Crown } from "lucide-react"
import { usePlan } from "@/hooks/use-feature"
import { PLAN_FEATURES, FEATURE_LABELS, type PlanId } from "@/lib/plans"
import { PlanBadge } from "@/components/plan-badge"

const PLAN_ICONS: Record<PlanId, string> = {
  free: "🆓",
  starter: "🚀",
  pro: "⭐",
  enterprise: "👑",
}

export function PlanCard() {
  const plan = usePlan()
  const def = PLAN_FEATURES[plan]
  const isTopPlan = plan === "enterprise"

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{PLAN_ICONS[plan]}</span>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Tu plan actual
            </h3>
            <p className="text-xl font-bold">
              {def.label} <PlanBadge className="ml-1 align-middle" />
            </p>
          </div>
        </div>
        {!isTopPlan && (
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Mejorar plan
          </Link>
        )}
      </div>

      {/* Limits */}
      <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">
            {def.limits.maxTeamMembers === -1
              ? "Ilimitados"
              : def.limits.maxTeamMembers}
          </span>{" "}
          miembros de equipo
        </div>
        <div>
          <span className="font-medium text-foreground">
            {def.features.length}
          </span>{" "}
          funcionalidades incluidas
        </div>
      </div>

      {/* Feature list */}
      {def.features.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {def.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {FEATURE_LABELS[f]}
            </li>
          ))}
        </ul>
      )}

      {def.features.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Mejorá tu plan para desbloquear funcionalidades avanzadas.
        </p>
      )}
    </div>
  )
}
