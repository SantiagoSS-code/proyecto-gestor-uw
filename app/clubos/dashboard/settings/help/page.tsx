import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, LifeBuoy, MessageSquare, Phone, Search, ShieldCheck, Clock3, AlertTriangle } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ayuda</h1>
        <p className="text-slate-500 mt-2">Recursos para resolver dudas operativas y gestionar incidencias del centro.</p>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Buscar en ayuda
          </CardTitle>
          <CardDescription>Ejemplo de buscador global para artículos y guías.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Label htmlFor="help-search" className="text-xs text-slate-500">¿Qué necesitás resolver?</Label>
              <Input id="help-search" placeholder="Ej: cambiar horario de canchas, reembolso, cancelar reserva..." className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Buscar</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Reservas</Badge>
            <Badge variant="secondary">Pagos</Badge>
            <Badge variant="secondary">Clientes</Badge>
            <Badge variant="secondary">Configuración</Badge>
            <Badge variant="secondary">Facturación</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-600" />Guías rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-700">• Crear una reserva manual</p>
            <p className="text-slate-700">• Configurar horarios del centro</p>
            <p className="text-slate-700">• Gestionar clientes frecuentes</p>
            <p className="text-slate-700">• Entender estados de reserva</p>
            <Button variant="outline" size="sm" className="mt-2 w-full">Ver todas las guías</Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-slate-600" />Canales de soporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-700">• Chat en vivo (Lun-Vie 9:00-18:00)</p>
            <p className="text-slate-700">• Email: soporte@courtly.app</p>
            <p className="text-slate-700">• WhatsApp de soporte comercial</p>
            <p className="text-slate-700">• Centro de estado del sistema</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-1" />Chat</Button>
              <Button variant="outline" size="sm"><Phone className="w-4 h-4 mr-1" />Llamar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-600" />Seguridad y cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-700">• Cambiar contraseña del admin</p>
            <p className="text-slate-700">• Recuperar acceso</p>
            <p className="text-slate-700">• Buenas prácticas de permisos</p>
            <p className="text-slate-700">• Revisión de actividad reciente</p>
            <Button variant="outline" size="sm" className="mt-2 w-full">Ir a seguridad</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Incidencias frecuentes</CardTitle>
          <CardDescription>Plantilla de contenido sugerida para casos típicos.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">No puedo crear una reserva</p>
            <p className="text-sm text-slate-600 mt-1">Validar conflicto, horarios habilitados y reglas de duración mínima.</p>
            <Button variant="link" className="px-0 h-auto mt-2" asChild>
              <Link href="/clubos/dashboard/reservas">Abrir Reservas</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">No aparecen canchas disponibles</p>
            <p className="text-sm text-slate-600 mt-1">Revisar horarios del centro y configuración de canchas activas.</p>
            <Button variant="link" className="px-0 h-auto mt-2" asChild>
              <Link href="/clubos/dashboard/settings/center">Configurar centro</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">Diferencias en ingresos reportados</p>
            <p className="text-sm text-slate-600 mt-1">Verificar estado de reservas confirmadas y forma de pago registrada.</p>
            <Button variant="link" className="px-0 h-auto mt-2" asChild>
              <Link href="/clubos/dashboard/finanzas">Ir a Finanzas</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Problema urgente</p>
            <p className="text-sm text-amber-700 mt-1">Cancha bloqueada, cobros erróneos o caída operativa.</p>
            <p className="text-xs text-amber-700 mt-2">Sugerencia UX: botón fijo “Reportar incidencia” visible en todo el panel.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock3 className="w-4 h-4 text-slate-600" />SLA sugerido de soporte</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-1">
          <p>• Consultas funcionales: &lt; 24h hábiles</p>
          <p>• Incidencias de operación (reservas/cobros): &lt; 4h hábiles</p>
          <p>• Incidencias críticas: atención prioritaria inmediata</p>
        </CardContent>
      </Card>
    </div>
  )
}
