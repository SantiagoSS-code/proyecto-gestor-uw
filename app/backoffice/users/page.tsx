"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/backoffice/page-header"
import { backofficeFetch } from "@/lib/backoffice/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, RefreshCw, ExternalLink, Copy, Link as LinkIcon } from "lucide-react"

type CenterOption = {
  centerId: string
  name?: string
  ownerEmail?: string | null
  source?: string
}

type ClubOSUser = {
  uid: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  centerId: string
  centerName: string | null
  status: string | null
  onboardingCompleted: boolean | null
  createdAt: string | null
}

type RegistrationLinkResponse = {
  ok: boolean
  url: string
  expiresAt: string
  centerId: string
  email: string
  message?: string
}

export default function BackofficeUsersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<CenterOption[]>([])
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  // Users list state
  const [users, setUsers] = useState<ClubOSUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersQuery, setUsersQuery] = useState("")

  const [centerId, setCenterId] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [confirmWithoutClubOpen, setConfirmWithoutClubOpen] = useState(false)
  const [registrationLinkOpen, setRegistrationLinkOpen] = useState(false)
  const [registrationLinkEmail, setRegistrationLinkEmail] = useState("")
  const [registrationLinkLoading, setRegistrationLinkLoading] = useState(false)
  const [generatedRegistrationLink, setGeneratedRegistrationLink] = useState("")
  const [generatedRegistrationLinkExpiresAt, setGeneratedRegistrationLinkExpiresAt] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => {
      return (
        String(c.centerId || "").toLowerCase().includes(q) ||
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.ownerEmail || "").toLowerCase().includes(q)
      )
    })
  }, [items, query])

  const filteredUsers = useMemo(() => {
    const q = usersQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.email, u.firstName, u.lastName, u.centerId, u.centerName, u.phone]
        .some((v) => String(v || "").toLowerCase().includes(q))
    )
  }, [users, usersQuery])

  const selectedCenter = useMemo(() => items.find((c) => c.centerId === centerId) || null, [items, centerId])

  const loadCenters = async () => {
    try {
      setMessage(null)
      setLoading(true)
      const res = await backofficeFetch<{ items: CenterOption[] }>("/api/backoffice/centers?q=")
      setItems(res.items || [])
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "No se pudieron cargar los clubes" })
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const res = await backofficeFetch<{ users: ClubOSUser[] }>("/api/backoffice/users")
      setUsers(res.users || [])
    } catch {
      // silent
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadCenters()
    loadUsers()
  }, [])

  const submitCreateUser = async () => {
    if (!email || !password) {
      setMessage({ type: "error", text: "Completá email y contraseña." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      const res = await backofficeFetch<{ message?: string }>("/api/backoffice/users", {
        method: "POST",
        body: JSON.stringify({ centerId: centerId || undefined, email, password, firstName, lastName, phone }),
      })
      setMessage({ type: "ok", text: res.message || "Usuario creado correctamente" })
      setPassword("")
      if (!centerId) {
        setEmail("")
        setFirstName("")
        setLastName("")
        setPhone("")
      }
      await loadCenters()
      await loadUsers()
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "No se pudo crear el usuario" })
    } finally {
      setSaving(false)
    }
  }

  const createUser = async () => {
    if (!centerId) {
      setConfirmWithoutClubOpen(true)
      return
    }
    await submitCreateUser()
  }

  const openRegistrationLinkModal = () => {
    setRegistrationLinkEmail(email || selectedCenter?.ownerEmail || "")
    setGeneratedRegistrationLink("")
    setGeneratedRegistrationLinkExpiresAt("")
    setRegistrationLinkOpen(true)
  }

  const createRegistrationLink = async () => {
    const cleanEmail = registrationLinkEmail.trim().toLowerCase()
    if (!cleanEmail) {
      setMessage({ type: "error", text: "Indicá el email destino del administrador." })
      return
    }

    try {
      setRegistrationLinkLoading(true)
      setMessage(null)
      const res = await backofficeFetch<RegistrationLinkResponse>("/api/backoffice/users/registration-link", {
        method: "POST",
        body: JSON.stringify({
          centerId,
          email: cleanEmail,
          firstName,
          lastName,
          phone,
          expiresInDays: 7,
        }),
      })

      setGeneratedRegistrationLink(res.url)
      setGeneratedRegistrationLinkExpiresAt(res.expiresAt)
      setMessage({ type: "ok", text: res.message || "Link de registro creado correctamente" })
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "No se pudo crear el link de registro" })
    } finally {
      setRegistrationLinkLoading(false)
    }
  }

  const copyRegistrationLink = async () => {
    if (!generatedRegistrationLink) return
    try {
      await navigator.clipboard.writeText(generatedRegistrationLink)
      setMessage({ type: "ok", text: "Link copiado al portapapeles." })
    } catch {
      setMessage({ type: "error", text: "No se pudo copiar el link." })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios ClubOS"
        subtitle="Alta de usuarios de centros (solo equipo Voyd). Podés crear con o sin club asociado."
      />

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="font-medium text-slate-900">Seleccionar club</div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Opcional. Si no seleccionás club, el usuario se crea para onboarding nuevo.</p>
            <Button
              type="button"
              variant="outline"
              className="h-8"
              onClick={() => setCenterId("")}
            >
              Sin club
            </Button>
          </div>
          <Input
            placeholder="Buscar por nombre, email o centerId"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-100">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Cargando clubes…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No hay resultados.</div>
            ) : (
              filtered.map((c) => {
                const active = c.centerId === centerId
                return (
                  <button
                    key={c.centerId}
                    type="button"
                    onClick={() => {
                      setCenterId(c.centerId)
                      if (!email && c.ownerEmail) setEmail(c.ownerEmail)
                    }}
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 ${
                      active ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-800">{c.name || "(sin nombre)"}</div>
                    <div className="text-xs text-slate-500">{c.centerId}</div>
                    <div className="text-xs text-slate-500">{c.ownerEmail || "sin owner email"}</div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="font-medium text-slate-900">Crear/actualizar usuario del club</div>

          <div className="space-y-1">
            <Label>Club seleccionado</Label>
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              {selectedCenter ? `${selectedCenter.name || "(sin nombre)"} · ${selectedCenter.centerId}` : "Sin club asociado (nuevo onboarding)"}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@club.com" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="user-password">Contraseña</Label>
            <Input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="first-name">Nombre</Label>
              <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last-name">Apellido</Label>
              <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 ..." />
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={createUser}>
            {saving ? "Guardando..." : "Crear / actualizar usuario"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openRegistrationLinkModal}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Crear Link de Registro
          </Button>

          <p className="text-xs text-slate-500">
            Si asociás un club, se usa ese <strong>centerId</strong>. Si no asociás, se crea un usuario nuevo para onboarding.
          </p>
        </div>
      </div>

      <Dialog open={confirmWithoutClubOpen} onOpenChange={setConfirmWithoutClubOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuario sin club asociado</DialogTitle>
            <DialogDescription>
              No estás asociando el usuario a ningún club. ¿Estás seguro que deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWithoutClubOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                setConfirmWithoutClubOpen(false)
                await submitCreateUser()
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={registrationLinkOpen} onOpenChange={setRegistrationLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Link de Registro</DialogTitle>
            <DialogDescription>
              Completá el email del administrador. Al enviar, recibirá un mensaje de bienvenida con su link único para crear usuario en ClubOS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Club seleccionado</Label>
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                {selectedCenter ? `${selectedCenter.name || "(sin nombre)"} · ${selectedCenter.centerId}` : "Sin club"}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="registration-email">Email destino</Label>
              <Input
                id="registration-email"
                type="email"
                value={registrationLinkEmail}
                onChange={(e) => setRegistrationLinkEmail(e.target.value)}
                placeholder="admin@club.com"
              />
            </div>

            {generatedRegistrationLink ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <p className="text-xs text-emerald-700">
                  Link generado{generatedRegistrationLinkExpiresAt
                    ? ` · expira ${new Date(generatedRegistrationLinkExpiresAt).toLocaleString("es-AR")}`
                    : ""}
                </p>
                <div className="flex gap-2">
                  <Input value={generatedRegistrationLink} readOnly className="bg-white" />
                  <Button type="button" variant="outline" onClick={copyRegistrationLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationLinkOpen(false)}>
              Cerrar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={createRegistrationLink}
              disabled={registrationLinkLoading}
            >
              {registrationLinkLoading ? "Enviando..." : "Enviar link de bienvenida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Usuarios registrados ── */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="font-semibold text-slate-900">Usuarios registrados en ClubOS</p>
            <p className="text-xs text-slate-500 mt-0.5">{users.length} usuario{users.length !== 1 ? "s" : ""} en total</p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={usersLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por email, nombre, club o ID…"
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {usersLoading ? (
          <div className="p-6 text-sm text-slate-500 text-center">Cargando usuarios…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">No hay resultados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-slate-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-slate-500 uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-slate-500 uppercase tracking-wide">Creado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—"
                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"
                  return (
                    <tr key={u.uid} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{name}</div>
                        <div className="text-xs text-slate-500">{u.email || "sin email"}</div>
                        {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{u.centerName || "—"}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.centerId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="outline"
                            className={
                              u.status === "active"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]"
                                : "border-slate-200 bg-slate-50 text-slate-500 text-[11px]"
                            }
                          >
                            {u.status || "desconocido"}
                          </Badge>
                          {u.onboardingCompleted === false && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[11px]">
                              onboarding pendiente
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{createdDate}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/backoffice/centers/${u.centerId}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver club
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
