import Link from "next/link"
import { notFound } from "next/navigation"
import { adminDb } from "@/lib/firebase/admin"
import { buildTokenQuery, getAdminGuardInput, isAdminAuthorized } from "@/lib/admin-token"
import { leadStatusSchema } from "@/lib/demo-request"

export const dynamic = "force-dynamic"

type Params = {
  id: string
}

type SearchParams = {
  token?: string
}

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
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

  const ref = adminDb.collection("demo_requests").doc(id)
  const snap = await ref.get()

  if (!snap.exists) {
    notFound()
  }

  const data = snap.data() as Record<string, unknown>
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined
  const statusResult = leadStatusSchema.safeParse(data.status)
  const currentStatus = statusResult.success ? statusResult.data : "new"

  const tokenQuery = buildTokenQuery(token)

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Lead {id}</h1>
          <Link href={`/admin/leads${tokenQuery}`} className="text-primary underline-offset-4 hover:underline">
            Volver al listado
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Nombre</dt>
              <dd className="text-base font-medium">{String(data.nombre || "-")} {String(data.apellido || "")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Email</dt>
              <dd className="text-base">{String(data.email || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Teléfono</dt>
              <dd className="text-base">{String(data.telefono || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Rol</dt>
              <dd className="text-base">{String(data.rol || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Club</dt>
              <dd className="text-base">{String(data.nombreClub || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Tipo de club</dt>
              <dd className="text-base">{String(data.tipoClub || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Tipo de canchas</dt>
              <dd className="text-base">{String(data.tipoCanchas || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Cantidad de canchas</dt>
              <dd className="text-base">{String(data.cantidadCanchas || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Deporte</dt>
              <dd className="text-base">{String(data.deporte || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Ubicación</dt>
              <dd className="text-base">{String(data.ciudad || "-")}, {String(data.pais || "-")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Marketing Opt-in</dt>
              <dd className="text-base">{data.marketingOptIn ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Creado</dt>
              <dd className="text-base">{createdAt?.toDate ? createdAt.toDate().toLocaleString() : "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Estado</h2>
          <form
            action={`/api/admin/leads/${id}/status${tokenQuery}`}
            method="post"
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <select
              name="status"
              defaultValue={currentStatus}
              className="border-input text-foreground h-10 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="qualified">qualified</option>
              <option value="closed">closed</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Guardar estado
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
