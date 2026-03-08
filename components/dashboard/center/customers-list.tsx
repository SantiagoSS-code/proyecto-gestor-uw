"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, Phone, Calendar, DollarSign, Search, Copy, Check, TrendingUp, AlertCircle, Clock, MapPin, BarChart3, Zap, ArrowLeft, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, formatDurationHours } from "@/lib/utils"

interface Customer {
  email: string
  name: string
  phone?: string
  totalReservations: number
  lastReservationDate?: Date | null
  totalSpent: number
}

interface CustomerDetail {
  email: string
  name: string
  phone: string
  totalReservations: number
  totalSpent: number
  totalIncome: number
  averageFrequency: number
  favoriteCourt: { id: string; name: string; bookingCount: number } | null
  mostUsedTime: { time: string; bookingCount: number } | null
  cancelledReservations: number
  reservations: Array<{
    id: string
    court: string
    courtName: string
    date: string
    time: string
    duration: number
    price: number
    status: string
  }>
  internalNotes: string
}

type FilterType = 'all' | 'active30' | 'inactive60' | 'frequent' | 'highSpenders'

export function CustomersList() {
  const ITEMS_PER_PAGE = 10
  const { user, centerId } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [minReservations, setMinReservations] = useState<number>(0)
  const [minSpent, setMinSpent] = useState<number>(0)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!resolvedCenterId) return

    const fetchCustomers = async () => {
      try {
        setLoading(true)

        // Load bookings directly from Firebase Client SDK
        const loadBookingsFromCollection = async (rootCollection: string) => {
          try {
            const bookingsRef = collection(db, rootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.bookings)
            const snapshot = await getDocs(bookingsRef)
            return snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as any),
            }))
          } catch {
            return []
          }
        }

        // Try new model first, then legacy
        const [newBookings, legacyBookings] = await Promise.all([
          loadBookingsFromCollection(FIRESTORE_COLLECTIONS.centers),
          loadBookingsFromCollection(FIRESTORE_COLLECTIONS.legacyCenters),
        ])

        const allBookings = [...newBookings, ...legacyBookings]

        // Aggregate customers from bookings
        const customersMap = new Map<string, Customer>()

        allBookings.forEach((booking: any) => {
          const email = (booking.customerEmail || booking.email || "").toLowerCase()
          if (!email) return

          const existing = customersMap.get(email) || {
            email,
            name: booking.customerName || booking.customer || "Sin nombre",
            phone: booking.customerPhone || booking.phone || undefined,
            totalReservations: 0,
            lastReservationDate: null,
            totalSpent: 0,
          }

          existing.totalReservations += 1
          existing.totalSpent += booking.price || 0

          const dateValue = booking.date || booking.dateKey
          if (dateValue) {
            const dateObj = new Date(dateValue)
            if (!existing.lastReservationDate || dateObj > new Date(existing.lastReservationDate)) {
              existing.lastReservationDate = dateObj
            }
          }

          // Update name/phone if we have better data
          if (!existing.name || existing.name === "Sin nombre") {
            existing.name = booking.customerName || booking.customer || existing.name
          }
          if (!existing.phone) {
            existing.phone = booking.customerPhone || booking.phone || undefined
          }

          customersMap.set(email, existing)
        })

        const customersList = Array.from(customersMap.values()).sort(
          (a, b) =>
            (b.lastReservationDate ? new Date(b.lastReservationDate).getTime() : 0) -
            (a.lastReservationDate ? new Date(a.lastReservationDate).getTime() : 0)
        )

        setCustomers(customersList)
      } catch (error) {
        console.error("Error fetching customers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [resolvedCenterId])

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const handleOpenCustomerDetail = async (customer: Customer) => {
    if (!resolvedCenterId) return

    try {
      setLoadingCustomerDetail(true)

      // Load bookings directly from Firebase Client SDK
      const loadBookingsFromCollection = async (rootCollection: string) => {
        try {
          const bookingsRef = collection(db, rootCollection, resolvedCenterId, CENTER_SUBCOLLECTIONS.bookings)
          const snapshot = await getDocs(bookingsRef)
          return snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as any),
          }))
        } catch {
          return []
        }
      }

      const [newBookings, legacyBookings] = await Promise.all([
        loadBookingsFromCollection(FIRESTORE_COLLECTIONS.centers),
        loadBookingsFromCollection(FIRESTORE_COLLECTIONS.legacyCenters),
      ])

      const allBookings = [...newBookings, ...legacyBookings]

      // Filter for this customer
      const customerBookings = allBookings.filter(
        (b: any) => (b.customerEmail || b.email || "").toLowerCase() === customer.email.toLowerCase()
      )

      if (customerBookings.length === 0) {
        setSelectedCustomer({
          email: customer.email,
          name: customer.name,
          phone: customer.phone || "",
          totalReservations: 0,
          totalSpent: 0,
          totalIncome: 0,
          averageFrequency: 0,
          favoriteCourt: null,
          mostUsedTime: null,
          cancelledReservations: 0,
          reservations: [],
          internalNotes: "",
        })
        return
      }

      const totalReservations = customerBookings.length
      const totalSpent = customerBookings.reduce((sum: number, b: any) => sum + (b.price || 0), 0)
      const cancelledReservations = customerBookings.filter(
        (b: any) => b.status === "cancelada" || b.status === "cancelled"
      ).length

      // Favorite court
      const courtCounts = new Map<string, { name: string; count: number }>()
      customerBookings.forEach((b: any) => {
        const courtId = b.court || b.courtId || ""
        if (courtId) {
          const existing = courtCounts.get(courtId) || { name: b.courtName || courtId, count: 0 }
          existing.count += 1
          courtCounts.set(courtId, existing)
        }
      })
      let favoriteCourt: CustomerDetail["favoriteCourt"] = null
      courtCounts.forEach((val, id) => {
        if (!favoriteCourt || val.count > favoriteCourt.bookingCount) {
          favoriteCourt = { id, name: val.name, bookingCount: val.count }
        }
      })

      // Most used time
      const timeCounts = new Map<string, number>()
      customerBookings.forEach((b: any) => {
        if (b.time) timeCounts.set(b.time, (timeCounts.get(b.time) || 0) + 1)
      })
      let mostUsedTime: CustomerDetail["mostUsedTime"] = null
      timeCounts.forEach((count, time) => {
        if (!mostUsedTime || count > mostUsedTime.bookingCount) {
          mostUsedTime = { time, bookingCount: count }
        }
      })

      // Average frequency
      const dates = customerBookings
        .map((b: any) => new Date(b.date || b.dateKey || "").getTime())
        .filter((t: number) => !isNaN(t))
        .sort((a: number, b: number) => a - b)
      let averageFrequency = 0
      if (dates.length > 1) {
        const intervals = []
        for (let i = 1; i < dates.length; i++) {
          intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
        }
        averageFrequency = Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10
      }

      const reservations = customerBookings
        .map((b: any) => ({
          id: b.id,
          court: b.court || b.courtId || "",
          courtName: b.courtName || "",
          date: b.date || b.dateKey || "",
          time: b.time || "",
          duration: b.duration || b.durationMinutes || 60,
          price: b.price || 0,
          status: b.status || "pending",
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setSelectedCustomer({
        email: customer.email,
        name: (customerBookings[0] as any).customerName || (customerBookings[0] as any).customer || customer.name,
        phone: (customerBookings[0] as any).customerPhone || (customerBookings[0] as any).phone || customer.phone || "",
        totalReservations,
        totalSpent,
        totalIncome: totalSpent,
        averageFrequency,
        favoriteCourt,
        mostUsedTime,
        cancelledReservations,
        reservations,
        internalNotes: "",
      })
    } catch (error) {
      console.error("Error fetching customer details:", error)
    } finally {
      setLoadingCustomerDetail(false)
    }
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" })
  }

  // Helper: calcular días desde última reserva
  const getDaysSinceLastReservation = (date: Date | null | undefined): number => {
    if (!date) return Infinity
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Helper: determinar si cliente está activo (últimos 30 días)
  const isActive = (customer: Customer): boolean => {
    return getDaysSinceLastReservation(customer.lastReservationDate) <= 30
  }

  // Aplicar filtros
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Aplicar filtro activo
    if (activeFilter === 'active30') {
      filtered = filtered.filter(c => isActive(c))
    } else if (activeFilter === 'inactive60') {
      filtered = filtered.filter(c => getDaysSinceLastReservation(c.lastReservationDate) > 60)
    } else if (activeFilter === 'frequent') {
      filtered = filtered.filter(c => c.totalReservations >= 5)
    } else if (activeFilter === 'highSpenders') {
      filtered = filtered.filter(c => c.totalSpent >= 10000)
    }

    // Aplicar filtros de slider
    filtered = filtered.filter(c => c.totalReservations >= minReservations && c.totalSpent >= minSpent)

    return filtered
  }, [customers, searchTerm, activeFilter, minReservations, minSpent])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCustomers, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeFilter, minReservations, minSpent])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <div className="text-slate-500">Cargando clientes...</div>
      </div>
    )
  }

  // ─── Vista detalle de un cliente seleccionado ───
  if (selectedCustomer || loadingCustomerDetail) {
    return (
      <div className="space-y-6">
        {/* Header con botón volver */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCustomer(null)
              setLoadingCustomerDetail(false)
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Clientes
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {loadingCustomerDetail ? "Cargando..." : selectedCustomer?.name}
          </h2>
        </div>

        {loadingCustomerDetail ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                <p>Cargando detalles del cliente...</p>
              </div>
            </CardContent>
          </Card>
        ) : selectedCustomer ? (
          <div className="space-y-6">
            {/* Información básica */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-slate-900 mt-1 break-words">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Teléfono</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{selectedCustomer.phone || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas principales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Reservas</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{selectedCustomer.totalReservations}</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Ingresos Generados</p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">{formatCurrencyARS(selectedCustomer.totalSpent)}</p>
                  </div>
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Cancelaciones</p>
                    <p className="text-2xl font-bold text-amber-900 mt-1">{selectedCustomer.cancelledReservations}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Frecuencia</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">Cada {selectedCustomer.averageFrequency} días</p>
                  </div>
                  {selectedCustomer.favoriteCourt && (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                      <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Cancha Favorita</p>
                      <p className="text-sm font-bold text-purple-900 mt-1">{selectedCustomer.favoriteCourt.name}</p>
                      <p className="text-xs text-purple-600 mt-1">{selectedCustomer.favoriteCourt.bookingCount} reservas</p>
                    </div>
                  )}
                  {selectedCustomer.mostUsedTime && (
                    <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-100">
                      <p className="text-xs text-pink-600 font-medium uppercase tracking-wide">Horario Más Usado</p>
                      <p className="text-sm font-bold text-pink-900 mt-1">{selectedCustomer.mostUsedTime.time}</p>
                      <p className="text-xs text-pink-600 mt-1">{selectedCustomer.mostUsedTime.bookingCount} veces</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Historial + Notas en grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Historial de reservas */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Historial Completo de Reservas</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer.reservations.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">Sin reservas registradas</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {selectedCustomer.reservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border ${
                            reservation.status === 'cancelada' || reservation.status === 'cancelled'
                              ? 'bg-red-50/50 border-red-100'
                              : reservation.status === 'confirmada' || reservation.status === 'confirmed'
                              ? 'bg-emerald-50/50 border-emerald-100'
                              : 'bg-amber-50/50 border-amber-100'
                          }`}
                        >
                          <Calendar className="w-5 h-5 mt-1 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium text-slate-900">{reservation.courtName}</p>
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                  reservation.status === 'cancelada' || reservation.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : reservation.status === 'confirmada' || reservation.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {reservation.status === 'confirmada' || reservation.status === 'confirmed'
                                  ? '✓ Confirmada'
                                  : reservation.status === 'cancelada' || reservation.status === 'cancelled'
                                  ? '✕ Cancelada'
                                  : '⏱ Pendiente'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mt-2">
                              <span className="font-medium">{new Date(reservation.date).toLocaleDateString('es-AR')}</span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {reservation.time}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium">{formatDurationHours(reservation.duration / 60)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-semibold text-slate-900">{formatCurrencyARS(reservation.price)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notas internas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Notas Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[150px]">
                    <p className="text-sm text-slate-700">{selectedCustomer.internalNotes || "Sin notas agregadas"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // ─── Vista principal: listado de clientes ───
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-0">
            <CardTitle className="text-sm font-medium text-slate-600">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-3xl font-bold text-slate-900">{customers.length}</div>
            <p className="text-xs text-slate-500 mt-1">que han reservado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-0">
            <CardTitle className="text-sm font-medium text-slate-600">Clientes Activos (30d)</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-3xl font-bold text-slate-900">
              {customers.filter((c) => {
                if (!c.lastReservationDate) return false
                const days = Math.floor((Date.now() - new Date(c.lastReservationDate).getTime()) / (1000 * 60 * 60 * 24))
                return days <= 30
              }).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">en últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-0">
            <CardTitle className="text-sm font-medium text-slate-600">Gasto Promedio</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrencyARS(customers.length ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length : 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">por cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table with Integrated Filters */}
      <Card className="overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Listado de Clientes</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {filteredCustomers.length} clientes encontrados · mostrando hasta {ITEMS_PER_PAGE} por página
              </p>
            </div>
            
            {/* Buscador */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white border-slate-200 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-500">
                  <th className="text-left font-medium py-3 pl-6 pr-4 uppercase tracking-wider text-xs">Cliente</th>
                  <th className="text-left font-medium py-3 px-4 uppercase tracking-wider text-xs">Email</th>
                  <th className="text-left font-medium py-3 px-4 uppercase tracking-wider text-xs">Teléfono</th>
                  <th className="text-center font-medium py-3 px-4 uppercase tracking-wider text-xs">Reservas</th>
                  <th className="text-left font-medium py-3 px-4 uppercase tracking-wider text-xs">Última Reserva</th>
                  <th className="text-right font-medium py-3 px-4 uppercase tracking-wider text-xs">Revenue Total</th>
                  <th className="text-left font-medium py-3 pl-4 pr-6 uppercase tracking-wider text-xs">Estado</th>
                  <th className="text-right font-medium py-3 pl-4 pr-6 uppercase tracking-wider text-xs">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Users className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No hay clientes aún</p>
                        <p className="text-sm text-slate-400">Los clientes aparecerán aquí cuando hagan su primera reserva</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr 
                      key={customer.email} 
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer Name */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{customer.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 group">
                          <span className="text-slate-600">{customer.email}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyEmail(customer.email)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200"
                            title="Copiar email"
                          >
                            {copiedEmail === customer.email ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Reservations */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">
                          {customer.totalReservations}
                        </span>
                      </td>

                      {/* Last Reservation */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-600">
                          {formatDate(customer.lastReservationDate)}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 font-medium text-slate-900">
                          <span>{formatCurrencyARS(customer.totalSpent)}</span>
                        </div>
                      </td>

                      {/* Estado (Status) */}
                      <td className="py-4 pl-4 pr-6 whitespace-nowrap">
                        {(() => {
                          const daysSince = getDaysSinceLastReservation(customer.lastReservationDate)
                          if (daysSince <= 30) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-emerald-700 font-medium text-xs">Activo</span>
                              </div>
                            )
                          } else if (daysSince <= 60) {
                            return (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                <span className="text-amber-700 font-medium text-xs">Advertencia</span>
                              </div>
                            )
                          } else {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                <span className="text-slate-600 font-medium text-xs">Inactivo</span>
                              </div>
                            )
                          }
                        })()}
                      </td>

                      {/* Acción */}
                      <td className="py-4 pl-4 pr-6 whitespace-nowrap text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCustomerDetail(customer)}
                          className="h-8 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver ficha
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
              <p className="text-xs text-slate-500">
                Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredCustomers.length)}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} de {filteredCustomers.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-slate-600 px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
