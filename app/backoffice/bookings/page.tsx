"use client"

import { useEffect, useState } from "react"
import { backofficeFetch, BackofficeRequestError } from "@/lib/backoffice/client"

export default function BackofficeBookingsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        setLoading(true)
        const res = await backofficeFetch<{ items: any[] }>("/api/backoffice/bookings?limit=100")
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
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-600 mt-1">Read-only list of recent bookings (MVP).</p>
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
              <th className="py-2 px-3">Club</th>
              <th className="py-2 px-3">Cancha</th>
              <th className="py-2 px-3">Jugador</th>
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Horario</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3">Pago</th>
              <th className="py-2 px-3">Precio</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={`${b.path}:${b.id}`} className="border-t border-slate-100">
                <td className="py-2 px-3 text-sm">{b.clubName || "—"}</td>
                <td className="py-2 px-3 text-xs font-mono">{b.courtName || b.courtId || "—"}</td>
                <td className="py-2 px-3 text-xs">{b.userName || b.userId || "—"}</td>
                <td className="py-2 px-3 text-xs font-mono">{b.date || "—"}</td>
                <td className="py-2 px-3 text-xs">{b.startTime && b.endTime ? `${b.startTime}–${b.endTime}` : "—"}</td>
                <td className="py-2 px-3 text-xs">{b.bookingStatus || b.status || "—"}</td>
                <td className="py-2 px-3 text-xs">{b.paymentStatus || "—"}</td>
                <td className="py-2 px-3 text-xs">{b.price != null ? `${b.currency ?? ""} ${b.price}` : "—"}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-6 px-3 text-slate-600" colSpan={8}>
                  No bookings found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
