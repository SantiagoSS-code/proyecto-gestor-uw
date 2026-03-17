"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getRegistrationsByClub, getTournaments, updateRegistrationStatus, deleteRegistration,
} from "@/lib/tournaments"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Search } from "lucide-react"
import type { TournamentRegistrationDoc, TournamentDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  approved:  "bg-emerald-100 text-emerald-700",
  paid:      "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
  waitlist:  "bg-violet-100 text-violet-700",
}
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", paid: "Pagado",
  cancelled: "Cancelado", waitlist: "Lista de espera",
}
const PAY_COLORS: Record<string, string> = {
  not_required: "bg-slate-100 text-slate-500",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-600",
}
const PAY_LABELS: Record<string, string> = {
  not_required: "No requerido", pending: "Pendiente", approved: "Aprobado", failed: "Fallido",
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

export function RegistrationsManager() {
  const { user } = useAuth()
  const [registrations, setRegistrations] = useState<TournamentRegistrationDoc[]>([])
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [filterTournament, setFilterTournament] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    Promise.all([getRegistrationsByClub(clubId), getTournaments(clubId)])
      .then(([r, t]) => { setRegistrations(r); setTournaments(t) })
      .finally(() => setLoading(false))
  }, [clubId])

  async function handleStatusChange(
    id: string,
    status: TournamentRegistrationDoc["registrationStatus"],
  ) {
    await updateRegistrationStatus(id, status)
    setRegistrations((prev) =>
      prev.map((r) => r.id === id ? { ...r, registrationStatus: status } : r),
    )
  }

  async function handleDelete(id: string) {
    await deleteRegistration(id)
    setRegistrations((prev) => prev.filter((r) => r.id !== id))
  }

  const tournamentName = (id: string) => tournaments.find((t) => t.id === id)?.name ?? "—"

  const filtered = registrations.filter((r) => {
    if (filterTournament !== "all" && r.tournamentId !== filterTournament) return false
    if (filterStatus !== "all" && r.registrationStatus !== filterStatus) return false
    if (query) {
      const q = query.toLowerCase()
      if (
        !r.userName?.toLowerCase().includes(q) &&
        !r.userEmail?.toLowerCase().includes(q) &&
        !r.teamName?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar jugador..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="h-8 text-sm w-48">
            <SelectValue placeholder="Torneo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los torneos</SelectItem>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} registros</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 border rounded-xl text-muted-foreground text-sm">
          Sin inscripciones que coincidan con los filtros.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador / Equipo</TableHead>
              <TableHead className="hidden md:table-cell">Torneo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Pago</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{r.teamName || r.userName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.userEmail ?? r.userId}</p>
                    {r.partnerName && (
                      <p className="text-xs text-muted-foreground">+ {r.partnerName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm hidden md:table-cell">
                  {tournamentName(r.tournamentId)}
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", STATUS_COLORS[r.registrationStatus])}>
                    {STATUS_LABELS[r.registrationStatus] ?? r.registrationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge className={cn("text-xs", PAY_COLORS[r.paymentStatus])}>
                    {PAY_LABELS[r.paymentStatus] ?? r.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                  {fmtDate(r.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.registrationStatus === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id!, "approved")}>
                            Aprobar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id!, "waitlist")}>
                            Mover a espera
                          </DropdownMenuItem>
                        </>
                      )}
                      {r.registrationStatus === "approved" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(r.id!, "paid")}>
                          Marcar como pagado
                        </DropdownMenuItem>
                      )}
                      {r.registrationStatus === "waitlist" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(r.id!, "approved")}>
                          Aprobar desde espera
                        </DropdownMenuItem>
                      )}
                      {r.registrationStatus !== "cancelled" && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleStatusChange(r.id!, "cancelled")}
                        >
                          Cancelar inscripción
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(r.id!)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
