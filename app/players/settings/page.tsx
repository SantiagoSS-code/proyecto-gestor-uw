"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { auth, db } from "@/lib/firebaseClient"
import { doc, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { VoydLogo } from "@/components/ui/voyd-logo"
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  CreditCard,
  Lock,
  Save,
  Settings,
  Shield,
  User,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  firstName: string
  lastName: string
  phone: string
  city: string
}

interface NotifPrefs {
  emailBookingConfirm: boolean
  emailReminders: boolean
  pushReminders: boolean
  whatsappReminders: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({
  title,
  Icon,
  children,
}: {
  title: string
  Icon: any
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50 transition-colors"
      />
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer select-none">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 h-5.5 w-10 rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
          checked ? "bg-blue-600 border-blue-600" : "bg-slate-200 border-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      {message}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PlayerSettingsPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
  })
  const [notifs, setNotifs] = useState<NotifPrefs>({
    emailBookingConfirm: true,
    emailReminders: true,
    pushReminders: false,
    whatsappReminders: false,
  })

  // Load profile
  useEffect(() => {
    if (!user) return
    auth.currentUser
      ?.getIdToken()
      .then((token: string) =>
        fetch("/api/players/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then((r: Response) => r.json())
      .then((d: { profile?: Record<string, any> }) => {
        const p = d.profile || {}
        setForm({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          phone: p.phone || "",
          city: p.city || "",
        })
        setAvatarUrl(p.avatarUrl || null)
        if (p.notifPrefs) setNotifs({ ...notifs, ...p.notifPrefs })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const showToast = useCallback((ms = 2500) => {
    setToast(true)
    setTimeout(() => setToast(false), ms)
  }, [])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      showToast()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifs = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(doc(db, "users", user.uid), { notifPrefs: notifs }, { merge: true })
      showToast()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const displayName =
    form.firstName
      ? `${form.firstName}${form.lastName ? ` ${form.lastName}` : ""}`
      : user?.email?.split("@")[0] || "Jugador"

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" className="rounded-full h-9 w-9 -ml-1">
                <Link href="/players/dashboard">
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </Link>
              </Button>
              <span className="text-sm font-semibold text-slate-900">Configuración</span>
            </div>
            <Link href="/" aria-label="Inicio">
              <VoydLogo className="h-6" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-5 pb-24">
        {/* ── PERFIL ── */}
        <Card title="Perfil" Icon={User}>
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow">
                  {getInitials(displayName)}
                </div>
              )}
              <button
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                title="Cambiar foto (próximamente)"
              >
                <Camera className="w-3 h-3 text-slate-500" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Sk className="h-10 w-full" />
              <Sk className="h-10 w-full" />
              <Sk className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="firstName"
                label="Nombre"
                value={form.firstName}
                onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                placeholder="Tu nombre"
              />
              <Field
                id="lastName"
                label="Apellido"
                value={form.lastName}
                onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                placeholder="Tu apellido"
              />
              <Field
                id="email"
                label="Email"
                type="email"
                value={user?.email || ""}
                disabled
              />
              <Field
                id="phone"
                label="Teléfono"
                type="tel"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="+54 11 ..."
              />
              <Field
                id="city"
                label="Ciudad"
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                placeholder="Ej: Buenos Aires"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={saving || loading}
              className="rounded-full gap-1.5 min-w-[110px]"
              size="sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </Card>

        {/* ── NOTIFICACIONES ── */}
        <Card title="Notificaciones" Icon={Bell}>
          <div className="space-y-5">
            <Toggle
              label="Confirmación de reserva"
              desc="Recibí un email al confirmar cada reserva"
              checked={notifs.emailBookingConfirm}
              onChange={(v) => setNotifs((n) => ({ ...n, emailBookingConfirm: v }))}
            />
            <div className="border-t border-slate-100" />
            <Toggle
              label="Recordatorios por email"
              desc="Te avisamos 24 hs antes de tu turno"
              checked={notifs.emailReminders}
              onChange={(v) => setNotifs((n) => ({ ...n, emailReminders: v }))}
            />
            <div className="border-t border-slate-100" />
            <Toggle
              label="Notificaciones push"
              desc="Requiere habilitar permisos en tu dispositivo"
              checked={notifs.pushReminders}
              onChange={(v) => setNotifs((n) => ({ ...n, pushReminders: v }))}
            />
            <div className="border-t border-slate-100" />
            <Toggle
              label="WhatsApp"
              desc="Próximamente disponible"
              checked={notifs.whatsappReminders}
              onChange={(v) => setNotifs((n) => ({ ...n, whatsappReminders: v }))}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleSaveNotifs}
              disabled={saving}
              className="rounded-full gap-1.5 min-w-[110px]"
              size="sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </Card>

        {/* ── PAGOS ── */}
        <Card title="Métodos de pago" Icon={CreditCard}>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <CreditCard className="w-7 h-7 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">Próximamente</p>
            <p className="text-xs text-slate-400 mt-1">
              Vas a poder guardar métodos de pago para reservar más rápido.
            </p>
          </div>
        </Card>

        {/* ── SEGURIDAD ── */}
        <Card title="Seguridad y privacidad" Icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-800">Contraseña</p>
                <p className="text-xs text-slate-400 mt-0.5">Actualizá tu contraseña regularmente</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1.5">
                <Link href="/auth/forgot-password">
                  <Lock className="w-3 h-3" />
                  Cambiar
                </Link>
              </Button>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-800">Datos personales</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tus datos se almacenan de forma segura
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Check className="w-3 h-3" />
                Protegido
              </span>
            </div>
          </div>
        </Card>

        {/* ── ACCOUNT ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Cuenta</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Cerrar sesión</p>
              <p className="text-xs text-slate-400">Sesión activa como {user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => auth.signOut().then(() => (window.location.href = "/"))}
            >
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message="Cambios guardados" visible={toast} />
    </main>
  )
}
