"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getSubscriptions, getPlans, changeSubscriptionStatus,
} from "@/lib/memberships"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Search } from "lucide-react"
import type { MembershipSubscriptionDoc, MembershipPlanDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  trial:    "bg-blue-100 text-blue-700",
  paused:   "bg-amber-100 text-amber-700",
  canceled: "bg-slate-100 text-slate-500",
  past_due: "bg-red-100 text-red-600",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Activo", trial: "Prueba", paused: "Pausado",
  canceled: "Cancelado", past_due: "Vencido",
}

function fmtDate(val: any): string {
  if (!val) return "—"
  try {
    const d: Date = typeof val.toDate === "function" ? val.toDate() : new Date(val)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

export function SubscribersManager() {
  const { user } = useAuth()
  const [subs, setSubs] = useState<MembershipSubscriptionDoc[]>([])
  const [plans, setPlans] = useState<MembershipPlanDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  const clubId = user?.uid ?? ""

  useEffect(() => {
    if (!clubId) return
    Promise.all([getSubscriptions(clubId), getPlans(clubId)])
      .then(([s, p]) => { setSubs(s); setPlans(p) })
      .finally(() => setLoading(false))
  }, [clubId])

  async function handleAction(
    sub: MembershipSubscriptionDoc,
    action: "pause" | "reactivation" | "cancellation",
  ) {
    const statusMap = {
      pause: "paused",
      reactivation: "active",
      cancellation: "canceled",
    } as const
    const newStatus = statusMap[action]
    await changeSubscriptionStatus(sub.id!, clubId, newStatus, action)
    setSubs((prev) =>
      prev.map((s) => s.id === sub.id ? { ...s, status: newStatus } : s),
    )
  }

  const filtered = subs.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.userName?.toLowerCase().includes(q) ||
      s.userEmail?.toLowerCase().includes(q) ||
      s.planName?.toLowerCase().includes(q)
    )
  })

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "—"

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{subs.length} suscriptores totales</p>
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar por nombre o plan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 border rounded-lg text-muted-foreground text-sm">
          {query ? "Sin resultados para esa búsqueda." : "Sin suscriptores aún."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Próxima renovación</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{sub.userName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{sub.userEmail ?? sub.userId}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{sub.planName ?? planName(sub.planId)}</TableCell>
                <TableCell>
                  <Badge className={cn("text-xs font-medium", STATUS_COLORS[sub.status] ?? "bg-slate-100 text-slate-500")}>
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{fmtDate(sub.startedAt)}</TableCell>
                <TableCell className="text-sm">{fmtDate(sub.renewsAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sub.status === "active" || sub.status === "trial" ? (
                        <>
                          <DropdownMenuItem onClick={() => handleAction(sub, "pause")}>
                            Pausar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleAction(sub, "cancellation")}
                          >
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      ) : sub.status === "paused" ? (
                        <>
                          <DropdownMenuItem onClick={() => handleAction(sub, "reactivation")}>
                            Reactivar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleAction(sub, "cancellation")}
                          >
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      ) : sub.status === "canceled" ? (
                        <DropdownMenuItem onClick={() => handleAction(sub, "reactivation")}>
                          Reactivar
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
