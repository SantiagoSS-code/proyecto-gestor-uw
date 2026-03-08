"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import {
  getBookingById,
  confirmBooking,
  failBooking,
  expireBooking,
} from "@/lib/booking-service"
import type { PlayerBookingDoc, PlayerBookingStatus, PaymentStatus } from "@/lib/types"

// ─── Badge component ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  PlayerBookingStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  pending_payment: {
    label: "Pago pendiente",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    Icon: Clock,
  },
  confirmed: {
    label: "Confirmada",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-50 text-red-700 border border-red-200",
    Icon: XCircle,
  },
  expired: {
    label: "Expirada",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
    Icon: AlertTriangle,
  },
}

function StatusBadge({ status }: { status: PlayerBookingStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.Icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cfg.className}`}
    >
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  )
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado ✓",
  failed: "Fallido ✗",
}

// ─── Sport labels ─────────────────────────────────────────────────────────────
const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return "Consultar"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00"
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CheckoutTestClient() {
  const params = useParams()
  const bookingId = Array.isArray(params.bookingId)
    ? params.bookingId[0]
    : (params.bookingId as string)
  const router = useRouter()

  type BookingWithId = PlayerBookingDoc & { id: string }

  const [booking, setBooking] = useState<BookingWithId | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // "confirm" | "fail"
  const [error, setError] = useState<string | null>(null)
  const [msLeft, setMsLeft] = useState<number | null>(null)
  const expiredRef = useRef(false)

  // ── Load booking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return
    let cancelled = false

    ;(async () => {
      try {
        const b = await getBookingById(bookingId)
        if (!cancelled) {
          setBooking(b)
          if (b?.expiresAt) {
            const expiry: number =
              typeof b.expiresAt?.toDate === "function"
                ? b.expiresAt.toDate().getTime()
                : new Date(b.expiresAt).getTime()
            setMsLeft(Math.max(0, expiry - Date.now()))
          }
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar la reserva.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bookingId])

  // ── Countdown + auto-expire ───────────────────────────────────────────────
  useEffect(() => {
    if (msLeft === null) return
    if (booking?.bookingStatus !== "pending_payment") return

    const tick = setInterval(async () => {
      setMsLeft((prev) => {
        if (prev === null) return null
        const next = prev - 1000
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          // Fire-and-forget: mark expired in Firestore, then refresh state
          expireBooking(bookingId).then(() => {
            setBooking((b) =>
              b ? { ...b, bookingStatus: "expired", paymentStatus: "pending" } : b,
            )
          })
          clearInterval(tick)
          return 0
        }
        return Math.max(0, next)
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [msLeft, booking?.bookingStatus, bookingId])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!booking) return
    setActionLoading("confirm")
    setError(null)
    try {
      await confirmBooking(bookingId)
      // Fire-and-forget emails (don't block redirect on email failure)
      fetch("/api/booking/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      }).catch(() => {}) // silent fail — booking is already confirmed
      router.push(`/booking/success?bookingId=${encodeURIComponent(bookingId)}&source=test`)
    } catch {
      setError("No se pudo confirmar el pago. Intentá de nuevo.")
      setActionLoading(null)
    }
  }

  const handleFail = async () => {
    if (!booking) return
    setActionLoading("fail")
    setError(null)
    try {
      await failBooking(bookingId)
      router.push(`/booking/cancel?bookingId=${bookingId}&source=test`)
    } catch {
      setError("No se pudo procesar el fallo. Intentá de nuevo.")
      setActionLoading(null)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Cargando reserva…</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-slate-700 font-medium">Reserva no encontrada</p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isActionable = booking.bookingStatus === "pending_payment" && (msLeft ?? 1) > 0
  const isExpired = booking.bookingStatus === "expired" || (msLeft !== null && msLeft <= 0 && booking.bookingStatus === "pending_payment")

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-lg">

        {/* Test mode banner */}
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Modo de prueba.</span> Este checkout simula el flujo de pago.
            Será reemplazado por Mercado Pago.
          </p>
        </div>

        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Checkout</CardTitle>
              <StatusBadge status={isExpired && booking.bookingStatus !== "expired" ? "expired" : booking.bookingStatus} />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Booking summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold">{booking.clubName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-4 h-4 shrink-0 text-blue-600 flex items-center justify-center text-xs font-bold">◈</div>
                <span>
                  {booking.courtName}
                  {booking.sport ? ` · ${SPORT_LABEL[booking.sport] || booking.sport}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="capitalize">{formatDate(booking.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {booking.startTime} – {booking.endTime}
                  <span className="text-slate-400 ml-2">({booking.durationMinutes} min)</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{booking.userName}</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">Total a pagar</span>
              </div>
              <span className="font-bold text-slate-900 text-lg">
                {formatCurrency(booking.price, booking.currency)}
              </span>
            </div>

            {/* Countdown (only while pending) */}
            {isActionable && msLeft !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tiempo para confirmar</span>
                <span
                  className={`font-mono font-semibold ${
                    msLeft < 60_000 ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {formatCountdown(msLeft)}
                </span>
              </div>
            )}

            {/* Expired state */}
            {isExpired && (
              <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-center text-slate-600 text-sm">
                Esta reserva expiró. El turno quedó liberado.
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            {isActionable ? (
              <div className="space-y-3">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleConfirm}
                  disabled={!!actionLoading}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading === "confirm" ? "Confirmando…" : "Confirmar pago"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
                  onClick={handleFail}
                  disabled={!!actionLoading}
                >
                  <XCircle className="w-4 h-4" />
                  {actionLoading === "fail" ? "Procesando…" : "Simular fallo de pago"}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-slate-500 gap-2"
                  onClick={() => router.back()}
                  disabled={!!actionLoading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver (dejar pendiente)
                </Button>
              </div>
            ) : !isExpired ? (
              // Already resolved state (confirmed / cancelled shown after redirect, 
              // but just in case user navigates back)
              <div className="space-y-3">
                <div className="text-center text-sm text-slate-500 py-2">
                  {booking.bookingStatus === "confirmed"
                    ? "✅ Reserva confirmada. ¡Nos vemos en la cancha!"
                    : "❌ Esta reserva fue cancelada."}
                  <span className="block text-xs mt-1">
                    Pago: {PAYMENT_LABEL[booking.paymentStatus]}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => router.push("/clubs")}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ver otros clubes
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4" />
                Volver y elegir otro turno
              </Button>
            )}

            {/* Footer note */}
            <p className="text-center text-xs text-slate-400 pt-2">
              ID de reserva: <span className="font-mono">{bookingId}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
