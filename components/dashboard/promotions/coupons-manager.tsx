"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from "@/lib/promotions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Copy, Pause, Play, Ticket } from "lucide-react"
import { Timestamp } from "firebase/firestore"
import type { DiscountDoc, DiscountStatus, DiscountType, AudienceType } from "@/lib/types"
import { cn } from "@/lib/utils"

const SPORT_OPTIONS = ["padel", "tennis", "futbol", "pickleball", "squash"]
const WEEKDAY_OPTIONS = [
  { label: "Dom", value: 0 }, { label: "Lun", value: 1 }, { label: "Mar", value: 2 },
  { label: "Mié", value: 3 }, { label: "Jue", value: 4 }, { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
]

const STATUS_LABELS: Record<DiscountStatus, string> = {
  draft: "Borrador", active: "Activo", paused: "Pausado", expired: "Expirado",
}
const STATUS_COLORS: Record<DiscountStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-600",
}
const TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Porcentaje", fixed: "Monto fijo", special_price: "Precio especial",
}

function StatusBadge({ status }: { status: DiscountStatus }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

const EMPTY: Omit<DiscountDoc, "id" | "createdAt" | "updatedAt" | "usageCount"> = {
  clubId: "",
  name: "",
  code: "",
  description: "",
  type: "percentage",
  value: 10,
  appliesTo: { sports: [], courtIds: [], weekdays: [], firstBookingOnly: false },
  usageLimitTotal: undefined,
  usageLimitPerUser: undefined,
  audienceType: "all",
  visibleInCheckout: true,
  startAt: null,
  endAt: undefined,
  status: "draft",
}

export function CouponsManager() {
  const { user } = useAuth()
  const [discounts, setDiscounts] = useState<DiscountDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DiscountDoc | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const clubId = user?.uid ?? ""

  const reload = () => {
    if (!clubId) return
    setLoading(true)
    getDiscounts(clubId).then(setDiscounts).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [clubId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, clubId })
    setStartDate("")
    setEndDate("")
    setOpen(true)
  }

  const openEdit = (d: DiscountDoc) => {
    setEditing(d)
    setForm({
      clubId: d.clubId,
      name: d.name,
      code: d.code,
      description: d.description ?? "",
      type: d.type,
      value: d.value,
      appliesTo: d.appliesTo ?? {},
      usageLimitTotal: d.usageLimitTotal,
      usageLimitPerUser: d.usageLimitPerUser,
      audienceType: d.audienceType,
      audienceSegmentId: d.audienceSegmentId,
      visibleInCheckout: d.visibleInCheckout,
      startAt: d.startAt,
      endAt: d.endAt,
      status: d.status,
    })
    // Convert Firestore Timestamps to date strings for inputs
    if (d.startAt) {
      const dt: Date = typeof d.startAt.toDate === "function" ? d.startAt.toDate() : new Date(d.startAt)
      setStartDate(dt.toISOString().slice(0, 10))
    } else setStartDate("")
    if (d.endAt) {
      const dt: Date = typeof d.endAt.toDate === "function" ? d.endAt.toDate() : new Date(d.endAt)
      setEndDate(dt.toISOString().slice(0, 10))
    } else setEndDate("")
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        clubId,
        startAt: startDate ? Timestamp.fromDate(new Date(startDate)) : Timestamp.now(),
        endAt: endDate ? Timestamp.fromDate(new Date(endDate)) : undefined,
      }
      if (editing?.id) {
        await updateDiscount(editing.id, payload)
      } else {
        await createDiscount(payload)
      }
      setOpen(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cupón?")) return
    await deleteDiscount(id)
    reload()
  }

  const handleDuplicate = async (d: DiscountDoc) => {
    await createDiscount({
      ...d,
      name: `${d.name} (copia)`,
      code: `${d.code}_COPY`,
      status: "draft",
      usageCount: undefined,
    } as any)
    reload()
  }

  const toggleStatus = async (d: DiscountDoc) => {
    const next: DiscountStatus = d.status === "active" ? "paused" : "active"
    await updateDiscount(d.id!, { status: next })
    reload()
  }

  const toggleWeekday = (day: number) => {
    const current = form.appliesTo?.weekdays ?? []
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, weekdays: next } }))
  }

  const toggleSport = (sport: string) => {
    const current = form.appliesTo?.sports ?? []
    const next = current.includes(sport) ? current.filter((s) => s !== sport) : [...current, sport]
    setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, sports: next } }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cupones</h2>
          <p className="text-sm text-muted-foreground">Creá y gestioná códigos de descuento.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="size-4" /> Nuevo cupón
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : discounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Ticket className="size-10 opacity-30" />
            <p className="text-sm">No hay cupones creados aún.</p>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-2">
              <Plus className="size-4" /> Crear primer cupón
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Canjes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{d.code}</code>
                  </TableCell>
                  <TableCell>
                    {d.type === "percentage"
                      ? `${d.value}%`
                      : d.type === "fixed"
                      ? `-$${d.value.toLocaleString("es-AR")}`
                      : `$${d.value.toLocaleString("es-AR")} especial`}
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {d.usageCount ?? 0}
                    {d.usageLimitTotal ? ` / ${d.usageLimitTotal}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(d)} title={d.status === "active" ? "Pausar" : "Activar"}>
                        {d.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(d)} title="Duplicar">
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id!)} title="Eliminar" className="text-red-500 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cupón" : "Nuevo cupón"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre interno *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Black Friday 20%" />
              </div>
              <div className="space-y-1">
                <Label>Código del cupón *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="BLACKFRIDAY20"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descripción interna</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Para campaña de reactivación" />
            </div>

            {/* Discount type & value */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de descuento</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DiscountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as DiscountType[]).map((k) => (
                      <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{form.type === "percentage" ? "Porcentaje (%)" : "Monto ($)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Applies to: sports */}
            <div className="space-y-1">
              <Label>Deportes aplicables (vacío = todos)</Label>
              <div className="flex flex-wrap gap-2">
                {SPORT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSport(s)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors",
                      (form.appliesTo?.sports ?? []).includes(s)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Applies to: weekdays */}
            <div className="space-y-1">
              <Label>Días de la semana (vacío = todos)</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleWeekday(value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors",
                      (form.appliesTo?.weekdays ?? []).includes(value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Hora desde (opcional)</Label>
                <Input
                  type="time"
                  value={form.appliesTo?.timeFrom ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, timeFrom: e.target.value || undefined } }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Hora hasta (opcional)</Label>
                <Input
                  type="time"
                  value={form.appliesTo?.timeTo ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, timeTo: e.target.value || undefined } }))}
                />
              </div>
            </div>

            {/* Min amount + first booking */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Monto mínimo de reserva ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.appliesTo?.minBookingAmount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, minBookingAmount: e.target.value ? Number(e.target.value) : undefined } }))}
                  placeholder="Sin mínimo"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  checked={form.appliesTo?.firstBookingOnly ?? false}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, appliesTo: { ...f.appliesTo, firstBookingOnly: v } }))}
                />
                <Label>Solo primera reserva</Label>
              </div>
            </div>

            {/* Usage limits */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Límite total de usos</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usageLimitTotal ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimitTotal: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-1">
                <Label>Usos por jugador</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usageLimitPerUser ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimitPerUser: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-1">
              <Label>Audiencia</Label>
              <Select value={form.audienceType} onValueChange={(v) => setForm((f) => ({ ...f, audienceType: v as AudienceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los jugadores</SelectItem>
                  <SelectItem value="selected">Jugadores seleccionados</SelectItem>
                  <SelectItem value="segment">Segmento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as DiscountStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as DiscountStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visible in checkout */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.visibleInCheckout}
                onCheckedChange={(v) => setForm((f) => ({ ...f, visibleInCheckout: v }))}
              />
              <Label>Visible en checkout para jugadores</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear cupón"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
