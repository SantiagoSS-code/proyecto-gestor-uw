"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import {
  getBookingById,
  confirmBooking,
  failBooking,
  expireBooking,
} from "@/lib/booking-service"
import type { PlayerBookingDoc, PlayerBookingStatus } from "@/lib/types"
import { recordRedemption, type CouponValidationResult } from "@/lib/promotions"
import { resolveMembershipBenefit, recordMembershipUsage, type MembershipBenefitApplicationResult } from "@/lib/memberships"
import { CouponInput } from "@/components/players/coupon-input"
import { auth } from "@/lib/firebaseClient"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount: number | null, currency = "ARS") {
  if (amount == null) return "Consultar precio"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  const [actionLoading, setActionLoading] = useState<"confirm" | "fail" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msLeft, setMsLeft] = useState<number | null>(null)
  const expiredRef = useRef(false)
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null)
  const [appliedMembership, setAppliedMembership] = useState<MembershipBenefitApplicationResult | null>(null)

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
              typeof (b.expiresAt as any)?.toDate === "function"
                ? (b.expiresAt as any).toDate().getTime()
                : new Date(b.expiresAt as any).getTime()
            setMsLeft(Math.max(0, expiry - Date.now()))
          }
          // Resolve membership benefit silently
          const uid = auth.currentUser?.uid
          if (uid && b?.clubId && b?.sport && b?.courtId && b?.startTime && b?.date) {
            resolveMembershipBenefit({
              clubId: b.clubId,
              userId: uid,
              sport: b.sport,
              courtId: b.courtId,
              startTime: b.startTime,
              weekday: new Date(`${b.date}T00:00:00`).getDay(),
              originalAmount: b.price ?? 0,
            }).then((result) => {
              if (!cancelled) setAppliedMembership(result)
            }).catch(() => {})
          }
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar la reserva.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [bookingId])

  // ── Countdown + auto-expire ───────────────────────────────────────────────
  useEffect(() => {
    if (msLeft === null || booking?.bookingStatus !== "pending_payment") return
    const tick = setInterval(() => {
      setMsLeft((prev) => {
        if (prev === null) return null
        const next = prev - 1000
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          expireBooking(bookingId).then(() => {
            setBooking((b) => b ? { ...b, bookingStatus: "expired" } : b)
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
      // Record coupon redemption if one was applied
      if (appliedCoupon?.valid && appliedCoupon.discount?.id) {
        const userId = auth.currentUser?.uid ?? booking.userId
        await recordRedemption({
          discountId: appliedCoupon.discount.id,
          clubId: booking.clubId,
          userId,
          bookingId,
          originalAmount: booking.price ?? 0,
          discountAmount: appliedCoupon.discountAmount,
          finalAmount: appliedCoupon.finalAmount,
        }).catch((e) => console.warn("[checkout] redemption record failed", e?.code ?? e?.message))
      }
      // Record membership usage if benefit was applied
      if (appliedMembership?.applied) {
        const userId = auth.currentUser?.uid ?? booking.userId
        await recordMembershipUsage({
          clubId: booking.clubId,
          subscriptionId: appliedMembership.subscriptionId,
          userId,
          discountAmount: appliedMembership.discountAmount,
          reservationIsIncluded: appliedMembership.reservationIsIncluded,
        }).catch((e) => console.warn("[checkout] membership usage record failed", e?.code ?? e?.message))
      }
      fetch("/api/booking/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      }).catch(() => {})
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm">Cargando reserva…</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-300 mx-auto" />
          <p className="font-medium text-slate-700">Reserva no encontrada</p>
          <button
            onClick={() => router.push("/centros")}
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Ver centros disponibles
          </button>
        </div>
      </div>
    )
  }

  const effectiveStatus: PlayerBookingStatus =
    (msLeft !== null && msLeft <= 0 && booking.bookingStatus === "pending_payment")
      ? "expired"
      : booking.bookingStatus

  const isActionable = effectiveStatus === "pending_payment"
  const isExpired    = effectiveStatus === "expired"
  const isConfirmed  = effectiveStatus === "confirmed"
  const isCancelled  = effectiveStatus === "cancelled"
  const isUrgent     = isActionable && msLeft !== null && msLeft < 60_000

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-slate-800 text-sm">Finalizar reserva</span>

        {/* Test badge */}
        <span className="ml-auto text-[11px] font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
          Modo prueba
        </span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-5">

        {/* ── Confirmed / cancelled / expired banners ──────────────────── */}
        {isConfirmed && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-5 flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">¡Reserva confirmada!</p>
              <p className="text-sm text-emerald-700 mt-0.5">Nos vemos en la cancha.</p>
            </div>
          </div>
        )}
        {isCancelled && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-5 flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Reserva cancelada</p>
              <p className="text-sm text-red-600 mt-0.5">El pago no pudo procesarse.</p>
            </div>
          </div>
        )}
        {isExpired && (
          <div className="rounded-2xl bg-slate-100 border border-slate-300 px-5 py-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Reserva expirada</p>
              <p className="text-sm text-slate-500 mt-0.5">El tiempo límite venció y el turno quedó liberado.</p>
            </div>
          </div>
        )}

        {/* ── Booking details card ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Center header */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Centro</p>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{booking.clubName}</h2>
              {/* Status pill */}
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isConfirmed ? "bg-emerald-100 text-emerald-700" :
                isCancelled ? "bg-red-100 text-red-700" :
                isExpired   ? "bg-slate-200 text-slate-600" :
                               "bg-amber-100 text-amber-700"
              }`}>
                {isConfirmed ? <CheckCircle2 className="w-3 h-3" /> :
                 isCancelled ? <XCircle className="w-3 h-3" /> :
                 isExpired   ? <AlertTriangle className="w-3 h-3" /> :
                               <Clock className="w-3 h-3" />}
                {isConfirmed ? "Confirmada" :
                 isCancelled ? "Cancelada"  :
                 isExpired   ? "Expirada"   :
                               "Pendiente"}
              </span>
            </div>
          </div>

          {/* Details rows */}
          <div className="px-5 py-4 space-y-3.5">
            {/* Court + sport */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                🎾
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{booking.courtName}</p>
                {booking.sport && (
                  <p className="text-xs text-slate-400">{SPORT_LABEL[booking.sport] ?? booking.sport}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-800 capitalize">{formatDate(booking.date)}</p>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {booking.startTime} – {booking.endTime}
                </p>
                <p className="text-xs text-slate-400">{booking.durationMinutes} minutos</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
              {(appliedCoupon?.valid && appliedCoupon.discountAmount > 0) ||
               (appliedMembership?.applied && appliedMembership.discountAmount > 0) ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-500">{formatCurrency(booking.price, booking.currency)}</span>
                  </div>
                  {appliedMembership?.applied && appliedMembership.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-violet-600">Membresía</span>
                      <span className="text-violet-600 font-medium">-{formatCurrency(appliedMembership.discountAmount, booking.currency)}</span>
                    </div>
                  )}
                  {appliedCoupon?.valid && appliedCoupon.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600">Descuento ({appliedCoupon.discount?.code})</span>
                      <span className="text-emerald-600 font-medium">-{formatCurrency(appliedCoupon.discountAmount, booking.currency)}</span>
                    </div>
                  )}
                </>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    appliedCoupon?.valid
                      ? appliedCoupon.finalAmount
                      : appliedMembership?.applied
                        ? appliedMembership.finalAmount
                        : (booking.price ?? null),
                    booking.currency,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Membership benefit banner ─────────────────────────────────── */}
        {isActionable && appliedMembership?.applied && (
          <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-3.5 flex items-start gap-3">
            <span className="text-violet-500 text-lg leading-none">💳</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-800">
                {appliedMembership.reservationIsIncluded ? "Reserva incluida en tu membresía" : "Descuento de membresía aplicado"}
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                {appliedMembership.reservationIsIncluded
                  ? "Esta reserva está cubierta por tu plan — sin costo adicional."
                  : `Ahorrás ${formatCurrency(appliedMembership.discountAmount, booking.currency)} con tu membresía.`}
              </p>
            </div>
          </div>
        )}

        {/* ── Coupon input (only while actionable) ─────────────────────── */}
        {isActionable && booking.clubId && (
          <CouponInput
            clubId={booking.clubId}
            userId={auth.currentUser?.uid ?? booking.userId}
            sport={booking.sport}
            courtId={booking.courtId}
            startTime={booking.startTime}
            weekday={new Date(`${booking.date}T00:00:00`).getDay()}
            originalAmount={booking.price ?? 0}
            applied={appliedCoupon}
            onApply={(result) => setAppliedCoupon(result)}
            onRemove={() => setAppliedCoupon(null)}
          />
        )}

        {/* ── Countdown bar ────────────────────────────────────────────── */}
        {isActionable && msLeft !== null && (
          <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between ${
            isUrgent
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isUrgent ? "text-red-500" : "text-amber-600"}`} />
              <span className={`text-sm font-medium ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
                {isUrgent ? "¡Quedan pocos segundos!" : "Tiempo para confirmar"}
              </span>
            </div>
            <span className={`font-mono text-lg font-bold tabular-nums ${
              isUrgent ? "text-red-600" : "text-amber-700"
            }`}>
              {formatCountdown(msLeft)}
            </span>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── CTA area ─────────────────────────────────────────────────── */}
        {isActionable && (
          <div className="space-y-3 pt-1">
            <Button
              className="w-full h-13 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-sm transition-all"
              onClick={handleConfirm}
              disabled={!!actionLoading}
            >
              {actionLoading === "confirm" ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Confirmando…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar pago
                </span>
              )}
            </Button>

            <button
              onClick={handleFail}
              disabled={!!actionLoading}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors disabled:opacity-50"
            >
              {actionLoading === "fail" ? "Procesando…" : "Simular fallo de pago"}
            </button>
          </div>
        )}

        {(isExpired || isCancelled) && (
          <Button
            variant="outline"
            className="w-full rounded-2xl h-12"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver y elegir otro turno
          </Button>
        )}

        {isConfirmed && (
          <Button
            variant="outline"
            className="w-full rounded-2xl h-12"
            onClick={() => router.push("/centros")}
          >
            Ver otros centros
          </Button>
        )}

        {/* ── Test mode footnote ───────────────────────────────────────── */}
        <p className="text-center text-[11px] text-slate-300 pb-2">
          Reserva #{bookingId.slice(0, 8)}…
        </p>

      </div>
    </div>
  )
}
