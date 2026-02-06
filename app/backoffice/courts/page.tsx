"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"

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

export default function BackofficeCourtsPage() {
  const [q, setQ] = useState("")
  const [items, setItems] = useState<CourtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: CourtRow[] }>(`/api/backoffice/courts?q=${encodeURIComponent(query)}`)
      setItems(res.items)
    } catch (e: any) {
      if (e instanceof BackofficeRequestError) {
        setError({ message: e.message, status: e.status })
      } else {
        setError({ message: e?.message || "Failed" })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load("")
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      load(q)
    }, 10000)
    return () => clearInterval(interval)
  }, [q])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Courts</h1>
        <p className="text-sm text-slate-600 mt-1">Review courts seen on center dashboards.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by center, sport, owner, id" />
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => load(q)}>
          Search
        </Button>
      </div>

      {loading ? <div className="text-slate-600">Loading…</div> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="font-semibold">Request failed</div>
          <div>{error.message}</div>
          {typeof error.status === "number" ? <div className="text-xs mt-1">Status: {error.status}</div> : null}
        </div>
      ) : null}

      <div className="overflow-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600 bg-slate-50">
              <th className="py-2 px-3">Court ID</th>
              <th className="py-2 px-3">Center</th>
              <th className="py-2 px-3">Owner</th>
              <th className="py-2 px-3">Sport</th>
              <th className="py-2 px-3">Surface</th>
              <th className="py-2 px-3">Price</th>
              <th className="py-2 px-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={`${c.centerId}-${c.courtId}`} className="border-t border-slate-100">
                <td className="py-2 px-3 font-mono text-xs text-slate-800">{c.courtId}</td>
                <td className="py-2 px-3">
                  <div className="font-medium text-slate-900">{c.centerName || "—"}</div>
                  <div className="text-xs text-slate-600">{c.centerEmail || "—"}</div>
                </td>
                <td className="py-2 px-3 text-xs text-slate-700">{c.ownerEmail || "—"}</td>
                <td className="py-2 px-3">{c.sport || "—"}</td>
                <td className="py-2 px-3">{c.surfaceType || "—"}</td>
                <td className="py-2 px-3">
                  {typeof c.pricePerHour === "number" ? `${c.currency || "ARS"} ${c.pricePerHour}/hr` : "—"}
                </td>
                <td className="py-2 px-3">{c.published ? "Yes" : "No"}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-6 px-3 text-slate-600" colSpan={7}>
                  No courts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
