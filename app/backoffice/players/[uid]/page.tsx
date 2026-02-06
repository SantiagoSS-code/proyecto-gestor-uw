"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { backofficeFetch } from "@/lib/backoffice/client"

export default function BackofficePlayerDetailPage() {
  const params = useParams<{ uid: string }>()
  const router = useRouter()
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid

  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!uid) return
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<any>(`/api/backoffice/players/${uid}`)
      setData(res)
    } catch (e: any) {
      setError(e?.message || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const setStatus = async (status: "active" | "disabled") => {
    try {
      setSaving(true)
      await backofficeFetch(`/api/backoffice/players/${uid}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!uid) return
    if (!window.confirm("¿Eliminar esta cuenta? Esta acción no se puede deshacer.")) return
    try {
      setSaving(true)
      await backofficeFetch(`/api/backoffice/players/${uid}/delete`, {
        method: "POST",
      })
      router.push("/backoffice/players")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jugador</h1>
          <p className="text-sm text-black mt-1 font-mono">{uid}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      {loading ? <div className="text-black">Cargando…</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {data?.user ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-black">Email:</span> {data.user.email || "—"}</div>
              <div><span className="text-black">Nombre:</span> {data.user.name || data.user.displayName || data.player?.name || "—"}</div>
              <div><span className="text-black">Rango de edad:</span> {data.player?.ageRange || "—"}</div>
              <div><span className="text-black">Nivel de juego:</span> {data.player?.level || data.player?.skillLevel || "—"}</div>
              <div><span className="text-black">Género:</span> {data.player?.gender || "—"}</div>
              <div><span className="text-black">Estado:</span> {data.user.status || "active"}</div>

              <div className="pt-3 flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                  onClick={() => setStatus("active")}
                >
                  Reactivar
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setStatus("disabled")}
                >
                  Pausar
                </Button>
                <Button
                  variant="destructive"
                  disabled={saving}
                  onClick={deleteAccount}
                >
                  Eliminar cuenta
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Reservas (MVP)</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(data.bookings) && data.bookings.length ? (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-black">
                        <th className="py-2">ID</th>
                        <th className="py-2">Estado</th>
                        <th className="py-2">Ruta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bookings.map((b: any) => (
                        <tr key={b.id} className="border-t border-slate-100">
                          <td className="py-2 font-mono text-xs text-slate-800">{b.id}</td>
                          <td className="py-2">{b.status || "—"}</td>
                          <td className="py-2 font-mono text-xs text-black">{b.path}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-black">No se encontraron reservas.</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
