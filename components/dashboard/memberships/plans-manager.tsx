"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getPlans, createPlan, updatePlan, deletePlan,
} from "@/lib/memberships"
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Copy } from "lucide-react"
import type { MembershipPlanDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  draft:    "bg-slate-100 text-slate-500",
  paused:   "bg-amber-100 text-amber-700",
  archived: "bg-rose-100 text-rose-500",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Activo", draft: "Borrador", paused: "Pausado", archived: "Archivado",
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensual", quarterly: "Trimestral", yearly: "Anual",
}

const EMPTY_PLAN: Omit<MembershipPlanDoc, "id" | "clubId" | "createdAt" | "updatedAt"> = {
  name: "", description: "", billingCycle: "monthly", price: 0,
  trialDays: 0, signupFee: 0, status: "draft",
  includedReservationsPerMonth: 0, includedClassesPerMonth: 0,
  includedSports: [], bookingPriorityHours: [], waitlistPriority: false, maxActiveBookings: 0,
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

export function PlansManager() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<MembershipPlanDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MembershipPlanDoc | null>(null)
  const [form, setForm] = useState<typeof EMPTY_PLAN>({ ...EMPTY_PLAN })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    getPlans(clubId).then(setPlans).finally(() => setLoading(false))
  }, [clubId])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_PLAN })
    setOpen(true)
  }

  function openEdit(plan: MembershipPlanDoc) {
    setEditing(plan)
    const { id, clubId: _, createdAt: __, updatedAt: ___, ...rest } = plan
    setForm({ ...EMPTY_PLAN, ...rest })
    setOpen(true)
  }

  async function handleDuplicate(plan: MembershipPlanDoc) {
    if (!clubId) return
    const { id, createdAt, updatedAt, ...rest } = plan
    const newData = { ...rest, clubId, name: `${rest.name} (copia)`, status: "draft" as const }
    const newId = await createPlan(newData)
    setPlans((prev) => [...prev, { ...newData, id: newId }])
  }

  async function handleSave() {
    if (!clubId || !form.name) return
    setSaving(true)
    try {
      if (editing?.id) {
        await updatePlan(editing.id, { ...form })
        setPlans((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...form } : p))
      } else {
        const newData = { ...form, clubId }
        const newId = await createPlan(newData)
        setPlans((prev) => [...prev, { ...newData, id: newId }])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deletePlan(id)
    setPlans((prev) => prev.filter((p) => p.id !== id))
    setConfirmDelete(null)
  }

  function setField<K extends keyof typeof EMPTY_PLAN>(k: K, v: typeof EMPTY_PLAN[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} planes configurados</p>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="size-4" /> Nuevo plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border rounded-lg text-muted-foreground gap-2">
          <p className="text-sm">Aún no hay planes configurados.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Crear primer plan</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Reservas/mes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>{CYCLE_LABELS[plan.billingCycle] ?? plan.billingCycle}</TableCell>
                <TableCell>{fmtARS(plan.price)}</TableCell>
                <TableCell>{plan.trialDays ? `${plan.trialDays} días` : "—"}</TableCell>
                <TableCell>{plan.includedReservationsPerMonth ?? "∞"}</TableCell>
                <TableCell>
                  <Badge className={cn("text-xs font-medium", STATUS_COLORS[plan.status] ?? "bg-slate-100 text-slate-500")}>
                    {STATUS_LABELS[plan.status] ?? plan.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(plan)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDuplicate(plan)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => setConfirmDelete(plan.id!)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan de membresía"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Plan Gold" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Descripción</Label>
                <Input value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} placeholder="Acceso ilimitado..." />
              </div>
              <div className="space-y-1">
                <Label>Ciclo de facturación</Label>
                <Select value={form.billingCycle} onValueChange={(v) => setField("billingCycle", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Precio (ARS)</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setField("price", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Cargo de inscripción (ARS)</Label>
                <Input type="number" min={0} value={form.signupFee ?? 0} onChange={(e) => setField("signupFee", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Días de prueba</Label>
                <Input type="number" min={0} value={form.trialDays ?? 0} onChange={(e) => setField("trialDays", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Reservas incluidas/mes (0 = ilimitado)</Label>
                <Input type="number" min={0} value={form.includedReservationsPerMonth ?? 0} onChange={(e) => setField("includedReservationsPerMonth", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Clases incluidas/mes (0 = ilimitado)</Label>
                <Input type="number" min={0} value={form.includedClassesPerMonth ?? 0} onChange={(e) => setField("includedClassesPerMonth", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Horas de prioridad de reserva (ej: 18:00,19:00)</Label>
                <Input
                  value={(form.bookingPriorityHours ?? []).join(",")}
                  onChange={(e) => setField("bookingPriorityHours", e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [])}
                  placeholder="18:00,19:00"
                />
              </div>
              <div className="space-y-1">
                <Label>Máx. reservas activas simultáneas</Label>
                <Input type="number" min={0} value={form.maxActiveBookings ?? 0} onChange={(e) => setField("maxActiveBookings", Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar plan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. Los suscriptores existentes no serán afectados.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
