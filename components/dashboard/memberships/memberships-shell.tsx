"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, CreditCard, Users2, Gift, Zap, BarChart2 } from "lucide-react"

const TABS = [
  { label: "Resumen",        href: "/clubos/dashboard/memberships",                  icon: LayoutDashboard },
  { label: "Planes",         href: "/clubos/dashboard/memberships/plans",            icon: CreditCard },
  { label: "Suscriptores",   href: "/clubos/dashboard/memberships/subscribers",      icon: Users2 },
  { label: "Beneficios",     href: "/clubos/dashboard/memberships/benefits",         icon: Gift },
  { label: "Reglas",         href: "/clubos/dashboard/memberships/rules",            icon: Zap },
  { label: "Resultados",     href: "/clubos/dashboard/memberships/results",          icon: BarChart2 },
]

export function MembershipsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Membresías</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creá planes recurrentes, gestioná suscriptores y configurá beneficios dinámicos.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/clubos/dashboard/memberships"
                ? pathname === href
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}
