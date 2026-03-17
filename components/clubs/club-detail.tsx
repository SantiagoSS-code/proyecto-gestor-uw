"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { addDoc, collection, doc, getDoc, getDocs, increment, limit, query, updateDoc, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  MapPin,
  ShowerHead,
  ParkingSquare,
  Wifi,
  Lock,
  Coffee,
  ShoppingBag,
  Info,
  Star,
  Clock,
  Users,
  ArrowLeft,
  X,
  CheckCircle2,
  Phone,
  Mail,
  User,
} from "lucide-react"
import { FIRESTORE_COLLECTIONS, CENTER_SETTINGS_DOCS, CENTER_SUBCOLLECTIONS, LEGACY_AVAILABILITY_DOCS } from "@/lib/firestorePaths"
import type { AmenityKey, BookingSettings, CenterProfile, CourtDoc, SportKey, ClassDoc, ClassScheduleSlot, OperationSettings } from "@/lib/types"
import type { Course } from "@/lib/courses-types"
import { minutesToTime, timeToMinutes } from "@/lib/utils"
import {
  createPendingBooking,
  loadActiveBookingsForDate,
  type BookingSlotInfo,
} from "@/lib/booking-service"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

type CenterResult = { id: string; data: CenterProfile }
type CourtResult = { id: string; data: CourtDoc }

/* Icons */

function BarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 3h18l-9 10-9-10Z" />
      <path d="M12 13v6" />
      <path d="M9 19h6" />
    </svg>
  )
}

/* Constants */

const amenityMeta: Record<AmenityKey, { label: string; Icon: any }> = {
  bar: { label: "Bar", Icon: BarIcon },
  bathrooms: { label: "Ba\u00f1os", Icon: Info },
  showers: { label: "Duchas", Icon: ShowerHead },
  gym: { label: "Gimnasio", Icon: Dumbbell },
  parking: { label: "Estacionamiento", Icon: ParkingSquare },
  lockers: { label: "Lockers", Icon: Lock },
  wifi: { label: "Wi\u2011Fi", Icon: Wifi },
  shop: { label: "Tienda", Icon: ShoppingBag },
  cafeteria: { label: "Cafeter\u00eda", Icon: Coffee },
}

const sportLabels: Record<SportKey, string> = {
  padel: "Padel",
  tennis: "Tennis",
  futbol: "F\u00fatbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

const weekdayByIndex: Array<{ key: string; label: string }> = [
  { key: "0", label: "Dom" },
  { key: "1", label: "Lun" },
  { key: "2", label: "Mar" },
  { key: "3", label: "Mi\u00e9" },
  { key: "4", label: "Jue" },
  { key: "5", label: "Vie" },
  { key: "6", label: "S\u00e1b" },
]

const calDayHeaders = ["lu", "ma", "mi", "ju", "vi", "s\u00e1", "do"]
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const GRID_INTERVAL_MINUTES = 30
const DEFAULT_OPEN_TIME = "09:00"
const DEFAULT_CLOSE_TIME = "22:00"
const DEFAULT_SLOT_DURATION_MINUTES = 60

/* Helpers */

function getCenterCover(center: CenterProfile) {
  return center.coverImageUrl || center.galleryImageUrls?.[0] || null
}

function getGallery(center: CenterProfile) {
  const urls = [center.coverImageUrl, ...(center.galleryImageUrls || [])].filter(Boolean) as string[]
  return Array.from(new Set(urls))
}

function timeToDecimal(time: string) {
  const [h, m] = String(time || "00:00").split(":").map(Number)
  return h + (m || 0) / 60
}

function decimalToTime(dec: number): string {
  const h = String(Math.floor(dec)).padStart(2, "0")
  const m = String(Math.round((dec % 1) * 60)).padStart(2, "0")
  return `${h}:${m}`
}

function addTime(time: string, durationHours: number): string {
  return decimalToTime(timeToDecimal(time) + durationHours)
}

function buildTimeSlots(startTime: string, endTime: string, intervalMinutes: number) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const slots: string[] = []
  for (let t = start; t < end; t += intervalMinutes) {
    slots.push(minutesToTime(t))
  }
  return slots
}

function buildFullHours(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const hours: string[] = []
  for (let t = start; t < end; t += 60) {
    hours.push(minutesToTime(t))
  }
  return hours
}

function buildDurationOptions(operations: OperationSettings | null, fallbackMinutes: number) {
  if (!operations) return [fallbackMinutes / 60]
  const options: number[] = []
  for (let value = operations.minSlotMinutes; value <= operations.maxSlotMinutes; value += operations.slotStepMinutes) {
    options.push(value / 60)
  }
  if (!options.includes(operations.maxSlotMinutes / 60) && operations.maxSlotMinutes >= operations.minSlotMinutes) {
    options.push(operations.maxSlotMinutes / 60)
  }
  return options
}

function formatDurationHours(hours: number) {
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  if (minutes === 0) return `${whole}:00 hs`
  return `${whole}:${String(minutes).padStart(2, "0")} hs`
}

function dateToKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isSameDay(a: string, b: string) {
  return a === b
}

/* Data loaders */

async function findCenterBySlug(slug: string): Promise<CenterResult | null> {
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

async function loadOperationSettings(centerId: string): Promise<OperationSettings | null> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.operations)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as OperationSettings
  return null
}

async function loadLegacyAvailability(centerId: string): Promise<BookingSettings | null> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.legacyCenters, centerId, CENTER_SUBCOLLECTIONS.legacyAvailability, LEGACY_AVAILABILITY_DOCS.config)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data: any = snap.data()
  const dayNameToIndex: Record<string, string> = { sunday: "0", monday: "1", tuesday: "2", wednesday: "3", thursday: "4", friday: "5", saturday: "6" }
  const openingHours: Record<string, any> = {}
  const src = data.openingHours || {}
  for (const [name, cfg] of Object.entries(src)) {
    const idx = dayNameToIndex[name]
    if (idx) openingHours[idx] = cfg
  }
  return { timezone: data.timezone, slotDurationMinutes: data.slotDuration || 60, openingHours } as BookingSettings
}

async function loadClasses(centerId: string): Promise<ClassDoc[]> {
  const ref = collection(db, FIRESTORE_COLLECTIONS.centers, centerId, CENTER_SUBCOLLECTIONS.classes)
  const snap = await getDocs(ref)
  return snap.docs.map((d) => d.data() as ClassDoc).filter((c) => c.enabled !== false)
}

function formatSchedule(schedule: ClassScheduleSlot[]) {
  if (!schedule?.length) return "Horario por definir"
  return schedule.map((s) => `${weekdayByIndex[s.dayOfWeek]?.label || ""} ${s.startTime}\u2013${s.endTime}`).join(" \u00b7 ")
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateKeyInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
  return formatter.format(new Date())
}

function getMinutesInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false })
  const parts = formatter.formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0)
  return hour * 60 + minute
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`)
}

/* Calendar Dropdown \u2013 same design as center dashboard */

function CalendarDropdown({
  selectedDate,
  onSelect,
}: {
  selectedDate: string
  onSelect: (dateKey: string) => void
}) {
  const [open, setOpen] = useState(false)
  const parsed = parseDateKey(selectedDate)
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const items: Array<{ day: number; month: number; year: number; current: boolean }> = []

    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      items.push({ day: prevMonthDays - i, month: viewMonth - 1, year: viewYear, current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ day: d, month: viewMonth, year: viewYear, current: true })
    }
    while (items.length < 42) {
      const nextDay = items.length - startDow - daysInMonth + 1
      items.push({ day: nextDay, month: viewMonth + 1, year: viewYear, current: false })
    }
    return items
  }, [viewMonth, viewYear])

  const displayDate = parseDateKey(selectedDate)
  const displayLabel = displayDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm transition-all duration-200 text-slate-900 font-medium text-sm whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
        {displayLabel}
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
                else setViewMonth((m) => m - 1)
              }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-900">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
                else setViewMonth((m) => m + 1)
              }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {calDayHeaders.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-600 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const cellDate = new Date(cell.year, cell.month, cell.day)
              const cellKey = dateToKey(cellDate)
              const isSelected = isSameDay(cellKey, selectedDate)
              const today = dateToKey(new Date())
              const isToday = isSameDay(cellKey, today)

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!cell.current}
                  onClick={() => {
                    if (!cell.current) return
                    onSelect(cellKey)
                    setOpen(false)
                  }}
                  className={`p-2 text-xs rounded transition-colors ${
                    !cell.current
                      ? "text-slate-300 cursor-not-allowed"
                      : isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : isToday
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "hover:bg-slate-100 text-slate-900"
                  }`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* Main Component */

export function ClubDetail({ slug }: { slug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [centerId, setCenterId] = useState<string | null>(null)
  const [center, setCenter] = useState<CenterProfile | null>(null)
  const [courts, setCourts] = useState<CourtResult[]>([])
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [operationSettings, setOperationSettings] = useState<OperationSettings | null>(null)
  const [classes, setClasses] = useState<ClassDoc[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const dateParam = searchParams.get("date")
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const d = new Date(`${dateParam}T00:00:00`)
      if (!isNaN(d.getTime())) return dateParam
    }
    return getDateKeyInTimeZone("America/Argentina/Buenos_Aires")
  })
  const [selectedSport, setSelectedSport] = useState<SportKey | "">("")
  const [slotPreview, setSlotPreview] = useState<{ courtId: string; startTime: string; duration: number } | null>(null)
  const [confirmedSlot, setConfirmedSlot] = useState<{ courtId: string; startTime: string; duration: number } | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [bookings, setBookings] = useState<BookingSlotInfo[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Course enrollment
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null)
  const [enrollForm, setEnrollForm] = useState({ playerName: "", playerEmail: "", playerPhone: "" })
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)
  const slotPreviewPopoverRef = useRef<HTMLDivElement>(null)
  const hasScrolledToTimeRef = useRef(false)

  const handleOpenEnroll = (course: Course) => {
    const user = auth.currentUser
    setEnrollCourse(course)
    setEnrollSuccess(false)
    setEnrollError(null)
    setEnrollForm({
      playerName: user?.displayName || "",
      playerEmail: user?.email || "",
      playerPhone: "",
    })
  }

  const handleEnrollSubmit = async () => {
    if (!enrollCourse || !centerId) return
    if (!enrollForm.playerName.trim() || !enrollForm.playerEmail.trim()) {
      setEnrollError("Por favor completá tu nombre y email.")
      return
    }
    const user = auth.currentUser
    if (!user) {
      // Save intent and redirect to login
      sessionStorage.setItem("voyd_enroll_draft", JSON.stringify({ slug, courseId: enrollCourse.id }))
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    setEnrollLoading(true)
    setEnrollError(null)
    try {
      const now = new Date().toISOString()
      const spotsLeft = enrollCourse.maximumCapacity - (enrollCourse.enrolledCount ?? 0)
      const isFull = spotsLeft <= 0
      const status = isFull ? "waitlist" : "pending"
      await addDoc(collection(db, "centers", centerId, "enrollments"), {
        courseId: enrollCourse.id,
        courseName: enrollCourse.name,
        centerId,
        playerId: user.uid,
        playerName: enrollForm.playerName.trim(),
        playerEmail: enrollForm.playerEmail.trim(),
        playerPhone: enrollForm.playerPhone.trim() || undefined,
        status,
        paymentStatus: "pending",
        paidAmount: 0,
        pendingAmount: enrollCourse.priceTotal,
        totalPrice: enrollCourse.priceTotal,
        enrolledAt: now,
      })
      if (!isFull) {
        await updateDoc(doc(db, "centers", centerId, "courses", enrollCourse.id), {
          enrolledCount: increment(1),
          updatedAt: now,
        })
        setCourses(prev => prev.map(c =>
          c.id === enrollCourse.id ? { ...c, enrolledCount: (c.enrolledCount ?? 0) + 1 } : c
        ))
      }
      setEnrollSuccess(true)
    } catch (e) {
      console.error(e)
      setEnrollError("Ocurrió un error. Por favor intentá de nuevo.")
    } finally {
      setEnrollLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const found = await findCenterBySlug(slug)
        if (!found) { setCenter(null); return }

        const [courtsData, bookingSettings, operationsData, classesData, coursesSnap] = await Promise.all([
          loadCourts(found.id),
          loadBookingSettings(found.id),
          loadOperationSettings(found.id),
          loadClasses(found.id),
          getDocs(query(
            collection(db, FIRESTORE_COLLECTIONS.centers, found.id, "courses"),
            where("status", "==", "published"),
            where("visibility", "==", "public"),
          )),
        ])

        // Restore slot draft saved before login redirect
        const draftRaw = typeof window !== "undefined" ? sessionStorage.getItem("voyd_slot_draft") : null
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw)
            if (draft.slug === slug) {
              sessionStorage.removeItem("voyd_slot_draft")

              // Auto-checkout: user was redirected to login, now they're back — skip the center page
              if (draft.autoCheckout && draft.courtId && draft.startTime && draft.duration) {
                const user = auth.currentUser
                const court = courtsData.find((c) => c.id === draft.courtId)
                if (user && court) {
                  const durationMinutes = Math.round(draft.duration * 60)
                  const price = court.data.pricePerHour ?? null
                  const currency = court.data.currency || "ARS"
                  const totalPrice = typeof price === "number" ? price * draft.duration : null
                  const bookingId = await createPendingBooking({
                    clubId: found.id,
                    clubName: found.data.name,
                    courtId: draft.courtId,
                    courtName: court.data.name,
                    sport: court.data.sport || draft.sport || "padel",
                    userId: user.uid,
                    userName: user.displayName || "Jugador",
                    userEmail: user.email || "",
                    date: draft.date,
                    startTime: draft.startTime,
                    durationMinutes,
                    price: totalPrice,
                    currency,
                  })
                  window.location.href = `/checkout/test/${bookingId}`
                  return
                }
              }

              // Fallback: just restore selection on the center page
              if (draft.date) setSelectedDate(draft.date)
              if (draft.sport) setSelectedSport(draft.sport as SportKey)
              if (draft.courtId && draft.startTime && draft.duration) {
                setConfirmedSlot({ courtId: draft.courtId, startTime: draft.startTime, duration: draft.duration })
              }
            }
          } catch { /* ignore corrupt draft */ }
        }

        setCenterId(found.id)
        setCenter(found.data)
        setCourts(courtsData)
        setClasses(classesData)
        const coursesData = coursesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Course))
          .sort((a, b) => (a.publicOrder ?? 999) - (b.publicOrder ?? 999))
        setCourses(coursesData)
        setOperationSettings(operationsData)
        if (bookingSettings) setSettings(bookingSettings)
        else { const legacy = await loadLegacyAvailability(found.id); setSettings(legacy) }
      } catch (e) {
        console.error("Failed to load club:", e)
        setCenter(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  /* Close popover on outside click */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (slotPreview && slotPreviewPopoverRef.current && !slotPreviewPopoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (!target.closest("[data-slot-cell]")) {
          setSlotPreview(null)
        }
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [slotPreview])

  /* Recompute popover position from the live DOM element whenever the selected slot or courts change */
  useEffect(() => {
    if (!slotPreview) { setPopoverPos(null); return }
    const { courtId, startTime } = slotPreview
    const compute = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-court-id="${courtId}"][data-slot-time="${startTime}"]`
      )
      if (!el) return
      const rect = el.getBoundingClientRect()
      const popoverWidth = 256
      const top = rect.bottom + window.scrollY + 8
      const left = Math.max(8, Math.min(rect.left + window.scrollX - popoverWidth / 4, window.innerWidth + window.scrollX - popoverWidth - 8))
      setPopoverPos({ top, left })
    }
    requestAnimationFrame(compute)
    const grid = gridRef.current
    const onGridScroll = () => requestAnimationFrame(compute)
    grid?.addEventListener("scroll", onGridScroll)
    return () => grid?.removeEventListener("scroll", onGridScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotPreview?.courtId, slotPreview?.startTime, courts])

  const gallery = useMemo(() => (center ? getGallery(center) : []), [center])
  const placeId = center?.placeId?.trim() || center?.googlePlaceId?.trim() || null
  const hasPlaceId = Boolean(placeId)

  useEffect(() => {
    if (activeImageIndex >= gallery.length) setActiveImageIndex(0)
  }, [activeImageIndex, gallery.length])

  useEffect(() => {
    const load = async () => {
      if (!centerId || !selectedDate) return
      try {
        setBookingLoading(true)
        const items = await loadActiveBookingsForDate(centerId, selectedDate)
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

  /* ---- Derived values (matching the center dashboard logic) ---- */

  const dayIndex = useMemo(() => parseDateKey(selectedDate).getDay().toString(), [selectedDate])
  const defaultDayCfg = settings?.openingHours?.[dayIndex]

  // Holiday detection
  const selectedHoliday = useMemo(
    () => operationSettings?.holidays?.find((h) => h.date === selectedDate) ?? null,
    [operationSettings?.holidays, selectedDate]
  )

  const effectiveDayConfig = useMemo(() => {
    if (selectedHoliday) {
      if (selectedHoliday.closed) {
        return { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME, closed: true }
      }
      return {
        open: selectedHoliday.openTime || defaultDayCfg?.open || DEFAULT_OPEN_TIME,
        close: selectedHoliday.closeTime || defaultDayCfg?.close || DEFAULT_CLOSE_TIME,
        closed: false,
      }
    }
    return defaultDayCfg || { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME, closed: false }
  }, [defaultDayCfg, selectedHoliday])

  // Duration & operation derived values
  const durationOptions = useMemo(
    () => buildDurationOptions(operationSettings, settings?.slotDurationMinutes || DEFAULT_SLOT_DURATION_MINUTES),
    [operationSettings, settings?.slotDurationMinutes]
  )
  const defaultDurationHours = durationOptions[0] || DEFAULT_SLOT_DURATION_MINUTES / 60
  const slotStepHours = (operationSettings?.slotStepMinutes || GRID_INTERVAL_MINUTES) / 60
  const bufferHours = (operationSettings?.bufferMinutes || 0) / 60

  // Time slots for the grid
  const slots = useMemo(() => {
    if (effectiveDayConfig.closed) return [] as string[]
    return buildTimeSlots(effectiveDayConfig.open, effectiveDayConfig.close, GRID_INTERVAL_MINUTES)
  }, [effectiveDayConfig])

  /* Auto-scroll grid to requested time on first render */
  useEffect(() => {
    const timeParam = searchParams.get("time")
    if (!timeParam || hasScrolledToTimeRef.current || loading || !slots.length || !gridRef.current) return
    const match = timeParam.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return
    const targetMinutes = parseInt(match[1]) * 60 + parseInt(match[2])
    const openMinutes = timeToMinutes(slots[0])
    const offsetMinutes = targetMinutes - openMinutes
    if (offsetMinutes > 0) {
      // w-28 = 112px per full hour in the grid
      gridRef.current.scrollLeft = Math.floor((offsetMinutes / 60) * 112)
    }
    hasScrolledToTimeRef.current = true
  }, [loading, slots, searchParams])

  const timeZone = settings?.timezone || "America/Argentina/Buenos_Aires"
  const todayKey = getDateKeyInTimeZone(timeZone)
  const nowMinutes = getMinutesInTimeZone(timeZone)

  const fullHours = useMemo(() => {
    if (effectiveDayConfig.closed) return [] as string[]
    return buildFullHours(effectiveDayConfig.open, effectiveDayConfig.close)
  }, [effectiveDayConfig])

  const availableStartTimes = useMemo(() => {
    if (effectiveDayConfig.closed) return [] as string[]
    const dayStart = timeToDecimal(effectiveDayConfig.open)
    return slots.filter((slot) => {
      const diffMinutes = Math.round((timeToDecimal(slot) - dayStart) * 60)
      return diffMinutes >= 0 && diffMinutes % Math.round(slotStepHours * 60) === 0
    })
  }, [effectiveDayConfig, slotStepHours, slots])

  const availableSports = useMemo(() => {
    const fromProfile = (center?.sports || []).filter(Boolean) as SportKey[]
    if (fromProfile.length) return Array.from(new Set(fromProfile))
    const fromCourts = courts.map((c) => c.data.sport).filter(Boolean) as SportKey[]
    return Array.from(new Set(fromCourts))
  }, [center?.sports, courts])

  useEffect(() => {
    if (availableSports.length && !selectedSport) setSelectedSport(availableSports[0])
  }, [availableSports, selectedSport])

  const filteredCourts = useMemo(() => {
    if (!selectedSport) return courts
    return courts.filter((c) => c.data.sport === selectedSport)
  }, [courts, selectedSport])

  /* Stats */
  const totalSlots = filteredCourts.length * availableStartTimes.length
  const bookedSlots = useMemo(() => {
    let count = 0
    for (const court of filteredCourts) {
      for (const slot of availableStartTimes) {
        const slotStartMin = timeToMinutes(slot)
        const slotEndMin = slotStartMin + GRID_INTERVAL_MINUTES
        const hasBooking = bookings.some((b) => {
          if (b.courtId !== court.id) return false
          const bStart = timeToMinutes(b.startTime)
          const bEnd = timeToMinutes(b.endTime)
          return bStart < slotEndMin && bEnd > slotStartMin
        })
        if (hasBooking) count++
      }
    }
    return count
  }, [filteredCourts, availableStartTimes, bookings])
  const freeSlots = totalSlots - bookedSlots

  /* ---- Loading & error states ---- */

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-secondary" />
          <div className="h-[360px] rounded-2xl bg-secondary" />
          <div className="h-64 rounded-2xl bg-secondary" />
        </div>
      </div>
    )
  }

  if (!center || !centerId) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="border border-border/50">
          <CardHeader><CardTitle>Club no encontrado</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">Este club no est&aacute; publicado o no existe.</CardContent>
        </Card>
      </div>
    )
  }

  /* ---- Computed page data ---- */

  const locationAddress = (() => {
    if (center.location?.fullAddress) return center.location.fullAddress
    const parts = [center.address, center.city, center.country].filter(Boolean) as string[]
    // Deduplicate consecutive identical parts (handles "Buenos Aires, Buenos Aires, Argentina, Buenos Aires, Argentina")
    const deduped = parts.filter((p, i) => parts.indexOf(p) === i)
    return deduped.join(", ")
  })()
  const mapLink = hasPlaceId ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}&query_place_id=${placeId}` : null
  const mapSrc = hasPlaceId ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=place_id:${placeId}&zoom=16` : null
  const amenities = (center.amenities || []).filter((a) => a in amenityMeta)
  const heroCover = getCenterCover(center)

  const selectedCourt = confirmedSlot ? courts.find((c) => c.id === confirmedSlot.courtId) : null
  const selectedPrice = selectedCourt?.data.pricePerHour
  const selectedCurrency = selectedCourt?.data.currency || "ARS"
  const selectedDurationHours = confirmedSlot?.duration || defaultDurationHours
  const totalPrice = typeof selectedPrice === "number" ? selectedPrice * selectedDurationHours : null

  const formatPriceNumber = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return "\u2014"
    return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }

  /* ---- Booking action ---- */

  const handleReservar = async () => {
    if (!confirmedSlot || !selectedCourt || !centerId || !center) return
    const user = auth.currentUser
    if (!user) {
      const currentPath = `${window.location.pathname}${window.location.search}`
      // Persist slot selection so it can be restored after the user logs in and returns
      sessionStorage.setItem(
        "voyd_slot_draft",
        JSON.stringify({
          slug,
          courtId: confirmedSlot.courtId,
          startTime: confirmedSlot.startTime,
          duration: confirmedSlot.duration,
          date: selectedDate,
          sport: selectedSport,
          autoCheckout: true,
        })
      )
      window.location.href = `/players/login?next=${encodeURIComponent(currentPath)}`
      return
    }

    // Check slot is still free
    const slotStartMin = timeToMinutes(confirmedSlot.startTime)
    const slotEndMin = slotStartMin + Math.round(confirmedSlot.duration * 60)
    const hasConflict = bookings.some((b) => {
      if (b.courtId !== confirmedSlot.courtId) return false
      const bStart = timeToMinutes(b.startTime)
      const bEnd = timeToMinutes(b.endTime)
      return bStart < slotEndMin && bEnd > slotStartMin
    })
    if (hasConflict) {
      setCheckoutError("Este horario ya fue reservado. Por favor eleg\u00ed otro.")
      return
    }

    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const durationMinutes = Math.round(confirmedSlot.duration * 60)
      const bookingId = await createPendingBooking({
        clubId: centerId,
        clubName: center.name,
        courtId: confirmedSlot.courtId,
        courtName: selectedCourt.data.name,
        sport: selectedCourt.data.sport || selectedSport || "padel",
        userId: user.uid,
        userName: user.displayName || "Jugador",
        userEmail: user.email || "",
        date: selectedDate,
        startTime: confirmedSlot.startTime,
        durationMinutes,
        price: totalPrice,
        currency: selectedCurrency,
      })
      window.location.href = `/checkout/test/${bookingId}`
    } catch (err) {
      console.error("Error creating booking:", err)
      setCheckoutError("Error al crear la reserva. Verific\u00e1 tu conexi\u00f3n e intent\u00e1 de nuevo.")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) { router.back(); return }
    router.push("/centros")
  }

  /* ---- Render ---- */

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">

        {/* Navigation */}
        <div className="mb-6 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <Link href="/centros">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">Centros</Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground truncate">{center.name}</span>
        </div>

        {/* Hero: Gallery + Info side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
          {/* Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-muted border border-border/50 h-[320px] md:h-[400px]">
            {gallery.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gallery[activeImageIndex]} alt={center.name} className="w-full h-full object-cover" />
            ) : heroCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroCover} alt={center.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary/50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => setActiveImageIndex((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
              </>
            )}

            {gallery.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {gallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? "bg-white w-5" : "bg-white/50 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            )}

          </div>

          {/* Info Card */}
          <div className="flex flex-col gap-5">

            {/* Name + rating */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold text-foreground leading-tight">{center.name}</h1>
                {center.rating && (
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-base font-semibold text-foreground">{typeof center.rating === "number" ? center.rating.toFixed(1) : center.rating}</span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="mt-2 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                {mapLink ? (
                  <a href={mapLink} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline leading-relaxed">
                    {locationAddress || "Ubicaci\u00f3n por definir"}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground leading-relaxed">{locationAddress || "Ubicaci\u00f3n por definir"}</span>
                )}
              </div>
            </div>

            {/* Sport chips — prominent, no section label */}
            {availableSports.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableSports.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-full border border-border bg-secondary text-foreground px-3 py-1 text-sm font-medium">
                    {sportLabels[s as SportKey] || s}
                  </span>
                ))}
              </div>
            )}

            {/* Amenities — single scrollable row of icon+label pills */}
            {amenities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => {
                    const meta = amenityMeta[a as AmenityKey]
                    const Icon = meta.Icon
                    return (
                      <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs text-foreground">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        {meta.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Availability Grid */}
        <div className="mt-8">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">Disponibilidad de canchas</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Seleccioná un horario para reservar</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {availableSports.length > 1 && (
                    <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v as SportKey); setSlotPreview(null); setConfirmedSlot(null) }}>
                      <SelectTrigger className="w-[150px] border-slate-300">
                        <SelectValue placeholder="Deporte" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSports.map((s) => (
                          <SelectItem key={s} value={s}>{sportLabels[s] || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      className="h-9 w-9 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors"
                      onClick={() => { setSelectedDate((d) => addDays(d, -1)); setSlotPreview(null); setConfirmedSlot(null) }}
                      aria-label="D\u00eda anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <CalendarDropdown selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setSlotPreview(null); setConfirmedSlot(null) }} />
                    <button
                      className="h-9 w-9 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors"
                      onClick={() => { setSelectedDate((d) => addDays(d, 1)); setSlotPreview(null); setConfirmedSlot(null) }}
                      aria-label="D\u00eda siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {bookingLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Actualizando&hellip;
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {courts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No hay canchas publicadas todav&iacute;a.</div>
              ) : !settings || !defaultDayCfg ? (
                <div className="p-8 text-center text-slate-500">
                  Los horarios de este centro a&uacute;n no est&aacute;n configurados.
                </div>
              ) : effectiveDayConfig.closed ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
                  El centro figura cerrado en la fecha seleccionada{selectedHoliday?.label ? ` (${selectedHoliday.label})` : ""}.
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No hay turnos disponibles para este d&iacute;a.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-200" ref={gridRef}>
                    <div className="inline-block min-w-full">
                      {/* Header \u2014 full hours only */}
                      <div className="flex bg-slate-50">
                        <div className="w-44 flex-shrink-0 px-4 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wider border-r border-slate-200 sticky left-0 z-10 bg-slate-50 flex items-center">
                          Canchas
                        </div>
                        <div className="flex">
                          {fullHours.map((hour, i) => (
                            <div
                              key={hour}
                              className={`w-28 flex-shrink-0 py-2.5 text-center text-xs font-medium text-slate-500 ${i > 0 ? "border-l border-slate-200" : ""}`}
                            >
                              {hour}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Court rows */}
                      {filteredCourts.map((court) => {
                        const courtBookingsForDay = bookings.filter((b) => b.courtId === court.id)

                        return (
                          <div key={court.id} className="flex border-t border-slate-100 group/row">
                            {/* Court label */}
                            <div className="w-44 flex-shrink-0 px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10">
                              <h4 className="font-medium text-slate-900 text-sm leading-tight">{court.data.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {court.data.sport ? sportLabels[court.data.sport as SportKey] : "Padel"} &middot; {court.data.indoor ? "Cubierta" : "Descubierta"}
                              </p>
                            </div>

                            {/* Slots */}
                            <div className="flex relative">
                              {slots.map((slot, slotIndex) => {
                                const isHalfHour = slot.endsWith(":30")
                                const slotStartDec = timeToDecimal(slot)
                                const slotEndDec = slotStartDec + GRID_INTERVAL_MINUTES / 60
                                const isStartAllowed = availableStartTimes.includes(slot)
                                const isPastSlot = selectedDate === todayKey && timeToMinutes(slot) < nowMinutes

                                const startsInThisSlot = (booking: BookingSlotInfo) => {
                                  const resStartDec = timeToDecimal(booking.startTime)
                                  return resStartDec >= slotStartDec && resStartDec < slotEndDec
                                }

                                const intersectsThisSlot = (booking: BookingSlotInfo) => {
                                  const resStartDec = timeToDecimal(booking.startTime)
                                  const bookingHours = (timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime)) / 60
                                  const resEndDec = resStartDec + bookingHours + bufferHours
                                  return slotStartDec < resEndDec && slotEndDec > resStartDec
                                }

                                const slotStartingBookings = courtBookingsForDay.filter(startsInThisSlot)
                                const slotHasAnyBooking = courtBookingsForDay.some(intersectsThisSlot)

                                // Confirmed selection logic
                                const isCoveredByConfirmed = confirmedSlot?.courtId === court.id && (() => {
                                  const cs = timeToDecimal(confirmedSlot!.startTime)
                                  const ce = cs + confirmedSlot!.duration
                                  return slotStartDec >= cs && slotStartDec < ce
                                })()
                                const confirmedStartsHere = confirmedSlot?.courtId === court.id && confirmedSlot?.startTime === slot

                                // Preview logic (popover open)
                                const isCoveredByPreview = slotPreview?.courtId === court.id && (() => {
                                  const ps = timeToDecimal(slotPreview!.startTime)
                                  const pe = ps + slotPreview!.duration
                                  return slotStartDec >= ps && slotStartDec < pe
                                })()
                                const previewStartsHere = slotPreview?.courtId === court.id && slotPreview?.startTime === slot
                                const isFree = !slotHasAnyBooking && !isCoveredByPreview && !isCoveredByConfirmed

                                return (
                                  <div
                                    key={`${court.id}-${slot}`}
                                    data-slot-cell="true"
                                    data-court-id={court.id}
                                    data-slot-time={slot}
                                    onClick={() => {
                                      if (slotHasAnyBooking || isPastSlot || effectiveDayConfig.closed) return
                                      if (isCoveredByConfirmed && !confirmedStartsHere) return
                                      if (!isStartAllowed && !confirmedStartsHere) return
                                      setSlotPreview({
                                        courtId: court.id,
                                        startTime: slot,
                                        duration: confirmedStartsHere ? confirmedSlot!.duration : defaultDurationHours,
                                      })
                                    }}
                                    className={`w-14 flex-shrink-0 h-14 flex items-center justify-center text-[11px] relative transition-colors ${
                                      isHalfHour
                                        ? "border-l border-dashed border-slate-100"
                                        : slotIndex === 0 ? "" : "border-l border-slate-200"
                                    } ${
                                      confirmedStartsHere
                                        ? "cursor-pointer hover:bg-blue-50"
                                        : isCoveredByConfirmed
                                          ? "cursor-default"
                                          : isFree && isStartAllowed && !isPastSlot
                                            ? "cursor-pointer hover:bg-blue-50/60 group/slot"
                                            : isFree && isPastSlot
                                              ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                              : isFree && !isStartAllowed
                                                ? "bg-slate-50 text-slate-300 cursor-default"
                                                : isCoveredByPreview && !previewStartsHere
                                                  ? "bg-blue-50/20"
                                                  : slotHasAnyBooking
                                                    ? "cursor-default"
                                                    : ""
                                    }`}
                                  >
                                    {isFree && isStartAllowed && !isPastSlot && (
                                      <span className="text-[10px] text-slate-300 group-hover/slot:text-blue-400 transition-colors select-none">
                                        Libre
                                      </span>
                                    )}

                                    {/* Booking blocks — shown as plain occupied to players */}
                                    {slotStartingBookings.map((reservation, idx) => {
                                      const bookingHours = (timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime)) / 60
                                      return (
                                        <div
                                          key={`${reservation.courtId}-${reservation.startTime}-${idx}`}
                                          className="absolute top-0.5 bottom-0.5 left-0 z-20 rounded-md pointer-events-none flex items-center px-2 text-xs font-medium bg-slate-200 text-slate-500 border border-slate-300"
                                          style={{
                                            width: `calc(${bookingHours} * 7rem - 2px)`,
                                            minWidth: "3rem",
                                          }}
                                        >
                                          <span className="truncate w-full text-center">Ocupado</span>
                                        </div>
                                      )
                                    })}

                                    {/* Preview block */}
                                    {previewStartsHere && slotPreview && (() => {
                                      const hasPreviewConflict = courtBookingsForDay.some((b) => {
                                        const resStart = timeToDecimal(b.startTime)
                                        const bookingHours = (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) / 60
                                        const resEnd = resStart + bookingHours + bufferHours
                                        const pStart = timeToDecimal(slotPreview.startTime)
                                        const pEnd = pStart + slotPreview.duration
                                        return pStart < resEnd && pEnd > resStart
                                      })
                                      const isError = hasPreviewConflict

                                      return (
                                        <div
                                          className={`absolute top-0.5 bottom-0.5 left-0 z-[15] rounded-md pointer-events-none flex items-center px-2 text-xs font-medium border-2 border-dashed ${
                                            isError
                                              ? "bg-red-100/60 text-red-600 border-red-300"
                                              : "bg-blue-100/60 text-blue-700 border-blue-400"
                                          }`}
                                          style={{
                                            width: `calc(${slotPreview.duration} * 7rem - 2px)`,
                                            minWidth: "3rem",
                                          }}
                                        >
                                          <span className="truncate w-full text-center">
                                            {formatDurationHours(slotPreview.duration)}
                                          </span>
                                        </div>
                                      )
                                    })()}

                                    {/* Confirmed selection block */}
                                    {confirmedStartsHere && confirmedSlot && !previewStartsHere && (
                                      <div
                                        className="absolute top-0.5 bottom-0.5 left-0 z-[18] rounded-md pointer-events-none flex items-center px-2 text-xs font-medium bg-blue-500 text-white border-2 border-blue-600"
                                        style={{
                                          width: `calc(${confirmedSlot.duration} * 7rem - 2px)`,
                                          minWidth: "3rem",
                                        }}
                                      >
                                        <span className="truncate w-full text-center">
                                          {formatDurationHours(confirmedSlot.duration)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Compact legend */}
                  <div className="mt-4 flex flex-wrap items-center gap-5 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-white border border-slate-200"></div>
                      <span className="text-[11px] text-slate-400">Disponible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300"></div>
                      <span className="text-[11px] text-slate-400">Ocupado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-blue-500 border-2 border-blue-600"></div>
                      <span className="text-[11px] text-slate-400">Seleccionado</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary + About/Location */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* About + Location */}
          <div className="space-y-6">
            {center.description && (
              <Card className="border border-border/50">
                <CardHeader><CardTitle className="text-lg">Acerca del centro</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {center.description}
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/50 overflow-hidden">
              <CardHeader><CardTitle className="text-lg">Ubicaci&oacute;n</CardTitle></CardHeader>
              <CardContent className="p-0">
                {hasPlaceId && mapSrc ? (
                  <div className="relative h-[240px]">
                    <iframe title="map" src={mapSrc} className="absolute inset-0 h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ border: 0 }} />
                    {mapLink && <a href={mapLink} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Abrir en Google Maps" />}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center bg-secondary px-4 text-sm text-muted-foreground">
                    Ubicaci&oacute;n sin configurar
                  </div>
                )}
                {locationAddress && (
                  <div className="border-t border-border/30 px-4 py-3">
                    {mapLink ? (
                      <a href={mapLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{locationAddress}</a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{locationAddress}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {center.classesEnabled && classes.length > 0 && (
              <Card className="border border-border/50">
                <CardHeader><CardTitle className="text-lg">Clases</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classes.map((cls) => (
                      <div key={`${cls.name}-${cls.sport}`} className="rounded-xl border border-border/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{cls.name}</div>
                            <div className="text-xs text-muted-foreground">{sportLabels[cls.sport]}</div>
                            {cls.coachName && <div className="text-xs text-muted-foreground mt-1">Coach: {cls.coachName}</div>}
                          </div>
                          <div className="text-sm font-medium text-foreground">{cls.currency || "ARS"} {cls.price}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{formatSchedule(cls.recurringSchedule || [])}</div>
                        <div className="text-xs text-muted-foreground mt-1">Duraci&oacute;n: {cls.durationMinutes} min &middot; Capacidad: {cls.capacity}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Booking summary (sticky) */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border border-border/50 overflow-hidden">
              <CardHeader className="bg-secondary/50 pb-3">
                <CardTitle className="text-lg">Resumen de reserva</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {confirmedSlot && selectedCourt ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cancha</span>
                        <span className="text-sm font-medium text-foreground">{selectedCourt.data.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fecha</span>
                        <span className="text-sm font-medium text-foreground">
                          {parseDateKey(selectedDate).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Horario</span>
                        <span className="text-sm font-medium text-foreground">
                          {confirmedSlot.startTime} &ndash; {addTime(confirmedSlot.startTime, confirmedSlot.duration)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duraci&oacute;n</span>
                        <span className="text-sm font-medium text-foreground">{formatDurationHours(confirmedSlot.duration)}</span>
                      </div>
                      {selectedCourt.data.sport && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Deporte</span>
                          <span className="text-sm font-medium text-foreground">{sportLabels[selectedCourt.data.sport as SportKey]}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/50 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Precio/hora</span>
                        <span className="text-sm text-foreground">
                          {typeof selectedPrice === "number" ? `${selectedCurrency} ${formatPriceNumber(selectedPrice)}` : "Consultar"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-foreground">Total</span>
                        <span className="text-base font-bold text-foreground">
                          {typeof totalPrice === "number" ? `${selectedCurrency} ${formatPriceNumber(totalPrice)}` : "\u2014"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">Seleccion&aacute; un turno</p>
                    <p className="text-xs text-muted-foreground mt-1">Eleg&iacute; una cancha y horario en la grilla</p>
                  </div>
                )}

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={!confirmedSlot || !selectedCourt || checkoutLoading}
                  onClick={handleReservar}
                >
                  {checkoutLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Creando reserva&hellip;
                    </div>
                  ) : (
                    "Reservar"
                  )}
                </Button>

                {checkoutError ? (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5">{checkoutError}</div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground">Checkout de prueba &middot; Mercado Pago pr&oacute;ximamente</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Courses Section */}
        {courses.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Cursos y programas</h2>
                <p className="text-sm text-slate-500">{courses.length} programa{courses.length !== 1 ? "s" : ""} disponible{courses.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => {
                const spotsLeft = course.maximumCapacity - (course.enrolledCount ?? 0)
                const isFull = spotsLeft <= 0
                const hasPromo = typeof course.promotionalPrice === "number" && course.promotionalPrice < course.priceTotal
                const displayPrice = hasPromo ? course.promotionalPrice! : course.priceTotal
                const startFmt = course.startDate
                  ? new Date(`${course.startDate}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
                  : null
                const levelLabels: Record<string, string> = {
                  beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado", all: "Todos los niveles"
                }
                const sportLabel = course.sport
                  ? course.sport.charAt(0).toUpperCase() + course.sport.slice(1)
                  : ""
                return (
                  <div
                    key={course.id}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Cover */}
                    <div className="relative h-36 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      {course.coverImage ? (
                        <img src={course.coverImage} alt={course.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-10 h-10 text-white/50" />
                      )}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                          {sportLabel}
                        </span>
                        {course.featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                            <Star className="w-3 h-3" /> Destacado
                          </span>
                        )}
                      </div>
                      {isFull && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">Completo</span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex flex-col flex-1 p-4 gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          {levelLabels[course.level] || course.level}
                        </p>
                        <h3 className="font-bold text-slate-900 text-base leading-snug mt-0.5">{course.name}</h3>
                        {course.subtitle && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{course.subtitle}</p>
                        )}
                      </div>

                      {course.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{course.description}</p>
                      )}

                      <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                        {startFmt && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Inicio: <span className="font-medium text-slate-700">{startFmt}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{course.totalSessions} sesiones · {course.sessionDurationMinutes} min c/u</span>
                        </div>
                        {course.coachName && (
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
                            <span>Coach: <span className="font-medium text-slate-700">{course.coachName}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {isFull
                              ? "Sin cupos disponibles"
                              : <><span className="font-medium text-slate-700">{spotsLeft}</span> cupo{spotsLeft !== 1 ? "s" : ""} disponible{spotsLeft !== 1 ? "s" : ""}</>}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          {hasPromo && (
                            <p className="text-xs text-slate-400 line-through">
                              {course.currency} {course.priceTotal.toLocaleString("es-AR")}
                            </p>
                          )}
                          <p className="text-lg font-bold text-slate-900">
                            {course.currency} {displayPrice.toLocaleString("es-AR")}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenEnroll(course)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            isFull
                              ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                          }`}
                        >
                          {isFull ? "Lista de espera" : "Inscribirse"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Course enrollment modal */}
      {enrollCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) setEnrollCourse(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-200 mb-0.5">Inscripción al curso</p>
                  <h3 className="font-bold text-lg leading-snug">{enrollCourse.name}</h3>
                  {enrollCourse.subtitle && <p className="text-sm text-violet-200 mt-0.5">{enrollCourse.subtitle}</p>}
                </div>
                <button onClick={() => setEnrollCourse(null)} className="rounded-full p-1 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-violet-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {enrollCourse.startDate ? new Date(`${enrollCourse.startDate}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {enrollCourse.totalSessions} sesiones
                </span>
                <span className="font-semibold text-white">
                  {enrollCourse.currency} {(enrollCourse.promotionalPrice ?? enrollCourse.priceTotal).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="p-5">
              {enrollSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-lg">
                    {(() => { const s = enrollCourse.maximumCapacity - (enrollCourse.enrolledCount ?? 0); return s <= 0 ? "¡Anotado en lista de espera!" : "¡Solicitud enviada!" })()}
                  </h4>
                  <p className="text-sm text-slate-500">El centro se va a comunicar con vos para confirmar la inscripción y coordinar el pago.</p>
                  <button
                    onClick={() => setEnrollCourse(null)}
                    className="mt-2 rounded-full bg-violet-600 text-white px-6 py-2 text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Completá tus datos y el centro se va a contactar para confirmar tu lugar.</p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5" /> Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={enrollForm.playerName}
                        onChange={e => setEnrollForm(f => ({ ...f, playerName: e.target.value }))}
                        placeholder="Tu nombre"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1">
                        <Mail className="w-3.5 h-3.5" /> Email *
                      </label>
                      <input
                        type="email"
                        value={enrollForm.playerEmail}
                        onChange={e => setEnrollForm(f => ({ ...f, playerEmail: e.target.value }))}
                        placeholder="tu@email.com"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5" /> Teléfono (opcional)
                      </label>
                      <input
                        type="tel"
                        value={enrollForm.playerPhone}
                        onChange={e => setEnrollForm(f => ({ ...f, playerPhone: e.target.value }))}
                        placeholder="+54 11 1234 5678"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {enrollError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{enrollError}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setEnrollCourse(null)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEnrollSubmit}
                      disabled={enrollLoading}
                      className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                      {enrollLoading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando…</>
                      ) : (
                        (enrollCourse.maximumCapacity - (enrollCourse.enrolledCount ?? 0)) <= 0 ? "Anotarme en lista" : "Confirmar inscripción"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slot preview popover (matches dashboard interaction) */}
      {slotPreview && (() => {
        const court = courts.find((c) => c.id === slotPreview.courtId)
        const maxDuration = timeToDecimal(effectiveDayConfig.close) - timeToDecimal(slotPreview.startTime)
        const filteredDurations = durationOptions.filter((d) => d <= maxDuration)
        const courtBookingsForDay = bookings.filter((b) => b.courtId === slotPreview.courtId)
        const hasConflict = courtBookingsForDay.some((b) => {
          const resStart = timeToDecimal(b.startTime)
          const bookingH = (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) / 60
          const resEnd = resStart + bookingH + bufferHours
          const pStart = timeToDecimal(slotPreview.startTime)
          const pEnd = pStart + slotPreview.duration
          return pStart < resEnd && pEnd > resStart
        })
        const errorMsg = hasConflict ? "Conflicto con reserva existente" : null
        if (!popoverPos) return null
        const { top, left } = popoverPos

        return (
          <div
            ref={slotPreviewPopoverRef}
            className="absolute z-[60] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ top, left }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 text-sm">Reservar turno</h4>
              <button onClick={() => setSlotPreview(null)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cancha</span>
                <span className="font-medium text-slate-900">{court?.data.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Horario</span>
                <span className="font-medium text-slate-900">
                  {slotPreview.startTime} &ndash; {addTime(slotPreview.startTime, slotPreview.duration)}
                </span>
              </div>

              {filteredDurations.length > 1 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1.5">Duraci&oacute;n</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredDurations.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSlotPreview({ ...slotPreview, duration: d })}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          slotPreview.duration === d
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {formatDurationHours(d)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {typeof court?.data.pricePerHour === "number" && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Precio</span>
                  <span className="font-semibold text-emerald-600">
                    {court?.data.currency || "ARS"} {formatPriceNumber(court!.data.pricePerHour * slotPreview.duration)}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  &#9888; {errorMsg}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                size="sm"
                className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                disabled={!!errorMsg}
                onClick={() => {
                  setConfirmedSlot({ courtId: slotPreview.courtId, startTime: slotPreview.startTime, duration: slotPreview.duration })
                  setSlotPreview(null)
                }}
              >
                Confirmar {slotPreview.startTime} &ndash; {addTime(slotPreview.startTime, slotPreview.duration)}
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">Confirmá y luego presioná Reservar en el resumen</p>
            </div>
          </div>
        )
      })()}

      {/* Sticky bottom booking bar — visible when a slot is confirmed (sidebar may be off-screen on mobile) */}
      {confirmedSlot && selectedCourt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-100 shadow-[0_-8px_40px_rgba(0,0,0,0.14)] px-4 py-4 sm:py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-lg">
                🎾
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-slate-900 truncate leading-tight">
                  {selectedCourt.data.name}
                  <span className="font-semibold text-blue-600">
                    {" "}&middot;{" "}{confirmedSlot.startTime}&ndash;{addTime(confirmedSlot.startTime, confirmedSlot.duration)}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {parseDateKey(selectedDate).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                  {typeof totalPrice === "number" ? (
                    <span className="font-semibold text-slate-700 ml-1.5">{selectedCurrency} {formatPriceNumber(totalPrice)}</span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setConfirmedSlot(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <Button
                className="h-11 px-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
                disabled={checkoutLoading}
                onClick={handleReservar}
              >
                {checkoutLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creando&hellip;
                  </span>
                ) : "Reservar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
