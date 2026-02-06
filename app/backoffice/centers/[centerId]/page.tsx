"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { backofficeFetch } from "@/lib/backoffice/client"
import { Trash2 } from "lucide-react"

export default function BackofficeCenterDetailPage() {
  const params = useParams<{ centerId: string }>()
  const router = useRouter()
  const centerId = params.centerId

  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const featuredValue = useMemo(() => {
    const v = data?.center?.featuredRank
    return v === null || typeof v === "undefined" ? "" : String(v)
  }, [data])

  const load = async () => {
    try {
      setError(null)
      setLoading(true)
      const res = await backofficeFetch<any>(`/api/backoffice/centers/${centerId}`)
      setData(res)
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

  const patch = async (payload: any) => {
    try {
      setSaving(true)
      await backofficeFetch(`/api/backoffice/centers/${centerId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async () => {
    await patch({ published: !data?.center?.published })
  }

  const toggleStatus = async () => {
    const next = (data?.center?.status || "active") === "active" ? "suspended" : "active"
    await patch({ status: next })
  }

  const saveFeatured = async (value: string) => {
    const n = value.trim() === "" ? null : Number(value)
    if (value.trim() !== "" && Number.isNaN(n)) return
    await patch({ featuredRank: n })
  }

  const handleDelete = async () => {
    const centerName = data?.center?.name || "this center"
    const confirmed = window.confirm(
      `Are you sure you want to delete "${centerName}"?\n\nThis will permanently delete:\n- Center profile\n- All courts\n- All bookings\n- User account\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setDeleting(true)
      await backofficeFetch(`/api/backoffice/centers/${centerId}`, {
        method: "DELETE",
      })
      router.push("/backoffice/centers")
    } catch (e: any) {
      setError(e?.message || "Failed to delete center")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Center</h1>
          <p className="text-sm text-slate-600 mt-1 font-mono">{centerId}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {loading ? <div className="text-slate-600">Loading…</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {data?.center ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-slate-600">Name:</span> {data.center.name || "—"}</div>
              <div><span className="text-slate-600">Email:</span> {data.center.email || "—"}</div>
              <div><span className="text-slate-600">Slug:</span> <span className="font-mono text-xs">{data.center.slug || "—"}</span></div>
              <div><span className="text-slate-600">Published:</span> {data.center.published ? "Yes" : "No"}</div>
              <div><span className="text-slate-600">Status:</span> {data.center.status || "active"}</div>

              <div className="pt-3 flex flex-wrap gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={togglePublished}>
                  {data.center.published ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="outline" disabled={saving} onClick={toggleStatus}>
                  {(data.center.status || "active") === "active" ? "Suspend" : "Activate"}
                </Button>
                <Button 
                  variant="destructive" 
                  disabled={deleting} 
                  onClick={handleDelete}
                  className="ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-slate-600">Courts:</span> {data.courtsCount ?? "—"}</div>
              <div><span className="text-slate-600">Bookings:</span> {data.bookingsCount ?? "—"}</div>

              <div className="pt-3">
                <Label>Featured rank</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    defaultValue={featuredValue}
                    placeholder="e.g. 10"
                    inputMode="numeric"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement
                        saveFeatured(target.value)
                      }
                    }}
                  />
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={saving}
                    onClick={() => {
                      const el = document.activeElement as HTMLInputElement | null
                      if (el && el.tagName === "INPUT") saveFeatured(el.value)
                    }}
                  >
                    Save
                  </Button>
                </div>
                <div className="text-xs text-slate-500 mt-1">Used for ordering on /clubs.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
