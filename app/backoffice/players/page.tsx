"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BoBadge } from "@/components/backoffice/bo-badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"
import { Search, Users } from "lucide-react"

type PlayerRow = {
  uid: string
  email?: string
  name?: string
  status?: string
  city?: string
  createdAt?: any
  totalBookings?: number
}

function fmtDate(v: any): string {
  if (!v) return "—"
  if (v?.toDate)   return v.toDate().toLocaleDateString("es-AR")
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleDateString("es-AR")
  if (typeof v === "string") return new Date(v).toLocaleDateString("es-AR")
  return "—"
}

export default function BackofficePlayersPage() {
  const [q, setQ]         = useState("")
  const [items, setItems] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: PlayerRow[] }>(
        `/api/backoffice/players?q=${encodeURIComponent(query)}`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Players"
        subtitle={`${items.length} players${loading ? " · loading…" : ""}`}
      />

      {/* ── Search ── */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Name, email, or UID…"
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
              {["UID", "Name", "Email", "City", "Status", "Joined", "Actions"].map((h) => (
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No players found.</p>
                  <p className="text-xs text-slate-400 mt-1">Players must have a <code className="bg-slate-100 px-1 rounded">users</code> doc with <code className="bg-slate-100 px-1 rounded">role=player</code>.</p>
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.uid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-[80px] truncate" title={u.uid}>{u.uid}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{u.name || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={u.email}>{u.email || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-500">{u.city || "—"}</td>
                  <td className="py-2.5 px-3"><BoBadge value={u.status || "active"} /></td>
                  <td className="py-2.5 px-3 text-xs text-slate-400">{fmtDate(u.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/backoffice/players/${u.uid}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/backoffice/bookings?player=${u.uid}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        Bookings
                      </Link>
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
