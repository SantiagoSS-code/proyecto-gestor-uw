"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { Check, Zap, Building2, Trophy, ChevronLeft, ChevronRight, ArrowRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type PlanKey = "estandar" | "profesional" | "maestro"

const plans: Array<{
  key: PlanKey
  name: string
  description: string
  courts: string
  monthlyPrice: number
  annualPrice: number
  icon: React.ElementType
  popular?: boolean
  features: string[]
}> = [
  {
    key: "estandar",
    name: "Estandar",
    description: "Ideal para clubes pequeños",
    courts: "1-3 Canchas",
    monthlyPrice: 30000,
    annualPrice: 25000,
    icon: Zap,
    features: [
      "Reservas online 24/7",
      "Bloqueo manual de horarios",
      "Base de datos de clientes",
      "Confirmaciones automáticas por email",
      "Cobro online con Mercado Pago",
      "Política básica de cancelación",
      "Panel administrativo simple",
      "Reporte básico de ingresos",
      "Reporte de ocupación por cancha",
      "Historial de reservas",
      "1 usuario administrador",
      "Soporte por email (48 hs)",
    ],
  },
  {
    key: "profesional",
    name: "Profesional",
    description: "Para clubes en crecimiento",
    courts: "4-6 Canchas",
    monthlyPrice: 45000,
    annualPrice: 37500,
    icon: Building2,
    popular: true,
    features: [
      "Todo en Estandar",
      "Cupones y descuentos",
      "Reportes avanzados por cancha y franja",
      "Métricas de retención de jugadores",
      "Clases públicas grupales",
      "Gestión básica de torneos",
      "Multi-usuario (staff)",
      "Roles y permisos",
      "Soporte prioritario (24 hs)",
    ],
  },
  {
    key: "maestro",
    name: "Maestro",
    description: "Para grandes complejos",
    courts: "7+ Canchas",
    monthlyPrice: 60000,
    annualPrice: 50000,
    icon: Trophy,
    features: [
      "Todo en Profesional",
      "Multi-sede",
      "Gestión de entrenadores",
      "Cursos estructurados (programas 8–12 semanas)",
      "Membresías avanzadas con beneficios dinámicos",
      "Reporte financiero detallado",
      "Proyección de ingresos",
      "IA para sugerir horarios óptimos",
      "Soporte prioritario (8 hs)",
    ],
  },
]

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace("ARS", "$")
}

function ClubOSRegisterPlanPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const centerId = useMemo(() => String(searchParams.get("centerId") || ""), [searchParams])
  const email = useMemo(() => String(searchParams.get("email") || ""), [searchParams])

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("profesional")
  const [isAnnual, setIsAnnual] = useState(false)
  const [error, setError] = useState("")

  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentCard, setCurrentCard] = useState(1)

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth
      scrollRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" })
      setCurrentCard(index)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = scrollRef.current.offsetWidth
      setCurrentCard(Math.round(scrollLeft / cardWidth))
    }
  }

  const handleCheckout = async (planKey: PlanKey) => {
    if (!centerId || !email) {
      setError("Faltán datos del registro. Volvé a abrir el link de invitación.")
      return
    }
    setSelectedPlan(planKey)
    router.push(
      `/clubos/register/checkout?centerId=${encodeURIComponent(centerId)}&email=${encodeURIComponent(email)}&plan=${planKey}&billing=${isAnnual ? "annual" : "monthly"}`
    )
  }

  return (
    <main className="min-h-screen bg-[#080808] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#16a34a18_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute top-60 -left-60 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-40 -right-40 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 py-12 relative">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <VoydLogo className="h-10 brightness-0 invert" />
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Planes para clubes</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 text-balance">
            Elegí el plan perfecto
            <br />
            <span className="text-green-400">para tu club</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
            Sin costos ocultos. Cancelá cuando quieras. Todos los planes incluyen 1 mes de prueba gratis.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={cn("text-sm font-medium transition-colors", !isAnnual ? "text-white" : "text-zinc-500")}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative w-16 h-8 rounded-full transition-colors duration-300 border",
                isAnnual ? "bg-green-500 border-green-500" : "bg-zinc-800 border-zinc-700",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300",
                  isAnnual ? "translate-x-9" : "translate-x-1",
                )}
              />
            </button>
            <span className={cn("text-sm font-medium transition-colors", isAnnual ? "text-white" : "text-zinc-500")}>
              Anual
            </span>
            {isAnnual && (
              <span className="bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                2 meses gratis
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Mobile carousel nav */}
        <div className="flex md:hidden items-center justify-center gap-4 mb-6">
          <button
            onClick={() => scrollToCard(currentCard - 1)}
            disabled={currentCard === 0}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {plans.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToCard(i)}
                className={cn("h-2 rounded-full transition-all", currentCard === i ? "bg-green-400 w-6" : "bg-zinc-700 w-2")}
              />
            ))}
          </div>
          <button
            onClick={() => scrollToCard(currentCard + 1)}
            disabled={currentCard === plans.length - 1}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cards */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex md:grid md:grid-cols-3 gap-5 max-w-6xl mx-auto overflow-x-auto snap-x snap-mandatory md:overflow-visible -mx-4 px-4 md:mx-auto md:px-0 pb-4 md:pb-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {plans.map((plan) => {
            const Icon = plan.icon
            const price = isAnnual ? plan.annualPrice * 12 : plan.monthlyPrice
            const annualSavings = plan.monthlyPrice * 12 - plan.annualPrice * 12
            const isSelected = selectedPlan === plan.key

            return (
              <div
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                className={cn(
                  "relative rounded-3xl p-6 md:p-8 transition-all duration-300 flex-shrink-0 w-[85vw] md:w-auto snap-center cursor-pointer",
                  plan.popular
                    ? "bg-gradient-to-b from-green-500 to-green-600 shadow-2xl shadow-green-500/25 md:-mt-4 md:mb-4 hover:shadow-green-500/40 hover:scale-[1.02]"
                    : isSelected
                    ? "bg-zinc-900 border border-green-500/60 ring-1 ring-green-500/30 hover:scale-[1.02]"
                    : "bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:scale-[1.01]",
                )}
              >
                {plan.popular && (
                  <div className="mb-4 -mt-1 flex justify-center">
                    <span className="bg-black/20 text-white text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-sm inline-block">
                      ✦ Más popular
                    </span>
                  </div>
                )}

                <div className="mb-6 text-center">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto",
                      plan.popular ? "bg-white/20" : "bg-green-500/10 border border-green-500/20",
                    )}
                  >
                    <Icon className={cn("w-6 h-6", plan.popular ? "text-white" : "text-green-400")} />
                  </div>
                  <h3 className="text-xl font-bold mb-1 text-white">
                    {plan.name}
                  </h3>
                  <p className={cn("text-sm", plan.popular ? "text-green-100/70" : "text-zinc-500")}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(price)}
                    </span>
                    <span className={cn("text-sm", plan.popular ? "text-green-100/70" : "text-zinc-500")}>
                      {isAnnual ? "/año" : "/mes"}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className={cn("text-xs mt-1", plan.popular ? "text-green-100/60" : "text-zinc-500")}>
                      equivale a {formatPrice(plan.annualPrice)}/mes
                    </p>
                  )}
                  <p className={cn("text-sm mt-1 font-medium", plan.popular ? "text-green-100/80" : "text-green-400")}>
                    {plan.courts}
                  </p>
                  {isAnnual && (
                    <p className={cn("text-xs mt-2", plan.popular ? "text-green-100/60" : "text-green-500")}>
                      Ahorrás {formatPrice(annualSavings)} vs mensual
                    </p>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleCheckout(plan.key) }}
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold mb-8 transition-all flex items-center justify-center gap-2 text-sm",
                    plan.popular
                      ? "bg-black/25 text-white hover:bg-black/35 backdrop-blur-sm border border-white/20"
                      : "bg-green-500 text-black hover:bg-green-400 font-bold",
                  )}
                >
                  Empezar prueba gratis
                  <ArrowRight className="w-4 h-4" />
                </button>

                <ul className="mx-auto w-full max-w-[320px] space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="grid grid-cols-[20px_1fr] items-start gap-3 text-left">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          plan.popular ? "bg-white/20" : "bg-green-500/15",
                        )}
                      >
                        <Check className={cn("w-3 h-3", plan.popular ? "text-white" : "text-green-400")} />
                      </div>
                      <span className={cn("text-sm leading-relaxed", plan.popular ? "text-green-50/85" : "text-zinc-400")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-green-500" />
            <span>Cancelá cuando quieras</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>1 mes de prueba gratis</span>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-600 mt-8 pb-12">
          ¿Tenés un complejo más grande o necesidades especiales?{" "}
          <a href="https://calendly.com/santiagonsanchez/30min" target="_blank" rel="noreferrer" className="text-green-400 hover:text-green-300 hover:underline font-medium transition-colors">
            Contactanos
          </a>
        </p>
      </div>
    </main>
  )
}

export default function ClubOSRegisterPlanPage() {
  return (
    <Suspense fallback={null}>
      <ClubOSRegisterPlanPageInner />
    </Suspense>
  )
}
