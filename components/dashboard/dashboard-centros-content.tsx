"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, LogOut, Building2, Calendar, Users, Settings, BarChart3 } from "lucide-react"
// import { createClient } from "@/lib/supabase/client"

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
  // const [isLoggingOut, setIsLoggingOut] = useState(false)

  // const handleLogout = async () => {
  //   setIsLoggingOut(true)
  //   const supabase = createClient()
  //   await supabase.auth.signOut()
  //   router.push("/")
  //   router.refresh()
  // }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-foreground">courtly</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {admin.first_name} {admin.last_name}
            </span>
            {/* <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Bienvenido, {admin.first_name}</h1>
          <p className="text-muted-foreground mt-1">Panel de administración de {center.name}</p>
        </div>

        {/* Center Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start gap-4">
              {center.image_url ? (
                <img
                  src={center.image_url || "/placeholder.svg"}
                  alt={center.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-foreground">{center.name}</CardTitle>
                <CardDescription>
                  {center.street} {center.street_number}, {center.city}, {center.province}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Reservas</h3>
              <p className="text-sm text-muted-foreground">Gestionar reservas</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Clientes</h3>
              <p className="text-sm text-muted-foreground">Ver clientes</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Estadísticas</h3>
              <p className="text-sm text-muted-foreground">Ver reportes</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Configuración</h3>
              <p className="text-sm text-muted-foreground">Ajustes del centro</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
