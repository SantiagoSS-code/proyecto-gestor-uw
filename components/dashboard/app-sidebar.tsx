"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Grid3X3,
  Users,
  Wallet,
  BarChart3,
  GraduationCap,
  Dumbbell,
  UserCircle2,
  Building2,
  Settings2,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Menu,
  LogOut,
  ChevronDown,
  Lock,
  Check,
  Tag,
  CreditCard,
  Trophy,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { useOnboarding, ONBOARDING_STEPS } from "@/lib/onboarding"
import { usePermissions } from "@/lib/permissions-context"
import { minimumPlanForModule } from "@/lib/permissions"
import type { ModuleId, ClubPlanId } from "@/lib/permissions"
import { PlanUpgradeModal } from "@/components/dashboard/plan-upgrade-modal"

// Map sidebar hrefs → module IDs for permission gating
const HREF_TO_MODULE: Record<string, ModuleId> = {
  "/clubos/dashboard":               "dashboard",
  "/clubos/dashboard/reservas":      "reservations",
  "/clubos/dashboard/courts":        "courts",
  "/clubos/dashboard/customers":     "clients",
  "/clubos/dashboard/cursos":        "courses",
  "/clubos/dashboard/trainers":      "trainers",
  "/clubos/dashboard/promotions":    "promotions",
  "/clubos/dashboard/memberships":   "memberships",
  "/clubos/dashboard/tournaments":   "tournaments",
  "/clubos/dashboard/finanzas":      "finances",
  "/clubos/dashboard/reportes":      "reports",
  // Settings sub-pages that require "settings" permission
  "/clubos/dashboard/settings":              "settings",
  "/clubos/dashboard/settings/center":       "settings",
  "/clubos/dashboard/settings/operacion":    "settings",
  "/clubos/dashboard/settings/facturacion":  "settings",
  "/clubos/dashboard/settings/notificaciones": "settings",
  // Team requires "team" permission
  "/clubos/dashboard/settings/team":         "team",
  // Profile and Help are accessible to everyone (no module mapping)
}

// ── Plan display helpers ────────────────────────────────────────────────────
const PLAN_DISPLAY: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; pill: string }> = {
  estandar:    { label: "Estándar",    icon: Building2,   color: "text-slate-600",  pill: "bg-slate-100 text-slate-600" },
  profesional: { label: "Profesional", icon: CreditCard,  color: "text-blue-600",   pill: "bg-blue-100  text-blue-700"  },
  maestro:     { label: "Maestro",     icon: Trophy,      color: "text-amber-600",  pill: "bg-amber-100 text-amber-700" },
}

const STATUS_LABEL: Record<string, string> = {
  active:          "Activo",
  pending_payment: "Pago pendiente",
  suspended:       "Suspendido",
  trial:           "Prueba",
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner:     { label: "Dueño",         color: "bg-violet-100 text-violet-700" },
  manager:   { label: "Manager",       color: "bg-blue-100   text-blue-700"   },
  reception: { label: "Recepcionista", color: "bg-emerald-100 text-emerald-700" },
  trainer:   { label: "Entrenador",    color: "bg-amber-100  text-amber-700"  },
}

function PlanBadge() {
  const { plan, subscriptionStatus } = usePermissions()
  if (!plan) return null

  const meta = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.estandar
  const PlanIcon = meta.icon
  const statusLabel = STATUS_LABEL[subscriptionStatus ?? ""] ?? ""

  return (
    <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
      <PlanIcon className={cn("size-3.5 flex-shrink-0", meta.color)} />
      <p className="text-xs font-semibold text-slate-800 flex-1 min-w-0 truncate">Plan {meta.label}</p>
      {statusLabel && (
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0", meta.pill)}>
          {statusLabel}
        </span>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

const primaryItems = [
  { icon: LayoutDashboard, label: "Panel",         href: "/clubos/dashboard" },
  { icon: Calendar,        label: "Reservas",      href: "/clubos/dashboard/reservas" },
  { icon: Grid3X3,         label: "Canchas",       href: "/clubos/dashboard/courts" },
  { icon: Users,           label: "Clientes",      href: "/clubos/dashboard/customers" },
  { icon: GraduationCap,   label: "Cursos",        href: "/clubos/dashboard/cursos" },
  { icon: Dumbbell,        label: "Entrenadores",  href: "/clubos/dashboard/trainers" },
  { icon: Tag,            label: "Promociones",   href: "/clubos/dashboard/promotions" },
  { icon: CreditCard,     label: "Membresías",    href: "/clubos/dashboard/memberships" },
  { icon: Trophy,          label: "Torneos",       href: "/clubos/dashboard/tournaments" },
  { icon: Wallet,          label: "Finanzas",      href: "/clubos/dashboard/finanzas" },
  { icon: BarChart3,       label: "Reportes",      href: "/clubos/dashboard/reportes" },
]

const configItems = [
  { icon: UserCircle2, label: "Mi cuenta", href: "/clubos/dashboard/settings/profile" },
  { icon: Building2, label: "Centro", href: "/clubos/dashboard/settings/center" },
  { icon: Settings2, label: "Operación", href: "/clubos/dashboard/settings/operacion" },
  { icon: Bell, label: "Notificaciones", href: "/clubos/dashboard/settings/notificaciones" },
  { icon: ShieldCheck, label: "Equipo y permisos", href: "/clubos/dashboard/settings/team" },
  { icon: LifeBuoy, label: "Ayuda", href: "/clubos/dashboard/settings/help" },
]

/**
 * Map sidebar hrefs → onboarding step keys.
 * Items not in this map are locked during onboarding.
 */
const ONBOARDING_HREF_MAP: Record<string, (typeof ONBOARDING_STEPS)[number]["key"]> = {
  "/clubos/dashboard/settings/profile": "profile",
  "/clubos/dashboard/settings": "center",          // Centro page is also "publish" step
  "/clubos/dashboard/settings/center": "center",
  "/clubos/dashboard/settings/operacion": "operations",
  "/clubos/dashboard/courts": "courts",
  // publish step uses query-param URL but resolves to same pathname as center
}

/** Returns whether a sidebar item's href is reachable during onboarding */
function isOnboardingReachable(
  href: string,
  completedSteps: Record<string, boolean>,
  currentStepKey: string,
): boolean {
  const stepKey = ONBOARDING_HREF_MAP[href]
  if (!stepKey) return false // not an onboarding item → locked

  // The current step is always reachable
  if (stepKey === currentStepKey) return true
  // Completed steps are reachable (can go back)
  if (completedSteps[stepKey]) return true

  return false
}

/** Returns the onboarding indicator status for a config item */
function getOnboardingStatus(
  href: string,
  completedSteps: Record<string, boolean>,
  currentStepKey: string,
): "completed" | "current" | "locked" | "none" {
  const stepKey = ONBOARDING_HREF_MAP[href]
  if (!stepKey) return "locked"

  if (completedSteps[stepKey]) return "completed"
  if (stepKey === currentStepKey) return "current"
  return "locked"
}

export function AppSidebar() {
  const { user, centerId } = useAuth()
  const { can, planIncludes, role } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()
  const { isOnboarding, state: obState, currentStepIndex } = useOnboarding()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [configOpen, setConfigOpen] = useState(
    pathname.startsWith("/clubos/dashboard/settings") || isOnboarding
  )

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
      await signOut(auth)
      router.push("/clubos/login")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isActiveRoute = (href: string) => {
    if (href === "/clubos/dashboard") {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    if (pathname.startsWith("/clubos/dashboard/settings")) {
      setConfigOpen(true)
    }
  }, [pathname])

  // Keep Configuración always open during onboarding
  useEffect(() => {
    if (isOnboarding) setConfigOpen(true)
  }, [isOnboarding])

  const displayName = user?.displayName || "Admin del club"
  const displayEmail = user?.email || "admin@club.com"
  const initial = (displayName?.[0] || displayEmail?.[0] || "A").toUpperCase()

  const [upgradeModal, setUpgradeModal] = useState<{ sectionLabel: string; requiredPlan: ClubPlanId } | null>(null)

  /** Render a sidebar link that may be locked (onboarding or plan) */
  const renderSidebarLink = (
    item: { icon: React.ComponentType<{ className?: string }>; label: string; href: string },
    locked: boolean,
    isActive: boolean,
    obStatus?: "completed" | "current" | "locked" | "none",
    planLocked?: boolean,
  ) => {
    if (planLocked) {
      const module = HREF_TO_MODULE[item.href]
      const minPlan = module ? minimumPlanForModule(module) : null
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => minPlan && setUpgradeModal({ sectionLabel: item.label, requiredPlan: minPlan })}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer select-none"
        >
          <item.icon className="size-4" />
          <span className="truncate flex-1 text-left">{item.label}</span>
          <Zap className="size-3 text-amber-400 flex-shrink-0" />
        </button>
      )
    }
    if (locked) {
      return (
        <span
          key={item.href}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 cursor-not-allowed select-none"
          title="Completá el onboarding para acceder"
        >
          <item.icon className="size-4" />
          <span className="truncate flex-1">{item.label}</span>
          <Lock className="size-3 text-slate-300" />
        </span>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-black",
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted",
          obStatus === "current" && !isActive && "ring-1 ring-primary/30 bg-primary/5",
        )}
      >
        <item.icon className="size-4" />
        <span className="truncate flex-1">{item.label}</span>
        {obStatus === "completed" && (
          <span className="size-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="size-2.5 text-white" strokeWidth={3} />
          </span>
        )}
        {obStatus === "current" && isActive && (
          <span className="relative flex size-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
    <div className="flex flex-col h-screen w-64 border-r bg-card/50 hidden md:flex sticky top-0">
      <div className={cn("p-6", isOnboarding && "flex flex-col items-center")}>
        <Link
          href="/clubos/dashboard"
          className={cn("flex items-center", isOnboarding && "justify-center")}
          aria-label="Ir al dashboard de ClubOS"
        >
          <VoydLogo className="h-8" />
        </Link>
        {isOnboarding && (
          <p className="mt-2 text-[11px] font-semibold text-blue-600 uppercase tracking-widest">
            Configuración inicial
          </p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {isOnboarding ? ONBOARDING_STEPS.map((step, idx) => {
          const done = obState.completed[step.key]
          const isCurrent = idx === currentStepIndex
          const locked = !done && !isCurrent
          const isActive = pathname === step.href || pathname?.startsWith(step.href + "/")

          if (locked) {
            return (
              <div key={step.key} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-slate-400 cursor-not-allowed select-none">
                <span className="size-5 rounded-full border border-slate-300 flex-shrink-0 flex items-center justify-center">
                  <Lock className="size-3 text-slate-300" />
                </span>
                {step.label}
              </div>
            )
          }
          return (
            <Link key={step.key} href={step.href}
              className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                isActive ? "bg-primary/10 text-primary" : done ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-700 hover:bg-primary/5"
              )}
            >
              {done ? (
                <span className="size-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </span>
              ) : (
                <span className="relative flex size-5 items-center justify-center flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full size-5 border-2 border-primary bg-primary/10" />
                </span>
              )}
              <span className={cn(done && "line-through opacity-60")}>{step.label}</span>
            </Link>
          )
        }) : <>
        {/* ── Primary nav items ── */}
        {primaryItems.filter((item) => {
          const module = HREF_TO_MODULE[item.href]
          if (!module) return true
          // Plan-locked items are shown (with Zap indicator) so owner knows what to unlock
          if (!planIncludes(module)) return true
          return can.view(module)
        }).map((item) => {
          const module = HREF_TO_MODULE[item.href]
          const planLocked = !!module && !planIncludes(module)
          const isActive = isActiveRoute(item.href)
          const locked = !planLocked && isOnboarding && !isOnboardingReachable(item.href, obState.completed, obState.currentStep) && !isActive

          if (locked) {
            return renderSidebarLink(item, true, false)
          }

          const obStatus = isOnboarding ? getOnboardingStatus(item.href, obState.completed, obState.currentStep) : "none"
          return renderSidebarLink(item, false, isActive, obStatus, planLocked)
        })}

        <div className="my-3 border-t border-slate-200" />

        {/* ── Configuración section ── */}
        <button
          type="button"
          onClick={() => setConfigOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 mt-2"
        >
          <span className="inline-flex items-center gap-2">
            <UserCircle2 className="size-3.5" />
            Configuración
          </span>
          <ChevronDown className={cn("size-4 transition-transform", configOpen ? "rotate-180" : "")}/>
        </button>
        {configOpen && (
          <div className="space-y-1 pl-2">
            {configItems.filter((item) => {
              const module = HREF_TO_MODULE[item.href]
              return !module || can.view(module)
            }).map((item) => {
              const isActive = isActiveRoute(item.href)
              const locked = isOnboarding && !isOnboardingReachable(item.href, obState.completed, obState.currentStep) && !isActive
              const obStatus = isOnboarding ? getOnboardingStatus(item.href, obState.completed, obState.currentStep) : "none"
              return renderSidebarLink(item, locked, isActive, obStatus)
            })}
          </div>
        )}

        </>}
      </div>

      <div className="p-4 border-t">
        <PlanBadge />
        <div className="flex items-center gap-3 text-black mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="size-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            {initial}
          </div>
          <div className="text-sm min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
            {ROLE_LABELS[role] && (
              <span className={cn("mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full", ROLE_LABELS[role].color)}>
                {ROLE_LABELS[role].label}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4 mr-2" />
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </Button>
      </div>
    </div>
    {upgradeModal && (
      <PlanUpgradeModal
        open
        onClose={() => setUpgradeModal(null)}
        sectionLabel={upgradeModal.sectionLabel}
        requiredPlan={upgradeModal.requiredPlan}
      />
    )}
    </>
  )
}

export function MobileSidebar() {
    const { user, centerId } = useAuth()
    const { can, planIncludes, role } = usePermissions()
    const pathname = usePathname()
    const router = useRouter()
    const { isOnboarding, state: obState, currentStepIndex } = useOnboarding()
    const [open, setOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [configOpen, setConfigOpen] = useState(
      pathname.startsWith("/clubos/dashboard/settings") || isOnboarding
    )

    const handleLogout = async () => {
      if (isLoggingOut) return
      setIsLoggingOut(true)
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include",
        })
        await signOut(auth)
        setOpen(false)
        router.push("/clubos/login")
        router.refresh()
      } finally {
        setIsLoggingOut(false)
      }
    }

    const isActiveRoute = (href: string) => {
      if (href === "/clubos/dashboard") {
        return pathname === href
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    }

    useEffect(() => {
      if (pathname.startsWith("/clubos/dashboard/settings")) {
        setConfigOpen(true)
      }
    }, [pathname])

    useEffect(() => {
      if (isOnboarding) setConfigOpen(true)
    }, [isOnboarding])

    const displayName = user?.displayName || "Admin del club"
    const displayEmail = user?.email || "admin@club.com"
    const initial = (displayName?.[0] || displayEmail?.[0] || "A").toUpperCase()

    const [upgradeModal, setUpgradeModal] = useState<{ sectionLabel: string; requiredPlan: ClubPlanId } | null>(null)

    /** Render a mobile sidebar link */
    const renderMobileLink = (
      item: { icon: React.ComponentType<{ className?: string }>; label: string; href: string },
      locked: boolean,
      isActive: boolean,
      obStatus?: "completed" | "current" | "locked" | "none",
      planLocked?: boolean,
    ) => {
      if (planLocked) {
        const module = HREF_TO_MODULE[item.href]
        const minPlan = module ? minimumPlanForModule(module) : null
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => {
              setOpen(false)
              if (minPlan) setUpgradeModal({ sectionLabel: item.label, requiredPlan: minPlan })
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer select-none"
          >
            <item.icon className="size-4" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            <Zap className="size-3 text-amber-400 flex-shrink-0" />
          </button>
        )
      }
      if (locked) {
        return (
          <span
            key={item.href}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 cursor-not-allowed select-none"
          >
            <item.icon className="size-4" />
            <span className="truncate flex-1">{item.label}</span>
            <Lock className="size-3 text-slate-300" />
          </span>
        )
      }
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-black",
            isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
            obStatus === "current" && !isActive && "ring-1 ring-primary/30 bg-primary/5",
          )}
        >
          <item.icon className="size-4" />
          <span className="truncate flex-1">{item.label}</span>
          {obStatus === "completed" && (
            <span className="size-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="size-2.5 text-white" strokeWidth={3} />
            </span>
          )}
          {obStatus === "current" && isActive && (
            <span className="relative flex size-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
            </span>
          )}
        </Link>
      )
    }

    return (
      <>
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
               <Link href="/clubos/dashboard" className="flex items-center" aria-label="Ir al dashboard de ClubOS">
                 <VoydLogo className="h-7" />
               </Link>
             <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
                 <Menu className="size-5" />
             </Button>
             
             {open && (
                 <div className="absolute top-16 left-0 right-0 bg-background border-b z-50 shadow-lg animate-in slide-in-from-top-5">
                     <nav className="flex flex-col p-4 space-y-2">

                  {/* ── Onboarding progress card (mobile) ── */}
                  {isOnboarding && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 mb-2">
                      <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-2">
                        Configuración inicial — Paso {currentStepIndex + 1} de {ONBOARDING_STEPS.length}
                      </p>
                      <div className="flex gap-1">
                        {ONBOARDING_STEPS.map((step, idx) => (
                          <div
                            key={step.key}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              obState.completed[step.key]
                                ? "bg-emerald-500"
                                : idx === currentStepIndex
                                  ? "bg-primary"
                                  : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Primary items ── */}
                  {primaryItems.filter((item) => {
                    const module = HREF_TO_MODULE[item.href]
                    if (!module) return true
                    if (!planIncludes(module)) return true
                    return can.view(module)
                  }).map((item) => {
                    const module = HREF_TO_MODULE[item.href]
                    const planLocked = !!module && !planIncludes(module)
                    const isActive = isActiveRoute(item.href)
                    const locked = !planLocked && isOnboarding && !isOnboardingReachable(item.href, obState.completed, obState.currentStep) && !isActive
                    const obStatus = isOnboarding ? getOnboardingStatus(item.href, obState.completed, obState.currentStep) : "none"
                    return renderMobileLink(item, locked, isActive, obStatus, planLocked)
                  })}

                        <div className="my-1 border-t border-slate-200" />

                        {/* ── Configuración ── */}
                        <button
                          type="button"
                          onClick={() => setConfigOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          <span className="inline-flex items-center gap-2">
                            <UserCircle2 className="size-3.5" /> Configuración
                          </span>
                          <ChevronDown className={cn("size-4 transition-transform", configOpen ? "rotate-180" : "")}/>
                        </button>
                        {configOpen && (
                          <div className="space-y-1 pl-2">
                            {configItems.filter((item) => {
                              const module = HREF_TO_MODULE[item.href]
                              return !module || can.view(module)
                            }).map((item) => {
                              const isActive = isActiveRoute(item.href)
                              const locked = isOnboarding && !isOnboardingReachable(item.href, obState.completed, obState.currentStep) && !isActive
                              const obStatus = isOnboarding ? getOnboardingStatus(item.href, obState.completed, obState.currentStep) : "none"
                              return renderMobileLink(item, locked, isActive, obStatus)
                            })}
                          </div>
                        )}

                        <PlanBadge />
                        <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                            {ROLE_LABELS[role] && (
                              <span className={cn("mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full", ROLE_LABELS[role].color)}>
                                {ROLE_LABELS[role].label}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="justify-start mt-2"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          <LogOut className="size-4 mr-2" />
                          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                        </Button>
                     </nav>
                 </div>
             )}
        </div>
    {upgradeModal && (
      <PlanUpgradeModal
        open
        onClose={() => setUpgradeModal(null)}
        sectionLabel={upgradeModal.sectionLabel}
        requiredPlan={upgradeModal.requiredPlan}
      />
    )}
    </>
  )
}