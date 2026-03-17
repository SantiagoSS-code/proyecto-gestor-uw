"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { auth } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { ReviewModal, type ReviewBooking } from "@/components/players/review-modal"
import { getMyRegistrations, getTournamentById } from "@/lib/tournaments"
import type { TournamentDoc, TournamentRegistrationDoc } from "@/lib/types"
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Heart,
  History,
  MapPin,
  Star,
  StarOff,
  Timer,
  Trophy,
  User,
  XCircle,
  Zap,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired"

interface PlayerProfile {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  city?: string | null
  favoriteClubId?: string | null
  favoriteClubName?: string | null
  sports?: string[]
}

interface PlayerBooking {
  id: string
  clubId: string
  clubName: string
  courtId: string
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
  reviewSubmitted?: boolean
}

interface FavoriteClub {
  clubId: string
  clubName: string
  city?: string | null
  sports?: string[]
  slug?: string | null
  heroImage?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel",
  tennis: "Tenis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
  padbol: "Padbol",
}

const STATUS_CFG: Record<
  BookingStatus,
  { label: string; className: string; dotClass: string; Icon: any }
> = {
  confirmed: {
    label: "Confirmada",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  pending_payment: {
    label: "Pago pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-400",
    Icon: Timer,
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-50 text-red-600 border-red-200",
    dotClass: "bg-red-400",
    Icon: XCircle,
  },
  expired: {
    label: "Expirada",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    dotClass: "bg-slate-400",
    Icon: Clock,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateShort(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function formatCurrency(amount: number | null, currency = "ARS") {
  if (amount == null) return ""
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getDayLabel(key: string): { label: string; urgent: boolean; color: string } {
  const today = new Date()
  const [y, m, d] = key.split("-").map(Number)
  const diff = Math.round(
    (new Date(y, m - 1, d).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000,
  )
  if (diff === 0) return { label: "Hoy", urgent: true, color: "text-blue-600" }
  if (diff === 1) return { label: "Mañana", urgent: true, color: "text-violet-600" }
  if (diff < 7) return { label: `En ${diff} días`, urgent: false, color: "text-slate-500" }
  return { label: formatDateShort(key), urgent: false, color: "text-slate-500" }
}

function computeStats(bookings: PlayerBooking[]) {
  const confirmed = bookings.filter((b) => b.bookingStatus === "confirmed")
  const today = getToday()
  const upcoming = bookings.filter(
    (b) =>
      b.date >= today &&
      (b.bookingStatus === "confirmed" || b.bookingStatus === "pending_payment"),
  ).length

  const sportCounts: Record<string, number> = {}
  const clubCounts: Record<string, number> = {}
  let totalMinutes = 0

  for (const b of confirmed) {
    if (b.sport) sportCounts[b.sport] = (sportCounts[b.sport] || 0) + 1
    if (b.clubName) clubCounts[b.clubName] = (clubCounts[b.clubName] || 0) + 1
    totalMinutes += b.durationMinutes || 60
  }

  const topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]
  const topClub = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0]
  const hours = Math.round((totalMinutes / 60) * 10) / 10

  return {
    total: confirmed.length,
    upcoming,
    topSport: topSport ? SPORT_LABEL[topSport[0]] || topSport[0] : null,
    topClub: topClub ? topClub[0] : null,
    hours,
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.expired
  const Icon = c.Icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${c.className}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  title,
  action,
  actionLabel,
  children,
}: {
  id?: string
  title: string
  action?: string
  actionLabel?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {action && actionLabel && (
          <Link href={action} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── 1. PLAYER HEADER ─────────────────────────────────────────────────────────

function PlayerHeader({
  profile,
  loading,
  userEmail,
}: {
  profile: PlayerProfile | null
  loading: boolean
  userEmail?: string | null
}) {
  const raw =
    profile?.firstName
      ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
      : userEmail?.split("@")[0] || "Jugador"

  const firstName = raw.split(" ")[0]
  const initials = getInitials(raw)

  return (
    <section className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {loading ? (
              <Sk className="w-14 h-14 rounded-full" />
            ) : profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={raw}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
          </div>

          <div>
            {loading ? (
              <div className="space-y-2">
                <Sk className="h-5 w-32" />
                <Sk className="h-3.5 w-24" />
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 leading-none mb-0.5">Hola,</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{firstName}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {profile?.city && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {profile.city}
                    </span>
                  )}
                  {profile?.favoriteClubName && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      {profile.favoriteClubName}
                    </span>
                  )}
                  {!profile?.city && !profile?.favoriteClubName && (
                    <span className="text-xs text-slate-400">
                      Completá tu perfil para recomendaciones personalizadas.
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center self-center shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1.5">
            <Link href="/players/settings">
              <User className="w-3 h-3" />
              Editar perfil
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile actions */}
      <div className="flex items-center mt-4 sm:hidden">
        <Button asChild variant="outline" size="sm" className="rounded-full w-full text-xs h-8 gap-1.5">
          <Link href="/players/settings">
            <User className="w-3 h-3" />
            Editar perfil
          </Link>
        </Button>
      </div>
    </section>
  )
}

// ─── 2. QUICK ACTIONS ─────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div className="space-y-3">
      {/* Hero CTA */}
      <Link
        href="/centros"
        className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-600 transition-all duration-200 hover:-translate-y-0.5"
      >
        <div>
          <p className="text-xs font-medium text-blue-200 leading-none mb-1">¿Listo para jugar?</p>
          <p className="text-lg font-bold text-white leading-tight">Buscar cancha</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Zap className="w-6 h-6 text-white" />
        </div>
      </Link>
      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="#mis-reservas"
          className="group flex flex-col gap-2.5 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
            <CalendarClock className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Mis reservas</p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Próximas y pendientes</p>
          </div>
        </Link>
        <Link
          href="/centros"
          className="group flex flex-col gap-2.5 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Explorar</p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Descubrí nuevos lugares</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─── 3. UPCOMING BOOKINGS ─────────────────────────────────────────────────────

function UpcomingCard({ b }: { b: PlayerBooking }) {
  const day = getDayLabel(b.date)
  const [y, m, d] = b.date.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  const isPending = b.bookingStatus === "pending_payment"

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
      isPending ? "border-amber-200" : "border-slate-100 hover:border-slate-200"
    }`}>
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 ${
        isPending ? "bg-amber-50/30" : ""
      }`}>
        {/* Date pill */}
        <div className={`shrink-0 w-12 rounded-xl p-2 text-center ${day.urgent ? "bg-blue-600" : "bg-slate-100"}`}>
          <p className={`text-[9px] font-bold uppercase ${day.urgent ? "text-blue-200" : "text-slate-400"}`}>
            {dt.toLocaleDateString("es-AR", { month: "short" })}
          </p>
          <p className={`text-lg font-bold leading-none ${day.urgent ? "text-white" : "text-slate-900"}`}>
            {String(d).padStart(2, "0")}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{b.clubName}</span>
            {!isPending && <StatusBadge status={b.bookingStatus} />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {b.courtName}
            {b.sport ? ` · ${SPORT_LABEL[b.sport] || b.sport}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
            {day.urgent && (
              <span className={`font-semibold ${day.color}`}>{day.label}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {b.startTime} – {b.endTime}
            </span>
            {b.price != null && (
              <span className="font-medium text-slate-600 ml-auto">
                {formatCurrency(b.price, b.currency)}
              </span>
            )}
          </div>
        </div>

        {/* CTA for confirmed only */}
        {!isPending && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/centros/${b.clubId}`}
              className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-1.5 transition-colors"
            >
              Ver club
            </Link>
          </div>
        )}
      </div>

      {/* Pending payment bottom action bar */}
      {isPending && (
        <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Pago pendiente</span>
          </div>
          <Link
            href={`/checkout/test/${b.id}`}
            className="rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 transition-colors shadow-sm"
          >
            Completar pago →
          </Link>
        </div>
      )}
    </div>
  )
}

function UpcomingBookings({
  bookings,
  loading,
  error,
}: {
  bookings: PlayerBooking[]
  loading: boolean
  error: string | null
}) {
  return (
    <Section id="mis-reservas" title="Próximas reservas" action="/centros" actionLabel="+ Nueva reserva">
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Sk key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <CalendarClock className="w-9 h-9 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Sin próximas reservas</p>
          <p className="text-xs text-slate-400 mt-1">Reservá una cancha y aparecerá aquí.</p>
          <Button asChild size="sm" className="mt-4 rounded-full">
            <Link href="/centros">Reservar ahora</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => <UpcomingCard key={b.id} b={b} />)}
        </div>
      )}
    </Section>
  )
}

// ─── 4. STATS ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  Icon,
  loading,
}: {
  label: string
  value: string
  Icon: any
  loading: boolean
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="w-3.5 h-3.5 text-slate-300" />
      </div>
      {loading ? <Sk className="h-7 w-14" /> : <p className="text-2xl font-bold text-slate-900">{value}</p>}
    </div>
  )
}

function PlayerStats({ bookings, loading }: { bookings: PlayerBooking[]; loading: boolean }) {
  const s = useMemo(() => computeStats(bookings), [bookings])

  // Don't show until loaded; hide entirely when there's no confirmed-booking data yet
  if (!loading && s.total === 0) return null

  const items = [
    { label: "Totales", value: s.total.toString(), Icon: Trophy },
    { label: "Próximas", value: s.upcoming.toString(), Icon: CalendarClock },
    { label: "Deporte top", value: s.topSport || "—", Icon: Zap },
    { label: "Club top", value: s.topClub || "—", Icon: Building2 },
    { label: "Horas", value: `${s.hours}h`, Icon: Clock },
  ]
  return (
    <Section title="Tus stats">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <StatCard key={item.label} {...item} loading={loading} />
        ))}
      </div>
    </Section>
  )
}

// ─── 5. NOTIFICATIONS ─────────────────────────────────────────────────────────

interface DerivedNotif {
  id: string
  title: string
  message: string
  time: string
  unread: boolean
  Icon: any
  iconBg: string
  iconColor: string
}

function deriveNotifications(bookings: PlayerBooking[]): DerivedNotif[] {
  const today = getToday()
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const out: DerivedNotif[] = []

  for (const b of bookings) {
    if (b.bookingStatus === "pending_payment") {
      out.push({
        id: `pend_${b.id}`,
        title: "Pago pendiente",
        message: `${b.clubName} · ${b.courtName} · ${formatDateShort(b.date)}`,
        time: "Pendiente",
        unread: true,
        Icon: Timer,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
      })
    }
    if (b.bookingStatus === "confirmed" && (b.date === today || b.date === tomorrow)) {
      out.push({
        id: `soon_${b.id}`,
        title: b.date === today ? "Tu turno es hoy" : "Tu turno es mañana",
        message: `${b.clubName} · ${b.startTime} – ${b.endTime}`,
        time: b.date === today ? "Hoy" : "Mañana",
        unread: true,
        Icon: CalendarClock,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
      })
    }
    if (b.bookingStatus === "cancelled") {
      out.push({
        id: `canc_${b.id}`,
        title: "Reserva cancelada",
        message: `${b.clubName} · ${formatDateShort(b.date)}`,
        time: "Reciente",
        unread: false,
        Icon: XCircle,
        iconBg: "bg-red-50",
        iconColor: "text-red-400",
      })
    }
    if (out.length >= 5) break
  }

  return out
}

function Notifications({ bookings, loading }: { bookings: PlayerBooking[]; loading: boolean }) {
  const notifs = useMemo(() => deriveNotifications(bookings), [bookings])
  const unreadCount = notifs.filter((n) => n.unread).length

  // Hide section entirely when there's nothing real to show
  if (!loading && notifs.length === 0) return null

  return (
    <Section title="Notificaciones">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Sk key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {unreadCount > 0 && (
            <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-xs font-medium text-blue-600">{unreadCount} sin leer</p>
            </div>
          )}
          {notifs.map((n, idx) => {
            const Icon = n.Icon
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 ${idx < notifs.length - 1 ? "border-b border-slate-100" : ""} ${n.unread ? "bg-white" : "bg-slate-50/40"}`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.iconBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${n.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.unread ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}>
                      {n.title}
                    </p>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 pt-0.5">{n.time}</span>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── 6. BOOKING HISTORY ───────────────────────────────────────────────────────

function HistoryRow({ b }: { b: PlayerBooking }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{b.clubName}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDateShort(b.date)} · {b.startTime}
          {b.sport ? ` · ${SPORT_LABEL[b.sport] || b.sport}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={b.bookingStatus} />
        {b.price != null && (
          <span className="text-xs font-semibold text-slate-700 hidden sm:block">
            {formatCurrency(b.price, b.currency)}
          </span>
        )}
        <Link
          href={`/centros/${b.clubId}`}
          className="text-slate-400 hover:text-blue-600 transition-colors"
          title="Ver club"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

function BookingHistory({ bookings, loading }: { bookings: PlayerBooking[]; loading: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? bookings : bookings.slice(0, 5)

  return (
    <Section title="Historial de reservas">
      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
          {[1, 2, 3].map((i) => <Sk key={i} className="h-10 w-full" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <History className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Sin historial aún</p>
          <p className="text-xs text-slate-400 mt-1">Tus reservas pasadas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm px-5">
          {visible.map((b) => <HistoryRow key={b.id} b={b} />)}
          {bookings.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center justify-center gap-1.5 w-full py-3.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {expanded ? "Ver menos" : `Ver ${bookings.length - 5} más`}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}
    </Section>
  )
}

// ─── 7. FAVORITES ─────────────────────────────────────────────────────────────

function FavClubCard({ club, onRemove }: { club: FavoriteClub; onRemove: (id: string) => void }) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200">
      {/* Hero */}
      <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-200">
        {club.heroImage && (
          <Image
            src={club.heroImage}
            alt={club.clubName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        )}
        <button
          onClick={() => onRemove(club.clubId)}
          title="Quitar de favoritos"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
        >
          <StarOff className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
      <div className="p-4">
        <p className="font-semibold text-sm text-slate-900 truncate">{club.clubName}</p>
        {club.city && (
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {club.city}
          </p>
        )}
        {club.sports?.length ? (
          <p className="text-xs text-slate-400 mt-1">
            {club.sports.map((s) => SPORT_LABEL[s] || s).join(" · ")}
          </p>
        ) : null}
        <div className="flex gap-2 mt-3">
          <Button asChild size="sm" className="flex-1 rounded-full text-xs h-7 px-3">
            <Link href={`/centros/${club.slug || club.clubId}`}>Reservar</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-full text-xs h-7 px-3">
            <Link href={`/centros/${club.slug || club.clubId}`}>Ver club</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function FavoritesSection({
  favorites,
  loading,
  onRemove,
}: {
  favorites: FavoriteClub[]
  loading: boolean
  onRemove: (id: string) => void
}) {
  return (
    <Section title="Mis favoritos" action="/centros" actionLabel="Explorar más">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => <Sk key={i} className="h-52 w-full" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Heart className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Sin clubes favoritos</p>
          <p className="text-xs text-slate-400 mt-1">Guardá tus preferidos para acceder rápido.</p>
          <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
            <Link href="/centros">Explorar clubes</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((c) => (
            <FavClubCard key={c.clubId} club={c} onRemove={onRemove} />
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── My Tournaments ─────────────────────────────────────────────────────────

const TREG_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  waitlist: "bg-purple-50 text-purple-700 border-purple-200",
}
const TREG_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", paid: "Pagado",
  cancelled: "Cancelado", waitlist: "Lista espera",
}

function MyTournamentsSection({
  registrations, tournaments, loading,
}: {
  registrations: TournamentRegistrationDoc[]
  tournaments: TournamentDoc[]
  loading: boolean
}) {
  return (
    <Section title="Mis torneos">
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <Sk key={i} className="h-20 w-full" />)}
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Trophy className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Sin torneos</p>
          <p className="text-xs text-slate-400 mt-1">Anotate a un torneo desde la página de tu club favorito.</p>
          <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
            <Link href="/centros">Explorar clubes</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {registrations.map((r) => {
            const t = tournaments.find((x) => x.id === r.tournamentId)
            return (
              <div key={r.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t?.name ?? r.tournamentId}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t?.sport}{t?.category ? ` · ${t.category}` : ""}
                  </p>
                </div>
                <span className={`text-xs border rounded-full px-2.5 py-0.5 font-medium shrink-0 ${TREG_STATUS_COLORS[r.registrationStatus] ?? ""}`}>
                  {TREG_STATUS_LABELS[r.registrationStatus] ?? r.registrationStatus}
                </span>
                {t?.clubSlug && (
                  <Link href={`/centros/${t.clubSlug}/torneos/${t.slug}`} className="shrink-0">
                    <ExternalLink className="size-3.5 text-slate-400 hover:text-slate-700" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PlayerDashboardPage() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [bookings, setBookings] = useState<PlayerBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  const [favorites, setFavorites] = useState<FavoriteClub[]>([])
  const [favLoading, setFavLoading] = useState(true)

  const [tournamentRegs, setTournamentRegs] = useState<TournamentRegistrationDoc[]>([])
  const [myTournaments, setMyTournaments] = useState<TournamentDoc[]>([])
  const [tournamentsLoading, setTournamentsLoading] = useState(true)

  // Review popup state
  const [pendingReviews, setPendingReviews] = useState<ReviewBooking[]>([])
  const [skippedReviews, setSkippedReviews] = useState<Set<string>>(new Set())
  const notifyFiredRef = useRef(false)

  const apiFetch = useCallback(async (url: string) => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error("no token")
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`${url} ${res.status}`)
    return res.json()
  }, [])

  useEffect(() => {
    if (!user) return
    apiFetch("/api/players/profile")
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [user, apiFetch])

  useEffect(() => {
    if (!user) return
    apiFetch("/api/players/bookings")
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setBookingsError("No se pudieron cargar tus reservas."))
      .finally(() => setBookingsLoading(false))
  }, [user, apiFetch])

  useEffect(() => {
    if (!user) return
    apiFetch("/api/players/favorites")
      .then((d) => setFavorites(d.favorites ?? []))
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false))
  }, [user, apiFetch])

  useEffect(() => {
    if (!user?.uid) return
    getMyRegistrations(user.uid)
      .then(async (regs) => {
        setTournamentRegs(regs)
        const ids = Array.from(new Set(regs.map((r) => r.tournamentId)))
        const ts = await Promise.all(ids.map((id) => getTournamentById(id)))
        setMyTournaments(ts.filter(Boolean) as TournamentDoc[])
      })
      .catch(() => {})
      .finally(() => setTournamentsLoading(false))
  }, [user?.uid])

  // Trigger review notification emails once per session (lazy email sender)
  useEffect(() => {
    if (!user || notifyFiredRef.current) return
    notifyFiredRef.current = true
    auth.currentUser?.getIdToken().then((token: string) => {
      if (!token) return
      fetch("/api/reviews/notify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* silent */})
    })
  }, [user])

  const today = getToday()

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.date >= today &&
            (b.bookingStatus === "confirmed" || b.bookingStatus === "pending_payment"),
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [bookings, today],
  )

  const pastBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.date < today ||
            b.bookingStatus === "cancelled" ||
            b.bookingStatus === "expired",
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [bookings, today],
  )

  // Compute bookings that need a review (confirmed, ended, not yet reviewed)
  useEffect(() => {
    if (bookingsLoading) return
    const now = new Date()
    const pending = bookings
      .filter((b) => {
        if (b.bookingStatus !== "confirmed") return false
        if (b.reviewSubmitted) return false
        const [y, m, d] = b.date.split("-").map(Number)
        const [eh, em] = (b.endTime || "23:59").split(":").map(Number)
        const endDt = new Date(y, m - 1, d, eh, em)
        return endDt < now
      })
      .map((b) => ({
        id: b.id,
        clubId: b.clubId,
        clubName: b.clubName,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
      }))
    setPendingReviews(pending)
  }, [bookings, bookingsLoading])

  // The first non-skipped pending review to show
  const activeReview = pendingReviews.find((r) => !skippedReviews.has(r.id)) ?? null

  const handleReviewSubmitted = useCallback(() => {
    if (!activeReview) return
    // Remove from pending and mark booking locally as reviewed
    setBookings((prev) => prev.map((b) => b.id === activeReview.id ? { ...b, reviewSubmitted: true } : b))
    setPendingReviews((prev) => prev.filter((r) => r.id !== activeReview.id))
  }, [activeReview])

  const handleReviewSkip = useCallback(() => {
    if (!activeReview) return
    setSkippedReviews((prev) => new Set([...prev, activeReview.id]))
  }, [activeReview])

  const handleRemoveFavorite = useCallback(
    async (clubId: string) => {
      setFavorites((prev) => prev.filter((f) => f.clubId !== clubId))
      try {
        const token = await auth.currentUser?.getIdToken()
        if (token) {
          await fetch(`/api/players/favorites?clubId=${clubId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      } catch { /* silent */ }
    },
    [],
  )

  const userDisplayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email || "Jugador"
    : "Jugador"

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Review popup */}
      {activeReview && auth.currentUser && (
        <ReviewModal
          booking={activeReview}
          userName={userDisplayName}
          token=""
          onSubmitted={handleReviewSubmitted}
          onSkip={handleReviewSkip}
          getToken={() => auth.currentUser!.getIdToken()}
        />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-center h-14">
            <Link href="/" aria-label="Inicio">
              <VoydLogo className="h-9" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-7 pb-24">
        <PlayerHeader profile={profile} loading={profileLoading} userEmail={user?.email} />
        <QuickActions />
        <UpcomingBookings bookings={upcomingBookings} loading={bookingsLoading} error={bookingsError} />
        <PlayerStats bookings={bookings} loading={bookingsLoading} />
        <Notifications bookings={bookings} loading={bookingsLoading} />
        <BookingHistory bookings={pastBookings} loading={bookingsLoading} />
        <FavoritesSection favorites={favorites} loading={favLoading} onRemove={handleRemoveFavorite} />
        <MyTournamentsSection registrations={tournamentRegs} tournaments={myTournaments} loading={tournamentsLoading} />
      </div>
    </main>
  )
}

