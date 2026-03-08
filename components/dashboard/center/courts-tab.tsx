"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrencyARS } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, Trash2, Pencil, CheckCircle, AlertCircle, ImagePlus, MapPin, Dumbbell, Layers, Lightbulb } from "lucide-react"
import type { SportKey } from "@/lib/types"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"
import { showSavePopupAndRefresh } from "@/lib/save-feedback"

const SURFACE_TYPES = ["Sintética", "Césped", "Arcilla", "Dura", "Otra"]
const SPORTS: SportKey[] = ["padel", "tennis", "futbol", "pickleball", "squash"]

type CourtForm = {
  name: string
  sport: SportKey | ""
  indoor: "interior" | "exterior" | ""
  lighting: "si" | "no" | ""
  surfaceType: string
  otherSurfaceType?: string
  pricePerHour: string
  currency: string
  published: boolean
  imageUrl?: string
}

type CourtRow = {
  id: string
  name: string
  sport?: SportKey
  indoor?: boolean
  lighting?: boolean
  surfaceType?: string
  otherSurfaceType?: string
  pricePerHour?: number
  currency?: string
  published?: boolean
  imageUrl?: string
  hasSchedule?: boolean
}

const emptyForm: CourtForm = {
  name: "",
  sport: "",
  indoor: "",
  lighting: "",
  surfaceType: "",
  otherSurfaceType: "",
  pricePerHour: "",
  currency: "ARS",
  published: false,
  imageUrl: "",
}

export function CourtsTab({ onCourtCreated }: { onCourtCreated?: (courtId: string, courtName: string) => void }) {
  const { user, centerId, loading: authLoading } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null
  const [courts, setCourts] = useState<CourtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CourtForm>({ ...emptyForm })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [formHasChanges, setFormHasChanges] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<SportKey | "all">("all")
  const [editingCourtHasSchedule, setEditingCourtHasSchedule] = useState(false)
  const [courtsRootCollection, setCourtsRootCollection] = useState<"centers" | "padel_centers">(FIRESTORE_COLLECTIONS.centers)

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name])

  // Obtener deportes únicos de las canchas
  const uniqueSports = useMemo(() => {
    const sports = new Set(courts.map(c => c.sport || "padel"))
    return Array.from(sports).sort()
  }, [courts])

  // Filtrar canchas según el deporte seleccionado
  const filteredCourts = useMemo(() => {
    if (selectedSport === "all") return courts
    return courts.filter(c => (c.sport || "padel") === selectedSport)
  }, [courts, selectedSport])

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      setValidationError("El nombre de la cancha es requerido.")
      return false
    }
    if (!form.sport) {
      setValidationError("Debes seleccionar un deporte.")
      return false
    }
    if (!form.indoor) {
      setValidationError("Debes seleccionar una ubicación (interior o exterior).")
      return false
    }
    if (!form.lighting) {
      setValidationError("Debes indicar si la cancha tiene iluminación.")
      return false
    }
    if (!form.surfaceType) {
      setValidationError("Debes seleccionar una superficie.")
      return false
    }
    if (form.surfaceType === "Otra" && !form.otherSurfaceType) {
      setValidationError("Debes especificar el tipo de superficie.")
      return false
    }
    setValidationError(null)
    return true
  }

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

        const data = (sourceSnapshot?.docs || []).map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as CourtRow[]
        
        // Verificar cuáles tienen schedule
        const courtsWithScheduleInfo = await Promise.all(
          data.map(async (court) => {
            try {
              const courtRef = doc(db, sourceRootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts, court.id)
              const courtSnap = await getDoc(courtRef)
              const hasSchedule = courtSnap.exists() && !!courtSnap.data()?.schedule
              return { ...court, hasSchedule }
            } catch {
              return court
            }
          })
        )
        
        setCourts(courtsWithScheduleInfo)
      } catch (error) {
        console.error("Error loading courts:", error)
        setMessage({ type: "error", text: "No se pudieron cargar las canchas. Intenta de nuevo." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && resolvedCenterId) fetchCourts()
  }, [authLoading, resolvedCenterId])

  const resetForm = () => {
    setEditingId(null)
    setEditingCourtHasSchedule(false)
    setForm({ ...emptyForm })
    setFormHasChanges(false)
  }

  const openModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (formHasChanges) {
      setShowCancelConfirm(true)
    } else {
      setIsModalOpen(false)
    }
  }

  const handleFormChange = (newForm: CourtForm) => {
    setForm(newForm)
    setFormHasChanges(true)
  }

  const handleEdit = (court: CourtRow) => {
    setEditingId(court.id)
    setEditingCourtHasSchedule(court.hasSchedule || false)
    setForm({
      name: court.name,
      sport: (court.sport || "") as SportKey | "",
      indoor: court.indoor ? "interior" : "exterior",
      lighting: typeof court.lighting === "boolean" ? (court.lighting ? "si" : "no") : "",
      surfaceType: court.surfaceType || "",
      otherSurfaceType: court.otherSurfaceType || "",
      pricePerHour: typeof court.pricePerHour === "number" ? court.pricePerHour.toString() : "",
      currency: "ARS",
      published: court.published !== false,
      imageUrl: court.imageUrl || "",
    })
    setFormHasChanges(false)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!resolvedCenterId || !validateForm()) return
    setSaving(true)
    setMessage(null)

    try {
      const surfaceType = form.surfaceType === "Otra" ? form.otherSurfaceType : form.surfaceType

      const payload = {
        name: form.name.trim(),
        sport: form.sport,
        indoor: form.indoor === "interior",
        lighting: form.lighting === "si",
        surfaceType: surfaceType,
        pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : null,
        currency: "ARS",
        published: !!form.published,
        imageUrl: form.imageUrl || null,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        const courtRef = doc(db, courtsRootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts, editingId)
        await updateDoc(courtRef, payload)
        setCourts((prev) => prev.map((c) => (c.id === editingId ? ({ ...c, ...payload } as any) : c)))
        resetForm()
        setIsModalOpen(false)
        showSavePopupAndRefresh("Cancha guardada correctamente.")
        return
      } else {
        const courtsRef = collection(db, courtsRootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const newDoc = await addDoc(courtsRef, { ...payload, createdAt: serverTimestamp() })
        const newCourt = { id: newDoc.id, ...(payload as any) }
        setCourts((prev) => [...prev, newCourt])
        resetForm()
        setIsModalOpen(false)
        // Notificar al componente padre
        onCourtCreated?.(newDoc.id, form.name)
        showSavePopupAndRefresh("Cancha creada correctamente.")
        return
      }
    } catch (error) {
      console.error("Error saving court:", error)
      showSavePopupAndRefresh("No se pudo guardar la cancha. La página se va a recargar.", "error")
      return
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (courtId: string) => {
    if (!resolvedCenterId) return
    if (!window.confirm("¿Eliminar esta cancha? Esta acción no se puede deshacer.")) return

    try {
      await deleteDoc(doc(db, courtsRootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts, courtId))
      setCourts((prev) => prev.filter((court) => court.id !== courtId))
    } catch (error) {
      console.error("Error deleting court:", error)
      setMessage({ type: "error", text: "No se pudo eliminar la cancha. Intenta de nuevo." })
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={`rounded-lg border-l-4 shadow-sm ${message.type === "success" ? "border-l-green-600 border-green-200 bg-gradient-to-r from-green-50 to-green-50/50" : "border-l-red-600 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50"}`}>
          <AlertDescription className={`flex items-center gap-3 font-medium ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
            {message.type === "success" ? (
              <>
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{message.text}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{message.text}</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all h-10 px-5 rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Nueva cancha
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Pestañas de deportes */}
        {uniqueSports.length > 0 && (
          <div className="px-5 pt-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              <button
                onClick={() => setSelectedSport("all")}
                className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-all shadow-sm border ${
                  selectedSport === "all"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-200/50"
                }`}
              >
                Todos ({courts.length})
              </button>
              {uniqueSports.map((sport) => {
                const count = courts.filter(c => (c.sport || "padel") === sport).length
                return (
                  <button
                    key={sport}
                    onClick={() => setSelectedSport(sport as SportKey)}
                    className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-all shadow-sm border ${
                      selectedSport === sport
                        ? "bg-white text-slate-900 border-slate-200"
                        : "bg-transparent text-slate-500 border-transparent hover:bg-slate-200/50"
                    }`}
                  >
                    {sport.charAt(0).toUpperCase() + sport.slice(1)} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
              <p className="text-sm font-medium">Cargando canchas…</p>
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Aún no tienes canchas</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Comienza agregando las canchas de tu complejo para empezar a recibir reservas.</p>
              <Button onClick={openModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Crear primera cancha
              </Button>
            </div>
          ) : filteredCourts.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              <p>No hay canchas para este deporte.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
            {filteredCourts.map((court) => (
              <div key={court.id} className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-slate-50 transition-colors duration-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 text-lg">{court.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${court.published !== false ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${court.published !== false ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                      {court.published !== false ? "Publicada" : "Borrador"}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mt-3">
                    <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-md">
                      <span className="font-medium text-slate-700 uppercase text-xs tracking-wider">{(court.sport || "padel")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{court.indoor ? "Interior" : "Exterior"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{court.surfaceType || "No especificada"}</span>
                    </div>
                    {court.lighting === true && (
                      <div className="flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-slate-400" />
                        <span>Iluminación</span>
                      </div>
                    )}
                    {typeof court.pricePerHour === "number" && (
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <span>
                          {formatCurrencyARS(court.pricePerHour)}
                          <span className="text-slate-500 font-normal text-xs">/h</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 mt-2 md:mt-0">
                  {!court.hasSchedule && (
                    <Button 
                      size="sm" 
                      onClick={() => onCourtCreated?.(court.id, court.name)}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium shadow-none transition-all mr-2"
                      title="Configura los horarios para poder publicar esta cancha"
                    >
                      Configurar horarios
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEdit(court)}
                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar detalles de la cancha"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(court.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar esta cancha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear/editar cancha */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open && formHasChanges) {
          setShowCancelConfirm(true)
        } else {
          setIsModalOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-[600px] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-2 border-b border-slate-100">
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {editingId ? "Editar cancha" : "Crear cancha"}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                Completa los detalles de tu cancha
              </p>
            </div>
          </DialogHeader>

          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-8">
            {validationError && (
              <Alert className="border-red-200 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2 text-sm">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            {/* General */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Nombre de la cancha</Label>
                <Input 
                  value={form.name} 
                  onChange={(e) => handleFormChange({ ...form, name: e.target.value })} 
                  placeholder="Ej: Cancha 1, Cancha A Premium, etc."
                  className="h-11 shadow-sm focus-visible:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Deporte *</Label>
                  <Select value={form.sport} onValueChange={(value) => handleFormChange({ ...form, sport: value as SportKey })}>
                    <SelectTrigger className="h-11 shadow-sm focus:ring-blue-500">
                      <SelectValue placeholder="Selecciona un deporte" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s} className="cursor-pointer">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Ubicación *</Label>
                  <Select value={form.indoor} onValueChange={(value) => handleFormChange({ ...form, indoor: value as "interior" | "exterior" | "" })}>
                    <SelectTrigger className="h-11 shadow-sm focus:ring-blue-500">
                      <SelectValue placeholder="Interior o Exterior" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interior" className="cursor-pointer">Interior</SelectItem>
                      <SelectItem value="exterior" className="cursor-pointer">Exterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Iluminación *</Label>
                <Select value={form.lighting} onValueChange={(value) => handleFormChange({ ...form, lighting: value as "si" | "no" | "" })}>
                  <SelectTrigger className="h-11 shadow-sm focus:ring-blue-500">
                    <SelectValue placeholder="¿Tiene iluminación?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si" className="cursor-pointer">Sí</SelectItem>
                    <SelectItem value="no" className="cursor-pointer">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Superficie *</Label>
                <Select value={form.surfaceType} onValueChange={(value) => handleFormChange({ ...form, surfaceType: value })}>
                  <SelectTrigger className="h-11 shadow-sm focus:ring-blue-500">
                    <SelectValue placeholder="Selecciona una superficie" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_TYPES.map((surface) => (
                      <SelectItem key={surface} value={surface} className="cursor-pointer">
                        {surface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Otra superficie - condicional */}
              {form.surfaceType === "Otra" && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <Label className="text-sm font-medium text-slate-700 block mb-2">Especificar tipo de superficie</Label>
                  <Input 
                    value={form.otherSurfaceType || ""} 
                    onChange={(e) => handleFormChange({ ...form, otherSurfaceType: e.target.value })} 
                    placeholder="Ej: Piso de madera, PVC, etc."
                    className="h-11 bg-white"
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Foto de la cancha */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">Foto de la cancha (opcional)</Label>
              {!form.imageUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-36 border border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Sube una foto</p>
                    <p className="text-xs text-slate-500 mt-1">Haz clic o arrastra una imagen</p>
                  </div>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (evt) => {
                          handleFormChange({ ...form, imageUrl: evt.target?.result as string })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleFormChange({ ...form, imageUrl: "" })}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-full p-2 shadow-sm transition-colors border border-slate-200"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Precio y Moneda */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Precio por hora</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-medium">$</span>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      value={form.pricePerHour} 
                      onChange={(e) => handleFormChange({ ...form, pricePerHour: e.target.value })} 
                      placeholder="0.00"
                      className="h-11 pl-7 shadow-sm focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Moneda</Label>
                  <Input value="ARS" disabled className="h-11 bg-slate-50 text-slate-500 font-medium shadow-sm" />
                </div>
              </div>
            </div>

            {/* Nota sobre estado Borrador */}
            {!editingId && (
              <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Esta cancha se guardará como <strong>Borrador</strong>. <br className="hidden sm:block" />
                    Podrás publicarla después de configurar los horarios en la siguiente pestaña.
                  </p>
                </div>
              </div>
            )}

            {/* Publicar - Solo para ediciones */}
            {editingId && (
              <div className={`p-4 rounded-xl border ${editingCourtHasSchedule ? 'bg-slate-50 border-slate-200' : 'bg-red-50/50 border-red-100'}`}>
                <Label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.published} 
                    onChange={(e) => handleFormChange({ ...form, published: e.target.checked })} 
                    disabled={!editingCourtHasSchedule}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <div className="space-y-1">
                    <span className={`text-sm font-medium block ${editingCourtHasSchedule ? 'text-slate-900' : 'text-red-900'}`}>
                      {editingCourtHasSchedule 
                        ? "Mostrar esta cancha en páginas públicas"
                        : "Configura los horarios primero"}
                    </span>
                    <p className={`text-xs ${editingCourtHasSchedule ? 'text-slate-500' : 'text-red-600'}`}>
                      {editingCourtHasSchedule 
                        ? "Los jugadores podrán ver y reservar esta cancha"
                        : "Debes configurar los horarios para poder publicar"}
                    </p>
                  </div>
                </Label>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
            <Button variant="outline" onClick={closeModal} className="h-11 px-6 bg-white shrink-0">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 w-full sm:w-auto shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : editingId ? "Actualizar cancha" : "Crear cancha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de cancelación */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Descartar cambios?</DialogTitle>
          </DialogHeader>
          <p className="text-black text-sm">
            Tienes cambios sin guardar. ¿Estás seguro de que quieres descartar los cambios?
          </p>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelConfirm(false)}
            >
              Seguir editando
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setShowCancelConfirm(false)
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
