"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
	Loader2,
	AlertCircle,
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
	{ value: 48, label: "48 horas" },
]

const ADVANCE_DAYS = [
	{ value: 7, label: "7 días" },
	{ value: 14, label: "14 días" },
	{ value: 21, label: "21 días" },
	{ value: 30, label: "30 días" },
	{ value: 60, label: "60 días" },
	{ value: 90, label: "90 días" },
]

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

/* ────────── component ────────── */
export default function OperacionPage() {
	const { user, loading: authLoading } = useAuth()
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [settings, setSettings] = useState<OperationSettings>({ ...DEFAULT_SETTINGS })
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		turnos: true,
		cancelacion: false,
		precios: false,
		feriados: false,
	})

	const toggleSection = (s: string) =>
		setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }))

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
					setSettings({ ...DEFAULT_SETTINGS, ...data })
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

	/* ── field helper ── */
	const set = <K extends keyof OperationSettings>(key: K, value: OperationSettings[K]) =>
		setSettings((prev) => ({ ...prev, [key]: value }))

	/* ── holiday helpers ── */
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
											<Select value={String(settings.minAdvanceHours)} onValueChange={(v) => set("minAdvanceHours", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{ADVANCE_HOURS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-slate-400">El jugador debe reservar con al menos esta anticipación.</p>
										</div>

										<div className="space-y-1.5">
											<Label className="text-sm">Anticipación máxima</Label>
											<Select value={String(settings.maxAdvanceDays)} onValueChange={(v) => set("maxAdvanceDays", Number(v))}>
												<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
												<SelectContent>
													{ADVANCE_DAYS.map((o) => (
														<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-slate-400">Hasta cuántos días en el futuro se puede reservar.</p>
										</div>
									</div>

								</div>
							</div>
						</div>
					</div>

					{/* ═══════ 2. Cancelación y no-show ═══════ */}
					<div className="rounded-lg border border-slate-200 overflow-hidden">
						<button
							type="button"
							className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
							onClick={() => toggleSection("cancelacion")}
						>
							<div className="flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-amber-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Cancelación y no-show</p>
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
													<Select value={String(settings.freeCancelHours)} onValueChange={(v) => set("freeCancelHours", Number(v))}>
														<SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
														<SelectContent>
															{[1, 2, 3, 6, 12, 24, 48, 72].map((h) => (
																<SelectItem key={h} value={String(h)}>{h} hora{h > 1 ? "s" : ""}</SelectItem>
															))}
														</SelectContent>
													</Select>
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
													<Label className="text-sm">Cargo por no-show</Label>
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
	)
}
