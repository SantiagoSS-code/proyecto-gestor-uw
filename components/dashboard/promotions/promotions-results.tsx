"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDiscounts, getRedemptions } from "@/lib/promotions"
import { Card, CardContent } from "@/components/ui/card"
import { KpiCard } from "@/components/dashboard/kpi-card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BarChart2, DollarSign, Percent, Ticket, TrendingUp } from "lucide-react"
import type { DiscountDoc, DiscountRedemptionDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  expired: "bg-red-100 text-red-600",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Activo", paused: "Pausado", draft: "Borrador", expired: "Expirado",
}
const TYPE_LABELS: Record<string, string> = {
  percentage: "Porcentaje", fixed: "Monto fijo", special_price: "Precio especial",
}
const AUD_LABELS: Record<string, string> = {
  all: "Todos", selected: "Seleccionados", segment: "Segmento",
}

interface DiscountRow {
  discount: DiscountDoc
  issued: number
  redeemed: number
  revenueGenerated: number
  totalDiscountGiven: number
  redemptionRate: number
  roiEstimate: number
}

export function PromotionsResults() {
  const { user } = useAuth()
  const [discounts, setDiscounts] = useState<DiscountDoc[]>([])
  const [redemptions, setRedemptions] = useState<DiscountRedemptionDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const clubId = user.uid
    Promise.all([getDiscounts(clubId), getRedemptions(clubId)])
      .then(([d, r]) => { setDiscounts(d); setRedemptions(r) })
      .finally(() => setLoading(false))
  }, [user?.uid])

  // Build per-discount stats
  const rows: DiscountRow[] = discounts.map((d) => {
    const reds = redemptions.filter((r) => r.discountId === d.id)
    const issued = d.usageLimitTotal ?? d.usageCount ?? 0
    const redeemed = reds.length
    const revenueGenerated = reds.reduce((s, r) => s + (r.finalAmount ?? 0), 0)
    const totalDiscountGiven = reds.reduce((s, r) => s + (r.discountAmount ?? 0), 0)
    const redemptionRate = issued > 0 ? Math.round((redeemed / issued) * 100) : 0
    // Simple ROI: (revenue generated - discount cost) / discount cost * 100
    const roiEstimate = totalDiscountGiven > 0
      ? Math.round(((revenueGenerated - totalDiscountGiven) / totalDiscountGiven) * 100)
      : 0

    return { discount: d, issued, redeemed, revenueGenerated, totalDiscountGiven, redemptionRate, roiEstimate }
  })

  const totals = {
    issued: rows.reduce((s, r) => s + r.issued, 0),
    redeemed: rows.reduce((s, r) => s + r.redeemed, 0),
    revenue: rows.reduce((s, r) => s + r.revenueGenerated, 0),
    discount: rows.reduce((s, r) => s + r.totalDiscountGiven, 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Resultados</h2>
        <p className="text-sm text-muted-foreground">Análisis de rendimiento de cada promoción.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Cupones emitidos" value={String(totals.issued)} icon={Ticket} />
        <KpiCard title="Cupones canjeados" value={String(totals.redeemed)} icon={TrendingUp} />
        <KpiCard title="Ingresos generados" value={fmtARS(totals.revenue)} icon={DollarSign} />
        <KpiCard title="Total descuentos" value={fmtARS(totals.discount)} icon={Percent} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <BarChart2 className="size-10 opacity-30" />
            <p className="text-sm">Sin datos de promociones aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promoción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Audiencia</TableHead>
                <TableHead className="text-right">Emitidos</TableHead>
                <TableHead className="text-right">Canjeados</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Descuento dado</TableHead>
                <TableHead className="text-right">ROI est.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ discount: d, issued, redeemed, revenueGenerated, totalDiscountGiven, redemptionRate, roiEstimate }) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{d.name}</p>
                      <code className="text-xs text-muted-foreground font-mono">{d.code}</code>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{TYPE_LABELS[d.type]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{AUD_LABELS[d.audienceType] ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{issued}</TableCell>
                  <TableCell className="text-right text-sm">{redeemed}</TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={cn("font-medium", redemptionRate >= 50 ? "text-emerald-600" : redemptionRate > 0 ? "text-amber-600" : "text-muted-foreground")}>
                      {redemptionRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmtARS(revenueGenerated)}</TableCell>
                  <TableCell className="text-right text-sm text-rose-600">-{fmtARS(totalDiscountGiven)}</TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={cn("font-medium", roiEstimate >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {roiEstimate >= 0 ? "+" : ""}{roiEstimate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[d.status] ?? "bg-slate-100 text-slate-500")}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
