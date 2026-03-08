import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cobros y facturación</h1>
        <p className="text-slate-500 mt-2">Métodos de pago, datos fiscales y reglas financieras del centro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos módulos</CardTitle>
          <CardDescription>Preparado para separar la gestión financiera del perfil personal.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Moneda e impuestos</p>
          <p>• Integraciones de cobro (Stripe/Mercado Pago)</p>
          <p>• Datos fiscales y emisión de comprobantes</p>
          <p>• Señas, penalidades y reembolsos</p>
        </CardContent>
      </Card>
    </div>
  )
}
