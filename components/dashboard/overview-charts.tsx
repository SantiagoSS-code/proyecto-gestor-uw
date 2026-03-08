"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts"
import { formatCurrencyARS } from "@/lib/utils"

interface OverviewChartsProps {
  revenueData: Array<{ name: string; total: number }>
  hourlyData: Array<{ time: string; bookings: number }>
  loading?: boolean
}

export function OverviewCharts({ revenueData, hourlyData, loading = false }: OverviewChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="h-[240px] w-full rounded bg-slate-200 animate-pulse" />
          </CardContent>
        </Card>
        <Card className="col-span-3 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="h-[240px] w-full rounded bg-slate-200 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4 border-none shadow-sm">
        <CardHeader>
          <CardTitle>Ingresos en el tiempo</CardTitle>
          <CardDescription>
            Desglose semanal de ingresos
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[240px] w-full">
            {revenueData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
                Sin datos de ingresos para el período seleccionado
              </div>
            ) : (
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#111111" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#111111" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => formatCurrencyARS(Number(value) || 0)}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8b5cf6" 
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                        strokeWidth={2}
                    />
                </AreaChart>
             </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-3 border-none shadow-sm">
        <CardHeader>
          <CardTitle>Reservas por hora</CardTitle>
          <CardDescription>
            Horas pico de hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-[240px] w-full">
            {hourlyData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
                Sin reservas por hora para mostrar
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                <XAxis 
                  dataKey="time" 
                  stroke="#111111" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Bar 
                    dataKey="bookings" 
                    fill="currentColor" 
                    radius={[4, 4, 0, 0]} 
                    className="fill-primary" 
                    barSize={20}
                />
                </BarChart>
            </ResponsiveContainer>
            )}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
