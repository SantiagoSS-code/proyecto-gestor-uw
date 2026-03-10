"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { Check, CreditCard, Lock, ArrowLeft, Zap, Building2, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const PLAN_INFO: Record<string, { name: string; monthlyPrice: number; annualPrice: number; icon: React.ElementType; courts: string }> = {
  estandar:    { name: "Estandar",    monthlyPrice: 30000, annualPrice: 25000, icon: Zap,       courts: "1-3 Canchas" },
  profesional: { name: "Profesional", monthlyPrice: 45000, annualPrice: 37500, icon: Building2, courts: "4-6 Canchas" },
  maestro:     { name: "Maestro",     monthlyPrice: 60000, annualPrice: 50000, icon: Trophy,    courts: "7+ Canchas" },
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 })
    .format(n).replace("ARS", "$")
}

function formatCard(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}
function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2)
  return digits
}

// ─── Processing overlay ───────────────────────────────────────────────────────
function ProcessingScreen() {
  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-8">
        {/* Animated card */}
        <div className="relative w-24 h-16">
          <div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30"
            style={{ animation: "cardSlide 1.2s ease-in-out infinite alternate" }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-1 rounded-full bg-green-400/40"
            style={{ animation: "cardSlide 1.2s ease-in-out infinite alternate", animationDelay: "0.1s" }}
          />
        </div>

        <div className="text-center space-y-3">
          <p className="text-white text-lg font-semibold">Procesando tu pago</p>
          {/* Bouncing dots */}
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-green-400"
                style={{ animation: `dotBounce 1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardSlide {
          0%   { transform: translateX(-12px) rotate(-3deg); }
          100% { transform: translateX(12px)  rotate(3deg);  }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}

// ─── Success overlay ──────────────────────────────────────────────────────────
function SuccessScreen({ planName, onContinue }: { planName: string; onContinue: () => void }) {
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowParticles(true), 100)
    return () => clearTimeout(t)
  }, [])

  const particles = [
    { x: -55, y: -60, size: 5, delay: 0.0,  shape: "circle" },
    { x:  55, y: -50, size: 4, delay: 0.05, shape: "cross"  },
    { x: -70, y:  10, size: 5, delay: 0.1,  shape: "circle" },
    { x:  72, y:  20, size: 4, delay: 0.08, shape: "cross"  },
    { x: -30, y:  65, size: 4, delay: 0.12, shape: "circle" },
    { x:  35, y:  68, size: 5, delay: 0.06, shape: "cross"  },
    { x:   0, y: -75, size: 4, delay: 0.15, shape: "circle" },
    { x: -55, y:  50, size: 3, delay: 0.04, shape: "cross"  },
    { x:  58, y: -25, size: 3, delay: 0.09, shape: "circle" },
  ]

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Circle + check */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Outer ring – drawn with stroke-dashoffset */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle
              cx="56" cy="56" r="50"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="314"
              strokeDashoffset={showParticles ? "0" : "314"}
              style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
            />
          </svg>
          {/* Inner ring */}
          <svg className="absolute w-[76px] h-[76px] -rotate-90" viewBox="0 0 76 76">
            <circle
              cx="38" cy="38" r="34"
              fill="none"
              stroke="#4ade80"
              strokeWidth="2"
              strokeOpacity="0.35"
              strokeDasharray="214"
              strokeDashoffset={showParticles ? "0" : "214"}
              style={{ transition: "stroke-dashoffset 0.55s ease-out 0.15s" }}
            />
          </svg>
          {/* Check icon */}
          <Check
            className="w-9 h-9 text-green-400"
            style={{
              opacity: showParticles ? 1 : 0,
              transform: showParticles ? "scale(1)" : "scale(0.4)",
              transition: "opacity 0.35s ease-out 0.55s, transform 0.35s ease-out 0.55s",
            }}
          />
          {/* Particles */}
          {particles.map((p, i) => (
            <span
              key={i}
              className={cn(
                "absolute bg-green-400",
                p.shape === "circle" ? "rounded-full" : "rounded-sm rotate-45",
              )}
              style={{
                width: p.size,
                height: p.size,
                top: "50%",
                left: "50%",
                opacity: showParticles ? 0 : 0,
                transform: showParticles
                  ? `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) scale(1)`
                  : `translate(-50%, -50%) scale(0)`,
                transition: `transform 0.55s ease-out ${p.delay + 0.45}s, opacity 0.1s ease-out ${p.delay + 0.45}s`,
                ...(showParticles ? { opacity: 0.7 } : {}),
              }}
            />
          ))}
        </div>

        <div className="text-center space-y-2">
          <p className="text-white text-xl font-semibold">¡Bienvenido a Voyd!</p>
          <p className="text-zinc-400 text-sm max-w-xs">
            Tu plan <span className="text-green-400 font-medium">{planName}</span> fue activado correctamente.
          </p>
        </div>

        <button
          onClick={onContinue}
          className="mt-2 bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-8 py-3 rounded-xl transition-colors"
        >
          Ingresar a ClubOS →
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClubOSCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const centerId = useMemo(() => String(searchParams.get("centerId") || ""), [searchParams])
  const email    = useMemo(() => String(searchParams.get("email") || ""),    [searchParams])
  const planKey  = useMemo(() => String(searchParams.get("plan") || "profesional"), [searchParams])
  const billing  = useMemo(() => String(searchParams.get("billing") || "monthly"), [searchParams])
  const isAnnual = billing === "annual"

  const plan = PLAN_INFO[planKey] ?? PLAN_INFO.profesional
  const annualTotal = plan.annualPrice * 12
  const billingPrice = isAnnual ? annualTotal : plan.monthlyPrice
  const Icon = plan.icon

  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName]     = useState("")
  const [expiry, setExpiry]         = useState("")
  const [cvv, setCvv]               = useState("")
  const [error, setError]           = useState("")
  const [stage, setStage]           = useState<"form" | "processing" | "success">("form")

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardNumber || !cardName || !expiry || !cvv) {
      setError("Completá todos los campos de la tarjeta.")
      return
    }
    setError("")
    setStage("processing")
    await new Promise((r) => setTimeout(r, 2200))
    setStage("success")
  }

  if (stage === "processing") return <ProcessingScreen />
  if (stage === "success")    return (
    <SuccessScreen
      planName={plan.name}
      onContinue={() => router.push(`/clubos/login?checkout=success&plan=${planKey}`)}
    />
  )

  return (
    <main className="min-h-screen bg-[#080808] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#16a34a12_0%,_transparent_60%)] pointer-events-none" />

      <div className="container mx-auto px-4 py-10 relative max-w-5xl">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <VoydLogo className="h-9 brightness-0 invert" />
        </div>

        <div className="grid md:grid-cols-[1fr_420px] gap-8 items-start">

          {/* Left – Payment form */}
          <div className="space-y-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a planes
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white">Datos de pago</h1>
              <p className="text-zinc-500 text-sm mt-1">El primer mes es gratuito — no se realizará ningún cobro hoy.</p>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              {/* Card number */}
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400 font-medium">Número de tarjeta</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition text-sm"
                  />
                  <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                </div>
              </div>

              {/* Cardholder */}
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400 font-medium">Nombre en la tarjeta</label>
                <input
                  type="text"
                  placeholder="JUAN PÉREZ"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition text-sm"
                />
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-400 font-medium">Vencimiento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-400 font-medium">CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition text-sm"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-black bg-green-500 hover:bg-green-400 transition flex items-center justify-center gap-2 text-sm mt-2"
              >
                <Lock className="w-4 h-4" />
                Activar plan — primer mes gratis
              </button>

              <p className="text-xs text-zinc-600 text-center">
                Tu tarjeta no será cobrada hasta el fin del período de prueba.
              </p>
            </form>
          </div>

          {/* Right – Order summary */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6 md:sticky md:top-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Resumen del pedido</h2>

            {/* Plan card */}
            <div className="flex items-center gap-4 p-4 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Plan {plan.name}</p>
                <p className="text-zinc-500 text-xs">{plan.courts} · {isAnnual ? "Pago anual único" : "Facturación mensual"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-sm">{formatPrice(billingPrice)}</p>
                <p className="text-zinc-500 text-xs">{isAnnual ? "/año" : "/mes"}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3 text-sm">
              {isAnnual && (
                <div className="flex justify-between text-zinc-500 text-xs">
                  <span>Equivale a</span>
                  <span>{formatPrice(plan.annualPrice)}/mes</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatPrice(billingPrice)}{isAnnual ? "/año" : "/mes"}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>1er mes gratis</span>
                <span>hoy $ 0</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between text-white font-semibold">
                <span>Total hoy</span>
                <span className="text-green-400">$ 0</span>
              </div>
              {isAnnual ? (
                <p className="text-zinc-600 text-xs">
                  Después del mes gratis se cobra {formatPrice(annualTotal)} en un único pago anual.
                  La suscripción cubre 12 meses y se renueva automáticamente al vencimiento.
                  Podés cancelar en cualquier momento antes del vencimiento.
                </p>
              ) : (
                <p className="text-zinc-600 text-xs">
                  Después del mes gratis se factura {formatPrice(plan.monthlyPrice)}/mes.
                  Se renueva automáticamente. Podés cancelar cuando quieras.
                </p>
              )}
            </div>

            {/* Perks */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              {[
                "1 mes de prueba gratis incluido",
                "Cancelá cuando quieras",
                "Acceso completo desde el primer día",
                "Soporte incluido",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-green-400" />
                  </div>
                  {perk}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 pt-1">
              <Lock className="w-3 h-3" />
              <span>Pago seguro · Datos encriptados</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
