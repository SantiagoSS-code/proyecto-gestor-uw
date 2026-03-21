"use client"

import { Zap, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ClubPlanId } from "@/lib/permissions"

const PLAN_DISPLAY: Record<ClubPlanId, { label: string; color: string; highlight: string }> = {
  estandar:    { label: "Estándar",    color: "text-slate-600",  highlight: "bg-slate-100"  },
  profesional: { label: "Profesional", color: "text-blue-700",   highlight: "bg-blue-50"    },
  maestro:     { label: "Maestro",     color: "text-amber-700",  highlight: "bg-amber-50"   },
}

interface PlanUpgradeModalProps {
  open: boolean
  onClose: () => void
  /** The section name that's locked (e.g. "Torneos") */
  sectionLabel: string
  /** The minimum plan required to unlock it */
  requiredPlan: ClubPlanId
}

export function PlanUpgradeModal({
  open,
  onClose,
  sectionLabel,
  requiredPlan,
}: PlanUpgradeModalProps) {
  if (!open) return null

  const plan = PLAN_DISPLAY[requiredPlan]

  const handleUpgrade = () => {
    onClose()
    // Navigate to billing/upgrade section
    window.location.href = "/clubos/dashboard/settings/facturacion"
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="size-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Zap className="size-7 text-amber-500" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Sección no disponible
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800">{sectionLabel}</span> está disponible a
            partir del{" "}
            <span className={cn("font-semibold", plan.color)}>
              Plan {plan.label}
            </span>
            . Mejorá tu plan para desbloquear esta sección.
          </p>
        </div>

        {/* Plan chip */}
        <div className={cn("rounded-xl px-4 py-3 mb-5 text-center", plan.highlight)}>
          <p className="text-xs text-slate-500 mb-0.5">Disponible desde</p>
          <p className={cn("text-base font-bold", plan.color)}>Plan {plan.label}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleUpgrade}
          >
            Mejorar mi plan
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" className="w-full text-slate-500" onClick={onClose}>
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  )
}
