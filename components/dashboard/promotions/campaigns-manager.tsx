"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getCampaigns, getDiscounts, getSegments, createCampaign, updateCampaign, deleteCampaign } from "@/lib/promotions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react"
import { Timestamp } from "firebase/firestore"
import type { CampaignDoc, CampaignObjective, CampaignStatus, DiscountDoc, SegmentDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  reactivation: "Reactivación",
  loyalty: "Fidelización",
  valley_hours: "Horas valle",
  promotion: "Promoción especial",
}
const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador", active: "Activa", paused: "Pausada", ended: "Finalizada",
}
const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-slate-200 text-slate-500",
}

const EMPTY: Omit<CampaignDoc, "id" | "createdAt" | "updatedAt" | "metrics"> = {
  clubId: "",
  name: "",
  objective: "promotion",
  discountId: "",
  segmentId: undefined,
  startAt: null,
  endAt: undefined,
  status: "draft",
  messageTemplate: "",
}

export function CampaignsManager() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<CampaignDoc[]>([])
  const [discounts, setDiscounts] = useState<DiscountDoc[]>([])
  const [segments, setSegments] = useState<SegmentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CampaignDoc | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const clubId = user?.uid ?? ""

  const reload = () => {
    if (!clubId) return
    setLoading(true)
    Promise.all([getCampaigns(clubId), getDiscounts(clubId), getSegments(clubId)])
      .then(([c, d, s]) => { setCampaigns(c); setDiscounts(d); setSegments(s) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [clubId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, clubId })
    setStartDate("")
    setEndDate("")
    setOpen(true)
  }

  const openEdit = (c: CampaignDoc) => {
    setEditing(c)
    setForm({
      clubId: c.clubId,
      name: c.name,
      objective: c.objective,
      discountId: c.discountId,
      segmentId: c.segmentId,
      startAt: c.startAt,
      endAt: c.endAt,
      status: c.status,
      messageTemplate: c.messageTemplate ?? "",
    })
    if (c.startAt) {
      const dt: Date = typeof c.startAt.toDate === "function" ? c.startAt.toDate() : new Date(c.startAt)
      setStartDate(dt.toISOString().slice(0, 10))
    } else setStartDate("")
    if (c.endAt) {
      const dt: Date = typeof c.endAt.toDate === "function" ? c.endAt.toDate() : new Date(c.endAt)
      setEndDate(dt.toISOString().slice(0, 10))
    } else setEndDate("")
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.discountId) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        clubId,
        startAt: startDate ? Timestamp.fromDate(new Date(startDate)) : Timestamp.now(),
        endAt: endDate ? Timestamp.fromDate(new Date(endDate)) : undefined,
      }
      if (editing?.id) await updateCampaign(editing.id, payload)
      else await createCampaign(payload)
      setOpen(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta campaña?")) return
    await deleteCampaign(id)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campañas</h2>
          <p className="text-sm text-muted-foreground">Enviá promociones a grupos de jugadores.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="size-4" /> Nueva campaña
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Megaphone className="size-10 opacity-30" />
            <p className="text-sm">No hay campañas creadas aún.</p>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-2">
              <Plus className="size-4" /> Crear primera campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Cupón vinculado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Canjes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const disc = discounts.find((d) => d.id === c.discountId)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{OBJECTIVE_LABELS[c.objective]}</TableCell>
                    <TableCell>
                      {disc ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{disc.code}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.metrics?.couponsClaimed ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id!)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Campaña reactivación marzo" />
            </div>

            <div className="space-y-1">
              <Label>Objetivo</Label>
              <Select value={form.objective} onValueChange={(v) => setForm((f) => ({ ...f, objective: v as CampaignObjective }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(OBJECTIVE_LABELS) as CampaignObjective[]).map((k) => (
                    <SelectItem key={k} value={k}>{OBJECTIVE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Cupón vinculado *</Label>
              <Select value={form.discountId} onValueChange={(v) => setForm((f) => ({ ...f, discountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cupón..." /></SelectTrigger>
                <SelectContent>
                  {discounts.map((d) => (
                    <SelectItem key={d.id} value={d.id!}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {segments.length > 0 && (
              <div className="space-y-1">
                <Label>Segmento (opcional)</Label>
                <Select
                  value={form.segmentId ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, segmentId: v || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sin segmento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin segmento</SelectItem>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Mensaje (opcional)</Label>
              <Input
                value={form.messageTemplate}
                onChange={(e) => setForm((f) => ({ ...f, messageTemplate: e.target.value }))}
                placeholder="¡Volvé a jugar con 20% off!"
              />
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as CampaignStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.discountId}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear campaña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
