"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  computeRetentionMetrics,
  type BookingRecord,
  type RetentionMetrics,
  type PlayerStats,
} from "@/lib/retention-analytics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Cell,
} from "recharts"
import {
  Users, UserCheck, UserX, RefreshCw, Activity, TrendingUp, TrendingDown,
  BarChart3, Download, Search, ChevronDown, ChevronUp,
} from "lucide-react"

// ─── Sub-components ───────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  borderRadius: "8px", border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px",
}

function fmtPct(v: number) { return `${v.toFixed(1)}%` }

function RetentionKpi({
  label, value, description, icon: Icon, loading, accent = false,
}: {
  label: string; value: string; description?: string
  icon: React.ElementType; loading: boolean; accent?: boolean
}) {
  return (
    <Card className={cn(
      "border-none shadow-sm transition-all duration-200",
      accent
        ? "bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15"
        : "bg-card/60 hover:bg-card/100",
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">{label}</CardTitle>
        <div className={cn("p-1.5 rounded-md", accent ? "bg-primary/15" : "bg-slate-100")}>
          <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-slate-500")} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", accent ? "text-primary" : "text-slate-900")}>
          {loading
            ? <span className="inline-block h-8 w-24 rounded bg-slate-200 animate-pulse" />
            : value}
        </div>
        {description && <p className="text-xs mt-1 text-slate-400">{description}</p>}
      </CardContent>
    </Card>
  )
}

function Skeleton({ h = 260 }: { h?: number }) {
  return <div className="w-full rounded-lg bg-slate-100 animate-pulse" style={{ height: h }} />
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

const STATUS_CFG: Record<PlayerStats["status"], { label: string; class: string }> = {
  active:  { label: "Activo",    class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk: { label: "En riesgo", class: "bg-amber-50 text-amber-700 border-amber-200" },
  churned: { label: "Churned",   class: "bg-red-50 text-red-600 border-red-200" },
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const DIST_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e"]

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  bookings: BookingRecord[]
  loading: boolean
}

export function PlayerRetention({ bookings, loading }: Props) {
  const [search, setSearch] = useState("")
  const [sortCol, setSortCol] = useState<"bookings" | "days">("bookings")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [tableLimit, setTableLimit] = useState(20)

  const metrics = useMemo<RetentionMetrics | null>(() => {
    if (loading || bookings.length === 0) return null
    return computeRetentionMetrics(bookings)
  }, [bookings, loading])

  // Player table with search + sort
  const filteredPlayers = useMemo(() => {
    if (!metrics) return []
    let list = metrics.playerTable
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.displayName.toLowerCase().includes(q) || p.userId.toLowerCase().includes(q),
      )
    }
    list = [...list].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (sortCol === "bookings") return mul * (a.bookingsCount - b.bookingsCount)
      return mul * (a.daysSinceLastBooking - b.daysSinceLastBooking)
    })
    return list
  }, [metrics, search, sortCol, sortDir])

  function toggleSort(col: "bookings" | "days") {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }

  function handleExport() {
    if (!metrics) return
    const header = ["Jugador", "Reservas", "Primera reserva", "Última reserva", "Días inactivo", "Estado"]
    const rows = metrics.playerTable.map(p => [
      p.displayName,
      String(p.bookingsCount),
      p.firstBookingAt.toLocaleDateString("es-AR"),
      p.lastBookingAt.toLocaleDateString("es-AR"),
      String(p.daysSinceLastBooking),
      STATUS_CFG[p.status].label,
    ])
    downloadCSV([header, ...rows], "retención_jugadores.csv")
  }

  const SortIcon = ({ col }: { col: "bookings" | "days" }) =>
    sortCol === col
      ? sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : null

  return (
    <div className="space-y-6">

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <RetentionKpi
          label="Retención 7 días"
          value={metrics ? fmtPct(metrics.retention7d) : "—"}
          description="Volvieron dentro de 7 días"
          icon={RefreshCw} loading={loading} accent
        />
        <RetentionKpi
          label="Retención 30 días"
          value={metrics ? fmtPct(metrics.retention30d) : "—"}
          description="Volvieron dentro de 30 días"
          icon={UserCheck} loading={loading} accent
        />
        <RetentionKpi
          label="Retención mensual"
          value={metrics ? fmtPct(metrics.monthlyRetentionAvg) : "—"}
          description="Promedio mes a mes"
          icon={TrendingUp} loading={loading}
        />
        <RetentionKpi
          label="Churn rate"
          value={metrics ? fmtPct(metrics.churnRate) : "—"}
          description={metrics ? `${metrics.churnPlayers} jugadores (60+ días)` : "Sin actividad 60+ días"}
          icon={UserX} loading={loading}
        />
        <RetentionKpi
          label="Frecuencia promedio"
          value={metrics ? metrics.avgBookingFrequency.toFixed(1) : "—"}
          description="Reservas / jugador"
          icon={Activity} loading={loading}
        />
      </div>

      {/* ── New vs Returning summary cards ─────────────────────────────────── */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-50">
                  <Users className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jugadores únicos</p>
                  <p className="text-2xl font-bold text-slate-900">{metrics.totalPlayers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50">
                  <UserCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jugadores recurrentes</p>
                  <p className="text-2xl font-bold text-slate-900">{metrics.returningPlayers}</p>
                  <p className="text-xs text-slate-400">
                    {metrics.totalPlayers > 0 ? fmtPct(metrics.returningPlayers / metrics.totalPlayers * 100) : "0%"} del total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jugadores nuevos (últimos 30d)</p>
                  <p className="text-2xl font-bold text-slate-900">{metrics.newPlayers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Charts row 1 — Monthly Retention Curve + New vs Returning ──────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Retention Curve */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Retención mensual</CardTitle>
            <CardDescription>% de jugadores que volvieron al mes siguiente</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton h={260} /> :
              !metrics || metrics.monthlyRetentionCurve.length === 0
                ? <EmptyChart message="Se necesitan al menos 2 meses de datos" />
                : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.monthlyRetentionCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                          domain={[0, 100]} tickFormatter={v => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v: number, name: string) => [
                            `${v.toFixed(1)}%`,
                            name === "retentionPct" ? "Retención" : name,
                          ]}
                        />
                        <Line
                          type="monotone" dataKey="retentionPct" name="retentionPct"
                          stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
          </CardContent>
        </Card>

        {/* New vs Returning */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Nuevos vs Recurrentes</CardTitle>
            <CardDescription>Composición mensual de jugadores</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton h={260} /> :
              !metrics || metrics.newVsReturning.length === 0
                ? <EmptyChart message="Sin datos suficientes" />
                : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.newVsReturning}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="newPlayers" name="Nuevos" fill="#06b6d4" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="returningPlayers" name="Recurrentes" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
          </CardContent>
        </Card>
      </div>

      {/* ── Chart row 2 — Booking Distribution ────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Distribución de actividad</CardTitle>
          <CardDescription>Jugadores agrupados por cantidad de reservas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton h={220} /> :
            !metrics || metrics.bookingDistribution.every(d => d.count === 0)
              ? <EmptyChart message="Sin datos de reservas" />
              : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.bookingDistribution} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                        label={{ value: "Reservas", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94a3b8" }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}
                        label={{ value: "Jugadores", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#94a3b8" }}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Jugadores"]} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {metrics.bookingDistribution.map((_, i) => (
                          <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
        </CardContent>
      </Card>

      {/* ── Player Activity Table ──────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Actividad de jugadores</CardTitle>
            <CardDescription>Detalle individual de retención y frecuencia</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar jugador…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!metrics}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton h={300} /> :
            filteredPlayers.length === 0
              ? <EmptyChart message={search ? "Sin resultados para tu búsqueda" : "Sin jugadores con reservas"} />
              : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60">
                          <TableHead className="text-xs">Jugador</TableHead>
                          <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort("bookings")}>
                            Reservas <SortIcon col="bookings" />
                          </TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Primera reserva</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Última reserva</TableHead>
                          <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort("days")}>
                            Días inactivo <SortIcon col="days" />
                          </TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.slice(0, tableLimit).map(p => {
                          const cfg = STATUS_CFG[p.status]
                          return (
                            <TableRow key={p.userId} className="hover:bg-slate-50/50">
                              <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.displayName}</TableCell>
                              <TableCell className="text-sm tabular-nums">{p.bookingsCount}</TableCell>
                              <TableCell className="text-sm text-slate-500 hidden md:table-cell">
                                {p.firstBookingAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500 hidden md:table-cell">
                                {p.lastBookingAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {p.daysSinceLastBooking}d
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("text-xs font-medium border", cfg.class)}>{cfg.label}</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredPlayers.length > tableLimit && (
                    <div className="flex justify-center mt-4">
                      <Button variant="outline" size="sm" onClick={() => setTableLimit(l => l + 30)}>
                        Mostrar más ({filteredPlayers.length - tableLimit} restantes)
                      </Button>
                    </div>
                  )}
                </>
              )}
        </CardContent>
      </Card>

      {/* ── Future placeholders (not visible to user yet) ──────────────────── */}
      {/* retentionBySport, retentionByCourt, retentionByWeekday,
          retentionByMembershipPlan, retentionByAcquisitionChannel
          → structured in lib/retention-analytics.ts getRetentionPlaceholders() */}
    </div>
  )
}
