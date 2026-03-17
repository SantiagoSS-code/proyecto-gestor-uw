"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Ticket, Megaphone, Users2, Sparkles, BarChart2 } from "lucide-react"

const TABS = [
  { label: "Resumen",            href: "/clubos/dashboard/promotions",              icon: LayoutDashboard },
  { label: "Cupones",            href: "/clubos/dashboard/promotions/coupons",      icon: Ticket },
  { label: "Campañas",           href: "/clubos/dashboard/promotions/campaigns",    icon: Megaphone },
  { label: "Audiencias",         href: "/clubos/dashboard/promotions/audiences",    icon: Users2 },
  { label: "IA",                 href: "/clubos/dashboard/promotions/ai",           icon: Sparkles },
  { label: "Resultados",         href: "/clubos/dashboard/promotions/results",      icon: BarChart2 },
]

export function PromotionsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promociones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestioná descuentos, cupones y campañas para tus jugadores.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/clubos/dashboard/promotions"
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
