"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
	Loader2,
	AlertCircle,
	CheckCircle,
	ChevronDown,
	Clock,
	ShieldAlert,
	TrendingUp,
	CalendarOff,
	Plus,
	Trash2,
	Info,
} from "lucide-react"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS, CENTER_SETTINGS_DOCS } from "@/lib/firestorePaths"
import { showSavePopupAndRefresh } from "@/lib/save-feedback"
import { useOnboarding } from "@/lib/onboarding"
import type { OperationSettings, HolidayEntry } from "@/lib/types"

/* ────────── defaults ────────── */
const DEFAULT_SETTINGS: OperationSettings = {
	minSlotMinutes: 60,
	maxSlotMinutes: 120,
	slotStepMinutes: 30,
	bufferMinutes: 0,
	minAdvanceHours: 1,
	maxAdvanceDays: 14,

	cancellationEnabled: true,
	freeCancelHours: 24,
	lateCancelFeePercent: 50,
	noShowFeePercent: 100,

	peakHoursEnabled: false,
	peakHoursStart: "18:00",
	peakHoursEnd: "22:00",
	peakPriceMultiplier: 1.5,
	weekendPriceMultiplier: 1,

	depositEnabled: false,
	depositPercent: 50,
	remainingPaymentInstructions: "",

	holidays: [],
}

/* ────────── helpers ────────── */
const DURATION_OPTIONS = [
	{ value: 30, label: "30 min" },
	{ value: 60, label: "1 hora" },
	{ value: 90, label: "1 h 30 min" },
	{ value: 120, label: "2 horas" },
	{ value: 150, label: "2 h 30 min" },
	{ value: 180, label: "3 horas" },
]

const STEP_OPTIONS = [
	{ value: 30, label: "30 min" },
	{ value: 60, label: "1 hora" },
]

const BUFFER_OPTIONS = [
	{ value: 0, label: "Sin buffer" },
	{ value: 5, label: "5 min" },
	{ value: 10, label: "10 min" },
	{ value: 15, label: "15 min" },
	{ value: 30, label: "30 min" },
]

const ADVANCE_HOURS = [
	{ value: 0, label: "Sin mínimo" },
	{ value: 1, label: "1 hora" },
	{ value: 2, label: "2 horas" },
	{ value: 3, label: "3 horas" },
	{ value: 6, label: "6 horas" },
	{ value: 12, label: "12 horas" },
	{ value: 24, label: "24 horas" },
]

const PRESET_ADVANCE_VALUES = new Set(ADVANCE_HOURS.map((o) => o.value))

const ADVANCE_DAYS = [
	{ value: 7, label: "7 días" },
	{ value: 14, label: "14 días" },
	{ value: 21, label: "21 días" },
	{ value: 30, label: "30 días" },
]

const PRESET_ADVANCE_DAYS_VALUES = new Set(ADVANCE_DAYS.map((o) => o.value))
const FREE_CANCEL_HOURS_OPTIONS = [1, 2, 3, 6, 12, 24, 48]
const PRESET_FREE_CANCEL_HOURS_VALUES = new Set(FREE_CANCEL_HOURS_OPTIONS)

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
	const hh = String(i).padStart(2, "0")
	return { value: `${hh}:00`, label: `${hh}:00` }
})

function durationLabel(mins: number) {
	if (mins < 60) return `${mins} min`
	const h = Math.floor(mins / 60)
	const m = mins % 60
	return m ? `${h} h ${m} min` : `${h} hora${h > 1 ? "s" : ""}`
}

function hoursToClock(value: number) {
	if (!Number.isFinite(value) || value < 0) return "00:00"
	const totalMinutes = Math.round(value * 60)
	const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
	const mm = String(totalMinutes % 60).padStart(2, "0")
	return `${hh}:${mm}`
}

function parseClockToHours(value: string) {
	const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/)
	if (!match) return null
	const hours = Number(match[1])
	const minutes = Number(match[2])
	return hours + minutes / 60
}

function splitClock(value: string) {
	const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/)
	if (!match) return { hour: "00", minute: "00" }
	return { hour: String(Number(match[1])), minute: match[2] }
}

/* ────────── component ────────── */
export default function OperacionPage() {
	const { user, loading: authLoading } = useAuth()
	const { isOnboarding, completeStep } = useOnboarding()
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [settings, setSettings] = useState<OperationSettings>({ ...DEFAULT_SETTINGS })
	const [customMinAdvanceClock, setCustomMinAdvanceClock] = useState("00:00")
	const [customMinAdvanceHour, setCustomMinAdvanceHour] = useState("0")
	const [customMinAdvanceMinute, setCustomMinAdvanceMinute] = useState("00")
	const [customMaxAdvanceDays, setCustomMaxAdvanceDays] = useState("30")
	const [customFreeCancelClock, setCustomFreeCancelClock] = useState("24:00")
	const [customFreeCancelHour, setCustomFreeCancelHour] = useState("24")
	const [customFreeCancelMinute, setCustomFreeCancelMinute] = useState("00")
	const [isMinAdvanceCustom, setIsMinAdvanceCustom] = useState(false)
	const [isMaxAdvanceCustom, setIsMaxAdvanceCustom] = useState(false)
	const [isFreeCancelCustom, setIsFreeCancelCustom] = useState(false)
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		turnos: true,
		cancelacion: false,
		precios: false,
		sena: false,
		feriados: false,
	})

	const toggleSection = (s: string) =>
		setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }))

	const minAdvanceSelectValue = isMinAdvanceCustom ? "custom" : String(settings.minAdvanceHours)
	const maxAdvanceSelectValue = isMaxAdvanceCustom ? "custom" : String(settings.maxAdvanceDays)
	const freeCancelSelectValue = isFreeCancelCustom ? "custom" : String(settings.freeCancelHours)

	/* ── redirect ── */
	useEffect(() => {
		if (!authLoading && !user) router.push("/clubos/login")
	}, [user, authLoading, router])

	/* ── load ── */
	useEffect(() => {
		const load = async () => {
			if (!user) return
			try {
				const ref = doc(
					db,
					FIRESTORE_COLLECTIONS.centers,
					user.uid,
					CENTER_SUBCOLLECTIONS.settings,
					CENTER_SETTINGS_DOCS.operations
				)
				const snap = await getDoc(ref)
				if (snap.exists()) {
					const data = snap.data() as Partial<OperationSettings>
					const next = { ...DEFAULT_SETTINGS, ...data }
					setSettings(next)
					if (!PRESET_ADVANCE_VALUES.has(next.minAdvanceHours)) {
						setIsMinAdvanceCustom(true)
						const clock = hoursToClock(next.minAdvanceHours)
						setCustomMinAdvanceClock(clock)
						const parts = splitClock(clock)
						setCustomMinAdvanceHour(parts.hour)
						setCustomMinAdvanceMinute(parts.minute)
					} else {
						setIsMinAdvanceCustom(false)
					}

					if (!PRESET_ADVANCE_DAYS_VALUES.has(next.maxAdvanceDays)) {
						setIsMaxAdvanceCustom(true)
						setCustomMaxAdvanceDays(String(next.maxAdvanceDays))
					} else {
						setIsMaxAdvanceCustom(false)
					}

					if (!PRESET_FREE_CANCEL_HOURS_VALUES.has(next.freeCancelHours)) {
						setIsFreeCancelCustom(true)
						const clock = hoursToClock(next.freeCancelHours)
						setCustomFreeCancelClock(clock)
						const parts = splitClock(clock)
						setCustomFreeCancelHour(parts.hour)
						setCustomFreeCancelMinute(parts.minute)
					} else {
						setIsFreeCancelCustom(false)
					}
				}
			} catch (err) {
				console.error("Error loading operation settings:", err)
			} finally {
				setLoading(false)
			}
		}
		if (user && !authLoading) load()
	}, [user, authLoading])

	/* ── save ── */
	const handleSave = async () => {
		if (!user) return
		setSaving(true)
		try {
			const ref = doc(
				db,
				FIRESTORE_COLLECTIONS.centers,
				user.uid,
				CENTER_SUBCOLLECTIONS.settings,
				CENTER_SETTINGS_DOCS.operations
			)
			await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true })

			if (isOnboarding) {
				const nextHref = await completeStep("operations")
				if (nextHref) {
					router.push(nextHref)
					return
				}
			}

			showSavePopupAndRefresh("Configuración operativa guardada correctamente.")
		} catch (err) {
			console.error("Error saving operations:", err)
			showSavePopupAndRefresh("No se pudo guardar la configuración. Intentá de nuevo.", "error")
		} finally {
			setSaving(false)
		}
	}

	/* ── computed: valid durations preview ── */
	const durationPreview = useMemo(() => {
		const list: number[] = []
		for (let d = settings.minSlotMinutes; d <= settings.maxSlotMinutes; d += settings.slotStepMinutes) {
			list.push(d)
		}
		if (!list.includes(settings.maxSlotMinutes) && settings.maxSlotMinutes >= settings.minSlotMinutes) {
			list.push(settings.maxSlotMinutes)
		}
		return list
	}, [settings.minSlotMinutes, settings.maxSlotMinutes, settings.slotStepMinutes])

	const operationChecklist = useMemo(
		() => [
			{
				id: "turnos",
				label: "Reglas de turnos válidas",
				done:
					settings.minSlotMinutes >= 30 &&
					settings.maxSlotMinutes >= settings.minSlotMinutes &&
					settings.slotStepMinutes > 0 &&
					durationPreview.length > 0,
			},
			{
				id: "anticipacion",
				label: "Ventana de anticipación definida",
				done: settings.minAdvanceHours >= 0 && settings.maxAdvanceDays >= 1,
			},
			{
				id: "cancelacion",
				label: "Política de cancelación y auscencia",
				done:
					settings.cancellationEnabled
						? settings.freeCancelHours >= 1 &&
						  settings.lateCancelFeePercent >= 0 &&
						  settings.lateCancelFeePercent <= 100 &&
						  settings.noShowFeePercent >= 0 &&
						  settings.noShowFeePercent <= 100
						: true,
			},
			{
				id: "precios",
				label: "Reglas de precios configuradas",
				done:
					settings.weekendPriceMultiplier >= 1 &&
					(settings.peakHoursEnabled
						? Boolean(settings.peakHoursStart) && Boolean(settings.peakHoursEnd) && settings.peakPriceMultiplier >= 1
						: true),
			},
			{
				id: "sena",
				label: "Política de seña",
				done:
					settings.depositEnabled
						? settings.depositPercent >= 1 &&
						  settings.depositPercent <= 100 &&
						  settings.remainingPaymentInstructions.trim().length >= 10
						: true,
			},
		],
		[
			settings.minSlotMinutes,
			settings.maxSlotMinutes,
			settings.slotStepMinutes,
			settings.minAdvanceHours,
			settings.maxAdvanceDays,
			settings.cancellationEnabled,
			settings.freeCancelHours,
			settings.lateCancelFeePercent,
			settings.noShowFeePercent,
			settings.weekendPriceMultiplier,
			settings.peakHoursEnabled,
			settings.peakHoursStart,
			settings.peakHoursEnd,
			settings.peakPriceMultiplier,
			settings.depositEnabled,
			settings.depositPercent,
			settings.remainingPaymentInstructions,
			durationPreview,
		]
	)

	const operationReady = useMemo(() => operationChecklist.every((item) => item.done), [operationChecklist])

	/* ── field helper ── */
	const set = <K extends keyof OperationSettings>(key: K, value: OperationSettings[K]) =>
		setSettings((prev) => ({ ...prev, [key]: value }))

	/* ── holiday helpers ── */
	const handleMinAdvanceSelect = (value: string) => {
		if (value === "custom") {
			if (!isMinAdvanceCustom) {
				const initialClock = hoursToClock(settings.minAdvanceHours || 0)
				const normalizedClock = initialClock === "24:00" ? "00:00" : initialClock
				setCustomMinAdvanceClock(normalizedClock)
				const parts = splitClock(normalizedClock)
				setCustomMinAdvanceHour(parts.hour)
				setCustomMinAdvanceMinute(parts.minute)
			}
			setIsMinAdvanceCustom(true)
			const parsed = parseClockToHours(customMinAdvanceClock)
			if (parsed !== null) {
				set("minAdvanceHours", parsed)
			}
			return
		}
		setIsMinAdvanceCustom(false)
		set("minAdvanceHours", Number(value))
	}

	const updateCustomClock = (hour: string, minute: string) => {
		const safeHour = String(Math.max(0, Math.min(999, Number(hour || "0") || 0)))
		const safeMinuteNum = Math.max(0, Math.min(59, Number(minute || "0") || 0))
		const safeMinute = String(safeMinuteNum).padStart(2, "0")
		const clock = `${safeHour}:${safeMinute}`
		setCustomMinAdvanceClock(clock)
		const parsed = parseClockToHours(clock)
		if (parsed !== null) {
			set("minAdvanceHours", parsed)
		}
	}

	const handleCustomHourChange = (value: string) => {
		const clean = value.replace(/\D/g, "").slice(0, 3)
		const nextHour = clean || "0"
		setCustomMinAdvanceHour(nextHour)
		updateCustomClock(nextHour, customMinAdvanceMinute)
	}

	const handleCustomMinuteChange = (value: string) => {
		const clean = value.replace(/\D/g, "").slice(0, 2)
		const minuteNum = Math.max(0, Math.min(59, Number(clean || "0") || 0))
		const nextMinute = String(minuteNum).padStart(2, "0")
		setCustomMinAdvanceMinute(nextMinute)
		updateCustomClock(customMinAdvanceHour, nextMinute)
	}

	const handleMaxAdvanceSelect = (value: string) => {
		if (value === "custom") {
			setIsMaxAdvanceCustom(true)
			if (PRESET_ADVANCE_DAYS_VALUES.has(settings.maxAdvanceDays)) {
				setCustomMaxAdvanceDays(String(settings.maxAdvanceDays || 30))
			}
			return
		}
		setIsMaxAdvanceCustom(false)
		set("maxAdvanceDays", Number(value))
	}

	const handleCustomMaxAdvanceDaysChange = (value: string) => {
		const digits = value.replace(/\D/g, "").slice(0, 4)
		setCustomMaxAdvanceDays(digits)
		const parsed = Number(digits)
		if (Number.isFinite(parsed) && parsed >= 1) {
			set("maxAdvanceDays", parsed)
		}
	}

	const handleFreeCancelSelect = (value: string) => {
		if (value === "custom") {
			if (!isFreeCancelCustom) {
				const clock = hoursToClock(settings.freeCancelHours || 24)
				setCustomFreeCancelClock(clock)
				const parts = splitClock(clock)
				setCustomFreeCancelHour(parts.hour)
				setCustomFreeCancelMinute(parts.minute)
			}
			setIsFreeCancelCustom(true)
			const parsed = parseClockToHours(customFreeCancelClock)
			if (parsed !== null) {
				set("freeCancelHours", parsed)
			}
			return
		}
		setIsFreeCancelCustom(false)
		set("freeCancelHours", Number(value))
	}

	const updateCustomFreeCancelClock = (hour: string, minute: string) => {
		const safeHour = String(Math.max(0, Math.min(999, Number(hour || "0") || 0)))
		const safeMinuteNum = Math.max(0, Math.min(59, Number(minute || "0") || 0))
		const safeMinute = String(safeMinuteNum).padStart(2, "0")
		const clock = `${safeHour}:${safeMinute}`
		setCustomFreeCancelClock(clock)
		const parsed = parseClockToHours(clock)
		if (parsed !== null) {
			set("freeCancelHours", parsed)
		}
	}

	const handleCustomFreeCancelHourChange = (value: string) => {
		const clean = value.replace(/\D/g, "").slice(0, 3)
		const nextHour = clean || "0"
		setCustomFreeCancelHour(nextHour)
		updateCustomFreeCancelClock(nextHour, customFreeCancelMinute)
	}

	const handleCustomFreeCancelMinuteChange = (value: string) => {
		const clean = value.replace(/\D/g, "").slice(0, 2)
		const minuteNum = Math.max(0, Math.min(59, Number(clean || "0") || 0))
		const nextMinute = String(minuteNum).padStart(2, "0")
		setCustomFreeCancelMinute(nextMinute)
		updateCustomFreeCancelClock(customFreeCancelHour, nextMinute)
	}

	const addHoliday = () => {
		const entry: HolidayEntry = { date: "", label: "", closed: true }
		set("holidays", [...settings.holidays, entry])
	}
	const updateHoliday = (idx: number, patch: Partial<HolidayEntry>) =>
		set(
			"holidays",
			settings.holidays.map((h, i) => (i === idx ? { ...h, ...patch } : h))
		)
	const removeHoliday = (idx: number) =>
		set(
			"holidays",
			settings.holidays.filter((_, i) => i !== idx)
		)

	/* ── loading / error states ── */
	if (authLoading || loading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
					<p className="text-slate-500">Cargando configuración operativa...</p>
				</div>
			</div>
		)
	}

	if (!user) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
					<p className="text-slate-500">No se pudo cargar la configuración.</p>
				</div>
			</div>
		)
	}

	/* ────────── render ────────── */
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">Operación</h1>
				<p className="text-slate-500 mt-2">Configurá las reglas de reservas, cancelaciones, precios dinámicos y feriados.</p>
			</div>

			{isOnboarding && (
				<div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-3 text-sm text-blue-800">
					<span className="text-lg leading-none">💡</span>
					<p>
						<strong>Los valores predeterminados son un buen punto de partida.</strong> Podes tocar Guardar ahora y ajustar estas opciones más adelante sin problema.
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
				<div className="min-w-0">
					<Card className="border border-slate-200 shadow-sm">
						<CardContent className="p-6 space-y-4">

					{/* ═══════ 1. Reglas de turnos ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("turnos")}
						>
							<div className="flex items-center gap-2">
								<Clock className="w-4 h-4 text-blue-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Reglas de turnos</p>
									<p className="text-xs text-slate-500 mt-0.5">Duración, buffer entre turnos y anticipación.</p>
								</div>
							</div>
							<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.turnos ? "rotate-180" : ""}`} />
						</button>

						<div className={`grid transition-all duration-200 ease-in-out ${openSections.turnos ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
							<div className="overflow-hidden">
								<div className="px-4 pb-5 pt-0 space-y-5 border-t border-slate-100">

									<div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
										<div className="space-y-1.5">
											<Label className="text-sm">Duración mínima</Label>
											<Select value={String(settings.minSlotMinutes)} onValueChange={(v) => set("minSlotMinutes", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{DURATION_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-1.5">
											<Label className="text-sm">Duración máxima</Label>
											<Select value={String(settings.maxSlotMinutes)} onValueChange={(v) => set("maxSlotMinutes", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{DURATION_OPTIONS.filter((o) => o.value >= settings.minSlotMinutes).map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-1.5">
											<Label className="text-sm">Incremento</Label>
											<Select value={String(settings.slotStepMinutes)} onValueChange={(v) => set("slotStepMinutes", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{STEP_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>

									{durationPreview.length > 0 && (
										<div className="rounded-md bg-blue-50 border border-blue-100 p-3">
											<p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
												<Info className="w-3.5 h-3.5" />
												Opciones que verán los jugadores
											</p>
											<div className="flex flex-wrap gap-2">
												{durationPreview.map((d) => (
													<span key={d} className="rounded-full bg-white border border-blue-200 text-blue-800 px-3 py-1 text-xs font-medium shadow-sm">
														{durationLabel(d)}
													</span>
												))}
											</div>
										</div>
									)}

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<Label className="text-sm">Buffer entre turnos</Label>
											<Select value={String(settings.bufferMinutes)} onValueChange={(v) => set("bufferMinutes", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{BUFFER_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-slate-400">Tiempo libre entre reservas consecutivas.</p>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<Label className="text-sm">Anticipación mínima</Label>
											<Select value={minAdvanceSelectValue} onValueChange={handleMinAdvanceSelect}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{ADVANCE_HOURS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
													<SelectItem value="custom">Personalizado</SelectItem>
												</SelectContent>
											</Select>
											{isMinAdvanceCustom && (
												<div className="space-y-1.5 pt-1">
													<Label className="text-xs text-slate-500 flex items-center gap-1">
														<Clock className="w-3.5 h-3.5" />
														Tiempo personalizado (HH:MM)
													</Label>
													<div className="flex items-center gap-2">
														<Input
															type="text"
															inputMode="numeric"
															value={customMinAdvanceHour}
															onChange={(e) => handleCustomHourChange(e.target.value)}
															className="h-12 text-center text-2xl font-semibold w-24"
															aria-label="Hora"
														/>
														<span className="text-3xl font-semibold text-slate-500">:</span>
														<Input
															type="text"
															inputMode="numeric"
															value={customMinAdvanceMinute}
															onChange={(e) => handleCustomMinuteChange(e.target.value)}
															className="h-12 text-center text-2xl font-semibold w-24"
															aria-label="Minutos"
														/>
													</div>
												</div>
											)}
											<p className="text-xs text-slate-400">El jugador debe reservar con al menos esta anticipación.</p>
										</div>

										<div className="space-y-1.5">
											<Label className="text-sm">Anticipación máxima</Label>
											<Select value={maxAdvanceSelectValue} onValueChange={handleMaxAdvanceSelect}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{ADVANCE_DAYS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
													<SelectItem value="custom">Personalizado</SelectItem>
												</SelectContent>
											</Select>
											{isMaxAdvanceCustom && (
												<div className="space-y-1.5 pt-1">
													<Label className="text-xs text-slate-500">Días personalizados</Label>
													<Input
														type="number"
														min={1}
														step={1}
														placeholder="Ej: 45"
														value={customMaxAdvanceDays}
														onChange={(e) => handleCustomMaxAdvanceDaysChange(e.target.value)}
														className="h-10"
													/>
												</div>
											)}
											<p className="text-xs text-slate-400">Hasta cuántos días en el futuro se puede reservar.</p>
										</div>
									</div>

								</div>
							</div>
						</div>
					</div>

					{/* ═══════ 2. Cancelación y auscencia ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("cancelacion")}
						>
							<div className="flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-amber-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Cancelación y auscencia</p>
									<p className="text-xs text-slate-500 mt-0.5">Ventana de cancelación gratuita y cargos.</p>
								</div>
							</div>
							<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.cancelacion ? "rotate-180" : ""}`} />
						</button>

						<div className={`grid transition-all duration-200 ease-in-out ${openSections.cancelacion ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
							<div className="overflow-hidden">
								<div className="px-4 pb-5 pt-0 space-y-5 border-t border-slate-100">

									<div className="pt-4 flex items-center justify-between">
										<div>
											<Label className="text-sm">Permitir cancelaciones</Label>
											<p className="text-xs text-slate-400 mt-0.5">Si está desactivado, las reservas no se pueden cancelar.</p>
										</div>
										<Switch
											checked={settings.cancellationEnabled}
											onCheckedChange={(v) => set("cancellationEnabled", v)}
										/>
									</div>

									{settings.cancellationEnabled && (
										<div className="space-y-5">
											<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
												<div className="space-y-1.5">
													<Label className="text-sm">Cancelación gratis si faltan más de</Label>
													<Select value={freeCancelSelectValue} onValueChange={handleFreeCancelSelect}>
														<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
														<SelectContent>
															{FREE_CANCEL_HOURS_OPTIONS.map((h) => (
																<SelectItem key={h} value={String(h)}>{h} hora{h > 1 ? "s" : ""}</SelectItem>
															))}
															<SelectItem value="custom">Personalizado</SelectItem>
														</SelectContent>
													</Select>
													{isFreeCancelCustom && (
														<div className="space-y-1.5 pt-1">
															<Label className="text-xs text-slate-500 flex items-center gap-1">
																<Clock className="w-3.5 h-3.5" />
																Tiempo personalizado (HH:MM)
															</Label>
															<div className="flex items-center gap-2">
																<Input
																	type="text"
																	inputMode="numeric"
																	value={customFreeCancelHour}
																	onChange={(e) => handleCustomFreeCancelHourChange(e.target.value)}
																	className="h-12 text-center text-2xl font-semibold w-24"
																	aria-label="Horas para cancelación"
																/>
																<span className="text-3xl font-semibold text-slate-500">:</span>
																<Input
																	type="text"
																	inputMode="numeric"
																	value={customFreeCancelMinute}
																	onChange={(e) => handleCustomFreeCancelMinuteChange(e.target.value)}
																	className="h-12 text-center text-2xl font-semibold w-24"
																	aria-label="Minutos para cancelación"
																/>
															</div>
														</div>
													)}
												</div>

												<div className="space-y-1.5">
													<Label className="text-sm">Cargo por cancelación tardía</Label>
													<Select value={String(settings.lateCancelFeePercent)} onValueChange={(v) => set("lateCancelFeePercent", Number(v))}>
														<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
														<SelectContent>
															{[0, 25, 50, 75, 100].map((p) => (
																<SelectItem key={p} value={String(p)}>{p}%</SelectItem>
															))}
														</SelectContent>
													</Select>
													<p className="text-xs text-slate-400">% del precio que se cobra si cancela tarde.</p>
												</div>

												<div className="space-y-1.5">
													<Label className="text-sm">Cargo por auscencia</Label>
													<Select value={String(settings.noShowFeePercent)} onValueChange={(v) => set("noShowFeePercent", Number(v))}>
														<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
														<SelectContent>
															{[0, 25, 50, 75, 100].map((p) => (
																<SelectItem key={p} value={String(p)}>{p}%</SelectItem>
															))}
														</SelectContent>
													</Select>
													<p className="text-xs text-slate-400">% si el jugador no se presenta.</p>
												</div>
											</div>

											<div className="rounded-md bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 space-y-1">
												<p className="font-medium flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Ejemplo</p>
												<p>Si un jugador reserva a las 14:00 y la cancelación gratis es de {settings.freeCancelHours} h, puede cancelar sin cargo hasta las {settings.freeCancelHours} horas antes. Después se le cobra el {settings.lateCancelFeePercent}% del turno.</p>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* ═══════ 3. Precios dinámicos ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("precios")}
						>
							<div className="flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-green-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Reglas de precios</p>
									<p className="text-xs text-slate-500 mt-0.5">Hora pico y recargos de fin de semana.</p>
								</div>
							</div>
							<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.precios ? "rotate-180" : ""}`} />
						</button>

						<div className={`grid transition-all duration-200 ease-in-out ${openSections.precios ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
							<div className="overflow-hidden">
								<div className="px-4 pb-5 pt-0 space-y-5 border-t border-slate-100">

									<div className="pt-4 flex items-center justify-between">
										<div>
											<Label className="text-sm">Hora pico</Label>
											<p className="text-xs text-slate-400 mt-0.5">Aplica un multiplicador de precio en horario pico.</p>
										</div>
										<Switch
											checked={settings.peakHoursEnabled}
											onCheckedChange={(v) => set("peakHoursEnabled", v)}
										/>
									</div>

									{settings.peakHoursEnabled && (
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div className="space-y-1.5">
												<Label className="text-sm">Desde</Label>
												<Select value={settings.peakHoursStart} onValueChange={(v) => set("peakHoursStart", v)}>
													<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
													<SelectContent>
														{HOUR_OPTIONS.map((o) => (
															<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-1.5">
												<Label className="text-sm">Hasta</Label>
												<Select value={settings.peakHoursEnd} onValueChange={(v) => set("peakHoursEnd", v)}>
													<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
													<SelectContent>
														{HOUR_OPTIONS.map((o) => (
															<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-1.5">
												<Label className="text-sm">Multiplicador</Label>
												<Select value={String(settings.peakPriceMultiplier)} onValueChange={(v) => set("peakPriceMultiplier", Number(v))}>
													<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
													<SelectContent>
														{[1.1, 1.15, 1.2, 1.25, 1.3, 1.5, 1.75, 2].map((m) => (
															<SelectItem key={m} value={String(m)}>×{m}</SelectItem>
														))}
													</SelectContent>
												</Select>
												<p className="text-xs text-slate-400">Se multiplica el precio base de la cancha.</p>
											</div>
										</div>
									)}

									<div className="space-y-1.5">
										<Label className="text-sm">Recargo de fin de semana</Label>
										<Select value={String(settings.weekendPriceMultiplier)} onValueChange={(v) => set("weekendPriceMultiplier", Number(v))}>
											<SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
											<SelectContent>
												{[{ v: 1, l: "Sin recargo" }, { v: 1.1, l: "×1.1 (+10%)" }, { v: 1.15, l: "×1.15 (+15%)" }, { v: 1.2, l: "×1.2 (+20%)" }, { v: 1.25, l: "×1.25 (+25%)" }, { v: 1.5, l: "×1.5 (+50%)" }].map((o) => (
													<SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-xs text-slate-400">Se aplica sábados y domingos sobre el precio base.</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ═══════ 4. Feriados y excepciones ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("sena")}
						>
							<div className="flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-violet-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Seña y cobro online</p>
									<p className="text-xs text-slate-500 mt-0.5">Definí si cobramos seña y qué porcentaje del turno.</p>
								</div>
							</div>
							<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.sena ? "rotate-180" : ""}`} />
						</button>

						<div className={`grid transition-all duration-200 ease-in-out ${openSections.sena ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
							<div className="overflow-hidden">
								<div className="px-4 pb-5 pt-0 space-y-5 border-t border-slate-100">

									<div className="pt-4 flex items-center justify-between">
										<div>
											<Label className="text-sm">Permitir pago con seña</Label>
											<p className="text-xs text-slate-400 mt-0.5">Si está desactivado, el jugador paga el total del turno en checkout.</p>
										</div>
										<Switch checked={settings.depositEnabled} onCheckedChange={(v) => set("depositEnabled", v)} />
									</div>

									{settings.depositEnabled ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-1.5">
												<Label className="text-sm">Porcentaje de seña</Label>
												<Select value={String(settings.depositPercent)} onValueChange={(v) => set("depositPercent", Number(v))}>
													<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
													<SelectContent>
														{[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
															<SelectItem key={p} value={String(p)}>{p}%</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-1.5 sm:col-span-2">
												<Label className="text-sm">Indicaciones para el saldo pendiente</Label>
												<textarea
													className="min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-offset-background placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500"
													value={settings.remainingPaymentInstructions}
													onChange={(e) => set("remainingPaymentInstructions", e.target.value)}
													placeholder="Ej: El saldo se abona en recepción antes de ingresar a la cancha. También podés transferir al alias CLUB.PADEL y enviar comprobante por WhatsApp al +54..."
												/>
												<p className="text-xs text-slate-400">Este texto se enviará en el email de confirmación cuando la reserva se pague con seña.</p>
											</div>
										</div>
									) : null}

									<div className="rounded-md bg-violet-50 border border-violet-100 p-3 text-xs text-violet-900 space-y-1">
										<p className="font-medium flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Cómo se cobra</p>
										<p>
											En checkout se cobra la {settings.depositEnabled ? `seña (${settings.depositPercent}% del turno)` : "reserva completa"}.
										</p>
										{settings.depositEnabled ? (
											<p>
												El saldo restante lo define el club y se informa al jugador por email al confirmar la reserva.
											</p>
										) : null}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ═══════ 5. Feriados y excepciones ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("feriados")}
						>
							<div className="flex items-center gap-2">
								<CalendarOff className="w-4 h-4 text-red-500" />
								<div>
									<p className="text-sm font-medium text-slate-900">Feriados y excepciones</p>
									<p className="text-xs text-slate-500 mt-0.5">Días cerrados o con horario especial.</p>
								</div>
							</div>
							<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.feriados ? "rotate-180" : ""}`} />
						</button>

						<div className={`grid transition-all duration-200 ease-in-out ${openSections.feriados ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
							<div className="overflow-hidden">
								<div className="px-4 pb-5 pt-0 space-y-4 border-t border-slate-100">

									<div className="pt-4 space-y-3">
										{settings.holidays.length === 0 && (
											<p className="text-sm text-slate-400">No hay feriados configurados.</p>
										)}
										{settings.holidays.map((h, idx) => (
											<div key={idx} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto_auto] gap-3 items-end rounded-lg border border-slate-100 p-3 bg-slate-50/50">
												<div className="space-y-1">
													<Label className="text-xs">Fecha</Label>
													<Input
														type="date"
														className="h-9 text-sm"
														value={h.date}
														onChange={(e) => updateHoliday(idx, { date: e.target.value })}
													/>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Nombre</Label>
													<Input
														className="h-9 text-sm"
														placeholder="Ej: Navidad"
														value={h.label}
														onChange={(e) => updateHoliday(idx, { label: e.target.value })}
													/>
												</div>
												<div className="flex items-center gap-2 pb-0.5">
													<Switch
														checked={h.closed}
														onCheckedChange={(v) =>
															updateHoliday(idx, { closed: v, openTime: v ? undefined : "09:00", closeTime: v ? undefined : "18:00" })
														}
													/>
													<span className="text-xs text-slate-600 whitespace-nowrap">{h.closed ? "Cerrado" : "Abierto"}</span>
												</div>
												<Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeHoliday(idx)}>
													<Trash2 className="w-4 h-4" />
												</Button>
												{!h.closed && (
													<div className="sm:col-span-4 grid grid-cols-2 gap-3">
														<div className="space-y-1">
															<Label className="text-xs">Abre</Label>
															<Input type="time" className="h-9 text-sm" value={h.openTime || ""} onChange={(e) => updateHoliday(idx, { openTime: e.target.value })} />
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Cierra</Label>
															<Input type="time" className="h-9 text-sm" value={h.closeTime || ""} onChange={(e) => updateHoliday(idx, { closeTime: e.target.value })} />
														</div>
													</div>
												)}
											</div>
										))}
									</div>

									<Button variant="outline" size="sm" className="gap-1.5" onClick={addHoliday}>
										<Plus className="w-3.5 h-3.5" />
										Agregar feriado
									</Button>

								</div>
							</div>
						</div>
					</div>

					{/* ═══════ save ═══════ */}
					<div className="flex justify-end pt-2">
						<Button onClick={handleSave} disabled={saving} className="h-11 px-6">
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								"Guardar cambios"
							)}
						</Button>
					</div>

						</CardContent>
					</Card>
				</div>

				{!operationReady ? (
					<div className="xl:sticky xl:top-6">
						<Card className="shadow-sm border border-slate-200">
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<CardTitle className="text-lg text-slate-900">Checklist</CardTitle>
										<CardDescription>Onboarding de Operación.</CardDescription>
									</div>
									<span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap bg-amber-100 text-amber-700">
										Faltan datos
									</span>
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								{operationChecklist.map((item) => (
									<div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
										<CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${item.done ? "text-green-600" : "text-slate-300"}`} />
										<span>{item.label}</span>
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				) : null}
			</div>
		</div>
	)
}
