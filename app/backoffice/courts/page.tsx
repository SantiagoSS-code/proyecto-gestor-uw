"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"
import { Grid2X2, Search } from "lucide-react"

type CourtRow = {
  courtId: string
  centerId: string
  centerName: string
  centerEmail: string
  ownerEmail: string
  sport: string
  indoor: boolean
  surfaceType: string
  pricePerHour: number | null
  currency: string
  published: boolean
  source: string
}

const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel", tennis: "Tennis", futbol: "Fútbol",
  pickleball: "Pickleball", squash: "Squash",
}

const REFRESH_INTERVAL = 10_000

export default function BackofficeCourtsPage() {
  const [q, setQ]         = useState("")
  const [items, setItems] = useState<CourtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: CourtRow[] }>(
        `/api/backoffice/courts?q=${encodeURIComponent(query)}`,
      )
      setItems(res.items)
    } catch (e: any) {
      setError(e instanceof BackofficeRequestError
        ? { message: e.message, status: e.status }
        : { message: e?.message || "Failed" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load("") }, [])

  useEffect(() => {
    const id = setInterval(() => load(q), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [q])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courts"
        subtitle={`${items.length} courts${loading ? " · refreshing…" : ""}`}
      />

      {/* ── Search ── */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Center, sport, owner, ID…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-4" onClick={() => load(q)}>
          Search
        </Button>
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
              {["Court ID", "Club", "Owner", "Sport", "Surface", "Indoor", "Price / hr", "Published"].map((h) => (
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
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Grid2X2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No courts found.</p>
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={`${c.centerId}-${c.courtId}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-[80px] truncate" title={c.courtId}>{c.courtId}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-slate-800">{c.centerName || "—"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.centerEmail || ""}</p>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500 max-w-[130px] truncate" title={c.ownerEmail}>{c.ownerEmail || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-700">{c.sport ? (SPORT_LABEL[c.sport] || c.sport) : "—"}</td>
                  <td className="py-2.5 px-3 text-slate-500 capitalize">{c.surfaceType || "—"}</td>
                  <td className="py-2.5 px-3">
                    <BoBadge value={c.indoor ? "active" : "disabled"} label={c.indoor ? "Indoor" : "Outdoor"} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                    {typeof c.pricePerHour === "number"
                      ? `${c.currency || "ARS"} ${c.pricePerHour.toLocaleString("es-AR")}`
                      : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <BoBadge value={c.published ? "published" : "unpublished"} label={c.published ? "Yes" : "No"} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
