"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { Clock, CreditCard, CheckCircle2, ArrowRight, Mail } from "lucide-react"
import Link from "next/link"

function PendingPaymentContent() {
  const searchParams = useSearchParams()
  const uid = searchParams.get("uid") || ""

  return (
    <main className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ca8a0412_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo */}
        <VoydLogo className="h-8 brightness-0 invert opacity-80" />

        {/* Icon */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/20" />
          <Clock className="w-10 h-10 text-amber-400" />
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-white">Pago pendiente</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Tu cuenta fue creada pero aún no tiene una suscripción activa.
            Para acceder al panel de ClubOS necesitás completar el pago de tu plan.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Pasos para activar tu cuenta</p>
          {[
            { icon: CreditCard, text: "Elegí tu plan y completá el pago" },
            { icon: CheckCircle2, text: "Tu cuenta se activa automáticamente" },
            { icon: ArrowRight, text: "Accedé al panel de ClubOS" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <span className="text-sm text-zinc-300">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {uid ? (
          <Link
            href={`/clubos/register/plan?centerId=${uid}`}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold text-sm py-4 rounded-xl transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Activar mi cuenta
          </Link>
        ) : (
          <Link
            href="/clubos/register/plan"
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold text-sm py-4 rounded-xl transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Activar mi cuenta
          </Link>
        )}

        {/* Support link */}
        <p className="text-xs text-zinc-600 text-center">
          ¿Necesitás ayuda?{" "}
          <a href="mailto:soporte@voyd.com.ar" className="text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Contactanos
          </a>
        </p>
      </div>
    </main>
  )
}

export default function PendingPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
        </div>
      }
    >
      <PendingPaymentContent />
    </Suspense>
  )
}
