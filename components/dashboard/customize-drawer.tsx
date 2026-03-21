"use client"

import { useState, useMemo } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  X, ChevronDown, ChevronRight, BarChart2,
  CalendarDays, Users, DollarSign, CreditCard, Settings2, AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
  DASHBOARD_CUSTOMIZE_SECTIONS,
  type DashboardCustomizeSection,
} from "@/lib/dashboard-customize-config"
import { MAX_WIDGETS } from "@/lib/dashboard-storage"

// ─── Icon map ─────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign,
  BarChart2,
  CalendarDays,
  Users,
  CreditCard,
}

// ─── Section accordion ────────────────────────────────────────
function SectionItem({
  section,
  enabled,
  onToggle,
  atLimit,
}: {
  section: DashboardCustomizeSection
  enabled: Set<string>
  onToggle: (id: string, value: boolean) => void
  atLimit: boolean
}) {
  const [open, setOpen] = useState(false)
  const Icon = ICON_MAP[section.icon] ?? Settings2

  const totalMetrics = section.groups.reduce((acc, g) => acc + g.metrics.length, 0)
  const enabledCount = section.groups.reduce(
    (acc, g) => acc + g.metrics.filter((m) => enabled.has(m.id)).length,
    0,
  )

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-card hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm text-foreground">{section.label}</span>
          <span className="text-xs text-muted-foreground ml-1">
            {enabledCount > 0 ? (
              <span className="text-primary font-medium">{enabledCount}/{totalMetrics}</span>
            ) : (
              <>{totalMetrics} métricas</>
            )}
          </span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/60 bg-muted/20">
          {section.groups.map((group) => (
            <div key={group.id} className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                {group.label}
              </p>
              <ul className="space-y-2.5">
                {group.metrics.map((metric) => {
                  const isOn = enabled.has(metric.id)
                  const blocked = !isOn && atLimit
                  return (
                    <li key={metric.id} className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`metric-${metric.id}`}
                        className={cn(
                          "text-sm cursor-pointer select-none flex-1 leading-tight",
                          blocked ? "text-muted-foreground/50" : "text-foreground/80",
                        )}
                      >
                        {metric.label}
                      </label>
                      <Switch
                        id={`metric-${metric.id}`}
                        size="sm"
                        checked={isOn}
                        disabled={blocked}
                        onCheckedChange={(val) => onToggle(metric.id, val)}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────
export function DashboardCustomizeDrawer({
  open,
  onClose,
  savedWidgets,
  onSave,
}: {
  open: boolean
  onClose: () => void
  /** Current persisted widget IDs (source of truth from parent). */
  savedWidgets: string[]
  /** Called with the new list when user clicks "Guardar cambios". */
  onSave: (ids: string[]) => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(savedWidgets))
  const savedSet = useMemo(() => new Set(savedWidgets), [savedWidgets])

  // Reset draft when drawer opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setDraft(new Set(savedWidgets))
    } else {
      handleCancel()
    }
  }

  const hasChanges = useMemo(() => {
    if (draft.size !== savedSet.size) return true
    for (const id of draft) if (!savedSet.has(id)) return true
    return false
  }, [draft, savedSet])

  const atLimit = draft.size >= MAX_WIDGETS

  const handleToggle = (id: string, value: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (value) {
        if (next.size >= MAX_WIDGETS) return prev
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSave = () => {
    onSave(Array.from(draft))
    onClose()
  }

  const handleCancel = () => {
    setDraft(new Set(savedWidgets))
    onClose()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-full w-full max-w-md",
            "bg-background border-l border-border shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            "duration-300 ease-in-out",
            "flex flex-col",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground leading-none">
                  Personalizar panel
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                  Activá las métricas que querés ver en tu dashboard
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Limit warning */}
          {atLimit && (
            <div className="mx-5 mt-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Alcanzaste el máximo de {MAX_WIDGETS} widgets. Desactivá uno para agregar otro.
            </div>
          )}

          {/* Section list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {DASHBOARD_CUSTOMIZE_SECTIONS.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                enabled={draft}
                onToggle={handleToggle}
                atLimit={atLimit}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {draft.size}/{MAX_WIDGETS} widgets activos
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground transition-opacity",
                  hasChanges ? "opacity-100 hover:opacity-90" : "opacity-40 cursor-not-allowed",
                )}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
