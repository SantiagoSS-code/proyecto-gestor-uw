"use client"

import React from "react"
import {
  DollarSign, CalendarDays, Users, CreditCard, BarChart2,
  Clock, TrendingUp, Percent, Activity, Ban, UserCheck,
  Calendar, LayoutGrid, Target
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DASHBOARD_CUSTOMIZE_SECTIONS } from "@/lib/dashboard-customize-config"

// ─── Build label lookup from config ──────────────────────────
const LABEL_MAP = new Map<string, string>()
const SECTION_MAP = new Map<string, string>()
DASHBOARD_CUSTOMIZE_SECTIONS.forEach((s) =>
  s.groups.forEach((g) =>
    g.metrics.forEach((m) => {
      LABEL_MAP.set(m.id, m.label)
      SECTION_MAP.set(m.id, s.label)
    })
  )
)

// ─── Icon map by category keyword ───────────────────────────
function iconForMetric(id: string): React.ElementType {
  const section = SECTION_MAP.get(id) ?? ""
  if (section === "Finanzas") return DollarSign
  if (section === "Reportes") return BarChart2
  if (section === "Reservas") return CalendarDays
  if (section === "Clientes") return Users
  if (section === "Membresías") return CreditCard

  if (id.includes("revenue") || id.includes("Revenue") || id.includes("payment") || id.includes("Payment")) return DollarSign
  if (id.includes("booking") || id.includes("Booking") || id.includes("cancel")) return CalendarDays
  if (id.includes("client") || id.includes("Client") || id.includes("user")) return Users
  if (id.includes("membership") || id.includes("Membership") || id.includes("plan")) return CreditCard
  if (id.includes("occupancy") || id.includes("court") || id.includes("Court")) return LayoutGrid
  if (id.includes("hour") || id.includes("Hour") || id.includes("peak") || id.includes("time")) return Clock
  if (id.includes("trend") || id.includes("growth") || id.includes("Growth")) return TrendingUp
  if (id.includes("rate") || id.includes("Rate") || id.includes("churn")) return Percent
  if (id.includes("cancel")) return Ban
  if (id.includes("active") || id.includes("Active")) return Activity
  if (id.includes("confirmed") || id.includes("upcoming")) return UserCheck
  return Target
}

// ─── Placeholder widget card ────────────────────────────────
export function MetricPlaceholderCard({ metricId }: { metricId: string }) {
  const label = LABEL_MAP.get(metricId) ?? metricId
  const section = SECTION_MAP.get(metricId) ?? ""
  const Icon = iconForMetric(metricId)

  return (
    <Card className="border-none shadow-sm bg-card/60 hover:bg-card/100 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-black">{label}</CardTitle>
        <Icon className="h-4 w-4 text-black" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground/30">—</div>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="opacity-70">{section}</span>
          <span className="mx-1">·</span>
          <span className="text-primary/60 font-medium">Próximamente</span>
        </p>
      </CardContent>
    </Card>
  )
}

// ─── IDs that are rendered by hardcoded sections in page.tsx ─
// These are handled natively; the registry returns null for them
// so page.tsx keeps rendering them with full data.
export const NATIVE_WIDGET_IDS = new Set([
  "totalRevenue",
  "bookingsList",
  "totalClients",
  "revenueByDay",
  "bookingsByHour",
  "upcomingBookings",
  "confirmedToday",
])

/**
 * Returns a React element for a metric that is NOT natively rendered.
 * Native widgets return null (handled inline by page.tsx).
 */
export function renderWidget(metricId: string): React.ReactNode | null {
  if (NATIVE_WIDGET_IDS.has(metricId)) return null
  return <MetricPlaceholderCard key={metricId} metricId={metricId} />
}
