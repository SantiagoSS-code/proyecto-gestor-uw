"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"

type PlayerRow = {
  uid: string
  email?: string
  name?: string
  status?: string
  createdAt?: any
}

export default function BackofficePlayersPage() {
  const [q, setQ] = useState("")
  const [items, setItems] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const load = async (query: string) => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: PlayerRow[] }>(`/api/backoffice/players?q=${encodeURIComponent(query)}`)
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Players</h1>
          <p className="text-sm text-slate-600 mt-1">Search and manage player accounts (soft disable only).</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, uid" />
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
              <th className="py-2 px-3">UID</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.uid} className="border-t border-slate-100">
                <td className="py-2 px-3 font-mono text-xs text-slate-800">{u.uid}</td>
                <td className="py-2 px-3">{u.email || "—"}</td>
                <td className="py-2 px-3">{u.name || "—"}</td>
                <td className="py-2 px-3">{u.status || "active"}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/backoffice/players/${u.uid}`} className="text-blue-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-6 px-3 text-slate-600" colSpan={5}>
                  No players found. (MVP note: players must have a /users doc with role=player.)
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
