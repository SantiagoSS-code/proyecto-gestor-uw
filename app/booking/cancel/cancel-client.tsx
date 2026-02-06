"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingCancelClient() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking_id")

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-black">Pago cancelado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-black">
          <p>Tu pago fue cancelado y la reserva no se confirmó.</p>
          {bookingId ? <p>Referencia: {bookingId}</p> : null}
          <Link href="/">
            <Button className="mt-2">Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
