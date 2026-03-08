"use client"

import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { OverviewCharts } from "@/components/dashboard/overview-charts"
import { RecentBookings } from "@/components/dashboard/recent-bookings"
import { ActionItems } from "@/components/dashboard/action-items"
import {
	DollarSign,
	CalendarDays,
	Users,
	Star
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"
import { formatCurrencyARS } from "@/lib/utils"

type Booking = any

function normalizeStatus(status?: string) {
	return String(status || "").toLowerCase()
}

function isCancelled(booking: Booking) {
	const s = normalizeStatus(booking.status)
	return s === "cancelada" || s === "cancelled"
}

function isConfirmed(booking: Booking) {
	const s = normalizeStatus(booking.status)
	return s === "confirmada" || s === "confirmed"
}

function bookingDateTime(booking: Booking): Date | null {
	const rawDate = booking.date || booking.dateKey
	if (!rawDate) return null

	if (rawDate?.toDate) {
		return rawDate.toDate()
	}

	if (rawDate instanceof Date) {
		return rawDate
	}

	const datePart = String(rawDate)
	if (datePart.includes("T")) {
		const dt = new Date(datePart)
		return Number.isNaN(dt.getTime()) ? null : dt
	}

	const timePart = String(booking.time || "00:00")
	const dt = new Date(`${datePart}T${timePart}:00`)
	return Number.isNaN(dt.getTime()) ? null : dt
}

function bookingDurationHours(booking: Booking): number {
	const duration = Number(booking.duration)
	if (!Number.isNaN(duration) && duration > 0) {
		return duration > 10 ? duration / 60 : duration
	}
	const durationMinutes = Number(booking.durationMinutes)
	if (!Number.isNaN(durationMinutes) && durationMinutes > 0) {
		return durationMinutes / 60
	}
	return 1
}

function clientKey(booking: Booking): string {
	return (
		String(booking.customerEmail || booking.email || booking.phone || booking.customer || "")
			.trim()
			.toLowerCase()
	)
}

export default function DashboardCentrosPage() {
	const { user, centerId } = useAuth()
	const resolvedCenterId = centerId || user?.uid || null
	const [loading, setLoading] = useState(true)
	const [period, setPeriod] = useState("Hoy")
	const [centerName, setCenterName] = useState("tu centro")
	const [bookings, setBookings] = useState<Booking[]>([])

	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!resolvedCenterId) return
			setLoading(true)
			try {
				const loadBookings = async (rootCollection: string) => {
					try {
						const ref = collection(db, rootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.bookings)
						const snap = await getDocs(ref)
						return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
					} catch {
						return [] as Booking[]
					}
				}

				const loadCenter = async (rootCollection: string) => {
					try {
						const ref = doc(db, rootCollection, resolvedCenterId)
						const snap = await getDoc(ref)
						return snap.exists() ? (snap.data() as any) : null
					} catch {
						return null
					}
				}

				const [newBookings, legacyBookings, newCenter, legacyCenter] = await Promise.all([
					loadBookings(FIRESTORE_COLLECTIONS.centers),
					loadBookings(FIRESTORE_COLLECTIONS.legacyCenters),
					loadCenter(FIRESTORE_COLLECTIONS.centers),
					loadCenter(FIRESTORE_COLLECTIONS.legacyCenters),
				])

				setBookings(newBookings.length > 0 ? newBookings : legacyBookings)
				const centerData = newCenter || legacyCenter
				setCenterName(centerData?.name || "tu centro")
			} catch (error) {
				console.error("Error loading dashboard data:", error)
			} finally {
				setLoading(false)
			}
		}

		fetchDashboardData()
	}, [resolvedCenterId])

	const now = new Date()

	const periodRange = useMemo(() => {
		const start = new Date(now)
		const end = new Date(now)

		if (period === "Hoy") {
			start.setHours(0, 0, 0, 0)
			end.setHours(23, 59, 59, 999)
		} else if (period === "Semana") {
			start.setDate(now.getDate() - 6)
			start.setHours(0, 0, 0, 0)
			end.setHours(23, 59, 59, 999)
		} else {
			start.setDate(1)
			start.setHours(0, 0, 0, 0)
			end.setHours(23, 59, 59, 999)
		}

		return { start, end }
	}, [now, period])

	const previousRange = useMemo(() => {
		const { start, end } = periodRange
		const diff = end.getTime() - start.getTime() + 1
		return {
			start: new Date(start.getTime() - diff),
			end: new Date(end.getTime() - diff),
		}
	}, [periodRange])

	const bookingsInRange = useMemo(() => {
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			if (!dt) return false
			return dt >= periodRange.start && dt <= periodRange.end
		})
	}, [bookings, periodRange])

	const bookingsPreviousRange = useMemo(() => {
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			if (!dt) return false
			return dt >= previousRange.start && dt <= previousRange.end
		})
	}, [bookings, previousRange])

	const confirmedIncome = useMemo(() => {
		return bookingsInRange.filter(isConfirmed).reduce((sum, b) => sum + (Number(b.price) || 0), 0)
	}, [bookingsInRange])

	const previousConfirmedIncome = useMemo(() => {
		return bookingsPreviousRange.filter(isConfirmed).reduce((sum, b) => sum + (Number(b.price) || 0), 0)
	}, [bookingsPreviousRange])

	const nonCancelledCurrent = useMemo(() => bookingsInRange.filter((b) => !isCancelled(b)), [bookingsInRange])
	const nonCancelledPrevious = useMemo(() => bookingsPreviousRange.filter((b) => !isCancelled(b)), [bookingsPreviousRange])

	const clientFirstBookingMap = useMemo(() => {
		const map = new Map<string, Date>()
		bookings.forEach((b) => {
			if (isCancelled(b)) return
			const key = clientKey(b)
			const dt = bookingDateTime(b)
			if (!key || !dt) return
			const prev = map.get(key)
			if (!prev || dt < prev) map.set(key, dt)
		})
		return map
	}, [bookings])

	const totalClients = clientFirstBookingMap.size

	const newClientsCurrent = useMemo(() => {
		let count = 0
		clientFirstBookingMap.forEach((d) => {
			if (d >= periodRange.start && d <= periodRange.end) count += 1
		})
		return count
	}, [clientFirstBookingMap, periodRange])

	const incomeTrend = previousConfirmedIncome > 0
		? ((confirmedIncome - previousConfirmedIncome) / previousConfirmedIncome) * 100
		: (confirmedIncome > 0 ? 100 : 0)

	const reservationsTrendDiff = nonCancelledCurrent.length - nonCancelledPrevious.length

	const revenueData = useMemo(() => {
		const labels: Array<{ name: string; total: number; dayStart: Date; dayEnd: Date }> = []
		const days = period === "Mes" ? 30 : 7
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date(now)
			d.setDate(now.getDate() - i)
			d.setHours(0, 0, 0, 0)
			const e = new Date(d)
			e.setHours(23, 59, 59, 999)
			labels.push({
				name: d.toLocaleDateString("es-AR", { weekday: days === 7 ? "short" : undefined, day: days === 30 ? "2-digit" : undefined }).replace(".", ""),
				total: 0,
				dayStart: d,
				dayEnd: e,
			})
		}

		labels.forEach((item) => {
			item.total = bookings
				.filter((b) => isConfirmed(b))
				.filter((b) => {
					const dt = bookingDateTime(b)
					return dt && dt >= item.dayStart && dt <= item.dayEnd
				})
				.reduce((sum, b) => sum + (Number(b.price) || 0), 0)
		})

		return labels.map(({ name, total }) => ({ name, total }))
	}, [bookings, now, period])

	const hourlyData = useMemo(() => {
		const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
		const base = new Map(slots.map((s) => [s, 0]))

		const source = period === "Hoy"
			? bookings.filter((b) => {
				const dt = bookingDateTime(b)
				if (!dt || isCancelled(b)) return false
				const start = new Date(now)
				start.setHours(0, 0, 0, 0)
				const end = new Date(now)
				end.setHours(23, 59, 59, 999)
				return dt >= start && dt <= end
			})
			: nonCancelledCurrent

		source.forEach((b) => {
			const raw = String(b.time || "")
			const hh = raw.slice(0, 2)
			if (!hh) return
			const bucketHour = Math.floor(Number(hh) / 2) * 2
			const bucket = `${String(bucketHour).padStart(2, "0")}:00`
			if (base.has(bucket)) {
				base.set(bucket, (base.get(bucket) || 0) + 1)
			}
		})

		return slots.map((time) => ({ time, bookings: base.get(time) || 0 }))
	}, [bookings, nonCancelledCurrent, now, period])

	const upcomingBookings = useMemo(() => {
		return bookings
			.filter((b) => !isCancelled(b))
			.map((b) => ({ ...b, dt: bookingDateTime(b) }))
			.filter((b) => b.dt && b.dt >= now)
			.sort((a, b) => a.dt.getTime() - b.dt.getTime())
			.slice(0, 5)
			.map((b) => {
				const duration = bookingDurationHours(b)
				const end = new Date(b.dt)
				end.setMinutes(end.getMinutes() + Math.round(duration * 60))
				const status = normalizeStatus(b.status)
				return {
					id: String(b.id),
					customer: String(b.customer || b.customerName || "Cliente"),
					time: `${b.dt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} · ${String(b.time || "00:00")} - ${end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
					court: String(b.courtName || b.court || "Cancha"),
					amount: formatCurrencyARS(Number(b.price) || 0),
					status: status === "confirmada" || status === "confirmed" ? "Confirmada" : "Pendiente",
					statusVariant: status === "confirmada" || status === "confirmed" ? "default" : "secondary" as const,
				}
			})
	}, [bookings, now])

	const pendingToday = useMemo(() => {
		const start = new Date(now)
		start.setHours(0, 0, 0, 0)
		const end = new Date(now)
		end.setHours(23, 59, 59, 999)
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			const s = normalizeStatus(b.status)
			return dt && dt >= start && dt <= end && (s === "pendiente" || s === "pending")
		}).length
	}, [bookings, now])

	const confirmedToday = useMemo(() => {
		const start = new Date(now)
		start.setHours(0, 0, 0, 0)
		const end = new Date(now)
		end.setHours(23, 59, 59, 999)
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			return dt && dt >= start && dt <= end && isConfirmed(b)
		}).length
	}, [bookings, now])

	const upcoming24h = useMemo(() => {
		const end = new Date(now)
		end.setHours(end.getHours() + 24)
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			return dt && dt >= now && dt <= end && !isCancelled(b)
		}).length
	}, [bookings, now])

	const cancelled7d = useMemo(() => {
		const start = new Date(now)
		start.setDate(now.getDate() - 6)
		start.setHours(0, 0, 0, 0)
		return bookings.filter((b) => {
			const dt = bookingDateTime(b)
			return dt && dt >= start && isCancelled(b)
		}).length
	}, [bookings, now])

	return (
		<div className="space-y-8 animate-in fade-in-50 duration-500">

			{/* Encabezado */}
			<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido de nuevo, {centerName}</h1>
					<p className="text-slate-500 mt-2">Esto es lo que pasa hoy en tu centro.</p>
				</div>
				<div className="flex items-center space-x-2 bg-background p-1 rounded-lg border shadow-sm">
					{["Hoy", "Semana", "Mes"].map((p) => (
						<button
							key={p}
							onClick={() => setPeriod(p)}
							className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
								period === p ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-black"
							}`}
						>
							{p}
						</button>
					))}
				</div>
			</div>

			{/* Fila de KPIs */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<KpiCard
					title="Ingresos totales"
					value={loading ? "—" : formatCurrencyARS(confirmedIncome)}
					trend={loading ? "" : `${incomeTrend >= 0 ? "+" : ""}${incomeTrend.toFixed(1)}%`}
					trendUp={incomeTrend >= 0}
					description="vs período anterior"
					icon={DollarSign}
				/>
				<KpiCard
					title="Reservas activas"
					value={loading ? "—" : String(nonCancelledCurrent.length)}
					trend={loading ? "" : `${reservationsTrendDiff >= 0 ? "+" : ""}${reservationsTrendDiff}`}
					trendUp={reservationsTrendDiff >= 0}
					description={period.toLowerCase()}
					icon={CalendarDays}
				/>
				<KpiCard
					title="Clientes totales"
					value={loading ? "—" : new Intl.NumberFormat("es-AR").format(totalClients)}
					trend={loading ? "" : `+${newClientsCurrent}`}
					trendUp={true}
					description={period === "Hoy" ? "nuevos hoy" : period === "Semana" ? "nuevos en 7 días" : "nuevos este mes"}
					icon={Users}
				/>
				<KpiCard
					title="Valoración promedio"
					value={loading ? "—" : "N/D"}
					description="sin reseñas registradas"
					icon={Star}
				/>
			</div>

			{/* Fila de Gráficos */}
			<OverviewCharts revenueData={revenueData} hourlyData={hourlyData} loading={loading} />

			{/* Fila Inferior */}
			<div className="grid gap-4 grid-cols-1 lg:grid-cols-7">

				{/* Próximas reservas */}
				<Card className="col-span-1 lg:col-span-4 border-none shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between">
						 <div className="space-y-1">
								 <CardTitle>Próximas reservas</CardTitle>
								 <CardDescription className="text-black">
									Tienes {pendingToday} reservas pendientes hoy.
								 </CardDescription>
						 </div>
							 <Button variant="outline" size="sm">Ver todo</Button>
					</CardHeader>
					<CardContent>
						<RecentBookings bookings={upcomingBookings} />
					</CardContent>
				</Card>

				{/* Acciones y Operaciones */}
				<div className="col-span-1 lg:col-span-3">
						 <ActionItems
							pendingToday={pendingToday}
							upcoming24h={upcoming24h}
							confirmedToday={confirmedToday}
							cancelled7d={cancelled7d}
						 />
				</div>
			</div>
		</div>
	)
}
