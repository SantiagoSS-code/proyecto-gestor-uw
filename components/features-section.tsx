import { Calendar, Users, MapPin, Trophy, Zap, Shield } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: "Reserva con un tap",
      description: "Reserva canchas con un solo toque. La IA pre-llena tus preferencias.",
    },
    {
      icon: Users,
      title: "Matchmaking inteligente",
      description: "Encuentra jugadores que coincidan con tu nivel y horario.",
    },
    {
      icon: MapPin,
      title: "10,000+ centros",
      description: "Accede a la red más grande de instalaciones deportivas del mundo.",
    },
    {
      icon: Trophy,
      title: "Seguimiento de progreso",
      description: "La IA rastrea tu mejora y sugiere nuevos desafíos.",
    },
    {
      icon: Zap,
      title: "Confirmación instantánea",
      description: "Sin esperas. Reservas confirmadas en milisegundos.",
    },
    {
      icon: Shield,
      title: "Seguro y sencillo",
      description: "Pagos divididos, reembolsos y reprogramaciones fáciles.",
    },
  ]

  return (
    <section id="funciones" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Funciones</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight text-balance">
            Todo. Simplificado.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card/50 border border-border/30 hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
