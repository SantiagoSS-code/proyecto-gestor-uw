"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

export default function BookingPendingClient() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking_id")

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-black">Pago pendiente</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-black">
          <p>
            Tu pago está siendo procesado. Esto puede demorar unos minutos dependiendo
            del medio de pago seleccionado.
          </p>
          <p className="text-sm text-slate-600">
            Recibirás un email de confirmación cuando el pago sea aprobado y tu reserva
            quede confirmada.
          </p>
          {bookingId ? (
            <p className="text-sm text-slate-500">Referencia: {bookingId}</p>
          ) : null}
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
            <Link href="/clubs">
              <Button>Ver más clubes</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
