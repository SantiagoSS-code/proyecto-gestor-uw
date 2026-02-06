"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  MapPin,
  ShowerHead,
  ParkingSquare,
  Wifi,
  Lock,
  Coffee,
  ShoppingBag,
  Info,
} from "lucide-react"
import { FIRESTORE_COLLECTIONS, CENTER_SETTINGS_DOCS, CENTER_SUBCOLLECTIONS, LEGACY_AVAILABILITY_DOCS } from "@/lib/firestorePaths"
import type { AmenityKey, BookingSettings, CenterProfile, CourtDoc, SportKey, ClassDoc, ClassScheduleSlot } from "@/lib/types"
import { minutesToTime, timeToMinutes } from "@/lib/utils"

type CenterResult = { id: string; data: CenterProfile }

type CourtResult = { id: string; data: CourtDoc }

type BookingRow = {
  id: string
  courtId?: string
  startAt?: any
  endAt?: any
  status?: string
  type?: string
}

function BarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3h18l-9 10-9-10Z" />
      <path d="M12 13v6" />
      <path d="M9 19h6" />
    </svg>
  )
}

const amenityMeta: Record<AmenityKey, { label: string; Icon: any }> = {
  bar: { label: "Bar", Icon: BarIcon },
  bathrooms: { label: "Bathrooms", Icon: Info },
  showers: { label: "Showers", Icon: ShowerHead },
  gym: { label: "Gym", Icon: Dumbbell },
  parking: { label: "Parking", Icon: ParkingSquare },
  lockers: { label: "Lockers", Icon: Lock },
  wifi: { label: "Wi‑Fi", Icon: Wifi },
  shop: { label: "Shop", Icon: ShoppingBag },
  cafeteria: { label: "Cafeteria", Icon: Coffee },
}

const sportLabels: Record<SportKey, string> = {
  padel: "Padel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

const weekdayByIndex: Array<{ key: string; label: string }> = [
  { key: "0", label: "Sun" },
  { key: "1", label: "Mon" },
  { key: "2", label: "Tue" },
  { key: "3", label: "Wed" },
  { key: "4", label: "Thu" },
  { key: "5", label: "Fri" },
  { key: "6", label: "Sat" },
]

const weekdayByNumber: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
}

function getCenterCover(center: CenterProfile) {
  return center.coverImageUrl || center.galleryImageUrls?.[0] || null
}

function getGallery(center: CenterProfile) {
  const urls = [center.coverImageUrl, ...(center.galleryImageUrls || [])].filter(Boolean) as string[]
  return Array.from(new Set(urls))
}

async function findCenterBySlug(slug: string): Promise<CenterResult | null> {
  // Must include published==true to satisfy Firestore security rules for unauthenticated reads
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.centers),
    where("slug", "==", slug),
    where("published", "==", true),
    limit(1)
  )
  const snap = await getDocs(q)
  const docSnap = snap.docs[0]
  if (!docSnap) return null
  return { id: docSnap.id, data: docSnap.data() as CenterProfile }
}

async function loadCourts(centerId: string): Promise<CourtResult[]> {
  const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.courts)
  const q = query(courtsRef, where("published", "==", true))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as CourtDoc }))
}

async function loadBookingSettings(centerId: string): Promise<BookingSettings | null> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.booking)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as BookingSettings
  return null
}

async function loadLegacyAvailability(centerId: string): Promise<BookingSettings | null> {
  // Back-compat: old schedule lived at /padel_centers/{id}/availability/config
  const ref = doc(db, FIRESTORE_COLLECTIONS.legacyCenters, centerId, CENTER_SUBCOLLECTIONS.legacyAvailability, LEGACY_AVAILABILITY_DOCS.config)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data: any = snap.data()

  // Old shape used day keys (monday..sunday). Convert to 0-6.
  const dayNameToIndex: Record<string, string> = {
    sunday: "0",
    monday: "1",
    tuesday: "2",
    wednesday: "3",
    thursday: "4",
    friday: "5",
    saturday: "6",
  }

  const openingHours: Record<string, any> = {}
  const src = data.openingHours || {}
  for (const [name, cfg] of Object.entries(src)) {
    const idx = dayNameToIndex[name]
    if (idx) openingHours[idx] = cfg
  }

  return {
    timezone: data.timezone,
    slotDurationMinutes: data.slotDuration || 60,
    openingHours,
  } as BookingSettings
}

async function loadBookingsForDate(centerId: string, dateKey: string): Promise<BookingRow[]> {
  const user = auth.currentUser
  if (!user || user.uid !== centerId) return []
  const start = new Date(`${dateKey}T00:00:00`)
  const end = new Date(`${dateKey}T23:59:59`)

  const ref = collection(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.bookings)
  const q = query(ref, where("startAt", ">=", start), where("startAt", "<=", end))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BookingRow[]
}

async function loadClasses(centerId: string): Promise<ClassDoc[]> {
  const ref = collection(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.classes)
  const snap = await getDocs(ref)
  return snap.docs.map((d) => d.data() as ClassDoc).filter((c) => c.enabled !== false)
}

function toDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === "function") return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function slotDate(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`)
}

function formatSchedule(schedule: ClassScheduleSlot[]) {
  if (!schedule?.length) return "Schedule TBD"
  return schedule
    .map((s) => `${weekdayByNumber[s.dayOfWeek] || ""} ${s.startTime}–${s.endTime}`)
    .join(" · ")
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateKeyInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}

function getMinutesInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0)
  return hour * 60 + minute
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`)
}

export function ClubDetail({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true)
  const [centerId, setCenterId] = useState<string | null>(null)
  const [center, setCenter] = useState<CenterProfile | null>(null)
  const [courts, setCourts] = useState<CourtResult[]>([])
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [classes, setClasses] = useState<ClassDoc[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    getDateKeyInTimeZone("America/Argentina/Buenos_Aires")
  )
  const [selectedSport, setSelectedSport] = useState<SportKey | "">("")
  const [selectedSlot, setSelectedSlot] = useState<{ courtId: string; time: string } | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  // Mercado Pago checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const found = await findCenterBySlug(slug)
        // Query already filters by published==true, so no need to check again
        if (!found) {
          setCenter(null)
          return
        }

        setCenterId(found.id)
        setCenter(found.data)

        const [courtsData, bookingSettings, classesData] = await Promise.all([
          loadCourts(found.id),
          loadBookingSettings(found.id),
          loadClasses(found.id),
        ])

        setCourts(courtsData)
        setClasses(classesData)

        if (bookingSettings) {
          setSettings(bookingSettings)
        } else {
          const legacy = await loadLegacyAvailability(found.id)
          setSettings(legacy)
        }
      } catch (e) {
        console.error("Failed to load club:", e)
        setCenter(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  const gallery = useMemo(() => (center ? getGallery(center) : []), [center])
  const placeId = center?.placeId?.trim() || center?.googlePlaceId?.trim() || null
  const hasPlaceId = Boolean(placeId)

  useEffect(() => {
    if (activeImageIndex >= gallery.length) setActiveImageIndex(0)
  }, [activeImageIndex, gallery.length])

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (!placeId) {
      console.warn("Club map missing googlePlaceId")
      return
    }
    if (!/^ChI/.test(placeId)) {
      console.warn("Club map googlePlaceId looks invalid:", placeId)
    }
  }, [placeId])

  useEffect(() => {
    const load = async () => {
      if (!centerId || !selectedDate) return
      try {
        setBookingLoading(true)
        const items = await loadBookingsForDate(centerId, selectedDate)
        setBookings(items)
      } catch (e) {
        console.error("Failed to load bookings:", e)
        setBookings([])
      } finally {
        setBookingLoading(false)
      }
    }

    load()
  }, [centerId, selectedDate])

  const dayIndex = useMemo(() => parseDateKey(selectedDate).getDay().toString(), [selectedDate])

  const slotDuration = settings?.slotDurationMinutes || 60
  const dayCfg = settings?.openingHours?.[dayIndex]

  const slots = useMemo(() => {
    if (!dayCfg || dayCfg.closed) return [] as string[]
    const start = timeToMinutes(dayCfg.open)
    const end = timeToMinutes(dayCfg.close)
    const result: string[] = []
    const timeZone = settings?.timezone || "America/Argentina/Buenos_Aires"
    const todayKey = getDateKeyInTimeZone(timeZone)
    const nowMinutes = getMinutesInTimeZone(timeZone)

    for (let t = start; t + slotDuration <= end; t += slotDuration) {
      if (selectedDate === todayKey && t + slotDuration <= nowMinutes) {
        continue
      }
      result.push(minutesToTime(t))
    }
    return result
  }, [dayCfg, slotDuration, selectedDate, settings?.timezone])

  const availableSports = useMemo(() => {
    const fromProfile = (center?.sports || []).filter(Boolean) as SportKey[]
    if (fromProfile.length) return Array.from(new Set(fromProfile))
    const fromCourts = courts.map((c) => c.data.sport).filter(Boolean) as SportKey[]
    return Array.from(new Set(fromCourts))
  }, [center?.sports, courts])

  useEffect(() => {
    if (availableSports.length && !selectedSport) {
      setSelectedSport(availableSports[0])
    }
  }, [availableSports, selectedSport])

  const filteredCourts = useMemo(() => {
    if (!selectedSport) return courts
    return courts.filter((c) => c.data.sport === selectedSport)
  }, [courts, selectedSport])

  const bookingByCourt = useMemo(() => {
    const map = new Map<string, BookingRow[]>()
    bookings.forEach((b) => {
      if (!b.courtId || b.status === "cancelled" || b.type === "class") return
      const arr = map.get(b.courtId) || []
      arr.push(b)
      map.set(b.courtId, arr)
    })
    return map
  }, [bookings])

  const isSlotBooked = (courtId: string, time: string) => {
    const items = bookingByCourt.get(courtId) || []
    if (!items.length) return false
    const slotStart = slotDate(selectedDate, time)
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)
    return items.some((b) => {
      const startAt = toDate(b.startAt)
      const endAt = toDate(b.endAt)
      if (!startAt || !endAt) return false
      return startAt < slotEnd && endAt > slotStart
    })
  }

  if (loading) {
    return <div className="container mx-auto px-4 pt-24 pb-16 text-muted-foreground">Loading club…</div>
  }

  if (!center || !centerId) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle>Club not found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This club is not published or does not exist.
          </CardContent>
        </Card>
      </div>
    )
  }

  const locationAddress =
    center.location?.fullAddress ||
    [center.address, center.city, center.country].filter(Boolean).join(", ")

  const mapLink = hasPlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}&query_place_id=${placeId}`
    : null

  // Use Google Maps embed with Place ID - simple query format
  const mapSrc = hasPlaceId
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=place_id:${placeId}&zoom=16`
    : null

  const amenities = (center.amenities || []).filter((a) => a in amenityMeta)

  const heroCover = getCenterCover(center)
  const selectedCourt = selectedSlot ? courts.find((c) => c.id === selectedSlot.courtId) : null
  const selectedPrice = selectedCourt?.data.pricePerHour
  const selectedCurrency = selectedCourt?.data.currency || "ARS"
  const totalPrice = typeof selectedPrice === "number" ? Number(((selectedPrice * slotDuration) / 60).toFixed(2)) : null

  const handleReservar = async () => {
    if (!selectedSlot || !selectedCourt || !centerId || !center) return

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const user = auth.currentUser
      const payload = {
        centerId,
        courtId: selectedSlot.courtId,
        date: selectedDate,
        time: selectedSlot.time,
        durationMinutes: slotDuration,
        customerName: user?.displayName || "Invitado",
        customerEmail: user?.email || "guest@courtly.app",
        userId: user?.uid || null,
      }

      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "Slot already booked") {
          setCheckoutError("Este horario ya fue reservado. Por favor elegí otro.")
        } else {
          setCheckoutError(data.error || "Error al crear la reserva. Intentá de nuevo.")
        }
        return
      }

      if (!data.checkoutUrl) {
        setCheckoutError("No se pudo obtener el link de pago. Intentá de nuevo.")
        return
      }

      // Redirect to Mercado Pago Checkout
      window.location.href = data.checkoutUrl
    } catch (err) {
      console.error("Error creating checkout:", err)
      setCheckoutError("Error de conexión. Verificá tu internet e intentá de nuevo.")
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6">
          <Card className="border border-border/50 overflow-hidden">
            <div className="relative h-[320px] md:h-[420px] bg-muted">
              {gallery.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gallery[activeImageIndex]}
                  alt={center.name}
                  className="w-full h-full object-cover"
                />
              ) : heroCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroCover} alt={center.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100" />
              )}

              {gallery.length > 1 ? (
                <>
                  <button
                    onClick={() => setActiveImageIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-900" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((i) => (i + 1) % gallery.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-900" />
                  </button>
                </>
              ) : null}
            </div>

            {gallery.length > 1 ? (
              <div className="p-4 flex gap-3 overflow-x-auto">
                {gallery.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-16 w-24 object-cover rounded-lg cursor-pointer border ${idx === activeImageIndex ? "border-blue-600" : "border-slate-200"}`}
                  />
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-slate-900">{center.name}</CardTitle>
              <div className="mt-2 space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  {mapLink ? (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {locationAddress || "Ubicación por definir"}
                    </a>
                  ) : (
                    <span className="text-sm">{locationAddress || "Ubicación por definir"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">{courts.length} courts published</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableSports.length ? (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-2">Sports</div>
                  <div className="flex flex-wrap gap-2">
                    {availableSports.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full bg-slate-100 text-slate-900 px-3 py-1 text-xs font-medium"
                      >
                        {sportLabels[s as SportKey] || s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {amenities.length ? (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-2">Amenities</div>
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map((a) => {
                      const meta = amenityMeta[a as AmenityKey]
                      const Icon = meta.Icon
                      return (
                        <div key={a} className="flex items-center gap-2 text-sm text-slate-700">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span>{meta.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-900 font-medium">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Bookings (MVP)
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Choose a date to see available slots.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                {hasPlaceId && mapSrc ? (
                  <div className="relative h-[260px]">
                    <iframe
                      title="map"
                      src={mapSrc}
                      className="absolute inset-0 h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{ border: 0 }}
                    />
                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0"
                        aria-label="Abrir ubicación en Google Maps"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-[260px] items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">
                    Ubicación sin Place ID. Configurá el Google Place ID en el perfil del club.
                  </div>
                )}
                <div className="border-t border-slate-200 px-4 py-3">
                  {locationAddress ? (
                    mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-slate-900 hover:underline"
                      >
                        {locationAddress}
                      </a>
                    ) : (
                      <div className="text-base font-semibold text-slate-900">{locationAddress}</div>
                    )
                  ) : (
                    <div className="text-base font-semibold text-slate-900">Ubicación por definir</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-700 whitespace-pre-wrap">
              {center.description || "No description yet."}
            </CardContent>
          </Card>
        </div>

        {/* Availability + Booking */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.6fr_0.8fr] gap-6">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Elige tu turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-3">
                  <div className="min-w-[180px]">
                    <Label>Deporte</Label>
                    <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportKey)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar deporte" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSports.map((s) => (
                          <SelectItem key={s} value={s}>
                            {sportLabels[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <button
                    className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                    onClick={() => setSelectedDate((d) => addDays(d, -1))}
                    aria-label="Día anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-medium text-slate-900">
                    {parseDateKey(selectedDate).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </div>
                  <button
                    className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    aria-label="Día siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="text-xs text-slate-500 ml-2 hidden md:block">
                    {settings?.timezone ? `Zona horaria: ${settings.timezone}` : "Zona horaria sin configurar"} · {slotDuration} min · {weekdayByIndex[Number(dayIndex)]?.label}
                  </div>
                </div>
              </div>

              {courts.length === 0 ? (
                <div className="text-slate-600">No published courts yet.</div>
              ) : !settings || !dayCfg ? (
                <div className="text-slate-600">
                  Booking settings not configured yet. Ask the club admin to set opening hours in the dashboard.
                </div>
              ) : dayCfg.closed ? (
                <div className="text-slate-600">Closed on this day.</div>
              ) : slots.length === 0 ? (
                <div className="text-slate-600">No slots available for the selected day.</div>
              ) : (
                <>
                  <div className="block">
                    <div className="overflow-auto rounded-xl border border-slate-200">
                      <div className="min-w-[860px]">
                        <div
                          className="grid grid-cols-[220px_repeat(var(--slot-count),minmax(52px,1fr))]"
                          style={{ "--slot-count": slots.length } as any}
                        >
                          <div className="md:sticky md:left-0 top-0 z-10 bg-white border-b border-slate-200 p-3 text-xs font-semibold text-slate-600">
                            Canchas
                          </div>
                          {slots.map((t) => (
                            <div key={t} className="sticky top-0 z-10 bg-white border-b border-slate-200 p-3 text-xs font-semibold text-slate-600 text-center">
                              {t}
                            </div>
                          ))}

                          {filteredCourts.map((court) => (
                            <div key={court.id} className="contents">
                              <div className="md:sticky md:left-0 bg-white border-b border-slate-100 p-3">
                                <div className="text-sm font-semibold text-slate-900">{court.data.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {(court.data.sport ? sportLabels[court.data.sport as SportKey] : "Padel")}
                                  {court.data.surfaceType ? ` · ${court.data.surfaceType}` : ""}
                                  {typeof court.data.indoor === "boolean" ? ` · ${court.data.indoor ? "Cubierta" : "Descubierta"}` : ""}
                                </div>
                              </div>
                              {slots.map((t) => {
                                const booked = isSlotBooked(court.id, t)
                                const active = selectedSlot?.courtId === court.id && selectedSlot.time === t
                                return (
                                  <button
                                    key={`${court.id}-${t}`}
                                    title={t}
                                    className={`border-b border-slate-100 px-2 py-2 text-xs text-center transition-all ${
                                      booked
                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        : active
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white hover:bg-emerald-50 text-slate-700"
                                    }`}
                                    onClick={() => (!booked ? setSelectedSlot({ courtId: court.id, time: t }) : null)}
                                    disabled={booked}
                                    aria-label={`Turno ${t} en ${court.data.name}`}
                                  />
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm border border-slate-200 bg-white" /> Disponible
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm border border-slate-200 bg-slate-200" /> No disponible
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm border border-emerald-500 bg-emerald-500" /> Tu reserva
                    </div>
                    {bookingLoading ? <span>Actualizando disponibilidad…</span> : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 h-fit">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="text-sm text-slate-600">Turno seleccionado</div>
                <div className="text-base font-semibold text-slate-900">
                  {selectedCourt ? selectedCourt.data.name : "Seleccioná un horario"}
                </div>
                <div className="text-sm text-slate-600">
                  {selectedSlot ? `${selectedDate} · ${selectedSlot.time}` : "Elegí un turno en la grilla"}
                </div>
                <div className="text-sm text-slate-600">
                  {selectedCourt?.data.sport ? sportLabels[selectedCourt.data.sport as SportKey] : ""}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Precio por hora</span>
                  <span className="text-slate-900">
                    {typeof selectedPrice === "number" ? `${selectedCurrency} ${selectedPrice}` : "Consultar"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="text-slate-900">
                    {typeof totalPrice === "number" ? `${selectedCurrency} ${totalPrice}` : "—"}
                  </span>
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!selectedSlot || !selectedCourt || checkoutLoading}
                onClick={handleReservar}
              >
                {checkoutLoading ? "Redirigiendo a Mercado Pago…" : "Reservar"}
              </Button>
              {checkoutError ? (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {checkoutError}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Pagá de forma segura con Mercado Pago.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Amenities */}
        {amenities.length ? (
          <div className="mt-10">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
                      {amenityMeta[a as AmenityKey].label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Classes */}
        {center.classesEnabled && classes.length ? (
          <div className="mt-10">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((cls) => (
                    <div key={`${cls.name}-${cls.sport}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{cls.name}</div>
                          <div className="text-sm text-slate-600">{sportLabels[cls.sport]}</div>
                          {cls.coachName ? <div className="text-xs text-slate-500 mt-1">Coach: {cls.coachName}</div> : null}
                        </div>
                        <div className="text-sm text-slate-700">
                          {cls.currency || "ARS"} {cls.price}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 mt-3">{formatSchedule(cls.recurringSchedule || [])}</div>
                      <div className="text-xs text-slate-600 mt-1">Duration: {cls.durationMinutes} min · Capacity: {cls.capacity}</div>
                      <Button className="mt-4" variant="outline" onClick={() => window.alert("Class booking flow coming soon.")}>Book class</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Extra photos */}
        {gallery.length > 0 ? (
          <div className="mt-10">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gallery.slice(0, 9).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
