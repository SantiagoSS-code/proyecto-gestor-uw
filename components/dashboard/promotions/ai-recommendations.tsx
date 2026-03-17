"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAiRecommendations, dismissRecommendation, actOnRecommendation } from "@/lib/promotions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, UserCheck, AlertTriangle, Clock, Trophy, ShoppingCart, X, Send, Plus } from "lucide-react"
import type { AiRecommendationDoc } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<
  AiRecommendationDoc["recommendationType"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  churn_risk:         { label: "Riesgo de abandono",    icon: AlertTriangle, color: "text-red-500 bg-red-50" },
  inactive:           { label: "Inactivo reciente",     icon: Clock,         color: "text-amber-500 bg-amber-50" },
  valley_hours:       { label: "Horas valle",           icon: Clock,         color: "text-blue-500 bg-blue-50" },
  abandoned_checkout: { label: "Checkout abandonado",  icon: ShoppingCart,  color: "text-orange-500 bg-orange-50" },
  loyal:              { label: "Jugador leal",          icon: Trophy,        color: "text-emerald-500 bg-emerald-50" },
}

/** Static example recommendations displayed when no real AI data exists */
const EXAMPLE_RECS: AiRecommendationDoc[] = [
  {
    id: "ex-1",
    clubId: "",
    userId: "demo1",
    userName: "Carlos Rodríguez",
    userEmail: "carlos@email.com",
    reason: "No reserva hace 45 días. Solía reservar cada semana.",
    recommendationType: "churn_risk",
    probabilityScore: 0.92,
    status: "pending",
  },
  {
    id: "ex-2",
    clubId: "",
    userId: "demo2",
    userName: "Ana Martínez",
    userEmail: "ana@email.com",
    reason: "Reservó 3 veces en horarios de 10:00–14:00 (horas valle).",
    recommendationType: "valley_hours",
    probabilityScore: 0.78,
    status: "pending",
  },
  {
    id: "ex-3",
    clubId: "",
    userId: "demo3",
    userName: "Lucía Torres",
    userEmail: "lucia@email.com",
    reason: "Abandonó el checkout sin completar el pago la semana pasada.",
    recommendationType: "abandoned_checkout",
    probabilityScore: 0.85,
    status: "pending",
  },
  {
    id: "ex-4",
    clubId: "",
    userId: "demo4",
    userName: "Martín García",
    userEmail: "martin@email.com",
    reason: "15 reservas completadas. Cliente de alto valor.",
    recommendationType: "loyal",
    probabilityScore: 0.95,
    status: "pending",
  },
  {
    id: "ex-5",
    clubId: "",
    userId: "demo5",
    userName: "Paula Jiménez",
    userEmail: "paula@email.com",
    reason: "Primera reserva hace 3 semanas. No volvió a reservar.",
    recommendationType: "inactive",
    probabilityScore: 0.71,
    status: "pending",
  },
]

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? "bg-red-100 text-red-700" :
    pct >= 60 ? "bg-amber-100 text-amber-700" :
    "bg-slate-100 text-slate-600"
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", color)}>
      {pct}% probabilidad
    </span>
  )
}

export function AiRecommendations() {
  const { user } = useAuth()
  const [recs, setRecs] = useState<AiRecommendationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.uid) return
    getAiRecommendations(user.uid)
      .then((data) => setRecs(data.length ? data : EXAMPLE_RECS))
      .finally(() => setLoading(false))
  }, [user?.uid])

  const isExample = !user?.uid || recs[0]?.clubId === ""

  const handleDismiss = async (id: string) => {
    setDismissed((s) => new Set([...s, id]))
    if (!isExample) await dismissRecommendation(id)
  }

  const handleAct = async (id: string) => {
    if (!isExample) await actOnRecommendation(id)
    // Future: open assign-coupon modal here
    alert("Funcionalidad de envío de cupón próximamente.")
  }

  const visible = recs.filter((r) => !dismissed.has(r.id!))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> IA – Recomendaciones
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Jugadores que podrían beneficiarse de una promoción según su comportamiento.
          </p>
        </div>
        {isExample && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
            Datos de ejemplo
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Analizando jugadores...</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Sparkles className="size-10 opacity-30" />
            <p className="text-sm">No hay recomendaciones activas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((rec) => {
            const cfg = TYPE_CONFIG[rec.recommendationType]
            const IconComp = cfg.icon
            return (
              <Card key={rec.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("p-1.5 rounded-full", cfg.color)}>
                        <IconComp className="size-3.5" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                    </div>
                    <button
                      onClick={() => handleDismiss(rec.id!)}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      title="Descartar"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-1">{rec.userName}</CardTitle>
                  {rec.userEmail && (
                    <p className="text-xs text-muted-foreground">{rec.userEmail}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  <ScoreBadge score={rec.probabilityScore} />
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-xs"
                      onClick={() => handleAct(rec.id!)}
                    >
                      <Send className="size-3" /> Enviar cupón
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 gap-1 text-xs"
                      onClick={() => handleAct(rec.id!)}
                    >
                      <Plus className="size-3" /> A campaña
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary">Motor de IA en desarrollo</p>
            <p className="text-muted-foreground mt-0.5">
              En la próxima versión conectaremos con datos reales de reservas para generar
              recomendaciones automáticas basadas en patrones de comportamiento de cada jugador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
