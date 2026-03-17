"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getPlans, getSubscriptions, getUsageByClub, calcMRR, currentMonthKey,
} from "@/lib/memberships"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart2, Users2, DollarSign, Wallet, Repeat } from "lucide-react"
import type { MembershipPlanDoc, MembershipSubscriptionDoc, MembershipUsageDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

interface PlanStat {
  plan: MembershipPlanDoc
  activeCount: number
  mrr: number
  avgReservationsUsed: number
  totalDiscountsUsed: number
  totalSavings: number
  renewalRate: number
}

export function MembershipsResults() {
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

  const monthKey = currentMonthKey()
  const thisMonthUsage = usage.filter((u) => u.monthKey === monthKey)

  const stats: PlanStat[] = plans.map((plan) => {
    const planSubs = subs.filter((s) => s.planId === plan.id)
    const activeSubs = planSubs.filter((s) => s.status === "active" || s.status === "trial")
    const planUsage = thisMonthUsage.filter((u) =>
      planSubs.some((s) => s.id === u.subscriptionId),
    )

    const mrr = calcMRR(activeSubs, [plan])
    const avgReservations = planUsage.length > 0
      ? Math.round(planUsage.reduce((acc, u) => acc + u.reservationsUsed, 0) / planUsage.length)
      : 0
    const totalDiscounts = planUsage.reduce((acc, u) => acc + u.discountsUsed, 0)
    const totalSavings = planUsage.reduce((acc, u) => acc + u.savingsAmount, 0)

    // Renewal rate: active / (active + canceled)
    const canceledCount = planSubs.filter((s) => s.status === "canceled").length
    const total = activeSubs.length + canceledCount
    const renewalRate = total > 0 ? Math.round((activeSubs.length / total) * 100) : 0

    return {
      plan, activeCount: activeSubs.length, mrr,
      avgReservationsUsed: avgReservations,
      totalDiscountsUsed: totalDiscounts,
      totalSavings, renewalRate,
    }
  }).filter((s) => s.activeCount > 0 || subs.some((sub) => sub.planId === s.plan.id))

  const totalMRR = calcMRR(subs.filter((s) => s.status === "active"), plans)
  const totalActive = subs.filter((s) => s.status === "active" || s.status === "trial").length
  const totalSavings = thisMonthUsage.reduce((acc, u) => acc + u.savingsAmount, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Global summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-50"><Users2 className="size-5 text-emerald-600" /></span>
            <div>
              <p className="text-xs text-muted-foreground">Activos totales</p>
              <p className="text-2xl font-bold">{totalActive}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-50"><DollarSign className="size-5 text-blue-600" /></span>
            <div>
              <p className="text-xs text-muted-foreground">MRR total</p>
              <p className="text-2xl font-bold">{fmtARS(totalMRR)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="p-2 rounded-lg bg-violet-50"><Wallet className="size-5 text-violet-600" /></span>
            <div>
              <p className="text-xs text-muted-foreground">Ahorros este mes</p>
              <p className="text-2xl font-bold">{fmtARS(totalSavings)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-plan stats */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart2 className="size-4 text-primary" /> Resultados por plan
        </h3>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos suficientes.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map(({ plan, activeCount, mrr, avgReservationsUsed, totalDiscountsUsed, totalSavings, renewalRate }) => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="truncate">{plan.name}</span>
                    <Badge className={cn(
                      "text-xs ml-2",
                      plan.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                    )}>
                      {plan.status === "active" ? "Activo" : plan.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1"><Users2 className="size-3.5" />Suscriptores activos</dt>
                      <dd className="font-medium">{activeCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1"><DollarSign className="size-3.5" />MRR</dt>
                      <dd className="font-medium">{fmtARS(mrr)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Prom. reservas/mes</dt>
                      <dd className="font-medium">{avgReservationsUsed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Descuentos usados</dt>
                      <dd className="font-medium">{totalDiscountsUsed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1"><Wallet className="size-3.5" />Ahorros otorgados</dt>
                      <dd className="font-medium">{fmtARS(totalSavings)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1"><Repeat className="size-3.5" />Tasa de renovación</dt>
                      <dd className="font-medium">{renewalRate}%</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
