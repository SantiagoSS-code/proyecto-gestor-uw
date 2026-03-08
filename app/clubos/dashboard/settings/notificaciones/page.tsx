import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotificacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notificaciones</h1>
        <p className="text-slate-500 mt-2">Mensajes automáticos para clientes y alertas internas del equipo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canales y plantillas</CardTitle>
          <CardDescription>Define qué se envía, cuándo y por qué canal.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Confirmación de reserva</p>
          <p>• Recordatorios previos al turno</p>
          <p>• Avisos de cancelación o cambios</p>
          <p>• Alertas internas para recepción/administración</p>
        </CardContent>
      </Card>
    </div>
  )
}
