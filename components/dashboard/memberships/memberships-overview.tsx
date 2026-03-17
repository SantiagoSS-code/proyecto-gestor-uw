"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getPlans, getSubscriptions, getUsageByClub, calcMRR, currentMonthKey,
} from "@/lib/memberships"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users2, DollarSign, TrendingDown, Gift, Wallet, Star, CalendarClock,
} from "lucide-react"
import type { MembershipPlanDoc, MembershipSubscriptionDoc, MembershipUsageDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  trial:    "bg-blue-100 text-blue-700",
  paused:   "bg-amber-100 text-amber-700",
  canceled: "bg-slate-100 text-slate-500",
  past_due: "bg-red-100 text-red-600",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Activo", trial: "Prueba", paused: "Pausado",
  canceled: "Cancelado", past_due: "Vencido",
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

export function MembershipsOverview() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<MembershipPlanDoc[]>([])
  const [subs, setSubs] = useState<MembershipSubscriptionDoc[]>([])
  const [usage, setUsage] = useState<MembershipUsageDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const clubId = user.uid
    Promise.all([getPlans(clubId), getSubscriptions(clubId), getUsageByClub(clubId)])
      .then(([p, s, u]) => { setPlans(p); setSubs(s); setUsage(u) })
      .finally(() => setLoading(false))
  }, [user?.uid])

  const active = subs.filter((s) => s.status === "active" || s.status === "trial")
  const mrr = calcMRR(subs, plans)
  const monthKey = currentMonthKey()
  const thisMonthUsage = usage.filter((u) => u.monthKey === monthKey)
  const benefitsUsed = thisMonthUsage.reduce((s, u) => s + (u.discountsUsed ?? 0), 0)
  const savingsGiven = thisMonthUsage.reduce((s, u) => s + (u.savingsAmount ?? 0), 0)

  // Most popular plan
  const planCounts = new Map<string, number>()
  subs.filter((s) => s.status === "active").forEach((s) => {
    planCounts.set(s.planId, (planCounts.get(s.planId) ?? 0) + 1)
  })
  const topPlanId = [...planCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topPlan = plans.find((p) => p.id === topPlanId)

  // Upcoming renewals (next 7 days)
  const now = new Date()
  const in7 = new Date(now.getTime() + 7 * 86400_000)
  const upcoming = subs.filter((s) => {
    if (!s.renewsAt) return false
    const d: Date = typeof s.renewsAt.toDate === "function" ? s.renewsAt.toDate() : new Date(s.renewsAt)
    return d >= now && d <= in7
  })

  // Churn rate: canceled / total  (placeholder if not enough data)
  const canceled = subs.filter((s) => s.status === "canceled").length
  const churnPct = subs.length > 0 ? Math.round((canceled / subs.length) * 100) : 0

  const recent5 = [...subs]
    .sort((a, b) => {
      const at = (v: any) => typeof v?.toDate === "function" ? v.toDate().getTime() : new Date(v ?? 0).getTime()
      return at(b.createdAt) - at(a.createdAt)
    })
    .slice(0, 5)

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Suscriptores activos"  value={String(active.length)}   icon={Users2} />
        <KpiCard title="MRR"                   value={fmtARS(mrr)}             icon={DollarSign} />
        <KpiCard title="Churn rate"            value={`${churnPct}%`}          icon={TrendingDown} />
        <KpiCard title="Beneficios usados"     value={String(benefitsUsed)}    icon={Gift} />
        <KpiCard title="Ahorros dados"         value={fmtARS(savingsGiven)}    icon={Wallet} />
        <KpiCard title="Plan más popular"      value={topPlan?.name ?? "—"}    icon={Star} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Plan performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="size-4 text-primary" /> Rendimiento por plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plans.filter((p) => p.status === "active").length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin planes activos.</p>
            ) : (
              <ul className="space-y-2">
                {plans.filter((p) => p.status === "active").map((p) => {
                  const count = subs.filter((s) => s.planId === p.id && s.status === "active").length
                  return (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                      <span className="text-muted-foreground">{count} suscriptores</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming renewals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Próximas renovaciones (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin renovaciones próximas.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[140px]">{s.userName ?? s.userEmail ?? s.userId}</span>
                    <span className="text-muted-foreground">{fmtDate(s.renewsAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently joined */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users2 className="size-4 text-primary" /> Nuevos suscriptores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent5.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin suscriptores aún.</p>
            ) : (
              <ul className="space-y-2">
                {recent5.map((s) => {
                  const plan = plans.find((p) => p.id === s.planId)
                  return (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium truncate max-w-[140px]">{s.userName ?? s.userEmail ?? s.userId}</p>
                        <p className="text-xs text-muted-foreground">{plan?.name ?? "—"}</p>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500")}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
