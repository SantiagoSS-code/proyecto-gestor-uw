"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Phone, ChevronLeft, ChevronRight, DollarSign, ChevronDown, X, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS, CENTER_SETTINGS_DOCS } from "@/lib/firestorePaths"
import { formatCurrencyARS, formatDurationHours } from "@/lib/utils"
import type { BookingSettings, OperationSettings } from "@/lib/types"

const GRID_INTERVAL_MINUTES = 30
const DEFAULT_OPEN_TIME = '09:00'
const DEFAULT_CLOSE_TIME = '22:00'
const DEFAULT_SLOT_DURATION_MINUTES = 60

function timeToMinutes(time: string) {
	const [h, m] = String(time || '00:00').split(':').map(Number)
	return h * 60 + (m || 0)
}

function minutesToTime(totalMinutes: number) {
	const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
	const m = String(totalMinutes % 60).padStart(2, '0')
	return `${h}:${m}`
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

const mockCourts = [
	{ id: '1', name: 'Cancha 1', sport: 'Padel', surface: 'Synthetic', indoor: false, pricePerHour: 50 },
	{ id: '2', name: 'Cancha 2', sport: 'Padel', surface: 'Synthetic', indoor: true, pricePerHour: 60 },
	{ id: '3', name: 'Cancha 3', sport: 'Padel', surface: 'Synthetic', indoor: true, pricePerHour: 55 },
]

function getTodayString() {
	const now = new Date()
	const y = now.getFullYear()
	const m = String(now.getMonth() + 1).padStart(2, '0')
	const d = String(now.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

function timeToDecimal(time: string) {
	const [h, m] = String(time || '00:00').split(':').map(Number)
	return h + (m || 0) / 60
}

function decimalToTime(dec: number): string {
	const h = String(Math.floor(dec)).padStart(2, '0')
	const m = String(Math.round((dec % 1) * 60)).padStart(2, '0')
	return `${h}:${m}`
}

function addTime(time: string, durationHours: number): string {
	return decimalToTime(timeToDecimal(time) + durationHours)
}

/**
 * Normalizes both manual-booking docs and player-booking docs (from booking-service)
 * to the single schema the dashboard expects.
 */
function normalizeBooking(raw: any): any {
	// Player bookings use bookingStatus / startTime / courtId / userName / userEmail / durationMinutes
	if (raw.bookingStatus) {
		const statusMap: Record<string, string> = {
			confirmed:       'confirmada',
			pending_payment: 'pendiente',
			cancelled:       'cancelada',
			expired:         'cancelada',
		}
		return {
			...raw,
			customer:         raw.userName  || raw.customer || 'Jugador',
			email:            raw.userEmail || raw.email    || '',
			phone:            raw.phone     || '',
			court:            raw.courtId   || raw.court    || '',
			time:             raw.startTime || raw.time     || '',
			duration:         raw.durationMinutes != null ? raw.durationMinutes / 60 : (raw.duration ?? 1),
			status:           statusMap[raw.bookingStatus as string] ?? raw.status ?? 'pendiente',
			_isPlayerBooking: true,
		}
	}
	return raw
}

export default function ReservasPage() {
	const { user, centerId } = useAuth()
	const resolvedCenterId = centerId || user?.uid || null
	const [selectedDate, setSelectedDate] = useState<string>(getTodayString)
	const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmada' | 'pendiente'>('all')
	const [showCalendar, setShowCalendar] = useState(false)
	const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
	const [courts, setCourts] = useState<any[]>(mockCourts)
	const [bookings, setBookings] = useState<any[]>([])
	const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null)
	const [operationSettings, setOperationSettings] = useState<OperationSettings | null>(null)
	const [loadingData, setLoadingData] = useState(true)
	const [bookingsRootCollection, setBookingsRootCollection] = useState<string>(FIRESTORE_COLLECTIONS.centers)
	const [searchQuery, setSearchQuery] = useState('')
	const [detailsModal, setDetailsModal] = useState<any>(null)
	const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
	const [isDeletingReservation, setIsDeletingReservation] = useState(false)
	const [newReservationModal, setNewReservationModal] = useState<any>(null)
	const [activePopover, setActivePopover] = useState<{ booking: any; anchorTop: number; anchorLeft: number; anchorWidth: number } | null>(null)
	const [slotPreview, setSlotPreview] = useState<{ courtId: string; startTime: string; duration: number; anchorTop: number; anchorLeft: number } | null>(null)
	const [newReservationForm, setNewReservationForm] = useState({
		customer: '',
		phone: '',
		email: '',
		duration: DEFAULT_SLOT_DURATION_MINUTES / 60,
		price: 0
	})
	const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
	const calendarRef = useRef<HTMLDivElement>(null)
	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const slotPreviewPopoverRef = useRef<HTMLDivElement>(null)

	const selectedDayIndex = useMemo(() => new Date(`${selectedDate}T00:00:00`).getDay().toString(), [selectedDate])
	const selectedHoliday = useMemo(
		() => operationSettings?.holidays?.find((holiday) => holiday.date === selectedDate) ?? null,
		[operationSettings?.holidays, selectedDate]
	)
	const defaultDayCfg = bookingSettings?.openingHours?.[selectedDayIndex]
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
	const durationOptions = useMemo(
		() => buildDurationOptions(operationSettings, bookingSettings?.slotDurationMinutes || DEFAULT_SLOT_DURATION_MINUTES),
		[operationSettings, bookingSettings?.slotDurationMinutes]
	)
	const defaultDurationHours = durationOptions[0] || DEFAULT_SLOT_DURATION_MINUTES / 60
	const minDurationHours = (operationSettings?.minSlotMinutes || bookingSettings?.slotDurationMinutes || DEFAULT_SLOT_DURATION_MINUTES) / 60
	const slotStepHours = (operationSettings?.slotStepMinutes || GRID_INTERVAL_MINUTES) / 60
	const bufferHours = (operationSettings?.bufferMinutes || 0) / 60
	const timeSlots = useMemo(
		() => buildTimeSlots(effectiveDayConfig.open, effectiveDayConfig.close, GRID_INTERVAL_MINUTES),
		[effectiveDayConfig.close, effectiveDayConfig.open]
	)
	const fullHours = useMemo(
		() => buildFullHours(effectiveDayConfig.open, effectiveDayConfig.close),
		[effectiveDayConfig.close, effectiveDayConfig.open]
	)
	const availableStartTimes = useMemo(() => {
		const dayStart = timeToDecimal(effectiveDayConfig.open)
		return timeSlots.filter((slot) => {
			const diffMinutes = Math.round((timeToDecimal(slot) - dayStart) * 60)
			return diffMinutes >= 0 && diffMinutes % Math.round(slotStepHours * 60) === 0
		})
	}, [effectiveDayConfig.open, slotStepHours, timeSlots])

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		if (toastTimeoutRef.current) {
			clearTimeout(toastTimeoutRef.current)
		}
		setToast({ type, message })
		toastTimeoutRef.current = setTimeout(() => setToast(null), 3200)
	}

	const openQuickReservation = () => {
		if (courts.length === 0 || effectiveDayConfig.closed || availableStartTimes.length === 0) {
			showToast('No hay canchas disponibles para crear una reserva.', 'error')
			return
		}
		const firstCourt = courts[0]
		setNewReservationModal({ courtId: firstCourt.id, time: availableStartTimes[0], courtName: firstCourt.name })
		setNewReservationForm({
			customer: '',
			phone: '',
			email: '',
			duration: defaultDurationHours,
			price: (firstCourt?.pricePerHour || 0) * defaultDurationHours
		})
	}

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
				setShowCalendar(false)
			}
		}

		if (showCalendar) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [showCalendar])

	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (activePopover && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setActivePopover(null)
			}
			if (slotPreview && slotPreviewPopoverRef.current && !slotPreviewPopoverRef.current.contains(e.target as Node)) {
				const target = e.target as HTMLElement
				if (!target.closest('[data-slot-cell]')) {
					setSlotPreview(null)
				}
			}
		}
		document.addEventListener('mousedown', handleOutsideClick)
		return () => document.removeEventListener('mousedown', handleOutsideClick)
	}, [activePopover, slotPreview])

	useEffect(() => {
		return () => {
			if (toastTimeoutRef.current) {
				clearTimeout(toastTimeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		const fetchData = async () => {
			if (!resolvedCenterId) return
			setLoadingData(true)
			try {
				const loadCollection = async (rootCollection: string, subCollection: string) => {
					const ref = collection(db, rootCollection, resolvedCenterId, subCollection)
					const snap = await getDocs(ref)
					return snap.docs.map((docSnap) => ({
						id: docSnap.id,
						...(docSnap.data() as any)
					}))
				}

				const settingsRef = doc(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.booking)
				const operationsRef = doc(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.operations)

				const [newCourts, legacyCourts, newBookings, legacyBookings, settingsSnap, operationsSnap] = await Promise.all([
					loadCollection(FIRESTORE_COLLECTIONS.centers, CENTER_SUBCOLLECTIONS.courts),
					loadCollection(FIRESTORE_COLLECTIONS.legacyCenters, CENTER_SUBCOLLECTIONS.courts),
					loadCollection(FIRESTORE_COLLECTIONS.centers, CENTER_SUBCOLLECTIONS.bookings),
					loadCollection(FIRESTORE_COLLECTIONS.legacyCenters, CENTER_SUBCOLLECTIONS.bookings),
					getDoc(settingsRef),
					getDoc(operationsRef),
				])

				const courtsData = newCourts.length > 0 ? newCourts : legacyCourts
				if (courtsData.length > 0) {
					setCourts(courtsData)
				}

				const usingLegacyBookings = newBookings.length === 0 && legacyBookings.length > 0
				setBookingsRootCollection(usingLegacyBookings ? FIRESTORE_COLLECTIONS.legacyCenters : FIRESTORE_COLLECTIONS.centers)
				const bookingsData = (usingLegacyBookings ? legacyBookings : newBookings).map(normalizeBooking)
				setBookings(bookingsData)
				setBookingSettings(settingsSnap.exists() ? (settingsSnap.data() as BookingSettings) : null)
				setOperationSettings(operationsSnap.exists() ? (operationsSnap.data() as OperationSettings) : null)
			} catch (error) {
				console.error("Error loading data:", error)
			} finally {
				setLoadingData(false)
			}
		}

		fetchData()
	}, [resolvedCenterId])

	const totalCapacity = timeSlots.length * courts.length

	const dayStats = useMemo(() => {
		const dayBookings = bookings.filter(b => b.date === selectedDate)
		const confirmedBookings = dayBookings.filter(b => b.status === 'confirmada')

		const totalIncome = confirmedBookings.reduce((sum, booking) => {
			const court = courts.find(c => c.id === booking.court)
			const duration = Number(booking.duration) || 1
			const pricePerHour = court?.pricePerHour || booking.price || 0
			return sum + (pricePerHour * duration)
		}, 0)

		const occupiedSlots = dayBookings.reduce((sum, b) => {
			return sum + Math.ceil((Number(b.duration) || 1) * 60 / GRID_INTERVAL_MINUTES)
		}, 0)
		const occupancyPercent = (occupiedSlots / totalCapacity) * 100

		return {
			totalReservas: dayBookings.length,
			confirmadas: confirmedBookings.length,
			ingresos: totalIncome,
			ocupacion: Math.round(occupancyPercent),
			totalCapacity: totalCapacity
		}
	}, [selectedDate, courts, bookings])

	const filteredBookings = useMemo(() => {
		let filtered = bookings.filter(b => b.date === selectedDate)
		if (selectedStatus !== 'all') {
			filtered = filtered.filter(b => b.status === selectedStatus)
		}
		if (searchQuery) {
			filtered = filtered.filter(b =>
				b.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				b.phone?.includes(searchQuery)
			)
		}
		return filtered
	}, [selectedDate, selectedStatus, searchQuery, bookings])

	const dayBookingsCount = useMemo(() => {
		return bookings.filter(b => b.date === selectedDate).length
	}, [bookings, selectedDate])

	const pendingBookingsCount = useMemo(() => {
		return bookings.filter(b => b.date === selectedDate && b.status === 'pendiente').length
	}, [bookings, selectedDate])

	const reservationConflict = useMemo(() => {
		if (!newReservationModal) return null
		const newResStartDec = timeToDecimal(newReservationModal.time)
		const newResEndDec = newResStartDec + Number(newReservationForm.duration || 1)

		return bookings.find((b) => {
			if (b.date !== selectedDate || b.court !== newReservationModal.courtId || b.status === 'cancelada') return false
			const resStartDec = timeToDecimal(b.time)
			const resDuration = Number(b.duration) || 1
			const resBlockedStart = resStartDec - bufferHours
			const resBlockedEnd = resStartDec + resDuration + bufferHours
			return newResStartDec < resBlockedEnd && newResEndDec > resBlockedStart
		}) || null
	}, [bookings, selectedDate, newReservationModal, newReservationForm.duration, bufferHours])

	const checkNoGapRule = (courtId: string, startTime: string, duration: number): string | null => {
		if (effectiveDayConfig.closed) return 'El centro está cerrado en la fecha seleccionada.'
		const existingBookings = bookings
			.filter(b => b.date === selectedDate && b.court === courtId && b.status !== 'cancelada')
			.map(b => ({
				start: timeToDecimal(b.time),
				end: timeToDecimal(b.time) + (Number(b.duration) || 1) + bufferHours,
			}))

		const allBookings = [
			...existingBookings,
			{ start: timeToDecimal(startTime), end: timeToDecimal(startTime) + duration + bufferHours }
		].sort((a, b) => a.start - b.start)

		let prevEnd = timeToDecimal(effectiveDayConfig.open)
		for (const bk of allBookings) {
			const gap = bk.start - prevEnd
			if (gap > 0 && gap < minDurationHours) {
				const gapMin = Math.round(gap * 60)
				return `Deja un hueco de ${gapMin} min (${decimalToTime(prevEnd)}–${decimalToTime(bk.start)}) imposible de vender (mín. ${Math.round(minDurationHours * 60)} min)`
			}
			prevEnd = Math.max(prevEnd, bk.end)
		}

		const gapAfter = timeToDecimal(effectiveDayConfig.close) - prevEnd
		if (gapAfter > 0 && gapAfter < minDurationHours) {
			const gapMin = Math.round(gapAfter * 60)
			return `Deja un hueco de ${gapMin} min al final imposible de vender (mín. ${Math.round(minDurationHours * 60)} min)`
		}

		return null
	}

	const gapViolation = useMemo(() => {
		if (!newReservationModal) return null
		return checkNoGapRule(newReservationModal.courtId, newReservationModal.time, Number(newReservationForm.duration) || 1)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bookings, selectedDate, newReservationModal, newReservationForm.duration])

	const hasMissingReservationFields = !newReservationForm.customer.trim() || !newReservationForm.phone.trim() || !newReservationForm.email.trim()
	const canCreateReservation = !hasMissingReservationFields && !reservationConflict && !gapViolation

	const handleCreateReservation = async () => {
		if (!resolvedCenterId || !newReservationModal || !newReservationForm.customer.trim() || !newReservationForm.phone.trim() || !newReservationForm.email.trim()) {
			showToast('Por favor completa todos los campos.', 'error')
			return
		}

		try {
			if (reservationConflict) {
				showToast('Ya existe una reserva que interfiere con este horario. Elegí otro horario u otra cancha.', 'error')
				return
			}

			const gapCheck = checkNoGapRule(newReservationModal.courtId, newReservationModal.time, Number(newReservationForm.duration) || 1)
			if (gapCheck) {
				showToast(gapCheck, 'error')
				return
			}

			const bookingsRef = collection(db, bookingsRootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.bookings)

			const newBooking = {
				customer: newReservationForm.customer,
				phone: newReservationForm.phone,
				email: newReservationForm.email,
				court: newReservationModal.courtId,
				courtName: newReservationModal.courtName,
				date: selectedDate,
				time: newReservationModal.time,
				duration: newReservationForm.duration,
				price: newReservationForm.price,
				status: 'pendiente',
				createdAt: new Date(),
			}

			const docRef = await addDoc(bookingsRef, newBooking)
			setBookings([...bookings, { id: docRef.id, ...newBooking }])

			setNewReservationModal(null)
			setSlotPreview(null)
			setNewReservationForm({
				customer: '',
				phone: '',
				email: '',
				duration: defaultDurationHours,
				price: 0
			})

			showToast('Reserva creada exitosamente.')
		} catch (error) {
			console.error('Error creating reservation:', error)
			showToast('Error al crear la reserva.', 'error')
		}
	}

	const handleConfirmReservation = async (reservationId: string) => {
		if (!resolvedCenterId) return

		try {
			const bookingRef = doc(
				db,
				bookingsRootCollection,
				resolvedCenterId,
				CENTER_SUBCOLLECTIONS.bookings,
				reservationId
			)
			const booking = bookings.find(b => b.id === reservationId)
			if (booking?._isPlayerBooking) {
				await updateDoc(bookingRef, { bookingStatus: 'confirmed', paymentStatus: 'approved', updatedAt: new Date() })
			} else {
				await updateDoc(bookingRef, { status: 'confirmada' })
			}

			setBookings(bookings.map(b =>
				b.id === reservationId ? { ...b, status: 'confirmada', bookingStatus: 'confirmed' } : b
			))

			if (detailsModal?.id === reservationId) {
				setDetailsModal({ ...detailsModal, status: 'confirmada', bookingStatus: 'confirmed' })
			}

			showToast('Reserva confirmada exitosamente.')
		} catch (error) {
			console.error('Error confirming reservation:', error)
			showToast('Error al confirmar la reserva.', 'error')
		}
	}

	const handleDeleteReservation = async (reservationId: string) => {
		setDeleteCandidateId(reservationId)
	}

	const confirmDeleteReservation = async () => {
		if (!deleteCandidateId) return
		if (!resolvedCenterId) return
		setIsDeletingReservation(true)

		try {
			const bookingRef = doc(
				db,
				bookingsRootCollection,
				resolvedCenterId,
				CENTER_SUBCOLLECTIONS.bookings,
				deleteCandidateId
			)
			const booking = bookings.find(b => b.id === deleteCandidateId)
			if (booking?._isPlayerBooking) {
				// Cancel instead of delete so the player can see the cancellation in their dashboard
				await updateDoc(bookingRef, { bookingStatus: 'cancelled', paymentStatus: 'failed', updatedAt: new Date() })
				setBookings(bookings.map(b =>
					b.id === deleteCandidateId ? { ...b, status: 'cancelada', bookingStatus: 'cancelled' } : b
				))
			} else {
				await deleteDoc(bookingRef)
				setBookings(bookings.filter(b => b.id !== deleteCandidateId))
			}
			setDetailsModal(null)
			setDeleteCandidateId(null)

			showToast(booking?._isPlayerBooking ? 'Reserva rechazada. El jugador será notificado.' : 'Reserva eliminada exitosamente.')
		} catch (error) {
			console.error('Error cancelling reservation:', error)
			showToast('Error al cancelar la reserva.', 'error')
		} finally {
			setIsDeletingReservation(false)
		}
	}

	const handlePreviousMonth = () => {
		setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
	}

	const handleNextMonth = () => {
		setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
	}

	const getDaysInMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
	}

	const getFirstDayOfMonth = (date: Date) => {
		const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
		return day === 0 ? 6 : day - 1
	}

	const selectDateFromCalendar = (day: number) => {
		const year = calendarMonth.getFullYear()
		const month = String(calendarMonth.getMonth() + 1).padStart(2, '0')
		const dayStr = String(day).padStart(2, '0')
		setSelectedDate(`${year}-${month}-${dayStr}`)
		setShowCalendar(false)
	}

	const formatDateForDisplay = (dateString: string) => {
		const [year, month, day] = dateString.split('-').map(Number)
		const date = new Date(year, month - 1, day)
		return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
	}

	const daysInMonth = getDaysInMonth(calendarMonth)
	const firstDay = getFirstDayOfMonth(calendarMonth)
	const calendarDays = []

	const prevMonthDays = getDaysInMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
	for (let i = firstDay - 1; i >= 0; i--) {
		calendarDays.push({ day: prevMonthDays - i, isOtherMonth: true })
	}
	for (let i = 1; i <= daysInMonth; i++) {
		calendarDays.push({ day: i, isOtherMonth: false })
	}
	const remainingDays = 42 - calendarDays.length
	for (let i = 1; i <= remainingDays; i++) {
		calendarDays.push({ day: i, isOtherMonth: true })
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Reservas</h1>
					<p className="text-slate-500 mt-2">Administra las reservas y turnos de tu centro</p>
					{loadingData && <p className="text-xs text-slate-500 mt-1">Cargando datos...</p>}
				</div>

				<div className="relative flex-shrink-0" ref={calendarRef}>
					<button
						onClick={() => setShowCalendar(!showCalendar)}
						className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm transition-all duration-200 text-slate-900 font-medium text-sm whitespace-nowrap"
					>
						<Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
						<span>{formatDateForDisplay(selectedDate)}</span>
						<ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
					</button>

					{showCalendar && (
								<div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-50 w-64">
									<div className="flex items-center justify-between mb-4">
										<button onClick={handlePreviousMonth} className="p-1 hover:bg-slate-100 rounded">
											<ChevronLeft className="w-5 h-5" />
										</button>
										<h3 className="font-semibold text-slate-900">
											{calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
										</h3>
										<button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded">
											<ChevronRight className="w-5 h-5" />
										</button>
									</div>

									<div className="grid grid-cols-7 gap-1 mb-2">
										{['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(day => (
											<div key={day} className="text-center text-xs font-semibold text-slate-600 py-1">
												{day}
											</div>
										))}
									</div>

									<div className="grid grid-cols-7 gap-1">
										{calendarDays.map((dayObj, idx) => {
											const year = calendarMonth.getFullYear()
											const month = String(calendarMonth.getMonth() + 1).padStart(2, '0')
											const dayStr = String(dayObj.day).padStart(2, '0')
											const dateStr = `${year}-${month}-${dayStr}`
											const isSelected = dateStr === selectedDate && !dayObj.isOtherMonth

											return (
												<button
													key={idx}
														disabled={dayObj.isOtherMonth}
													onClick={() => {
															if (dayObj.isOtherMonth) return
														selectDateFromCalendar(dayObj.day)
														setShowCalendar(false)
													}}
													className={`p-2 text-xs rounded transition-colors ${
														dayObj.isOtherMonth
																? 'text-slate-300 cursor-not-allowed'
															: isSelected
															? 'bg-blue-600 text-white font-semibold'
															: 'hover:bg-slate-100 text-slate-900'
													}`}
												>
													{dayObj.day}
												</button>
											)
										})}
									</div>
								</div>
							)}
						</div>
					</div>

			<div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
			<div className="xl:col-span-4 order-3 grid grid-cols-1 gap-4">
				{loadingData ? (
					<>
						<Card className="border border-slate-200 shadow-sm">
							<CardContent className="px-6 py-5 h-32 space-y-3">
								<div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
								<div className="h-8 w-36 rounded bg-slate-200 animate-pulse" />
							</CardContent>
						</Card>
						<div className="grid grid-cols-2 gap-4">
							{[1, 2].map((item) => (
								<Card key={item} className="border border-slate-200 shadow-sm">
									<CardContent className="px-4 py-4 h-24 space-y-2">
										<div className="h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
										<div className="h-6 w-16 rounded bg-slate-200 animate-pulse" />
									</CardContent>
								</Card>
							))}
						</div>
						{[1, 2].map((item) => (
							<Card key={`kpi-${item}`} className="border border-slate-200 shadow-sm">
								<CardContent className="px-6 py-5 h-32 space-y-3">
									<div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
									<div className="h-8 w-36 rounded bg-slate-200 animate-pulse" />
									<div className="h-2 w-full rounded bg-slate-200 animate-pulse" />
								</CardContent>
							</Card>
						))}
					</>
				) : (
					<>
					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="px-6 py-5 h-32">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Reservas</p>
									<p className="text-2xl font-bold text-slate-900 mt-1">{dayStats.totalReservas} <span className="text-sm font-normal text-slate-500">de {dayStats.totalCapacity}</span></p>
								</div>
								<div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shadow-md flex-shrink-0">
									<Calendar className="w-4 h-4 text-slate-600" />
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Card className="border border-emerald-200/80 shadow-sm hover:shadow-md transition-all duration-200 bg-emerald-50/40">
							<CardContent className="px-4 py-4 h-24">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Confirmadas</p>
										<p className="text-2xl font-bold text-emerald-700 mt-1">{dayStats.confirmadas}</p>
									</div>
									<Check className="w-4 h-4 text-emerald-600" />
								</div>
							</CardContent>
						</Card>

						<Card className="border border-amber-200/80 shadow-sm hover:shadow-md transition-all duration-200 bg-amber-50/40">
							<CardContent className="px-4 py-4 h-24">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">Pendientes</p>
										<p className="text-2xl font-bold text-amber-700 mt-1">{pendingBookingsCount}</p>
									</div>
									<Clock className="w-4 h-4 text-amber-600" />
								</div>
							</CardContent>
						</Card>
					</div>

					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="px-6 py-5 h-32">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Ingresos</p>
									<p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrencyARS(dayStats.ingresos)}</p>
								</div>
								<div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shadow-md flex-shrink-0">
									<DollarSign className="w-4 h-4 text-slate-600" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="px-6 py-5 h-32">
							<div>
								<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Ocupación</p>
								<p className="text-2xl font-bold text-slate-900 mt-1">{dayStats.ocupacion}%</p>
								<div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
									<div className="h-full bg-slate-400 transition-all duration-300" style={{ width: `${dayStats.ocupacion}%` }}></div>
								</div>
							</div>
						</CardContent>
					</Card>
					</>
				)}
			</div>

			<Card className="border border-slate-200 shadow-sm xl:col-span-12 order-1">
				<CardHeader className="pb-4">
					<div>
						<CardTitle className="text-lg font-semibold text-slate-900">Disponibilidad de canchas</CardTitle>
						<CardDescription className="text-slate-600 mt-1">
							Vista de reservas y cupos disponibles por horario
						</CardDescription>
					</div>
				</CardHeader>
					<CardContent>
						{loadingData ? (
							<div className="space-y-3">
								<div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
								<div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
								<div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
								<div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
							</div>
						) : effectiveDayConfig.closed ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
								El centro figura cerrado en la fecha seleccionada{selectedHoliday?.label ? ` (${selectedHoliday.label})` : ''}.
							</div>
						) : (
						<div className="overflow-x-auto rounded-lg border border-slate-200">
							<div className="inline-block min-w-full">
								{/* Header — full hours only */}
								<div className="flex bg-slate-50">
									<div className="w-44 flex-shrink-0 px-4 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wider border-r border-slate-200 sticky left-0 z-10 bg-slate-50 flex items-center">
										Canchas
									</div>
									<div className="flex">
										{fullHours.map((hour, i) => (
											<div
												key={hour}
												className={`w-28 flex-shrink-0 py-2.5 text-center text-xs font-medium text-slate-500 ${i > 0 ? 'border-l border-slate-200' : ''}`}
											>
												{hour}
											</div>
										))}
									</div>
								</div>

								{/* Court rows */}
								{courts.map((court) => {
									const courtBookingsForDay = bookings.filter(
										b => b.date === selectedDate && b.court === court.id && b.status !== 'cancelada'
									)

									return (
										<div key={court.id} className="flex border-t border-slate-100 group/row">
											{/* Court label */}
											<div className="w-44 flex-shrink-0 px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10">
												<h4 className="font-medium text-slate-900 text-sm leading-tight">{court.name}</h4>
												<p className="text-[11px] text-slate-400 mt-0.5">
													{court.sport} · {court.indoor ? 'Cubierta' : 'Descubierta'}
												</p>
											</div>
											{/* Slots */}
											<div className="flex relative">
												{timeSlots.map((slot, slotIndex) => {
													const isHalfHour = slot.endsWith(':30')
													const slotStartDec = timeToDecimal(slot)
													const slotEndDec = slotStartDec + GRID_INTERVAL_MINUTES / 60
													const isStartAllowed = availableStartTimes.includes(slot)

													const startsInThisSlot = (booking: any) => {
														const resStartDec = timeToDecimal(booking.time)
														return resStartDec >= slotStartDec && resStartDec < slotEndDec
													}

													const intersectsThisSlot = (booking: any) => {
														const resStartDec = timeToDecimal(booking.time)
														const resDuration = Number(booking.duration) || 1
														const resEndDec = resStartDec + resDuration + bufferHours
														return slotStartDec < resEndDec && slotEndDec > resStartDec
													}

													const slotStartingBookings = courtBookingsForDay.filter(startsInThisSlot)
													const slotHasAnyBooking = courtBookingsForDay.some(intersectsThisSlot)
													const isCoveredByPreviousBooking = slotHasAnyBooking && slotStartingBookings.length === 0

													// Preview logic
													const isCoveredByPreview = slotPreview?.courtId === court.id && (() => {
														const ps = timeToDecimal(slotPreview!.startTime)
														const pe = ps + slotPreview!.duration
														return slotStartDec >= ps && slotStartDec < pe
													})()
													const previewStartsHere = slotPreview?.courtId === court.id && slotPreview?.startTime === slot
													const isFree = !slotHasAnyBooking && !isCoveredByPreview

													return (
														<div
															key={`${court.id}-${slot}`}
															data-slot-cell="true"
															onClick={(e) => {
															if (slotHasAnyBooking || !isStartAllowed || effectiveDayConfig.closed) return
																const rect = e.currentTarget.getBoundingClientRect()
																setActivePopover(null)
																setSlotPreview({
																	courtId: court.id,
																	startTime: slot,
																duration: defaultDurationHours,
																	anchorTop: rect.bottom,
																	anchorLeft: rect.left,
																})
															}}
															className={`w-14 flex-shrink-0 h-14 flex items-center justify-center text-[11px] relative transition-colors ${
																isHalfHour
																	? 'border-l border-dashed border-slate-100'
																	: slotIndex === 0 ? '' : 'border-l border-slate-200'
															} ${
																isFree && isStartAllowed
																	? 'cursor-pointer hover:bg-blue-50/60 group/slot'
																: isFree && !isStartAllowed
																	? 'bg-slate-50 text-slate-300 cursor-default'
																	: isCoveredByPreview && !previewStartsHere
																		? 'bg-blue-50/20'
																		: slotHasAnyBooking
																			? 'cursor-default'
																			: ''
															}`}
														>
															{isFree && isStartAllowed && (
																<span className="text-[10px] text-slate-300 group-hover/slot:text-blue-400 transition-colors select-none">
																	Libre
																</span>
															)}

															{/* Booking blocks */}
															{slotStartingBookings.map((reservation) => {
																const duration = Number(reservation.duration) || 1
																const isConfirmed = reservation.status === 'confirmada'
																return (
																	<div
																		key={reservation.id}
																		onClick={(e) => {
																			e.stopPropagation()
																			const rect = e.currentTarget.getBoundingClientRect()
																			setSlotPreview(null)
																			setActivePopover({
																				booking: reservation,
																				anchorTop: rect.top,
																				anchorLeft: rect.left + rect.width / 2,
																				anchorWidth: rect.width,
																			})
																		}}
																		className={`absolute top-0.5 bottom-0.5 left-0 z-20 rounded-md cursor-pointer flex items-center px-2 text-xs font-medium transition-shadow shadow-sm hover:shadow-md ${
																			isConfirmed
																				? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
																				: 'bg-amber-50 text-amber-800 border border-amber-200'
																		}`}
																		style={{
																			width: `calc(${duration} * 7rem - 2px)`,
																			minWidth: '3rem'
																		}}
																	>
																		<span className="truncate w-full">
																			{isConfirmed ? '✓ ' : '⏱ '}
																			{reservation.customer || 'Reserva'}
																		</span>
																	</div>
																)
															})}

															{/* Preview block */}
															{previewStartsHere && slotPreview && (() => {
																const hasPreviewConflict = courtBookingsForDay.some(b => {
																	const resStart = timeToDecimal(b.time)
																	const resEnd = resStart + (Number(b.duration) || 1) + bufferHours
																	const pStart = timeToDecimal(slotPreview.startTime)
																	const pEnd = pStart + slotPreview.duration
																	return pStart < resEnd && pEnd > resStart
																})
																const hasGapIssue = !!checkNoGapRule(slotPreview.courtId, slotPreview.startTime, slotPreview.duration)
																const isError = hasPreviewConflict || hasGapIssue

																return (
																	<div
																		className={`absolute top-0.5 bottom-0.5 left-0 z-[15] rounded-md pointer-events-none flex items-center px-2 text-xs font-medium border-2 border-dashed ${
																			isError
																				? 'bg-red-100/60 text-red-600 border-red-300'
																				: 'bg-blue-100/60 text-blue-700 border-blue-400'
																		}`}
																		style={{
																			width: `calc(${slotPreview.duration} * 7rem - 2px)`,
																			minWidth: '3rem'
																		}}
																	>
																		<span className="truncate w-full text-center">
																			{formatDurationHours(slotPreview.duration)}
																		</span>
																	</div>
																)
															})()}
														</div>
													)
												})}
											</div>
										</div>
									)
								})}
							</div>
						</div>
						)}

						{/* Compact legend */}
						<div className="mt-4 flex items-center gap-5 px-1">
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 rounded-sm bg-white border border-slate-200"></div>
								<span className="text-[11px] text-slate-400">Disponible</span>
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200"></div>
								<span className="text-[11px] text-slate-400">Confirmada</span>
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200"></div>
								<span className="text-[11px] text-slate-400">Pendiente</span>
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 rounded-sm bg-blue-100/60 border-2 border-dashed border-blue-400"></div>
								<span className="text-[11px] text-slate-400">Preview</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border border-slate-200 shadow-sm xl:col-span-8 order-2">
					<CardHeader className="pb-4 sticky top-2 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-slate-100">
						<div className="flex items-start justify-between gap-4">
							<div>
								<CardTitle className="text-lg font-semibold text-slate-900">Reservas del día</CardTitle>
								<CardDescription className="text-slate-500 mt-0.5 text-[13px]">
									Toca una reserva para ver detalles y acciones.
								</CardDescription>
								<div className="mt-2 flex flex-wrap gap-1.5">
									<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
										Total: {dayBookingsCount}
									</span>
									<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
										Confirmadas: {dayStats.confirmadas}
									</span>
									<span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
										Pendientes: {pendingBookingsCount}
									</span>
								</div>
							</div>
							<Button
								size="sm"
								onClick={openQuickReservation}
								disabled={loadingData}
								className="text-xs font-medium bg-blue-600 hover:bg-blue-700 shrink-0"
							>
								+ Nueva reserva
							</Button>
						</div>

						<div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-4">
							<div className="relative flex-1">
								<Input
									placeholder="Buscar cliente, teléfono..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="text-sm pl-3 pr-8 h-9"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery('')}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
							<div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0 w-full lg:w-auto overflow-x-auto">
								{([
									{ value: 'all' as const, label: 'Todas' },
									{ value: 'confirmada' as const, label: 'Confirmadas' },
									{ value: 'pendiente' as const, label: 'Pendientes' },
								]).map((tab) => (
									<button
										key={tab.value}
										onClick={() => setSelectedStatus(tab.value)}
										className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
											selectedStatus === tab.value
												? 'bg-white text-slate-900 shadow-sm'
												: 'text-slate-500 hover:text-slate-700'
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{loadingData ? (
							<div className="space-y-2">
								{[1, 2, 3].map((item) => (
									<div key={item} className="h-20 rounded-lg bg-slate-200 animate-pulse" />
								))}
							</div>
						) : (
						<div className="space-y-2">
							{filteredBookings.map((booking) => {
								const court = courts.find(c => c.id === booking.court)
								return (
								<div
									key={booking.id}
									onClick={() => setDetailsModal(booking)}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
								>
									<div className="flex items-start gap-4 flex-1 min-w-0">
										<div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
											<Calendar className="w-5 h-5 text-blue-600" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1 flex-wrap">
												<h3 className="font-semibold text-slate-900">{booking.customer}</h3>
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
													booking.status === 'confirmada'
														? 'bg-emerald-100 text-emerald-700'
														: 'bg-amber-100 text-amber-700'
												}`}>
													{booking.status === 'confirmada' ? '✓ Confirmada' : '⏱ Pendiente'}
												</span>
											</div>
											<div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
												<span className="flex items-center gap-1 whitespace-nowrap">
													<Clock className="w-4 h-4 text-slate-400" />
													{booking.time} · {formatDurationHours(Number(booking.duration) || 1)}
												</span>
												<span className="flex items-center gap-1 whitespace-nowrap">
													<MapPin className="w-4 h-4 text-slate-400" />
													{court?.name}
												</span>
												{booking.phone && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation()
															window.location.href = `tel:${booking.phone}`
														}}
														className="inline-flex items-center gap-1 whitespace-nowrap text-blue-600 hover:text-blue-700"
													>
														<Phone className="w-4 h-4" />
														<span>{booking.phone}</span>
													</button>
												)}
												<span className="font-semibold text-slate-900">{formatCurrencyARS(booking.price ?? 0)}</span>
											</div>
											<p className="mt-1 text-xs text-slate-500 hidden sm:block">
												Toca la reserva para ver más detalles y acciones.
											</p>
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={(e) => {
											e.stopPropagation()
											setDetailsModal(booking)
										}}
										className="text-xs font-medium flex-shrink-0"
									>
										Ver detalles y acciones
									</Button>
								</div>
							)
							})}
						</div>
						)}

						{!loadingData && filteredBookings.length === 0 && (
							<div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50/60">
								<Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
								<h3 className="text-lg font-medium text-slate-900 mb-2">
									{dayBookingsCount > 0 ? 'No hay resultados con estos filtros' : 'Aún no hay reservas para este día'}
								</h3>
								<p className="text-sm text-slate-600 max-w-md mx-auto">
									{dayBookingsCount > 0
										? 'Probá limpiar búsqueda o cambiar el estado para ver más resultados.'
										: 'Podés crear una nueva reserva desde la grilla o desde el botón de acción rápida.'}
								</p>
								<div className="mt-4 flex flex-wrap justify-center gap-2">
									{dayBookingsCount > 0 ? (
										<>
											<Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
												Limpiar búsqueda
											</Button>
											<Button variant="outline" size="sm" onClick={() => setSelectedStatus('all')}>
												Mostrar todas
											</Button>
										</>
									) : (
										<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openQuickReservation}>
											+ Crear primera reserva
										</Button>
									)}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

				<Dialog open={!!detailsModal} onOpenChange={(open) => !open && setDetailsModal(null)}>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Detalles de la reserva</DialogTitle>
						</DialogHeader>
						{detailsModal && (
							<div className="space-y-6 pt-2">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div>
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</p>
										<p className="text-xl font-semibold text-slate-900 mt-1 break-words">{detailsModal.customer}</p>
									</div>
									<span
										className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
											detailsModal.status === 'confirmada'
												? 'bg-emerald-50 text-emerald-700 border-emerald-200'
												: 'bg-amber-50 text-amber-700 border-amber-200'
										}`}
									>
										{detailsModal.status === 'confirmada' ? '✓ Confirmada' : '⏱ Pendiente'}
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fecha y hora</p>
										<p className="text-sm font-medium text-slate-900">
											{detailsModal.date} · {detailsModal.time}
										</p>
									</div>
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cancha</p>
										<p className="text-sm font-medium text-slate-900">
											{detailsModal.courtName || courts.find(c => c.id === detailsModal.court)?.name}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Duración</p>
										<p className="text-sm font-medium text-slate-900">{formatDurationHours(Number(detailsModal.duration) || 1)}</p>
									</div>
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Precio</p>
										<p className="text-lg font-semibold text-emerald-600">{formatCurrencyARS(detailsModal.price ?? 0)}</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
										<p className="text-sm font-medium text-slate-900 break-all">{detailsModal.email}</p>
									</div>
									<div className="space-y-1">
										<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Teléfono</p>
										<p className="text-sm font-medium text-slate-900">{detailsModal.phone}</p>
									</div>
								</div>
							</div>
						)}
						<DialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
							<Button
								variant="outline"
								className="w-full sm:w-auto order-2 sm:order-1"
								onClick={() => setDetailsModal(null)}
							>
								Cerrar
							</Button>
							{detailsModal?.status === 'pendiente' && (
								<>
									<Button
										className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white order-1 sm:order-2"
										onClick={() => handleConfirmReservation(detailsModal.id)}
									>
										<Check className="w-4 h-4 mr-2" />
										Confirmar
									</Button>
									<Button
										variant="destructive"
										className="w-full sm:w-auto order-3"
										onClick={() => handleDeleteReservation(detailsModal.id)}
									>
										<X className="w-4 h-4 mr-2" />
										{detailsModal._isPlayerBooking ? 'Rechazar' : 'Eliminar'}
									</Button>
								</>
							)}
							{detailsModal?.status === 'confirmada' && (
								<Button
									variant="destructive"
									className="w-full sm:w-auto order-3 sm:order-2"
									onClick={() => handleDeleteReservation(detailsModal.id)}
								>
									<X className="w-4 h-4 mr-2" />
									{detailsModal._isPlayerBooking ? 'Cancelar reserva' : 'Eliminar'}
								</Button>
							)}
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog open={!!deleteCandidateId} onOpenChange={(open) => !open && setDeleteCandidateId(null)}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>{bookings.find(b => b.id === deleteCandidateId)?._isPlayerBooking ? 'Rechazar reserva' : 'Eliminar reserva'}</DialogTitle>
						</DialogHeader>
						<div className="space-y-2 text-sm text-slate-600">
							{bookings.find(b => b.id === deleteCandidateId)?._isPlayerBooking ? (
								<p>¿Rechazar esta reserva del jugador? La reserva quedará cancelada y el jugador podrá verlo en su panel.</p>
							) : (
								<>
									<p>¿Estás seguro de que deseas eliminar esta reserva?</p>
									<p>Esta acción no se puede deshacer.</p>
								</>
							)}
						</div>
						<DialogFooter className="pt-4">
							<Button variant="outline" onClick={() => setDeleteCandidateId(null)} disabled={isDeletingReservation}>
								Cancelar
							</Button>
							<Button variant="destructive" onClick={confirmDeleteReservation} disabled={isDeletingReservation}>
								{isDeletingReservation
									? 'Procesando...'
									: bookings.find(b => b.id === deleteCandidateId)?._isPlayerBooking
										? 'Sí, rechazar'
										: 'Sí, eliminar'
								}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog open={!!newReservationModal} onOpenChange={(open) => !open && setNewReservationModal(null)}>
					<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Nueva reserva</DialogTitle>
						</DialogHeader>
						{newReservationModal && (() => {
							const modalMaxDuration = timeToDecimal(effectiveDayConfig.close) - timeToDecimal(newReservationModal.time)
							const modalDurationOptions = durationOptions.filter((duration) => duration <= modalMaxDuration)

							return (
								<div className="space-y-4">
									<div className="border-b border-slate-200 pb-4">
										<h3 className="text-sm font-semibold text-slate-900 mb-3">Datos del cliente</h3>
										<div className="space-y-3">
											<div>
												<Label htmlFor="customer" className="text-xs text-slate-600">Nombre del cliente</Label>
												<Input
													id="customer"
													placeholder="Nombre completo"
													className="mt-1"
													value={newReservationForm.customer}
													onChange={(e) => setNewReservationForm({ ...newReservationForm, customer: e.target.value })}
												/>
											</div>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<Label htmlFor="phone" className="text-xs text-slate-600">Teléfono</Label>
													<Input
														id="phone"
														placeholder="+34 612 345 678"
														className="mt-1"
														value={newReservationForm.phone}
														onChange={(e) => setNewReservationForm({ ...newReservationForm, phone: e.target.value })}
													/>
												</div>
												<div>
													<Label htmlFor="email" className="text-xs text-slate-600">Email</Label>
													<Input
														id="email"
														type="email"
														placeholder="correo@ejemplo.com"
														className="mt-1"
														value={newReservationForm.email}
														onChange={(e) => setNewReservationForm({ ...newReservationForm, email: e.target.value })}
													/>
												</div>
											</div>
										</div>
									</div>

									<div className="border-b border-slate-200 pb-4">
										<h3 className="text-sm font-semibold text-slate-900 mb-3">Detalles de la reserva</h3>
										<div className="space-y-3">
											<div className="grid grid-cols-2 gap-3">
												<div>
													<p className="text-xs text-slate-600 font-medium mb-1">Cancha</p>
													<p className="text-sm font-medium text-slate-900 px-3 py-2 bg-slate-50 rounded-md">{newReservationModal.courtName}</p>
												</div>
												<div>
													<p className="text-xs text-slate-600 font-medium mb-1">Fecha</p>
													<p className="text-sm font-medium text-slate-900 px-3 py-2 bg-slate-50 rounded-md">{formatDateForDisplay(selectedDate)}</p>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-3">
												<div>
													<Label htmlFor="time" className="text-xs text-slate-600">Hora de inicio</Label>
													<select
														id="time"
														value={newReservationModal.time}
														onChange={(e) => {
														const newTime = e.target.value
														const nextMaxDuration = timeToDecimal(effectiveDayConfig.close) - timeToDecimal(newTime)
														const nextDurations = durationOptions.filter((duration) => duration <= nextMaxDuration)
														const nextDuration = nextDurations.includes(newReservationForm.duration) ? newReservationForm.duration : nextDurations[0]
														const selectedCourt = courts.find(c => c.id === newReservationModal.courtId)
														const basePrice = selectedCourt?.pricePerHour || 0
														setNewReservationModal({ ...newReservationModal, time: newTime })
														setNewReservationForm({
															...newReservationForm,
															duration: nextDuration,
															price: nextDuration * basePrice,
														})
													}}
													className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													>
														{availableStartTimes.map((hour) => (
															<option key={hour} value={hour}>{hour}</option>
														))}
													</select>
												</div>
												<div>
													<Label htmlFor="duration" className="text-xs text-slate-600">Duración</Label>
													<select
														id="duration"
														value={newReservationForm.duration}
														onChange={(e) => {
														const duration = parseFloat(e.target.value)
														const selectedCourt = courts.find(c => c.id === newReservationModal.courtId)
														const basePrice = selectedCourt?.pricePerHour || 0
														setNewReservationForm({
															...newReservationForm,
															duration,
															price: duration * basePrice
														})
													}}
													className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													>
														{modalDurationOptions.map((duration) => (
															<option key={duration} value={duration}>{formatDurationHours(duration)}</option>
														))}
													</select>
												</div>
											</div>

											<div className={`rounded-md border px-3 py-2 text-xs ${
												reservationConflict
													? 'border-amber-200 bg-amber-50 text-amber-800'
													: 'border-emerald-200 bg-emerald-50 text-emerald-800'
											}`}>
												{reservationConflict
													? `Conflicto con ${reservationConflict.customer || 'otra reserva'} (${reservationConflict.time} · ${formatDurationHours(Number(reservationConflict.duration) || 1)}).`
													: 'Horario disponible para reservar.'}
											</div>
										</div>
									</div>

									<div>
										<Label className="text-xs text-slate-600">Precio total</Label>
										<div className="mt-1 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
											<span className="text-sm font-medium text-slate-900 flex-1">
												{formatCurrencyARS(newReservationForm.price)}
											</span>
										</div>
										<p className="text-xs text-slate-500 mt-1">
											{formatDurationHours(newReservationForm.duration)} × {formatCurrencyARS(courts.find(c => c.id === newReservationModal.courtId)?.pricePerHour || 0)}/h
										</p>
									</div>
								</div>
							)
						})()}
						<DialogFooter className="flex gap-2 pt-4">
							<Button variant="outline" onClick={() => setNewReservationModal(null)}>
								Cancelar
							</Button>
							<Button
								onClick={() => handleCreateReservation()}
								disabled={!canCreateReservation}
								className="bg-blue-600 hover:bg-blue-700"
							>
								<Check className="w-4 h-4 mr-2" />
								{reservationConflict ? 'Hay conflicto de horario' : gapViolation ? 'Deja hueco invendible' : 'Crear reserva'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Booking click popover */}
				{activePopover && (() => {
					const bk = activePopover.booking
					const court = courts.find(c => c.id === bk.court)
					const duration = Number(bk.duration) || 1
					const endTime = addTime(bk.time, duration)
					const popoverWidth = 288
					const popoverHeight = 320
					const showAbove = activePopover.anchorTop + popoverHeight > (typeof window !== 'undefined' ? window.innerHeight : 900)
					const top = showAbove ? Math.max(8, activePopover.anchorTop - popoverHeight - 8) : activePopover.anchorTop + 8
					const left = Math.max(8, Math.min(activePopover.anchorLeft - popoverWidth / 2, (typeof window !== 'undefined' ? window.innerWidth : 1200) - popoverWidth - 8))

					return (
						<div
							ref={popoverRef}
							className="fixed z-[60] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-150"
							style={{ top, left }}
						>
							<div className="flex items-start justify-between mb-3">
								<div>
									<h4 className="font-semibold text-slate-900 text-sm">{bk.courtName || court?.name}</h4>
									<p className="text-[11px] text-slate-400 mt-0.5">
										{court?.sport} · {court?.indoor ? 'Cubierta' : 'Descubierta'}
									</p>
								</div>
								<button onClick={() => setActivePopover(null)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors">
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-slate-500">Horario</span>
									<span className="font-medium text-slate-900">{bk.time} – {endTime}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500">Duración</span>
									<span className="font-medium text-slate-900">{formatDurationHours(duration)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500">Cliente</span>
									<span className="font-medium text-slate-900 text-right max-w-[140px] truncate">{bk.customer}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500">Precio</span>
									<span className="font-semibold text-emerald-600">{formatCurrencyARS(bk.price ?? 0)}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-slate-500">Estado</span>
									<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
										bk.status === 'confirmada'
											? 'bg-emerald-100 text-emerald-700'
											: 'bg-amber-100 text-amber-700'
									}`}>
										{bk.status === 'confirmada' ? '✓ Confirmada' : '⏱ Pendiente'}
									</span>
								</div>
							</div>

							<div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
								<Button
									size="sm"
									variant="outline"
									className="flex-1 text-xs"
									onClick={() => {
										setDetailsModal(bk)
										setActivePopover(null)
									}}
								>
									Ver detalles
								</Button>
								{bk.status === 'pendiente' && (
									<Button
										size="sm"
										className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
										onClick={() => {
											handleConfirmReservation(bk.id)
											setActivePopover(null)
										}}
									>
										Confirmar
									</Button>
								)}
							</div>
						</div>
					)
				})()}

				{/* Slot preview popover */}
				{slotPreview && (() => {
					const court = courts.find(c => c.id === slotPreview.courtId)
					const maxDuration = timeToDecimal(effectiveDayConfig.close) - timeToDecimal(slotPreview.startTime)
					const filteredDurations = durationOptions.filter(d => d <= maxDuration)
					const hasConflict = bookings.some(b => {
						if (b.date !== selectedDate || b.court !== slotPreview.courtId || b.status === 'cancelada') return false
						const resStart = timeToDecimal(b.time)
						const resEnd = resStart + (Number(b.duration) || 1) + bufferHours
						const pStart = timeToDecimal(slotPreview.startTime)
						const pEnd = pStart + slotPreview.duration
						return pStart < resEnd && pEnd > resStart
					})
					const gapMsg = checkNoGapRule(slotPreview.courtId, slotPreview.startTime, slotPreview.duration)
					const errorMsg = hasConflict ? `Conflicto con reserva existente` : gapMsg
					const popoverWidth = 256
					const top = slotPreview.anchorTop + 8
					const left = Math.max(8, Math.min(slotPreview.anchorLeft - popoverWidth / 4, (typeof window !== 'undefined' ? window.innerWidth : 1200) - popoverWidth - 8))

					return (
						<div
							ref={slotPreviewPopoverRef}
							className="fixed z-[60] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-150"
							style={{ top, left }}
						>
							<div className="flex items-center justify-between mb-3">
								<h4 className="font-semibold text-slate-900 text-sm">Nueva reserva</h4>
								<button onClick={() => setSlotPreview(null)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors">
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-slate-500">Cancha</span>
									<span className="font-medium text-slate-900">{court?.name}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-slate-500">Horario</span>
									<span className="font-medium text-slate-900">
										{slotPreview.startTime} – {addTime(slotPreview.startTime, slotPreview.duration)}
									</span>
								</div>

								<div>
									<p className="text-[11px] text-slate-500 mb-1.5">Duración</p>
									<div className="flex flex-wrap gap-1.5">
										{filteredDurations.map(d => (
											<button
												key={d}
												onClick={() => setSlotPreview({ ...slotPreview, duration: d })}
												className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
													slotPreview.duration === d
														? 'bg-blue-600 text-white shadow-sm'
														: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
												}`}
											>
												{formatDurationHours(d)}
											</button>
										))}
									</div>
								</div>

								{errorMsg && (
									<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
										⚠ {errorMsg}
									</div>
								)}
							</div>

							<div className="mt-4 pt-3 border-t border-slate-100">
								<Button
									size="sm"
									className="w-full text-xs bg-blue-600 hover:bg-blue-700"
									disabled={!!errorMsg}
									onClick={() => {
										setNewReservationModal({
											courtId: slotPreview.courtId,
											time: slotPreview.startTime,
											courtName: court?.name || ''
										})
										setNewReservationForm({
											customer: '',
											phone: '',
											email: '',
											duration: slotPreview.duration,
											price: (court?.pricePerHour || 0) * slotPreview.duration
										})
										setSlotPreview(null)
									}}
								>
									Reservar {slotPreview.startTime} – {addTime(slotPreview.startTime, slotPreview.duration)}
								</Button>
							</div>
						</div>
					)
				})()}

				{toast && (
					<div className="fixed bottom-5 right-5 z-[80] max-w-sm">
						<div
							className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${
								toast.type === 'success'
									? 'bg-emerald-50 border-emerald-200 text-emerald-800'
									: 'bg-red-50 border-red-200 text-red-800'
							}`}
						>
							<div className="flex items-start gap-3">
								<div className={`mt-0.5 h-2 w-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
								<div className="text-sm font-medium leading-5">{toast.message}</div>
								<button
									type="button"
									onClick={() => setToast(null)}
									className="ml-auto text-slate-500 hover:text-slate-700"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				)}
		</div>
	)
}
