"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { backofficeFetch } from "@/lib/backoffice/client"
import { ChevronDown, Trash2 } from "lucide-react"

function toDateLabel(value: any) {
  if (!value) return "—"
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString("es-AR")
  }
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString("es-AR")
    } catch {
      return "—"
    }
  }
  if (value?.seconds) {
    try {
      return new Date(value.seconds * 1000).toLocaleString("es-AR")
    } catch {
      return "—"
    }
  }
  return "—"
}

function asArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : []
}

function ReviewDropdownBox({
  title,
  ok,
  children,
  defaultOpen = false,
}: {
  title: string
  ok: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 bg-white"
    >
      <summary className="list-none cursor-pointer select-none px-3 py-2 flex items-center justify-between gap-3">
        <div className="font-medium text-slate-800">{title}</div>
        <div className="flex items-center gap-2">
          <Badge variant={ok ? "default" : "secondary"} className={ok ? "bg-emerald-600" : ""}>
            {ok ? "OK" : "Pendiente"}
          </Badge>
          <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-slate-100 px-3 py-2 text-sm text-slate-700 space-y-1">{children}</div>
    </details>
  )
}

export default function BackofficeCenterDetailPage() {
  const params = useParams<{ centerId: string }>()
  const router = useRouter()
  const centerId = params.centerId

  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState<"account" | "center" | "operations" | "courts" | null>("account")
  const [accountForm, setAccountForm] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const [centerForm, setCenterForm] = useState({
    name: "",
    email: "",
    phone: "",
    slug: "",
    description: "",
    address: "",
    street: "",
    streetNumber: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
  })
  const [operationsForm, setOperationsForm] = useState({
    timezone: "",
    slotDurationMinutes: "",
    minAdvanceHours: "",
    maxAdvanceDays: "",
    bufferMinutes: "",
  })
  const [courtDrafts, setCourtDrafts] = useState<Record<string, any>>({})

  const featuredValue = useMemo(() => {
    const v = data?.center?.featuredRank
    return v === null || typeof v === "undefined" ? "" : String(v)
  }, [data])

  const centerCode = useMemo(() => (centerId ? String(centerId).slice(0, 6).toLowerCase() : ""), [centerId])

  const reviewIssues = useMemo(() => asArray<string>(data?.reviewValidation?.requiredIssues), [data])
  const textWarnings = useMemo(() => asArray<string>(data?.reviewValidation?.textWarnings), [data])
  const courts = useMemo(() => asArray<any>(data?.courts), [data])
  const checklist = useMemo(() => (data?.reviewValidation?.checklist || {}) as Record<string, boolean>, [data])

  const checklistItems = useMemo(
    () => [
      { key: "profileStepComplete", label: "Paso 'Mi cuenta' completo" },
      { key: "centerStepComplete", label: "Paso 'Centro' completo" },
      { key: "operationsStepComplete", label: "Paso 'Operación' completo" },
      { key: "courtsStepComplete", label: "Paso 'Canchas' completo" },
      { key: "publishStepComplete", label: "Paso 'Publicar' completo" },
      { key: "onboardingComplete", label: "Onboarding general completo" },
      { key: "operationsConfigured", label: "Configuración operativa cargada" },
      { key: "centerPublished", label: "Centro marcado como publicado" },
      { key: "publicationReady", label: "Centro listo para publicación" },
    ],
    []
  )

  const publishedCourtsCount = useMemo(() => courts.filter((c) => c?.published).length, [courts])
  const openingDaysConfigured = useMemo(() => {
    const openingHours = data?.booking?.openingHours
    if (!openingHours || typeof openingHours !== "object") return 0
    return Object.values(openingHours).filter((d: any) => d && d.closed !== true).length
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

  useEffect(() => {
    if (!data) return
    setAccountForm({
      firstName: data?.admin?.firstName || "",
      lastName: data?.admin?.lastName || "",
      email: data?.admin?.email || data?.center?.email || "",
      phone: data?.admin?.phone || "",
    })
    setCenterForm({
      name: data?.center?.name || "",
      email: data?.center?.email || "",
      phone: data?.center?.phone || "",
      slug: data?.center?.slug || "",
      description: data?.center?.description || data?.center?.shortDescription || "",
      address: data?.center?.address || "",
      street: data?.center?.street || "",
      streetNumber: data?.center?.streetNumber || "",
      city: data?.center?.city || "",
      province: data?.center?.province || "",
      country: data?.center?.country || "",
      postalCode: data?.center?.postalCode || "",
    })
    setOperationsForm({
      timezone: data?.booking?.timezone || "",
      slotDurationMinutes:
        typeof data?.booking?.slotDurationMinutes === "number" ? String(data.booking.slotDurationMinutes) : "",
      minAdvanceHours:
        typeof data?.operations?.minAdvanceHours === "number" ? String(data.operations.minAdvanceHours) : "",
      maxAdvanceDays:
        typeof data?.operations?.maxAdvanceDays === "number" ? String(data.operations.maxAdvanceDays) : "",
      bufferMinutes:
        typeof data?.operations?.bufferMinutes === "number" ? String(data.operations.bufferMinutes) : "",
    })

    const nextCourtDrafts: Record<string, any> = {}
    for (const c of asArray<any>(data?.courts)) {
      nextCourtDrafts[c.id] = {
        name: c?.name || "",
        sport: c?.sport || "",
        surfaceType: c?.surfaceType || "",
        pricePerHour: typeof c?.pricePerHour === "number" ? String(c.pricePerHour) : "",
        currency: c?.currency || "",
        published: c?.published === true,
      }
    }
    setCourtDrafts(nextCourtDrafts)
  }, [data])

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

  const saveAccount = async () => {
    await patch({ account: accountForm })
  }

  const saveCenterProfile = async () => {
    await patch({ centerProfile: centerForm })
  }

  const saveOperations = async () => {
    await patch({
      booking: {
        timezone: operationsForm.timezone,
        slotDurationMinutes: Number(operationsForm.slotDurationMinutes || 0) || 60,
      },
      operations: {
        minAdvanceHours: Number(operationsForm.minAdvanceHours || 0),
        maxAdvanceDays: Number(operationsForm.maxAdvanceDays || 0),
        bufferMinutes: Number(operationsForm.bufferMinutes || 0),
      },
    })
  }

  const saveCourt = async (courtId: string) => {
    const d = courtDrafts[courtId]
    if (!d) return
    await patch({
      courtUpdate: {
        courtId,
        patch: {
          name: d.name,
          sport: d.sport,
          surfaceType: d.surfaceType,
          pricePerHour: d.pricePerHour,
          currency: d.currency,
          published: d.published,
        },
      },
    })
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
        <div className="space-y-4">
          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 flex items-center justify-between gap-3">
                Revisión completa de onboarding
                <Badge className={data?.reviewValidation?.isReady ? "bg-emerald-600" : "bg-amber-600"}>
                  {data?.reviewValidation?.isReady ? "Listo para revisión final" : "Requiere correcciones"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <button
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpanded((v) => (v === "account" ? null : "account"))}
                >
                  <div className="text-left">
                    <div className="text-2xl font-semibold text-slate-900">Mi Cuenta</div>
                    <div className="text-slate-500 text-sm">Información personal y seguridad de acceso.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={checklist.profileStepComplete ? "bg-emerald-600" : "bg-slate-500"}>{checklist.profileStepComplete ? "OK" : "Pendiente"}</Badge>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expanded === "account" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expanded === "account" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Nombre</Label>
                      <Input value={accountForm.firstName} onChange={(e) => setAccountForm((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Apellido</Label>
                      <Input value={accountForm.lastName} onChange={(e) => setAccountForm((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Email</Label>
                      <Input value={accountForm.email} onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Teléfono</Label>
                      <Input value={accountForm.phone} onChange={(e) => setAccountForm((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={saveAccount}>Guardar cambios Mi Cuenta</Button>
                    </div>
                  </div>
                ) : null}

                <button
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpanded((v) => (v === "center" ? null : "center"))}
                >
                  <div className="text-left">
                    <div className="text-2xl font-semibold text-slate-900">Centro</div>
                    <div className="text-slate-500 text-sm">Información pública y operativa del club.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={checklist.centerStepComplete ? "bg-emerald-600" : "bg-slate-500"}>{checklist.centerStepComplete ? "OK" : "Pendiente"}</Badge>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expanded === "center" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expanded === "center" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Nombre del club</Label><Input value={centerForm.name} onChange={(e) => setCenterForm((p) => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Teléfono</Label><Input value={centerForm.phone} onChange={(e) => setCenterForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                    <div className="md:col-span-2"><Label>Email del club</Label><Input value={centerForm.email} onChange={(e) => setCenterForm((p) => ({ ...p, email: e.target.value }))} /></div>
                    <div className="md:col-span-2"><Label>Descripción</Label><Input value={centerForm.description} onChange={(e) => setCenterForm((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="md:col-span-2"><Label>Dirección</Label><Input value={centerForm.address} onChange={(e) => setCenterForm((p) => ({ ...p, address: e.target.value }))} /></div>
                    <div><Label>Ciudad</Label><Input value={centerForm.city} onChange={(e) => setCenterForm((p) => ({ ...p, city: e.target.value }))} /></div>
                    <div><Label>Provincia</Label><Input value={centerForm.province} onChange={(e) => setCenterForm((p) => ({ ...p, province: e.target.value }))} /></div>
                    <div><Label>País</Label><Input value={centerForm.country} onChange={(e) => setCenterForm((p) => ({ ...p, country: e.target.value }))} /></div>
                    <div><Label>Código postal</Label><Input value={centerForm.postalCode} onChange={(e) => setCenterForm((p) => ({ ...p, postalCode: e.target.value }))} /></div>
                    <div className="md:col-span-2"><Label>Slug</Label><Input value={centerForm.slug} onChange={(e) => setCenterForm((p) => ({ ...p, slug: e.target.value }))} /></div>
                    <div className="md:col-span-2 flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={saveCenterProfile}>Guardar cambios Centro</Button></div>
                  </div>
                ) : null}

                <button
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpanded((v) => (v === "operations" ? null : "operations"))}
                >
                  <div className="text-left">
                    <div className="text-2xl font-semibold text-slate-900">Operación</div>
                    <div className="text-slate-500 text-sm">Reglas de reservas, anticipación y buffer.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={checklist.operationsStepComplete ? "bg-emerald-600" : "bg-slate-500"}>{checklist.operationsStepComplete ? "OK" : "Pendiente"}</Badge>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expanded === "operations" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expanded === "operations" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Zona horaria</Label><Input value={operationsForm.timezone} onChange={(e) => setOperationsForm((p) => ({ ...p, timezone: e.target.value }))} /></div>
                    <div><Label>Duración slot (min)</Label><Input inputMode="numeric" value={operationsForm.slotDurationMinutes} onChange={(e) => setOperationsForm((p) => ({ ...p, slotDurationMinutes: e.target.value }))} /></div>
                    <div><Label>Anticipación mínima (horas)</Label><Input inputMode="numeric" value={operationsForm.minAdvanceHours} onChange={(e) => setOperationsForm((p) => ({ ...p, minAdvanceHours: e.target.value }))} /></div>
                    <div><Label>Anticipación máxima (días)</Label><Input inputMode="numeric" value={operationsForm.maxAdvanceDays} onChange={(e) => setOperationsForm((p) => ({ ...p, maxAdvanceDays: e.target.value }))} /></div>
                    <div><Label>Buffer entre turnos (min)</Label><Input inputMode="numeric" value={operationsForm.bufferMinutes} onChange={(e) => setOperationsForm((p) => ({ ...p, bufferMinutes: e.target.value }))} /></div>
                    <div className="md:col-span-2 flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={saveOperations}>Guardar cambios Operación</Button></div>
                  </div>
                ) : null}

                <button
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpanded((v) => (v === "courts" ? null : "courts"))}
                >
                  <div className="text-left">
                    <div className="text-2xl font-semibold text-slate-900">Canchas</div>
                    <div className="text-slate-500 text-sm">Revisión y edición por cancha.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={checklist.courtsStepComplete ? "bg-emerald-600" : "bg-slate-500"}>{checklist.courtsStepComplete ? "OK" : "Pendiente"}</Badge>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expanded === "courts" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expanded === "courts" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    {courts.length === 0 ? <div className="text-slate-600">No hay canchas cargadas.</div> : null}
                    {courts.map((court) => {
                      const draft = courtDrafts[court.id] || {}
                      return (
                        <div key={court.id} className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                          <div className="md:col-span-2"><Label>Nombre</Label><Input value={draft.name || ""} onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], name: e.target.value } }))} /></div>
                          <div><Label>Deporte</Label><Input value={draft.sport || ""} onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], sport: e.target.value } }))} /></div>
                          <div><Label>Superficie</Label><Input value={draft.surfaceType || ""} onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], surfaceType: e.target.value } }))} /></div>
                          <div><Label>Precio/hora</Label><Input inputMode="numeric" value={draft.pricePerHour || ""} onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], pricePerHour: e.target.value } }))} /></div>
                          <div><Label>Moneda</Label><Input value={draft.currency || ""} onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], currency: e.target.value } }))} /></div>
                          <div className="flex items-center gap-2 md:col-span-4">
                            <input
                              id={`pub-${court.id}`}
                              type="checkbox"
                              checked={!!draft.published}
                              onChange={(e) => setCourtDrafts((p) => ({ ...p, [court.id]: { ...p[court.id], published: e.target.checked } }))}
                            />
                            <label htmlFor={`pub-${court.id}`} className="text-sm text-slate-700">Publicada</label>
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            <Button variant="outline" disabled={saving} onClick={() => saveCourt(court.id)}>Guardar cancha</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="font-medium text-slate-900 mb-2">Observaciones automáticas</div>
                {reviewIssues.length === 0 && textWarnings.length === 0 ? (
                  <div className="text-emerald-700">No se detectaron faltantes ni posibles typos.</div>
                ) : (
                  <div className="space-y-2">
                    {reviewIssues.map((issue, idx) => (
                      <div key={`${issue}-${idx}`} className="text-amber-700">• {issue}</div>
                    ))}
                    {textWarnings.map((warning, idx) => (
                      <div key={`${warning}-${idx}`} className="text-orange-700">• {warning}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-slate-600">Name:</span> {data.center.name || "—"}</div>
              <div><span className="text-slate-600">Email:</span> {data.center.email || "—"}</div>
              <div><span className="text-slate-600">Phone:</span> {data.center.phone || "—"}</div>
              <div><span className="text-slate-600">Center code:</span> <span className="font-mono text-xs">{centerCode || "—"}</span></div>
              <div><span className="text-slate-600">Slug:</span> <span className="font-mono text-xs">{data.center.slug || "—"}</span></div>
              <div><span className="text-slate-600">Description:</span> {data.center.description || data.center.shortDescription || "—"}</div>
              <div><span className="text-slate-600">Street:</span> {data.center.street || "—"} {data.center.streetNumber || ""}</div>
              <div><span className="text-slate-600">Address:</span> {data.center.address || "—"}</div>
              <div><span className="text-slate-600">City:</span> {data.center.city || "—"}</div>
              <div><span className="text-slate-600">Province:</span> {data.center.province || "—"}</div>
              <div><span className="text-slate-600">Country:</span> {data.center.country || "—"}</div>
              <div><span className="text-slate-600">Postal code:</span> {data.center.postalCode || "—"}</div>
              <div><span className="text-slate-600">Published:</span> {data.center.published ? "Yes" : "No"}</div>
              <div><span className="text-slate-600">Publication ready:</span> {data.center.publicationReady ? "Yes" : "No"}</div>
              <div><span className="text-slate-600">Status:</span> {data.center.status || "active"}</div>
              <div><span className="text-slate-600">Review status:</span> {data.center.reviewStatus || "—"}</div>
              <div><span className="text-slate-600">Submitted for review:</span> {toDateLabel(data.center.submittedForReviewAt)}</div>

              <div>
                <span className="text-slate-600">Amenities:</span>{" "}
                {Array.isArray(data.center.amenities) && data.center.amenities.length
                  ? data.center.amenities.join(", ")
                  : "—"}
              </div>
              <div>
                <span className="text-slate-600">Sports:</span>{" "}
                {Array.isArray(data.center.sports) && data.center.sports.length
                  ? data.center.sports.join(", ")
                  : "—"}
              </div>
              <div><span className="text-slate-600">Gallery images:</span> {Array.isArray(data.center.galleryImageUrls) ? data.center.galleryImageUrls.length : 0}</div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-600 mb-1">Cover image</div>
                  {data.center.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.center.coverImageUrl} alt="cover" className="h-24 w-full rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-24 w-full rounded-md border border-dashed border-slate-200 text-slate-400 flex items-center justify-center text-xs">No image</div>
                  )}
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Logo</div>
                  {data.center.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.center.logoUrl} alt="logo" className="h-24 w-24 rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-24 w-24 rounded-md border border-dashed border-slate-200 text-slate-400 flex items-center justify-center text-xs">No logo</div>
                  )}
                </div>
              </div>

              {Array.isArray(data.center.galleryImageUrls) && data.center.galleryImageUrls.length ? (
                <div>
                  <div className="text-slate-600 mb-1">Gallery preview</div>
                  <div className="grid grid-cols-3 gap-2">
                    {data.center.galleryImageUrls.slice(0, 6).map((url: string) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="gallery" className="h-16 w-full rounded-md border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              ) : null}

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
              <CardTitle className="text-base text-slate-900">Stats + onboarding data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-slate-600">Courts:</span> {data.courtsCount ?? "—"}</div>
              <div><span className="text-slate-600">Bookings:</span> {data.bookingsCount ?? "—"}</div>
              <div><span className="text-slate-600">Onboarding current step:</span> {data.onboarding?.currentStep || "—"}</div>
              <div><span className="text-slate-600">Onboarding complete:</span> {data.onboarding?.onboardingComplete ? "Yes" : "No"}</div>
              <div><span className="text-slate-600">Operations configured:</span> {data.operations ? "Yes" : "No"}</div>
              <div><span className="text-slate-600">Booking settings:</span> {data.booking ? "Yes" : "No"}</div>

              <div className="pt-2 rounded-lg border border-slate-200 p-3">
                <div className="font-medium text-slate-900 mb-2">Administrador</div>
                <div><span className="text-slate-600">Nombre:</span> {[data.admin?.firstName, data.admin?.lastName].filter(Boolean).join(" ") || "—"}</div>
                <div><span className="text-slate-600">Email:</span> {data.admin?.email || "—"}</div>
                <div><span className="text-slate-600">Teléfono:</span> {data.admin?.phone || "—"}</div>
              </div>

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

          <Card className="border border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Canchas para revisión ({courts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {courts.length === 0 ? (
                <div className="text-sm text-slate-600">No hay canchas cargadas.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b border-slate-200">
                        <th className="py-2 pr-4">Nombre</th>
                        <th className="py-2 pr-4">Deporte</th>
                        <th className="py-2 pr-4">Precio/hora</th>
                        <th className="py-2 pr-4">Indoor</th>
                        <th className="py-2 pr-4">Superficie</th>
                        <th className="py-2 pr-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courts.map((court) => (
                        <tr key={court.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4">{court.name || "—"}</td>
                          <td className="py-2 pr-4">{court.sport || "—"}</td>
                          <td className="py-2 pr-4">
                            {typeof court.pricePerHour === "number"
                              ? `${court.currency || "ARS"} ${court.pricePerHour}`
                              : "—"}
                          </td>
                          <td className="py-2 pr-4">{court.indoor === null ? "—" : court.indoor ? "Sí" : "No"}</td>
                          <td className="py-2 pr-4">{court.surfaceType || "—"}</td>
                          <td className="py-2 pr-2">
                            <Badge className={court.published ? "bg-emerald-600" : "bg-slate-500"}>
                              {court.published ? "Publicada" : "Borrador"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
