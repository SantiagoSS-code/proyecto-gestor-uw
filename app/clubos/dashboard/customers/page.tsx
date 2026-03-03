import { CustomersList } from "@/components/dashboard/center/customers-list"

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
        <p className="text-slate-500 mt-2">
          Gestiona tu base de datos de clientes que han reservado en tu centro
        </p>
      </div>

      <CustomersList />
    </div>
  )
}
