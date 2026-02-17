"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebaseClient"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import type { AmenityKey, CenterLocation, CenterProfile, SportKey } from "@/lib/types"
import { CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { slugify } from "@/lib/utils"
import { ClassesManager } from "@/components/dashboard/center/classes-manager"
import { fetchLocations, type LocationOption } from "@/lib/location-data"

const AMENITIES: Array<{ key: AmenityKey; label: string }> = [
  { key: "bar", label: "Bar" },
  { key: "bathrooms", label: "Baños" },
  { key: "showers", label: "Duchas" },
  { key: "gym", label: "Gimnasio" },
  { key: "parking", label: "Estacionamiento" },
  { key: "lockers", label: "Vestuarios" },
  { key: "wifi", label: "Wi‑Fi" },
  { key: "shop", label: "Tienda" },
  { key: "cafeteria", label: "Cafetería" },
]

const SPORTS: Array<{ key: SportKey; label: string }> = [
  { key: "padel", label: "Padel" },
  { key: "tennis", label: "Tennis" },
  { key: "futbol", label: "Fútbol" },
  { key: "pickleball", label: "Pickleball" },
  { key: "squash", label: "Squash" },
]

type LocationSelection = {
  country: LocationOption | null
  province: LocationOption | null
  city: LocationOption | null
  locality: LocationOption | null
  postalCode: LocationOption | null
}

const emptySelection: LocationSelection = {
  country: null,
  province: null,
  city: null,
  locality: null,
  postalCode: null,
}

const buildFullAddress = (selection: LocationSelection) => {
  return [
    selection.locality?.label,
    selection.city?.label,
    selection.province?.label,
    selection.postalCode?.label,
    selection.country?.label,
  ]
    .filter(Boolean)
    .join(", ")
}

type SearchableSelectProps = {
  label: string
  placeholder: string
  value: LocationOption | null
  options: LocationOption[]
  loading?: boolean
  disabled?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  onSelect: (value: LocationOption) => void
  emptyMessage: string
}

function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  loading,
  disabled,
  searchValue,
  onSearchChange,
  onSelect,
  emptyMessage,
}: SearchableSelectProps) {
  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.trim().toLowerCase())
  )

  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={value?.id || ""}
        onValueChange={(id) => {
          const next = options.find((opt) => opt.id === id)
          if (next) onSelect(next)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar…"
              className="h-8"
              disabled={disabled}
            />
          </div>
          <SelectSeparator />
          {loading ? (
            <SelectItem value="__loading" disabled>
              Cargando…
            </SelectItem>
          ) : filtered.length ? (
            filtered.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="__empty" disabled>
              {emptyMessage}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

async function generateUniqueSlug(desired: string, centerId: string) {
  const base = slugify(desired)
  if (!base) return ""

  // If base is free, use it.
  const exists = async (s: string) => {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.centers), where("slug", "==", s))
    const snap = await getDocs(q)
    return snap.docs.some((d) => d.id !== centerId)
  }

  if (!(await exists(base))) return base

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`
    if (!(await exists(candidate))) return candidate
  }

  // Worst-case fallback.
  return `${base}-${Date.now()}`
}

export function ClubProfileTab() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [form, setForm] = useState<CenterProfile>({
    name: "",
    phone: "",
    address: "",
    street: "",
    streetNumber: "",
    province: "",
    postalCode: "",
    city: "",
    country: "",
    placeId: "",
    location: null,
    description: "",
    amenities: [],
    sports: ["padel"],
    coverImageUrl: null,
    galleryImageUrls: [],
    slug: "",
    published: false,
    classesEnabled: false,
    featuredRank: null,
    topSearchedRank: null,
  })

  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [syncingSports, setSyncingSports] = useState(false)
  const [locationSelection, setLocationSelection] = useState<LocationSelection>(emptySelection)
  const [locationSearch, setLocationSearch] = useState({
    country: "",
    province: "",
    city: "",
    locality: "",
    postalCode: "",
  })
  const [countryOptions, setCountryOptions] = useState<LocationOption[]>([])
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([])
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([])
  const [localityOptions, setLocalityOptions] = useState<LocationOption[]>([])
  const [postalCodeOptions, setPostalCodeOptions] = useState<LocationOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState({
    country: false,
    province: false,
    city: false,
    locality: false,
    postalCode: false,
  })

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const ref = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data() as CenterProfile
          setForm((prev) => ({
            ...prev,
            ...data,
            name: data.name || prev.name,
            street: data.street || prev.street,
            streetNumber: data.streetNumber || prev.streetNumber,
            province: data.province || prev.province,
            postalCode: data.postalCode || prev.postalCode,
            amenities: (data.amenities || []) as any,
            sports: (data.sports || []) as any,
            galleryImageUrls: data.galleryImageUrls || [],
            coverImageUrl: data.coverImageUrl ?? null,
            published: !!data.published,
            slug: data.slug || "",
            placeId: data.placeId || "",
            location: data.location || null,
            classesEnabled: !!data.classesEnabled,
          }))
          if (data.location?.lat) setLat(String(data.location.lat))
          if (data.location?.lng) setLng(String(data.location.lng))
          const stored = data.location || null
          const country = stored?.country?.id ? stored.country : null
          const province = stored?.province?.id ? stored.province : null
          const city = stored?.city?.id ? stored.city : null
          const locality = stored?.locality?.id ? stored.locality : null
          const postalCode = stored?.postalCode?.id ? stored.postalCode : null
          setLocationSelection({ country, province, city, locality, postalCode })
        } else {
          // Initialize doc so rules/path exist
          await setDoc(ref, { name: "", published: false, createdAt: serverTimestamp() }, { merge: true })
        }
      } catch (e) {
        console.error("Failed to load club profile:", e)
        setMessage({ type: "error", text: "No se pudo cargar el perfil del club." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) load()
  }, [authLoading, user])

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name])

  const fullAddress = useMemo(() => {
    const streetLine = [form.street?.trim(), form.streetNumber?.trim()].filter(Boolean).join(" ")
    const locationLine = buildFullAddress(locationSelection)
    return [streetLine, locationLine].filter(Boolean).join(", ")
  }, [form.street, form.streetNumber, locationSelection])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingOptions((prev) => ({ ...prev, country: true }))
      try {
        const items = await fetchLocations({ level: "country", search: locationSearch.country })
        if (active) setCountryOptions(items)
      } catch (e) {
        console.error("Failed to load countries", e)
      } finally {
        if (active) setLoadingOptions((prev) => ({ ...prev, country: false }))
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locationSearch.country])

  useEffect(() => {
    if (!locationSelection.country?.id) {
      setProvinceOptions([])
      return
    }
    let active = true
    const load = async () => {
      setLoadingOptions((prev) => ({ ...prev, province: true }))
      try {
        const items = await fetchLocations({
          level: "province",
          parentId: locationSelection.country?.id,
          search: locationSearch.province,
        })
        if (active) setProvinceOptions(items)
      } catch (e) {
        console.error("Failed to load provinces", e)
      } finally {
        if (active) setLoadingOptions((prev) => ({ ...prev, province: false }))
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locationSearch.province, locationSelection.country?.id])

  useEffect(() => {
    if (!locationSelection.province?.id) {
      setCityOptions([])
      return
    }
    let active = true
    const load = async () => {
      setLoadingOptions((prev) => ({ ...prev, city: true }))
      try {
        const items = await fetchLocations({
          level: "city",
          parentId: locationSelection.province?.id,
          search: locationSearch.city,
          context: {
            countryLabel: locationSelection.country?.label,
            provinceLabel: locationSelection.province?.label,
            countryId: locationSelection.country?.id,
          },
        })
        if (active) setCityOptions(items)
      } catch (e) {
        console.error("Failed to load cities", e)
      } finally {
        if (active) setLoadingOptions((prev) => ({ ...prev, city: false }))
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locationSearch.city, locationSelection.province?.id])

  useEffect(() => {
    if (!locationSelection.city?.id) {
      setLocalityOptions([])
      return
    }
    let active = true
    const load = async () => {
      setLoadingOptions((prev) => ({ ...prev, locality: true }))
      try {
        const items = await fetchLocations({
          level: "locality",
          parentId: locationSelection.city?.id,
          search: locationSearch.locality,
          context: {
            countryLabel: locationSelection.country?.label,
            provinceLabel: locationSelection.province?.label,
            cityLabel: locationSelection.city?.label,
            countryId: locationSelection.country?.id,
          },
        })
        if (active) setLocalityOptions(items)
      } catch (e) {
        console.error("Failed to load localities", e)
      } finally {
        if (active) setLoadingOptions((prev) => ({ ...prev, locality: false }))
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locationSearch.locality, locationSelection.city?.id])

  useEffect(() => {
    if (!locationSelection.locality?.id) {
      setPostalCodeOptions([])
      return
    }
    let active = true
    const load = async () => {
      setLoadingOptions((prev) => ({ ...prev, postalCode: true }))
      try {
        const items = await fetchLocations({
          level: "postalCode",
          parentId: locationSelection.locality?.id,
          search: locationSearch.postalCode,
          context: {
            countryLabel: locationSelection.country?.label,
            provinceLabel: locationSelection.province?.label,
            cityLabel: locationSelection.city?.label,
            countryId: locationSelection.country?.id,
          },
        })
        if (active) setPostalCodeOptions(items)
      } catch (e) {
        console.error("Failed to load postal codes", e)
      } finally {
        if (active) setLoadingOptions((prev) => ({ ...prev, postalCode: false }))
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locationSearch.postalCode, locationSelection.locality?.id])

  const toggleAmenity = (key: AmenityKey) => {
    setForm((prev) => {
      const set = new Set(prev.amenities || [])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return { ...prev, amenities: Array.from(set) as any }
    })
  }

  const toggleSport = (key: SportKey) => {
    setForm((prev) => {
      const set = new Set(prev.sports || [])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return { ...prev, sports: Array.from(set) as any }
    })
  }

  const handleRegenerateSlug = async () => {
    if (!user) return
    setMessage(null)
    try {
      const next = await generateUniqueSlug(form.name, user.uid)
      setForm((prev) => ({ ...prev, slug: next }))
    } catch (e) {
      console.error("Slug generation failed:", e)
      setMessage({ type: "error", text: "No se pudo generar un slug único." })
    }
  }

  const handleSyncSports = async () => {
    if (!user) return
    setSyncingSports(true)
    try {
      const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.courts)
      const snapshot = await getDocs(courtsRef)
      const sports = Array.from(
        new Set(snapshot.docs.map((docSnap) => (docSnap.data() as any)?.sport).filter(Boolean))
      ) as SportKey[]
      setForm((prev) => ({ ...prev, sports }))
    } catch (e) {
      console.error("Failed to sync sports:", e)
      setMessage({ type: "error", text: "No se pudieron sincronizar los deportes." })
    } finally {
      setSyncingSports(false)
    }
  }

  const handleSave = async () => {
    if (!user || !canSave) return
    setSaving(true)
    setMessage(null)

    try {
      const centerId = user.uid

      let coverImageUrl = form.coverImageUrl || null
      let galleryImageUrls = [...(form.galleryImageUrls || [])]

      if (!form.slug) {
        const next = await generateUniqueSlug(form.name, centerId)
        setForm((prev) => ({ ...prev, slug: next }))
      }

      const parsedLat = lat.trim() === "" ? Number.NaN : Number(lat)
      const parsedLng = lng.trim() === "" ? Number.NaN : Number(lng)
      const locationPayload: CenterLocation = {
        country: locationSelection.country,
        province: locationSelection.province,
        city: locationSelection.city,
        locality: locationSelection.locality,
        postalCode: locationSelection.postalCode,
        fullAddress,
        lat: Number.isFinite(parsedLat) ? parsedLat : null,
        lng: Number.isFinite(parsedLng) ? parsedLng : null,
      }

      const payload: CenterProfile = {
        name: form.name.trim(),
        phone: form.phone?.trim() || "",
        address: fullAddress || form.address?.trim() || "",
        street: form.street?.trim() || "",
        streetNumber: form.streetNumber?.trim() || "",
        province: locationSelection.province?.label || "",
        postalCode: locationSelection.postalCode?.label || "",
        city: locationSelection.city?.label || "",
        country: locationSelection.country?.label || "",
        placeId: form.placeId?.trim() || "",
        location: locationPayload,
        description: form.description?.trim() || "",
        amenities: (form.amenities || []) as any,
        sports: (form.sports || []) as any,
        coverImageUrl,
        galleryImageUrls,
        slug: form.slug ? slugify(form.slug) : slugify(form.name),
        published: !!form.published,
        classesEnabled: !!form.classesEnabled,
        featuredRank: form.featuredRank ?? null,
        topSearchedRank: form.topSearchedRank ?? null,
        updatedAt: serverTimestamp() as any,
      }

      const ref = doc(db, FIRESTORE_COLLECTIONS.centers, centerId)
      await updateDoc(ref, payload as any)

      setForm((prev) => ({ ...prev, coverImageUrl, galleryImageUrls, slug: payload.slug }))
      setMessage({ type: "success", text: "Perfil del club guardado." })
    } catch (e) {
      console.error("Save club profile failed:", e)
      setMessage({ type: "error", text: "No se pudo guardar el perfil del club." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-black">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando perfil del club…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          className={`mb-2 ${message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">Perfil público del club</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del club</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div>
              <Label>Calle</Label>
              <Input value={form.street || ""} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>

            <div>
              <Label>Número</Label>
              <Input value={form.streetNumber || ""} onChange={(e) => setForm({ ...form, streetNumber: e.target.value })} />
            </div>

            <SearchableSelect
              label="País"
              placeholder="Seleccionar país"
              value={locationSelection.country}
              options={countryOptions}
              loading={loadingOptions.country}
              searchValue={locationSearch.country}
              onSearchChange={(value) => setLocationSearch((prev) => ({ ...prev, country: value }))}
              onSelect={(value) => {
                setLocationSelection({ country: value, province: null, city: null, locality: null, postalCode: null })
                setLocationSearch((prev) => ({ ...prev, province: "", city: "", locality: "", postalCode: "" }))
                setProvinceOptions([])
                setCityOptions([])
                setLocalityOptions([])
                setPostalCodeOptions([])
              }}
              emptyMessage="No hay países disponibles."
            />

            <SearchableSelect
              label="Provincia / Estado"
              placeholder={locationSelection.country ? "Seleccionar provincia" : "Seleccioná un país"}
              value={locationSelection.province}
              options={provinceOptions}
              loading={loadingOptions.province}
              disabled={!locationSelection.country}
              searchValue={locationSearch.province}
              onSearchChange={(value) => setLocationSearch((prev) => ({ ...prev, province: value }))}
              onSelect={(value) => {
                setLocationSelection({
                  country: locationSelection.country,
                  province: value,
                  city: null,
                  locality: null,
                  postalCode: null,
                })
                setLocationSearch((prev) => ({ ...prev, city: "", locality: "", postalCode: "" }))
                setCityOptions([])
                setLocalityOptions([])
                setPostalCodeOptions([])
              }}
              emptyMessage={locationSelection.country ? "Sin provincias para este país." : "Seleccioná un país primero."}
            />

            <SearchableSelect
              label="Ciudad"
              placeholder={locationSelection.province ? "Seleccionar ciudad" : "Seleccioná una provincia"}
              value={locationSelection.city}
              options={cityOptions}
              loading={loadingOptions.city}
              disabled={!locationSelection.province}
              searchValue={locationSearch.city}
              onSearchChange={(value) => setLocationSearch((prev) => ({ ...prev, city: value }))}
              onSelect={(value) => {
                setLocationSelection({
                  country: locationSelection.country,
                  province: locationSelection.province,
                  city: value,
                  locality: null,
                  postalCode: null,
                })
                if (typeof value.lat === "number" && typeof value.lng === "number") {
                  setLat(String(value.lat))
                  setLng(String(value.lng))
                }
                setLocationSearch((prev) => ({ ...prev, locality: "", postalCode: "" }))
                setLocalityOptions([])
                setPostalCodeOptions([])
              }}
              emptyMessage={
                locationSelection.province
                  ? locationSearch.city
                    ? "Sin resultados para esa búsqueda."
                    : "Escribí para buscar una ciudad."
                  : "Seleccioná una provincia primero."
              }
            />

            <SearchableSelect
              label="Localidad"
              placeholder={locationSelection.city ? "Seleccionar localidad" : "Seleccioná una ciudad"}
              value={locationSelection.locality}
              options={localityOptions}
              loading={loadingOptions.locality}
              disabled={!locationSelection.city}
              searchValue={locationSearch.locality}
              onSearchChange={(value) => setLocationSearch((prev) => ({ ...prev, locality: value }))}
              onSelect={(value) => {
                setLocationSelection({
                  country: locationSelection.country,
                  province: locationSelection.province,
                  city: locationSelection.city,
                  locality: value,
                  postalCode: null,
                })
                if (typeof value.lat === "number" && typeof value.lng === "number") {
                  setLat(String(value.lat))
                  setLng(String(value.lng))
                }
                setLocationSearch((prev) => ({ ...prev, postalCode: "" }))
                setPostalCodeOptions([])
              }}
              emptyMessage={
                locationSelection.city
                  ? locationSearch.locality
                    ? "Sin resultados para esa búsqueda."
                    : "Escribí para buscar una localidad."
                  : "Seleccioná una ciudad primero."
              }
            />

            <SearchableSelect
              label="Código postal"
              placeholder={locationSelection.locality ? "Seleccionar código postal" : "Seleccioná una localidad"}
              value={locationSelection.postalCode}
              options={postalCodeOptions}
              loading={loadingOptions.postalCode}
              disabled={!locationSelection.locality}
              searchValue={locationSearch.postalCode}
              onSearchChange={(value) => setLocationSearch((prev) => ({ ...prev, postalCode: value }))}
              onSelect={(value) => {
                setLocationSelection({
                  country: locationSelection.country,
                  province: locationSelection.province,
                  city: locationSelection.city,
                  locality: locationSelection.locality,
                  postalCode: value,
                })
                if (typeof value.lat === "number" && typeof value.lng === "number") {
                  setLat(String(value.lat))
                  setLng(String(value.lng))
                }
              }}
              emptyMessage={
                locationSelection.locality
                  ? locationSearch.postalCode
                    ? "Sin resultados para esa búsqueda."
                    : "Escribí para buscar un código postal."
                  : "Seleccioná una localidad primero."
              }
            />

            <div className="md:col-span-2">
              <Label>Dirección completa (autogenerada)</Label>
              <Input value={fullAddress} readOnly className="bg-slate-50" />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Google Maps Place ID (opcional)</Label>
              <Input value={form.placeId || ""} onChange={(e) => setForm({ ...form, placeId: e.target.value })} />
            </div>
            <div>
              <Label>Coordenadas (lat, lng)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-34.6037" />
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-58.3816" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-slate-900 mb-2">Servicios</div>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((a) => (
                  <label key={a.key} className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="checkbox"
                      checked={(form.amenities || []).includes(a.key)}
                      onChange={() => toggleAmenity(a.key)}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-medium text-slate-900">Deportes disponibles</div>
                <Button type="button" variant="outline" size="sm" onClick={handleSyncSports} disabled={syncingSports}>
                  {syncingSports ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sincronizar desde canchas"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPORTS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="checkbox"
                      checked={(form.sports || []).includes(s.key)}
                      onChange={() => toggleSport(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label>Imagen de portada</Label>
              <Input
                type="text"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={form.coverImageUrl || ""}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value || null })}
              />
              <p className="text-xs text-muted-foreground mt-1">Pega la URL de una imagen (Google Drive, redes sociales, etc.)</p>
              {form.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImageUrl} alt="" className="mt-3 h-40 w-full object-cover rounded-xl border border-slate-200" />
              ) : null}
            </div>
            <div>
              <Label>Imágenes de la galería (URLs separadas por coma)</Label>
              <Input
                type="text"
                placeholder="https://url1.jpg, https://url2.jpg"
                value={(form.galleryImageUrls || []).join(", ")}
                onChange={(e) => {
                  const urls = e.target.value.split(",").map(u => u.trim()).filter(Boolean)
                  setForm({ ...form, galleryImageUrls: urls })
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">Pega URLs separadas por coma</p>
              {form.galleryImageUrls?.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.galleryImageUrls.slice(0, 6).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="h-20 w-full object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Slug</Label>
              <div className="flex gap-2">
                <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                <Button type="button" variant="outline" onClick={handleRegenerateSlug} className="text-black">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-black mt-1">URL pública: /clubs/{form.slug || "…"}</div>
            </div>
            <div>
              <Label>Publicar</Label>
              <div className="mt-2 flex items-center gap-2 text-sm text-black">
                <input type="checkbox" checked={!!form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                Visible en /clubs
              </div>
            </div>
          </div>

          <div>
            <Label>Clases habilitadas</Label>
            <div className="mt-2 flex items-center gap-2 text-sm text-black">
              <input type="checkbox" checked={!!form.classesEnabled} onChange={(e) => setForm({ ...form, classesEnabled: e.target.checked })} />
              Mostrar clases en la página pública
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Guardando…
                </>
              ) : (
                "Guardar perfil"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {form.classesEnabled ? (
        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Clases y escuelas</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassesManager />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
