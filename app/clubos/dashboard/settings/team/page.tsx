"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { PermissionGate } from "@/components/dashboard/permission-gate"
import { db } from "@/lib/firebaseClient"
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore"
import {
  ROLES,
  MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  type RoleId,
  type TeamMember,
  type RolePermissions,
  type ModuleId,
  type PermissionLevel,
} from "@/lib/permissions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as Dialog from "@radix-ui/react-dialog"
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Users,
  Eye,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── helpers ───────────────────────────────────────────────────
function roleLabel(id: RoleId) {
  return ROLES.find((r) => r.id === id)?.label ?? id
}
function roleColor(id: RoleId) {
  return ROLES.find((r) => r.id === id)?.color ?? "bg-slate-100 text-slate-700"
}

type PermLevel = "none" | "view" | "edit" | "manage"

function getLevel(mp: Record<string, boolean> | undefined): PermLevel {
  if (!mp) return "none"
  if (mp.manage) return "manage"
  if (mp.edit || mp.create) return "edit"
  if (mp.view) return "view"
  return "none"
}

function levelToFlags(level: PermLevel): Record<string, boolean> {
  switch (level) {
    case "manage": return { view: true, create: true, edit: true, manage: true }
    case "edit":   return { view: true, create: true, edit: true }
    case "view":   return { view: true }
    default:       return {}
  }
}

const LEVEL_OPTIONS: { key: PermLevel; label: string; colors: string }[] = [
  { key: "none",   label: "Sin acceso", colors: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "view",   label: "Ver",        colors: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200" },
  { key: "edit",   label: "Editar",     colors: "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200" },
  { key: "manage", label: "Admin",      colors: "bg-violet-50 text-violet-700 border-violet-300 ring-1 ring-violet-200" },
]

const EDITABLE_MODULES = MODULES.filter((m) => m.id !== "team" && m.id !== "settings")

// ── Invite Modal ──────────────────────────────────────────────
function InviteModal({
  open,
  onClose,
  onInvite,
}: {
  open: boolean
  onClose: () => void
  onInvite: (name: string, email: string, password: string, role: RoleId) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<RoleId>("reception")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim() || !email.trim()) {
      setError("Completá nombre y email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido.")
      return
    }
    if (!password.trim() || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    setLoading(true)
    try {
      await onInvite(name.trim(), email.trim().toLowerCase(), password, role)
      setName("")
      setEmail("")
      setPassword("")
      setShowPassword(false)
      setRole("reception")
      onClose()
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Invitar miembro
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nombre</Label>
              <Input
                id="invite-name"
                placeholder="Ej: Ana López"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="ana@club.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">El empleado usará esta contraseña para ingresar al sistema.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rol</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleId)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creando..." : "Crear acceso"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Edit Role Modal ───────────────────────────────────────────
function EditRoleModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember | null
  onClose: () => void
  onSave: (id: string, role: RoleId) => Promise<void>
}) {
  const [role, setRole] = useState<RoleId>(member?.role ?? "reception")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (member) setRole(member.role)
  }, [member])

  async function handleSave() {
    if (!member) return
    setLoading(true)
    try {
      await onSave(member.id, role)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={!!member} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Editar rol
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {member?.name} — {member?.email}
          </p>
          <div className="space-y-2 mb-5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-all",
                  role === r.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300",
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", r.color)}>
                    {r.label}
                  </span>
                  {role === r.id && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{r.description}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Member Permissions Modal ──────────────────────────────────
function MemberPermissionsModal({
  member,
  centerId,
  onClose,
  onSaved,
}: {
  member: TeamMember | null
  centerId: string | null
  onClose: () => void
  onSaved: (updated: TeamMember) => void
}) {
  const [perms, setPerms] = useState<RolePermissions>(
    DEFAULT_ROLE_PERMISSIONS.owner,
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (member) {
      const base = member.customPermissions ?? DEFAULT_ROLE_PERMISSIONS[member.role]
      setPerms({ ...base })
      setSuccess(false)
    }
  }, [member])

  function handleSetLevel(moduleId: ModuleId, level: PermLevel) {
    setPerms((prev) => ({
      ...prev,
      [moduleId]: levelToFlags(level),
    }))
  }

  async function handleSave() {
    if (!member || !centerId) return
    setSaving(true)
    try {
      await updateDoc(doc(db, "centers", centerId, "team", member.id), {
        customPermissions: perms,
      })
      onSaved({ ...member, customPermissions: perms })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const role = member ? ROLES.find((r) => r.id === member.role) : null

  return (
    <Dialog.Root open={!!member} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Permisos de {member?.name}
              </Dialog.Title>
              {role && (
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block", role.color)}>
                  {role.label}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="px-6 pb-3">
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> <strong>Ver</strong> — solo lectura</span>
              <span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> <strong>Editar</strong> — puede modificar datos</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> <strong>Admin</strong> — control total</span>
            </div>
          </div>

          {/* Module list */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
            {EDITABLE_MODULES.map((mod) => {
              const currentLevel = getLevel(perms[mod.id])
              return (
                <div key={mod.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-800 min-w-0 truncate">{mod.label}</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 ml-3">
                    {LEVEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSetLevel(mod.id, opt.key)}
                        className={cn(
                          "px-2.5 py-1.5 text-[11px] font-semibold transition-all border-r border-slate-200 last:border-r-0",
                          currentLevel === opt.key
                            ? opt.colors
                            : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cerrar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : success ? "✓ Guardado" : "Guardar permisos"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Delete confirm ────────────────────────────────────────────
function DeleteConfirmModal({
  member,
  onClose,
  onDelete,
}: {
  member: TeamMember | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  async function confirm() {
    if (!member) return
    setLoading(true)
    try {
      await onDelete(member.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog.Root open={!!member} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in-0 zoom-in-95">
          <Dialog.Title className="text-lg font-semibold text-slate-900 mb-2">
            ¿Eliminar miembro?
          </Dialog.Title>
          <p className="text-sm text-slate-600 mb-5">
            <strong>{member?.name}</strong> perderá acceso al club inmediatamente.
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirm}
              disabled={loading}
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function TeamPage() {
  const { user, centerId } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)
  const [permissionsMember, setPermissionsMember] = useState<TeamMember | null>(null)

  // ── Load team from Firestore ──────────────────────────────
  useEffect(() => {
    if (!resolvedCenterId) return
    const ref = collection(db, "centers", resolvedCenterId, "team")
    getDocs(ref)
      .then((snap) => {
        const data: TeamMember[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<TeamMember, "id">),
          id: d.id,
        }))
        setMembers(data)
      })
      .catch(console.error)
      .finally(() => setLoadingMembers(false))
  }, [resolvedCenterId])

  // ── Invite ────────────────────────────────────────────────
  async function handleInvite(name: string, email: string, password: string, role: RoleId) {
    if (!resolvedCenterId) throw new Error("No hay centro asociado a tu cuenta.")
    const res = await fetch("/api/clubos/team/create-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, centerId: resolvedCenterId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Error al crear el miembro.")
    setMembers((prev) => {
      const member = data.member as TeamMember
      return [...prev.filter((m) => m.id !== member.id), member]
    })
  }

  // ── Edit role ─────────────────────────────────────────────
  async function handleEditRole(id: string, role: RoleId) {
    if (!resolvedCenterId) return
    await updateDoc(doc(db, "centers", resolvedCenterId, "team", id), { role })
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!resolvedCenterId) return
    const res = await fetch("/api/clubos/team/delete-member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: id, centerId: resolvedCenterId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || "Error al eliminar el miembro.")
    }
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <PermissionGate module="team">
    <div className="space-y-8 animate-in fade-in-50 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Equipo y permisos
          </h1>
          <p className="text-slate-500 mt-1.5">
            Invitá empleados, asignales un rol y controlá qué pueden ver o hacer.
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Invitar miembro
        </Button>
      </div>

      {/* ── Roles overview ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base">Roles disponibles</CardTitle>
          </div>
          <CardDescription>
            Cada rol tiene permisos por defecto. Podés personalizarlos por miembro desde la tabla de abajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", role.color)}>
                    {role.label}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Team table ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base">Equipo del club</CardTitle>
          </div>
          <CardDescription>
            Miembros con acceso al panel de gestión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Todavía no hay miembros en el equipo.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(true)}
                className="gap-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invitar primer miembro
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Rol</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                        <td className="px-4 py-3 text-slate-600">{m.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", roleColor(m.role))}>
                            {roleLabel(m.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPermissionsMember(m)}
                              className="p-1.5 rounded-md hover:bg-violet-50 text-slate-500 hover:text-violet-700 transition-colors"
                              title="Permisos"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditMember(m)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                              title="Editar rol"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteMember(m)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPermissionsMember(m)}
                          className="p-1.5 rounded-md hover:bg-violet-50 text-slate-500 hover:text-violet-700 transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMember(m)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteMember(m)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", roleColor(m.role))}>
                        {roleLabel(m.role)}
                      </span>
                      {m.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />
      <EditRoleModal
        member={editMember}
        onClose={() => setEditMember(null)}
        onSave={handleEditRole}
      />
      <MemberPermissionsModal
        member={permissionsMember}
        centerId={resolvedCenterId}
        onClose={() => setPermissionsMember(null)}
        onSaved={(updated) => {
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        }}
      />
      <DeleteConfirmModal
        member={deleteMember}
        onClose={() => setDeleteMember(null)}
        onDelete={handleDelete}
      />
    </div>
    </PermissionGate>
  )
}
