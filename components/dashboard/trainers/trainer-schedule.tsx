"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { Trainer, ClassSession, ClassStatus } from "@/lib/trainers-types"
import {
  CLASS_STATUS_LABELS, CLASS_TYPE_LABELS,
  classStatusColor, classTypeBadgeColor,
  weekStart, weekDates, isoDateStr, addMinutesToTimeStr,
  TRAINER_DAY_KEYS, TRAINER_DAY_SHORT,
} from "@/lib/trainers-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Users, Clock,
  Dumbbell, AlertCircle, Loader2, X, Check,
} from "lucide-react"
import { useSearchParams } from "next/navigation"

// ─── Hours to render ──────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7h → 21h
const HOUR_HEIGHT = 60 // px per hour

// ─── Create Class Dialog ──────────────────────────────────────────────────────

function CreateClassDialog({
  open, onClose, trainers, courts, resolvedId, defaultDate,
}: {
  open: boolean
  onClose: (created: boolean) => void
  trainers: Trainer[]
  courts: Array<{ id: string; name?: string; number?: string | number }>
  resolvedId: string
  defaultDate?: string
}) {
  const [form, setForm] = useState({
    trainerId: "", courtId: "", date: defaultDate ?? isoDateStr(new Date()),
    startTime: "10:00", duration: "60", classType: "private",
    maxCapacity: "1", price: "", notes: "", customerNames: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(f => ({ ...f, date: defaultDate ?? f.date }))
  }, [open, defaultDate])

  useEffect(() => {
    const trainer = trainers.find(t => t.id === form.trainerId)
    if (trainer) {
      setForm(f => ({
        ...f,
        price: String(trainer.baseClassPrice || ""),
        maxCapacity: form.classType === "private" ? "1" : String(trainer.maxCapacityPerClass || "10"),
      }))
    }
  }, [form.trainerId, form.classType, trainers])

  const endTime = addMinutesToTimeStr(form.startTime, parseInt(form.duration) || 60)

  const handleSave = async () => {
    if (!form.trainerId || !form.courtId || !form.date) return
    setSaving(true)
    try {
      const court   = courts.find(c => c.id === form.courtId)
      const trainer = trainers.find(t => t.id === form.trainerId)
      await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions"),
        {
          clubId:      resolvedId,
          trainerId:   form.trainerId,
          trainerName: trainer?.fullName ?? "",
          courtId:     form.courtId,
          courtName:   court?.name ?? `Cancha ${court?.number}`,
          date:        form.date,
          startTime:   form.startTime,
          endTime,
          durationMinutes: parseInt(form.duration) || 60,
          classType:   form.classType,
          maxCapacity: parseInt(form.maxCapacity) || 1,
          status:      "scheduled",
          price:       parseFloat(form.price) || 0,
          notes:       form.notes.trim(),
          customerIds: [],
          customerNames: form.customerNames
            ? form.customerNames.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      )
      onClose(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-amber-600" />Nueva clase
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Entrenador *</label>
            <Select value={form.trainerId} onValueChange={v => setForm(f => ({ ...f, trainerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {trainers.filter(t => t.status === "active").map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Cancha *</label>
            <Select value={form.courtId} onValueChange={v => setForm(f => ({ ...f, courtId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {courts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name ?? `Cancha ${c.number}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Hora inicio *</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Duración</label>
              <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 75, 90, 120].map(d => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo</label>
              <Select value={form.classType} onValueChange={v => setForm(f => ({ ...f, classType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privada</SelectItem>
                  <SelectItem value="group">Grupal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Capacidad máx.</label>
              <Input type="number" min="1" value={form.maxCapacity}
                onChange={e => setForm(f => ({ ...f, maxCapacity: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Precio (ARS)</label>
              <Input type="number" min="0" placeholder="0" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Alumnos (separados por coma)</label>
            <Input placeholder="Juan López, María García" value={form.customerNames}
              onChange={e => setForm(f => ({ ...f, customerNames: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Notas</label>
            <Input placeholder="Observaciones…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.trainerId || !form.courtId}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? "Guardando…" : "Crear clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Session block on calendar ────────────────────────────────────────────────

function SessionBlock({
  session, onCancel, onComplete,
}: {
  session: ClassSession
  onCancel: (s: ClassSession) => void
  onComplete: (s: ClassSession) => void
}) {
  const [startH, startM] = session.startTime.split(":").map(Number)
  const [endH,   endM]   = session.endTime.split(":").map(Number)
  const startMin  = startH * 60 + startM
  const endMin    = endH * 60 + endM
  const top       = (startMin - 7 * 60) * (HOUR_HEIGHT / 60)
  const height    = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 24)

  const isPrivate = session.classType === "private"
  const bg = session.status === "cancelled"
    ? "bg-rose-100 border-rose-300 text-rose-800"
    : session.status === "completed"
      ? "bg-slate-100 border-slate-300 text-slate-500"
      : isPrivate
        ? "bg-amber-100 border-amber-400 text-amber-900"
        : "bg-indigo-100 border-indigo-400 text-indigo-900"

  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 rounded border text-xs px-1.5 py-0.5 overflow-hidden cursor-default select-none group/block",
        bg
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <p className="font-semibold truncate leading-tight">{session.trainerName}</p>
      {height > 30 && <p className="truncate opacity-75">{session.courtName}</p>}
      {height > 44 && session.status !== "cancelled" && session.status !== "completed" && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover/block:flex gap-0.5">
          <button
            onClick={e => { e.stopPropagation(); onComplete(session) }}
            className="p-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Check className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onCancel(session) }}
            className="p-0.5 rounded bg-rose-600 text-white hover:bg-rose-700"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrainerSchedule() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""
  const searchParams = useSearchParams()
  const defaultTrainer = searchParams.get("trainer") ?? ""

  const [trainers,  setTrainers]  = useState<Trainer[]>([])
  const [sessions,  setSessions]  = useState<ClassSession[]>([])
  const [courts,    setCourts]    = useState<Array<{ id: string; name?: string; number?: string | number }>>([])
  const [loading,   setLoading]   = useState(true)
  const [monday,    setMonday]    = useState<Date>(() => weekStart(new Date()))
  const [trainerFilter, setTrainerFilter] = useState<string>(defaultTrainer || "all")
  const [courtFilter,   setCourtFilter]   = useState("all")
  const [createDialog, setCreateDialog]   = useState<{ open: boolean; date?: string }>({ open: false })

  useEffect(() => {
    if (!resolvedId) return
    const load = async () => {
      try {
        const [trSnap, sesSnap, courtSnap] = await Promise.all([
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers")),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions")),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courts")),
        ])
        setTrainers(trSnap.docs.map(d => ({ id: d.id, ...d.data() } as Trainer)))
        setSessions(sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
        setCourts(courtSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [resolvedId])

  const dates = useMemo(() => weekDates(monday), [monday])
  const today = isoDateStr(new Date())

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (!dates.includes(s.date)) return false
      if (trainerFilter !== "all" && s.trainerId !== trainerFilter) return false
      if (courtFilter   !== "all" && s.courtId   !== courtFilter)   return false
      return true
    })
  }, [sessions, dates, trainerFilter, courtFilter])

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {}
    for (const d of dates) map[d] = []
    for (const s of filtered) map[s.date]?.push(s)
    return map
  }, [filtered, dates])

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d) }
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d) }
  const goToday  = () => setMonday(weekStart(new Date()))

  const updateStatus = async (session: ClassSession, status: ClassStatus) => {
    await updateDoc(
      doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions", session.id),
      { status, updatedAt: new Date().toISOString() },
    )
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status } : s))
  }

  const handleCreated = async () => {
    setCreateDialog({ open: false })
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions"))
    setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
  }

  const weekLabel = (() => {
    const end = new Date(monday)
    end.setDate(end.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    return `${fmt(monday)} – ${fmt(end)}`
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-slate-700 min-w-44 text-center">
            {weekLabel}
          </div>
          <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs text-slate-500">
            Hoy
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={trainerFilter} onValueChange={setTrainerFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Entrenador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los entrenadores</SelectItem>
              {trainers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={courtFilter} onValueChange={setCourtFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Cancha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las canchas</SelectItem>
              {courts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name ?? `Cancha ${c.number}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
            onClick={() => setCreateDialog({ open: true })}
          >
            <Plus className="h-3.5 w-3.5" />Nueva clase
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />Privada</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-200 border border-indigo-400" />Grupal</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />Completada</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />Cancelada</span>
      </div>

      {/* Calendar grid */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b bg-slate-50">
              <div className="py-3" /> {/* time gutter */}
              {dates.map((date, i) => {
                const isToday = date === today
                const dayShort = TRAINER_DAY_SHORT[TRAINER_DAY_KEYS[i]]
                const dayNum = new Date(date + "T12:00:00").getDate()
                return (
                  <div
                    key={date}
                    className="py-3 text-center border-l border-slate-200"
                    onClick={() => setCreateDialog({ open: true, date })}
                  >
                    <p className="text-xs text-slate-400">{dayShort}</p>
                    <p className={cn(
                      "text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full",
                      isToday ? "bg-amber-600 text-white" : "text-slate-700"
                    )}>
                      {dayNum}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <div className="relative grid grid-cols-8">
              {/* Hour labels */}
              <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-xs text-slate-400 text-right pr-2"
                    style={{ top: `${(h - 7) * HOUR_HEIGHT - 7}px` }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dates.map((date, i) => (
                <div
                  key={date}
                  className={cn(
                    "relative border-l border-slate-200",
                    date === today ? "bg-amber-50/30" : ""
                  )}
                  style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: `${(h - 7) * HOUR_HEIGHT}px` }}
                    />
                  ))}
                  {/* Session blocks */}
                  {(sessionsByDate[date] ?? []).map(s => (
                    <SessionBlock
                      key={s.id}
                      session={s}
                      onCancel={s => updateStatus(s, "cancelled")}
                      onComplete={s => updateStatus(s, "completed")}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Create dialog */}
      <CreateClassDialog
        open={createDialog.open}
        onClose={created => created ? handleCreated() : setCreateDialog({ open: false })}
        trainers={trainers}
        courts={courts}
        resolvedId={resolvedId}
        defaultDate={createDialog.date}
      />
    </div>
  )
}
