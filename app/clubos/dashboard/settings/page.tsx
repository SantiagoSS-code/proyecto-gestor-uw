"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { auth, db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, CheckCircle, AlertCircle, Plus, Trash2, ChevronDown, MapPin, Building2, Eye, Upload } from "lucide-react"
import { CENTER_SETTINGS_DOCS, CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { Country, State } from "country-state-city"
import { showSavePopupAndRefresh } from "@/lib/save-feedback"
import { slugify } from "@/lib/utils"
import { useOnboarding } from "@/lib/onboarding"

import { PadelCenterClient } from "@/lib/types"

const SPORT_OPTIONS = ["padel", "tennis", "futbol", "pickleball", "squash"]
const AMENITY_OPTIONS = [
	{ key: "bar", label: "Bar" },
	{ key: "bathrooms", label: "Baños" },
	{ key: "showers", label: "Duchas" },
	{ key: "gym", label: "Gimnasio" },
	{ key: "parking", label: "Estacionamiento" },
	{ key: "lockers", label: "Lockers" },
	{ key: "wifi", label: "Wifi" },
	{ key: "shop", label: "Tienda" },
	{ key: "cafeteria", label: "Cafetería" },
] as const
const SOCIAL_OPTIONS = [
	{ value: "instagram", label: "Instagram" },
	{ value: "facebook", label: "Facebook" },
	{ value: "tiktok", label: "TikTok" },
	{ value: "x", label: "X (Twitter)" },
	{ value: "linkedin", label: "LinkedIn" },
	{ value: "youtube", label: "YouTube" },
	{ value: "website", label: "Sitio web" },
	{ value: "whatsapp", label: "WhatsApp" },
]

const WEEK_DAYS = [
	{ key: "1", label: "Lunes" },
	{ key: "2", label: "Martes" },
	{ key: "3", label: "Miércoles" },
	{ key: "4", label: "Jueves" },
	{ key: "5", label: "Viernes" },
	{ key: "6", label: "Sábado" },
	{ key: "0", label: "Domingo" },
] as const

type OpeningDay = {
	enabled: boolean
	open: string
	close: string
}

const DEFAULT_OPENING_DAYS: Record<string, OpeningDay> = {
	"0": { enabled: false, open: "09:00", close: "23:00" },
	"1": { enabled: true, open: "09:00", close: "23:00" },
	"2": { enabled: true, open: "09:00", close: "23:00" },
	"3": { enabled: true, open: "09:00", close: "23:00" },
	"4": { enabled: true, open: "09:00", close: "23:00" },
	"5": { enabled: true, open: "09:00", close: "23:00" },
	"6": { enabled: true, open: "09:00", close: "23:00" },
}

const UPLOAD_TIMEOUT_MS = 30_000

const isBucketMissingError = (error: any) => {
	const message = String(error?.message || "").toLowerCase()
	const code = String(error?.code || "").toLowerCase()
	return message.includes("specified bucket does not exist") || code.includes("bucket-not-found")
}

const imageFileToOptimizedDataUrl = async (file: File) => {
	const readAsDataUrl =
		await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(String(reader.result || ""))
			reader.onerror = () => reject(new Error("No se pudo leer la imagen."))
			reader.readAsDataURL(file)
		})

	if (typeof document === "undefined") return readAsDataUrl

	const image = new Image()
	await new Promise<void>((resolve, reject) => {
		image.onload = () => resolve()
		image.onerror = () => reject(new Error("No se pudo procesar la imagen."))
		image.src = readAsDataUrl
	})

	const maxSize = 1280
	const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
	const width = Math.max(1, Math.round(image.width * scale))
	const height = Math.max(1, Math.round(image.height * scale))

	const canvas = document.createElement("canvas")
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext("2d")
	if (!ctx) return readAsDataUrl
	ctx.drawImage(image, 0, 0, width, height)

	let quality = 0.82
	let output = canvas.toDataURL("image/webp", quality)
	while (output.length > 900_000 && quality > 0.45) {
		quality -= 0.08
		output = canvas.toDataURL("image/webp", quality)
	}

	if (output.length > 980_000) {
		throw new Error("La imagen es demasiado grande. Probá una más liviana.")
	}

	return output
}

export default function SettingsPage() {
	const { user, loading: authLoading } = useAuth()
	const { isOnboarding, completeStep } = useOnboarding()
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [centerData, setCenterData] = useState<PadelCenterClient | null>(null)
	const [formData, setFormData] = useState({
		name: '',
		phone: '',
		country: '',
		city: '',
		province: '',
		locality: '',
		postalCode: '',
		street: '',
		streetNumber: '',
		placeId: '',
		openingTime: '',
		closingTime: '',
		sports: [] as string[],
		shortDescription: '',
		coverImageUrl: '',
		logoUrl: '',
		amenities: [] as string[],
		socialLinks: [] as { platform: string; url: string }[],
		published: false,

		// legacy kept for backward compatibility (hidden in UI)
		lat: '',
		lng: '',
		centerContactName: '',
		centerContactEmail: '',
		centerContactPhone: '',
		adminContactName: '',
		adminContactEmail: '',
		adminContactPhone: '',
	})
	const [openingDays, setOpeningDays] = useState<Record<string, OpeningDay>>({ ...DEFAULT_OPENING_DAYS })
	const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
	const [uploadingCover, setUploadingCover] = useState(false)
	const [uploadingLogo, setUploadingLogo] = useState(false)
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		direccion: false,
		horarios: false,
		perfil: false,
	})

	const centerCode = useMemo(() => (user?.uid ? user.uid.slice(0, 6).toLowerCase() : ""), [user?.uid])
	const slugPreview = useMemo(() => {
		const base = slugify(formData.name || "centro")
		if (!base && !centerCode) return ""
		if (!centerCode) return base
		return `${base || "centro"}-${centerCode}`
	}, [centerCode, formData.name])

	const countryOptions = useMemo(
		() => Country.getAllCountries().map((country) => ({ isoCode: country.isoCode, name: country.name })).sort((a, b) => a.name.localeCompare(b.name)),
		[]
	)

	const selectedCountry = useMemo(() => {
		const current = formData.country.trim().toLowerCase()
		if (!current) return null
		return countryOptions.find((country) => country.name.toLowerCase() === current) ?? null
	}, [countryOptions, formData.country])

	const provinceOptions = useMemo(() => {
		if (!selectedCountry) return []
		return State.getStatesOfCountry(selectedCountry.isoCode)
			.map((state) => ({ isoCode: state.isoCode, name: state.name }))
			.sort((a, b) => a.name.localeCompare(b.name))
	}, [selectedCountry])

	const publicationChecklist = useMemo(
		() => [
			{ id: "name", label: "Nombre del centro", done: formData.name.trim().length > 2, optional: false },
			{ id: "address", label: "Dirección completa", done: [formData.street, formData.streetNumber, formData.city, formData.country].every((v) => v.trim().length > 0), optional: false },
			{ id: "sports", label: "Al menos 1 deporte", done: formData.sports.length > 0, optional: false },
			{ id: "amenities", label: "Amenities seleccionados", done: formData.amenities.length > 0, optional: false },
			{ id: "description", label: "Descripción del club", done: formData.shortDescription.trim().length >= 20, optional: false },
			{ id: "cover", label: "Foto de portada", done: formData.coverImageUrl.trim().length > 0, optional: isOnboarding },
		],
		[formData, isOnboarding]
	)

	const readyForPublication = useMemo(
		() => publicationChecklist.every((item) => item.optional || item.done),
		[publicationChecklist]
	)

	const toggleSection = (section: string) => {
		setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
	}

	const handleCountryChange = (countryName: string) => {
		setFormData((prev) => ({
			...prev,
			country: countryName,
			province: '',
			city: '',
			locality: '',
			postalCode: '',
		}))
	}

	const handleProvinceChange = (provinceName: string) => {
		setFormData((prev) => ({
			...prev,
			province: provinceName,
			city: '',
			locality: '',
			postalCode: '',
		}))
	}

	const toggleAmenity = (amenity: string) => {
		setFormData((prev) => ({
			...prev,
			amenities: prev.amenities.includes(amenity)
				? prev.amenities.filter((a) => a !== amenity)
				: [...prev.amenities, amenity],
		}))
	}

	const uploadCenterImage = async (file: File, type: "cover" | "logo") => {
		if (!user) return null

		const currentUser = auth?.currentUser
		if (!currentUser) throw new Error("No authenticated user")
		const token = await currentUser.getIdToken()

		const body = new FormData()
		body.append("centerId", user.uid)
		body.append("kind", type)
		body.append("file", file)

		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

		try {
			const res = await fetch("/api/centers/upload-image", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body,
				signal: controller.signal,
			})
			const data = await res.json().catch(() => null)
			if (!res.ok) {
				const err = new Error(data?.error || `Upload failed (${res.status})`)
				if (isBucketMissingError(err)) {
					return await imageFileToOptimizedDataUrl(file)
				}
				throw err
			}
			return data?.imageUrl || null
		} catch (error: any) {
			if (error?.name === "AbortError") {
				throw new Error("La subida tardó demasiado. Intentá nuevamente.")
			}
			if (isBucketMissingError(error)) {
				return await imageFileToOptimizedDataUrl(file)
			}
			throw error
		} finally {
			clearTimeout(timeout)
		}
	}

	const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			setUploadingCover(true)
			const imageUrl = await uploadCenterImage(file, "cover")
			if (imageUrl) setFormData((prev) => ({ ...prev, coverImageUrl: imageUrl }))
		} catch (error: any) {
			console.error("Error uploading cover image:", error)
			const msg = error?.name === "AbortError"
				? "La subida tardó demasiado. Intentá nuevamente."
				: error?.message || "No se pudo subir la foto de portada."
			showSavePopupAndRefresh(msg, "error")
		} finally {
			setUploadingCover(false)
			event.target.value = ""
		}
	}

	const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			setUploadingLogo(true)
			const imageUrl = await uploadCenterImage(file, "logo")
			if (imageUrl) setFormData((prev) => ({ ...prev, logoUrl: imageUrl }))
		} catch (error: any) {
			console.error("Error uploading logo:", error)
			const msg = error?.name === "AbortError"
				? "La subida tardó demasiado. Intentá nuevamente."
				: error?.message || "No se pudo subir el logo."
			showSavePopupAndRefresh(msg, "error")
		} finally {
			setUploadingLogo(false)
			event.target.value = ""
		}
	}

	// Redirect if not authenticated
	useEffect(() => {
		if (!authLoading && !user) {
			router.push('/clubos/login')
		}
	}, [user, authLoading, router])

	// Fetch center data on load
	useEffect(() => {
		const fetchCenterData = async () => {
			if (!user) return

			try {
				const legacyRef = doc(db, 'padel_centers', user.uid)
				const publicRef = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid)
				const [legacySnap, publicSnap] = await Promise.all([getDoc(legacyRef), getDoc(publicRef)])

				if (legacySnap.exists() || publicSnap.exists()) {
					const data = (legacySnap.exists() ? legacySnap.data() : publicSnap.data()) as PadelCenterClient
					const publicData = (publicSnap.exists() ? publicSnap.data() : {}) as any
					setCenterData(data)

					const centerContact = data.contacts?.center
					const adminContact = data.contacts?.admin
					const location = data.location || null

					setFormData({
						name: data.name || publicData.name || '',
						phone: data.phone || publicData.phone || '',
						country: data.country || publicData.country || '',
						city: data.city || publicData.city || '',
						province: data.province || publicData.province || '',
						locality: (data as any).locality || publicData.locality || '',
						postalCode: data.postalCode || publicData.postalCode || '',
						street: data.street || publicData.street || '',
						streetNumber: data.street_number || publicData.streetNumber || '',
						placeId: data.placeId || publicData.placeId || '',
						openingTime: (data as any).openingTime || publicData.openingTime || '',
						closingTime: (data as any).closingTime || publicData.closingTime || '',
						sports: Array.isArray((data as any).sports) ? ((data as any).sports as string[]) : Array.isArray(publicData.sports) ? publicData.sports : [],
						shortDescription: (data as any).shortDescription || publicData.shortDescription || publicData.description || '',
						coverImageUrl: (data as any).coverImageUrl || publicData.coverImageUrl || '',
						logoUrl: (data as any).logoUrl || publicData.logoUrl || '',
						amenities: Array.isArray((data as any).amenities) ? (data as any).amenities : Array.isArray(publicData.amenities) ? publicData.amenities : [],
						socialLinks: Array.isArray((data as any).socialLinks) ? (data as any).socialLinks : Array.isArray(publicData.socialLinks) ? publicData.socialLinks : [],
					published: publicData.published === true,
					lat: typeof location?.lat === 'number' ? String(location.lat) : '',
					lng: typeof location?.lng === 'number' ? String(location.lng) : '',
					centerContactName: centerContact?.name || data.name || '',
					centerContactEmail: centerContact?.email || '',
					centerContactPhone: centerContact?.phone || data.phone || '',
					adminContactName: adminContact?.name || '',
					adminContactEmail: adminContact?.email || data.email || '',
					adminContactPhone: adminContact?.phone || '',
				})

				const bookingSettingsRef = doc(
					db,
					FIRESTORE_COLLECTIONS.centers,
					user.uid,
					CENTER_SUBCOLLECTIONS.settings,
					CENTER_SETTINGS_DOCS.booking
				)
				const bookingSettingsSnap = await getDoc(bookingSettingsRef)
				if (bookingSettingsSnap.exists()) {
					const bookingSettings = bookingSettingsSnap.data() as any
					const openingHours = bookingSettings?.openingHours || {}
					const nextDays: Record<string, OpeningDay> = { ...DEFAULT_OPENING_DAYS }
					for (const key of Object.keys(nextDays)) {
						const dayData = openingHours?.[key]
						if (!dayData) continue
						nextDays[key] = {
							enabled: dayData.closed !== true,
							open: dayData.open || nextDays[key].open,
							close: dayData.close || nextDays[key].close,
						}
					}
					setOpeningDays(nextDays)
				} else if ((data as any).openingTime && (data as any).closingTime) {
					const fallbackDays: Record<string, OpeningDay> = { ...DEFAULT_OPENING_DAYS }
					for (const key of Object.keys(fallbackDays)) {
						fallbackDays[key] = {
							enabled: key !== "0",
							open: (data as any).openingTime,
							close: (data as any).closingTime,
							}
						}
						setOpeningDays(fallbackDays)
					}
				} else {
					// No center doc yet (new account) — keep empty form, user will save it
					setCenterData({} as PadelCenterClient)
				}
			} catch (error) {
				console.error('Error fetching center data:', error)
				setMessage({ type: 'error', text: 'No se pudo cargar la información del centro. Por favor intentá de nuevo.' })
			} finally {
				setLoading(false)
			}
		}

		if (user && !authLoading) {
			fetchCenterData()
		}
	}, [user, authLoading])

	const handleInputChange = (field: string, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const toggleSport = (sport: string) => {
		setFormData((prev) => ({
			...prev,
			sports: prev.sports.includes(sport) ? prev.sports.filter((s) => s !== sport) : [...prev.sports, sport],
		}))
	}

	const addSocialLink = () => {
		setFormData((prev) => ({
			...prev,
			socialLinks: [...prev.socialLinks, { platform: "instagram", url: "" }],
		}))
	}

	const updateSocialLink = (index: number, patch: { platform?: string; url?: string }) => {
		setFormData((prev) => ({
			...prev,
			socialLinks: prev.socialLinks.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		}))
	}

	const removeSocialLink = (index: number) => {
		setFormData((prev) => ({
			...prev,
			socialLinks: prev.socialLinks.filter((_, i) => i !== index),
		}))
	}

	const toggleOpeningDay = (dayKey: string) => {
		setOpeningDays((prev) => ({
			...prev,
			[dayKey]: {
				...prev[dayKey],
				enabled: !prev[dayKey].enabled,
			},
		}))
	}

	const updateOpeningDayTime = (dayKey: string, field: "open" | "close", value: string) => {
		setOpeningDays((prev) => ({
			...prev,
			[dayKey]: {
				...prev[dayKey],
				[field]: value,
			},
		}))
	}

	const handleSave = async () => {
		if (!user) return

		setSaving(true)
		setMessage(null)

		try {
			if (formData.published && !readyForPublication) {
				showSavePopupAndRefresh("Completá el checklist antes de publicar el centro.", "error")
				return
			}

			const streetLine = [formData.street.trim(), formData.streetNumber.trim()].filter(Boolean).join(" ")
			const composedAddress = [streetLine, formData.locality.trim(), formData.city.trim(), formData.province.trim(), formData.postalCode.trim(), formData.country.trim()]
				.filter(Boolean)
				.join(", ")
			const slug = slugPreview || `${slugify(formData.name || "centro")}-${centerCode}`
			const sanitizedSocialLinks = formData.socialLinks
				.map((link) => ({ platform: link.platform, url: link.url.trim() }))
				.filter((link) => link.url.length > 0)
			const openingHours = Object.fromEntries(
				Object.entries(openingDays).map(([day, cfg]) => [
					day,
					{
						open: cfg.open,
						close: cfg.close,
						closed: !cfg.enabled,
					},
				])
			)

			const centerRef = doc(db, 'padel_centers', user.uid)
			await setDoc(centerRef, {
				name: formData.name,
				phone: formData.phone,
				address: composedAddress || centerData?.address || '',
				street: formData.street,
				street_number: formData.streetNumber,
				province: formData.province,
				postalCode: formData.postalCode,
				placeId: formData.placeId || null,
				city: formData.city,
				country: formData.country,
				locality: formData.locality,
				openingTime: formData.openingTime || null,
				closingTime: formData.closingTime || null,
				sports: formData.sports,
				shortDescription: formData.shortDescription,
				coverImageUrl: formData.coverImageUrl || null,
				logoUrl: formData.logoUrl || null,
				amenities: formData.amenities,
				slug,
				centerCode,
				socialLinks: sanitizedSocialLinks,
				contacts: {
					center: {
						name: formData.centerContactName,
						email: formData.centerContactEmail,
						phone: formData.centerContactPhone,
					},
					admin: {
						name: formData.adminContactName,
						email: formData.adminContactEmail,
						phone: formData.adminContactPhone,
					},
				},
				updatedAt: serverTimestamp(),
			}, { merge: true })

			const publicCenterRef = doc(db, 'centers', user.uid)
			await setDoc(
				publicCenterRef,
				{
					name: formData.name,
					phone: formData.phone,
					address: composedAddress || centerData?.address || '',
					street: formData.street,
					streetNumber: formData.streetNumber,
					province: formData.province,
					postalCode: formData.postalCode,
					placeId: formData.placeId || null,
					city: formData.city,
					country: formData.country,
					locality: formData.locality,
					openingTime: formData.openingTime || null,
					closingTime: formData.closingTime || null,
					sports: formData.sports,
					shortDescription: formData.shortDescription,
					description: formData.shortDescription,
					coverImageUrl: formData.coverImageUrl || null,
					logoUrl: formData.logoUrl || null,
					amenities: formData.amenities,
					slug,
					centerCode,
					publicationReady: readyForPublication,
					socialLinks: sanitizedSocialLinks,
					published: formData.published,
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			)

			await setDoc(
				doc(
					db,
					FIRESTORE_COLLECTIONS.centers,
					user.uid,
					CENTER_SUBCOLLECTIONS.settings,
					CENTER_SETTINGS_DOCS.booking
				),
				{
					slotDurationMinutes: 60,
					openingHours,
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			)

			if (isOnboarding) {
				// Complete "center" step first. If the user also toggled publish,
				// complete "publish" afterwards using the href returned by center.
				const afterCenterHref = await completeStep("center")
				if (formData.published) {
					// completeStep returns the next incomplete step's href
					// "publish" may already be current now, so complete it too
					await completeStep("publish")
					// onboarding fully done → fall through to success message
				} else if (afterCenterHref) {
					router.push(afterCenterHref)
					return
				}
			}

			if (formData.published) {
				showSavePopupAndRefresh("¡Centro enviado a verificación! Te notificaremos cuando esté aprobado.")
			} else {
				showSavePopupAndRefresh("Cambios guardados correctamente.")
			}
			return
		} catch (error) {
			console.error('Error updating center data:', error)
			showSavePopupAndRefresh("No se pudieron guardar los cambios. Revisá tu conexión e intentá de nuevo.", "error")
			return
		} finally {
			setSaving(false)
		}
	}

	if (authLoading || loading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
					<p className="text-slate-500">Cargando configuración...</p>
				</div>
			</div>
		)
	}

	if (!user || !centerData) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
					<p className="text-slate-500">No se pudo cargar la configuración. Por favor intentá de nuevo.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">Centro</h1>
				<p className="text-slate-500 mt-2">
					Información pública y operativa de tu club. Tu información personal se gestiona en Mi cuenta.
				</p>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
				<div className="min-w-0">

					{message && (
						<Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}>
							<AlertDescription className={message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
								{message.type === 'success' ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
								{message.text}
							</AlertDescription>
						</Alert>
					)}

					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-xl text-slate-900">Información básica</CardTitle>
							<CardDescription className="text-slate-500">
								Estos datos representan al centro frente a jugadores y reservas.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Nombre del Club</Label>
									<Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="h-11" />
								</div>
								<div className="space-y-2">
									<Label htmlFor="phone">Teléfono</Label>
									<Input id="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="h-11" />
								</div>
							</div>

							<div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
								<div>
									<p className="text-sm font-medium text-slate-900">
										{formData.published ? "Enviado a verificación" : "Enviar a verificación"}
									</p>
									<p className="text-xs text-slate-500 mt-0.5">
										{formData.published
											? "Tu centro fue enviado a revisión. Lo publicaremos una vez que lo validemos."
											: "Cuando estés listo, enviá tu centro para que lo revisemos y lo publiquemos en la plataforma."}
									</p>
								</div>
								<Switch
									checked={formData.published}
									disabled={!readyForPublication}
									onCheckedChange={(checked) => handleInputChange('published', checked)}
								/>
							</div>

							{formData.published && (
								<div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-start gap-2">
									<CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
									<div>
										<p className="font-medium">Centro enviado a verificación</p>
										<p className="text-xs text-blue-700 mt-1">
											Nuestro equipo revisará tu información y, una vez aprobado, tu centro aparecerá en los buscadores de jugadores. Te notificaremos por email.
										</p>
									</div>
								</div>
							)}

							<div className="rounded-lg border border-slate-200 overflow-hidden">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
									onClick={() => toggleSection('direccion')}
								>
									<div>
										<p className="text-sm font-medium text-slate-900">Dirección</p>
										{!openSections.direccion && formData.street && (
											<p className="text-xs text-slate-500 mt-1 truncate max-w-md">
												{[formData.street, formData.streetNumber, formData.locality, formData.city].filter(Boolean).join(', ')}
											</p>
										)}
									</div>
									<ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${openSections.direccion ? 'rotate-180' : ''}`} />
								</button>
								<div className={`grid transition-all duration-200 ease-in-out ${openSections.direccion ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
									<div className="overflow-hidden">
										<div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
												<div className="space-y-2">
													<Label>País</Label>
													<Select value={formData.country || undefined} onValueChange={handleCountryChange}>
														<SelectTrigger className="h-11">
															<SelectValue placeholder="Seleccioná un país" />
														</SelectTrigger>
														<SelectContent>
															{countryOptions.map((country) => (
																<SelectItem key={country.isoCode} value={country.name}>
																	{country.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label>Provincia / Estado</Label>
													{selectedCountry && provinceOptions.length > 0 ? (
														<Select value={formData.province || undefined} onValueChange={handleProvinceChange}>
															<SelectTrigger className="h-11">
																<SelectValue placeholder="Seleccioná una provincia o estado" />
															</SelectTrigger>
															<SelectContent>
																{provinceOptions.map((province) => (
																	<SelectItem key={`${selectedCountry.isoCode}-${province.isoCode}`} value={province.name}>
																		{province.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													) : (
														<Input
															value={formData.province}
															onChange={(e) => handleInputChange('province', e.target.value)}
															className="h-11"
															placeholder={formData.country ? 'Escribí provincia o estado' : 'Seleccioná primero un país'}
															disabled={!formData.country}
														/>
													)}
												</div>

												<div className="space-y-2"><Label>Ciudad</Label><Input value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} className="h-11" placeholder="Ej: Buenos Aires" /></div>
												<div className="space-y-2"><Label>Localidad / Barrio</Label><Input value={formData.locality} onChange={(e) => handleInputChange('locality', e.target.value)} className="h-11" placeholder="Ej: Palermo" /></div>
												<div className="space-y-2"><Label>Calle</Label><Input value={formData.street} onChange={(e) => handleInputChange('street', e.target.value)} className="h-11" placeholder="Ej: Av. Corrientes" /></div>
												<div className="space-y-2"><Label>Número</Label><Input value={formData.streetNumber} onChange={(e) => handleInputChange('streetNumber', e.target.value)} className="h-11" placeholder="Ej: 1234" /></div>
												<div className="space-y-2"><Label>CP</Label><Input value={formData.postalCode} onChange={(e) => handleInputChange('postalCode', e.target.value)} className="h-11" placeholder="Ej: C1414" /></div>
												<div className="space-y-2">
													<Label className="flex items-center gap-1.5">
														Google Place ID
														<span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Solo lectura</span>
													</Label>
													<Input
														value={formData.placeId}
														readOnly
														disabled
														className="h-11 cursor-not-allowed opacity-60 select-all"
														placeholder="Asignado por Voyd"
													/>
													<p className="text-xs text-muted-foreground">Este valor es gestionado por el equipo de Voyd y determina el mapa que ven los jugadores.</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-slate-200 overflow-hidden">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
									onClick={() => toggleSection('horarios')}
								>
									<div>
										<p className="text-sm font-medium text-slate-900">Días de apertura del centro</p>
										<p className="text-xs text-slate-500 mt-1">Define qué días abrís y el horario específico de cada día.</p>
									</div>
									<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.horarios ? 'rotate-180' : ''}`} />
								</button>
								<div className={`grid transition-all duration-200 ease-in-out ${openSections.horarios ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
									<div className="overflow-hidden">
										<div className="px-4 pb-4 pt-0 space-y-2 border-t border-slate-100">
											<div className="pt-3 space-y-2">
												{WEEK_DAYS.map((day) => {
													const cfg = openingDays[day.key]
													return (
														<div key={day.key} className="grid grid-cols-1 md:grid-cols-[140px_120px_1fr_1fr] gap-2 items-center rounded-md border border-slate-100 p-2">
															<span className="text-sm font-medium text-slate-700">{day.label}</span>
															<Button type="button" variant={cfg.enabled ? "default" : "outline"} className="h-9" onClick={() => toggleOpeningDay(day.key)}>
																{cfg.enabled ? "Abierto" : "Cerrado"}
															</Button>
															<Input type="time" value={cfg.open} disabled={!cfg.enabled} onChange={(e) => updateOpeningDayTime(day.key, "open", e.target.value)} className="h-9" />
															<Input type="time" value={cfg.close} disabled={!cfg.enabled} onChange={(e) => updateOpeningDayTime(day.key, "close", e.target.value)} className="h-9" />
														</div>
													)
												})}
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-slate-200 overflow-hidden">
								<button
									type="button"
									className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
									onClick={() => toggleSection('perfil')}
								>
									<div>
										<p className="text-sm font-medium text-slate-900">Perfil público</p>
										<p className="text-xs text-slate-500 mt-1">Deportes, descripción, imágenes y redes sociales visibles para jugadores.</p>
									</div>
									<ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openSections.perfil ? 'rotate-180' : ''}`} />
								</button>
								<div className={`grid transition-all duration-200 ease-in-out ${openSections.perfil ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
									<div className="overflow-hidden">
										<div className="px-4 pb-4 pt-0 space-y-5 border-t border-slate-100">
											<div className="space-y-2 pt-4">
												<Label>Tipo de club (deportes)</Label>
												<div className="flex flex-wrap gap-2">
													{SPORT_OPTIONS.map((sport) => {
														const selected = formData.sports.includes(sport)
														return (
															<button
																type="button"
																key={sport}
																onClick={() => toggleSport(sport)}
																className={`px-3 py-1.5 rounded-full text-sm border transition ${selected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
															>
																{sport.charAt(0).toUpperCase() + sport.slice(1)}
															</button>
														)
													})}
												</div>
											</div>

											<div className="space-y-2">
												<Label htmlFor="shortDescription">Descripción corta</Label>
												<textarea
													id="shortDescription"
													value={formData.shortDescription}
													onChange={(e) => handleInputChange('shortDescription', e.target.value)}
													className="w-full min-h-[96px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Describe tu club en una o dos líneas"
												/>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="coverImageFile">Foto de portada (archivo)</Label>
													<Input id="coverImageFile" type="file" accept="image/*" onChange={handleCoverFileChange} className="h-11" />
													{uploadingCover ? (
														<div className="text-xs text-slate-500 flex items-center gap-2"><Upload className="w-3 h-3" /> Subiendo portada...</div>
													) : null}
													{formData.coverImageUrl ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img src={formData.coverImageUrl} alt="Portada" className="h-20 w-full rounded-md border border-slate-200 object-cover" />
													) : null}
												</div>
												<div className="space-y-2">
													<Label htmlFor="logoFile">Logo (archivo)</Label>
													<Input id="logoFile" type="file" accept="image/*" onChange={handleLogoFileChange} className="h-11" />
													{uploadingLogo ? (
														<div className="text-xs text-slate-500 flex items-center gap-2"><Upload className="w-3 h-3" /> Subiendo logo...</div>
													) : null}
													{formData.logoUrl ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img src={formData.logoUrl} alt="Logo" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
													) : null}
												</div>
											</div>

											<div className="space-y-2">
												<Label>Amenities del centro</Label>
												<div className="flex flex-wrap gap-2">
													{AMENITY_OPTIONS.map((amenity) => {
														const selected = formData.amenities.includes(amenity.key)
														return (
															<button
																type="button"
																key={amenity.key}
																onClick={() => toggleAmenity(amenity.key)}
																className={`px-3 py-1.5 rounded-full text-sm border transition ${selected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
															>
																{amenity.label}
															</button>
														)
													})}
												</div>
											</div>

											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<p className="text-sm font-medium text-slate-900">Redes sociales</p>
													<Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
														<Plus className="w-4 h-4 mr-1" /> Agregar red
													</Button>
												</div>

												{formData.socialLinks.length === 0 ? (
													<p className="text-sm text-slate-500">Aún no agregaste redes sociales.</p>
												) : (
													<div className="space-y-3">
														{formData.socialLinks.map((link, index) => (
															<div key={`${link.platform}-${index}`} className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2 items-center">
																<Select value={link.platform} onValueChange={(value) => updateSocialLink(index, { platform: value })}>
																	<SelectTrigger className="h-11">
																		<SelectValue placeholder="Red social" />
																	</SelectTrigger>
																	<SelectContent>
																		{SOCIAL_OPTIONS.map((option) => (
																			<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																<Input value={link.url} onChange={(e) => updateSocialLink(index, { url: e.target.value })} placeholder="https://..." className="h-11" />
																<Button type="button" variant="ghost" size="icon" onClick={() => removeSocialLink(index)} className="text-slate-400 hover:text-red-600">
																	<Trash2 className="w-4 h-4" />
																</Button>
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-blue-200 bg-blue-50/30 overflow-hidden">
								<div className="p-4 border-b border-blue-100">
									<div className="flex items-center gap-2">
										<Eye className="w-4 h-4 text-blue-600" />
										<div>
											<p className="text-sm font-medium text-blue-900">Vista previa</p>
											<p className="text-xs text-blue-600 mt-0.5">Así ven los jugadores tu centro al reservar.</p>
										</div>
									</div>
								</div>
								<div className="px-4 pb-5 pt-4">
									<p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-3">Página del centro (vista del jugador)</p>
									<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
										<div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-0">
											{/* Image */}
											<div className="relative h-[220px] md:h-[280px] bg-slate-100">
												{formData.coverImageUrl ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img src={formData.coverImageUrl} alt={formData.name} className="w-full h-full object-cover" />
												) : (
													<div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
														<span className="text-slate-400 text-sm">Sin foto de portada</span>
													</div>
												)}
											</div>
											{/* Info */}
											<div className="p-5 space-y-4">
												<h3 className="text-2xl font-bold text-slate-900">{formData.name || 'Nombre del Club'}</h3>
												<div className="space-y-2 text-slate-700">
													<div className="flex items-center gap-2">
														<MapPin className="w-4 h-4 text-blue-600 shrink-0" />
														<span className="text-sm">
															{[formData.street, formData.streetNumber, formData.locality, formData.city, formData.province, formData.postalCode, formData.country].filter(Boolean).join(', ') || 'Dirección sin completar'}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Building2 className="w-4 h-4 text-blue-600 shrink-0" />
														<span className="text-sm">— canchas publicadas</span>
													</div>
													<div className="text-xs text-slate-500">
														Slug público: /clubs/{slugPreview || "centro-codigo"}
													</div>
												</div>

												{formData.sports.length > 0 && (
													<div>
														<p className="text-sm font-medium text-slate-900 mb-2">Deportes</p>
														<div className="flex flex-wrap gap-2">
															{formData.sports.map((sport) => (
																<span key={sport} className="inline-flex items-center rounded-full bg-slate-100 text-slate-900 px-3 py-1 text-xs font-medium">
																	{sport.charAt(0).toUpperCase() + sport.slice(1)}
																</span>
															))}
														</div>
													</div>
												)}

												{formData.amenities.length > 0 && (
													<div>
														<p className="text-sm font-medium text-slate-900 mb-2">Amenities</p>
														<div className="flex flex-wrap gap-2">
															{formData.amenities.map((amenity) => {
																const amenityLabel = AMENITY_OPTIONS.find((item) => item.key === amenity)?.label || amenity
																return (
																	<span key={amenity} className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium">
																		{amenityLabel}
																	</span>
																)
															})}
														</div>
													</div>
												)}

												{formData.shortDescription && (
													<p className="text-sm text-slate-600 border-t border-slate-100 pt-3">{formData.shortDescription}</p>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end pt-2">
								<Button onClick={handleSave} disabled={saving} className="h-11 px-6">
									{saving ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Guardando...
										</>
									) : (
										'Guardar cambios'
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{!readyForPublication ? (
				<div className="xl:sticky xl:top-6">
					<Card className="shadow-sm border border-slate-200">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between gap-3">
								<div>
									<CardTitle className="text-lg text-slate-900">Checklist</CardTitle>
									<CardDescription>Siempre visible mientras completás el centro.</CardDescription>
								</div>
								<span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${readyForPublication ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
									{readyForPublication ? "Listo para publicar" : "Faltan datos"}
								</span>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{publicationChecklist.map((item) => (
								<div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
									<CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${item.done ? "text-green-600" : item.optional ? "text-amber-300" : "text-slate-300"}`} />
									<span className="flex-1">{item.label}</span>
									{item.optional && !item.done && (
										<span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">opcional</span>
									)}
								</div>
							))}
							<div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-500">
								<div>URL pública: /clubs/{slugPreview || "centro-codigo"}</div>
								<div>Código único: <span className="font-mono text-slate-700">{centerCode || "------"}</span></div>
							</div>
						</CardContent>
					</Card>
				</div>
				) : null}
			</div>
		</div>
	)
}
