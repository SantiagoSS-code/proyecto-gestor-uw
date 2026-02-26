import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, TrendingUp, Users, Calendar, Building2 } from "lucide-react"
import Link from "next/link"

export function CtaSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">+40%</div>
              <div className="text-white/70 text-sm">Más reservas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
              <div className="text-white/70 text-sm">Clubes activos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-white/70 text-sm">Reservas automáticas</div>
            </div>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 mb-8 border border-white/20">
              <Building2 className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-medium">Para clubes y centros deportivos</span>
            </div>

            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 text-balance leading-tight">
              Tu club merece
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                tecnología de élite
              </span>
            </h2>

            <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              Gestiona reservas, aumenta ingresos y ofrece la mejor experiencia a tus jugadores con IA.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90 h-14 px-10 rounded-full text-base font-semibold shadow-lg shadow-black/20 transition-all hover:scale-105"
              >
                <Link href="/pricing#form-prueba">
                  Registrar mi Club
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 rounded-full text-base font-semibold border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm transition-all"
                >
                  Ver planes y precios
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Reservas inteligentes</h3>
              <p className="text-white/70 text-sm">IA que optimiza horarios y maximiza ocupación de canchas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Analytics avanzado</h3>
              <p className="text-white/70 text-sm">Dashboard con métricas en tiempo real de tu negocio</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Comunidad de jugadores</h3>
              <p className="text-white/70 text-sm">Acceso a miles de jugadores buscando canchas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
