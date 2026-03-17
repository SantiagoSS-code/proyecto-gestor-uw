"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  getTournamentBySlug, getPublicTournaments, getRegistrations,
  getMyRegistrationForTournament, registerForTournament, spotsRemaining,
  isRegistrationOpen,
} from "@/lib/tournaments"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Trophy, Calendar, Users, ChevronRight, CheckCircle2, Clock, Lock,
} from "lucide-react"
import Link from "next/link"
import type { TournamentDoc, TournamentRegistrationDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-blue-100 text-blue-700",
  registration_closed: "bg-amber-100 text-amber-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  finished: "bg-purple-100 text-purple-700",
  archived: "bg-slate-100 text-slate-400",
}
const STATUS_LABELS: Record<string, string> = {
  draft: "Próximamente", published: "Inscripciones abiertas",
  registration_closed: "Inscripciones cerradas", in_progress: "En curso",
  finished: "Finalizado", archived: "Archivado",
}

function fmtDate(val: any, opts?: Intl.DateTimeFormatOptions): string {
  if (!val) return "—"
  try {
    const d = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", opts ?? { day: "2-digit", month: "long", year: "numeric" })
  } catch { return "—" }
}

async function findClubIdBySlug(slug: string): Promise<string | null> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.centers), where("slug", "==", slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].id
}

interface Props {
  clubSlug: string
  tournamentSlug: string
}

export function TournamentPublicPage({ clubSlug, tournamentSlug }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<TournamentDoc | null>(null)
  const [myReg, setMyReg] = useState<TournamentRegistrationDoc | null>(null)
  const [totalReg, setTotalReg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [partnerName, setPartnerName] = useState("")
  const [teamName, setTeamName] = useState("")
  const [notes, setNotes] = useState("")
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    findClubIdBySlug(clubSlug).then(async (cid) => {
      if (!cid) { setLoading(false); return }
      setClubId(cid)
      const t = await getTournamentBySlug(cid, tournamentSlug)
      if (!t) { setLoading(false); return }
      setTournament(t)
      const regs = await getRegistrations(t.id!)
      setTotalReg(regs.length)
      if (user?.uid && t.id) {
        const mine = await getMyRegistrationForTournament(t.id, user.uid)
        setMyReg(mine)
      }
    }).finally(() => setLoading(false))
  }, [clubSlug, tournamentSlug, user?.uid])

  async function handleRegister() {
    if (!tournament?.id || !user?.uid || !clubId) return
    setRegistering(true)
    setError(null)
    try {
      await registerForTournament({
        tournamentId: tournament.id,
        clubId,
        userId: user.uid,
        userName: user.displayName ?? user.email ?? "Jugador",
        userEmail: user.email ?? undefined,
        partnerName: partnerName || undefined,
        teamName: teamName || undefined,
        notes: notes || undefined,
      })
      const mine = await getMyRegistrationForTournament(tournament.id, user.uid)
      setMyReg(mine)
      setRegistered(true)
      setDialogOpen(false)
    } catch (e: any) {
      setError(e.message ?? "Error al inscribirte. Intentá de nuevo.")
    } finally { setRegistering(false) }
  }

  if (loading)
    return <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">Cargando...</div>

  if (!tournament)
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Trophy className="size-10 opacity-20" />
        <p>Torneo no encontrado.</p>
        <Link href={`/centros/${clubSlug}`}>
          <Button variant="outline" size="sm">Volver al club</Button>
        </Link>
      </div>
    )

  const canRegister = isRegistrationOpen(tournament)
  const spots = spotsRemaining(tournament, Array(totalReg).fill(null))
  const isFull = tournament.maxParticipants !== undefined && spots !== null && spots <= 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/centros/${clubSlug}`} className="hover:text-foreground transition-colors">{clubSlug}</Link>
          <ChevronRight className="size-3.5" />
          <span>Torneos</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground mt-1">
              {tournament.sport}
              {tournament.category ? ` · ${tournament.category}` : ""}
              {" · "}
              {tournament.participationType}
            </p>
          </div>
          <Badge className={cn("text-sm px-3 py-1", STATUS_COLORS[tournament.status])}>
            {STATUS_LABELS[tournament.status] ?? tournament.status}
          </Badge>
        </div>
      </div>

      {/* Banner placeholder */}
      {tournament.bannerImageUrl && (
        <img
          src={tournament.bannerImageUrl}
          alt={tournament.name}
          className="w-full h-56 object-cover rounded-xl"
        />
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tournament.tournamentStartAt && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="text-sm font-medium">{fmtDate(tournament.tournamentStartAt)}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {tournament.registrationDeadline && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="size-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Cierre insc.</p>
                <p className="text-sm font-medium">{fmtDate(tournament.registrationDeadline)}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Inscriptos</p>
              <p className="text-sm font-medium">
                {totalReg}
                {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {tournament.description && (
        <div className="prose prose-sm max-w-none">
          <h3 className="text-lg font-semibold">Sobre el torneo</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
        </div>
      )}

      {/* Rules */}
      {tournament.rulesText && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Reglamento</h3>
          <div className="border rounded-xl p-4 bg-muted/30 text-sm text-muted-foreground whitespace-pre-wrap">
            {tournament.rulesText}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="border rounded-xl p-5 bg-card space-y-3">
        {myReg ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="font-medium">¡Estás inscripto!</p>
              <p className="text-sm text-muted-foreground">
                Estado: <span className="font-medium">{myReg.registrationStatus}</span>
              </p>
            </div>
          </div>
        ) : canRegister && !isFull ? (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold">Anotate al torneo</p>
                <p className="text-sm text-muted-foreground">
                  {tournament.isFree ? "Inscripción gratuita" : `Arancel: $${tournament.entryFee} ${tournament.currency ?? "ARS"}`}
                  {spots !== null && ` · ${spots} lugares disponibles`}
                </p>
              </div>
              {user ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Trophy className="size-4 mr-2" />Inscribirme
                </Button>
              ) : (
                <Button onClick={() => router.push(`/auth/login?redirect=/centros/${clubSlug}/torneos/${tournamentSlug}`)}>
                  <Lock className="size-4 mr-2" />Ingresar para inscribirse
                </Button>
              )}
            </div>
          </>
        ) : isFull ? (
          <p className="text-sm text-muted-foreground font-medium">Cupos completos</p>
        ) : (
          <p className="text-sm text-muted-foreground font-medium">Inscripciones cerradas</p>
        )}
      </div>

      {/* Registration dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Inscripción — {tournament.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-500">{error}</p>}
            {tournament.participationType === "doubles" && (
              <div className="space-y-1">
                <Label>Nombre del compañero/a</Label>
                <Input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Nombre del compañero/a"
                />
              </div>
            )}
            {tournament.participationType === "teams" && (
              <div className="space-y-1">
                <Label>Nombre del equipo</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Nombre del equipo"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Notas adicionales (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="¿Tenés algo que aclarar?"
              />
            </div>
            {tournament.approvalRequired && (
              <p className="text-xs text-muted-foreground">
                Tu inscripción quedará <strong>pendiente de aprobación</strong> por el club.
              </p>
            )}
            {!tournament.isFree && (
              <p className="text-xs text-muted-foreground">
                Arancel: <strong>${tournament.entryFee} {tournament.currency ?? "ARS"}</strong> — El pago se coordina con el club.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegister} disabled={registering}>
              {registering ? "Inscribiendo..." : "Confirmar inscripción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {registered && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          ¡Inscripción exitosa!
        </div>
      )}
    </div>
  )
}
