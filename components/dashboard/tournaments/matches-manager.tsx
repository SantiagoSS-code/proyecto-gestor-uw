"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getMatchesByClub, getTournaments, updateMatch, deleteMatch,
} from "@/lib/tournaments"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Pencil, Trash2 } from "lucide-react"
import type { TournamentMatchDoc, TournamentDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  scheduled:   "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-slate-100 text-slate-500",
}
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado", in_progress: "En curso",
  completed: "Completado", cancelled: "Cancelado",
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch { return "—" }
}

type MatchForm = {
  courtId: string; courtName: string; scheduledAt: string
  scoreA: string; scoreB: string; status: TournamentMatchDoc["status"]
  winnerId: string; notes: string
}

const EMPTY_FORM: MatchForm = {
  courtId: "", courtName: "", scheduledAt: "",
  scoreA: "", scoreB: "", status: "scheduled", winnerId: "", notes: "",
}

export function MatchesManager() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<TournamentMatchDoc[]>([])
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TournamentMatchDoc | null>(null)
  const [form, setForm] = useState<MatchForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterTournament, setFilterTournament] = useState("all")

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    Promise.all([getMatchesByClub(clubId), getTournaments(clubId)])
      .then(([m, t]) => { setMatches(m); setTournaments(t) })
      .finally(() => setLoading(false))
  }, [clubId])

  function openEdit(m: TournamentMatchDoc) {
    setEditing(m)
    setForm({
      courtId: m.courtId ?? "", courtName: m.courtName ?? "",
      scheduledAt: "", scoreA: m.scoreA ?? "", scoreB: m.scoreB ?? "",
      status: m.status, winnerId: m.winnerId ?? "", notes: m.notes ?? "",
    })
    setOpen(true)
  }

  function setF<K extends keyof MatchForm>(k: K, v: MatchForm[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSave() {
    if (!editing?.id) return
    setSaving(true)
    try {
      const payload: Partial<TournamentMatchDoc> = {
        courtId: form.courtId || undefined,
        courtName: form.courtName || undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : editing.scheduledAt,
        scoreA: form.scoreA,
        scoreB: form.scoreB,
        status: form.status,
        winnerId: form.winnerId || undefined,
        notes: form.notes || undefined,
      }
      await updateMatch(editing.id, payload)
      setMatches((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...payload } : m))
      setOpen(false)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await deleteMatch(id)
    setMatches((prev) => prev.filter((m) => m.id !== id))
  }

  const tournamentName = (id: string) => tournaments.find((t) => t.id === id)?.name ?? "—"

  const filtered = filterTournament === "all"
    ? matches
    : matches.filter((m) => m.tournamentId === filterTournament)

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="h-8 text-sm w-56">
            <SelectValue placeholder="Filtrar por torneo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los torneos</SelectItem>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} partidos</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 border rounded-xl text-muted-foreground text-sm">
          Sin partidos generados. Generá el fixture desde el detalle de un torneo.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participantes</TableHead>
              <TableHead className="hidden md:table-cell">Torneo / Ronda</TableHead>
              <TableHead className="hidden lg:table-cell">Cancha</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">{m.participantA?.displayName ?? "TBD"}</p>
                    <p className="text-muted-foreground text-xs">vs</p>
                    <p className="font-medium">{m.participantB?.displayName ?? "BYE"}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">
                    <p>{tournamentName(m.tournamentId)}</p>
                    <p className="text-xs text-muted-foreground">{m.roundLabel ?? `Ronda ${m.round}`}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                  {m.courtName || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                  {fmtDate(m.scheduledAt)}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {m.scoreA || m.scoreB ? `${m.scoreA} — ${m.scoreB}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", STATUS_COLORS[m.status])}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(m)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(m.id!)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar partido</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-1 text-sm text-muted-foreground py-1">
              <span className="font-medium text-foreground">{editing.participantA?.displayName ?? "TBD"}</span>
              {" vs "}
              <span className="font-medium text-foreground">{editing.participantB?.displayName ?? "BYE"}</span>
              {" · "}
              <span>{editing.roundLabel ?? `Ronda ${editing.round}`}</span>
            </div>
          )}
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cancha ID</Label>
                <Input value={form.courtId} onChange={(e) => setF("courtId", e.target.value)} placeholder="court-id" />
              </div>
              <div className="space-y-1">
                <Label>Nombre cancha</Label>
                <Input value={form.courtName} onChange={(e) => setF("courtName", e.target.value)} placeholder="Cancha 1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setF("scheduledAt", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Score A</Label>
                <Input value={form.scoreA} onChange={(e) => setF("scoreA", e.target.value)} placeholder="6-4, 7-5" />
              </div>
              <div className="space-y-1">
                <Label>Score B</Label>
                <Input value={form.scoreB} onChange={(e) => setF("scoreB", e.target.value)} placeholder="4-6, 5-7" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ganador</Label>
              <Select value={form.winnerId} onValueChange={(v) => setF("winnerId", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ganador..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin definir</SelectItem>
                  {editing?.participantA && (
                    <SelectItem value={editing.participantA.registrationId}>
                      {editing.participantA.displayName}
                    </SelectItem>
                  )}
                  {editing?.participantB && (
                    <SelectItem value={editing.participantB.registrationId}>
                      {editing.participantB.displayName}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setF("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programado</SelectItem>
                  <SelectItem value="in_progress">En curso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar resultado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
