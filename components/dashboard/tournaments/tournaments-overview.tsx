"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getTournaments, getRegistrationsByClub, getMatchesByClub,
} from "@/lib/tournaments"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy, Users, DollarSign, ClipboardList, Swords, CalendarClock, AlertCircle, ArrowRight,
} from "lucide-react"
import type { TournamentDoc, TournamentRegistrationDoc, TournamentMatchDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  draft:                "bg-slate-100 text-slate-500",
  published:            "bg-emerald-100 text-emerald-700",
  registration_closed:  "bg-amber-100 text-amber-700",
  in_progress:          "bg-blue-100 text-blue-700",
  finished:             "bg-violet-100 text-violet-700",
  archived:             "bg-rose-100 text-rose-500",
}
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", published: "Publicado", registration_closed: "Inscripción cerrada",
  in_progress: "En curso", finished: "Finalizado", archived: "Archivado",
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

export function TournamentsOverview() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [registrations, setRegistrations] = useState<TournamentRegistrationDoc[]>([])
  const [matches, setMatches] = useState<TournamentMatchDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const clubId = user.uid
    Promise.all([
      getTournaments(clubId),
      getRegistrationsByClub(clubId),
      getMatchesByClub(clubId),
    ])
      .then(([t, r, m]) => { setTournaments(t); setRegistrations(r); setMatches(m) })
      .finally(() => setLoading(false))
  }, [user?.uid])

  const active = tournaments.filter((t) =>
    ["published", "registration_closed", "in_progress"].includes(t.status),
  )
  const openReg = tournaments.filter((t) => t.status === "published")
  const totalRegs = registrations.length
  const paidRegs = registrations.filter((r) => r.registrationStatus === "paid").length

  const now = new Date()
  const upcomingMatches = matches.filter((m) => {
    if (m.status !== "scheduled") return false
    if (!m.scheduledAt) return false
    const d = typeof m.scheduledAt.toDate === "function" ? m.scheduledAt.toDate() : new Date(m.scheduledAt)
    return d >= now
  })

  const revenue = registrations
    .filter((r) => r.registrationStatus === "paid" || r.paymentStatus === "approved")
    .reduce((sum, r) => {
      const t = tournaments.find((t) => t.id === r.tournamentId)
      return sum + (t?.entryFee ?? 0)
    }, 0)

  // Tournaments starting soon (next 14 days)
  const in14 = new Date(now.getTime() + 14 * 86400_000)
  const startingSoon = tournaments.filter((t) => {
    if (!t.tournamentStartAt) return false
    const d = typeof t.tournamentStartAt.toDate === "function" ? t.tournamentStartAt.toDate() : new Date(t.tournamentStartAt)
    return d >= now && d <= in14
  })

  // Need setup: draft with no dates
  const needSetup = tournaments.filter(
    (t) => t.status === "draft" || !t.tournamentStartAt,
  )

  // Latest completed matches
  const latestResults = matches
    .filter((m) => m.status === "completed")
    .slice(0, 5)

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Torneos activos"       value={String(active.length)}      icon={Trophy} />
        <KpiCard title="Con inscripción abierta" value={String(openReg.length)}   icon={ClipboardList} />
        <KpiCard title="Total inscripciones"   value={String(totalRegs)}           icon={Users} />
        <KpiCard title="Inscripciones pagas"   value={String(paidRegs)}            icon={DollarSign} />
        <KpiCard title="Partidos programados"  value={String(upcomingMatches.length)} icon={Swords} />
        <KpiCard title="Revenue"               value={revenue > 0 ? fmtARS(revenue) : "—"} icon={DollarSign} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Upcoming start dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Próximos torneos (14 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {startingSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin torneos próximos.</p>
            ) : (
              <ul className="space-y-2">
                {startingSoon.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <Link href={`/clubos/dashboard/tournaments/${t.id}`} className="font-medium hover:underline truncate max-w-[160px]">
                      {t.name}
                    </Link>
                    <span className="text-muted-foreground shrink-0 ml-2">{fmtDate(t.tournamentStartAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Need setup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" /> Necesitan configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needSetup.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo configurado ✓</p>
            ) : (
              <ul className="space-y-2">
                {needSetup.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <Link href={`/clubos/dashboard/tournaments/${t.id}`} className="font-medium hover:underline truncate max-w-[160px]">
                      {t.name}
                    </Link>
                    <Badge className={cn("text-xs ml-2 shrink-0", STATUS_COLORS[t.status])}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Latest results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Swords className="size-4 text-primary" /> Últimos resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados cargados.</p>
            ) : (
              <ul className="space-y-2">
                {latestResults.map((m) => (
                  <li key={m.id} className="text-sm">
                    <span className="font-medium">{m.participantA?.displayName ?? "—"}</span>
                    <span className="mx-1 text-muted-foreground">{m.scoreA}</span>
                    <span className="text-muted-foreground mx-1">vs</span>
                    <span className="mx-1 text-muted-foreground">{m.scoreB}</span>
                    <span className="font-medium">{m.participantB?.displayName ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent tournaments */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="size-4 text-primary" /> Torneos recientes
          </CardTitle>
          <Link href="/clubos/dashboard/tournaments/list" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Ver todos <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin torneos creados aún.</p>
          ) : (
            <ul className="divide-y">
              {tournaments.slice(0, 6).map((t) => {
                const regCount = registrations.filter((r) => r.tournamentId === t.id).length
                return (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <Link href={`/clubos/dashboard/tournaments/${t.id}`} className="text-sm font-medium hover:underline truncate block">
                        {t.name}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">{t.sport} · {t.format?.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground">{regCount} insc.</span>
                      <Badge className={cn("text-xs", STATUS_COLORS[t.status])}>{STATUS_LABELS[t.status] ?? t.status}</Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
