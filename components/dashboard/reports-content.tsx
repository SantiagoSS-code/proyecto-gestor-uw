"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts"
import {
  DollarSign, CalendarDays, Users, TrendingUp, TrendingDown, XCircle, Download,
  BarChart3, Activity, Target, Zap, Crown, AlertTriangle, ChevronDown,
  Clock, CheckCircle2, AlertCircle, Lightbulb, Trophy, Percent,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Booking = Record<string, any>
type DatePreset = "today" | "7d" | "30d" | "thisMonth" | "90d" | "365d"
interface DateRange { start: Date; end: Date }

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  thisMonth: "Este mes",
  "90d": "3 meses",
  "365d": "1 año",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }
function endOfDay(d: Date) { const c = new Date(d); c.setHours(23, 59, 59, 999); return c }
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c }

function getPresetRange(preset: DatePreset, now: Date): DateRange {
  const y = now.getFullYear(), m = now.getMonth()
  switch (preset) {
    case "today": return { start: startOfDay(now), end: endOfDay(now) }
    case "7d": return { start: startOfDay(addDays(now, -6)), end: endOfDay(now) }
    case "30d": return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) }
    case "thisMonth": return { start: startOfDay(new Date(y, m, 1)), end: endOfDay(now) }
    case "90d": return { start: startOfDay(addDays(now, -89)), end: endOfDay(now) }
    case "365d": return { start: startOfDay(addDays(now, -364)), end: endOfDay(now) }
  }
}

function getPreviousRange(range: DateRange): DateRange {
  const diff = range.end.getTime() - range.start.getTime() + 1
  return { start: new Date(range.start.getTime() - diff), end: new Date(range.end.getTime() - diff) }
}

function bookingDateTime(b: Booking): Date | null {
  const raw = b.date || b.dateKey
  if (!raw) return null
  if (raw?.toDate) return raw.toDate()
  if (raw instanceof Date) return raw
  const s = String(raw)
  if (s.includes("T")) { const d = new Date(s); return isNaN(d.getTime()) ? null : d }
  const d = new Date(`${s}T${String(b.time || "00:00")}:00`)
  return isNaN(d.getTime()) ? null : d
}

function normStatus(b: Booking): "confirmed" | "cancelled" | "pending" {
  const s = String(b.status || "").toLowerCase()
  if (s === "confirmada" || s === "confirmed") return "confirmed"
  if (s === "cancelada" || s === "cancelled") return "cancelled"
  return "pending"
}

function clientKey(b: Booking) {
  return String(b.customerEmail || b.email || b.phone || b.customer || "").trim().toLowerCase()
}

function sportKey(b: Booking) {
  return String(b.sport || b.courtSport || "Sin deporte").trim()
}

function courtKey(b: Booking) {
  return String(b.courtName || b.court || "Sin cancha").trim()
}

function fmtPct(v: number) { return `${v.toFixed(1)}%` }

function calcTrend(cur: number, prev: number): { label: string; up: boolean } {
  if (prev === 0) return { label: cur > 0 ? "+100%" : "0%", up: cur >= 0 }
  const p = ((cur - prev) / prev) * 100
  return { label: `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`, up: p >= 0 }
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function dayOfWeekLabel(dow: number) {
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dow]
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  )
}

function KpiCard({
  label, value, trend, trendUp, description, icon: Icon, loading, accent = false,
}: {
  label: string; value: string; trend?: string; trendUp?: boolean
  description?: string; icon: React.ElementType; loading: boolean; accent?: boolean
}) {
  return (
    <Card className={cn(
      "border-none shadow-sm transition-all duration-200",
      accent
        ? "bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15"
        : "bg-card/60 hover:bg-card/100"
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
        {(trend || description) && (
          <p className="text-xs mt-1 flex items-center gap-1">
            {trend && (
              <span className={cn("font-medium flex items-center gap-0.5", trendUp ? "text-emerald-600" : "text-rose-500")}>
                {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend}
              </span>
            )}
            {description && <span className="text-slate-400 ml-1">{description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Skeleton({ h = 260 }: { h?: number }) {
  return <div className="w-full rounded-lg bg-slate-100 animate-pulse" style={{ height: h }} />
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

const TOOLTIP_STYLE = {
  borderRadius: "8px", border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px",
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function ReportsContent() {
  const { user, centerId } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null

  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [preset, setPreset] = useState<DatePreset>("30d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const [activeCustom, setActiveCustom] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedCenterId) return
    ;(async () => {
      setLoading(true)
      try {
        const load = async (root: string) => {
          try {
            const ref = collection(db, root, resolvedCenterId, CENTER_SUBCOLLECTIONS.bookings)
            const snap = await getDocs(ref)
            return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          } catch { return [] as Booking[] }
        }
        const [fresh, legacy] = await Promise.all([
          load(FIRESTORE_COLLECTIONS.centers),
          load(FIRESTORE_COLLECTIONS.legacyCenters),
        ])
        setBookings(fresh.length > 0 ? fresh : legacy)
      } finally { setLoading(false) }
    })()
  }, [resolvedCenterId])

  const now = useMemo(() => new Date(), [])

  // ── Date range ─────────────────────────────────────────────────────────────
  const range = useMemo<DateRange>(() => {
    if (activeCustom && customFrom && customTo) {
      const s = startOfDay(new Date(customFrom))
      const e = endOfDay(new Date(customTo))
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) return { start: s, end: e }
    }
    return getPresetRange(preset, now)
  }, [preset, now, activeCustom, customFrom, customTo])

  const prevRange = useMemo(() => getPreviousRange(range), [range])
  const rangeDays = Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1

  // ── Filtered sets ──────────────────────────────────────────────────────────
  const inRange = useMemo(() =>
    bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= range.start && dt <= range.end }),
    [bookings, range])

  const inPrev = useMemo(() =>
    bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= prevRange.start && dt <= prevRange.end }),
    [bookings, prevRange])

  const confirmed = useMemo(() => inRange.filter(b => normStatus(b) === "confirmed"), [inRange])
  const cancelled = useMemo(() => inRange.filter(b => normStatus(b) === "cancelled"), [inRange])
  const pending = useMemo(() => inRange.filter(b => normStatus(b) === "pending"), [inRange])
  const confirmedPrev = useMemo(() => inPrev.filter(b => normStatus(b) === "confirmed"), [inPrev])
  const cancelledPrev = useMemo(() => inPrev.filter(b => normStatus(b) === "cancelled"), [inPrev])

  // ── 1. Revenue ─────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(() => confirmed.reduce((s, b) => s + (Number(b.price) || 0), 0), [confirmed])
  const totalRevenuePrev = useMemo(() => confirmedPrev.reduce((s, b) => s + (Number(b.price) || 0), 0), [confirmedPrev])
  const revTrend = calcTrend(totalRevenue, totalRevenuePrev)

  const avgPerBooking = confirmed.length > 0 ? totalRevenue / confirmed.length : 0
  const avgPerBookingPrev = confirmedPrev.length > 0 ? totalRevenuePrev / confirmedPrev.length : 0
  const avgTrend = calcTrend(avgPerBooking, avgPerBookingPrev)

  const totalHours = useMemo(() =>
    confirmed.reduce((s, b) => {
      const dur = Number(b.durationMinutes || 0) / 60 || Number(b.duration || 0)
      return s + (dur > 0 ? (dur > 10 ? dur / 60 : dur) : 1)
    }, 0), [confirmed])
  const avgPerHour = totalHours > 0 ? totalRevenue / totalHours : 0

  const revenueByCourt = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(b => { const k = courtKey(b); map.set(k, (map.get(k) || 0) + (Number(b.price) || 0)) })
    return Array.from(map.entries()).map(([name, rev]) => ({ name, rev })).sort((a, b) => b.rev - a.rev).slice(0, 8)
  }, [confirmed])

  const revenueBySport = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(b => { const k = sportKey(b); map.set(k, (map.get(k) || 0) + (Number(b.price) || 0)) })
    return Array.from(map.entries()).map(([name, rev]) => ({ name, rev })).sort((a, b) => b.rev - a.rev)
  }, [confirmed])

  const revenueTimeline = useMemo(() => {
    const groupByWeek = rangeDays > 31
    if (groupByWeek) {
      const nWeeks = Math.ceil(rangeDays / 7)
      return Array.from({ length: nWeeks }, (_, idx) => {
        const i = nWeeks - 1 - idx
        const to = endOfDay(addDays(now, -i * 7))
        const from = startOfDay(addDays(to, -6))
        const name = from.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
        const ingresos = bookings.filter(b => normStatus(b) === "confirmed").filter(b => {
          const dt = bookingDateTime(b); return dt && dt >= from && dt <= to
        }).reduce((s, b) => s + (Number(b.price) || 0), 0)
        return { name, ingresos }
      })
    }
    return Array.from({ length: rangeDays }, (_, i) => {
      const d = addDays(range.start, i)
      const from = startOfDay(d), to = endOfDay(d)
      const name = d.toLocaleDateString("es-AR", {
        day: "2-digit",
        weekday: rangeDays <= 7 ? "short" : undefined,
        month: rangeDays > 7 ? "2-digit" : undefined,
      }).replace(".", "")
      const ingresos = bookings.filter(b => normStatus(b) === "confirmed").filter(b => {
        const dt = bookingDateTime(b); return dt && dt >= from && dt <= to
      }).reduce((s, b) => s + (Number(b.price) || 0), 0)
      return { name, ingresos }
    })
  }, [bookings, range, rangeDays, now])

  const revenueBySlot = useMemo(() => {
    const slots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
      "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]
    const map = new Map(slots.map(s => [s, 0]))
    confirmed.forEach(b => {
      const hh = String(b.time || "").slice(0, 2).padStart(2, "0")
      const key = `${hh}:00`
      if (map.has(key)) map.set(key, (map.get(key) || 0) + (Number(b.price) || 0))
    })
    return slots.map(time => ({ time, ingresos: map.get(time) || 0 })).filter(d => d.ingresos > 0)
  }, [confirmed])

  // ── 2. Occupancy ───────────────────────────────────────────────────────────
  const occupancyByHour = useMemo(() => {
    const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
      "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]
    const counts = new Map(slots.map(s => [s, 0]))
    inRange.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const hh = String(b.time || "").slice(0, 2).padStart(2, "0")
      const key = `${hh}:00`
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1)
    })
    return slots.map(time => ({ time, reservas: counts.get(time) || 0 }))
  }, [inRange])

  const peakHour = useMemo(() => {
    const sorted = [...occupancyByHour].sort((a, b) => b.reservas - a.reservas)
    return sorted[0]?.reservas > 0 ? sorted[0] : null
  }, [occupancyByHour])

  const lowHour = useMemo(() => {
    const withData = occupancyByHour.filter(d => d.reservas > 0)
    if (!withData.length) return null
    return [...withData].sort((a, b) => a.reservas - b.reservas)[0]
  }, [occupancyByHour])

  const occupancyByDow = useMemo(() => {
    const counts = Array(7).fill(0) as number[]
    inRange.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const dt = bookingDateTime(b)
      if (dt) counts[dt.getDay()]++
    })
    return counts.map((reservas, i) => ({ day: dayOfWeekLabel(i), reservas }))
  }, [inRange])

  // ── 3. Reservations ────────────────────────────────────────────────────────
  const totalBookings = inRange.filter(b => normStatus(b) !== "cancelled").length
  const totalBookingsPrev = inPrev.filter(b => normStatus(b) !== "cancelled").length
  const bookingsTrend = calcTrend(totalBookings, totalBookingsPrev)
  const conversionRate = inRange.length > 0 ? (confirmed.length / inRange.length) * 100 : 0

  const bySport = useMemo(() => {
    const map = new Map<string, number>()
    inRange.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const k = sportKey(b); map.set(k, (map.get(k) || 0) + 1)
    })
    const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#6366f1"]
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [inRange])

  const byCourt = useMemo(() => {
    const map = new Map<string, number>()
    inRange.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const k = courtKey(b); map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, reservas]) => ({ name, reservas })).sort((a, b) => b.reservas - a.reservas).slice(0, 8)
  }, [inRange])

  const bookingsTimeline = useMemo(() => {
    const groupByWeek = rangeDays > 31
    if (groupByWeek) {
      const nWeeks = Math.ceil(rangeDays / 7)
      return Array.from({ length: nWeeks }, (_, idx) => {
        const i = nWeeks - 1 - idx
        const to = endOfDay(addDays(now, -i * 7))
        const from = startOfDay(addDays(to, -6))
        const name = from.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
        const total = bookings.filter(b => normStatus(b) !== "cancelled").filter(b => {
          const dt = bookingDateTime(b); return dt && dt >= from && dt <= to
        }).length
        return { name, total }
      })
    }
    return Array.from({ length: rangeDays }, (_, i) => {
      const d = addDays(range.start, i)
      const from = startOfDay(d), to = endOfDay(d)
      const name = d.toLocaleDateString("es-AR", {
        day: "2-digit",
        weekday: rangeDays <= 7 ? "short" : undefined,
        month: rangeDays > 7 ? "2-digit" : undefined,
      }).replace(".", "")
      const total = bookings.filter(b => normStatus(b) !== "cancelled").filter(b => {
        const dt = bookingDateTime(b); return dt && dt >= from && dt <= to
      }).length
      return { name, total }
    })
  }, [bookings, range, rangeDays, now])

  const statusDist = [
    { name: "Confirmadas", value: confirmed.length, color: "#8b5cf6" },
    { name: "Canceladas", value: cancelled.length, color: "#f43f5e" },
    { name: "Pendientes", value: pending.length, color: "#f59e0b" },
  ].filter(d => d.value > 0)

  // ── 4. Customer Analytics ──────────────────────────────────────────────────
  const clientMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string; bookings: number; spent: number; lastDate: Date | null; cancelCount: number }>()
    bookings.forEach(b => {
      const k = clientKey(b); if (!k) return
      const cur = map.get(k) || { name: String(b.customerName || b.customer || k), email: k, bookings: 0, spent: 0, lastDate: null, cancelCount: 0 }
      if (normStatus(b) === "cancelled") { cur.cancelCount++; map.set(k, cur); return }
      cur.bookings++
      cur.spent += Number(b.price) || 0
      const dt = bookingDateTime(b)
      if (dt && (!cur.lastDate || dt > cur.lastDate)) cur.lastDate = dt
      map.set(k, cur)
    })
    return map
  }, [bookings])

  const totalPlayers = clientMap.size

  const newPlayers = useMemo(() => {
    const firstBookingDate = new Map<string, Date>()
    bookings.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const k = clientKey(b); if (!k) return
      const dt = bookingDateTime(b); if (!dt) return
      const prev = firstBookingDate.get(k)
      if (!prev || dt < prev) firstBookingDate.set(k, dt)
    })
    return Array.from(firstBookingDate.entries()).filter(([, dt]) => dt >= range.start && dt <= range.end).length
  }, [bookings, range])

  const activePlayers = useMemo(() =>
    new Set(inRange.filter(b => normStatus(b) !== "cancelled").map(clientKey).filter(Boolean)).size,
    [inRange])

  const topPlayers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; bookings: number; spent: number }>()
    inRange.filter(b => normStatus(b) !== "cancelled").forEach(b => {
      const k = clientKey(b); if (!k) return
      const cur = map.get(k) || { name: String(b.customerName || b.customer || k), email: k, bookings: 0, spent: 0 }
      cur.bookings++; cur.spent += Number(b.price) || 0; map.set(k, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 10)
  }, [inRange])

  const returningPlayers = useMemo(() => {
    const inRangeKeys = new Set(inRange.filter(b => normStatus(b) !== "cancelled").map(clientKey).filter(Boolean))
    const beforeRangeKeys = new Set(
      bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt < range.start && normStatus(b) !== "cancelled" })
        .map(clientKey).filter(Boolean)
    )
    return Array.from(inRangeKeys).filter(k => beforeRangeKeys.has(k)).length
  }, [bookings, inRange, range])

  // ── 5. Cancellations ───────────────────────────────────────────────────────
  const cancellationRate = inRange.length > 0 ? (cancelled.length / inRange.length) * 100 : 0
  const prevCancellationRate = inPrev.length > 0 ? (cancelledPrev.length / inPrev.length) * 100 : 0
  const cancelTrend = calcTrend(cancellationRate, prevCancellationRate)

  const topCancellers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; count: number }>()
    inRange.filter(b => normStatus(b) === "cancelled").forEach(b => {
      const k = clientKey(b); if (!k) return
      const cur = map.get(k) || { name: String(b.customerName || b.customer || k), email: k, count: 0 }
      cur.count++; map.set(k, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [inRange])

  const cancelBySlot = useMemo(() => {
    const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
    const map = new Map(slots.map(s => [s, 0]))
    cancelled.forEach(b => {
      const hh = String(b.time || "").slice(0, 2); if (!hh) return
      const bucket = `${String(Math.floor(Number(hh) / 2) * 2).padStart(2, "0")}:00`
      if (map.has(bucket)) map.set(bucket, (map.get(bucket) || 0) + 1)
    })
    return slots.map(time => ({ time, cancelaciones: map.get(time) || 0 }))
  }, [cancelled])

  const cancelTimeline = useMemo(() =>
    bookingsTimeline.map((d, i) => {
      const from = addDays(range.start, rangeDays <= 31 ? i : i * 7)
      const to = rangeDays <= 31 ? endOfDay(from) : endOfDay(addDays(from, 6))
      const count = bookings.filter(b => normStatus(b) === "cancelled").filter(b => {
        const dt = bookingDateTime(b); return dt && dt >= from && dt <= to
      }).length
      return { name: d.name, cancelaciones: count }
    }), [bookings, bookingsTimeline, range, rangeDays])

  // ── 6. Operational Health ──────────────────────────────────────────────────
  const todayStart = startOfDay(now), todayEnd = endOfDay(now)
  const todayBookings = useMemo(() =>
    bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= todayStart && dt <= todayEnd }),
    [bookings, todayStart, todayEnd])

  const todayConfirmed = todayBookings.filter(b => normStatus(b) === "confirmed").length
  const todayPending = todayBookings.filter(b => normStatus(b) === "pending").length

  const upcoming24h = useMemo(() => {
    const in24 = new Date(now.getTime() + 24 * 3600000)
    return bookings.filter(b => {
      const dt = bookingDateTime(b); return dt && dt >= now && dt <= in24 && normStatus(b) !== "cancelled"
    }).length
  }, [bookings, now])

  // ── 9. Business Intelligence Insights ─────────────────────────────────────
  const insights = useMemo(() => {
    const list: { type: "positive" | "warning" | "info"; text: string }[] = []
    if (!inRange.length) return list

    if (revenueByCourt.length >= 2) {
      const best = revenueByCourt[0]
      const avg = revenueByCourt.reduce((s, c) => s + c.rev, 0) / revenueByCourt.length
      if (best.rev > avg) {
        const pct = ((best.rev - avg) / avg * 100).toFixed(0)
        list.push({ type: "positive", text: `"${best.name}" genera ${pct}% más ingresos que el promedio de las canchas.` })
      }
    }

    if (peakHour) {
      list.push({ type: "info", text: `La franja ${peakHour.time} es la hora pico con ${peakHour.reservas} reservas.` })
    }

    if (lowHour && lowHour.time !== peakHour?.time) {
      list.push({ type: "warning", text: `La franja ${lowHour.time} tiene baja ocupación (${lowHour.reservas} reservas). Considerá ofrecer descuentos.` })
    }

    if (cancellationRate > 20) {
      list.push({ type: "warning", text: `Tasa de cancelación del ${fmtPct(cancellationRate)}. Revisá tu política de cancelaciones.` })
    } else if (cancellationRate < 10 && inRange.length > 5) {
      list.push({ type: "positive", text: `Baja tasa de cancelación (${fmtPct(cancellationRate)}). Tu retención de reservas es excelente.` })
    }

    const bestDow = [...occupancyByDow].sort((a, b) => b.reservas - a.reservas)[0]
    if (bestDow?.reservas > 0) {
      list.push({ type: "info", text: `Los ${bestDow.day} son el día más activo de la semana con ${bestDow.reservas} reservas.` })
    }

    if (activePlayers > 0) {
      const retPct = (returningPlayers / activePlayers * 100).toFixed(0)
      list.push({
        type: Number(retPct) >= 50 ? "positive" : "warning",
        text: `${retPct}% de los jugadores activos son recurrentes. ${Number(retPct) >= 50 ? "Excelente fidelización." : "Trabajá en retener clientes nuevos."}`,
      })
    }

    if (rangeDays > 0 && totalRevenue > 0) {
      const projection = (totalRevenue / rangeDays) * 30
      list.push({ type: "info", text: `A este ritmo, la proyección de ingresos para los próximos 30 días es ${formatCurrencyARS(projection)}.` })
    }

    return list
  }, [inRange, revenueByCourt, peakHour, lowHour, cancellationRate, occupancyByDow, activePlayers, returningPlayers, totalRevenue, rangeDays])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 animate-in fade-in-50 duration-500">

      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border shadow-sm">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
            <button
              key={p}
              onClick={() => { setPreset(p); setActiveCustom(false) }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                preset === p && !activeCustom
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:text-black text-slate-600"
              )}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowCustom(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
              activeCustom ? "bg-primary/10 border-primary text-primary" : "bg-background hover:bg-muted border-border text-slate-600"
            )}
          >
            Rango personalizado
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showCustom && "rotate-180")} />
          </button>
          {showCustom && (
            <div className="absolute top-11 left-0 z-20 bg-background border rounded-xl shadow-xl p-4 flex flex-col gap-3 w-72">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Desde</label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Hasta</label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-sm" />
              </div>
              <Button size="sm" className="w-full" onClick={() => { setActiveCustom(true); setShowCustom(false) }}
                disabled={!customFrom || !customTo}>
                Aplicar
              </Button>
            </div>
          )}
        </div>

        {loading && <span className="text-xs text-slate-400 animate-pulse">Cargando datos…</span>}
      </div>

      {/* SECTION 1 — Revenue Analytics */}
      <section>
        <SectionHeader icon={DollarSign} title="Revenue Analytics"
          description="Ingresos y métricas financieras del período seleccionado" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Ingresos totales" value={formatCurrencyARS(totalRevenue)}
            trend={revTrend.label} trendUp={revTrend.up} description="vs período anterior"
            icon={DollarSign} loading={loading} accent />
          <KpiCard label="Promedio por reserva" value={formatCurrencyARS(avgPerBooking)}
            trend={avgTrend.label} trendUp={avgTrend.up} description="vs período anterior"
            icon={Activity} loading={loading} />
          <KpiCard label="Promedio por hora" value={formatCurrencyARS(avgPerHour)}
            description="reservas confirmadas" icon={Clock} loading={loading} />
          <KpiCard label="Canchas activas" value={String(revenueByCourt.length)}
            description="con ingresos en el período" icon={Target} loading={loading} />
        </div>

        <div className="grid gap-4 lg:grid-cols-7 mb-4">
          <Card className="border-none shadow-sm col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Ingresos en el tiempo</CardTitle>
              <CardDescription>Evolución de ingresos confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={240} /> : revenueTimeline.every(d => d.ingresos === 0)
                ? <EmptyState message="Sin ingresos en este período" />
                : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTimeline}>
                        <defs>
                          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} tickFormatter={v => formatCurrencyARS(v)} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                        <Area type="monotone" dataKey="ingresos" stroke="#8b5cf6" fill="url(#gRev)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Ingresos por cancha</CardTitle>
              <CardDescription>Ranking de canchas por recaudación</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={240} /> : revenueByCourt.length === 0
                ? <EmptyState message="Sin datos de canchas" />
                : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByCourt} layout="vertical" barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyARS(v)} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                        <Bar dataKey="rev" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Ingresos por deporte</CardTitle>
              <CardDescription>Desglose por disciplina</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={200} /> : revenueBySport.length === 0
                ? <EmptyState message="Sin datos de deportes" />
                : (
                  <div className="space-y-2">
                    {revenueBySport.map((s, i) => {
                      const total = revenueBySport.reduce((sum, x) => sum + x.rev, 0)
                      const pct = total > 0 ? (s.rev / total * 100) : 0
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700 capitalize">{s.name}</span>
                            <span className="text-slate-500">{formatCurrencyARS(s.rev)} · {fmtPct(pct)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Ingresos por horario</CardTitle>
              <CardDescription>Franjas horarias más rentables</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={200} /> : revenueBySlot.length === 0
                ? <EmptyState message="Sin datos de horarios" />
                : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueBySlot} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyARS(v)} width={72} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                        <Bar dataKey="ingresos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2 — Court Occupancy */}
      <section>
        <SectionHeader icon={Target} title="Court Occupancy"
          description="Tasa de uso y patrones de ocupación de canchas" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Reservas activas" value={String(totalBookings)}
            trend={bookingsTrend.label} trendUp={bookingsTrend.up} description="vs período anterior"
            icon={CalendarDays} loading={loading} accent />
          <KpiCard label="Hora pico" value={peakHour ? peakHour.time : "—"}
            description={peakHour ? `${peakHour.reservas} reservas` : "sin datos"}
            icon={TrendingUp} loading={loading} />
          <KpiCard label="Hora baja" value={lowHour ? lowHour.time : "—"}
            description={lowHour ? `${lowHour.reservas} reservas` : "sin datos"}
            icon={TrendingDown} loading={loading} />
          <KpiCard label="Tasa de conversión" value={fmtPct(conversionRate)}
            description="confirmadas / total" icon={Percent} loading={loading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Ocupación por hora</CardTitle>
              <CardDescription>Reservas activas por franja horaria</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : occupancyByHour.every(d => d.reservas === 0)
                ? <EmptyState message="Sin datos de horarios" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={occupancyByHour} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Reservas"]} />
                        <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
                          {occupancyByHour.map((d, i) => (
                            <Cell key={i} fill={d.time === peakHour?.time ? "#8b5cf6" : "#c4b5fd"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Ocupación por día de semana</CardTitle>
              <CardDescription>Distribución semanal de reservas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : occupancyByDow.every(d => d.reservas === 0)
                ? <EmptyState message="Sin datos del período" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={occupancyByDow} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Reservas"]} />
                        <Bar dataKey="reservas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {!loading && byCourt.length > 0 && (
          <Card className="border-none shadow-sm mt-4">
            <CardHeader>
              <CardTitle>Reservas por cancha</CardTitle>
              <CardDescription>Número de reservas activas por cancha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCourt} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Reservas"]} />
                    <Bar dataKey="reservas" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* SECTION 3 — Reservations Analytics */}
      <section>
        <SectionHeader icon={CalendarDays} title="Reservations Analytics"
          description="Tendencias y distribución de reservas" />

        <div className="grid gap-4 lg:grid-cols-7 mb-4">
          <Card className="border-none shadow-sm col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Tendencia de reservas</CardTitle>
              <CardDescription>Evolución en el tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : bookingsTimeline.every(d => d.total === 0)
                ? <EmptyState message="Sin reservas en este período" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookingsTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Reservas"]} />
                        <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Reservas por deporte</CardTitle>
              <CardDescription>Distribución por disciplina</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : bySport.length === 0
                ? <EmptyState message="Sin datos de deportes" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bySport} cx="50%" cy="42%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                          {bySport.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend iconSize={9} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Estado de reservas</CardTitle>
            <CardDescription>Confirmadas · Canceladas · Pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton h={60} /> : (
              <div className="flex flex-wrap gap-6">
                {statusDist.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm font-medium text-slate-700">{s.name}</span>
                    <span className="text-2xl font-bold text-slate-900">{s.value}</span>
                    <span className="text-xs text-slate-400">
                      {inRange.length > 0 ? fmtPct(s.value / inRange.length * 100) : "0%"}
                    </span>
                  </div>
                ))}
                {statusDist.length === 0 && <p className="text-sm text-slate-400">Sin datos</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 4 — Customer Analytics */}
      <section>
        <SectionHeader icon={Users} title="Customer Analytics"
          description="Comportamiento y valor de tus clientes / jugadores" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Jugadores totales" value={String(totalPlayers)}
            description="en toda la base de datos" icon={Users} loading={loading} accent />
          <KpiCard label="Jugadores activos" value={String(activePlayers)}
            description="con reservas en el período" icon={Activity} loading={loading} />
          <KpiCard label="Jugadores nuevos" value={String(newPlayers)}
            description="primera reserva en el período" icon={TrendingUp} loading={loading} />
          <KpiCard label="Jugadores recurrentes" value={String(returningPlayers)}
            description="ya habían reservado antes" icon={Crown} loading={loading} />
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Top jugadores</CardTitle>
              <CardDescription>Por gasto total en el período</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => downloadCSV(
                [["#", "Nombre", "Email", "Reservas", "Gasto"],
                ...topPlayers.map((c, i) => [String(i + 1), c.name || c.email, c.email, String(c.bookings), String(c.spent)])],
                "top-jugadores.csv"
              )}
              disabled={loading || topPlayers.length === 0}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}
              </div>
            ) : topPlayers.length === 0 ? (
              <EmptyState message="Sin jugadores con reservas en este período" />
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 text-xs font-medium text-slate-400 pb-2 border-b px-2">
                  <span className="col-span-1 text-center">#</span>
                  <span className="col-span-5">Jugador</span>
                  <span className="col-span-3 text-center">Reservas</span>
                  <span className="col-span-3 text-right">Gasto total</span>
                </div>
                {topPlayers.map((c, i) => (
                  <div key={c.email} className="grid grid-cols-12 items-center text-sm py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="col-span-1 flex justify-center">
                      {i < 3
                        ? <Trophy className={cn("h-4 w-4", i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : "text-amber-700")} />
                        : <span className="text-xs font-bold text-slate-300">{i + 1}</span>
                      }
                    </div>
                    <div className="col-span-5 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{c.name && c.name !== c.email ? c.name : "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                    </div>
                    <span className="col-span-3 text-center text-slate-600">{c.bookings}</span>
                    <span className="col-span-3 text-right font-semibold text-slate-800">{formatCurrencyARS(c.spent)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 5 — Cancellation Analytics */}
      <section>
        <SectionHeader icon={XCircle} title="Cancellation Analytics"
          description="Análisis de cancelaciones y patrones de ausentismo" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Cancelaciones totales" value={String(cancelled.length)}
            trend={cancelTrend.label} trendUp={!cancelTrend.up} description="vs período anterior"
            icon={XCircle} loading={loading} />
          <KpiCard label="Tasa de cancelación" value={fmtPct(cancellationRate)}
            description="del total de reservas" icon={Percent} loading={loading} />
          <KpiCard label="Reservas confirmadas" value={String(confirmed.length)}
            description="en el período" icon={CheckCircle2} loading={loading} />
          <KpiCard label="Pendientes" value={String(pending.length)}
            description="sin confirmar aún" icon={AlertCircle} loading={loading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Cancelaciones en el tiempo</CardTitle>
              <CardDescription>Evolución de cancelaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={200} /> : cancelTimeline.every(d => d.cancelaciones === 0)
                ? <EmptyState message="Sin cancelaciones en el período" />
                : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cancelTimeline}>
                        <defs>
                          <linearGradient id="gCancel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Cancelaciones"]} />
                        <Area type="monotone" dataKey="cancelaciones" stroke="#f43f5e" fill="url(#gCancel)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Cancelaciones por horario</CardTitle>
              <CardDescription>Franjas con más cancelaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton h={200} /> : cancelBySlot.every(d => d.cancelaciones === 0)
                ? <EmptyState message="Sin cancelaciones en este período" />
                : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cancelBySlot} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Cancelaciones"]} />
                        <Bar dataKey="cancelaciones" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {!loading && topCancellers.length > 0 && (
          <Card className="border-none shadow-sm mt-4">
            <CardHeader>
              <CardTitle>Jugadores con más cancelaciones</CardTitle>
              <CardDescription>En el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-right">Cancelaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCancellers.map((c, i) => (
                    <TableRow key={c.email}>
                      <TableCell className="text-xs font-bold text-slate-400">{i + 1}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-800">{c.name && c.name !== c.email ? c.name : "—"}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">{c.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* SECTION 6 — Operational Health */}
      <section>
        <SectionHeader icon={Activity} title="Operational Health"
          description="Estado operativo del centro en tiempo real" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Reservas hoy" value={String(todayBookings.length)}
            description="total del día" icon={CalendarDays} loading={loading} accent />
          <KpiCard label="Confirmadas hoy" value={String(todayConfirmed)}
            description="listas para jugar" icon={CheckCircle2} loading={loading} />
          <KpiCard label="Pendientes hoy" value={String(todayPending)}
            description="sin confirmar" icon={AlertCircle} loading={loading} />
          <KpiCard label="Próximas 24h" value={String(upcoming24h)}
            description="reservas activas" icon={Clock} loading={loading} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tasa de confirmación (período)</p>
                  <p className="text-2xl font-bold text-slate-900">{fmtPct(conversionRate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-50">
                  <XCircle className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cancelaciones (período)</p>
                  <p className="text-2xl font-bold text-slate-900">{cancelled.length}</p>
                  <p className="text-xs text-slate-400">{fmtPct(cancellationRate)} del total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pendientes hoy</p>
                  <p className="text-2xl font-bold text-slate-900">{todayPending}</p>
                  {todayPending > 0 && <p className="text-xs text-amber-600">Requieren atención</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 9 — Business Intelligence Insights */}
      <section>
        <SectionHeader icon={Lightbulb} title="Business Intelligence Insights"
          description="Observaciones automáticas para optimizar tu negocio" />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-10 flex flex-col items-center gap-2 text-slate-400">
              <Lightbulb className="h-8 w-8 opacity-30" />
              <p className="text-sm">No hay suficientes datos para generar insights. Acumulá más reservas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border text-sm",
                  ins.type === "positive" && "bg-emerald-50 border-emerald-200 text-emerald-800",
                  ins.type === "warning" && "bg-amber-50 border-amber-200 text-amber-800",
                  ins.type === "info" && "bg-blue-50 border-blue-200 text-blue-800",
                )}
              >
                {ins.type === "positive" && <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />}
                {ins.type === "warning" && <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />}
                {ins.type === "info" && <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />}
                <p className="leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
