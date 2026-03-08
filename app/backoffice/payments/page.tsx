"use client"

import { useEffect, useState } from "react"
import { backofficeFetch } from "@/lib/backoffice/client"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { CreditCard, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react"

// Attempt to read payment-related data from bookings (best-effort)
interface PaymentSummary {
  total: number
  approved: number
  pending: number
  failed: number
  totalRevenue: number | null
}

function KpiCard({
  label, value, Icon, iconBg, iconColor, loading,
}: {
  label: string; value: string | number; Icon: any; iconBg: string; iconColor: string; loading?: boolean
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {loading
          ? <div className="mt-1.5 h-7 w-12 animate-pulse rounded-lg bg-slate-100" />
          : <p className="text-[24px] font-bold leading-none text-slate-900 mt-1">{value}</p>
        }
      </div>
    </div>
  )
}

export default function BackofficePaymentsPage() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Derive payment data from bookings (no dedicated payments collection yet)
        const res = await backofficeFetch<{ items: any[] }>("/api/backoffice/bookings?limit=200")
        const items: any[] = res.items ?? []
        const approved = items.filter((b) => b.paymentStatus === "paid" || b.bookingStatus === "confirmed")
        const pending  = items.filter((b) => b.paymentStatus === "pending" || b.bookingStatus === "pending_payment")
        const failed   = items.filter((b) => b.paymentStatus === "failed"  || b.bookingStatus === "expired")

        const revenue = approved.reduce((acc, b) => acc + (typeof b.price === "number" ? b.price : 0), 0)

        setSummary({
          total: items.length,
          approved: approved.length,
          pending:  pending.length,
          failed:   failed.length,
          totalRevenue: revenue > 0 ? revenue : null,
        })

        // Show recent payments (any booking with a price)
        setBookings(items.filter((b) => b.price != null).slice(0, 30))
      } catch {
        // Silent — page still renders with placeholders
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        subtitle="Finance overview · derived from booking data"
      />

      {/* ── Finance KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total bookings"   value={summary?.total ?? "—"}    Icon={CreditCard}    iconBg="bg-blue-50"    iconColor="text-blue-600"    loading={loading} />
        <KpiCard label="Approved / paid"  value={summary?.approved ?? "—"} Icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
        <KpiCard label="Pending payment"  value={summary?.pending ?? "—"}  Icon={Clock}         iconBg="bg-amber-50"   iconColor="text-amber-600"   loading={loading} />
        <KpiCard label="Failed / expired" value={summary?.failed ?? "—"}   Icon={AlertTriangle} iconBg="bg-red-50"     iconColor="text-red-500"     loading={loading} />
      </div>

      {/* Revenue banner */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
        <TrendingUp className="w-8 h-8 text-slate-400 shrink-0" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estimated platform revenue</p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {loading
              ? "—"
              : summary?.totalRevenue
                ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(summary.totalRevenue)
                : "—"
            }
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Sum of confirmed bookings · Mercado Pago integration pending</p>
        </div>
      </div>

      {/* ── Mercado Pago / Stripe integration notice ── */}
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-800">🏗 Payment provider integration — coming soon</p>
        <p className="text-xs text-amber-700 mt-1">
          Mercado Pago webhooks and Stripe Connect will populate this section with real transaction data.
          The table below is derived from booking records as an MVP proxy.
        </p>
      </div>

      {/* ── Transaction list ── */}
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Booking payment records ({bookings.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {["Club", "Player", "Date", "Amount", "Booking", "Payment"].map((h) => (
                  <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && bookings.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <CreditCard className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No payment records yet.</p>
                  </td>
                </tr>
              ) : (
                bookings.map((b, i) => (
                  <tr key={`${b.id}:${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{b.clubName || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs">{b.userName || b.userId || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{b.date || "—"}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {b.price != null
                        ? new Intl.NumberFormat("es-AR", { style: "currency", currency: b.currency || "ARS", minimumFractionDigits: 0 }).format(b.price)
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3"><BoBadge value={b.bookingStatus || b.status} /></td>
                    <td className="py-2.5 px-3"><BoBadge value={b.paymentStatus || "—"} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

