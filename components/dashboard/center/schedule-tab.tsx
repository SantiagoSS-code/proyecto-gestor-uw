"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, CheckCircle, AlertCircle, Clock, Copy, Info } from "lucide-react"
import type { SportKey } from "@/lib/types"
import { CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { showSavePopupAndRefresh } from "@/lib/save-feedback"

const SLOT_OPTIONS = [30, 60, 90, 120]

const TIME_OPTIONS = (() => {
  const options = []
  for (let i = 0; i < 48; i++) {
    const h = Math.floor(i / 2).toString().padStart(2, "0")
    const m = i % 2 === 0 ? "00" : "30"
    options.push(`${h}:${m}`)
  }
  options.push("23:59")
  return Array.from(new Set(options))
})()

const WEEK_DAYS = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mie", label: "Mié" },
  { key: "jue", label: "Jue" },
  { key: "vie", label: "Vie" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const

type WeekDayKey = (typeof WEEK_DAYS)[number]["key"]

type QuickPreset = {
  id: string
  label: string
  open: string
  close: string
}

const DEFAULT_PRESETS: QuickPreset[] = [
  { id: "1", label: "09:00hs a 23:00hs", open: "09:00", close: "23:00" },
  { id: "2", label: "08:00hs a 22:00hs", open: "08:00", close: "22:00" },
  { id: "3", label: "10:00hs a 20:00hs", open: "10:00", close: "20:00" },
  { id: "4", label: "24 Horas", open: "00:00", close: "23:59" },
]

const formatTimeDisplay = (time: string): string => {
  return `${time}hs`
}

type CourtsRow = {
  id: string
  name: string
  sport?: SportKey
}

type DaySchedule = {
  open: string
  close: string
  closed: boolean
}

type CourtSchedule = {
  courtId: string
  courtName: string
  lun: DaySchedule
  mar: DaySchedule
  mie: DaySchedule
  jue: DaySchedule
  vie: DaySchedule
  sab: DaySchedule
  dom: DaySchedule
}

export function ScheduleTab({ autoSelectCourtId }: { autoSelectCourtId?: string | null }) {
  const { user, centerId, loading: authLoading } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null
  const [courts, setCourts] = useState<CourtsRow[]>([])
  const [courtsRootCollection, setCourtsRootCollection] = useState<string>(FIRESTORE_COLLECTIONS.centers)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(autoSelectCourtId || null)
  const [schedule, setSchedule] = useState<CourtSchedule | null>(null)
  const [slotDuration, setSlotDuration] = useState(60)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copySourceDay, setCopySourceDay] = useState<string | null>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishAction, setPublishAction] = useState<"draft" | "publish" | null>(null)
  const [centerOpeningHours, setCenterOpeningHours] = useState<DaySchedule | null>(null)
  const [quickPresets, setQuickPresets] = useState<QuickPreset[]>(DEFAULT_PRESETS)
  const [editPresetsModalOpen, setEditPresetsModalOpen] = useState(false)
  const [editingPresets, setEditingPresets] = useState<QuickPreset[]>(DEFAULT_PRESETS)

  // Cargar canchas
  useEffect(() => {
    const fetchCourts = async () => {
      if (!resolvedCenterId) return
      try {
        const centersRef = collection(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const centersSnapshot = await getDocs(centersRef)

        const usingLegacy = centersSnapshot.empty
        const legacyRef = collection(db, FIRESTORE_COLLECTIONS.legacyCenters, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const legacySnapshot = usingLegacy ? await getDocs(legacyRef) : null

        const sourceSnapshot = usingLegacy ? legacySnapshot : centersSnapshot
        const sourceRootCollection = usingLegacy ? FIRESTORE_COLLECTIONS.legacyCenters : FIRESTORE_COLLECTIONS.centers
        setCourtsRootCollection(sourceRootCollection)

        const data = (sourceSnapshot?.docs || []).map((docSnap) => ({
          id: docSnap.id,
          name: (docSnap.data() as any).name,
          sport: (docSnap.data() as any).sport,
        })) as CourtsRow[]
        setCourts(data)
        
        // Si viene autoSelectCourtId, usarlo; si no, usar el primero
        if (autoSelectCourtId && data.find(c => c.id === autoSelectCourtId)) {
          setSelectedCourtId(autoSelectCourtId)
        } else if (data.length > 0 && !selectedCourtId) {
          setSelectedCourtId(data[0].id)
        }
      } catch (error) {
        console.error("Error loading courts:", error)
        setMessage({ type: "error", text: "No se pudieron cargar las canchas." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && resolvedCenterId) fetchCourts()
  }, [authLoading, resolvedCenterId, autoSelectCourtId])

  // Cargar horarios del centro como valores por defecto
  useEffect(() => {
    const loadCenterHours = async () => {
      if (!resolvedCenterId) return
      try {
        // Try new model first
        let bookingSettingsRef = doc(
          db,
          FIRESTORE_COLLECTIONS.centers,
          resolvedCenterId,
          "settings",
          "booking"
        )
        let snap = await getDoc(bookingSettingsRef)
        // Fallback to legacy collection
        if (!snap.exists()) {
          bookingSettingsRef = doc(
            db,
            FIRESTORE_COLLECTIONS.legacyCenters,
            resolvedCenterId,
            "settings",
            "booking"
          )
          snap = await getDoc(bookingSettingsRef)
        }
        if (snap.exists()) {
          const settings = snap.data() as any
          const openingHours = settings.openingHours
          
          // Obtener el primer horario disponible como default
          if (openingHours && typeof openingHours === 'object') {
            const firstHour = Object.values(openingHours)[0] as DaySchedule | undefined
            if (firstHour) {
              setCenterOpeningHours(firstHour)
            }
          }
        }
      } catch (error) {
        console.error("Error loading center opening hours:", error)
      }
    }

    if (!authLoading && resolvedCenterId) loadCenterHours()
  }, [authLoading, resolvedCenterId])

  // Cargar horarios cuando se selecciona una cancha
  useEffect(() => {
    const loadSchedule = async () => {
      if (!selectedCourtId || !resolvedCenterId) return
      try {
        const courtRef = doc(
          db,
          courtsRootCollection,
          resolvedCenterId,
          CENTER_SUBCOLLECTIONS.courts,
          selectedCourtId
        )
        const snap = await getDoc(courtRef)
        
        // Usar los horarios del centro como default, o los horarios por defecto si no están disponibles
        const defaultDaySchedule = centerOpeningHours || { open: "09:00", close: "23:00", closed: false }
        
        if (snap.exists()) {
          const courtData = snap.data() as any
          const court = courts.find(c => c.id === selectedCourtId)
          setSchedule({
            courtId: selectedCourtId,
            courtName: court?.name || "Cancha",
            lun: courtData.schedule?.lun || { ...defaultDaySchedule },
            mar: courtData.schedule?.mar || { ...defaultDaySchedule },
            mie: courtData.schedule?.mie || { ...defaultDaySchedule },
            jue: courtData.schedule?.jue || { ...defaultDaySchedule },
            vie: courtData.schedule?.vie || { ...defaultDaySchedule },
            sab: courtData.schedule?.sab || { ...defaultDaySchedule },
            dom: courtData.schedule?.dom || { ...defaultDaySchedule },
          })
        } else {
          const court = courts.find(c => c.id === selectedCourtId)
          setSchedule({
            courtId: selectedCourtId,
            courtName: court?.name || "Cancha",
            lun: { ...defaultDaySchedule },
            mar: { ...defaultDaySchedule },
            mie: { ...defaultDaySchedule },
            jue: { ...defaultDaySchedule },
            vie: { ...defaultDaySchedule },
            sab: { ...defaultDaySchedule },
            dom: { ...defaultDaySchedule },
          })
        }
      } catch (error) {
        console.error("Error loading schedule:", error)
        const court = courts.find(c => c.id === selectedCourtId)
        const defaultDaySchedule = centerOpeningHours || { open: "09:00", close: "23:00", closed: false }
        setSchedule({
          courtId: selectedCourtId,
          courtName: court?.name || "Cancha",
          lun: { ...defaultDaySchedule },
          mar: { ...defaultDaySchedule },
          mie: { ...defaultDaySchedule },
          jue: { ...defaultDaySchedule },
          vie: { ...defaultDaySchedule },
          sab: { ...defaultDaySchedule },
          dom: { ...defaultDaySchedule },
        })
      }
    }

    loadSchedule()
  }, [selectedCourtId, resolvedCenterId, courts, centerOpeningHours, courtsRootCollection])

  const updateDaySchedule = (day: WeekDayKey, field: keyof DaySchedule, value: string | boolean) => {
    if (!schedule) return
    setSchedule({
      ...schedule,
      [day]: { ...schedule[day], [field]: value },
    })
  }

  const applyToMultipleDays = (days: WeekDayKey[], daySchedule: DaySchedule) => {
    if (!schedule) return
    const updated = { ...schedule }
    days.forEach(day => {
      updated[day] = daySchedule
    })
    setSchedule(updated)
  }

  const handleSave = async (action: "draft" | "publish") => {
    if (!schedule || !resolvedCenterId || !selectedCourtId) return
    setSaving(true)
    setPublishAction(action)
    setMessage(null)

    try {
      const courtRef = doc(
        db,
        courtsRootCollection,
        resolvedCenterId!,
        CENTER_SUBCOLLECTIONS.courts,
        selectedCourtId
      )
      await setDoc(
        courtRef,
        {
          schedule: {
            lun: schedule.lun,
            mar: schedule.mar,
            mie: schedule.mie,
            jue: schedule.jue,
            vie: schedule.vie,
            sab: schedule.sab,
            dom: schedule.dom,
          },
          published: action === "publish" ? true : false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      const actionText = action === "publish" ? "publicada" : "guardada como borrador"
      setPublishDialogOpen(false)
      showSavePopupAndRefresh(`La cancha fue ${actionText} correctamente.`)
      return
    } catch (error) {
      console.error("Error saving schedule:", error)
      showSavePopupAndRefresh("No se pudieron guardar los horarios. La página se va a recargar.", "error")
      return
    } finally {
      setSaving(false)
      setPublishAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-black">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando horarios…
      </div>
    )
  }

  if (courts.length === 0) {
    return (
      <Card className="border border-slate-200/70 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center text-black py-10">
            Crea canchas primero para asignarles horarios.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={`rounded-xl border-0 shadow-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
          <AlertDescription className="flex items-center gap-3 font-medium">
            {message.type === "success" ? (
              <>
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <span>{message.text}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>{message.text}</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
               <Clock className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <Label className="text-base font-semibold text-slate-900">Seleccionar cancha</Label>
               <p className="text-sm text-slate-500">Configura los horarios de apertura y cierre para cada cancha individualmente.</p>
             </div>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Selector de cancha */}
          <div className="space-y-3">
              <div className="w-full">
                <Select value={selectedCourtId || ""} onValueChange={setSelectedCourtId}>
                  <SelectTrigger className="h-12 bg-white border-slate-300 shadow-sm text-base">
                    <SelectValue placeholder="Seleccione una cancha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map(court => (
                      <SelectItem key={court.id} value={court.id} className="py-3 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{court.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 tracking-wider">
                            {court.sport ? court.sport.toUpperCase() : "SIN DEPORTE"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>

          {schedule && (
            <>
              {/* Preajustes rápidos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-base">Preajustes rápidos</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">Ahorra tiempo</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingPresets(quickPresets)
                      setEditPresetsModalOpen(true)
                    }}
                    className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 h-8 px-3 rounded-md transition-all shadow-sm"
                  >
                    Personalizar
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickPresets.map((preset) => (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant="outline"
                      onClick={() => applyToMultipleDays(["lun", "mar", "mie", "jue", "vie", "sab", "dom"], { open: preset.open, close: preset.close, closed: false })}
                      className="h-11 shadow-sm font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-all bg-white"
                    >
                      <span>{preset.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Grid de horarios */}
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Horario Semanal</h3>
                  <p className="text-sm text-slate-500">Definí los bloques exactos día por día. Puedes utilizar el icono de copiar para replicar un día en otros.</p>
                </div>

                <div className="overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4 min-w-full lg:min-w-[950px]">
                    {WEEK_DAYS.map(day => {
                      const daySchedule = schedule[day.key as keyof CourtSchedule] as DaySchedule
                    const isClosed = daySchedule.closed
                    return (
                      <div
                        key={day.key}
                        className={`flex flex-col rounded-xl border transition-all duration-200 h-full ${
                          isClosed 
                            ? 'bg-slate-50 border-slate-200/60 opacity-80' 
                            : 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {/* Day Header */}
                        <div className={`flex items-center justify-between p-3 border-b ${isClosed ? 'border-slate-200/60' : 'border-slate-100'}`}>
                          <h4 className={`font-semibold text-sm ${isClosed ? 'text-slate-500' : 'text-slate-900'}`}>{day.label}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setCopySourceDay(day.key)
                              setCopyModalOpen(true)
                            }}
                            className={`p-1.5 rounded-md transition-colors ${
                              isClosed ? 'text-slate-400 hover:bg-slate-200/50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Copiar horario a otros días"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Schedule inputs or Closed State */}
                        <div className="p-3 flex-grow flex flex-col justify-center">
                          {isClosed ? (
                            <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400">
                              <span className="text-xs font-semibold uppercase tracking-wider bg-slate-200/50 text-slate-500 px-3 py-1 rounded-md">Cerrado</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Apertura</Label>
                                <Select value={daySchedule.open} onValueChange={val => updateDaySchedule(day.key, "open", val)}>
                                  <SelectTrigger className="w-full h-10 text-sm font-semibold bg-slate-50 border-slate-200 focus:ring-blue-500 focus:bg-white transition-colors">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cierre</Label>
                                <Select value={daySchedule.close} onValueChange={val => updateDaySchedule(day.key, "close", val)}>
                                  <SelectTrigger className="w-full h-10 text-sm font-semibold bg-slate-50 border-slate-200 focus:ring-blue-500 focus:bg-white transition-colors">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Closed Toggle Toggle */}
                        <div className={`p-3 mt-auto border-t transition-colors ${isClosed ? 'border-slate-200/60 bg-slate-100/50 rounded-b-xl' : 'border-slate-100'}`}>
                          <label className="flex items-center gap-2 cursor-pointer group w-fit">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isClosed 
                                ? 'bg-slate-400 border-slate-400' 
                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                            }`}>
                              {isClosed && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isClosed}
                              onChange={e => updateDaySchedule(day.key, "closed", e.target.checked)}
                            />
                            <span className={`text-xs font-medium select-none ${isClosed ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                              Marcar cerrado
                            </span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 pt-6 mt-4 border-t border-slate-100">
                <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-5">
                  <div className="flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-900 text-sm">¿Qué hacer después?</p>
                      <p className="text-blue-800">Elige si guardar como borrador para revisar después, o publicar ahora para que los jugadores puedan reservar.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                    <Button
                      onClick={() => handleSave("draft")}
                      disabled={saving}
                      variant="outline"
                      className="h-11 px-6 font-medium text-slate-700 hover:bg-slate-50"
                      title="La cancha seguirá siendo invisible para los jugadores"
                    >
                      {saving && publishAction === "draft" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando…
                        </>
                      ) : (
                        <>
                          <span>💾 Guardar como borrador</span>
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slate-600 px-1">La cancha permanecerá oculta</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                    <Button
                      onClick={() => handleSave("publish")}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white h-11 px-6 font-medium shadow-md hover:shadow-lg transition-all"
                      title="Los jugadores podrán ver y reservar esta cancha"
                    >
                      {saving && publishAction === "publish" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publicando…
                        </>
                      ) : (
                        <>
                          <span>✓ Publicar y activar</span>
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-green-700 px-1 font-medium">Visible para jugadores</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal para personalizar preajustes */}
      <Dialog open={editPresetsModalOpen} onOpenChange={setEditPresetsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Personalizar preajustes rápidos</DialogTitle>
            <p className="text-sm text-slate-500 mt-2">Configura los horarios que quieres que aparezcan como atajos rápidos al configurar canchas.</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingPresets.map((preset, idx) => (
              <div key={preset.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nombre del preajuste</Label>
                    <Input
                      value={preset.label}
                      onChange={(e) => {
                        const updated = [...editingPresets]
                        updated[idx].label = e.target.value
                        setEditingPresets(updated)
                      }}
                      placeholder="Ej: Mañana a noche"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Apertura</Label>
                    <Select value={preset.open} onValueChange={(val) => {
                      const updated = [...editingPresets]
                      updated[idx].open = val
                      setEditingPresets(updated)
                    }}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cierre</Label>
                    <Select value={preset.close} onValueChange={(val) => {
                      const updated = [...editingPresets]
                      updated[idx].close = val
                      setEditingPresets(updated)
                    }}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Vista previa: <span className="font-semibold text-slate-700">{formatTimeDisplay(preset.open)} a {formatTimeDisplay(preset.close)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEditPresetsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setQuickPresets(editingPresets)
                setEditPresetsModalOpen(false)
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de copiar */}
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Copiar estos horarios
            </DialogTitle>
          </DialogHeader>
          {copySourceDay && schedule && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Horarios a copiar</p>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">
                    {WEEK_DAYS.find(d => d.key === copySourceDay)?.label}
                  </p>
                  <p className="text-sm text-slate-700">
                    {(schedule[copySourceDay as keyof CourtSchedule] as DaySchedule).closed 
                      ? "Cerrado todo el día"
                      : `${(schedule[copySourceDay as keyof CourtSchedule] as DaySchedule).open} - ${(schedule[copySourceDay as keyof CourtSchedule] as DaySchedule).close}`
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">¿Hacia dónde copiar?</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => {
                      applyToMultipleDays(["lun", "mar", "mie", "jue", "vie"], schedule[copySourceDay as keyof CourtSchedule] as DaySchedule)
                      setCopyModalOpen(false)
                      setMessage({ type: "success", text: "✓ Horarios copiados a días laborales (Lun-Vie)" })
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Lun - Vie</div>
                      <div className="text-xs text-slate-600">Todos los días laborales</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => {
                      applyToMultipleDays(["sab", "dom"], schedule[copySourceDay as keyof CourtSchedule] as DaySchedule)
                      setCopyModalOpen(false)
                      setMessage({ type: "success", text: "✓ Horarios copiados a fines de semana (Sáb-Dom)" })
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Sáb - Dom</div>
                      <div className="text-xs text-slate-600">Fin de semana completo</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => {
                      applyToMultipleDays(["lun", "mar", "mie", "jue", "vie", "sab", "dom"], schedule[copySourceDay as keyof CourtSchedule] as DaySchedule)
                      setCopyModalOpen(false)
                      setMessage({ type: "success", text: "✓ Horarios copiados a toda la semana" })
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Todos los días</div>
                      <div className="text-xs text-slate-600">Semana completa (Mon-Sun)</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyModalOpen(false)} className="w-full">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
