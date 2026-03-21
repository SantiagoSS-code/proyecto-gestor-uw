import { ReportsContent } from "@/components/dashboard/reports-content"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function ReportesPage() {
  return (
    <PermissionGate module="reports">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reportes</h1>
          <p className="text-slate-500 mt-2">
            Analizá el rendimiento de tu centro: ingresos, ocupación y clientes.
          </p>
        </div>
        <ReportsContent />
      </div>
    </PermissionGate>
  )
}
