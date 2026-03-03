"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Phone, ChevronLeft, ChevronRight, DollarSign, ChevronDown, X, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"
import { formatCurrencyARS, formatDurationHours } from "@/lib/utils"

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']

const mockCourts = [
	{ id: '1', name: 'Cancha 1', sport: 'Padel', surface: 'Synthetic', indoor: false, pricePerHour: 50 },
	{ id: '2', name: 'Cancha 2', sport: 'Padel', surface: 'Synthetic', indoor: true, pricePerHour: 60 },
	{ id: '3', name: 'Cancha 3', sport: 'Padel', surface: 'Synthetic', indoor: true, pricePerHour: 55 },
]

export default function ReservasPage() {
	const { user } = useAuth()
	const [selectedDate, setSelectedDate] = useState<string>('2026-03-01')
	const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmada' | 'pendiente'>('all')
	const [showCalendar, setShowCalendar] = useState(false)
	const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 2, 1))
	const [courts, setCourts] = useState<any[]>(mockCourts)
	const [bookings, setBookings] = useState<any[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [detailsModal, setDetailsModal] = useState<any>(null)
	const [newReservationModal, setNewReservationModal] = useState<any>(null)
	const [hoveredReservation, setHoveredReservation] = useState<any>(null)
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
	const [newReservationForm, setNewReservationForm] = useState({
		customer: '',
		phone: '',
		email: '',
		duration: 1,
		price: 0
	})
	const calendarRef = useRef<HTMLDivElement>(null)

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
		const fetchData = async () => {
			if (!user) return
			try {
				const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts)
				const courtsSnapshot = await getDocs(courtsRef)
				const courtsData = courtsSnapshot.docs.map((docSnap) => ({
					id: docSnap.id,
					...(docSnap.data() as any)
				}))
				if (courtsData.length > 0) {
					setCourts(courtsData)
				}

				const bookingsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.bookings)
				const bookingsSnapshot = await getDocs(bookingsRef)
				const bookingsData = bookingsSnapshot.docs.map((docSnap) => ({
					id: docSnap.id,
					...(docSnap.data() as any)
				}))
				setBookings(bookingsData)
			} catch (error) {
				console.error("Error loading data:", error)
			}
		}

		fetchData()
	}, [user])

	const totalCapacity = HOURS.length * courts.length

	const dayStats = useMemo(() => {
		const dayBookings = bookings.filter(b => b.date === selectedDate)
		const confirmedBookings = dayBookings.filter(b => b.status === 'confirmada')

		const totalIncome = confirmedBookings.reduce((sum, booking) => {
			const court = courts.find(c => c.id === booking.court)
			const duration = Number(booking.duration) || 1
			const pricePerHour = court?.pricePerHour || booking.price || 0
			return sum + (pricePerHour * duration)
		}, 0)

		const occupancyPercent = (dayBookings.length / totalCapacity) * 100

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

	const handleCreateReservation = async () => {
		if (!user || !newReservationModal || !newReservationForm.customer.trim() || !newReservationForm.phone.trim() || !newReservationForm.email.trim()) {
			alert('Por favor completa todos los campos')
			return
		}

		try {
			const [newResHour, newResMin] = newReservationModal.time.split(':').map(Number)
			const newResStartDec = newResHour + newResMin / 60
			const newResEndDec = newResStartDec + newReservationForm.duration

			const conflictingReservation = bookings.find(b => {
				if (b.date !== selectedDate || b.court !== newReservationModal.courtId || b.status === 'cancelada') return false

				const [resHour, resMin] = b.time.split(':').map(Number)
				const resStartDec = resHour + resMin / 60
				const resDuration = Number(b.duration) || 1
				const resEndDec = resStartDec + resDuration

				return (newResStartDec < resEndDec && newResEndDec > resStartDec)
			})

			if (conflictingReservation) {
				alert('⚠️ Ya existe una reserva que interfiere con este horario. Elige otro horario u otra cancha.')
				return
			}

			const bookingsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.bookings)

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
			setNewReservationForm({
				customer: '',
				phone: '',
				email: '',
				duration: 1,
				price: 0
			})

			alert('✅ ¡Reserva creada exitosamente!')
		} catch (error) {
			console.error('Error creating reservation:', error)
			alert('Error al crear la reserva')
		}
	}

	const handleConfirmReservation = async (reservationId: string) => {
		if (!user) return

		try {
			const bookingRef = doc(
				db,
				FIRESTORE_COLLECTIONS.centers,
				user.uid,
				CENTER_SUBCOLLECTIONS.bookings,
				reservationId
			)
			await updateDoc(bookingRef, { status: 'confirmada' })

			setBookings(bookings.map(b =>
				b.id === reservationId ? { ...b, status: 'confirmada' } : b
			))

			if (detailsModal?.id === reservationId) {
				setDetailsModal({ ...detailsModal, status: 'confirmada' })
			}

			alert('✅ Reserva confirmada exitosamente')
		} catch (error) {
			console.error('Error confirming reservation:', error)
			alert('Error al confirmar la reserva')
		}
	}

	const handleDeleteReservation = async (reservationId: string) => {
		const isConfirmed = window.confirm('¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.')
		if (!isConfirmed) return

		if (!user) return

		try {
			const bookingRef = doc(
				db,
				FIRESTORE_COLLECTIONS.centers,
				user.uid,
				CENTER_SUBCOLLECTIONS.bookings,
				reservationId
			)
			await deleteDoc(bookingRef)

			setBookings(bookings.filter(b => b.id !== reservationId))
			setDetailsModal(null)

			alert('✅ Reserva eliminada exitosamente')
		} catch (error) {
			console.error('Error deleting reservation:', error)
			alert('Error al eliminar la reserva')
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
													onClick={() => {
														selectDateFromCalendar(dayObj.day)
														setShowCalendar(false)
													}}
													className={`p-2 text-xs rounded transition-colors ${
														dayObj.isOtherMonth
															? 'text-slate-300 cursor-default'
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

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="p-6 space-y-2">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Reservas del día</p>
									<p className="text-2xl font-bold text-slate-900 mt-1">{dayStats.totalReservas} <span className="text-sm font-normal text-slate-500">de {dayStats.totalCapacity}</span></p>
									<p className="text-xs text-slate-500 mt-1">{dayStats.confirmadas} confirmadas</p>
								</div>
								<div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shadow-md flex-shrink-0">
									<Calendar className="w-4 h-4 text-slate-600" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="p-6 space-y-2">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Ingresos del día</p>
									<p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrencyARS(dayStats.ingresos)}</p>
									<p className="text-xs text-slate-500 mt-1">Reservas confirmadas</p>
								</div>
								<div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shadow-md flex-shrink-0">
									<DollarSign className="w-4 h-4 text-slate-600" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
						<CardContent className="p-6 space-y-2">
							<div>
								<p className="text-slate-600 text-xs font-medium uppercase tracking-wide">Ocupación</p>
								<p className="text-2xl font-bold text-slate-900 mt-1">{dayStats.ocupacion}%</p>
								<div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
									<div className="h-full bg-slate-400 transition-all duration-300" style={{ width: `${dayStats.ocupacion}%` }}></div>
								</div>
							</div>
						</CardContent>
					</Card>
			</div>

			<Card className="border border-slate-200 shadow-sm">
				<CardHeader className="pb-4">
					<div>
						<CardTitle className="text-lg font-semibold text-slate-900">Disponibilidad de canchas</CardTitle>
						<CardDescription className="text-slate-600 mt-1">
							Vista de reservas y cupos disponibles por horario
						</CardDescription>
					</div>
				</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<div className="inline-block min-w-full">
								<div className="flex border-b-2 border-slate-400">
									<div className="w-40 flex-shrink-0 px-4 py-3 font-semibold text-slate-900 text-sm bg-slate-100 border-r-2 border-slate-400 sticky left-0 z-10">
										Canchas
									</div>
									<div className="flex">
										{HOURS.map((hour) => (
											<div
												key={hour}
												className="w-20 flex-shrink-0 px-2 py-3 text-center text-xs font-semibold text-slate-800 border-r-2 border-slate-350 bg-slate-50"
											>
												{hour}
											</div>
										))}
									</div>
								</div>

								{courts.map((court) => {
									const courtBookingsForDay = bookings.filter(
										b => b.date === selectedDate && b.court === court.id && b.status !== 'cancelada'
									)

									return (
										<div key={court.id} className="border-b-2 border-slate-300 last:border-b-0">
											<div className="flex">
												<div className="w-40 flex-shrink-0 px-4 py-3 border-r-2 border-slate-350 bg-white hover:bg-slate-50 sticky left-0 z-10 transition-colors">
													<h4 className="font-semibold text-slate-900 text-sm">{court.name}</h4>
													<p className="text-xs text-slate-600 mt-0.5">
														{court.sport} · {court.indoor ? 'Cubierta' : 'Descubierta'}
													</p>
												</div>
												<div className="flex relative">
													{HOURS.map((hour) => {
														const [slotHour] = hour.split(':').map(Number)

														return (
															<div
																key={`${court.id}-${hour}`}
																onClick={() => {
																	const selectedCourt = courts.find(c => c.id === court.id)
																	setNewReservationModal({ courtId: court.id, time: hour, courtName: court.name })
																	setNewReservationForm({
																		customer: '',
																		phone: '',
																		email: '',
																		duration: 1,
																		price: selectedCourt?.pricePerHour || 0
																	})
																}}
																className="w-20 flex-shrink-0 h-11 border-r-2 border-slate-350 flex items-center justify-center text-xs font-medium cursor-pointer bg-white text-slate-500 hover:bg-blue-50/80 transition-colors relative"
															>
																<span className="text-xs text-slate-400">Libre</span>

																{courtBookingsForDay.filter(b => {
																	const [bHour] = b.time.split(':').map(Number)
																	return bHour === slotHour
																}).map((reservation) => {
																	const duration = Number(reservation.duration) || 1

																	return (
																		<div
																			key={reservation.id}
																			onClick={(e) => {
																				e.stopPropagation()
																				setDetailsModal(reservation)
																			}}
																			onMouseEnter={(e) => {
																				const rect = e.currentTarget.getBoundingClientRect()
																				setTooltipPos({ x: rect.left, y: rect.top - 120 })
																				setHoveredReservation(reservation)
																			}}
																			onMouseLeave={() => setHoveredReservation(null)}
																			className={`absolute top-0 left-0 h-full cursor-pointer flex items-center justify-center text-xs font-semibold transition-colors shadow-sm border-l-4 ${
																				reservation.status === 'confirmada'
																					? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-l-emerald-500'
																					: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-l-amber-500'
																			}`}
																			style={{
																				width: `calc(${duration} * 5rem)`,
																				minWidth: '20px'
																			}}
																		>
																			{duration <= 0.5 ? '' : (reservation.status === 'confirmada' ? '✓' : '⏱')}
																		</div>
																	)
																})}
															</div>
														)
													})}
												</div>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						<div className="mt-6 flex flex-wrap items-center gap-6 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 rounded bg-white border border-slate-300"></div>
								<span className="text-xs font-medium text-slate-600">Disponible</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 rounded bg-emerald-100 border-l-2 border-l-emerald-500"></div>
								<span className="text-xs font-medium text-slate-600">Confirmada</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 rounded bg-amber-100 border-l-2 border-l-amber-500"></div>
								<span className="text-xs font-medium text-slate-600">Pendiente</span>
							</div>
						</div>

						{hoveredReservation && (
							<div
								className="fixed bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 pointer-events-none"
								style={{
									left: `${tooltipPos.x}px`,
									top: `${tooltipPos.y}px`,
									minWidth: '250px'
								}}
							>
								<div className="space-y-1 text-sm">
									<div className="font-semibold">{hoveredReservation.courtName}</div>
									<div className="text-slate-300">
										{hoveredReservation.time} · {formatDurationHours(Number(hoveredReservation.duration) || 1)}
									</div>
									<div className="text-slate-300">
										{courts.find(c => c.id === hoveredReservation.court)?.sport || 'Deporte'} · {courts.find(c => c.id === hoveredReservation.court)?.surface || 'Superficie'}
									</div>
									<div className="text-slate-300">
										{hoveredReservation.customer}
									</div>
									<div className={`pt-1 ${
										hoveredReservation.status === 'confirmada' ? 'text-emerald-300' : 'text-amber-300'
									}`}>
										{formatCurrencyARS(hoveredReservation.price ?? 0)}
									</div>
									<div className="text-slate-400 text-xs pt-1 mt-1 border-t border-slate-700">
										{hoveredReservation.status === 'confirmada' ? '✓ Confirmada' : '⏱ Pendiente'}
									</div>
								</div>
								<div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border border-slate-200 shadow-sm">
					<CardHeader className="pb-4">
						<div>
							<CardTitle className="text-lg font-semibold text-slate-900">Reservas del día</CardTitle>
							<CardDescription className="text-slate-600 mt-1">
								Toca una reserva para ver detalles, confirmar o cancelar. También podés llamar al cliente desde aquí.
							</CardDescription>
						</div>

						<div className="flex flex-col sm:flex-row gap-3 mt-4">
							<Input
								placeholder="Buscar cliente, teléfono..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="flex-1 text-sm"
							/>
							<div className="flex gap-2 flex-shrink-0">
								<Button
									variant={selectedStatus === 'all' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setSelectedStatus('all')}
									className="text-xs font-medium"
								>
									Todas
								</Button>
								<Button
									variant={selectedStatus === 'confirmada' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setSelectedStatus('confirmada')}
									className="text-xs font-medium"
								>
									Confirmadas
								</Button>
								<Button
									variant={selectedStatus === 'pendiente' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setSelectedStatus('pendiente')}
									className="text-xs font-medium"
								>
									Pendientes
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
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

						{filteredBookings.length === 0 && (
							<div className="text-center py-12">
								<Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
								<h3 className="text-lg font-medium text-slate-900 mb-2">Aún no hay reservas</h3>
								<p className="text-sm text-slate-600">No hay reservas registradas para esta fecha y estado.</p>
							</div>
						)}
					</CardContent>
				</Card>

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
										Eliminar
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
									Eliminar
								</Button>
							)}
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog open={!!newReservationModal} onOpenChange={(open) => !open && setNewReservationModal(null)}>
					<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Nueva reserva</DialogTitle>
						</DialogHeader>
						{newReservationModal && (
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
														setNewReservationModal({ ...newReservationModal, time: newTime })
													}}
													className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
												>
													{HOURS.map((hour) => (
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
													<option value="0.5">30 minutos</option>
													<option value="1">1 hora</option>
													<option value="1.5">1 hora 30 min</option>
													<option value="2">2 horas</option>
													<option value="2.5">2 horas 30 min</option>
													<option value="3">3 horas</option>
												</select>
											</div>
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
						)}
						<DialogFooter className="flex gap-2 pt-4">
							<Button variant="outline" onClick={() => setNewReservationModal(null)}>
								Cancelar
							</Button>
							<Button
								onClick={() => handleCreateReservation()}
								className="bg-blue-600 hover:bg-blue-700"
							>
								<Check className="w-4 h-4 mr-2" />
								Crear reserva
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
		</div>
	)
}
