"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getSegments, createSegment, updateSegment, deleteSegment } from "@/lib/promotions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Users2 } from "lucide-react"
import type { SegmentDoc, SegmentFilters } from "@/lib/types"

const SPORT_OPTIONS = ["padel", "tennis", "futbol", "pickleball", "squash"]

const PRESET_SEGMENTS = [
  { name: "Inactivos 30 días", filters: { inactivityDays: 30 } },
  { name: "Jugadores frecuentes", filters: { minBookings: 10 } },
  { name: "Alto valor", filters: { spendingThreshold: 20000 } },
  { name: "Primera vez", filters: { firstTimeOnly: true } },
  { name: "Jugadores de fin de semana", filters: { preferredTimeFrom: "08:00" } },
  { name: "Horas valle", filters: { preferredTimeFrom: "10:00", preferredTimeTo: "16:00" } },
]

const EMPTY_FILTERS: SegmentFilters = {
  inactivityDays: undefined,
  minBookings: undefined,
  favoriteSport: undefined,
  preferredTimeFrom: undefined,
  preferredTimeTo: undefined,
  spendingThreshold: undefined,
  firstTimeOnly: false,
}

export function AudiencesManager() {
  const { user } = useAuth()
  const [segments, setSegments] = useState<SegmentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SegmentDoc | null>(null)
  const [name, setName] = useState("")
  const [filters, setFilters] = useState<SegmentFilters>({ ...EMPTY_FILTERS })

  const clubId = user?.uid ?? ""

  const reload = () => {
    if (!clubId) return
    setLoading(true)
    getSegments(clubId).then(setSegments).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [clubId])

  const openCreate = (preset?: { name: string; filters: SegmentFilters }) => {
    setEditing(null)
    setName(preset?.name ?? "")
    setFilters(preset ? { ...EMPTY_FILTERS, ...preset.filters } : { ...EMPTY_FILTERS })
    setOpen(true)
  }

  const openEdit = (s: SegmentDoc) => {
    setEditing(s)
    setName(s.name)
    setFilters(s.filters ?? { ...EMPTY_FILTERS })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    try {
      const payload = { clubId, name, filters }
      if (editing?.id) await updateSegment(editing.id, payload)
      else await createSegment(payload)
      setOpen(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este segmento?")) return
    await deleteSegment(id)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Audiencias</h2>
          <p className="text-sm text-muted-foreground">Creá segmentos de jugadores para tus campañas.</p>
        </div>
        <Button onClick={() => openCreate()} size="sm" className="gap-2">
          <Plus className="size-4" /> Nuevo segmento
        </Button>
      </div>

      {/* Preset templates */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Plantillas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SEGMENTS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => openCreate(p)}
              className="px-3 py-1.5 rounded-full border text-xs font-medium hover:bg-primary/5 hover:border-primary/40 transition-colors"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : segments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users2 className="size-10 opacity-30" />
            <p className="text-sm">No hay segmentos creados aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {segments.map((s) => (
            <Card key={s.id} className="relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                {s.filters?.inactivityDays != null && (
                  <p>Inactividad: {s.filters.inactivityDays} días</p>
                )}
                {s.filters?.minBookings != null && (
                  <p>Mín. reservas: {s.filters.minBookings}</p>
                )}
                {s.filters?.favoriteSport && (
                  <p>Deporte: {s.filters.favoriteSport}</p>
                )}
                {s.filters?.spendingThreshold != null && (
                  <p>Gasto mín.: ${s.filters.spendingThreshold.toLocaleString("es-AR")}</p>
                )}
                {s.filters?.preferredTimeFrom && (
                  <p>Horario: {s.filters.preferredTimeFrom}{s.filters.preferredTimeTo ? ` – ${s.filters.preferredTimeTo}` : "+"}</p>
                )}
                {s.filters?.firstTimeOnly && <p>Solo primera reserva</p>}
              </CardContent>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id!)} className="text-red-500">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar segmento" : "Nuevo segmento"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inactivos 30 días" />
            </div>

            <div className="space-y-1">
              <Label>Inactividad (días sin reservar)</Label>
              <Input
                type="number" min={1}
                value={filters.inactivityDays ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, inactivityDays: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Ej: 30"
              />
            </div>

            <div className="space-y-1">
              <Label>Mínimo de reservas históricas</Label>
              <Input
                type="number" min={1}
                value={filters.minBookings ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, minBookings: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Ej: 5"
              />
            </div>

            <div className="space-y-1">
              <Label>Deporte favorito</Label>
              <Select
                value={filters.favoriteSport ?? ""}
                onValueChange={(v) => setFilters((f) => ({ ...f, favoriteSport: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Cualquiera</SelectItem>
                  {SPORT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Horario preferido desde</Label>
                <Input
                  type="time"
                  value={filters.preferredTimeFrom ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, preferredTimeFrom: e.target.value || undefined }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input
                  type="time"
                  value={filters.preferredTimeTo ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, preferredTimeTo: e.target.value || undefined }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Gasto mínimo histórico ($)</Label>
              <Input
                type="number" min={0}
                value={filters.spendingThreshold ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, spendingThreshold: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Ej: 20000"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={filters.firstTimeOnly ?? false}
                onChange={(e) => setFilters((f) => ({ ...f, firstTimeOnly: e.target.checked }))}
              />
              <span className="text-sm">Solo jugadores sin reservas previas</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !name}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear segmento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
