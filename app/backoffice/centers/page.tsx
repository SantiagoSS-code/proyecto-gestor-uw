"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"
import { Building2, Search, Star } from "lucide-react"

type CenterRow = {
  centerId: string
  name?: string
  email?: string
  ownerEmail?: string | null
  slug?: string
  published?: boolean
  status?: string
  featuredRank?: number | null
  courtsCount?: number
  sports?: string[]
}

// Auto-refresh every 10 s (keep existing behaviour)
const REFRESH_INTERVAL = 10_000

export default function BackofficeCentersPage() {
  const [q, setQ]         = useState("")
  const [items, setItems] = useState<CenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: CenterRow[] }>(
        `/api/backoffice/centers?q=${encodeURIComponent(query)}`,
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
        title="Clubs"
        subtitle={`${items.length} clubs${loading ? " · refreshing…" : ""}`}
      />

      {/* ── Search ── */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Name, email, slug, or ID…"
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
              {["ID", "Name", "Slug", "Owner", "Courts", "Sports", "Published", "Status", "Featured", "Actions"].map((h) => (
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
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No clubs found.</p>
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.centerId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-[72px] truncate" title={c.centerId}>{c.centerId}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.name || "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{c.slug || "—"}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-600 max-w-[130px] truncate" title={c.ownerEmail ?? undefined}>{c.ownerEmail || "—"}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">{typeof c.courtsCount === "number" ? c.courtsCount : "—"}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">{c.sports?.length ? c.sports.join(", ") : "—"}</td>
                  <td className="py-2.5 px-3"><BoBadge value={c.published ? "published" : "unpublished"} label={c.published ? "Yes" : "No"} /></td>
                  <td className="py-2.5 px-3"><BoBadge value={c.status || "active"} /></td>
                  <td className="py-2.5 px-3">
                    {c.featuredRank != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {c.featuredRank}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/backoffice/centers/${c.centerId}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        View
                      </Link>
                      {c.slug && (
                        <a
                          href={`/centros/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        >
                          Live ↗
                        </a>
                      )}
                    </div>
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
