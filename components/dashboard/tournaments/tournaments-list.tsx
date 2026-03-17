"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getTournaments, createTournament, updateTournament, setTournamentStatus, deleteTournament,
} from "@/lib/tournaments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreHorizontal, ExternalLink } from "lucide-react"
import type { TournamentDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  draft:               "bg-slate-100 text-slate-500",
  published:           "bg-emerald-100 text-emerald-700",
  registration_closed: "bg-amber-100 text-amber-700",
  in_progress:         "bg-blue-100 text-blue-700",
  finished:            "bg-violet-100 text-violet-700",
  archived:            "bg-rose-100 text-rose-500",
}
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", published: "Publicado", registration_closed: "Inscripción cerrada",
  in_progress: "En curso", finished: "Finalizado", archived: "Archivado",
}

type EmptyForm = {
  name: string; slug: string; sport: string; category: string; description: string
  format: TournamentDoc["format"]; participationType: TournamentDoc["participationType"]
  maxParticipants: string; minParticipants: string; entryFee: string; isFree: boolean
  registrationDeadline: string; tournamentStartAt: string; tournamentEndAt: string
  rulesText: string; scoringSystem: string; status: TournamentDoc["status"]
  visibility: "public" | "private"; approvalRequired: boolean; waitlistEnabled: boolean
  selfRegister: boolean
}

const EMPTY: EmptyForm = {
  name: "", slug: "", sport: "", category: "", description: "",
  format: "single_elimination", participationType: "individual",
  maxParticipants: "", minParticipants: "", entryFee: "", isFree: true,
  registrationDeadline: "", tournamentStartAt: "", tournamentEndAt: "",
  rulesText: "", scoringSystem: "", status: "draft",
  visibility: "public", approvalRequired: false, waitlistEnabled: false, selfRegister: true,
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

export function TournamentsList() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TournamentDoc | null>(null)
  const [form, setForm] = useState<EmptyForm>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    getTournaments(clubId).then(setTournaments).finally(() => setLoading(false))
  }, [clubId])

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY }); setOpen(true)
  }

  function openEdit(t: TournamentDoc) {
    setEditing(t)
    setForm({
      name: t.name, slug: t.slug, sport: t.sport, category: t.category ?? "",
      description: t.description ?? "", format: t.format,
      participationType: t.participationType,
      maxParticipants: t.maxParticipants?.toString() ?? "",
      minParticipants: t.minParticipants?.toString() ?? "",
      entryFee: t.entryFee?.toString() ?? "", isFree: t.isFree,
      registrationDeadline: "", tournamentStartAt: "", tournamentEndAt: "",
      rulesText: t.rulesText ?? "", scoringSystem: t.scoringSystem ?? "",
      status: t.status, visibility: t.visibility, approvalRequired: t.approvalRequired,
      waitlistEnabled: t.waitlistEnabled, selfRegister: t.selfRegister,
    })
    setOpen(true)
  }

  function setF<K extends keyof EmptyForm>(k: K, v: EmptyForm[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSave() {
    if (!clubId || !form.name || !form.sport) return
    setSaving(true)
    try {
      const payload = {
        clubId,
        name: form.name,
        slug: form.slug || slugify(form.name),
        sport: form.sport,
        category: form.category,
        description: form.description,
        format: form.format,
        participationType: form.participationType,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        minParticipants: form.minParticipants ? Number(form.minParticipants) : undefined,
        entryFee: !form.isFree && form.entryFee ? Number(form.entryFee) : 0,
        currency: "ARS",
        isFree: form.isFree,
        tournamentStartAt: form.tournamentStartAt ? new Date(form.tournamentStartAt) : null,
        tournamentEndAt: form.tournamentEndAt ? new Date(form.tournamentEndAt) : null,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline) : null,
        rulesText: form.rulesText,
        scoringSystem: form.scoringSystem,
        status: form.status,
        visibility: form.visibility,
        approvalRequired: form.approvalRequired,
        waitlistEnabled: form.waitlistEnabled,
        selfRegister: form.selfRegister,
      }
      if (editing?.id) {
        await updateTournament(editing.id, payload)
        setTournaments((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...payload } : t))
      } else {
        const id = await createTournament(payload)
        setTournaments((prev) => [{ ...payload, id }, ...prev])
      }
      setOpen(false)
    } finally { setSaving(false) }
  }

  async function handleStatusChange(id: string, status: TournamentDoc["status"]) {
    await setTournamentStatus(id, status)
    setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
  }

  async function handleDelete(id: string) {
    await deleteTournament(id)
    setTournaments((prev) => prev.filter((t) => t.id !== id))
    setConfirmDelete(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tournaments.length} torneos</p>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="size-4" /> Nuevo torneo
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border rounded-xl text-muted-foreground gap-3">
          <p className="text-sm">Aún no hay torneos creados.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Crear primer torneo</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Deporte</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Formato</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/clubos/dashboard/tournaments/${t.id}`} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">{t.participationType}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize hidden md:table-cell">{t.sport}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize hidden lg:table-cell">
                    {t.format.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{fmtDate(t.tournamentStartAt)}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs", STATUS_COLORS[t.status])}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/clubos/dashboard/tournaments/${t.id}`} className="flex items-center gap-2">
                            <ExternalLink className="size-3.5" /> Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(t)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {t.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(t.id!, "published")}>
                            Publicar
                          </DropdownMenuItem>
                        )}
                        {t.status === "published" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(t.id!, "registration_closed")}>
                            Cerrar inscripción
                          </DropdownMenuItem>
                        )}
                        {t.status === "registration_closed" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(t.id!, "in_progress")}>
                            Iniciar torneo
                          </DropdownMenuItem>
                        )}
                        {t.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(t.id!, "finished")}>
                            Finalizar torneo
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id!, "archived")}>
                          Archivar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDelete(t.id!)}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar torneo" : "Nuevo torneo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => { setF("name", e.target.value); if (!editing) setF("slug", slugify(e.target.value)) }} placeholder="Copa Padel Primavera" />
              </div>
              <div className="space-y-1">
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setF("slug", e.target.value)} placeholder="copa-padel-primavera" />
              </div>
              <div className="space-y-1">
                <Label>Deporte *</Label>
                <Select value={form.sport} onValueChange={(v) => setF("sport", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {["padel", "tennis", "futbol", "pickleball", "squash"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Input value={form.category} onChange={(e) => setF("category", e.target.value)} placeholder="Amateur, 4ta, etc." />
              </div>
              <div className="space-y-1">
                <Label>Formato</Label>
                <Select value={form.format} onValueChange={(v) => setF("format", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Eliminación directa</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="groups_playoff">Grupos + Playoff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de participación</Label>
                <Select value={form.participationType} onValueChange={(v) => setF("participationType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="doubles">Dobles</SelectItem>
                    <SelectItem value="teams">Equipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Máx. participantes</Label>
                <Input type="number" min={2} value={form.maxParticipants} onChange={(e) => setF("maxParticipants", e.target.value)} placeholder="16" />
              </div>
              <div className="space-y-1">
                <Label>Mín. participantes</Label>
                <Input type="number" min={2} value={form.minParticipants} onChange={(e) => setF("minParticipants", e.target.value)} placeholder="4" />
              </div>
              <div className="space-y-1">
                <Label>Cierre de inscripción</Label>
                <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => setF("registrationDeadline", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Inicio del torneo</Label>
                <Input type="datetime-local" value={form.tournamentStartAt} onChange={(e) => setF("tournamentStartAt", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fin del torneo (opcional)</Label>
                <Input type="datetime-local" value={form.tournamentEndAt} onChange={(e) => setF("tournamentEndAt", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setF("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="registration_closed">Inscripción cerrada</SelectItem>
                    <SelectItem value="in_progress">En curso</SelectItem>
                    <SelectItem value="finished">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Pricing */}
              <div className="space-y-1">
                <Label>¿Es gratuito?</Label>
                <Select value={form.isFree ? "yes" : "no"} onValueChange={(v) => setF("isFree", v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Gratuito</SelectItem>
                    <SelectItem value="no">Con arancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!form.isFree && (
                <div className="space-y-1">
                  <Label>Arancel (ARS)</Label>
                  <Input type="number" min={0} value={form.entryFee} onChange={(e) => setF("entryFee", e.target.value)} placeholder="5000" />
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Descripción del torneo..." />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Reglamento</Label>
                <Input value={form.rulesText} onChange={(e) => setF("rulesText", e.target.value)} placeholder="Reglas y formato de juego..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.sport}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear torneo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar torneo?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción eliminará el torneo y no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
