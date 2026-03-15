"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { useOnboarding } from "@/lib/onboarding"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS, CENTER_SETTINGS_DOCS } from "@/lib/firestorePaths"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, CheckCircle, AlertCircle, PartyPopper, Pencil } from "lucide-react"
import type { OperationSettings } from "@/lib/types"

type OverviewData = {
  profile: { firstName: string; lastName: string; email: string; phone: string }
  center: {
    name: string
    phone: string
    address: string
    street: string
    streetNumber: string
    locality: string
    city: string
    province: string
    postalCode: string
    country: string
    sports: string[]
    amenities: string[]
    shortDescription: string
    slug: string
    published: boolean
  }
  operations: {
    loaded: boolean
    settings: OperationSettings | null
  }
  courts: {
    total: number
    published: number
    items: Array<{
      id: string
      name: string
      sport: string
      indoor: boolean | null
      surfaceType: string
      pricePerHour: number | null
      currency: string
      published: boolean
    }>
  }
}

export default function PublishOverviewPage() {
  const { user, centerId, loading: authLoading } = useAuth()
  const { isOnboarding, completeStep } = useOnboarding()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [data, setData] = useState<OverviewData>({
    profile: { firstName: "", lastName: "", email: "", phone: "" },
    center: {
      name: "",
      phone: "",
      address: "",
      street: "",
      streetNumber: "",
      locality: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      sports: [],
      amenities: [],
      shortDescription: "",
      slug: "",
      published: false,
    },
    operations: { loaded: false, settings: null },
    courts: { total: 0, published: 0, items: [] },
  })

  useEffect(() => {
    if (!authLoading && !user) router.push("/clubos/login")
  }, [authLoading, user, router])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const resolvedCenterId = centerId || user.uid

        // Read user profile separately – the `users` collection may not be readable
        // until Firestore rules are deployed, so we must not let it crash the whole load.
        let userData: any = {}
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid))
          if (userSnap.exists()) userData = userSnap.data() as any
        } catch {
          // Fall back to auth object data below
        }

        const centerRef = doc(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId)
        const legacyCenterRef = doc(db, FIRESTORE_COLLECTIONS.legacyCenters, resolvedCenterId)
        const opsRef = doc(
          db,
          FIRESTORE_COLLECTIONS.centers,
          resolvedCenterId,
          CENTER_SUBCOLLECTIONS.settings,
          CENTER_SETTINGS_DOCS.operations
        )
        const legacyOpsRef = doc(
          db,
          FIRESTORE_COLLECTIONS.legacyCenters,
          resolvedCenterId,
          CENTER_SUBCOLLECTIONS.settings,
          CENTER_SETTINGS_DOCS.operations
        )
        const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const legacyCourtsRef = collection(db, FIRESTORE_COLLECTIONS.legacyCenters, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)

        const [centerSnap, legacyCenterSnap, opsSnap, legacyOpsSnap, courtsSnap, legacyCourtsSnap] = await Promise.all([
          getDoc(centerRef),
          getDoc(legacyCenterRef),
          getDoc(opsRef),
          getDoc(legacyOpsRef),
          getDocs(courtsRef),
          getDocs(legacyCourtsRef),
        ])
        const centerData = centerSnap.exists()
          ? (centerSnap.data() as any)
          : legacyCenterSnap.exists()
            ? (legacyCenterSnap.data() as any)
            : {}
        const operationsData = opsSnap.exists()
          ? (opsSnap.data() as OperationSettings)
          : legacyOpsSnap.exists()
            ? (legacyOpsSnap.data() as OperationSettings)
            : null
        const baseCourts = courtsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        const legacyCourts = legacyCourtsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        const courts = baseCourts.length > 0 ? baseCourts : legacyCourts

        setData({
          profile: {
            firstName: userData.firstName || userData.first_name || user.displayName?.split(" ")[0] || "",
            lastName: userData.lastName || userData.last_name || user.displayName?.split(" ").slice(1).join(" ") || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
          },
          center: {
            name: centerData.name || "",
            phone: centerData.phone || "",
            address: centerData.address || "",
            street: centerData.street || "",
            streetNumber: centerData.streetNumber || centerData.street_number || "",
            locality: centerData.locality || "",
            city: centerData.city || "",
            province: centerData.province || "",
            postalCode: centerData.postalCode || "",
            country: centerData.country || "",
            sports: Array.isArray(centerData.sports) ? centerData.sports : [],
            amenities: Array.isArray(centerData.amenities) ? centerData.amenities : [],
            shortDescription: centerData.shortDescription || centerData.description || "",
            slug: centerData.slug || "",
            published: centerData.published === true,
          },
          operations: {
            loaded: opsSnap.exists(),
            settings: operationsData,
          },
          courts: {
            total: courts.length,
            published: courts.filter((court) => court.published === true).length,
            items: courts.map((court) => ({
              id: String(court.id || ""),
              name: String(court.name || ""),
              sport: String(court.sport || ""),
              indoor: typeof court.indoor === "boolean" ? court.indoor : null,
              surfaceType: String(court.surfaceType || ""),
              pricePerHour: typeof court.pricePerHour === "number" ? court.pricePerHour : null,
              currency: String(court.currency || "ARS"),
              published: court.published === true,
            })),
          },
        })
      } catch (e) {
        console.error("Error loading publish overview:", e)
        setError("No se pudo cargar el overview de publicación.")
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) load()
  }, [user, centerId, authLoading])

  const checks = useMemo(() => {
    const profileReady =
      data.profile.firstName.trim().length >= 2 &&
      data.profile.lastName.trim().length >= 2 &&
      data.profile.email.trim().includes("@") &&
      data.profile.phone.trim().length >= 8

    const centerReady =
      data.center.name.trim().length > 2 &&
      data.center.phone.trim().length >= 6 &&
      data.center.address.trim().length > 0 &&
      data.center.sports.length > 0

    const operationsReady = data.operations.loaded
    const courtsReady = data.courts.total > 0 && data.courts.total === data.courts.published

    return { profileReady, centerReady, operationsReady, courtsReady }
  }, [data])

  const allReady = checks.profileReady && checks.centerReady && checks.operationsReady && checks.courtsReady

  const completedSteps = [checks.profileReady, checks.centerReady, checks.operationsReady, checks.courtsReady].filter(Boolean).length

  const sectionStatus = (done: boolean) => (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {done ? "Completo" : "Faltan datos"}
    </span>
  )

  const handleSectionNavigate = (href: string) => {
    router.push(href)
  }

  const handleSectionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, href: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleSectionNavigate(href)
    }
  }

  const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>, href: string) => {
    event.preventDefault()
    event.stopPropagation()
    handleSectionNavigate(href)
  }

  const handlePublish = async () => {
    if (!user) return
    setSubmitting(true)
    setModalError(null)
    setError(null)
    setSuccess(null)

    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error("No authenticated user")
      const token = await currentUser.getIdToken()

      const response = await fetch("/api/onboarding/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo enviar a revisión")
      }

      if (isOnboarding) {
        await completeStep("publish")
      }

      setPublishModalOpen(false)
    } catch (e: any) {
      setModalError(e?.message || "No se pudo publicar. Intentá nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Publicar centro</h1>
        <p className="text-slate-500 mt-2">Revisá toda tu información antes de enviarla a verificación.</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Resumen de revisión</CardTitle>
          <CardDescription>Orden: Mi cuenta → Centro → Operación → Canchas.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Pasos completos: <span className="font-semibold text-slate-900">{completedSteps}/4</span></p>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${allReady ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {allReady ? "Listo para publicar" : "Revisión pendiente"}
          </span>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="space-y-4">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSectionNavigate("/clubos/dashboard/settings/profile")}
          onKeyDown={(event) => handleSectionKeyDown(event, "/clubos/dashboard/settings/profile")}
          className="cursor-pointer transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>1. Mi cuenta</CardTitle>
                <CardDescription>Datos personales y de acceso.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sectionStatus(checks.profileReady)}
                <Button variant="outline" size="sm" onClick={(event) => handleEditClick(event, "/clubos/dashboard/settings/profile")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
            <p><span className="font-medium">Nombre:</span> {[data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ") || "-"}</p>
            <p><span className="font-medium">Email:</span> {data.profile.email || "-"}</p>
            <p><span className="font-medium">Teléfono:</span> {data.profile.phone || "-"}</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSectionNavigate("/clubos/dashboard/settings")}
          onKeyDown={(event) => handleSectionKeyDown(event, "/clubos/dashboard/settings")}
          className="cursor-pointer transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>2. Centro</CardTitle>
                <CardDescription>Información pública de tu club.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sectionStatus(checks.centerReady)}
                <Button variant="outline" size="sm" onClick={(event) => handleEditClick(event, "/clubos/dashboard/settings")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><span className="font-medium">Nombre:</span> {data.center.name || "-"}</p>
              <p><span className="font-medium">Teléfono:</span> {data.center.phone || "-"}</p>
              <p><span className="font-medium">Dirección:</span> {data.center.address || "-"}</p>
              <p><span className="font-medium">Calle:</span> {[data.center.street, data.center.streetNumber].filter(Boolean).join(" ") || "-"}</p>
              <p><span className="font-medium">Localidad:</span> {data.center.locality || "-"}</p>
              <p><span className="font-medium">Ciudad:</span> {data.center.city || "-"}</p>
              <p><span className="font-medium">Provincia:</span> {data.center.province || "-"}</p>
              <p><span className="font-medium">Código postal:</span> {data.center.postalCode || "-"}</p>
              <p><span className="font-medium">País:</span> {data.center.country || "-"}</p>
              <p><span className="font-medium">Slug:</span> {data.center.slug || "-"}</p>
            </div>

            <div>
              <p className="font-medium mb-1">Deportes</p>
              <p>{data.center.sports.length ? data.center.sports.join(", ") : "-"}</p>
            </div>

            <div>
              <p className="font-medium mb-1">Amenities</p>
              <p>{data.center.amenities.length ? data.center.amenities.join(", ") : "-"}</p>
            </div>

            <div>
              <p className="font-medium mb-1">Descripción</p>
              <p>{data.center.shortDescription || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSectionNavigate("/clubos/dashboard/settings/operacion")}
          onKeyDown={(event) => handleSectionKeyDown(event, "/clubos/dashboard/settings/operacion")}
          className="cursor-pointer transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>3. Operación</CardTitle>
                <CardDescription>Reglas de reserva, cancelación y precios.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sectionStatus(checks.operationsReady)}
                <Button variant="outline" size="sm" onClick={(event) => handleEditClick(event, "/clubos/dashboard/settings/operacion")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {data.operations.settings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p><span className="font-medium">Duración mínima:</span> {data.operations.settings.minSlotMinutes} min</p>
                <p><span className="font-medium">Duración máxima:</span> {data.operations.settings.maxSlotMinutes} min</p>
                <p><span className="font-medium">Intervalo entre turnos:</span> {data.operations.settings.slotStepMinutes} min</p>
                <p><span className="font-medium">Buffer:</span> {data.operations.settings.bufferMinutes} min</p>
                <p><span className="font-medium">Anticipación mínima:</span> {data.operations.settings.minAdvanceHours} h</p>
                <p><span className="font-medium">Anticipación máxima:</span> {data.operations.settings.maxAdvanceDays} días</p>
                <p><span className="font-medium">Cancelación habilitada:</span> {data.operations.settings.cancellationEnabled ? "Sí" : "No"}</p>
                <p><span className="font-medium">Cancelación gratis:</span> {data.operations.settings.freeCancelHours} h</p>
                <p><span className="font-medium">Cargo cancelación tardía:</span> {data.operations.settings.lateCancelFeePercent}%</p>
                <p><span className="font-medium">Cargo no-show:</span> {data.operations.settings.noShowFeePercent}%</p>
                <p><span className="font-medium">Hora pico:</span> {data.operations.settings.peakHoursEnabled ? `${data.operations.settings.peakHoursStart} - ${data.operations.settings.peakHoursEnd}` : "Desactivado"}</p>
                <p><span className="font-medium">Multiplicador hora pico:</span> x{data.operations.settings.peakPriceMultiplier}</p>
                <p><span className="font-medium">Multiplicador fin de semana:</span> x{data.operations.settings.weekendPriceMultiplier}</p>
                <p><span className="font-medium">Seña habilitada:</span> {data.operations.settings.depositEnabled ? "Sí" : "No"}</p>
                <p><span className="font-medium">Seña:</span> {data.operations.settings.depositPercent}%</p>
                <p><span className="font-medium">Feriados configurados:</span> {data.operations.settings.holidays.length}</p>
              </div>
            ) : (
              <p>Falta guardar la sección Operación.</p>
            )}
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSectionNavigate("/clubos/dashboard/courts")}
          onKeyDown={(event) => handleSectionKeyDown(event, "/clubos/dashboard/courts")}
          className="cursor-pointer transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>4. Canchas</CardTitle>
                <CardDescription>Listado completo de canchas cargadas.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sectionStatus(checks.courtsReady)}
                <Button variant="outline" size="sm" onClick={(event) => handleEditClick(event, "/clubos/dashboard/courts")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <p><span className="font-medium">Total:</span> {data.courts.total}</p>
              <p><span className="font-medium">Publicadas:</span> {data.courts.published}</p>
              <p><span className="font-medium">Borrador:</span> {Math.max(0, data.courts.total - data.courts.published)}</p>
            </div>

            {data.courts.items.length > 0 ? (
              <div className="space-y-2 pt-1">
                {data.courts.items.map((court) => (
                  <div key={court.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{court.name || "Cancha sin nombre"}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${court.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {court.published ? "Publicada" : "Borrador"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                      <p><span className="font-medium">Deporte:</span> {court.sport || "-"}</p>
                      <p><span className="font-medium">Superficie:</span> {court.surfaceType || "-"}</p>
                      <p><span className="font-medium">Indoor:</span> {court.indoor == null ? "-" : court.indoor ? "Sí" : "No"}</p>
                      <p><span className="font-medium">Precio/hora:</span> {court.pricePerHour == null ? "-" : `${court.pricePerHour} ${court.currency}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay canchas cargadas todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setPublishModalOpen(true)}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all h-10 px-5 rounded-lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            "Publicar"
          )}
        </Button>
      </div>

      <Dialog open={publishModalOpen} onOpenChange={(open) => { if (!open) setModalError(null); setPublishModalOpen(open) }}>
        <DialogContent className="sm:max-w-lg overflow-hidden" showCloseButton={!submitting}>
          <div className="relative">
            <div className="absolute -top-10 -left-8 h-24 w-24 rounded-full bg-blue-200/40 blur-xl animate-pulse" />
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-200/40 blur-xl animate-pulse" />

            <div className="mx-auto mb-3 relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
              <div className="absolute inset-1 rounded-full bg-blue-200/60 animate-pulse" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg animate-in zoom-in-50 duration-500">
                <PartyPopper className="h-7 w-7" />
              </div>
            </div>

            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-bold text-slate-900">¡Felicitaciones! Tu club está listo 🎉</DialogTitle>
              <DialogDescription className="text-slate-600 text-base mt-2">
                Terminaste la configuración inicial de tu club.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3 text-sm text-slate-700 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p>
                Nuestro equipo lo estará verificando para asegurarnos de que todo esté correcto antes de publicarlo.
              </p>
              <p>
                Te avisaremos cuando esté aprobado y listo para recibir reservas.
              </p>
            </div>

            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {modalError}
              </div>
            )}

            <DialogFooter className="mt-6 sm:justify-center gap-2">
              <Button variant="outline" onClick={() => setPublishModalOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={handlePublish}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all h-10 px-5 rounded-lg min-w-[190px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar para revisión"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
