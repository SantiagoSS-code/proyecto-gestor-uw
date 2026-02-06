"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, LogOut, Building2, Calendar, Users, Settings, BarChart3, TrendingUp, DollarSign, Clock, Star } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"

interface DashboardCentrosContentProps {
  admin: {
    first_name: string
    last_name: string
    email: string
  }
  center: {
    name: string
    street: string
    street_number: string
    city: string
    province: string
    image_url: string | null
  }
}

export function DashboardCentrosContent({ admin, center }: DashboardCentrosContentProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut(auth)
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-slate-900">courtly</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-black hidden sm:inline">
              Bienvenido, {user?.displayName || admin.first_name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-black hover:text-black"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Bienvenido de nuevo, <span className="text-blue-600">{center.name}</span>
          </h1>
          <p className="text-black mt-2 text-lg">
            Esto es lo que pasa hoy en {center.name}.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black text-sm font-medium">Ingresos totales</p>
                  <p className="text-2xl font-bold text-slate-900">$12,345</p>
                  <p className="text-black text-xs flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% vs mes anterior
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black text-sm font-medium">Reservas activas</p>
                  <p className="text-2xl font-bold text-slate-900">24</p>
                  <p className="text-black text-xs flex items-center mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    8 hoy
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black text-sm font-medium">Clientes totales</p>
                  <p className="text-2xl font-bold text-slate-900">156</p>
                  <p className="text-black text-xs flex items-center mt-1">
                    <Users className="w-3 h-3 mr-1" />
                    +5 esta semana
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black text-sm font-medium">Valoración promedio</p>
                  <p className="text-2xl font-bold text-slate-900">4.8</p>
                  <p className="text-black text-xs flex items-center mt-1">
                    <Star className="w-3 h-3 mr-1" />
                    Basado en 89 reseñas
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Info Card */}
        <Card className="mb-8 bg-white border border-slate-200/70 shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-4">
              {center.image_url ? (
                <img
                  src={center.image_url}
                  alt={center.name}
                  className="w-24 h-24 rounded-lg object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-blue-600" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl text-slate-900">{center.name}</CardTitle>
                <CardDescription className="text-black">
                  {center.street} {center.street_number}, {center.city}, {center.province}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    Activo
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    Plan Inicial
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard-centros/reservas">
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-slate-200/70 shadow-sm hover:border-blue-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900">Reservas</h3>
                <p className="text-sm text-black">Gestionar reservas</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard-centros/courts">
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-slate-200/70 shadow-sm hover:border-blue-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900">Canchas</h3>
                <p className="text-sm text-black">Gestionar canchas y disponibilidad</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-slate-200/70 shadow-sm hover:border-blue-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Clientes</h3>
              <p className="text-sm text-black">Ver lista de clientes</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-slate-200/70 shadow-sm hover:border-blue-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Analíticas</h3>
              <p className="text-sm text-black">Ver reportes e insights</p>
            </CardContent>
          </Card>

          <Link href="/dashboard-centros/settings">
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-slate-200/70 shadow-sm hover:border-blue-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900">Configuración</h3>
                <p className="text-sm text-black">Configurar tu centro</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
