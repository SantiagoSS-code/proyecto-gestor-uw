"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Plus, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"

const tabs = [
  { label: "Overview",      href: "/clubos/dashboard/cursos" },
  { label: "Cursos",        href: "/clubos/dashboard/cursos/courses" },
  { label: "Sesiones",      href: "/clubos/dashboard/cursos/sessions" },
  { label: "Inscripciones", href: "/clubos/dashboard/cursos/enrollments" },
  { label: "Coaches",       href: "/clubos/dashboard/cursos/coaches" },
  { label: "Pagos",         href: "/clubos/dashboard/cursos/payments" },
  { label: "Asistencia",    href: "/clubos/dashboard/cursos/attendance" },
  { label: "Reportes",      href: "/clubos/dashboard/cursos/reports" },
  { label: "Config",        href: "/clubos/dashboard/cursos/settings" },
]

export function CoursesNav() {
  const pathname = usePathname()
  const isActive = (href: string) => {
    if (href === "/clubos/dashboard/cursos") return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100">
            <GraduationCap className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cursos</h1>
            <p className="text-sm text-slate-500">Programas estructurados, academias y packs de clases</p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/clubos/dashboard/cursos/create">
            <Plus className="h-4 w-4" />
            Nuevo curso
          </Link>
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0.5 overflow-x-auto scrollbar-none border-b border-slate-200">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              isActive(tab.href)
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
