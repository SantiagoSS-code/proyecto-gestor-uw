"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, MapPin, Clock } from "lucide-react"

interface Court {
  id: string
  name: string
  indoor: boolean
  surfaceType: string
  pricePerHour: number
  currency: string
  published: boolean
}

type DayConfig = { open: string; close: string; closed: boolean }
type OpeningHours = Record<string, DayConfig>

const WEEK_DAYS = [
  { key: "sunday", label: "Dom" },
  { key: "monday", label: "Lun" },
  { key: "tuesday", label: "Mar" },
  { key: "wednesday", label: "Mie" },
  { key: "thursday", label: "Jue" },
  { key: "friday", label: "Vie" },
  { key: "saturday", label: "Sab" },
]

const defaultOpeningHours: OpeningHours = WEEK_DAYS.reduce((acc, day) => {
  acc[day.key] = { open: "07:00", close: "23:00", closed: false }
  return acc
}, {} as OpeningHours)

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export default function PublicCenterPage() {
  const params = useParams()
  const centerId = params.centerId as string
  const [center, setCenter] = useState<any | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [slotDuration, setSlotDuration] = useState(60)
  const [selectedDuration, setSelectedDuration] = useState(60)
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours)
  const [overrides, setOverrides] = useState<Record<string, OpeningHours>>({})
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [selectedCourtId, setSelectedCourtId] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const centerRef = doc(db, "padel_centers", centerId)
        const centerSnap = await getDoc(centerRef)
        if (centerSnap.exists()) {
          setCenter(centerSnap.data())
        }
        const courtsRef = collection(db, "padel_centers", centerId, "courts")
        const courtsSnap = await getDocs(courtsRef)
        const data = courtsSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Court, "id">) }))
          .filter((court) => court.published)
        setCourts(data)

        const availabilityRef = doc(db, "padel_centers", centerId, "availability", "config")
        const availabilitySnap = await getDoc(availabilityRef)
        if (availabilitySnap.exists()) {
          const config = availabilitySnap.data()
          setSlotDuration(config.slotDuration || 60)
          setSelectedDuration(config.slotDuration || 60)
          setOpeningHours(config.openingHours || defaultOpeningHours)
          setOverrides(config.overrides || {})
        }
      } catch (error) {
        console.error("Error loading center data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (centerId) {
      fetchData()
    }
  }, [centerId])

  const selectedCourt = useMemo(() => {
    if (!courts.length) return undefined
    return courts.find((court) => court.id === selectedCourtId) || courts[0]
  }, [courts, selectedCourtId])

  const slots = useMemo(() => {
    if (loading || !selectedDate || !selectedCourt) return [] as string[]
    const dayIndex = new Date(selectedDate).getDay()
    const dayKey = WEEK_DAYS[dayIndex].key
    const dayConfig = overrides[selectedCourt.id]?.[dayKey] || openingHours[dayKey]
    if (!dayConfig || dayConfig.closed) return [] as string[]
    const start = toMinutes(dayConfig.open)
    const end = toMinutes(dayConfig.close)
    const result: string[] = []
    for (let t = start; t + selectedDuration <= end; t += selectedDuration) {
      result.push(formatTime(t))
    }
    return result
  }, [loading, openingHours, overrides, selectedCourt, selectedDate, selectedDuration])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading center...</div>
  }

  if (!center) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Center not found.</div>
  }

  const handleBooking = async () => {
    if (!selectedCourt || !selectedDate || !selectedTime || !customerName.trim() || !customerEmail.trim()) {
      setBookingMessage("Completa nombre, email, fecha y horario.")
      return
    }

    try {
      setSubmitting(true)
      setBookingMessage(null)
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId,
          courtId: selectedCourt.id,
          courtName: selectedCourt.name,
          date: selectedDate,
          time: selectedTime,
          durationMinutes: selectedDuration,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message = data?.error || `Request failed (${response.status})`
        throw new Error(message)
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      throw new Error("Missing checkout URL")
    } catch (error) {
      console.error("Error creating booking request:", error)
      const message = error instanceof Error ? error.message : "No se pudo crear la reserva. Intenta nuevamente."
      setBookingMessage(message)
      return
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-5xl mx-auto px-4 py-10">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-black">{center.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-black">
              <MapPin className="w-4 h-4" />
              <span>{center.address || "Address not provided"}</span>
            </div>
            <div className="flex items-center gap-2 text-black">
              <Building2 className="w-4 h-4" />
              <span>{center.city}, {center.country}</span>
            </div>
            <div className="flex items-center gap-2 text-black">
              <Clock className="w-4 h-4" />
              <span>Published courts: {courts.length}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {courts.length === 0 ? (
            <div className="text-gray-500">No published courts yet.</div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-black">Canchas disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {courts.map((court) => (
                  <div key={court.id} className="border border-border/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-black">{court.name}</h3>
                        <p className="text-sm text-black">
                          {court.indoor ? "Indoor" : "Outdoor"} · {court.surfaceType}
                        </p>
                      </div>
                      <span className="text-sm text-black">
                        {court.currency} {court.pricePerHour}/hora
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl text-black">Reservar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-black">Nombre</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <Label className="text-black">Email</Label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
              <div>
                <Label className="text-black">Cancha</Label>
                <Select value={selectedCourt?.id || ""} onValueChange={(value) => setSelectedCourtId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cancha" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-black">Fecha</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-black">Horario</Label>
                <div className="flex flex-wrap gap-2">
                  {slots.length === 0 ? (
                    <span className="text-sm text-black">No hay horarios disponibles.</span>
                  ) : (
                    slots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </Button>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-black">Duración</Label>
                <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {bookingMessage ? <p className="text-sm text-black">{bookingMessage}</p> : null}
              <Button onClick={handleBooking} disabled={submitting || !selectedCourt || slots.length === 0}>
                {submitting ? "Creando sesión…" : "Confirmar y pagar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
