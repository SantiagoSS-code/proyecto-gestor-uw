"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { collection, addDoc, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, Pencil, CheckCircle, AlertCircle } from "lucide-react"
import type { SportKey } from "@/lib/types"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"

const SURFACE_TYPES = ["Sintética", "Césped", "Arcilla", "Dura", "Otra"]
const SPORTS: SportKey[] = ["padel", "tennis", "futbol", "pickleball", "squash"]

type CourtForm = {
  name: string
  sport: SportKey
  indoor: boolean
  surfaceType: string
  pricePerHour: string
  currency: string
  published: boolean
}

type CourtRow = {
  id: string
  name: string
  sport?: SportKey
  indoor?: boolean
  surfaceType?: string
  pricePerHour?: number
  currency?: string
  published?: boolean
}

const emptyForm: CourtForm = {
  name: "",
  sport: "padel",
  indoor: false,
  surfaceType: "Synthetic",
  pricePerHour: "",
  currency: "ARS",
  published: true,
}

export function CourtsTab() {
  const { user, loading: authLoading } = useAuth()
  const [courts, setCourts] = useState<CourtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CourtForm>({ ...emptyForm })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name])

  useEffect(() => {
    const fetchCourts = async () => {
      if (!user) return
      try {
        const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts)
        const snapshot = await getDocs(courtsRef)
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as CourtRow[]
        setCourts(data)
      } catch (error) {
        console.error("Error loading courts:", error)
        setMessage({ type: "error", text: "No se pudieron cargar las canchas. Intenta de nuevo." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) fetchCourts()
  }, [authLoading, user])

  const resetForm = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const handleEdit = (court: CourtRow) => {
    setEditingId(court.id)
    setForm({
      name: court.name,
      sport: (court.sport || "padel") as SportKey,
      indoor: !!court.indoor,
      surfaceType: court.surfaceType || "Synthetic",
      pricePerHour: typeof court.pricePerHour === "number" ? court.pricePerHour.toString() : "",
      currency: "ARS",
      published: court.published !== false,
    })
  }

  const handleSave = async () => {
    if (!user || !canSave) return
    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        name: form.name.trim(),
        sport: form.sport,
        indoor: form.indoor,
        surfaceType: form.surfaceType,
        pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : null,
        currency: "ARS",
        published: !!form.published,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        const courtRef = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts, editingId)
        await updateDoc(courtRef, payload)
        setCourts((prev) => prev.map((c) => (c.id === editingId ? ({ ...c, ...payload } as any) : c)))
        setMessage({ type: "success", text: "Cancha actualizada correctamente." })
      } else {
        const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts)
        const newDoc = await addDoc(courtsRef, { ...payload, createdAt: serverTimestamp() })
        setCourts((prev) => [...prev, { id: newDoc.id, ...(payload as any) }])
        setMessage({ type: "success", text: "Cancha creada correctamente." })
      }

      resetForm()
    } catch (error) {
      console.error("Error saving court:", error)
      setMessage({ type: "error", text: "No se pudo guardar la cancha. Intenta de nuevo." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (courtId: string) => {
    if (!user) return
    if (!window.confirm("¿Eliminar esta cancha? Esta acción no se puede deshacer.")) return

    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts, courtId))
      setCourts((prev) => prev.filter((court) => court.id !== courtId))
    } catch (error) {
      console.error("Error deleting court:", error)
      setMessage({ type: "error", text: "No se pudo eliminar la cancha. Intenta de nuevo." })
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={`mb-2 ${message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-slate-900">Tus canchas</CardTitle>
            <Button variant="outline" size="sm" onClick={resetForm} className="text-black">
              <Plus className="w-4 h-4 mr-2" />
              Nueva cancha
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-black">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando canchas…
              </div>
            ) : courts.length === 0 ? (
              <div className="text-center text-black py-10">Aún no hay canchas. Crea tu primera cancha.</div>
            ) : (
              courts.map((court) => (
                <div key={court.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{court.name}</h3>
                    <p className="text-sm text-black">
                      {(court.sport || "padel").toUpperCase()} · {court.indoor ? "Interior" : "Exterior"} · {court.surfaceType || "—"}
                      {typeof court.pricePerHour === "number" ? ` · ${court.currency || "USD"} ${court.pricePerHour}/h` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${court.published !== false ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                      {court.published !== false ? "Publicada" : "Borrador"}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(court)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(court.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">{editingId ? "Editar cancha" : "Crear cancha"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre de la cancha</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deporte</Label>
                <Select value={form.sport} onValueChange={(value) => setForm({ ...form, sport: value as SportKey })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Superficie</Label>
                <Select value={form.surfaceType} onValueChange={(value) => setForm({ ...form, surfaceType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de superficie" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_TYPES.map((surface) => (
                      <SelectItem key={surface} value={surface}>
                        {surface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Interior</Label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.indoor} onChange={(e) => setForm({ ...form, indoor: e.target.checked })} className="h-4 w-4" />
                <span className="text-sm text-black">Esta cancha es interior</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio por hora</Label>
                <Input type="number" min="0" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
              </div>
              <div>
                <Label>Moneda</Label>
                <Input value="ARS" disabled />
              </div>
            </div>

            <div>
              <Label>Publicada</Label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4" />
                <span className="text-sm text-black">Mostrar esta cancha en páginas públicas</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
              <Button onClick={handleSave} disabled={saving || !canSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
