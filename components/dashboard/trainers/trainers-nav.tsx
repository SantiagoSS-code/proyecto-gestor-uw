"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Plus, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"

const tabs = [
  { label: "Overview",       href: "/clubos/dashboard/trainers" },
  { label: "Clases",         href: "/clubos/dashboard/trainers/classes" },
  { label: "Agenda",         href: "/clubos/dashboard/trainers/schedule" },
  { label: "Liquidaciones",  href: "/clubos/dashboard/trainers/settlements" },
]

export function TrainersNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/clubos/dashboard/trainers") return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100">
            <Dumbbell className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrenadores</h1>
            <p className="text-sm text-slate-500">Clases privadas, grupales y liquidaciones</p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700">
          <Link href="/clubos/dashboard/trainers/new">
            <Plus className="h-4 w-4" />
            Nuevo entrenador
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
                ? "border-amber-600 text-amber-700"
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
