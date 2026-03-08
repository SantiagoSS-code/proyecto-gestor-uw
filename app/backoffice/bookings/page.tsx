"use client"

import { useEffect, useMemo, useState } from "react"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { Input } from "@/components/ui/input"
import { CalendarClock, Search, X } from "lucide-react"

const BOOKING_STATUSES = ["confirmed", "pending_payment", "cancelled", "expired"]
const PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"]
const SPORTS            = ["padel", "tennis", "futbol", "pickleball", "squash"]

const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel", tennis: "Tennis", futbol: "Fútbol",
  pickleball: "Pickleball", squash: "Squash",
}

function fmtCurrency(price: number | null, currency = "ARS") {
  if (price == null) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: currency === "ARS" ? "ARS" : "USD", minimumFractionDigits: 0,
  }).format(price)
}

function fmtCreatedAt(v: any): string {
  if (!v) return "—"
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleDateString("es-AR")
  if (v?.toDate)   return v.toDate().toLocaleDateString("es-AR")
  if (typeof v === "string") return new Date(v).toLocaleDateString("es-AR")
  return "—"
}

function FilterSelect({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export default function BackofficeBookingsPage() {
  const [items, setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<{ message: string; status?: number } | null>(null)

  // Filters (client-side after load)
  const [search, setSearch]         = useState("")
  const [filterDate, setFilterDate]  = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPayment, setFilterPayment] = useState("")
  const [filterSport, setFilterSport]   = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        setLoading(true)
        const res = await backofficeFetch<{ items: any[] }>("/api/backoffice/bookings?limit=200")
        setItems(res.items)
      } catch (e: any) {
        setError(e instanceof BackofficeRequestError
          ? { message: e.message, status: e.status }
          : { message: e?.message || "Failed" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Client-side filtering
  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (filterDate   && b.date !== filterDate) return false
      if (filterStatus && b.bookingStatus !== filterStatus) return false
      if (filterPayment && b.paymentStatus !== filterPayment) return false
      if (filterSport  && b.sport !== filterSport) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [b.clubName, b.courtName, b.userName, b.userId, b.id, b.sport].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, search, filterDate, filterStatus, filterPayment, filterSport])

  const hasFilters = search || filterDate || filterStatus || filterPayment || filterSport
  const clearFilters = () => {
    setSearch(""); setFilterDate(""); setFilterStatus(""); setFilterPayment(""); setFilterSport("")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={`${filtered.length} of ${items.length} total${loading ? " · loading…" : ""}`}
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search club, court, player…"
            className="pl-8 h-9 w-52 text-sm"
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <FilterSelect value={filterStatus}  onChange={setFilterStatus}  options={BOOKING_STATUSES} placeholder="Booking status" />
        <FilterSelect value={filterPayment} onChange={setFilterPayment} options={PAYMENT_STATUSES} placeholder="Payment status" />
        <FilterSelect value={filterSport}   onChange={setFilterSport}   options={SPORTS}           placeholder="Sport" />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error {error.status ?? ""}:</strong> {error.message}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {["ID", "Club", "Court", "Player", "Date", "Time", "Sport", "Booking", "Payment", "Price", "Created"].map((h) => (
                <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center">
                  <CalendarClock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No bookings match your filters.</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((b, i) => (
                <tr key={`${b.path}:${b.id}:${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-[80px] truncate" title={b.id}>{b.id || "—"}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{b.clubName || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-600">{b.courtName || b.courtId || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-[100px] truncate" title={b.userName || b.userId}>{b.userName || b.userId || "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{b.date || "—"}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">{b.startTime && b.endTime ? `${b.startTime}–${b.endTime}` : "—"}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">{b.sport ? (SPORT_LABEL[b.sport] || b.sport) : "—"}</td>
                  <td className="py-2.5 px-3"><BoBadge value={b.bookingStatus || b.status} /></td>
                  <td className="py-2.5 px-3"><BoBadge value={b.paymentStatus} /></td>
                  <td className="py-2.5 px-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                    {fmtCurrency(b.price, b.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-400 whitespace-nowrap">{fmtCreatedAt(b.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
