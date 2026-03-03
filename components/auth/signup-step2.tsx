'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { fetchLocations } from '@/lib/location-data'

export interface Step2FormData {
  street: string
  streetNumber: string
  country: string
  countryId: string
  province: string
  provinceId: string
  city: string
  cityId: string
  locality: string
  localityId: string
  postalCode: string
}

interface SignupStep2Props {
  data: Step2FormData
  onChange: (data: Step2FormData) => void
  errors: string[]
  isLoading: boolean
  error?: string | null
  onPrevious: () => void
  onSubmit: () => void
}

export function SignupStep2({ data, onChange, errors, isLoading, error, onPrevious, onSubmit }: SignupStep2Props) {
  const [countries, setCountries] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [localities, setLocalities] = useState<any[]>([])
  const [postalCodes, setPostalCodes] = useState<any[]>([])

  const [loadingCountries, setLoadingCountries] = useState(false)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingLocalities, setLoadingLocalities] = useState(false)
  const [loadingPostalCodes, setLoadingPostalCodes] = useState(false)

  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showLocalityDropdown, setShowLocalityDropdown] = useState(false)
  const [showPostalDropdown, setShowPostalDropdown] = useState(false)

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true)
      try {
        const results = await fetchLocations({ level: 'country' })
        setCountries(results)
      } catch (err) {
        console.error('Error loading countries:', err)
      } finally {
        setLoadingCountries(false)
      }
    }
    loadCountries()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown-city]')) setShowCityDropdown(false)
      if (!target.closest('[data-dropdown-locality]')) setShowLocalityDropdown(false)
      if (!target.closest('[data-dropdown-postal]')) setShowPostalDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load provinces when country changes
  useEffect(() => {
    if (!data.countryId) {
      setProvinces([])
      setCities([])
      setLocalities([])
      setPostalCodes([])
      return
    }

    const loadProvinces = async () => {
      setLoadingProvinces(true)
      try {
        const results = await fetchLocations({
          level: 'province',
          parentId: data.countryId,
        })
        setProvinces(results)
      } catch (err) {
        console.error('Error loading provinces:', err)
      } finally {
        setLoadingProvinces(false)
      }
    }
    loadProvinces()
  }, [data.countryId])

  // Load cities when province changes and search query has 3+ chars
  useEffect(() => {
    if (!data.provinceId || data.city.length < 3) {
      setCities([])
      return
    }

    const loadCities = async () => {
      setLoadingCities(true)
      try {
        const results = await fetchLocations({
          level: 'city',
          parentId: data.provinceId,
          search: data.city,
          maxResults: 10,
          context: {
            countryLabel: data.country,
            provinceLabel: data.province,
          },
        })
        setCities(results)
      } catch (err) {
        console.error('Error loading cities:', err)
      } finally {
        setLoadingCities(false)
      }
    }

    const debounce = setTimeout(loadCities, 300)
    return () => clearTimeout(debounce)
  }, [data.city, data.provinceId, data.country, data.province])

  // Load localities when city changes and search query has 3+ chars
  useEffect(() => {
    if (!data.cityId || data.locality.length < 3) {
      setLocalities([])
      return
    }

    const loadLocalities = async () => {
      setLoadingLocalities(true)
      try {
        const results = await fetchLocations({
          level: 'locality',
          parentId: data.cityId,
          search: data.locality,
          maxResults: 10,
          context: {
            countryLabel: data.country,
            provinceLabel: data.province,
            cityLabel: data.city,
            countryId: data.countryId,
          },
        })
        setLocalities(results)
      } catch (err) {
        console.error('Error loading localities:', err)
      } finally {
        setLoadingLocalities(false)
      }
    }

    const debounce = setTimeout(loadLocalities, 300)
    return () => clearTimeout(debounce)
  }, [data.locality, data.cityId, data.country, data.province, data.city, data.countryId])

  // Load postal codes when locality changes and search query
  useEffect(() => {
    if (!data.localityId || data.postalCode.length < 2) {
      setPostalCodes([])
      return
    }

    const loadPostalCodes = async () => {
      setLoadingPostalCodes(true)
      try {
        const results = await fetchLocations({
          level: 'postalCode',
          parentId: data.cityId,
          search: data.postalCode,
          maxResults: 10,
          context: {
            countryLabel: data.country,
            provinceLabel: data.province,
            cityLabel: data.city,
            countryId: data.countryId,
          },
        })
        setPostalCodes(results)
      } catch (err) {
        console.error('Error loading postal codes:', err)
      } finally {
        setLoadingPostalCodes(false)
      }
    }

    const debounce = setTimeout(loadPostalCodes, 300)
    return () => clearTimeout(debounce)
  }, [data.postalCode, data.cityId, data.country, data.province, data.city, data.countryId])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Calle y Número */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="street" className="text-base font-semibold">
              Calle *
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-primary" />
              <Input
                id="street"
                type="text"
                placeholder="Av. Libertador"
                className="pl-10 h-12 text-base"
                value={data.street}
                onChange={(e) => onChange({ ...data, street: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="streetNumber" className="text-base font-semibold">
              Número *
            </Label>
            <Input
              id="streetNumber"
              type="text"
              placeholder="1234"
              className="h-12 text-base"
              value={data.streetNumber}
              onChange={(e) => onChange({ ...data, streetNumber: e.target.value })}
            />
          </div>
        </div>

        {/* País y Provincia lado a lado - ocupan todo el ancho */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-base font-semibold">
              País *
            </Label>
            <Select
              value={data.countryId}
              onValueChange={(countryId) => {
                const country = countries.find((c) => c.id === countryId)
                onChange({
                  ...data,
                  countryId,
                  country: country?.label || '',
                  provinceId: '',
                  province: '',
                  cityId: '',
                  city: '',
                  localityId: '',
                  locality: '',
                  postalCode: '',
                })
              }}
            >
              <SelectTrigger className="h-12 text-base w-full" disabled={loadingCountries}>
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent className="w-full">
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id} className="text-base">
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="province" className="text-base font-semibold">
              Provincia/Estado *
            </Label>
            <Select
              value={data.provinceId}
              onValueChange={(provinceId) => {
                const province = provinces.find((p) => p.id === provinceId)
                onChange({
                  ...data,
                  provinceId,
                  province: province?.label || '',
                  cityId: '',
                  city: '',
                  localityId: '',
                  locality: '',
                  postalCode: '',
                })
              }}
              disabled={!data.countryId || loadingProvinces}
            >
              <SelectTrigger className="h-12 text-base w-full">
                <SelectValue placeholder={data.countryId ? 'Seleccionar provincia' : 'Selecciona un país primero'} />
              </SelectTrigger>
              <SelectContent className="w-full">
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id} className="text-base">
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ciudad */}
        <div className="space-y-2 relative" data-dropdown-city>
          <Label htmlFor="city" className="text-base font-semibold">
            Ciudad *
          </Label>
          <div className="relative">
            <Input
              id="city"
              type="text"
              placeholder="Escribe el nombre de la ciudad"
              className="h-12 text-base"
              value={data.city}
              onChange={(e) => {
                onChange({ ...data, city: e.target.value, cityId: '' })
                setShowCityDropdown(true)
              }}
              onFocus={() => data.provinceId && setShowCityDropdown(true)}
              disabled={!data.provinceId}
              autoComplete="off"
            />
            {loadingCities && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />}
          </div>

          {/* Dropdown de ciudades filtradas */}
          {showCityDropdown && data.city.length > 0 && data.provinceId && (
            <div className="absolute top-full left-0 right-0 bg-white border border-input rounded-md shadow-lg mt-1 z-50 max-h-48 overflow-y-auto">
              {cities.length > 0 ? (
                cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        ...data,
                        cityId: city.id,
                        city: city.label,
                        localityId: '',
                        locality: '',
                        postalCode: '',
                      })
                      setShowCityDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  >
                    {city.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">No hay resultados</div>
              )}
            </div>
          )}
        </div>

        {/* Localidad */}
        <div className="space-y-2 relative" data-dropdown-locality>
          <Label htmlFor="locality" className="text-base font-semibold">
            Localidad *
          </Label>
          <div className="relative">
            <Input
              id="locality"
              type="text"
              placeholder="Escribe el nombre de la localidad"
              className="h-12 text-base"
              value={data.locality}
              onChange={(e) => {
                onChange({ ...data, locality: e.target.value, localityId: '' })
                setShowLocalityDropdown(true)
              }}
              onFocus={() => data.cityId && setShowLocalityDropdown(true)}
              disabled={!data.cityId}
              autoComplete="off"
            />
            {loadingLocalities && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />}
          </div>

          {/* Dropdown de localidades filtradas */}
          {showLocalityDropdown && data.locality.length > 0 && data.cityId && (
            <div className="absolute top-full left-0 right-0 bg-white border border-input rounded-md shadow-lg mt-1 z-50 max-h-48 overflow-y-auto">
              {localities.length > 0 ? (
                localities.map((locality) => (
                  <button
                    key={locality.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        ...data,
                        localityId: locality.id,
                        locality: locality.label,
                        postalCode: '',
                      })
                      setShowLocalityDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  >
                    {locality.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">No hay resultados</div>
              )}
            </div>
          )}
        </div>

        {/* Código Postal */}
        <div className="space-y-2 relative" data-dropdown-postal>
          <Label htmlFor="postalCode" className="text-base font-semibold">
            Código Postal *
          </Label>
          <div className="relative">
            <Input
              id="postalCode"
              type="text"
              placeholder="Escribe el código postal"
              className="h-12 text-base"
              value={data.postalCode}
              onChange={(e) => {
                onChange({ ...data, postalCode: e.target.value })
                setShowPostalDropdown(true)
              }}
              onFocus={() => data.localityId && setShowPostalDropdown(true)}
              disabled={!data.localityId}
              autoComplete="off"
            />
            {loadingPostalCodes && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />}
          </div>

          {/* Dropdown de códigos postales filtrados */}
          {showPostalDropdown && data.postalCode.length > 0 && data.localityId && (
            <div className="absolute top-full left-0 right-0 bg-white border border-input rounded-md shadow-lg mt-1 z-50 max-h-48 overflow-y-auto">
              {postalCodes.length > 0 ? (
                postalCodes.map((postal) => (
                  <button
                    key={postal.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...data, postalCode: postal.label })
                      setShowPostalDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  >
                    {postal.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">No hay resultados</div>
              )}
            </div>
          )}
        </div>

      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-sm">
                  {err}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onPrevious}
          variant="outline"
          className="flex-1 h-12 font-semibold text-base"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Atrás
        </Button>
        <Button
          onClick={onSubmit}
          className="flex-1 h-12 bg-primary text-white font-semibold text-base hover:bg-primary/90"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Registrando...
            </>
          ) : (
            'Crear Cuenta'
          )}
        </Button>
      </div>
    </div>
  )
}
