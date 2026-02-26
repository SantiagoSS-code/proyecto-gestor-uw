import Link from "next/link"
import { adminDb } from "@/lib/firebase/admin"
import { buildTokenQuery, getAdminGuardInput, isAdminAuthorized } from "@/lib/admin-token"

export const dynamic = "force-dynamic"

type SearchParams = {
  token?: string
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { token } = await searchParams
  const guardInput = await getAdminGuardInput(token)
  const isAuthorized = isAdminAuthorized(guardInput)

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
          <h1 className="text-2xl font-semibold">Acceso denegado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Proporcioná el token de administrador en <code>x-admin-token</code> o en el query param <code>?token=...</code>.
          </p>
        </div>
      </main>
    )
  }

  const snap = await adminDb
    .collection("demo_requests")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()

  const leads = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined

    return {
      id: doc.id,
      nombre: (data.nombre as string) || "-",
      apellido: (data.apellido as string) || "-",
      email: (data.email as string) || "-",
      telefono: (data.telefono as string) || "-",
      nombreClub: (data.nombreClub as string) || "-",
      status: (data.status as string) || "new",
      createdAt: createdAt?.toDate ? createdAt.toDate().toLocaleString() : "-",
    }
  })

  const tokenQuery = buildTokenQuery(token)

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Leads de demo</h1>
          <p className="text-sm text-muted-foreground">Últimos {leads.length} registros</p>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Club</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-4 py-3">{lead.createdAt}</td>
                  <td className="px-4 py-3">{lead.nombre} {lead.apellido}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3">{lead.telefono}</td>
                  <td className="px-4 py-3">{lead.nombreClub}</td>
                  <td className="px-4 py-3 capitalize">{lead.status}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/leads/${lead.id}${tokenQuery}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Ver lead
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
