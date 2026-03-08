import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const roles = [
  {
    name: "Dueño",
    description: "Acceso total: configuración, cobros, equipo y reportes.",
  },
  {
    name: "Manager",
    description: "Operación diaria: reservas, canchas, clientes y reportes operativos.",
  },
  {
    name: "Recepción",
    description: "Gestión de reservas y clientes, sin acceso a configuración sensible.",
  },
]

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equipo y permisos</h1>
        <p className="text-slate-500 mt-2">Define roles para dueños y empleados con acceso por módulo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modelo recomendado de roles</CardTitle>
          <CardDescription>Separá permisos por responsabilidad, no por persona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {roles.map((role) => (
            <div key={role.name} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{role.name}</Badge>
              </div>
              <p className="text-sm text-slate-700">{role.description}</p>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Próximo paso: invitar usuarios y configurar permisos por sección (Reservas, Canchas, Clientes, Finanzas, Configuración).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
