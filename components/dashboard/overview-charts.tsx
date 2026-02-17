"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts"

const revenueData = [
  { name: "Lun", total: 1500 },
  { name: "Mar", total: 2300 },
  { name: "Mié", total: 3200 },
  { name: "Jue", total: 2900 },
  { name: "Vie", total: 4500 },
  { name: "Sáb", total: 5800 },
  { name: "Dom", total: 5100 },
]

const hourlyData = [
  { time: "08:00", bookings: 2 },
  { time: "10:00", bookings: 5 },
  { time: "12:00", bookings: 3 },
  { time: "14:00", bookings: 4 },
  { time: "16:00", bookings: 8 },
  { time: "18:00", bookings: 12 },
  { time: "20:00", bookings: 10 },
  { time: "22:00", bookings: 6 },
]

export function OverviewCharts() {
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
                      tickFormatter={(value) => `$${value}`}
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
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
