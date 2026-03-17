"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getTournamentById, getRegistrations, getMatches, getStandings,
  updateRegistrationStatus, updateMatch, generateSingleElimination,
  generateRoundRobin, setTournamentStatus,
} from "@/lib/tournaments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  MoreHorizontal, ChevronDown, Swords, Loader2, Trophy, ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import type {
  TournamentDoc, TournamentRegistrationDoc, TournamentMatchDoc, TournamentStandingDoc,
} from "@/lib/types"
import { cn } from "@/lib/utils"

/* ── Colours ──────────────────────────────────────────────────── */
const REG_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700",
  paid: "bg-blue-100 text-blue-700", cancelled: "bg-slate-100 text-slate-500",
  waitlist: "bg-purple-100 text-purple-700",
}
const MATCH_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
}
const TOURNAMENT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", published: "bg-blue-100 text-blue-700",
  registration_closed: "bg-amber-100 text-amber-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  finished: "bg-purple-100 text-purple-700", archived: "bg-slate-100 text-slate-400",
}
const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", published: "Publicado",
  registration_closed: "Insc. cerradas", in_progress: "En curso",
  finished: "Finalizado", archived: "Archivado",
}

type Tab = "registrations" | "fixture" | "matches"

type MatchEditState = {
  match: TournamentMatchDoc
  scoreA: string; scoreB: string; winnerId: string; status: TournamentMatchDoc["status"]
}

export function TournamentDetail({ tournamentId }: { tournamentId: string }) {
  const { user } = useAuth()
  const [tournament, setTournament] = useState<TournamentDoc | null>(null)
  const [registrations, setRegistrations] = useState<TournamentRegistrationDoc[]>([])
  const [matches, setMatches] = useState<TournamentMatchDoc[]>([])
  const [standings, setStandings] = useState<TournamentStandingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("registrations")
  const [generating, setGenerating] = useState(false)
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const [matchEdit, setMatchEdit] = useState<MatchEditState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      getTournamentById(tournamentId),
      getRegistrations(tournamentId),
      getMatches(tournamentId),
      getStandings(tournamentId),
    ]).then(([t, r, m, s]) => {
      setTournament(t)
      setRegistrations(r)
      setMatches(m)
      setStandings(s)
    }).finally(() => setLoading(false))
  }, [tournamentId])

  /* ── Registrations ─────────────────────────────────────────── */
  async function handleRegStatus(id: string, status: TournamentRegistrationDoc["registrationStatus"]) {
    await updateRegistrationStatus(id, status)
    setRegistrations((prev) => prev.map((r) => r.id === id ? { ...r, registrationStatus: status } : r))
  }

  /* ── Fixture generation ─────────────────────────────────────── */
  async function handleGenerateBracket() {
    if (!tournament) return
    setGenerating(true)
    setConfirmGenerate(false)
    try {
      const approved = registrations.filter(
        (r) => r.registrationStatus === "approved" || r.registrationStatus === "paid",
      )
      if (tournament.format === "single_elimination") {
        await generateSingleElimination(tournament, approved)
      } else {
        await generateRoundRobin(tournament, approved)
      }
      const fresh = await getMatches(tournamentId)
      setMatches(fresh)
      setTab("fixture")
    } finally { setGenerating(false) }
  }

  /* ── Match edit ─────────────────────────────────────────────── */
  function openMatchEdit(m: TournamentMatchDoc) {
    setMatchEdit({ match: m, scoreA: m.scoreA ?? "", scoreB: m.scoreB ?? "", winnerId: m.winnerId ?? "", status: m.status })
  }

  async function saveMatchEdit() {
    if (!matchEdit?.match.id) return
    setSaving(true)
    try {
      const upd: Partial<TournamentMatchDoc> = {
        scoreA: matchEdit.scoreA, scoreB: matchEdit.scoreB,
        winnerId: matchEdit.winnerId || undefined, status: matchEdit.status,
      }
      await updateMatch(matchEdit.match.id, upd)
      setMatches((prev) => prev.map((m) => m.id === matchEdit.match.id ? { ...m, ...upd } : m))
      setMatchEdit(null)
    } finally { setSaving(false) }
  }

  /* ── Status change ───────────────────────────────────────────── */
  async function handleStatusChange(status: TournamentDoc["status"]) {
    if (!tournament?.id) return
    await setTournamentStatus(tournament.id, status)
    setTournament((t) => t ? { ...t, status } : t)
  }

  if (loading)
    return <div className="flex h-60 items-center justify-center text-muted-foreground text-sm">Cargando...</div>

  if (!tournament)
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>Torneo no encontrado.</p>
        <Link href="/clubos/dashboard/tournaments/list">
          <Button variant="outline" size="sm"><ArrowLeft className="size-3.5 mr-1" />Volver</Button>
        </Link>
      </div>
    )

  const sortedRounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/clubos/dashboard/tournaments/list">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="size-3.5 mr-1" />Torneos
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold truncate">{tournament.name}</h2>
            <Badge className={cn("text-xs", TOURNAMENT_STATUS_COLORS[tournament.status])}>
              {TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tournament.sport} · {tournament.format} · {registrations.length} inscriptos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Estado <ChevronDown className="size-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(TOURNAMENT_STATUS_LABELS).map(([val, label]) => (
                <DropdownMenuItem
                  key={val}
                  disabled={val === tournament.status}
                  onClick={() => handleStatusChange(val as TournamentDoc["status"])}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmGenerate(true)}
            disabled={generating}
          >
            {generating
              ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Generando...</>
              : <><Swords className="size-3.5 mr-1.5" />Fixture</>}
          </Button>
        </div>
      </div>

      {/* Internal tabs */}
      <div className="flex gap-1 border-b">
        {(["registrations", "fixture", "matches"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "registrations" && `Inscripciones (${registrations.length})`}
            {t === "fixture" && `Fixture (${matches.length})`}
            {t === "matches" && "Resultados"}
          </button>
        ))}
      </div>

      {/* ── Registrations tab ─────────────────────────────────── */}
      {tab === "registrations" && (
        registrations.length === 0
          ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-xl">Sin inscripciones.</div>
          : <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participante</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.userName ?? r.userId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.userEmail ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", REG_STATUS_COLORS[r.registrationStatus])}>
                      {r.registrationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRegStatus(r.id!, "approved")}>Aprobar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegStatus(r.id!, "paid")}>Marcar pagado</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegStatus(r.id!, "waitlist")}>Pasar a lista espera</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => handleRegStatus(r.id!, "cancelled")}>Cancelar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}

      {/* ── Fixture tab ─────────────────────────────────────────── */}
      {tab === "fixture" && (
        matches.length === 0
          ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-xl">
            Aún sin fixture. Usá el botón "Fixture" para generar.
          </div>
          : <div className="overflow-x-auto">
            {tournament.format === "single_elimination" ? (
              <div className="flex gap-8 pb-4">
                {sortedRounds.map((r) => {
                  const rMatches = matches.filter((m) => m.round === r)
                  return (
                    <div key={r} className="flex flex-col gap-4 shrink-0">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase text-center">
                        {rMatches[0]?.roundLabel ?? `Ronda ${r}`}
                      </h4>
                      <div className="flex flex-col gap-4">
                        {rMatches.map((m) => (
                          <div key={m.id} className="border rounded-lg p-3 text-sm w-52 space-y-1.5">
                            <p className={cn("truncate", m.winnerId === m.participantA?.registrationId && "font-bold")}>
                              {m.participantA?.displayName ?? "TBD"}
                            </p>
                            <p className="font-mono text-xs text-center text-muted-foreground border-y py-1">
                              {m.scoreA || m.scoreB ? `${m.scoreA} — ${m.scoreB}` : "vs"}
                            </p>
                            <p className={cn("truncate", m.winnerId === m.participantB?.registrationId && "font-bold")}>
                              {m.participantB?.displayName ?? "BYE"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ronda</TableHead>
                    <TableHead>Partido</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">{m.roundLabel ?? `R${m.round}`}</TableCell>
                      <TableCell className="text-sm">
                        {m.participantA?.displayName ?? "TBD"} vs {m.participantB?.displayName ?? "BYE"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {m.scoreA || m.scoreB ? `${m.scoreA} — ${m.scoreB}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", MATCH_STATUS_COLORS[m.status])}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
      )}

      {/* ── Matches / results tab ─────────────────────────────── */}
      {tab === "matches" && (
        matches.length === 0
          ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-xl">
            Sin partidos generados.
          </div>
          : <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partido</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">
                    <span className={cn(m.winnerId === m.participantA?.registrationId && "font-bold")}>
                      {m.participantA?.displayName ?? "TBD"}
                    </span>
                    {" vs "}
                    <span className={cn(m.winnerId === m.participantB?.registrationId && "font-bold")}>
                      {m.participantB?.displayName ?? "BYE"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {m.scoreA || m.scoreB ? `${m.scoreA} — ${m.scoreB}` : "—"}
                    {m.winnerId && (
                      <Trophy className="inline size-3 ml-1 text-amber-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", MATCH_STATUS_COLORS[m.status])}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openMatchEdit(m)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}

      {/* ── Confirm generate fixture ─────────────────────────── */}
      <AlertDialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar fixture?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generarán partidos para todos los participantes aprobados / pagados (
              {registrations.filter((r) => ["approved", "paid"].includes(r.registrationStatus)).length} jugadores).
              Formato: {tournament.format}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateBracket}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Match edit dialog ────────────────────────────────── */}
      <Dialog open={!!matchEdit} onOpenChange={(o) => !o && setMatchEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ingresar resultado</DialogTitle>
          </DialogHeader>
          {matchEdit && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{matchEdit.match.participantA?.displayName ?? "A"}</Label>
                  <Input
                    value={matchEdit.scoreA}
                    onChange={(e) => setMatchEdit((s) => s ? { ...s, scoreA: e.target.value } : s)}
                    placeholder="6-4, 7-5"
                  />
                </div>
                <div className="space-y-1">
                  <Label>{matchEdit.match.participantB?.displayName ?? "B"}</Label>
                  <Input
                    value={matchEdit.scoreB}
                    onChange={(e) => setMatchEdit((s) => s ? { ...s, scoreB: e.target.value } : s)}
                    placeholder="4-6, 5-7"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Ganador</Label>
                <Select
                  value={matchEdit.winnerId}
                  onValueChange={(v) => setMatchEdit((s) => s ? { ...s, winnerId: v } : s)}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin definir</SelectItem>
                    {matchEdit.match.participantA && (
                      <SelectItem value={matchEdit.match.participantA.registrationId}>
                        {matchEdit.match.participantA.displayName}
                      </SelectItem>
                    )}
                    {matchEdit.match.participantB && (
                      <SelectItem value={matchEdit.match.participantB.registrationId}>
                        {matchEdit.match.participantB.displayName}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select
                  value={matchEdit.status}
                  onValueChange={(v) => setMatchEdit((s) => s ? { ...s, status: v as any } : s)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="in_progress">En curso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchEdit(null)}>Cancelar</Button>
            <Button onClick={saveMatchEdit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
