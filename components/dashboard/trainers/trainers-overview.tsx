"use client"

import { useEffect, useState, useMemo } from "react"
import {
  collection, getDocs, query, where, doc, updateDoc,
  addDoc, orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Trainer, ClassSession } from "@/lib/trainers-types"
import {
  TRAINER_STATUS_LABELS, CLASS_TYPE_LABELS, CLASS_STATUS_LABELS,
  classStatusColor, classTypeBadgeColor, trainerInitials,
  addMinutesToTimeStr, isoDateStr, calcClubCommission,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  Dumbbell, Users, Calendar, DollarSign, Search, Plus, MoreVertical,
  Pencil, UserX, UserCheck, ChevronRight, TrendingUp, Activity,
  Clock, Eye, AlertCircle,
} from "lucide-react"

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, desc, icon: Icon, accent = false, loading = false,
}: {
  label: string; value: string; desc?: string; icon: React.ElementType
  accent?: boolean; loading?: boolean
}) {
  return (
    <Card className={cn(
      "border-none shadow-sm",
      accent
        ? "bg-gradient-to-br from-amber-50 to-orange-100/60"
        : "bg-card/70"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">{label}</CardTitle>
        <div className={cn("p-1.5 rounded-md", accent ? "bg-amber-200/50" : "bg-slate-100")}>
          <Icon className={cn("h-4 w-4", accent ? "text-amber-700" : "text-slate-500")} />
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="h-7 w-20 rounded bg-slate-200 animate-pulse" />
          : <p className={cn("text-2xl font-bold", accent ? "text-amber-700" : "text-slate-900")}>{value}</p>}
        {desc && <p className="text-xs text-slate-400 mt-1">{desc}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Trainer Avatar ───────────────────────────────────────────────────────────

function TrainerAvatar({ trainer }: { trainer: Trainer }) {
  if (trainer.photoUrl) {
    return (
      <img
        src={trainer.photoUrl}
        alt={trainer.fullName}
        className="w-9 h-9 rounded-full object-cover"
      />
    )
  }
  const colors = [
    "bg-amber-100 text-amber-700",
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
  ]
  const color = colors[trainer.fullName.charCodeAt(0) % colors.length]
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold", color)}>
      {trainerInitials(trainer)}
    </div>
  )
}

// ─── Create Class Dialog ──────────────────────────────────────────────────────

interface Court { id: string; name?: string; number?: string | number }

function CreateClassDialog({
  open, onClose, trainers, courts, resolvedId,
  defaultTrainerId,
}: {
  open: boolean
  onClose: (created: boolean) => void
  trainers: Trainer[]
  courts: Court[]
  resolvedId: string
  defaultTrainerId?: string
}) {
  const [form, setForm] = useState({
    trainerId:   defaultTrainerId ?? "",
    courtId:     "",
    date:        isoDateStr(new Date()),
    startTime:   "10:00",
    duration:    "60",
    classType:   "private",
    maxCapacity: "1",
    price:       "",
    notes:       "",
    customerNames: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        trainerId:   defaultTrainerId ?? "",
        price:       "",
        customerNames: "",
      }))
    }
  }, [open, defaultTrainerId])

  // Auto-fill price from selected trainer
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
  const selectedTrainer = trainers.find(t => t.id === form.trainerId)

  const handleSave = async () => {
    if (!form.trainerId || !form.courtId || !form.date || !form.startTime) return
    setSaving(true)
    try {
      const coll = collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions")
      const court = courts.find(c => c.id === form.courtId)
      await addDoc(coll, {
        clubId:         resolvedId,
        trainerId:      form.trainerId,
        trainerName:    selectedTrainer?.fullName ?? "",
        courtId:        form.courtId,
        courtName:      court?.name ?? court?.number ?? form.courtId,
        date:           form.date,
        startTime:      form.startTime,
        endTime,
        durationMinutes: parseInt(form.duration) || 60,
        classType:      form.classType,
        maxCapacity:    parseInt(form.maxCapacity) || 1,
        status:         "scheduled",
        price:          parseFloat(form.price) || 0,
        notes:          form.notes.trim(),
        customerIds:    [],
        customerNames:  form.customerNames
          ? form.customerNames.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      onClose(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            Nueva clase
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Trainer */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Entrenador *</label>
            <Select value={form.trainerId} onValueChange={v => setForm(f => ({ ...f, trainerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar entrenador" /></SelectTrigger>
              <SelectContent>
                {trainers.filter(t => t.status === "active").map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Court */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Cancha *</label>
            <Select value={form.courtId} onValueChange={v => setForm(f => ({ ...f, courtId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cancha" /></SelectTrigger>
              <SelectContent>
                {courts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name ?? `Cancha ${c.number}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Fecha *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Hora inicio *</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
          </div>
          {/* Duration + End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Duración (min)</label>
              <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 75, 90, 120].map(d => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Hora fin</label>
              <Input value={endTime} readOnly className="bg-slate-50 text-slate-500" />
            </div>
          </div>
          {/* Type + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <Select value={form.classType} onValueChange={v => setForm(f => ({ ...f, classType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privada</SelectItem>
                  <SelectItem value="group">Grupal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Capacidad máx.</label>
              <Input
                type="number" min="1" value={form.maxCapacity}
                onChange={e => setForm(f => ({ ...f, maxCapacity: e.target.value }))}
              />
            </div>
          </div>
          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Precio (ARS)</label>
            <Input
              type="number" min="0" placeholder="0"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
          </div>
          {/* Customers */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Alumnos (nombres separados por coma)
            </label>
            <Input
              placeholder="Ej: Juan López, María García"
              value={form.customerNames}
              onChange={e => setForm(f => ({ ...f, customerNames: e.target.value }))}
            />
          </div>
          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <Input
              placeholder="Observaciones opcionales..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrainersOverview() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""

  const [trainers, setTrainers]   = useState<Trainer[]>([])
  const [sessions, setSessions]   = useState<ClassSession[]>([])
  const [courts,   setCourts]     = useState<Court[]>([])
  const [loading,  setLoading]    = useState(true)
  const [search,   setSearch]     = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sportFilter,  setSportFilter]  = useState("all")
  const [classDialog, setClassDialog]   = useState<{ open: boolean; trainerId?: string }>({ open: false })

  // ── Load data ──
  useEffect(() => {
    if (!resolvedId) return
    const load = async () => {
      try {
        const [trSnap, sesSnap, courtSnap] = await Promise.all([
          getDocs(query(
            collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers"),
            orderBy("fullName"),
          )),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions")),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courts")),
        ])
        setTrainers(trSnap.docs.map(d => ({ id: d.id, ...d.data() } as Trainer)))
        setSessions(sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
        setCourts(courtSnap.docs.map(d => ({ id: d.id, ...d.data() } as Court)))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resolvedId])

  // ── KPIs ──
  const today = isoDateStr(new Date())
  const monthStart = today.slice(0, 7) + "-01"

  const kpis = useMemo(() => {
    const active         = trainers.filter(t => t.status === "active").length
    const classesToday   = sessions.filter(s => s.date === today && s.status !== "cancelled").length
    const monthRevenue   = sessions
      .filter(s => s.date >= monthStart && s.status === "completed")
      .reduce((acc, s) => acc + (s.price || 0), 0)
    return { total: trainers.length, active, classesToday, monthRevenue }
  }, [trainers, sessions, today, monthStart])

  // ── Per-trainer stats ──
  const trainerStats = useMemo(() => {
    const map: Record<string, { monthRevenue: number; classesThisMonth: number; nextClass?: ClassSession }> = {}
    for (const t of trainers) {
      const tSessions  = sessions.filter(s => s.trainerId === t.id)
      const monthSessions = tSessions.filter(s => s.date >= monthStart && s.status === "completed")
      const upcoming   = tSessions
        .filter(s => s.date >= today && s.status !== "cancelled")
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      map[t.id] = {
        monthRevenue:      monthSessions.reduce((acc, s) => acc + (s.price || 0), 0),
        classesThisMonth:  monthSessions.length,
        nextClass:         upcoming[0],
      }
    }
    return map
  }, [trainers, sessions, today, monthStart])

  // ── Filters ──
  const sports = useMemo(() => [...new Set(trainers.map(t => t.sport).filter(Boolean))].sort(), [trainers])

  const filtered = useMemo(() => {
    return trainers.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (sportFilter  !== "all" && t.sport  !== sportFilter)  return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.fullName.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [trainers, statusFilter, sportFilter, search])

  // ── Toggle status ──
  const toggleStatus = async (trainer: Trainer) => {
    const newStatus = trainer.status === "active" ? "inactive" : "active"
    await updateDoc(
      doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers", trainer.id),
      { status: newStatus, updatedAt: new Date().toISOString() },
    )
    setTrainers(prev => prev.map(t => t.id === trainer.id ? { ...t, status: newStatus } : t))
  }

  const handleClassCreated = async () => {
    setClassDialog({ open: false })
    // Reload sessions
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions"))
    setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
  }

  // ── Empty state ──
  if (!loading && trainers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Dumbbell className="h-8 w-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Sin entrenadores</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Creá tu primer entrenador y comenzá a gestionar clases, horarios y liquidaciones.
          </p>
        </div>
        <Button asChild className="bg-amber-600 hover:bg-amber-700 gap-2">
          <Link href="/clubos/dashboard/trainers/new">
            <Plus className="h-4 w-4" />Nuevo entrenador
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total entrenadores" value={loading ? "…" : String(kpis.total)}
          desc="registrados en el club" icon={Dumbbell} loading={loading}
        />
        <KpiCard
          label="Activos" value={loading ? "…" : String(kpis.active)}
          desc="listos para dar clases" icon={Activity} loading={loading}
        />
        <KpiCard
          label="Clases hoy" value={loading ? "…" : String(kpis.classesToday)}
          desc="programadas o confirmadas" icon={Calendar} loading={loading}
        />
        <KpiCard
          label="Ingresos este mes" value={loading ? "…" : formatCurrencyARS(kpis.monthRevenue)}
          desc="de clases completadas" icon={DollarSign} accent loading={loading}
        />
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar entrenador…"
              className="pl-8 w-52"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {sports.length > 0 && (
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Deporte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sports.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          onClick={() => setClassDialog({ open: true })}
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          <Plus className="h-4 w-4" />
          Nueva clase
        </Button>
      </div>

      {/* Trainers Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead>Entrenador</TableHead>
              <TableHead>Deporte / Especialidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Próxima clase</TableHead>
              <TableHead>Clases este mes</TableHead>
              <TableHead>Ingresos mes</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <AlertCircle className="h-8 w-8" />
                        <p className="text-sm">No se encontraron entrenadores</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : filtered.map(trainer => {
                  const stats = trainerStats[trainer.id] ?? { monthRevenue: 0, classesThisMonth: 0 }
                  return (
                    <TableRow key={trainer.id} className="group hover:bg-slate-50/50">
                      {/* Name + avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TrainerAvatar trainer={trainer} />
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{trainer.fullName}</p>
                            <p className="text-xs text-slate-400">{trainer.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      {/* Sport */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-700">{trainer.sport}</span>
                          {trainer.specialty && (
                            <span className="text-xs text-slate-400">{trainer.specialty}</span>
                          )}
                        </div>
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Badge className={cn("text-xs border",
                          trainer.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {TRAINER_STATUS_LABELS[trainer.status]}
                        </Badge>
                      </TableCell>
                      {/* Next class */}
                      <TableCell>
                        {stats.nextClass ? (
                          <div className="text-xs">
                            <p className="font-medium text-slate-700">
                              {stats.nextClass.date} — {stats.nextClass.startTime}
                            </p>
                            <p className="text-slate-400">{stats.nextClass.courtName}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin clases</span>
                        )}
                      </TableCell>
                      {/* Classes count */}
                      <TableCell>
                        <span className="text-sm font-medium text-slate-700">
                          {stats.classesThisMonth}
                        </span>
                      </TableCell>
                      {/* Revenue */}
                      <TableCell>
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrencyARS(stats.monthRevenue)}
                        </span>
                      </TableCell>
                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/clubos/dashboard/trainers/${trainer.id}`} className="gap-2">
                                <Eye className="h-3.5 w-3.5" />Ver perfil
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/clubos/dashboard/trainers/${trainer.id}/edit`} className="gap-2">
                                <Pencil className="h-3.5 w-3.5" />Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => setClassDialog({ open: true, trainerId: trainer.id })}
                            >
                              <Plus className="h-3.5 w-3.5" />Nueva clase
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={cn("gap-2", trainer.status === "active" ? "text-slate-600" : "text-emerald-600")}
                              onClick={() => toggleStatus(trainer)}
                            >
                              {trainer.status === "active"
                                ? <><UserX className="h-3.5 w-3.5" />Desactivar</>
                                : <><UserCheck className="h-3.5 w-3.5" />Activar</>
                              }
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
            }
          </TableBody>
        </Table>
      </Card>

      {/* Create class dialog */}
      <CreateClassDialog
        open={classDialog.open}
        onClose={created => created ? handleClassCreated() : setClassDialog({ open: false })}
        trainers={trainers}
        courts={courts}
        resolvedId={resolvedId}
        defaultTrainerId={classDialog.trainerId}
      />
    </div>
  )
}
