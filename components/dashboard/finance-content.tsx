"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine, ComposedChart,
} from "recharts"
import {
  DollarSign, TrendingUp, TrendingDown, XCircle, Download, Activity,
  CheckCircle2, AlertCircle, Clock, ChevronDown, Lightbulb, Zap,
  AlertTriangle, Plus, Trash2, Pencil, Target, BarChart3, Layers,
  CreditCard, Banknote, ArrowUpRight, ArrowDownRight, Scale,
  ChevronLeft, ChevronRight, Search, Receipt, Percent, Building2,
  CalendarDays, Users, TrendingUp as Forecast, Wallet,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Booking = Record<string, any>

type DatePreset = "today" | "7d" | "30d" | "thisMonth" | "thisYear" | "custom"
const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoy", "7d": "7 días", "30d": "30 días",
  thisMonth: "Este mes", thisYear: "Este año", custom: "Personalizado",
}

interface DateRange { start: Date; end: Date }

type CostCategory = "fixed" | "operating" | "bar" | "variable"
type RecurrenceType = "one-time" | "monthly" | "weekly"

interface CostEntry {
  id: string
  date: string          // ISO yyyy-mm-dd
  category: CostCategory
  subcategory: string
  description: string
  amount: number
  recurrence: RecurrenceType
  court?: string
}

const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  fixed: "Costos Fijos",
  operating: "Costos Operativos",
  bar: "Bar / Cafetería",
  variable: "Costos Variables",
}

const COST_SUBCATEGORIES: Record<CostCategory, string[]> = {
  fixed: ["Alquiler", "Sueldos", "Seguridad", "Limpieza", "Internet", "Seguros", "Impuestos", "Suscripciones software"],
  operating: ["Electricidad", "Agua", "Mantenimiento canchas", "Reparaciones", "Equipamiento", "Marketing"],
  bar: ["Alimentos", "Bebidas", "Inventario", "Proveedores"],
  variable: ["Electricidad por cancha", "Limpieza por reserva", "Desgaste estimado", "Consumibles"],
}

const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  fixed: "#8b5cf6",
  operating: "#f59e0b",
  bar: "#10b981",
  variable: "#f43f5e",
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  "mercadopago": "#009ee3",
  "efectivo": "#10b981",
  "transferencia": "#f59e0b",
  "tarjeta": "#8b5cf6",
  "otro": "#94a3b8",
}

const TOOLTIP_STYLE = {
  borderRadius: "8px", border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px",
}

const ITEMS_PER_PAGE = 12

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
    case "thisYear": return { start: startOfDay(new Date(y, 0, 1)), end: endOfDay(now) }
    default: return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) }
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
function courtKey(b: Booking) { return String(b.courtName || b.court || "Sin cancha").trim() }
function sportKey(b: Booking) { return String(b.sport || b.courtSport || "Sin deporte").trim() }
function paymentKey(b: Booking): string {
  const m = String(b.paymentMethod || b.payment_method || b.method || "").trim().toLowerCase()
  if (m.includes("mercado") || m === "mp") return "mercadopago"
  if (m.includes("efect") || m === "cash") return "efectivo"
  if (m.includes("transfer")) return "transferencia"
  if (m.includes("tarjet") || m.includes("card")) return "tarjeta"
  if (m) return m
  return "otro"
}

function fmtPct(v: number, decimals = 1) { return `${v.toFixed(decimals)}%` }
function fmtShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return formatCurrencyARS(v)
}

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

function dayLabel(dow: number) { return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dow] }

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description, badge }: {
  icon: React.ElementType; title: string; description?: string; badge?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {badge && <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{badge}</Badge>}
        </div>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  )
}

function KpiCard({
  label, value, trend, trendUp, description, icon: Icon, loading, accent = false, size = "default", invertTrend = false,
}: {
  label: string; value: string; trend?: string; trendUp?: boolean; description?: string
  icon: React.ElementType; loading: boolean; accent?: boolean; size?: "default" | "sm"; invertTrend?: boolean
}) {
  const isGood = invertTrend ? !trendUp : trendUp
  return (
    <Card className={cn(
      "border-none shadow-sm transition-all duration-200",
      accent
        ? "bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15"
        : "bg-card/60 hover:bg-card/100"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("font-medium text-slate-700", size === "sm" ? "text-xs" : "text-sm")}>{label}</CardTitle>
        <div className={cn("p-1.5 rounded-md", accent ? "bg-primary/15" : "bg-slate-100")}>
          <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-slate-500")} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("font-bold", accent ? "text-primary" : "text-slate-900", size === "sm" ? "text-xl" : "text-2xl")}>
          {loading ? <span className="inline-block h-7 w-24 rounded bg-slate-200 animate-pulse" /> : value}
        </div>
        {(trend || description) && (
          <p className="text-xs mt-1 flex items-center gap-1">
            {trend && (
              <span className={cn("font-medium flex items-center gap-0.5", isGood ? "text-emerald-600" : "text-rose-500")}>
                {isGood ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: "confirmed" | "cancelled" | "pending" }) {
  if (status === "confirmed")
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"><CheckCircle2 className="h-3 w-3" />Confirmada</Badge>
  if (status === "cancelled")
    return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 gap-1" variant="outline"><XCircle className="h-3 w-3" />Cancelada</Badge>
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1" variant="outline"><Clock className="h-3 w-3" />Pendiente</Badge>
}

// Heatmap Cell
function HeatCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0
  const bg = intensity === 0
    ? "bg-slate-50 text-slate-300"
    : intensity < 0.25 ? "bg-violet-100 text-violet-600"
      : intensity < 0.5 ? "bg-violet-200 text-violet-700"
        : intensity < 0.75 ? "bg-violet-400 text-white"
          : "bg-violet-600 text-white"
  return (
    <div className={cn("rounded text-[10px] font-semibold flex items-center justify-center h-8", bg)}>
      {value > 0 ? fmtShort(value) : ""}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Entry Form
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_COST: Omit<CostEntry, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  category: "fixed",
  subcategory: "Alquiler",
  description: "",
  amount: 0,
  recurrence: "monthly",
  court: "",
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function FinanceContent() {
  const { user, centerId } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])

  // Date filters
  const [preset, setPreset] = useState<DatePreset>("thisMonth")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const [activeCustom, setActiveCustom] = useState(false)

  // Optional filters
  const [filterCourt, setFilterCourt] = useState("all")
  const [filterPayment, setFilterPayment] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTx, setSearchTx] = useState("")
  const [txPage, setTxPage] = useState(1)

  // Costs
  const [costs, setCosts] = useState<CostEntry[]>([])
  const [costsLoading, setCostsLoading] = useState(true)
  const [costDialog, setCostDialog] = useState(false)
  const [editingCost, setEditingCost] = useState<CostEntry | null>(null)
  const [costForm, setCostForm] = useState<Omit<CostEntry, "id">>(BLANK_COST)
  const [costSaving, setCostSaving] = useState(false)

  // ── Fetch bookings ────────────────────────────────────────────────────────
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

  // ── Fetch costs ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedCenterId) return
    ;(async () => {
      setCostsLoading(true)
      try {
        const root = FIRESTORE_COLLECTIONS.centers
        const ref = collection(db, root, resolvedCenterId, "costs")
        const snap = await getDocs(ref)
        setCosts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as CostEntry[])
      } catch {
        // costs collection may not exist yet
        setCosts([])
      } finally {
        setCostsLoading(false)
      }
    })()
  }, [resolvedCenterId])

  const now = useMemo(() => new Date(), [])

  // ── Range ─────────────────────────────────────────────────────────────────
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

  // ── Filter bookings ────────────────────────────────────────────────────────
  const inRange = useMemo(() =>
    bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= range.start && dt <= range.end }),
    [bookings, range])
  const inPrev = useMemo(() =>
    bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= prevRange.start && dt <= prevRange.end }),
    [bookings, prevRange])

  const confirmed = useMemo(() => inRange.filter(b => normStatus(b) === "confirmed"), [inRange])
  const confirmedPrev = useMemo(() => inPrev.filter(b => normStatus(b) === "confirmed"), [inPrev])
  const cancelled = useMemo(() => inRange.filter(b => normStatus(b) === "cancelled"), [inRange])
  const pending = useMemo(() => inRange.filter(b => normStatus(b) === "pending"), [inRange])

  // ── Revenue KPIs ──────────────────────────────────────────────────────────
  const totalRevenue = useMemo(() => confirmed.reduce((s, b) => s + (Number(b.price) || 0), 0), [confirmed])
  const totalRevenuePrev = useMemo(() => confirmedPrev.reduce((s, b) => s + (Number(b.price) || 0), 0), [confirmedPrev])
  const revTrend = calcTrend(totalRevenue, totalRevenuePrev)

  const todayRevenue = useMemo(() => {
    const s = startOfDay(now), e = endOfDay(now)
    return bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= s && dt <= e && normStatus(b) === "confirmed" })
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0)
  }, [bookings, now])

  const weekRevenue = useMemo(() => {
    const s = startOfDay(addDays(now, -6)), e = endOfDay(now)
    return bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= s && dt <= e && normStatus(b) === "confirmed" })
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0)
  }, [bookings, now])

  const monthRevenue = useMemo(() => {
    const s = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), e = endOfDay(now)
    return bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= s && dt <= e && normStatus(b) === "confirmed" })
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0)
  }, [bookings, now])

  const yearRevenue = useMemo(() => {
    const s = startOfDay(new Date(now.getFullYear(), 0, 1)), e = endOfDay(now)
    return bookings.filter(b => { const dt = bookingDateTime(b); return dt && dt >= s && dt <= e && normStatus(b) === "confirmed" })
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0)
  }, [bookings, now])

  const avgPerBooking = confirmed.length > 0 ? totalRevenue / confirmed.length : 0
  const avgPerBookingPrev = confirmedPrev.length > 0 ? totalRevenuePrev / confirmedPrev.length : 0
  const avgTrend = calcTrend(avgPerBooking, avgPerBookingPrev)

  const uniqueClients = useMemo(() => new Set(confirmed.map(clientKey).filter(Boolean)).size, [confirmed])
  const avgPerClient = uniqueClients > 0 ? totalRevenue / uniqueClients : 0

  const totalHours = useMemo(() => confirmed.reduce((s, b) => {
    const dur = Number(b.durationMinutes || 0) / 60 || Number(b.duration || 0)
    return s + (dur > 0 ? (dur > 10 ? dur / 60 : dur) : 1)
  }, 0), [confirmed])
  const avgPerHour = totalHours > 0 ? totalRevenue / totalHours : 0

  // ── Costs KPIs ────────────────────────────────────────────────────────────
  const costsInRange = useMemo(() => {
    return costs.filter(c => {
      const d = new Date(c.date + "T00:00:00")
      // Monthly/weekly recurrence: always count if within range
      if (c.recurrence === "monthly") {
        // count every month in the range
        return true
      }
      return d >= range.start && d <= range.end
    }).map(c => {
      // For monthly recurrence: multiply by number of months in range
      if (c.recurrence === "monthly") {
        const months = Math.max(1, rangeDays / 30)
        return { ...c, _effectiveAmount: c.amount * months }
      }
      if (c.recurrence === "weekly") {
        const weeks = Math.max(1, rangeDays / 7)
        return { ...c, _effectiveAmount: c.amount * weeks }
      }
      return { ...c, _effectiveAmount: c.amount }
    })
  }, [costs, range, rangeDays])

  const totalCosts = useMemo(() =>
    costsInRange.reduce((s, c) => s + (c._effectiveAmount ?? c.amount), 0),
    [costsInRange])

  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // ── Monthly costs (for break-even) ───────────────────────────────────────
  const monthlyCosts = useMemo(() =>
    costs.reduce((s, c) => {
      if (c.recurrence === "monthly") return s + c.amount
      if (c.recurrence === "weekly") return s + c.amount * 4.33
      // one-time: annualize and divide by 12
      return s + c.amount / 12
    }, 0), [costs])

  // ── Cost by category ─────────────────────────────────────────────────────
  const costByCategory = useMemo(() => {
    const map = new Map<CostCategory, number>()
    costsInRange.forEach(c => {
      map.set(c.category, (map.get(c.category) || 0) + (c._effectiveAmount ?? c.amount))
    })
    return Array.from(map.entries()).map(([category, amount]) => ({
      name: COST_CATEGORY_LABELS[category],
      value: amount,
      color: COST_CATEGORY_COLORS[category],
      category,
    }))
  }, [costsInRange])

  const costBySubcategory = useMemo(() => {
    const map = new Map<string, number>()
    costsInRange.forEach(c => {
      map.set(c.subcategory, (map.get(c.subcategory) || 0) + (c._effectiveAmount ?? c.amount))
    })
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount).slice(0, 10)
  }, [costsInRange])

  // ── Revenue by court ─────────────────────────────────────────────────────
  const revenueByCourt = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(b => { const k = courtKey(b); map.set(k, (map.get(k) || 0) + (Number(b.price) || 0)) })
    return Array.from(map.entries()).map(([name, rev]) => ({ name, rev })).sort((a, b) => b.rev - a.rev).slice(0, 8)
  }, [confirmed])

  // ── Court profitability ───────────────────────────────────────────────────
  const courtProfitability = useMemo(() => {
    const courtCosts = new Map<string, number>()
    costsInRange.filter(c => c.court).forEach(c => {
      courtCosts.set(c.court!, (courtCosts.get(c.court!) || 0) + (c._effectiveAmount ?? c.amount))
    })
    const sharedCosts = totalCosts - Array.from(courtCosts.values()).reduce((s, v) => s + v, 0)
    const courts = revenueByCourt.length
    const perCourtShared = courts > 0 ? sharedCosts / courts : 0

    return revenueByCourt.map(({ name, rev }) => {
      const directCost = courtCosts.get(name) || 0
      const totalCourtCost = directCost + perCourtShared
      const profit = rev - totalCourtCost
      const margin = rev > 0 ? (profit / rev) * 100 : 0
      return { name, rev, cost: totalCourtCost, profit, margin }
    }).sort((a, b) => b.profit - a.profit)
  }, [revenueByCourt, costsInRange, totalCosts])

  // ── Revenue by sport / activity ───────────────────────────────────────────
  const revenueBySport = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(b => { const k = sportKey(b); map.set(k, (map.get(k) || 0) + (Number(b.price) || 0)) })
    const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#6366f1"]
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
  }, [confirmed])

  // ── Payment methods ───────────────────────────────────────────────────────
  const paymentMethods = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(b => {
      const k = paymentKey(b); map.set(k, (map.get(k) || 0) + (Number(b.price) || 0))
    })
    return Array.from(map.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: PAYMENT_METHOD_COLORS[name] || "#94a3b8",
    })).sort((a, b) => b.value - a.value)
  }, [confirmed])

  // ── Cash flow KPIs ────────────────────────────────────────────────────────
  const confirmedAmount = totalRevenue
  const pendingAmount = useMemo(() => pending.reduce((s, b) => s + (Number(b.price) || 0), 0), [pending])
  const cancelledAmount = useMemo(() => cancelled.reduce((s, b) => s + (Number(b.price) || 0), 0), [cancelled])

  // ── Revenue timeline ──────────────────────────────────────────────────────
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
        const costsW = costsInRange.filter(c => {
          const d = new Date(c.date + "T00:00:00"); return d >= from && d <= to
        }).reduce((s, c) => s + (c._effectiveAmount ?? c.amount), 0)
        return { name, ingresos, costos: costsW }
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
      const costsD = costsInRange.filter(c => {
        const cd = new Date(c.date + "T00:00:00"); return cd >= from && cd <= to
      }).reduce((s, c) => s + (c._effectiveAmount ?? c.amount), 0)
      return { name, ingresos, costos: costsD }
    })
  }, [bookings, range, rangeDays, now, costsInRange])

  // ── Revenue by time slot heatmap ──────────────────────────────────────────
  const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"]
  const DAYS = [0, 1, 2, 3, 4, 5, 6]

  const heatmapData = useMemo(() => {
    const grid: Record<string, number> = {}
    confirmed.forEach(b => {
      const dt = bookingDateTime(b); if (!dt) return
      const dow = dt.getDay()
      const hh = String(b.time || dt.getHours()).slice(0, 2).padStart(2, "0")
      if (!HOURS.includes(hh)) return
      const key = `${dow}-${hh}`
      grid[key] = (grid[key] || 0) + (Number(b.price) || 0)
    })
    return grid
  }, [confirmed])

  const heatmapMax = useMemo(() => Math.max(1, ...Object.values(heatmapData)), [heatmapData])

  const revenueBySlot = useMemo(() => {
    const map = new Map(HOURS.map(h => [h, 0]))
    confirmed.forEach(b => {
      const hh = String(b.time || "").slice(0, 2).padStart(2, "0")
      if (map.has(hh)) map.set(hh, (map.get(hh)! || 0) + (Number(b.price) || 0))
    })
    return HOURS.map(h => ({ time: `${h}:00`, ingresos: map.get(h) || 0 })).filter(d => d.ingresos > 0)
  }, [confirmed])

  // ── Financial comparisons ─────────────────────────────────────────────────
  const comparisonData = useMemo(() => {
    const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
    const thisMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))

    const thisMonthRev = bookings.filter(b => {
      const dt = bookingDateTime(b); return dt && dt >= thisMonthStart && dt <= now && normStatus(b) === "confirmed"
    }).reduce((s, b) => s + (Number(b.price) || 0), 0)

    const lastMonthRev = bookings.filter(b => {
      const dt = bookingDateTime(b); return dt && dt >= lastMonthStart && dt <= lastMonthEnd && normStatus(b) === "confirmed"
    }).reduce((s, b) => s + (Number(b.price) || 0), 0)

    return [
      { period: "Mes anterior", ingresos: lastMonthRev, fill: "#c4b5fd" },
      { period: "Este mes", ingresos: thisMonthRev, fill: "#8b5cf6" },
    ]
  }, [bookings, now])

  // ── Projections ───────────────────────────────────────────────────────────
  const projectedMonthRevenue = useMemo(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysPassed = now.getDate()
    if (daysPassed === 0) return 0
    return (monthRevenue / daysPassed) * daysInMonth
  }, [monthRevenue, now])

  const projectedMonthProfit = useMemo(() => {
    return projectedMonthRevenue - monthlyCosts
  }, [projectedMonthRevenue, monthlyCosts])

  const projectedMargin = projectedMonthRevenue > 0 ? (projectedMonthProfit / projectedMonthRevenue) * 100 : 0

  const projectionChartData = useMemo(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysPassed = now.getDate()
    const dailyAvg = daysPassed > 0 ? monthRevenue / daysPassed : 0
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const actual = day <= daysPassed ? (monthRevenue / daysPassed) * day : null
      const projected = day > daysPassed ? dailyAvg * day : null
      return { day: `${day}`, actual, projected }
    })
  }, [monthRevenue, now])

  // ── Break-even ───────────────────────────────────────────────────────────
  const breakEvenRevenue = monthlyCosts
  const breakEvenBookings = avgPerBooking > 0 ? Math.ceil(monthlyCosts / avgPerBooking) : 0
  const breakEvenProgress = breakEvenRevenue > 0 ? Math.min(100, (monthRevenue / breakEvenRevenue) * 100) : 0
  const isAboveBreakEven = monthRevenue >= breakEvenRevenue

  // ── Smart Insights ────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { type: "positive" | "warning" | "info"; text: string }[] = []
    if (!inRange.length && !costs.length) return list

    // Revenue vs break-even
    if (breakEvenRevenue > 0) {
      if (isAboveBreakEven)
        list.push({ type: "positive", text: `Estás por encima del punto de equilibrio este mes. Ingresos: ${formatCurrencyARS(monthRevenue)} / Necesario: ${formatCurrencyARS(breakEvenRevenue)}.` })
      else {
        const remaining = breakEvenRevenue - monthRevenue
        list.push({ type: "warning", text: `Te faltan ${formatCurrencyARS(remaining)} para cubrir tus costos fijos este mes.` })
      }
    }

    // Best court
    if (courtProfitability.length >= 2) {
      const best = courtProfitability[0], worst = courtProfitability[courtProfitability.length - 1]
      list.push({ type: "info", text: `"${best.name}" es tu cancha más rentable con un margen del ${fmtPct(best.margin)}.` })
      if (worst.margin < 0)
        list.push({ type: "warning", text: `"${worst.name}" tiene margen negativo (${fmtPct(worst.margin)}). Revisá sus costos asignados.` })
    }

    // Profit margin health
    if (totalRevenue > 0) {
      if (profitMargin >= 40)
        list.push({ type: "positive", text: `Margen neto saludable del ${fmtPct(profitMargin)}. Tu negocio es muy rentable en este período.` })
      else if (profitMargin < 15 && profitMargin >= 0)
        list.push({ type: "warning", text: `Margen neto bajo (${fmtPct(profitMargin)}). Considerá revisar tus costos operativos.` })
      else if (profitMargin < 0)
        list.push({ type: "warning", text: `Margen neto negativo (${fmtPct(profitMargin)}). Los costos superan los ingresos en este período.` })
    }

    // Revenue trend
    if (revTrend.up && totalRevenuePrev > 0)
      list.push({ type: "positive", text: `Los ingresos crecieron ${revTrend.label} vs el período anterior (${formatCurrencyARS(totalRevenuePrev)} → ${formatCurrencyARS(totalRevenue)}).` })
    else if (!revTrend.up && totalRevenuePrev > 0)
      list.push({ type: "warning", text: `Los ingresos bajaron ${revTrend.label} vs el período anterior.` })

    // Projection
    if (projectedMonthRevenue > 0 && projectedMonthRevenue !== monthRevenue)
      list.push({ type: "info", text: `A este ritmo, proyectás ${formatCurrencyARS(projectedMonthRevenue)} de ingresos este mes con una ganancia neta estimada de ${formatCurrencyARS(projectedMonthProfit)}.` })

    // Biggest cost category
    if (costByCategory.length > 0) {
      const top = [...costByCategory].sort((a, b) => b.value - a.value)[0]
      const pct = totalCosts > 0 ? (top.value / totalCosts * 100).toFixed(0) : 0
      list.push({ type: "info", text: `"${top.name}" es tu mayor categoría de gasto (${pct}% del total de costos).` })
    }

    // Payment method diversity
    if (paymentMethods.length === 1)
      list.push({ type: "warning", text: `Solo estás recibiendo pagos por ${paymentMethods[0].name}. Diversificar métodos puede mejorar la cobranza.` })

    // Pending revenue
    if (pendingAmount > 0)
      list.push({ type: "warning", text: `Tenés ${formatCurrencyARS(pendingAmount)} en reservas pendientes de cobro (${pending.length} reservas).` })

    return list
  }, [
    inRange, costs, breakEvenRevenue, isAboveBreakEven, monthRevenue, courtProfitability,
    profitMargin, revTrend, totalRevenuePrev, totalRevenue, projectedMonthRevenue,
    projectedMonthProfit, costByCategory, totalCosts, paymentMethods, pendingAmount,
    pending, breakEvenRevenue,
  ])

  // ── Transactions ──────────────────────────────────────────────────────────
  const allCourts = useMemo(() => Array.from(new Set(inRange.map(courtKey))).sort(), [inRange])
  const allPaymentMethods = useMemo(() => Array.from(new Set(confirmed.map(paymentKey))).sort(), [confirmed])

  const filteredTx = useMemo(() => {
    const term = searchTx.trim().toLowerCase()
    return inRange
      .filter(b => {
        if (filterCourt !== "all" && courtKey(b) !== filterCourt) return false
        if (filterPayment !== "all" && paymentKey(b) !== filterPayment) return false
        if (filterStatus !== "all" && normStatus(b) !== filterStatus) return false
        if (term) {
          const name = String(b.customerName || b.customer || b.customerEmail || "").toLowerCase()
          const court = courtKey(b).toLowerCase()
          if (!name.includes(term) && !court.includes(term)) return false
        }
        return true
      })
      .map(b => ({ ...b, _dt: bookingDateTime(b) }))
      .sort((a, b) => (b._dt?.getTime() ?? 0) - (a._dt?.getTime() ?? 0)) as Array<Booking & { _dt: Date | null }>
  }, [inRange, filterCourt, filterPayment, filterStatus, searchTx])

  const totalTxPages = Math.max(1, Math.ceil(filteredTx.length / ITEMS_PER_PAGE))
  const safeTxPage = Math.min(txPage, totalTxPages)
  const paginatedTx = filteredTx.slice((safeTxPage - 1) * ITEMS_PER_PAGE, safeTxPage * ITEMS_PER_PAGE)

  useEffect(() => { setTxPage(1) }, [filterCourt, filterPayment, filterStatus, searchTx, range])

  // ── Cost CRUD ─────────────────────────────────────────────────────────────
  const openAddCost = useCallback(() => {
    setEditingCost(null)
    setCostForm(BLANK_COST)
    setCostDialog(true)
  }, [])

  const openEditCost = useCallback((c: CostEntry) => {
    setEditingCost(c)
    const { id, ...rest } = c
    setCostForm(rest)
    setCostDialog(true)
  }, [])

  const saveCost = useCallback(async () => {
    if (!resolvedCenterId || costSaving) return
    setCostSaving(true)
    try {
      const root = FIRESTORE_COLLECTIONS.centers
      if (editingCost) {
        await updateDoc(doc(db, root, resolvedCenterId, "costs", editingCost.id), costForm as any)
        setCosts(prev => prev.map(c => c.id === editingCost.id ? { ...costForm, id: editingCost.id } : c))
      } else {
        const ref = await addDoc(collection(db, root, resolvedCenterId, "costs"), costForm as any)
        setCosts(prev => [...prev, { ...costForm, id: ref.id }])
      }
      setCostDialog(false)
    } catch (e) {
      console.error("Error saving cost", e)
    } finally {
      setCostSaving(false)
    }
  }, [resolvedCenterId, editingCost, costForm, costSaving])

  const deleteCost = useCallback(async (id: string) => {
    if (!resolvedCenterId) return
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, "costs", id))
      setCosts(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      console.error("Error deleting cost", e)
    }
  }, [resolvedCenterId])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in-50 duration-500">

      {/* ── Global Date Filter ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border shadow-sm">
          {(["today", "7d", "30d", "thisMonth", "thisYear"] as DatePreset[]).map(p => (
            <button key={p} onClick={() => { setPreset(p); setActiveCustom(false) }}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                preset === p && !activeCustom ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-black text-slate-600"
              )}>
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setShowCustom(v => !v)}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
              activeCustom ? "bg-primary/10 border-primary text-primary" : "bg-background hover:bg-muted border-border text-slate-600"
            )}>
            Personalizado
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
                disabled={!customFrom || !customTo}>Aplicar</Button>
            </div>
          )}
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse">Cargando datos…</span>}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Financial Overview */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={DollarSign} title="Financial Overview"
          description="Resumen financiero completo del período" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 mb-4">
          <KpiCard label="Ingresos totales" value={formatCurrencyARS(totalRevenue)}
            trend={revTrend.label} trendUp={revTrend.up} description="vs período anterior"
            icon={DollarSign} loading={loading} accent />
          <KpiCard label="Costos totales" value={formatCurrencyARS(totalCosts)}
            description="registrados en el período" icon={Wallet} loading={loading || costsLoading} />
          <KpiCard label="Ganancia neta" value={formatCurrencyARS(netProfit)}
            description={netProfit >= 0 ? "Resultado positivo" : "Resultado negativo"}
            icon={netProfit >= 0 ? TrendingUp : TrendingDown} loading={loading || costsLoading} />
          <KpiCard label="Margen de ganancia" value={fmtPct(profitMargin)}
            description="Ganancia / Ingresos" icon={Percent} loading={loading || costsLoading} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 mb-4">
          <KpiCard label="Ingresos hoy" value={formatCurrencyARS(todayRevenue)}
            description="confirmados hoy" icon={CalendarDays} loading={loading} size="sm" />
          <KpiCard label="Ingresos esta semana" value={formatCurrencyARS(weekRevenue)}
            description="últimos 7 días" icon={Activity} loading={loading} size="sm" />
          <KpiCard label="Ingresos este mes" value={formatCurrencyARS(monthRevenue)}
            description="mes en curso" icon={Receipt} loading={loading} size="sm" />
          <KpiCard label="Ingresos este año" value={formatCurrencyARS(yearRevenue)}
            description="año en curso" icon={Building2} loading={loading} size="sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Promedio por reserva" value={formatCurrencyARS(avgPerBooking)}
            trend={avgTrend.label} trendUp={avgTrend.up} description="vs período anterior"
            icon={Receipt} loading={loading} size="sm" />
          <KpiCard label="Promedio por cliente" value={formatCurrencyARS(avgPerClient)}
            description={`${uniqueClients} clientes únicos`} icon={Users} loading={loading} size="sm" />
          <KpiCard label="Promedio por hora cancha" value={formatCurrencyARS(avgPerHour)}
            description={`${totalHours.toFixed(0)} horas en el período`} icon={Clock} loading={loading} size="sm" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Revenue Analytics */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={TrendingUp} title="Revenue Analytics"
          description="Evolución de ingresos y costos en el tiempo" />
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos y costos en el tiempo</CardTitle>
            <CardDescription>Reservas confirmadas vs gastos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton h={260} /> : revenueTimeline.every(d => d.ingresos === 0)
              ? <Empty message="Sin ingresos en este período" />
              : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueTimeline}>
                      <defs>
                        <linearGradient id="gRevFin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={85} tickFormatter={v => fmtShort(v)} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatCurrencyARS(v), name === "ingresos" ? "Ingresos" : "Costos"]} />
                      <Legend iconSize={10} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v === "ingresos" ? "Ingresos" : "Costos"}</span>} />
                      <Area type="monotone" dataKey="ingresos" stroke="#8b5cf6" fill="url(#gRevFin)" strokeWidth={2} />
                      <Bar dataKey="costos" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.7} barSize={rangeDays <= 7 ? 20 : rangeDays <= 31 ? 8 : 14} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — Revenue by Court */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Target} title="Revenue by Court"
          description="Ingresos y ranking de rendimiento por cancha" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="border-none shadow-sm col-span-1 lg:col-span-3">
            <CardHeader><CardTitle>Ingresos por cancha</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : revenueByCourt.length === 0
                ? <Empty message="Sin datos de canchas" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByCourt} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={90} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                        <Bar dataKey="rev" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm col-span-1 lg:col-span-2">
            <CardHeader><CardTitle>Ranking</CardTitle><CardDescription>Por ingresos confirmados</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : revenueByCourt.length === 0 ? <Empty message="Sin datos" /> : (
                <div className="space-y-2">
                  {revenueByCourt.map((c, i) => {
                    const total = revenueByCourt.reduce((s, x) => s + x.rev, 0)
                    const pct = total > 0 ? (c.rev / total * 100) : 0
                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                            {c.name}
                          </span>
                          <span className="text-slate-500 tabular-nums">{formatCurrencyARS(c.rev)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — Revenue by Time Slot */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Clock} title="Revenue by Time Slot"
          description="Franjas horarias más rentables y heatmap de ingresos" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Ingresos por horario</CardTitle><CardDescription>Franjas con mayor facturación</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : revenueBySlot.length === 0
                ? <Empty message="Sin datos de horarios" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueBySlot} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} width={68} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                        <Bar dataKey="ingresos" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                          {revenueBySlot.map((d, i) => {
                            const max = Math.max(...revenueBySlot.map(x => x.ingresos))
                            return <Cell key={i} fill={d.ingresos === max ? "#8b5cf6" : "#06b6d4"} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader><CardTitle>Heatmap: Día × Hora</CardTitle><CardDescription>Ingresos por día de semana y franja horaria</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : Object.keys(heatmapData).length === 0 ? <Empty message="Sin datos suficientes" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0.5">
                    <thead>
                      <tr>
                        <th className="text-slate-400 font-medium text-left pb-1 w-8"></th>
                        {HOURS.map(h => <th key={h} className="text-slate-400 font-medium text-center pb-1 w-[40px]">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(dow => (
                        <tr key={dow}>
                          <td className="text-slate-500 font-medium pr-1">{dayLabel(dow)}</td>
                          {HOURS.map(h => (
                            <td key={h}>
                              <HeatCell value={heatmapData[`${dow}-${h}`] || 0} max={heatmapMax} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                    <span className="text-xs text-slate-400">Menor</span>
                    <div className="flex gap-0.5">
                      {["bg-slate-50", "bg-violet-100", "bg-violet-200", "bg-violet-400", "bg-violet-600"].map((c, i) =>
                        <div key={i} className={cn("h-3 w-5 rounded", c)} />)}
                    </div>
                    <span className="text-xs text-slate-400">Mayor ingreso</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5 — Payment Methods */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={CreditCard} title="Payment Methods"
          description="Cómo pagan tus clientes y qué método genera más ingresos" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Distribución de métodos de pago</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : paymentMethods.length === 0
                ? <Empty message="Sin datos de métodos de pago" />
                : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentMethods} cx="50%" cy="44%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                          {paymentMethods.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v)]} />
                        <Legend iconSize={9} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Detalle por método</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : paymentMethods.length === 0 ? <Empty message="Sin datos" /> : (
                <div className="space-y-3">
                  {paymentMethods.map((pm, i) => {
                    const total = paymentMethods.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? (pm.value / total * 100) : 0
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm items-center">
                          <span className="font-medium text-slate-700 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: pm.color }} />
                            {pm.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{fmtPct(pct)}</span>
                            <span className="font-semibold text-slate-800">{formatCurrencyARS(pm.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pm.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6 — Cash Flow */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Banknote} title="Cash Flow"
          description="Flujo de caja: ingresos confirmados, pendientes y perdidos" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Cobrado" value={formatCurrencyARS(confirmedAmount)}
            description={`${confirmed.length} reservas`} icon={CheckCircle2} loading={loading} accent />
          <KpiCard label="Pendiente de cobro" value={formatCurrencyARS(pendingAmount)}
            description={`${pending.length} reservas`} icon={AlertCircle} loading={loading} />
          <KpiCard label="Perdido por cancelaciones" value={formatCurrencyARS(cancelledAmount)}
            description={`${cancelled.length} canceladas`} icon={XCircle} loading={loading} invertTrend />
          <KpiCard label="Tasa de cobro" value={fmtPct(inRange.length > 0 ? confirmed.length / inRange.length * 100 : 0)}
            description="confirmadas / total" icon={Percent} loading={loading} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7 — Payments & Transactions */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Receipt} title="Payments & Transactions"
          description="Detalle de todas las transacciones del período" />
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Movimientos</CardTitle>
                <CardDescription>{filteredTx.length} transacciones</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Court filter */}
                <Select value={filterCourt} onValueChange={setFilterCourt}>
                  <SelectTrigger size="sm" className="w-36 text-xs">
                    <SelectValue placeholder="Cancha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las canchas</SelectItem>
                    {allCourts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Payment filter */}
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger size="sm" className="w-40 text-xs">
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    {allPaymentMethods.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Status filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger size="sm" className="w-36 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="confirmed">Confirmadas</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar…" value={searchTx} onChange={e => setSearchTx(e.target.value)}
                    className="pl-8 h-8 text-sm w-40" />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                  onClick={() => downloadCSV([
                    ["Fecha", "Hora", "Cliente", "Cancha", "Deporte", "Método de pago", "Estado", "Monto"],
                    ...filteredTx.map(b => [
                      b._dt ? formatDateDisplay(b._dt) : "",
                      String(b.time || ""), String(b.customerName || b.customer || clientKey(b) || "—"),
                      courtKey(b), sportKey(b), paymentKey(b), normStatus(b), String(Number(b.price) || 0),
                    ])
                  ], "transacciones.csv")}
                  disabled={loading || filteredTx.length === 0}>
                  <Download className="h-3.5 w-3.5" />CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}</div>
            ) : filteredTx.length === 0 ? (
              <Empty message="Sin transacciones para los filtros seleccionados" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Cancha</TableHead>
                      <TableHead className="hidden lg:table-cell">Deporte</TableHead>
                      <TableHead className="hidden sm:table-cell">Método</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTx.map((b, i) => (
                      <TableRow key={b.id ?? i}>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {b._dt ? formatDateDisplay(b._dt) : "—"}
                          {b.time && <span className="ml-1 text-xs text-slate-400">{String(b.time).slice(0, 5)}</span>}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{String(b.customerName || b.customer || "—")}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[140px]">{clientKey(b)}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600">{courtKey(b)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-slate-500 capitalize">{sportKey(b)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500 capitalize">{paymentKey(b)}</TableCell>
                        <TableCell><StatusBadge status={normStatus(b)} /></TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {Number(b.price) > 0
                            ? <span className={cn(normStatus(b) === "cancelled" && "line-through text-slate-400")}>{formatCurrencyARS(Number(b.price))}</span>
                            : <span className="text-slate-400">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalTxPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-2">
                    <p className="text-xs text-slate-500">Página {safeTxPage} de {totalTxPages} · {filteredTx.length} movimientos</p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                        disabled={safeTxPage === 1} onClick={() => setTxPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                        disabled={safeTxPage === totalTxPages} onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 8 — Revenue by Activity */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Layers} title="Revenue by Activity"
          description="Qué tipos de actividad generan más ingresos en tu centro" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Distribución por actividad</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : revenueBySport.length === 0 ? <Empty message="Sin datos de actividades" /> : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueBySport} cx="50%" cy="44%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                        {revenueBySport.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v)]} />
                      <Legend iconSize={9} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Ingresos por actividad</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={220} /> : revenueBySport.length === 0 ? <Empty message="Sin datos" /> : (
                <div className="space-y-3">
                  {revenueBySport.map((s, i) => {
                    const total = revenueBySport.reduce((sum, x) => sum + x.value, 0)
                    const pct = total > 0 ? (s.value / total * 100) : 0
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 capitalize flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.name}
                          </span>
                          <span className="text-slate-500">{formatCurrencyARS(s.value)} · {fmtPct(pct)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 9 — Ticket Metrics */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Receipt} title="Ticket Metrics"
          description="Valor promedio de reservas, clientes y horas" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-violet-600 mb-1">Ticket promedio</p>
              <p className="text-3xl font-bold text-violet-700">{loading ? "…" : fmtShort(avgPerBooking)}</p>
              <p className="text-xs text-violet-500 mt-1">por reserva confirmada</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-100/50">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-cyan-600 mb-1">LTV promedio</p>
              <p className="text-3xl font-bold text-cyan-700">{loading ? "…" : fmtShort(avgPerClient)}</p>
              <p className="text-xs text-cyan-500 mt-1">ingreso por cliente</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-emerald-600 mb-1">Ingreso por hora</p>
              <p className="text-3xl font-bold text-emerald-700">{loading ? "…" : fmtShort(avgPerHour)}</p>
              <p className="text-xs text-emerald-500 mt-1">por hora de cancha</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-amber-600 mb-1">Reservas confirmadas</p>
              <p className="text-3xl font-bold text-amber-700">{loading ? "…" : String(confirmed.length)}</p>
              <p className="text-xs text-amber-500 mt-1">en el período seleccionado</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 10 — Financial Comparisons */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={BarChart3} title="Financial Comparisons"
          description="Comparación de ingresos entre períodos" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Este mes vs mes anterior</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={180} /> : (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barSize={48}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} width={72} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Ingresos"]} />
                      <Bar dataKey="ingresos" radius={[6, 6, 0, 0]}>
                        {comparisonData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Período actual vs anterior</CardTitle><CardDescription>Diferencias clave de rendimiento</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton h={180} /> : (
                <div className="space-y-4 pt-2">
                  {[
                    { label: "Ingresos", cur: totalRevenue, prev: totalRevenuePrev, fmt: formatCurrencyARS },
                    { label: "Reservas confirmadas", cur: confirmed.length, prev: confirmedPrev.length, fmt: (v: number) => String(v) },
                    { label: "Ticket promedio", cur: avgPerBooking, prev: avgPerBookingPrev, fmt: formatCurrencyARS },
                  ].map(({ label, cur, prev, fmt }) => {
                    const t = calcTrend(cur, prev)
                    return (
                      <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-slate-600">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">{fmt(prev)}</span>
                          <span className={cn("text-xs font-bold flex items-center gap-0.5", t.up ? "text-emerald-600" : "text-rose-500")}>
                            {t.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {t.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{fmt(cur)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 11 — Cost Tracking */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Wallet} title="Cost Tracking" badge="Maestro"
          description="Registrá y gestioná todos los gastos de tu centro" />

        <div className="flex justify-end mb-4">
          <Dialog open={costDialog} onOpenChange={setCostDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm" onClick={openAddCost}>
                <Plus className="h-4 w-4" /> Agregar costo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCost ? "Editar costo" : "Nuevo costo"}</DialogTitle>
                <DialogDescription>Ingresá los datos del gasto a registrar.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Fecha</label>
                  <Input type="date" value={costForm.date} onChange={e => setCostForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Monto (ARS)</label>
                  <Input type="number" min="0" value={costForm.amount || ""} onChange={e => setCostForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-8 text-sm" placeholder="0" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Categoría</label>
                  <Select value={costForm.category} onValueChange={(v: CostCategory) => setCostForm(f => ({ ...f, category: v, subcategory: COST_SUBCATEGORIES[v][0] }))}>
                    <SelectTrigger size="sm" className="w-full text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(COST_CATEGORY_LABELS) as CostCategory[]).map(c =>
                        <SelectItem key={c} value={c}>{COST_CATEGORY_LABELS[c]}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Subcategoría</label>
                  <Select value={costForm.subcategory} onValueChange={v => setCostForm(f => ({ ...f, subcategory: v }))}>
                    <SelectTrigger size="sm" className="w-full text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COST_SUBCATEGORIES[costForm.category].map(s =>
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600">Descripción</label>
                  <Input value={costForm.description} onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm" placeholder="Detalle del gasto…" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Recurrencia</label>
                  <Select value={costForm.recurrence} onValueChange={(v: RecurrenceType) => setCostForm(f => ({ ...f, recurrence: v }))}>
                    <SelectTrigger size="sm" className="w-full text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">Único</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Cancha (opcional)</label>
                  <Input value={costForm.court || ""} onChange={e => setCostForm(f => ({ ...f, court: e.target.value }))} className="h-8 text-sm" placeholder="Ej: Cancha 1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setCostDialog(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveCost} disabled={costSaving || !costForm.amount || costForm.amount <= 0}>
                  {costSaving ? "Guardando…" : editingCost ? "Actualizar" : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            {costsLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}</div>
            ) : costs.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                <Wallet className="h-10 w-10 opacity-20" />
                <p className="text-sm">No hay costos registrados aún.</p>
                <Button variant="outline" size="sm" onClick={openAddCost} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Agregar primer costo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden md:table-cell">Subcategoría</TableHead>
                    <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                    <TableHead className="hidden sm:table-cell">Recurrencia</TableHead>
                    <TableHead className="hidden md:table-cell">Cancha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.slice().sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm text-slate-600">{c.date}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: COST_CATEGORY_COLORS[c.category] + "22", color: COST_CATEGORY_COLORS[c.category] }}>
                          {COST_CATEGORY_LABELS[c.category]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600">{c.subcategory}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-slate-400 max-w-[180px] truncate">{c.description || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-slate-500 capitalize">{c.recurrence === "one-time" ? "Único" : c.recurrence === "monthly" ? "Mensual" : "Semanal"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-400">{c.court || "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-800">{formatCurrencyARS(c.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditCost(c)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteCost(c.id)} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 12 — Cost Breakdown */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Layers} title="Cost Breakdown"
          description="Cómo se distribuyen los gastos de tu centro" />
        {costsLoading || costs.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-10"><Empty message={costsLoading ? "Cargando costos…" : "Agregá costos para ver el desglose"} /></CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <KpiCard label="Costos totales (período)" value={formatCurrencyARS(totalCosts)}
                description="según recurrencia" icon={Wallet} loading={costsLoading} accent />
              <KpiCard label="Costos mensuales estimados" value={formatCurrencyARS(monthlyCosts)}
                description="base mensual" icon={CalendarDays} loading={costsLoading} />
              <KpiCard label="Categorías registradas" value={String(costByCategory.length)}
                description="tipos de gasto" icon={Layers} loading={costsLoading} />
              <KpiCard label="Costo por reserva" value={confirmed.length > 0 ? formatCurrencyARS(totalCosts / confirmed.length) : "—"}
                description="estimado" icon={Receipt} loading={costsLoading} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle>Costos por categoría</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={costByCategory} cx="50%" cy="44%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                          {costByCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v)]} />
                        <Legend iconSize={9} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle>Top subcategorías</CardTitle><CardDescription>Las partidas de gasto más grandes</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {costBySubcategory.slice(0, 7).map((s, i) => {
                      const pct = totalCosts > 0 ? (s.amount / totalCosts * 100) : 0
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{s.name}</span>
                            <span className="text-slate-500">{formatCurrencyARS(s.amount)} · {fmtPct(pct)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 13 — Profitability */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Scale} title="Profitability"
          description="Rentabilidad real: ingresos, costos y margen neto" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Ingresos (período)" value={formatCurrencyARS(totalRevenue)}
            trend={revTrend.label} trendUp={revTrend.up} icon={DollarSign} loading={loading} accent />
          <KpiCard label="Costos (período)" value={formatCurrencyARS(totalCosts)}
            description="costos registrados" icon={Wallet} loading={costsLoading} />
          <KpiCard label="Ganancia neta" value={formatCurrencyARS(netProfit)}
            description={netProfit >= 0 ? "Positivo ✓" : "Negativo ✗"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} loading={loading || costsLoading} />
          <KpiCard label="Margen neto" value={fmtPct(profitMargin)}
            description="ganancia / ingresos" icon={Percent} loading={loading || costsLoading} />
        </div>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos vs Costos vs Ganancia</CardTitle>
            <CardDescription>Comparación visual en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || costsLoading ? <Skeleton h={200} /> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Ingresos", valor: totalRevenue, fill: "#8b5cf6" },
                    { name: "Costos", valor: totalCosts, fill: "#f43f5e" },
                    { name: "Ganancia", valor: Math.max(0, netProfit), fill: "#10b981" },
                  ]} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} width={80} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v), "Valor"]} />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {[{ fill: "#8b5cf6" }, { fill: "#f43f5e" }, { fill: "#10b981" }].map((c, i) =>
                        <Cell key={i} fill={c.fill} />
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 14 — Court Profitability */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Target} title="Court Profitability"
          description="Rentabilidad por cancha: ingresos, costos asignados y margen" />
        {courtProfitability.length === 0 ? (
          <Card className="border-none shadow-sm"><CardContent className="py-10"><Empty message="Cargá costos para ver la rentabilidad por cancha" /></CardContent></Card>
        ) : (
          <>
            <Card className="border-none shadow-sm mb-4">
              <CardHeader><CardTitle>Ingresos, Costos y Ganancia por Cancha</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courtProfitability} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} width={72} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrencyARS(v)]} />
                      <Legend iconSize={9} iconType="circle" formatter={v => <span className="text-xs text-slate-600">{v === "rev" ? "Ingresos" : v === "cost" ? "Costos" : "Ganancia"}</span>} />
                      <Bar dataKey="rev" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="rev" />
                      <Bar dataKey="cost" fill="#f43f5e" radius={[4, 4, 0, 0]} name="cost" />
                      <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle>Ranking de rentabilidad</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cancha</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Costos estimados</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courtProfitability.map((c, i) => (
                      <TableRow key={c.name}>
                        <TableCell className="text-xs font-bold text-slate-400">{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{c.name}</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrencyARS(c.rev)}</TableCell>
                        <TableCell className="text-right text-slate-400 hidden sm:table-cell">{formatCurrencyARS(c.cost)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", c.profit >= 0 ? "text-emerald-700" : "text-rose-600")}>{formatCurrencyARS(c.profit)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={cn("text-xs", c.margin >= 40 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : c.margin >= 20 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                            {fmtPct(c.margin)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 15 — Break-even Analysis */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Scale} title="Break-even Analysis"
          description="Cuánto necesitás facturar para cubrir tus costos" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Costos fijos mensuales" value={formatCurrencyARS(monthlyCosts)}
            description="base para el cálculo" icon={Wallet} loading={costsLoading} accent />
          <KpiCard label="Break-even en dinero" value={formatCurrencyARS(breakEvenRevenue)}
            description="ingresos mínimos mensuales" icon={Target} loading={costsLoading} />
          <KpiCard label="Break-even en reservas" value={String(breakEvenBookings)}
            description="reservas necesarias / mes" icon={CalendarDays} loading={costsLoading || loading} />
          <KpiCard label="Estado actual" value={isAboveBreakEven ? "✓ Superado" : "⚠ Por debajo"}
            description={`${fmtPct(breakEvenProgress)} del objetivo`} icon={isAboveBreakEven ? CheckCircle2 : AlertCircle} loading={costsLoading || loading} />
        </div>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Progreso hacia el break-even mensual</CardTitle>
                <CardDescription>Ingresos del mes en curso vs punto de equilibrio</CardDescription>
              </div>
              <Badge className={cn("text-xs", isAboveBreakEven ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                {isAboveBreakEven ? "Por encima ✓" : "Por debajo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {costsLoading ? <Skeleton h={60} /> : breakEvenRevenue === 0 ? (
              <p className="text-sm text-slate-400 py-4">Cargá costos mensuales para calcular el break-even.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">Ingresos del mes: <span className="font-semibold text-slate-900">{formatCurrencyARS(monthRevenue)}</span></span>
                  <span className="text-slate-500">Objetivo: <span className="font-semibold">{formatCurrencyARS(breakEvenRevenue)}</span></span>
                </div>
                <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000", isAboveBreakEven ? "bg-emerald-500" : "bg-amber-400")}
                    style={{ width: `${Math.min(100, breakEvenProgress)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {isAboveBreakEven
                    ? `Estás ${formatCurrencyARS(monthRevenue - breakEvenRevenue)} por encima del punto de equilibrio. 🎉`
                    : `Necesitás ${formatCurrencyARS(breakEvenRevenue - monthRevenue)} más para cubrir tus costos este mes.`
                  }
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 16 — Financial Projections */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Forecast} title="Financial Projections"
          description="Proyecciones para el mes en curso basadas en el ritmo actual" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Proyección de ingresos" value={formatCurrencyARS(projectedMonthRevenue)}
            description="mes en curso" icon={TrendingUp} loading={loading} accent />
          <KpiCard label="Proyección de costos" value={formatCurrencyARS(monthlyCosts)}
            description="costos mensuales estimados" icon={Wallet} loading={costsLoading} />
          <KpiCard label="Proyección de ganancia" value={formatCurrencyARS(projectedMonthProfit)}
            description="ingreso − costos proyectados" icon={DollarSign} loading={loading || costsLoading} />
          <KpiCard label="Margen proyectado" value={fmtPct(projectedMargin)}
            description="sobre ingresos proyectados" icon={Percent} loading={loading || costsLoading} />
        </div>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Proyección de ingresos del mes</CardTitle>
            <CardDescription>Real (sólido) vs proyectado (punteado) — {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton h={220} /> : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false}
                      tickFormatter={(v, i) => i % 5 === 0 ? String(v) : ""} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => fmtShort(v)} width={72} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: string) =>
                      v != null ? [formatCurrencyARS(Number(v)), name === "actual" ? "Real" : "Proyectado"] : ["", ""]} />
                    <ReferenceLine x={String(now.getDate())} stroke="#8b5cf6" strokeDasharray="4 2" label={{ value: "Hoy", fontSize: 10, fill: "#8b5cf6" }} />
                    <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                    <Line type="monotone" dataKey="projected" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 17 — Smart Financial Insights */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Lightbulb} title="Smart Financial Insights" badge="IA"
          description="Análisis automático para optimizar la rentabilidad de tu centro" />
        {loading || costsLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
        ) : insights.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-12 flex flex-col items-center gap-2 text-slate-400">
              <Lightbulb className="h-8 w-8 opacity-30" />
              <p className="text-sm">Cargá más datos para generar insights financieros.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((ins, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-sm",
                ins.type === "positive" && "bg-emerald-50 border-emerald-200 text-emerald-800",
                ins.type === "warning" && "bg-amber-50 border-amber-200 text-amber-800",
                ins.type === "info" && "bg-blue-50 border-blue-200 text-blue-800",
              )}>
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
