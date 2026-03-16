"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  User,
  Mail,
  ArrowRight,
} from "lucide-react"
import { getBookingById } from "@/lib/booking-service"
import type { PlayerBookingDoc } from "@/lib/types"

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

function formatCurrency(amount: number | null | undefined, currency: string) {
  if (amount == null) return "A confirmar"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

type BookingWithId = PlayerBookingDoc & { id: string }

export default function BookingSuccessClient() {
  const searchParams = useSearchParams()
  const [booking, setBooking] = useState<BookingWithId | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const bookingId = searchParams?.get("bookingId")
    const source = searchParams?.get("source")

    if (!bookingId) {
      setError("No se encontró la reserva.")
      setLoading(false)
      return
    }

    // Test checkout: read directly from Firestore via booking service
    if (source === "test") {
      getBookingById(bookingId)
        .then((b) => {
          if (!b) setError("Reserva no encontrada.")
          else setBooking(b)
        })
        .catch(() => setError("No se pudo cargar la reserva."))
        .finally(() => setLoading(false))
      return
    }

    // Legacy: Stripe/MP session-based lookup
    const sessionId = searchParams?.get("session_id")
    const legacyId = searchParams?.get("booking_id")
    const url = sessionId
      ? `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
      : `/api/checkout/booking?booking_id=${encodeURIComponent(legacyId ?? bookingId)}`

    fetch(url)
      .then((r) => r.json())
      .then((data) => setBooking(data))
      .catch(() => setError("No pudimos encontrar tu reserva."))
      .finally(() => setLoading(false))
  }, [searchParams])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm">Cargando confirmación…</div>
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <p className="text-slate-700">{error || "Reserva no encontrada."}</p>
            <Link href="/centros"><Button variant="outline">Ver clubes</Button></Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-lg space-y-6">

        {/* Success hero */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">¡Reserva confirmada!</h1>
          <p className="text-slate-500 text-sm">
            Te enviamos un email de confirmación a{" "}
            <span className="font-medium text-slate-700">{booking.userEmail}</span>
          </p>
        </div>

        {/* Booking card */}
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-4">

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 text-lg">{booking.clubName}</div>
                <div className="text-sm text-slate-500">
                  {booking.courtName}
                  {booking.sport ? ` · ${SPORT_LABEL[booking.sport] || booking.sport}` : ""}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Fecha</div>
                  <div className="text-sm font-semibold text-slate-900 capitalize">
                    {formatDate(booking.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Horario</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {booking.startTime} – {booking.endTime}
                    <span className="font-normal text-slate-400 ml-1">
                      ({booking.durationMinutes} min)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Jugador</div>
                  <div className="text-sm font-semibold text-slate-900">{booking.userName}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Email</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{booking.userEmail}</div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mt-2">
              <span className="text-sm text-slate-600 font-medium">Total pagado</span>
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(booking.price, booking.currency)}
              </span>
            </div>

            {/* Booking ID */}
            <p className="text-center text-xs text-slate-400">
              ID: <span className="font-mono">{booking.id}</span>
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/players/dashboard#mis-reservas" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              Ver mis reservas
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/centros" className="flex-1">
            <Button variant="outline" className="w-full">
              Explorar otros clubes
            </Button>
          </Link>
        </div>

      </div>
    </main>
  )
}
