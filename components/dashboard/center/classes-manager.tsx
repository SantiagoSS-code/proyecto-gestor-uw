"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, Pencil, CheckCircle, AlertCircle } from "lucide-react"
import type { ClassDoc, ClassScheduleSlot, SportKey } from "@/lib/types"
import { CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

const SPORTS: SportKey[] = ["padel", "tennis", "futbol", "pickleball", "squash"]
const WEEK_DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
]

type ClassRow = ClassDoc & { id: string }

const emptyForm: ClassDoc = {
  name: "",
  sport: "padel",
  coachName: "",
  durationMinutes: 60,
  price: 0,
  currency: "ARS",
  capacity: 8,
  recurringSchedule: [],
  enabled: true,
}

export function ClassesManager() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClassDoc>({ ...emptyForm })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name])

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return
      try {
        const ref = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.classes)
        const snap = await getDocs(ref)
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ClassRow[]
        setItems(data)
      } catch (e) {
        console.error("Error loading classes:", e)
        setMessage({ type: "error", text: "No se pudieron cargar las clases." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) fetchClasses()
  }, [authLoading, user])

  const resetForm = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const handleEdit = (item: ClassRow) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      sport: item.sport,
      coachName: item.coachName || "",
      durationMinutes: item.durationMinutes || 60,
      price: item.price || 0,
      currency: item.currency || "ARS",
      capacity: item.capacity || 0,
      recurringSchedule: item.recurringSchedule || [],
      enabled: item.enabled !== false,
    })
  }

  const handleSave = async () => {
    if (!user || !canSave) return
    setSaving(true)
    setMessage(null)

    try {
      const payload: ClassDoc = {
        name: form.name.trim(),
        sport: form.sport,
        coachName: form.coachName?.trim() || "",
        durationMinutes: Number(form.durationMinutes) || 60,
        price: Number(form.price) || 0,
        currency: form.currency || "ARS",
        capacity: Number(form.capacity) || 0,
        recurringSchedule: form.recurringSchedule || [],
        enabled: !!form.enabled,
        updatedAt: serverTimestamp() as any,
      }

      if (editingId) {
        const ref = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.classes, editingId)
        await updateDoc(ref, payload as any)
        setItems((prev) => prev.map((c) => (c.id === editingId ? ({ ...c, ...payload } as any) : c)))
        setMessage({ type: "success", text: "Clase actualizada." })
      } else {
        const ref = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.classes)
        const newDoc = await addDoc(ref, { ...payload, createdAt: serverTimestamp() })
        setItems((prev) => [...prev, { id: newDoc.id, ...(payload as any) }])
        setMessage({ type: "success", text: "Clase creada." })
      }

      resetForm()
    } catch (e) {
      console.error("Error saving class:", e)
      setMessage({ type: "error", text: "No se pudo guardar la clase." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!window.confirm("¿Eliminar esta clase?")) return
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.classes, id))
      setItems((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error("Error deleting class:", e)
      setMessage({ type: "error", text: "No se pudo eliminar la clase." })
    }
  }

  const addScheduleSlot = () => {
    setForm((prev) => ({
      ...prev,
      recurringSchedule: [...(prev.recurringSchedule || []), { dayOfWeek: 1, startTime: "18:00", endTime: "19:00" }],
    }))
  }

  const updateSlot = (index: number, patch: Partial<ClassScheduleSlot>) => {
    setForm((prev) => {
      const next = [...(prev.recurringSchedule || [])]
      next[index] = { ...next[index], ...patch }
      return { ...prev, recurringSchedule: next }
    })
  }

  const removeSlot = (index: number) => {
    setForm((prev) => ({
      ...prev,
      recurringSchedule: (prev.recurringSchedule || []).filter((_, i) => i !== index),
    }))
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
            <CardTitle className="text-lg text-slate-900">Clases</CardTitle>
            <Button variant="outline" size="sm" onClick={resetForm} className="text-black">
              <Plus className="w-4 h-4 mr-2" />
              Nueva clase
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-black">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando clases…
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-black py-10">Aún no hay clases.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-black">
                      {(item.sport || "padel").toUpperCase()} · {item.durationMinutes} min · {item.currency || "ARS"} {item.price}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{item.enabled !== false ? "Activa" : "Pausada"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
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
            <CardTitle className="text-lg text-slate-900">{editingId ? "Editar clase" : "Crear clase"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
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
                <Label>Coach</Label>
                <Input value={form.coachName || ""} onChange={(e) => setForm({ ...form, coachName: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duración (min)</Label>
                <Input type="number" min="30" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Capacidad</Label>
                <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Moneda</Label>
                <Input value={form.currency || "ARS"} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Activa</Label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4" />
                <span className="text-sm text-black">Disponible para reservas</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">Horarios recurrentes</div>
                <Button type="button" variant="outline" size="sm" onClick={addScheduleSlot}>
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {(form.recurringSchedule || []).length === 0 ? (
                  <div className="text-xs text-slate-600">Sin horarios aún.</div>
                ) : (
                  form.recurringSchedule.map((slot, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <Select value={String(slot.dayOfWeek)} onValueChange={(value) => updateSlot(index, { dayOfWeek: Number(value) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEK_DAYS.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(index, { startTime: e.target.value })} />
                      <Input type="time" value={slot.endTime} onChange={(e) => updateSlot(index, { endTime: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
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
