"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

import { PadelCenterClient } from "@/lib/types"

export default function SettingsPage() {
	const { user, loading: authLoading } = useAuth()
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [centerData, setCenterData] = useState<PadelCenterClient | null>(null)
	const [formData, setFormData] = useState({
		name: '',
		phone: '',
		street: '',
		streetNumber: '',
		province: '',
		postalCode: '',
		placeId: '',
		lat: '',
		lng: '',
		city: '',
		country: '',
		centerContactName: '',
		centerContactEmail: '',
		centerContactPhone: '',
		adminContactName: '',
		adminContactEmail: '',
		adminContactPhone: '',
	})
	const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
				const centerRef = doc(db, 'padel_centers', user.uid)
				const centerSnap = await getDoc(centerRef)

				if (centerSnap.exists()) {
					const data = centerSnap.data() as PadelCenterClient
					setCenterData(data)

					const centerContact = data.contacts?.center
					const adminContact = data.contacts?.admin
					const location = data.location || null

					setFormData({
						name: data.name || '',
						phone: data.phone || '',
						street: data.street || '',
						streetNumber: data.street_number || '',
						province: data.province || '',
						postalCode: data.postalCode || '',
						placeId: data.placeId || '',
						lat: typeof location?.lat === 'number' ? String(location.lat) : '',
						lng: typeof location?.lng === 'number' ? String(location.lng) : '',
						city: data.city || '',
						country: data.country || '',
						centerContactName: centerContact?.name || data.name || '',
						centerContactEmail: centerContact?.email || '',
						centerContactPhone: centerContact?.phone || data.phone || '',
						adminContactName: adminContact?.name || '',
						adminContactEmail: adminContact?.email || data.email || '',
						adminContactPhone: adminContact?.phone || '',
					})
				} else {
					// Redirect to registration if center data doesn't exist
					router.push('/registro-centros')
					return
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

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const handleSave = async () => {
		if (!user || !centerData) return

		setSaving(true)
		setMessage(null)

		try {
			const streetLine = [formData.street.trim(), formData.streetNumber.trim()].filter(Boolean).join(" ")
			const composedAddress = [streetLine, formData.city.trim(), formData.province.trim(), formData.postalCode.trim()]
				.filter(Boolean)
				.join(", ")
			const lat = Number.parseFloat(formData.lat)
			const lng = Number.parseFloat(formData.lng)
			const hasLocation = Number.isFinite(lat) && Number.isFinite(lng)
			const location = hasLocation ? { lat, lng } : null

			const centerRef = doc(db, 'padel_centers', user.uid)
			await updateDoc(centerRef, {
				name: formData.name,
				phone: formData.phone,
				address: composedAddress || centerData.address || '',
				street: formData.street,
				street_number: formData.streetNumber,
				province: formData.province,
				postalCode: formData.postalCode,
				placeId: formData.placeId || null,
				location,
				city: formData.city,
				country: formData.country,
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
			})

			const publicCenterRef = doc(db, 'centers', user.uid)
			await setDoc(
				publicCenterRef,
				{
					name: formData.name,
					phone: formData.phone,
					address: composedAddress || centerData.address || '',
					street: formData.street,
					streetNumber: formData.streetNumber,
					province: formData.province,
					postalCode: formData.postalCode,
					placeId: formData.placeId || null,
					location,
					city: formData.city,
					country: formData.country,
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			)

			setMessage({ type: 'success', text: '¡Configuración actualizada correctamente!' })

			// Update local state
			setCenterData(prev => prev ? {
				...prev,
				name: formData.name,
				phone: formData.phone,
				address: composedAddress || centerData.address || '',
				street: formData.street,
				street_number: formData.streetNumber,
				province: formData.province,
				postalCode: formData.postalCode,
				placeId: formData.placeId || null,
				location,
				city: formData.city,
				country: formData.country,
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
			} : null)
		} catch (error) {
			console.error('Error updating center data:', error)
			setMessage({ type: 'error', text: 'No se pudo actualizar la configuración. Por favor intentá de nuevo.' })
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
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración del Centro</h1>
				<p className="text-slate-500 mt-2">
					Actualiza la información y preferencias de tu centro
				</p>
			</div>

			<div className="max-w-2xl">

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
								Actualiza los datos básicos de tu centro
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Editable Fields */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label htmlFor="name" className="text-slate-500 dark:text-slate-500">Nombre del centro</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) => handleInputChange('name', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Ingresa el nombre del centro"
									/>
								</div>
								<div>
									<Label htmlFor="phone" className="text-slate-500 dark:text-slate-500">Teléfono</Label>
									<Input
										id="phone"
										value={formData.phone}
										onChange={(e) => handleInputChange('phone', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Ingresa el número de teléfono"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label htmlFor="street" className="text-slate-500 dark:text-slate-500">Calle</Label>
									<Input
										id="street"
										value={formData.street}
										onChange={(e) => handleInputChange('street', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Av. Libertador"
									/>
								</div>
								<div>
									<Label htmlFor="streetNumber" className="text-slate-500 dark:text-slate-500">Número</Label>
									<Input
										id="streetNumber"
										value={formData.streetNumber}
										onChange={(e) => handleInputChange('streetNumber', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="1234"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label htmlFor="city" className="text-slate-500 dark:text-slate-500">Ciudad</Label>
									<Input
										id="city"
										value={formData.city}
										onChange={(e) => handleInputChange('city', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Buenos Aires"
									/>
								</div>
								<div>
									<Label htmlFor="province" className="text-slate-500 dark:text-slate-500">Provincia</Label>
									<Input
										id="province"
										value={formData.province}
										onChange={(e) => handleInputChange('province', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Buenos Aires"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label htmlFor="postalCode" className="text-slate-500 dark:text-slate-500">Código postal</Label>
									<Input
										id="postalCode"
										value={formData.postalCode}
										onChange={(e) => handleInputChange('postalCode', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="C1425"
									/>
								</div>
								<div>
									<Label htmlFor="country" className="text-slate-500 dark:text-slate-500">País</Label>
									<Input
										id="country"
										value={formData.country}
										onChange={(e) => handleInputChange('country', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="Argentina"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label htmlFor="placeId" className="text-slate-500 dark:text-slate-500">Google Place ID</Label>
									<Input
										id="placeId"
										value={formData.placeId}
										onChange={(e) => handleInputChange('placeId', e.target.value)}
										className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
										placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="lat" className="text-slate-500 dark:text-slate-500">Lat</Label>
										<Input
											id="lat"
											value={formData.lat}
											onChange={(e) => handleInputChange('lat', e.target.value)}
											className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
											placeholder="-34.6037"
										/>
									</div>
									<div>
										<Label htmlFor="lng" className="text-slate-500 dark:text-slate-500">Lng</Label>
										<Input
											id="lng"
											value={formData.lng}
											onChange={(e) => handleInputChange('lng', e.target.value)}
											className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
											placeholder="-58.3816"
										/>
									</div>
								</div>
							</div>

							<div className="border-t border-gray-200 dark:border-gray-700 pt-6">
								<h3 className="text-lg font-medium text-slate-500 dark:text-white mb-1">Perfiles de contacto</h3>
								<p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
									Configura cómo los usuarios pueden contactar al centro y al administrador.
								</p>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<h4 className="text-sm font-semibold text-slate-500 dark:text-white">Contacto del centro</h4>
										<div>
											<Label htmlFor="centerContactName" className="text-slate-500 dark:text-slate-500">Nombre</Label>
											<Input
												id="centerContactName"
												value={formData.centerContactName}
												onChange={(e) => handleInputChange('centerContactName', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="Nombre de contacto del centro"
											/>
										</div>
										<div>
											<Label htmlFor="centerContactEmail" className="text-slate-500 dark:text-slate-500">Email</Label>
											<Input
												id="centerContactEmail"
												type="email"
												value={formData.centerContactEmail}
												onChange={(e) => handleInputChange('centerContactEmail', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="contact@centro.com"
											/>
										</div>
										<div>
											<Label htmlFor="centerContactPhone" className="text-slate-500 dark:text-slate-500">Phone</Label>
											<Input
												id="centerContactPhone"
												value={formData.centerContactPhone}
												onChange={(e) => handleInputChange('centerContactPhone', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="+54 ..."
											/>
										</div>
									</div>

									<div className="space-y-4">
										<h4 className="text-sm font-semibold text-slate-500 dark:text-white">Contacto del administrador</h4>
										<div>
											<Label htmlFor="adminContactName" className="text-slate-500 dark:text-slate-500">Nombre</Label>
											<Input
												id="adminContactName"
												value={formData.adminContactName}
												onChange={(e) => handleInputChange('adminContactName', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="Nombre del administrador"
											/>
										</div>
										<div>
											<Label htmlFor="adminContactEmail" className="text-slate-500 dark:text-slate-500">Email</Label>
											<Input
												id="adminContactEmail"
												type="email"
												value={formData.adminContactEmail}
												onChange={(e) => handleInputChange('adminContactEmail', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="admin@..."
											/>
										</div>
										<div>
											<Label htmlFor="adminContactPhone" className="text-slate-500 dark:text-slate-500">Phone</Label>
											<Input
												id="adminContactPhone"
												value={formData.adminContactPhone}
												onChange={(e) => handleInputChange('adminContactPhone', e.target.value)}
												className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-slate-500 dark:text-white"
												placeholder="+54 ..."
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Read-only Fields */}
							<div className="border-t border-gray-200 dark:border-gray-700 pt-6">
								<h3 className="text-lg font-medium text-slate-500 dark:text-white mb-4">Información de la cuenta</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<Label className="text-slate-500 dark:text-slate-500">Correo electrónico</Label>
										<div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
											<span className="text-slate-500 dark:text-white">{centerData.email}</span>
										</div>
									</div>
									<div>
										<Label className="text-slate-500 dark:text-slate-500">Plan</Label>
										<div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
											<span className="text-slate-500 dark:text-white capitalize">{centerData.plan}</span>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end pt-6">
								<Button
									onClick={handleSave}
									disabled={saving}
									className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
								>
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
		</div>
	)
}
