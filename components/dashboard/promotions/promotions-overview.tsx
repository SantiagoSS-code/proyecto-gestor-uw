"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDiscounts, getRedemptions, getCampaigns } from "@/lib/promotions"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket, TrendingUp, DollarSign, Percent, CalendarClock, Megaphone } from "lucide-react"
import type { DiscountDoc, DiscountRedemptionDoc, CampaignDoc } from "@/lib/types"

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    draft: "bg-slate-100 text-slate-600",
    expired: "bg-red-100 text-red-600",
  }
  const labels: Record<string, string> = {
    active: "Activo",
    paused: "Pausado",
    draft: "Borrador",
    expired: "Expirado",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {labels[status] ?? status}
    </span>
  )
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

export function PromotionsOverview() {
  const { user } = useAuth()
  const [discounts, setDiscounts] = useState<DiscountDoc[]>([])
  const [redemptions, setRedemptions] = useState<DiscountRedemptionDoc[]>([])
  const [campaigns, setCampaigns] = useState<CampaignDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const clubId = user.uid
    Promise.all([getDiscounts(clubId), getRedemptions(clubId), getCampaigns(clubId)])
      .then(([d, r, c]) => { setDiscounts(d); setRedemptions(r); setCampaigns(c) })
      .finally(() => setLoading(false))
  }, [user?.uid])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeCount = discounts.filter((d) => d.status === "active").length
  const redeemedThisMonth = redemptions.filter((r) => {
    const date: Date =
      typeof r.redeemedAt?.toDate === "function" ? r.redeemedAt.toDate() : new Date(r.redeemedAt)
    return date >= startOfMonth
  })

  const totalDiscountGiven = redemptions.reduce((s, r) => s + (r.discountAmount ?? 0), 0)
  const revenueFromPromotions = redemptions.reduce((s, r) => s + (r.finalAmount ?? 0), 0)
  const redemptionRate =
    discounts.length > 0
      ? Math.round((redemptions.length / discounts.reduce((s, d) => s + (d.usageLimitTotal ?? 0), 0)) * 100)
      : 0

  const upcoming = discounts.filter((d) => {
    if (d.status !== "draft" && d.status !== "active") return false
    const start: Date =
      typeof d.startAt?.toDate === "function" ? d.startAt.toDate() : new Date(d.startAt ?? 0)
    return start > now
  })

  const recent5 = [...redemptions].slice(0, 5)
  const best5 = [...discounts].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Promociones activas" value={String(activeCount)} icon={Ticket} />
        <KpiCard title="Canjes este mes" value={String(redeemedThisMonth.length)} icon={TrendingUp} />
        <KpiCard title="Ingresos generados" value={fmtARS(revenueFromPromotions)} icon={DollarSign} />
        <KpiCard title="Total descuentos dados" value={fmtARS(totalDiscountGiven)} icon={Percent} />
        <KpiCard title="Tasa de canje" value={`${redemptionRate}%`} icon={TrendingUp} />
        <KpiCard title="Próximas promociones" value={String(upcoming.length)} icon={CalendarClock} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Best performing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ticket className="size-4 text-primary" /> Mejores promociones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {best5.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ul className="space-y-2">
                {best5.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[160px]">{d.name}</span>
                    <span className="text-muted-foreground">{d.usageCount ?? 0} canjes</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently redeemed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Últimos canjes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent5.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin canjes registrados.</p>
            ) : (
              <ul className="space-y-2">
                {recent5.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[160px]">{r.bookingId}</span>
                    <span className="font-medium text-rose-600">-{fmtARS(r.discountAmount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="size-4 text-primary" /> Campañas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.filter((c) => c.status === "active").length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay campañas activas.</p>
            ) : (
              <ul className="space-y-2">
                {campaigns
                  .filter((c) => c.status === "active")
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[160px]">{c.name}</span>
                      {statusBadge(c.status)}
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
