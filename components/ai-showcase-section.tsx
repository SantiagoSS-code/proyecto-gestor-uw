import { Brain, Zap, Users, Clock } from "lucide-react"

export function AiShowcaseSection() {
  return (
    <section id="inteligencia" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Inteligencia</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight text-balance mb-6">
            IA que juega
            <br />
            <span className="text-muted-foreground">como tú.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Nuestra IA aprende tus preferencias, anticipa tu agenda, y te conecta con el match perfecto.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Smart Scheduling */}
          <div className="group relative bg-card rounded-3xl border border-border/50 p-8 md:p-10 hover:border-primary/30 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Agenda Inteligente</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                La IA analiza tu calendario, historial de juego y preferencias para sugerir horarios óptimos de reserva.
                Sin conflictos.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Aprendiendo tus patrones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instant Matching */}
          <div className="group relative bg-card rounded-3xl border border-border/50 p-8 md:p-10 hover:border-primary/30 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Matching Predictivo</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Encuentra jugadores de tu nivel al instante. Nuestra IA predice compatibilidad basándose en estilo de
                juego, disponibilidad y ubicación.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>98% de precisión de match</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Pricing */}
          <div className="group relative bg-card rounded-3xl border border-border/50 p-8 md:p-10 hover:border-primary/30 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Disponibilidad en Tiempo Real</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Ve la disponibilidad de canchas en vivo en miles de centros. Reserva en segundos, no minutos. La IA
                llena cancelaciones al instante.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Reserva en milisegundos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personalized Experience */}
          <div className="group relative bg-card rounded-3xl border border-border/50 p-8 md:p-10 hover:border-primary/30 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Recordatorios Adaptativos</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Nunca pierdas un partido. Notificaciones inteligentes que se adaptan a tu rutina y envían recordatorios
                cuando realmente los necesitas.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Alertas contextuales</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
