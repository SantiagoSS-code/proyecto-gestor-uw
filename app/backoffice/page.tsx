"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"
import {
  CalendarClock,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { BoBadge } from "@/components/backoffice/bo-badge"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewKPIs {
  totalPlayers: number
  totalCenters: number
  totalBookings: number
  revenue: null
}

interface OverviewData {
  kpis: OverviewKPIs
  recent: {
    users: any[]
    bookings: any[]
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function fmtDate(v: any): string {
  if (!v) return "—"
  if (v?.toDate) return v.toDate().toLocaleString("es-AR")
  if (typeof v === "string") return new Date(v).toLocaleString("es-AR")
  return String(v)
}

function fmtCurrency(n: number | null, currency = "ARS") {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, minimumFractionDigits: 0,
  }).format(n)
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconBg,
  iconColor,
  loading,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  Icon: any
  iconBg: string
  iconColor: string
  loading?: boolean
  href?: string
}) {
  const inner = (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md hover:border-slate-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-16 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="text-[26px] font-bold leading-none text-slate-900 mt-1">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{children}</h2>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BackofficeDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date())

  const load = async () => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<OverviewData>("/api/backoffice/overview")
      setData(res)
      setRefreshedAt(new Date())
    } catch (e: any) {
      setError(e instanceof BackofficeRequestError ? e.message : (e?.message || "Failed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Derived metrics from recent bookings
  const today = getToday()
  const weekStart = getWeekStart()
  const recentBookings: any[] = data?.recent?.bookings ?? []

  const bookingsToday  = recentBookings.filter((b) => b.date === today).length
  const bookingsWeek   = recentBookings.filter((b) => b.date >= weekStart).length
  const pendingBookings = recentBookings.filter(
    (b) => b.bookingStatus === "pending_payment" || b.status === "pending",
  ).length

  const confirmedBookings = recentBookings.filter(
    (b) => b.bookingStatus === "confirmed" || b.status === "confirmed",
  ).length

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Platform overview · refreshed {refreshedAt.toLocaleTimeString("es-AR")}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Platform KPIs ── */}
      <div>
        <SectionTitle>Platform</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Active clubs"
            value={data?.kpis.totalCenters ?? "—"}
            Icon={Building2}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            loading={loading}
            href="/backoffice/centers"
          />
          <KpiCard
            label="Active players"
            value={data?.kpis.totalPlayers ?? "—"}
            Icon={Users}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            loading={loading}
            href="/backoffice/players"
          />
          <KpiCard
            label="Total bookings"
            value={data?.kpis.totalBookings ?? "—"}
            sub="(last 10 sampled)"
            Icon={CalendarClock}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={loading}
            href="/backoffice/bookings"
          />
          <KpiCard
            label="Revenue"
            value="—"
            sub="Mercado Pago · coming soon"
            Icon={CreditCard}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            loading={false}
            href="/backoffice/payments"
          />
        </div>
      </div>

      {/* ── Bookings KPIs ── */}
      <div>
        <SectionTitle>Bookings · from recent sample</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Bookings today"
            value={bookingsToday}
            sub={today}
            Icon={CalendarClock}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            loading={loading}
          />
          <KpiCard
            label="Bookings this week"
            value={bookingsWeek}
            sub={`since ${weekStart}`}
            Icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={loading}
          />
          <KpiCard
            label="Pending payment"
            value={pendingBookings}
            Icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            loading={loading}
            href="/backoffice/bookings"
          />
          <KpiCard
            label="Confirmed"
            value={confirmedBookings}
            Icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={loading}
            href="/backoffice/bookings"
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          ⓘ Metrics based on the most recent 10 bookings returned by the API. Full aggregation coming soon.
        </p>
      </div>

      {/* ── Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Recent bookings</SectionTitle>
            <Link href="/backoffice/bookings" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-6 text-center">
                <CalendarClock className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No bookings yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Club</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.slice(0, 6).map((b, i) => (
                    <tr key={`${b.path}:${b.id}:${i}`} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 px-4 text-sm text-slate-800">{b.clubName || "—"}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-500 font-mono">{b.date || "—"}</td>
                      <td className="py-2.5 px-4">
                        <BoBadge value={b.bookingStatus || b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Recent users</SectionTitle>
            <Link href="/backoffice/players" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View players →
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (data?.recent?.users ?? []).length === 0 ? (
              <div className="p-6 text-center">
                <Users className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No users yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Role</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent?.users ?? []).slice(0, 6).map((u: any) => (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 px-4 text-sm text-slate-800 truncate max-w-[140px]">{u.email || "—"}</td>
                      <td className="py-2.5 px-4">
                        <BoBadge value={u.role || "unknown"} />
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-400">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div>
        <SectionTitle>Quick access</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Bookings", href: "/backoffice/bookings", Icon: CalendarClock },
            { label: "Players",  href: "/backoffice/players",  Icon: Users },
            { label: "Clubs",    href: "/backoffice/centers",  Icon: Building2 },
            { label: "Courts",   href: "/backoffice/courts",   Icon: AlertTriangle },
            { label: "Payments", href: "/backoffice/payments", Icon: CreditCard },
            { label: "Reports",  href: "/backoffice/reports",  Icon: TrendingUp },
          ].map(({ label, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-4 text-center text-xs font-medium text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Icon className="w-5 h-5 text-slate-400" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

