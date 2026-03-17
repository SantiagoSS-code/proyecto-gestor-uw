"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Trophy, ClipboardList, Swords, BarChart2, Settings2 } from "lucide-react"

const TABS = [
  { label: "Resumen",        href: "/clubos/dashboard/tournaments",                   icon: LayoutDashboard },
  { label: "Torneos",        href: "/clubos/dashboard/tournaments/list",              icon: Trophy },
  { label: "Inscripciones",  href: "/clubos/dashboard/tournaments/registrations",     icon: ClipboardList },
  { label: "Partidos",       href: "/clubos/dashboard/tournaments/matches",           icon: Swords },
  { label: "Resultados",     href: "/clubos/dashboard/tournaments/results",           icon: BarChart2 },
  { label: "Ajustes",        href: "/clubos/dashboard/tournaments/settings",         icon: Settings2 },
]

export function TournamentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Torneos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creá y gestioná torneos, inscripciones, fixtures y resultados para tu club.
        </p>
      </div>

      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/clubos/dashboard/tournaments"
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

      <div>{children}</div>
    </div>
  )
}
