"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { backofficeFetch } from "@/lib/backoffice/client"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import {
  AlertTriangle,
  Building2,
  CalendarX,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportSection {
  title: string
  Icon: any
  iconBg: string
  iconColor: string
  count: number
  items: any[]
  emptyLabel: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(key: string) {
  if (!key) return "—"
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Section card ─────────────────────────────────────────────────────────────

function ReportCard({ section }: { section: ReportSection }) {
  const Icon = section.Icon
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${section.iconBg}`}>
          <Icon className={`w-4 h-4 ${section.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{section.title}</p>
        </div>
        <span className={`text-lg font-bold ${section.count > 0 ? section.iconColor : "text-slate-300"}`}>
          {section.count}
        </span>
      </div>

      {/* Items */}
      {section.items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1.5" />
          <p className="text-xs text-slate-500">{section.emptyLabel}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {section.items.slice(0, 5).map((item: any, i: number) => (
            <div key={`${item.id}:${i}`} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.clubName || item.name || item.email || "—"}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {item.date ? fmtDate(item.date) : ""}
                  {item.courtName ? ` · ${item.courtName}` : ""}
                  {item.sport ? ` · ${item.sport}` : ""}
                </p>
              </div>
              <BoBadge value={item.bookingStatus || item.status} />
            </div>
          ))}
          {section.items.length > 5 && (
            <div className="px-5 py-2.5 text-center">
              <p className="text-xs text-slate-400">+{section.items.length - 5} more</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BackofficeReportsPage() {
  const [bookings, setBookings]   = useState<any[]>([])
  const [centers, setCenters]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshedAt, setRefreshedAt] = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const [bRes, cRes] = await Promise.all([
        backofficeFetch<{ items: any[] }>("/api/backoffice/bookings?limit=200").catch(() => ({ items: [] })),
        backofficeFetch<{ items: any[] }>("/api/backoffice/centers?q=").catch(() => ({ items: [] })),
      ])
      setBookings(bRes.items ?? [])
      setCenters(cRes.items ?? [])
      setRefreshedAt(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Derived report sections
  const sections: ReportSection[] = useMemo(() => {
    const expired   = bookings.filter((b) => b.bookingStatus === "expired")
    const cancelled = bookings.filter((b) => b.bookingStatus === "cancelled")
    const failedPay = bookings.filter((b) => b.paymentStatus === "failed" || b.bookingStatus === "expired")
    const pendingPay = bookings.filter((b) => b.bookingStatus === "pending_payment")
    const unpublishedClubs = centers.filter((c) => !c.published)
    const noCourtsClubs = centers.filter((c) => typeof c.courtsCount === "number" && c.courtsCount === 0)

    return [
      {
        title: "Expired bookings",
        Icon: Clock,
        iconBg: "bg-slate-100",
        iconColor: "text-slate-500",
        count: expired.length,
        items: expired,
        emptyLabel: "No expired bookings",
      },
      {
        title: "Cancelled bookings",
        Icon: XCircle,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        count: cancelled.length,
        items: cancelled,
        emptyLabel: "No cancelled bookings",
      },
      {
        title: "Failed / unpaid bookings",
        Icon: AlertTriangle,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        count: failedPay.length,
        items: failedPay,
        emptyLabel: "No failed payments",
      },
      {
        title: "Pending payment",
        Icon: CalendarX,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        count: pendingPay.length,
        items: pendingPay,
        emptyLabel: "No pending payments",
      },
      {
        title: "Unpublished clubs",
        Icon: Building2,
        iconBg: "bg-slate-100",
        iconColor: "text-slate-500",
        count: unpublishedClubs.length,
        items: unpublishedClubs.map((c) => ({
          id: c.centerId,
          name: c.name,
          status: c.status,
        })),
        emptyLabel: "All clubs are published",
      },
      {
        title: "Clubs with 0 courts",
        Icon: Building2,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
        count: noCourtsClubs.length,
        items: noCourtsClubs.map((c) => ({
          id: c.centerId,
          name: c.name,
          status: "no_courts",
        })),
        emptyLabel: "All clubs have courts",
      },
    ]
  }, [bookings, centers])

  const totalIssues = sections.reduce((a, s) => a + s.count, 0)

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <PageHeader
          title="Reports"
          subtitle={`Operational health · ${totalIssues} issue${totalIssues !== 1 ? "s" : ""} detected · refreshed ${refreshedAt.toLocaleTimeString("es-AR")}`}
        />
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Health summary banner ── */}
      {!loading && totalIssues === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Platform looks healthy</p>
            <p className="text-xs text-emerald-600 mt-0.5">No expired, cancelled, or failed records detected in the current dataset.</p>
          </div>
        </div>
      ) : !loading && totalIssues > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{totalIssues} issue{totalIssues !== 1 ? "s" : ""} to review</p>
            <p className="text-xs text-amber-700 mt-0.5">Review the sections below and take action where needed.</p>
          </div>
        </div>
      ) : null}

      {/* ── Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* ── Report sections ── */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s) => <ReportCard key={s.title} section={s} />)}
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Go to</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All bookings", href: "/backoffice/bookings" },
            { label: "Clubs", href: "/backoffice/centers" },
            { label: "Players", href: "/backoffice/players" },
            { label: "Payments", href: "/backoffice/payments" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
            >
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
