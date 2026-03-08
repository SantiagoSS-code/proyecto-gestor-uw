import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

interface ActionItemsProps {
  pendingToday: number
  upcoming24h: number
  confirmedToday: number
  cancelled7d: number
}

export function ActionItems({ pendingToday, upcoming24h, confirmedToday, cancelled7d }: ActionItemsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Operación inmediata */}
      <Card className="border-none shadow-sm h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Operación inmediata</CardTitle>
            <Badge variant="secondary" className="text-[10px]">Tiempo real</Badge>
          </div>
          <CardDescription className="text-black">Estado de reservas para las próximas horas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">Pendientes de hoy</span>
              </div>
              <span className="text-sm font-semibold text-amber-700">{pendingToday}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">Próximas 24h</span>
              </div>
              <span className="text-sm font-semibold text-blue-700">{upcoming24h}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salud operativa */}
      <Card className="border-none shadow-sm h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Salud operativa</CardTitle>
            <Badge variant="outline" className="text-[10px]">Últimos 7 días</Badge>
          </div>
           <CardDescription className="text-black">Conversión y cancelaciones del centro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-800">Confirmadas hoy</span>
              </div>
              <span className="text-sm font-semibold text-emerald-700">{confirmedToday}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                <span className="text-sm text-rose-800">Canceladas (7d)</span>
              </div>
              <span className="text-sm font-semibold text-rose-700">{cancelled7d}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
