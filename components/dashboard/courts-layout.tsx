"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, LayoutDashboard, Grid2X2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface CourtsLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

const navItems = [
  { href: "/dashboard-centros", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard-centros/courts", label: "Canchas", icon: Grid2X2 },
  { href: "/dashboard-centros/settings", label: "Configuración", icon: Settings },
]

export function CourtsLayout({ title, description, children }: CourtsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <aside className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 h-fit">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-slate-900">courtly</span>
            </Link>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <section className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {description ? <p className="text-black mt-2">{description}</p> : null}
            </div>
            {children}
          </section>
        </div>
      </div>
    </div>
  )
}
