"use client"

import { useEffect, useState, useMemo } from "react"
import {
  collection, getDocs, doc, addDoc, updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Trainer, ClassSession, TrainerSettlement, SettlementStatus } from "@/lib/trainers-types"
import {
  SETTLEMENT_STATUS_LABELS, SETTLEMENT_METHOD_LABELS,
  calcClubCommission, calcTrainerPayout, isoDateStr,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DollarSign, Plus, Loader2, CheckCircle2, Clock, AlertCircle,
  Download, TrendingUp, Users, Banknote, Filter,
} from "lucide-react"

// ─── KPI ─────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, accent = false, loading = false,
}: {
  label: string; value: string; icon: React.ElementType; accent?: boolean; loading?: boolean
}) {
  return (
    <Card className={cn("border-none shadow-sm", accent ? "bg-gradient-to-br from-amber-50 to-orange-100/60" : "bg-card/70")}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", accent ? "bg-amber-200/50" : "bg-slate-100")}>
            <Icon className={cn("h-4 w-4", accent ? "text-amber-700" : "text-slate-500")} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            {loading
              ? <div className="h-5 w-20 rounded bg-slate-200 animate-pulse mt-1" />
              : <p className={cn("text-xl font-bold", accent ? "text-amber-700" : "text-slate-900")}>{value}</p>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Create Settlement Dialog ─────────────────────────────────────────────────

function CreateSettlementDialog({
  open, onClose, trainers, sessions, resolvedId,
}: {
  open: boolean
  onClose: (created: boolean) => void
  trainers: Trainer[]
  sessions: ClassSession[]
  resolvedId: string
}) {
  const [form, setForm] = useState({
    trainerId:   "",
    periodStart: "",
    periodEnd:   "",
    notes:       "",
  })
  const [saving, setSaving] = useState(false)

  const selectedTrainer = trainers.find(t => t.id === form.trainerId)

  // Calculate preview
  const preview = useMemo(() => {
    if (!selectedTrainer || !form.periodStart || !form.periodEnd) return null
    const relevantSessions = sessions.filter(s =>
      s.trainerId === form.trainerId &&
      s.status === "completed" &&
      s.date >= form.periodStart &&
      s.date <= form.periodEnd
    )
    const grossRevenue         = relevantSessions.reduce((acc, s) => acc + (s.price || 0), 0)
    const clubCommissionAmount = relevantSessions.reduce(
      (acc, s) => acc + calcClubCommission(s.price, selectedTrainer), 0
    )
    const trainerNetAmount = relevantSessions.reduce(
      (acc, s) => acc + calcTrainerPayout(s.price, selectedTrainer), 0
    )
    return { grossRevenue, clubCommissionAmount, trainerNetAmount, sessionsCount: relevantSessions.length }
  }, [selectedTrainer, form, sessions])

  const handleSave = async () => {
    if (!form.trainerId || !form.periodStart || !form.periodEnd || !preview) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainerSettlements"),
        {
          clubId:               resolvedId,
          trainerId:            form.trainerId,
          trainerName:          selectedTrainer?.fullName ?? "",
          periodStart:          form.periodStart,
          periodEnd:            form.periodEnd,
          grossRevenue:         preview.grossRevenue,
          clubCommissionAmount: preview.clubCommissionAmount,
          trainerNetAmount:     preview.trainerNetAmount,
          sessionsCount:        preview.sessionsCount,
          status:               "pending",
          notes:                form.notes.trim(),
          createdAt:            now,
          updatedAt:            now,
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
            <Plus className="h-4 w-4 text-amber-600" />Nueva liquidación
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Trainer */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Entrenador *</label>
            <Select value={form.trainerId} onValueChange={v => setForm(f => ({ ...f, trainerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar entrenador" /></SelectTrigger>
              <SelectContent>
                {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Desde *</label>
              <Input type="date" value={form.periodStart}
                onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Hasta *</label>
              <Input type="date" value={form.periodEnd}
                onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
            </div>
          </div>
          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Vista previa ({preview.sessionsCount} clases completadas en el período)
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <p className="text-slate-500">Facturado</p>
                  <p className="font-bold text-slate-800 text-sm">{formatCurrencyARS(preview.grossRevenue)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Club retiene</p>
                  <p className="font-bold text-indigo-700 text-sm">{formatCurrencyARS(preview.clubCommissionAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Entrenador cobra</p>
                  <p className="font-bold text-emerald-700 text-sm">{formatCurrencyARS(preview.trainerNetAmount)}</p>
                </div>
              </div>
              {preview.sessionsCount === 0 && (
                <p className="text-xs text-amber-700 text-center mt-1">
                  ⚠️ No hay clases completadas en este período
                </p>
              )}
            </div>
          )}
          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notas internas</label>
            <Input placeholder="Observaciones opcionales…"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.trainerId || !form.periodStart || !form.periodEnd || !preview || preview.sessionsCount === 0}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? "Guardando…" : "Crear liquidación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrainerSettlements() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""

  const [trainers,     setTrainers]     = useState<Trainer[]>([])
  const [sessions,     setSessions]     = useState<ClassSession[]>([])
  const [settlements,  setSettlements]  = useState<TrainerSettlement[]>([])
  const [loading,      setLoading]      = useState(true)

  const [trainerF,     setTrainerF]     = useState("all")
  const [statusF,      setStatusF]      = useState("all")
  const [periodStart,  setPeriodStart]  = useState("")
  const [periodEnd,    setPeriodEnd]    = useState("")
  const [createOpen,   setCreateOpen]   = useState(false)

  useEffect(() => {
    if (!resolvedId) return
    const load = async () => {
      try {
        const [trSnap, sesSnap, settSnap] = await Promise.all([
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers")),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions")),
          getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainerSettlements")),
        ])
        setTrainers(trSnap.docs.map(d => ({ id: d.id, ...d.data() } as Trainer)))
        setSessions(sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))
        setSettlements(settSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainerSettlement)))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [resolvedId])

  // KPIs
  const kpis = useMemo(() => {
    const pending     = settlements.filter(s => s.status === "pending")
    const paid        = settlements.filter(s => s.status === "paid")
    const pendingAmt  = pending.reduce((a, s) => a + s.trainerNetAmount, 0)
    const paidAmt     = paid.reduce((a, s) => a + s.trainerNetAmount, 0)
    return { pending: pending.length, paid: paid.length, pendingAmt, paidAmt }
  }, [settlements])

  // Per-trainer summary (live, from sessions)
  const trainerSummary = useMemo(() => {
    const today = isoDateStr(new Date())
    const monthStart = today.slice(0, 7) + "-01"
    return trainers.map(t => {
      const trainer = t
      const tSessions = sessions.filter(s => s.trainerId === t.id && s.status === "completed")
      const month     = tSessions.filter(s => s.date >= monthStart)
      const gross     = tSessions.reduce((a, s) => a + (s.price || 0), 0)
      const monthGross = month.reduce((a, s) => a + (s.price || 0), 0)
      const clubCut   = tSessions.reduce((a, s) => a + calcClubCommission(s.price, trainer), 0)
      const netPayout = tSessions.reduce((a, s) => a + calcTrainerPayout(s.price, trainer), 0)
      const pending   = settlements.filter(s => s.trainerId === t.id && s.status === "pending")
      const pendingAmt = pending.reduce((a, s) => a + s.trainerNetAmount, 0)
      return { trainer, gross, monthGross, clubCut, netPayout, pendingAmt }
    })
  }, [trainers, sessions, settlements])

  // Filtered settlements list
  const filtered = useMemo(() => {
    return settlements.filter(s => {
      if (trainerF !== "all" && s.trainerId !== trainerF) return false
      if (statusF  !== "all" && s.status    !== statusF)  return false
      if (periodStart && s.periodEnd < periodStart)   return false
      if (periodEnd   && s.periodStart > periodEnd)   return false
      return true
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [settlements, trainerF, statusF, periodStart, periodEnd])

  const markPaid = async (settlement: TrainerSettlement) => {
    const now = new Date().toISOString()
    await updateDoc(
      doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainerSettlements", settlement.id),
      { status: "paid", paidAt: now, updatedAt: now },
    )
    setSettlements(prev => prev.map(s =>
      s.id === settlement.id ? { ...s, status: "paid", paidAt: now } : s
    ))
  }

  const handleCreated = async () => {
    setCreateOpen(false)
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainerSettlements"))
    setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as TrainerSettlement)))
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Pendientes de pago" icon={Clock}
          value={loading ? "…" : String(kpis.pending)} loading={loading}
        />
        <KpiCard
          label="Monto pendiente" icon={DollarSign}
          value={loading ? "…" : formatCurrencyARS(kpis.pendingAmt)} loading={loading}
        />
        <KpiCard
          label="Pagadas" icon={CheckCircle2}
          value={loading ? "…" : String(kpis.paid)} loading={loading}
        />
        <KpiCard
          label="Total pagado" icon={Banknote}
          value={loading ? "…" : formatCurrencyARS(kpis.paidAmt)} accent loading={loading}
        />
      </div>

      {/* Per-trainer summary */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />Resumen por entrenador (histórico)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Entrenador</TableHead>
                <TableHead>Deporte</TableHead>
                <TableHead>Facturado total</TableHead>
                <TableHead>Club retiene</TableHead>
                <TableHead>Entrenador cobra</TableHead>
                <TableHead>Pendiente liquidar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
                : trainerSummary.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                        Sin entrenadores registrados
                      </TableCell>
                    </TableRow>
                  )
                  : trainerSummary.map(({ trainer, gross, clubCut, netPayout, pendingAmt }) => (
                    <TableRow key={trainer.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-slate-900">{trainer.fullName}</p>
                          <p className="text-xs text-slate-400">{trainer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{trainer.sport}</TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrencyARS(gross)}</TableCell>
                      <TableCell className="text-indigo-700 text-sm">{formatCurrencyARS(clubCut)}</TableCell>
                      <TableCell className="text-emerald-700 font-semibold text-sm">{formatCurrencyARS(netPayout)}</TableCell>
                      <TableCell>
                        {pendingAmt > 0
                          ? <span className="text-sm font-semibold text-amber-700">{formatCurrencyARS(pendingAmt)}</span>
                          : <span className="text-xs text-slate-400">—</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlements list */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Liquidaciones registradas</h3>
          <div className="flex gap-2 flex-wrap">
            <Select value={trainerF} onValueChange={setTrainerF}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Entrenador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-8 w-36 text-xs" value={periodStart}
              onChange={e => setPeriodStart(e.target.value)} title="Desde" />
            <Input type="date" className="h-8 w-36 text-xs" value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)} title="Hasta" />
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />Nueva liquidación
            </Button>
          </div>
        </div>

        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Entrenador</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Clases</TableHead>
                <TableHead>Facturado</TableHead>
                <TableHead>Club retiene</TableHead>
                <TableHead>Pago al entrenador</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
                : filtered.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <AlertCircle className="h-8 w-8" />
                          <p className="text-sm">Sin liquidaciones registradas</p>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 border-amber-200 text-amber-700"
                            onClick={() => setCreateOpen(true)}
                          >
                            <Plus className="h-3.5 w-3.5" />Crear primera liquidación
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : filtered.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.trainerName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {s.periodStart} → {s.periodEnd}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{s.sessionsCount}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrencyARS(s.grossRevenue)}</TableCell>
                      <TableCell className="text-sm text-indigo-700">{formatCurrencyARS(s.clubCommissionAmount)}</TableCell>
                      <TableCell className="text-sm font-semibold text-emerald-700">
                        {formatCurrencyARS(s.trainerNetAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border",
                          s.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {SETTLEMENT_STATUS_LABELS[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => markPaid(s)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Marcar pagada
                          </Button>
                        )}
                        {s.status === "paid" && s.paidAt && (
                          <span className="text-xs text-slate-400">
                            {new Date(s.paidAt).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create dialog */}
      <CreateSettlementDialog
        open={createOpen}
        onClose={created => created ? handleCreated() : setCreateOpen(false)}
        trainers={trainers}
        sessions={sessions}
        resolvedId={resolvedId}
      />
    </div>
  )
}
