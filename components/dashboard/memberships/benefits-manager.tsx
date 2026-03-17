"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getBenefits, getPlans, createBenefit, updateBenefit, deleteBenefit,
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import type { MembershipBenefitDoc, MembershipPlanDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const BENEFIT_TYPE_LABELS: Record<string, string> = {
  discount_percentage: "Descuento %",
  fixed_discount:      "Descuento fijo",
  special_price:       "Precio especial",
  priority_booking:    "Prioridad de reserva",
  waitlist_priority:   "Prioridad en espera",
  free_class:          "Clase gratis",
  free_reservation:    "Reserva gratis",
  exclusive_access:    "Acceso exclusivo",
}

const EMPTY_BENEFIT: Omit<MembershipBenefitDoc, "id" | "clubId" | "createdAt"> = {
  planId: "", name: "", type: "discount_percentage", value: 0,
  status: "active",
}

export function BenefitsManager() {
  const { user } = useAuth()
  const [benefits, setBenefits] = useState<MembershipBenefitDoc[]>([])
  const [plans, setPlans] = useState<MembershipPlanDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MembershipBenefitDoc | null>(null)
  const [form, setForm] = useState<typeof EMPTY_BENEFIT>({ ...EMPTY_BENEFIT })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    Promise.all([getBenefits(clubId), getPlans(clubId)])
      .then(([b, p]) => { setBenefits(b); setPlans(p) })
      .finally(() => setLoading(false))
  }, [clubId])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_BENEFIT })
    setOpen(true)
  }

  function openEdit(b: MembershipBenefitDoc) {
    setEditing(b)
    const { id, clubId: _, createdAt: __, ...rest } = b
    setForm({ ...EMPTY_BENEFIT, ...rest })
    setOpen(true)
  }

  async function handleSave() {
    if (!clubId || !form.name || !form.planId) return
    setSaving(true)
    try {
      if (editing?.id) {
        await updateBenefit(editing.id, { ...form })
        setBenefits((prev) => prev.map((b) => b.id === editing.id ? { ...b, ...form } : b))
      } else {
        const newData = { ...form, clubId }
        const newId = await createBenefit(newData)
        setBenefits((prev) => [...prev, { ...newData, id: newId }])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteBenefit(id)
    setBenefits((prev) => prev.filter((b) => b.id !== id))
    setConfirmDelete(null)
  }

  function setField<K extends keyof typeof EMPTY_BENEFIT>(k: K, v: typeof EMPTY_BENEFIT[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "—"
  const showValueField = ["discount_percentage", "fixed_discount", "special_price"].includes(form.type)

  // Group benefits by planId
  const grouped = plans.map((plan) => ({
    plan,
    items: benefits.filter((b) => b.planId === plan.id),
  })).filter((g) => g.items.length > 0)

  const orphans = benefits.filter((b) => !plans.find((p) => p.id === b.planId))

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{benefits.length} beneficios configurados</p>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="size-4" /> Nuevo beneficio
        </Button>
      </div>

      {benefits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border rounded-lg text-muted-foreground gap-2">
          <p className="text-sm">Sin beneficios configurados.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Agregar beneficio</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ plan, items }) => (
            <div key={plan.id}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Plan: {plan.name}</h3>
              <BenefitTable items={items} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)} />
            </div>
          ))}
          {orphans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Sin plan asignado</h3>
              <BenefitTable items={orphans} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)} />
            </div>
          )}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar beneficio" : "Nuevo beneficio"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Plan *</Label>
              <Select value={form.planId} onValueChange={(v) => setField("planId", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nombre del beneficio *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="10% de descuento en reservas" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BENEFIT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showValueField && (
              <div className="space-y-1">
                <Label>Valor {form.type === "discount_percentage" ? "(%)" : "(ARS)"}</Label>
                <Input
                  type="number" min={0}
                  value={form.value ?? 0}
                  onChange={(e) => setField("value", Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.planId}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear beneficio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar beneficio?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
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

function BenefitTable({
  items, onEdit, onDelete,
}: { items: MembershipBenefitDoc[]; onEdit: (b: MembershipBenefitDoc) => void; onDelete: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Aplica a</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-[80px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-medium">{b.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{BENEFIT_TYPE_LABELS[b.type] ?? b.type}</TableCell>
            <TableCell className="text-sm">
              {b.value != null
                ? b.type === "discount_percentage" ? `${b.value}%` : `$${b.value}`
                : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {b.appliesTo?.sports?.join(", ") || "Todos"}
            </TableCell>
            <TableCell>
              <Badge className={cn("text-xs font-medium", b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {b.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(b)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => onDelete(b.id!)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
