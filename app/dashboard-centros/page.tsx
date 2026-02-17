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
import { useState } from "react"

export default function DashboardCentrosPage() {
  const [period, setPeriod] = useState("Hoy")

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 text-black">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo, Club Padel Pro</h2>
          <p className="mt-1">Esto es lo que pasa hoy en tu centro.</p>
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
          value="$1,250.00"
          trend="+12.5%"
          trendUp={true}
          description="vs período anterior"
          icon={DollarSign}
        />
        <KpiCard
          title="Reservas activas"
          value="24"
          trend="+4"
          trendUp={true}
          description="hoy"
          icon={CalendarDays}
        />
        <KpiCard
          title="Clientes totales"
          value="1,429"
          trend="+18"
          trendUp={true}
          description="nuevos este mes"
          icon={Users}
        />
        <KpiCard
          title="Valoración promedio"
          value="4.8"
          trend="+0.1"
          trendUp={true}
          description="de 12 reseñas"
          icon={Star}
        />
      </div>

      {/* Fila de Gráficos */}
      <OverviewCharts />

      {/* Fila Inferior */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        
        {/* Próximas reservas */}
        <Card className="col-span-1 lg:col-span-4 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
             <div className="space-y-1">
                 <CardTitle>Próximas reservas</CardTitle>
                 <CardDescription className="text-black">
                  Tienes 4 reservas pendientes hoy.
                 </CardDescription>
             </div>
               <Button variant="outline" size="sm">Ver todo</Button>
          </CardHeader>
          <CardContent>
            <RecentBookings />
          </CardContent>
        </Card>

        {/* Acciones y Operaciones */}
        <div className="col-span-1 lg:col-span-3">
             <ActionItems />
        </div>
      </div>
    </div>
  )
}
