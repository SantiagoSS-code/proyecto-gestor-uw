import { FinanceContent } from "@/components/dashboard/finance-content"

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Finanzas</h1>
        <p className="text-slate-500 mt-2">
          Ingresos, costos, rentabilidad, proyecciones y análisis financiero completo de tu centro.
        </p>
      </div>
      <FinanceContent />
    </div>
  )
}
