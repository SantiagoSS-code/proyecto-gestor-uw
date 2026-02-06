"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingSuccessClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const bookingId = searchParams.get("booking_id")
  const [booking, setBooking] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBooking = async () => {
      if (!sessionId && !bookingId) return
      try {
        const url = sessionId
          ? `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
          : `/api/checkout/booking?booking_id=${encodeURIComponent(bookingId as string)}`
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error("Failed to fetch booking")
        }
        const data = await res.json()
        setBooking(data)
      } catch {
        setError("No pudimos encontrar tu reserva. Revisa tu email o intenta de nuevo.")
      }
    }

    fetchBooking()
  }, [sessionId, bookingId])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-black">Pago confirmado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-black">
          {error ? (
            <p>{error}</p>
          ) : booking ? (
            <div className="space-y-2">
              <p>Tu reserva fue confirmada.</p>
              <p>
                <strong>Cancha:</strong> {booking.courtId}
              </p>
              <p>
                <strong>Fecha:</strong> {booking.dateKey}
              </p>
              <p>
                <strong>Horario:</strong> {new Date(booking.startAt._seconds * 1000).toLocaleTimeString()}
              </p>
              <p>
                <strong>Estado:</strong> {booking.status}
              </p>
            </div>
          ) : (
            <p>Verificando tu reserva...</p>
          )}

          <Link href="/">
            <Button className="mt-2">Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
