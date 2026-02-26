"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Check, Zap, Building2, Trophy, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Estandar",
    description: "Ideal para clubes pequeños",
    courts: "1-3 Canchas",
    monthlyPrice: 30000,
    annualPrice: 25000,
    annualSavings: 60000,
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
    name: "Profesional",
    description: "Para clubes en crecimiento",
    courts: "4-6 Canchas",
    monthlyPrice: 45000,
    annualPrice: 37500,
    annualSavings: 90000,
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
    name: "Maestro",
    description: "Para grandes complejos",
    courts: "7+ Canchas",
    monthlyPrice: 60000,
    annualPrice: 50000,
    annualSavings: 120000,
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

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentCard, setCurrentCard] = useState(1)

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth
      scrollRef.current.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      })
      setCurrentCard(index)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = scrollRef.current.offsetWidth
      const newIndex = Math.round(scrollLeft / cardWidth)
      setCurrentCard(newIndex)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(price)
      .replace("ARS", "$")
  }

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Planes para clubes</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6 text-balance">
            Elige el plan perfecto
            <br />
            <span className="text-primary">para tu club</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Sin costos ocultos. Cancela cuando quieras. Todos los planes incluyen 14 días de prueba gratis.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isAnnual ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative w-16 h-8 rounded-full transition-colors duration-300",
                isAnnual ? "bg-primary" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300",
                  isAnnual ? "translate-x-9" : "translate-x-1",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isAnnual ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Anual
            </span>
            {isAnnual && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                2 meses gratis
              </span>
            )}
          </div>
        </div>

        {/* Mobile Carousel Navigation */}
        <div className="flex md:hidden items-center justify-center gap-4 mb-6">
          <button
            onClick={() => scrollToCard(currentCard - 1)}
            disabled={currentCard === 0}
            className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {plans.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  currentCard === index ? "bg-primary w-6" : "bg-muted"
                )}
              />
            ))}
          </div>
          <button
            onClick={() => scrollToCard(currentCard + 1)}
            disabled={currentCard === plans.length - 1}
            className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Cards */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex md:grid md:grid-cols-3 gap-6 max-w-6xl mx-auto overflow-x-auto snap-x snap-mandatory md:overflow-visible -mx-4 px-4 md:mx-auto md:px-0 pb-4 md:pb-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {plans.map((plan) => {
            const Icon = plan.icon
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-3xl p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] flex-shrink-0 w-[85vw] md:w-auto snap-center",
                  plan.popular
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 md:-mt-4 md:mb-4"
                    : "bg-card border border-border hover:border-primary/30 hover:shadow-xl",
                )}
              >
                {plan.popular && (
                  <div className="mb-4 -mt-1 flex justify-center">
                    <span className="bg-white text-primary text-xs font-bold px-4 py-1.5 rounded-full shadow-sm inline-block">
                      Mas popular
                    </span>
                  </div>
                )}

                <div className={cn("mb-6 text-center", !plan.popular && "mt-0")}>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto",
                      plan.popular ? "bg-white/20" : "bg-primary/10",
                    )}
                  >
                    <Icon className={cn("w-6 h-6", plan.popular ? "text-white" : "text-primary")} />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-1", plan.popular ? "text-white" : "text-foreground")}>
                    {plan.name}
                  </h3>
                  <p className={cn("text-sm", plan.popular ? "text-white/70" : "text-muted-foreground")}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={cn("text-4xl font-bold", plan.popular ? "text-white" : "text-foreground")}>
                      {formatPrice(price)}
                    </span>
                    <span className={cn("text-sm", plan.popular ? "text-white/70" : "text-muted-foreground")}>
                      /mes
                    </span>
                  </div>
                  <p className={cn("text-sm mt-1 font-medium", plan.popular ? "text-white/80" : "text-primary")}>
                    {plan.courts}
                  </p>
                  {isAnnual && (
                    <p className={cn("text-xs mt-2", plan.popular ? "text-white/60" : "text-green-600")}>
                      Ahorrás {formatPrice(plan.annualSavings)} al año
                    </p>
                  )}
                </div>

                <Button
                  asChild
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold mb-8 transition-all",
                    plan.popular
                      ? "bg-white text-primary hover:bg-white/90"
                      : "bg-primary text-white hover:bg-primary/90",
                  )}
                >
                  <a href="#form-prueba">Empezar prueba gratis</a>
                </Button>

                <ul className="mx-auto w-full max-w-[320px] space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="grid grid-cols-[20px_1fr] items-start gap-3 text-left">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          plan.popular ? "bg-white/20" : "bg-primary/10",
                        )}
                      >
                        <Check className={cn("w-3 h-3", plan.popular ? "text-white" : "text-primary")} />
                      </div>
                      <span className={cn("text-sm leading-relaxed", plan.popular ? "text-white/90" : "text-muted-foreground")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">¿Tenés un complejo más grande o necesidades especiales?</p>
          <Button asChild variant="outline" className="rounded-full px-8 bg-transparent">
            <a href="https://calendly.com/santiagonsanchez/30min" target="_blank" rel="noreferrer">
              Contactar a ventas
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
