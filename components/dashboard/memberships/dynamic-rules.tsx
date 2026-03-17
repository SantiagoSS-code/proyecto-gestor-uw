"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getRules, getPlans, createRule, updateRule, deleteRule,
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
import type { MembershipRuleDoc, MembershipPlanDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const TRIGGER_LABELS: Record<string, string> = {
  frequency:     "Frecuencia",
  tenure:        "Antigüedad",
  low_occupancy: "Baja ocupación",
  loyalty:       "Lealtad",
}
const OPERATOR_LABELS: Record<string, string> = {
  ">=": "≥", "<=": "≤", "==": "=", ">": ">",
}
const ACTION_TYPE_LABELS: Record<string, string> = {
  add_discount:       "Aplicar descuento",
  free_reservation:   "Reserva gratis",
  unlock_priority:    "Desbloquear prioridad",
  unlock_waitlist:    "Prioridad en espera",
  add_free_class:     "Clase gratis",
}

const EMPTY_RULE: Omit<MembershipRuleDoc, "id" | "clubId" | "createdAt"> = {
  planId: "",
  name: "",
  triggerType: "frequency",
  condition: { metric: "", operator: ">=", value: 0 },
  action: { type: "add_discount", value: 0 },
  status: "active",
}

export function DynamicRules() {
  const { user } = useAuth()
  const [rules, setRules] = useState<MembershipRuleDoc[]>([])
  const [plans, setPlans] = useState<MembershipPlanDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MembershipRuleDoc | null>(null)
  const [form, setForm] = useState<typeof EMPTY_RULE>({ ...EMPTY_RULE })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    Promise.all([getRules(clubId), getPlans(clubId)])
      .then(([r, p]) => { setRules(r); setPlans(p) })
      .finally(() => setLoading(false))
  }, [clubId])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_RULE, condition: { ...EMPTY_RULE.condition }, action: { ...EMPTY_RULE.action } })
    setOpen(true)
  }

  function openEdit(rule: MembershipRuleDoc) {
    setEditing(rule)
    const { id, clubId: _, createdAt: __, ...rest } = rule
    setForm({ ...rest, condition: { ...rest.condition }, action: { ...rest.action } })
    setOpen(true)
  }

  async function handleSave() {
    if (!clubId || !form.name || !form.planId) return
    setSaving(true)
    try {
      if (editing?.id) {
        await updateRule(editing.id, { ...form })
        setRules((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...form } : r))
      } else {
        const newData = { ...form, clubId }
        const newId = await createRule(newData)
        setRules((prev) => [...prev, { ...newData, id: newId }])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
    setConfirmDelete(null)
  }

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "—"

  const grouped = plans.map((plan) => ({
    plan,
    items: rules.filter((r) => r.planId === plan.id),
  })).filter((g) => g.items.length > 0)
  const orphans = rules.filter((r) => !plans.find((p) => p.id === r.planId))

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} reglas configuradas</p>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="size-4" /> Nueva regla
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border rounded-lg text-muted-foreground gap-2">
          <p className="text-sm">Sin reglas dinámicas configuradas.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>Crear primera regla</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ plan, items }) => (
            <div key={plan.id}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Plan: {plan.name}</h3>
              <RuleTable items={items} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)} />
            </div>
          ))}
          {orphans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Sin plan asignado</h3>
              <RuleTable items={orphans} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)} />
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar regla" : "Nueva regla dinámica"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Plan *</Label>
              <Select value={form.planId} onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nombre de la regla *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Descuento por alta frecuencia"
              />
            </div>
            <div className="space-y-1">
              <Label>Disparador</Label>
              <Select value={form.triggerType} onValueChange={(v) => setForm((f) => ({ ...f, triggerType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Condición</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Métrica</Label>
                  <Input
                    value={form.condition.metric}
                    onChange={(e) => setForm((f) => ({ ...f, condition: { ...f.condition, metric: e.target.value } }))}
                    placeholder="reservations_count"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operador</Label>
                  <Select
                    value={form.condition.operator}
                    onValueChange={(v) => setForm((f) => ({ ...f, condition: { ...f.condition, operator: v as any } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    value={form.condition.value}
                    onChange={(e) => setForm((f) => ({ ...f, condition: { ...f.condition, value: Number(e.target.value) } }))}
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acción</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={form.action.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, action: { ...f.action, type: v as any } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_TYPE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    value={form.action.value ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, action: { ...f.action, value: Number(e.target.value) } }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
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
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear regla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar regla?</DialogTitle></DialogHeader>
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

function RuleTable({
  items, onEdit, onDelete,
}: { items: MembershipRuleDoc[]; onEdit: (r: MembershipRuleDoc) => void; onDelete: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Disparador</TableHead>
          <TableHead>Condición</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-[80px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-sm">{TRIGGER_LABELS[r.triggerType] ?? r.triggerType}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {r.condition.metric} {OPERATOR_LABELS[r.condition.operator] ?? r.condition.operator} {r.condition.value}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {ACTION_TYPE_LABELS[r.action.type] ?? r.action.type}
              {r.action.value != null ? `: ${r.action.value}` : ""}
            </TableCell>
            <TableCell>
              <Badge className={cn("text-xs font-medium", r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {r.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(r)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => onDelete(r.id!)}>
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
