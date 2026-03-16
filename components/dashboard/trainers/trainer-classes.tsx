"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Trainer, ClassSession, ClassStatus, ClassType } from "@/lib/trainers-types"
import {
  CLASS_STATUS_LABELS, CLASS_TYPE_LABELS,
  classStatusColor, classTypeBadgeColor, isoDateStr, addMinutesToTimeStr,
} from "@/lib/trainers-types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Search, Plus, MoreVertical, CheckCircle2, XCircle, Pencil, Eye,
  Users, DollarSign, Calendar, Clock, Filter, AlertCircle, Loader2,
} from "lucide-react"
import { useSearchParams } from "next/navigation"

// ─── Edit / Detail Dialog ─────────────────────────────────────────────────────

function ClassDetailDialog({
  session, trainers, courts, open, onClose, resolvedId,
}: {
  session: ClassSession | null
  trainers: Trainer[]
  courts: Array<{ id: string; name?: string; number?: string | number }>
  open: boolean
  onClose: (updated?: ClassSession) => void
  resolvedId: string
}) {
  const [form, setForm] = useState({
    status:       "",
    price:        "",
    notes:        "",
    customerNames: "",
    courtId:      "",
    startTime:    "",
    duration:     "60",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session) {
      setForm({
        status:        session.status,
        price:         String(session.price),
        notes:         session.notes ?? "",
        customerNames: (session.customerNames ?? []).join(", "),
        courtId:       session.courtId,
        startTime:     session.startTime,
        duration:      String(session.durationMinutes),
      })
    }
  }, [session])

  const handleSave = async () => {
    if (!session) return
    setSaving(true)
    try {
      const endTime = addMinutesToTimeStr(form.startTime, parseInt(form.duration) || 60)
      const updates: Partial<ClassSession> = {
        status:          form.status as ClassStatus,
        price:           parseFloat(form.price) || 0,
        notes:           form.notes,
        courtId:         form.courtId,
        courtName:       courts.find(c => c.id === form.courtId)?.name ?? session.courtName,
        startTime:       form.startTime,
        endTime,
        durationMinutes: parseInt(form.duration) || 60,
        customerNames:   form.customerNames
          ? form.customerNames.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        updatedAt: new Date().toISOString(),
      }
      await updateDoc(
        doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions", session.id),
        updates,
      )
      onClose({ ...session, ...updates })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-amber-600" />
            Editar clase
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-500 space-y-0.5">
            <p><span className="font-medium text-slate-700">Entrenador:</span> {session.trainerName}</p>
            <p><span className="font-medium text-slate-700">Fecha:</span> {session.date}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Hora inicio</label>
              <Input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Duración (min)</label>
              <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 75, 90, 120].map(d => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Cancha</label>
            <Select value={form.courtId} onValueChange={v => setForm(f => ({ ...f, courtId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {courts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name ?? `Cancha ${c.number}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Estado</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CLASS_STATUS_LABELS) as [string, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Precio (ARS)</label>
            <Input type="number" min="0" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Alumnos (separados por coma)</label>
            <Input value={form.customerNames}
              onChange={e => setForm(f => ({ ...f, customerNames: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Notas</label>
            <Input value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Class Dialog ──────────────────────────────────────────────────────

function CreateClassDialog({
  open, onClose, trainers, courts, resolvedId, defaultTrainerId,
}: {
  open: boolean
  onClose: (created: boolean) => void
  trainers: Trainer[]
  courts: Array<{ id: string; name?: string; number?: string | number }>
  resolvedId: string
  defaultTrainerId?: string
}) {
  const [form, setForm] = useState({
    trainerId: defaultTrainerId ?? "", courtId: "",
    date: isoDateStr(new Date()), startTime: "10:00",
    duration: "60", classType: "private",
    maxCapacity: "1", price: "", notes: "", customerNames: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const trainer = trainers.find(t => t.id === form.trainerId)
    if (trainer) {
      setForm(f => ({
        ...f,
        price: String(trainer.baseClassPrice || ""),
        maxCapacity: f.classType === "private" ? "1" : String(trainer.maxCapacityPerClass || "10"),
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
          clubId: resolvedId,
          trainerId: form.trainerId,
          trainerName: trainer?.fullName ?? "",
          courtId: form.courtId,
          courtName: court?.name ?? `Cancha ${court?.number}`,
          date: form.date, startTime: form.startTime, endTime,
          durationMinutes: parseInt(form.duration) || 60,
          classType: form.classType, maxCapacity: parseInt(form.maxCapacity) || 1,
          status: "scheduled", price: parseFloat(form.price) || 0,
          notes: form.notes.trim(), customerIds: [],
          customerNames: form.customerNames
            ? form.customerNames.split(",").map(s => s.trim()).filter(Boolean) : [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
              <label className="text-xs font-medium text-slate-600">Hora *</label>
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
              <label className="text-xs font-medium text-slate-600">Capacidad</label>
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color = "slate", loading = false,
}: {
  label: string; value: string; icon: React.ElementType; color?: "amber" | "slate"; loading?: boolean
}) {
  return (
    <Card className={cn("border-none shadow-sm", color === "amber" ? "bg-amber-50" : "bg-card/70")}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", color === "amber" ? "bg-amber-200/50" : "bg-slate-100")}>
            <Icon className={cn("h-4 w-4", color === "amber" ? "text-amber-700" : "text-slate-500")} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            {loading
              ? <div className="h-5 w-16 rounded bg-slate-200 animate-pulse mt-1" />
              : <p className={cn("text-lg font-bold", color === "amber" ? "text-amber-700" : "text-slate-900")}>{value}</p>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TrainerClasses() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""
  const searchParams = useSearchParams()
  const defaultTrainer = searchParams.get("trainer") ?? ""

  const [trainers,  setTrainers]  = useState<Trainer[]>([])
  const [sessions,  setSessions]  = useState<ClassSession[]>([])
  const [courts,    setCourts]    = useState<Array<{ id: string; name?: string; number?: string | number }>>([])
  const [loading,   setLoading]   = useState(true)

  const [search,     setSearch]     = useState("")
  const [dateFrom,   setDateFrom]   = useState("")
  const [dateTo,     setDateTo]     = useState("")
  const [trainerF,   setTrainerF]   = useState<string>(defaultTrainer || "all")
  const [courtF,     setCourtF]     = useState("all")
  const [statusF,    setStatusF]    = useState("all")
  const [typeF,      setTypeF]      = useState("all")

  const [editSession,   setEditSession]   = useState<ClassSession | null>(null)
  const [editOpen,      setEditOpen]      = useState(false)
  const [createOpen,    setCreateOpen]    = useState(false)

  const today = isoDateStr(new Date())
  const monthStart = today.slice(0, 7) + "-01"

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

  // KPIs
  const kpis = useMemo(() => {
    const scheduled  = sessions.filter(s => s.status === "scheduled" || s.status === "confirmed").length
    const completed  = sessions.filter(s => s.status === "completed").length
    const revenue    = sessions.filter(s => s.status === "completed").reduce((a, s) => a + (s.price || 0), 0)
    const thisMonth  = sessions.filter(s => s.date >= monthStart && s.status === "completed")
    const monthRev   = thisMonth.reduce((a, s) => a + (s.price || 0), 0)
    return { scheduled, completed, revenue, monthRev }
  }, [sessions, monthStart])

  // Filters
  const filtered = useMemo(() => {
    return sessions
      .filter(s => {
        if (statusF  !== "all" && s.status    !== statusF)   return false
        if (typeF    !== "all" && s.classType !== typeF)     return false
        if (trainerF !== "all" && s.trainerId !== trainerF)  return false
        if (courtF   !== "all" && s.courtId   !== courtF)    return false
        if (dateFrom && s.date < dateFrom) return false
        if (dateTo   && s.date > dateTo)   return false
        if (search) {
          const q = search.toLowerCase()
          if (
            !s.trainerName?.toLowerCase().includes(q) &&
            !s.courtName?.toLowerCase().includes(q)   &&
            !(s.customerNames ?? []).some(n => n.toLowerCase().includes(q))
          ) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
  }, [sessions, statusF, typeF, trainerF, courtF, dateFrom, dateTo, search])

  const handleStatusChange = async (session: ClassSession, status: ClassStatus) => {
    await updateDoc(
      doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions", session.id),
      { status, updatedAt: new Date().toISOString() },
    )
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status } : s))
  }

  const handleEdited = (updated?: ClassSession) => {
    if (updated) setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    setEditOpen(false)
    setEditSession(null)
  }

  const handleCreated = async () => {
    setCreateOpen(false)
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions"))
    setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
  }

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Próximas"         value={loading ? "…" : String(kpis.scheduled)} icon={Calendar} loading={loading} />
        <KpiCard label="Completadas"      value={loading ? "…" : String(kpis.completed)} icon={CheckCircle2} loading={loading} />
        <KpiCard label="Ingresos totales" value={loading ? "…" : formatCurrencyARS(kpis.revenue)} icon={DollarSign} loading={loading} />
        <KpiCard label="Ingresos este mes" value={loading ? "…" : formatCurrencyARS(kpis.monthRev)} icon={DollarSign} color="amber" loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar…" className="pl-8 h-8 w-44 text-sm"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={trainerF} onValueChange={setTrainerF}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Entrenador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los entrenadores</SelectItem>
              {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {(Object.entries(CLASS_STATUS_LABELS) as [string, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeF} onValueChange={setTypeF}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="private">Privada</SelectItem>
              <SelectItem value="group">Grupal</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 text-xs w-36" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} title="Desde" />
          <Input type="date" className="h-8 text-xs w-36" value={dateTo}
            onChange={e => setDateTo(e.target.value)} title="Hasta" />
        </div>
        <Button
          size="sm" className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />Nueva clase
        </Button>
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Entrenador</TableHead>
              <TableHead>Cancha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
              : filtered.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <AlertCircle className="h-8 w-8" />
                        <p className="text-sm">No se encontraron clases</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : filtered.map(s => (
                  <TableRow key={s.id} className="group hover:bg-slate-50/50">
                    <TableCell className="font-medium text-sm">{s.date}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {s.startTime}–{s.endTime}
                    </TableCell>
                    <TableCell className="text-sm">{s.trainerName}</TableCell>
                    <TableCell className="text-sm">{s.courtName ?? s.courtId}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs border", classTypeBadgeColor(s.classType))}>
                        {CLASS_TYPE_LABELS[s.classType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        {(s.customerNames ?? []).length > 0
                          ? <span>{(s.customerNames ?? []).join(", ")}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs border", classStatusColor(s.status))}>
                        {CLASS_STATUS_LABELS[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {formatCurrencyARS(s.price)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => { setEditSession(s); setEditOpen(true) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />Editar
                          </DropdownMenuItem>
                          {(s.status === "scheduled" || s.status === "confirmed") && (
                            <DropdownMenuItem
                              className="gap-2 text-emerald-600"
                              onClick={() => handleStatusChange(s, "completed")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />Marcar completada
                            </DropdownMenuItem>
                          )}
                          {s.status === "scheduled" && (
                            <DropdownMenuItem
                              className="gap-2 text-blue-600"
                              onClick={() => handleStatusChange(s, "confirmed")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />Confirmar
                            </DropdownMenuItem>
                          )}
                          {s.status !== "cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-rose-600"
                                onClick={() => handleStatusChange(s, "cancelled")}
                              >
                                <XCircle className="h-3.5 w-3.5" />Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </Card>

      {/* Edit dialog */}
      <ClassDetailDialog
        session={editSession}
        trainers={trainers}
        courts={courts}
        open={editOpen}
        onClose={handleEdited}
        resolvedId={resolvedId}
      />

      {/* Create dialog */}
      <CreateClassDialog
        open={createOpen}
        onClose={created => created ? handleCreated() : setCreateOpen(false)}
        trainers={trainers}
        courts={courts}
        resolvedId={resolvedId}
        defaultTrainerId={trainerF !== "all" ? trainerF : undefined}
      />
    </div>
  )
}
