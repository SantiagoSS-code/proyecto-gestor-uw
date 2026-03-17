"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getTournaments, getMatches, getStandings } from "@/lib/tournaments"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Trophy } from "lucide-react"
import type { TournamentDoc, TournamentMatchDoc, TournamentStandingDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

function fmtScore(m: TournamentMatchDoc): string {
  if (m.scoreA || m.scoreB) return `${m.scoreA ?? "?"} — ${m.scoreB ?? "?"}`
  return "—"
}

/** Group single-elimination matches by round */
function groupByRound(matches: TournamentMatchDoc[]): Map<number, TournamentMatchDoc[]> {
  const map = new Map<number, TournamentMatchDoc[]>()
  for (const m of matches) {
    if (!map.has(m.round)) map.set(m.round, [])
    map.get(m.round)!.push(m)
  }
  return map
}

function MatchCard({ m }: { m: TournamentMatchDoc }) {
  const aWon = m.winnerId && m.winnerId === m.participantA?.registrationId
  const bWon = m.winnerId && m.winnerId === m.participantB?.registrationId
  return (
    <div className={cn(
      "border rounded-lg p-3 text-sm space-y-1.5 w-52",
      m.status === "completed" ? "bg-muted/30" : "bg-white",
    )}>
      <div className={cn("flex items-center justify-between", aWon && "font-semibold")}>
        <span className="truncate">{m.participantA?.displayName ?? "TBD"}</span>
        {aWon && <Trophy className="size-3.5 text-amber-500 shrink-0" />}
      </div>
      <div className="text-xs text-center font-mono text-muted-foreground border-y py-1">
        {fmtScore(m)}
      </div>
      <div className={cn("flex items-center justify-between", bWon && "font-semibold")}>
        <span className="truncate">{m.participantB?.displayName ?? "BYE"}</span>
        {bWon && <Trophy className="size-3.5 text-amber-500 shrink-0" />}
      </div>
    </div>
  )
}

function BracketView({ matches }: { matches: TournamentMatchDoc[] }) {
  const byRound = groupByRound(matches)
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b)
  if (rounds.length === 0)
    return <div className="text-sm text-muted-foreground">Aún no se generó el fixture.</div>

  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {rounds.map((r) => (
        <div key={r} className="flex flex-col gap-4 shrink-0">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground text-center">
            {byRound.get(r)![0].roundLabel ?? `Ronda ${r}`}
          </h4>
          <div className="flex flex-col gap-6">
            {byRound.get(r)!.map((m) => <MatchCard key={m.id} m={m} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function StandingsView({ standings }: { standings: TournamentStandingDoc[] }) {
  if (standings.length === 0)
    return <div className="text-sm text-muted-foreground">Sin posiciones todavía.</div>

  const groups = Array.from(new Set(standings.map((s) => s.groupName ?? "General")))

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const rows = standings
          .filter((s) => (s.groupName ?? "General") === g)
          .sort((a, b) => b.points - a.points)
        return (
          <div key={g}>
            {groups.length > 1 && <h4 className="font-semibold text-sm mb-2">{g}</h4>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Participante</TableHead>
                  <TableHead className="text-center">PJ</TableHead>
                  <TableHead className="text-center">G</TableHead>
                  <TableHead className="text-center">E</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">GF</TableHead>
                  <TableHead className="text-center">GC</TableHead>
                  <TableHead className="text-center font-bold">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{s.participantName}</TableCell>
                    <TableCell className="text-center text-sm">{s.played}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-600">{s.won}</TableCell>
                    <TableCell className="text-center text-sm text-amber-600">{s.drawn}</TableCell>
                    <TableCell className="text-center text-sm text-red-500">{s.lost}</TableCell>
                    <TableCell className="text-center text-sm">{s.scoreFor}</TableCell>
                    <TableCell className="text-center text-sm">{s.scoreAgainst}</TableCell>
                    <TableCell className="text-center font-bold">{s.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}

export function ResultsBrackets() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [selected, setSelected] = useState<string>("none")
  const [matches, setMatches] = useState<TournamentMatchDoc[]>([])
  const [standings, setStandings] = useState<TournamentStandingDoc[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    getTournaments(clubId)
      .then((t) => {
        const active = t.filter((x) => ["in_progress", "finished"].includes(x.status))
        setTournaments(active)
        if (active.length > 0) setSelected(active[0].id!)
      })
      .finally(() => setLoadingList(false))
  }, [clubId])

  useEffect(() => {
    if (!selected || selected === "none") return
    setLoadingDetail(true)
    Promise.all([getMatches(selected), getStandings(selected)])
      .then(([m, s]) => { setMatches(m); setStandings(s) })
      .finally(() => setLoadingDetail(false))
  }, [selected])

  const tournament = tournaments.find((t) => t.id === selected)

  if (loadingList)
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>

  if (tournaments.length === 0)
    return (
      <div className="flex items-center justify-center h-40 border rounded-xl text-muted-foreground text-sm">
        Sin torneos en progreso o finalizados.
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 text-sm w-72">
            <SelectValue placeholder="Seleccionar torneo..." />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tournament && (
          <Badge className="text-xs bg-blue-100 text-blue-700">{tournament.format}</Badge>
        )}
      </div>

      {loadingDetail ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
          Cargando resultados...
        </div>
      ) : tournament ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tournament.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.format === "single_elimination" ? (
              <BracketView matches={matches} />
            ) : (
              <StandingsView standings={standings} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
