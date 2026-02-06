"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"

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

export default function BackofficeCentersPage() {
  const [q, setQ] = useState("")
  const [items, setItems] = useState<CenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: CenterRow[] }>(`/api/backoffice/centers?q=${encodeURIComponent(query)}`)
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
        <h1 className="text-2xl font-semibold text-slate-900">Centers / Clubs</h1>
        <p className="text-sm text-slate-600 mt-1">Review and manage centers visibility and status.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, slug, id" />
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
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Slug</th>
              <th className="py-2 px-3">Owner</th>
              <th className="py-2 px-3">Courts</th>
              <th className="py-2 px-3">Sports</th>
              <th className="py-2 px-3">Published</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Featured</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.centerId} className="border-t border-slate-100">
                <td className="py-2 px-3 font-mono text-xs text-slate-800">{c.centerId}</td>
                <td className="py-2 px-3">{c.name || "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-slate-700">{c.slug || "—"}</td>
                <td className="py-2 px-3 text-xs text-slate-700">{c.ownerEmail || "—"}</td>
                <td className="py-2 px-3">{typeof c.courtsCount === "number" ? c.courtsCount : "—"}</td>
                <td className="py-2 px-3 text-xs text-slate-700">{c.sports?.length ? c.sports.join(", ") : "—"}</td>
                <td className="py-2 px-3">{c.published ? "Yes" : "No"}</td>
                <td className="py-2 px-3">{c.status || "active"}</td>
                <td className="py-2 px-3">{c.featuredRank ?? "—"}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/backoffice/centers/${c.centerId}`} className="text-blue-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-6 px-3 text-slate-600" colSpan={10}>
                  No centers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
