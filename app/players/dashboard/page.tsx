"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Building2, CheckCircle2, XCircle, AlertTriangle, Loader2, Bell, CheckCheck, CalendarClock } from "lucide-react"
import { auth } from "@/lib/firebaseClient"
import { VoydLogo } from "@/components/ui/voyd-logo"

interface PlayerOnboardingLocal {
  ageRange?: string
  gender?: string
  sports?: string[]
  level?: string
}

type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired"

interface PlayerBooking {
  id: string
  clubName: string
  courtName: string
  sport: string
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
  price: number | null
  currency: string
  bookingStatus: BookingStatus
  paymentStatus: string
  createdAt: string | null
}

const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel", tennis: "Tennis", futbol: "Fútbol",
  pickleball: "Pickleball", squash: "Squash",
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string; Icon: any }> = {
  pending_payment: { label: "Pago pendiente", className: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
  confirmed:       { label: "Confirmada",     className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  cancelled:       { label: "Cancelada",      className: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  expired:         { label: "Expirada",       className: "bg-slate-100 text-slate-500 border-slate-200", Icon: AlertTriangle },
}

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return ""
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

const defaultNotifications = [
  { id: "1", title: "Reservá tu próximo turno con tiempo", subtitle: "Los fines de semana se llenan rápido.", icon: "calendar", time: "Ahora" },
  { id: "2", title: "Confirmá tus reservas pendientes", subtitle: "Tenés reservas sin confirmar pago.", icon: "check", time: "Hoy" },
  { id: "3", title: "Recordatorio: revisá tu historial", subtitle: "Mirá tus partidos anteriores en Mis reservas.", icon: "clock", time: "Esta semana" },
]

export default function PlayerDashboardPage() {
  const { user } = useAuth()
  const [localProfile, setLocalProfile] = useState<PlayerOnboardingLocal>({})
  const [bookings, setBookings] = useState<PlayerBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("playerOnboarding")
    if (!raw) return
    try { setLocalProfile(JSON.parse(raw) || {}) } catch { setLocalProfile({}) }
  }, [])

  // Load real bookings via API (uses Admin SDK collectionGroup)
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      try {
        setBookingsLoading(true)
        const idToken = await auth.currentUser?.getIdToken()
        if (!idToken) throw new Error("no token")

        const res = await fetch("/api/players/bookings", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        if (!cancelled) setBookings(data.bookings ?? [])
      } catch {
        if (!cancelled) setBookingsError("No se pudieron cargar tus reservas.")
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const firstName = useMemo(() => {
    const fallback = user?.email?.split("@")[0] || "Jugador"
    return (user?.displayName || fallback).split(" ")[0]
  }, [user])

  const chips = useMemo(() => {
    const items: string[] = []
    if (localProfile.sports?.length) items.push(localProfile.sports.join(" · "))
    if (localProfile.level) items.push(localProfile.level)
    if (localProfile.ageRange) items.push(localProfile.ageRange)
    return items
  }, [localProfile])

  // Split into upcoming (confirmed/pending) and past
  const today = new Date().toISOString().slice(0, 10)
  const upcomingBookings = bookings.filter(
    (b) => b.date >= today && (b.bookingStatus === "confirmed" || b.bookingStatus === "pending_payment")
  )
  const pastBookings = bookings.filter(
    (b) => b.date < today || b.bookingStatus === "cancelled" || b.bookingStatus === "expired"
  )

  const stats = [
    { label: "Reservas totales", value: bookings.filter(b => b.bookingStatus === "confirmed").length.toString() },
    { label: "Próximas reservas", value: upcomingBookings.filter(b => b.bookingStatus === "confirmed").length.toString() },
    { label: "Deporte más jugado", value: localProfile.sports?.[0] ? SPORT_LABEL[localProfile.sports[0]] || localProfile.sports[0] : "—" },
    { label: "Nivel", value: localProfile.level || "—" },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <Link href="/" aria-label="Ir a la landing">
            <VoydLogo className="h-10" />
          </Link>
        </div>

        {/* Header card */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-black">Hola,</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{firstName}</h1>
              <p className="mt-1 text-black">Listo para jugar?</p>
              {chips.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <span key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-black">{chip}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-black">Completa tu perfil para recibir recomendaciones personalizadas.</p>
              )}
            </div>
            <Button asChild className="rounded-full">
              <Link href="/players/profile">Editar perfil</Link>
            </Button>
          </div>
        </section>

        {/* Primary actions */}
        <section className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Reservar cancha", desc: "Encontrá disponibilidad ahora", href: "/clubs" },
            { title: "Mis reservas", desc: "Ver próximas y pasadas", href: "#mis-reservas" },
          ].map((action) => (
            <Link key={action.title} href={action.href}
              className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300">
              <p className="text-sm text-black">Acción rápida</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{action.title}</h3>
              <p className="mt-1 text-sm text-black">{action.desc}</p>
            </Link>
          ))}
        </section>

        {/* ── MIS RESERVAS ─────────────────────────────────────────── */}
        <section id="mis-reservas" className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8 scroll-mt-24">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Mis reservas</h2>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/clubs">+ Nueva reserva</Link>
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando reservas…</span>
            </div>
          ) : bookingsError ? (
            <p className="text-sm text-red-500 py-4">{bookingsError}</p>
          ) : upcomingBookings.length === 0 && pastBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">Aún no tenés reservas.</p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/clubs">Reservar ahora</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming */}
              {upcomingBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Próximas</p>
                  <div className="space-y-3">
                    {upcomingBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}
              {/* Past */}
              {pastBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Historial</p>
                  <div className="space-y-3">
                    {pastBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Tus stats</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-black">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Notificaciones</h2>
          </div>
          <div className="space-y-3">
            {defaultNotifications.map((note) => {
              const Icon = note.icon === "calendar" ? CalendarClock : note.icon === "check" ? CheckCheck : Clock
              return (
                <div key={note.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{note.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{note.subtitle}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 pt-0.5">{note.time}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function BookingCard({ booking: b }: { booking: PlayerBooking }) {
  const cfg = STATUS_CONFIG[b.bookingStatus] ?? STATUS_CONFIG.expired
  const Icon = cfg.Icon
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-900">{b.clubName}</span>
        </div>
        <div className="text-sm text-slate-600">
          {b.courtName}{b.sport ? ` · ${SPORT_LABEL[b.sport] || b.sport}` : ""}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500 pt-1">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(b.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.startTime} – {b.endTime}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.className}`}>
          <Icon className="w-3 h-3" />{cfg.label}
        </span>
        {b.price != null && (
          <span className="text-sm font-semibold text-slate-900">{formatCurrency(b.price, b.currency)}</span>
        )}
      </div>
    </div>
  )
}

