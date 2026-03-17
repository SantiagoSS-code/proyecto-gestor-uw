"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getTournaments, setTournamentStatus,
  generateSingleElimination, generateRoundRobin, getRegistrations,
} from "@/lib/tournaments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Swords, Loader2 } from "lucide-react"
import type { TournamentDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", published: "Publicado",
  registration_closed: "Insc. cerradas", in_progress: "En curso",
  finished: "Finalizado", archived: "Archivado",
}
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-blue-100 text-blue-700",
  registration_closed: "bg-amber-100 text-amber-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  finished: "bg-purple-100 text-purple-700",
  archived: "bg-slate-100 text-slate-400",
}

export function TournamentsSettings() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [selected, setSelected] = useState<string>("none")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [confirmGenerate, setConfirmGenerate] = useState(false)

  const clubId = user?.uid ?? ""
  const tournament = tournaments.find((t) => t.id === selected)

  useEffect(() => {
    if (!clubId) return
    getTournaments(clubId)
      .then((ts) => {
        setTournaments(ts)
        if (ts.length > 0) setSelected(ts[0].id!)
      })
      .finally(() => setLoading(false))
  }, [clubId])

  async function handleStatusChange(status: TournamentDoc["status"]) {
    if (!tournament?.id) return
    await setTournamentStatus(tournament.id, status)
    setTournaments((prev) => prev.map((t) => t.id === tournament.id ? { ...t, status } : t))
  }

  async function handleGenerateBracket() {
    if (!tournament?.id) return
    setGenerating(true)
    setConfirmGenerate(false)
    try {
      const registrations = await getRegistrations(tournament.id)
      const approved = registrations.filter((r) => r.registrationStatus === "approved" || r.registrationStatus === "paid")
      if (tournament.format === "single_elimination") {
        await generateSingleElimination(tournament, approved)
      } else {
        await generateRoundRobin(tournament, approved)
      }
    } finally { setGenerating(false) }
  }

  if (loading)
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>

  if (tournaments.length === 0)
    return (
      <div className="flex items-center justify-center h-40 border rounded-xl text-muted-foreground text-sm">
        Sin torneos creados.
      </div>
    )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <Label>Torneo</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tournament && (
        <>
          <div className="space-y-1">
            <Label>Estado actual</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-xs px-2 py-0.5", STATUS_COLORS[tournament.status])}>
                {STATUS_LABELS[tournament.status] ?? tournament.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Cambiar estado</Label>
            <Select onValueChange={(v) => handleStatusChange(v as TournamentDoc["status"])}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} disabled={val === tournament.status}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(tournament.status === "registration_closed" || tournament.status === "in_progress") && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">Generar fixture / bracket</p>
              <p className="text-xs text-muted-foreground">
                Se crearán los partidos automáticamente usando los participantes aprobados.
                Formato: <span className="font-medium">{tournament.format}</span>.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmGenerate(true)}
                disabled={generating}
              >
                {generating
                  ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Generando...</>
                  : <><Swords className="size-3.5 mr-1.5" />Generar fixture</>
                }
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar fixture?</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán partidos para todos los participantes aprobados. Si ya existen partidos,
              se agregarán nuevos. Esta acción no se puede deshacer automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateBracket}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
