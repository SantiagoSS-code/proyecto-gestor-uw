import { 
  Calendar, 
  BarChart3, 
  CreditCard, 
  Users, 
  Bell, 
  Smartphone,
  Clock,
  TrendingUp,
  Shield
} from "lucide-react"

const features = [
  {
    icon: Calendar,
    title: "Gestión de reservas",
    description: "Sistema completo para administrar todas tus canchas y horarios desde un solo lugar.",
  },
  {
    icon: BarChart3,
    title: "Analytics en tiempo real",
    description: "Dashboard con métricas de ocupación, ingresos y tendencias de tu negocio.",
  },
  {
    icon: CreditCard,
    title: "Pagos integrados",
    description: "Cobra online con múltiples medios de pago y gestiona facturación automática.",
  },
  {
    icon: Users,
    title: "Base de jugadores",
    description: "Accede a miles de jugadores activos buscando canchas en tu zona.",
  },
  {
    icon: Bell,
    title: "Notificaciones automáticas",
    description: "Recordatorios de reserva, confirmaciones y alertas para tus clientes.",
  },
  {
    icon: Smartphone,
    title: "App para tu club",
    description: "Tu club con presencia digital profesional y reservas desde el celular.",
  },
  {
    icon: Clock,
    title: "Reservas 24/7",
    description: "Tus clientes pueden reservar a cualquier hora sin necesidad de llamar.",
  },
  {
    icon: TrendingUp,
    title: "Optimización con IA",
    description: "Algoritmos que llenan horarios vacíos y maximizan la ocupación.",
  },
  {
    icon: Shield,
    title: "Soporte dedicado",
    description: "Equipo de soporte listo para ayudarte cuando lo necesites.",
  },
]

export function FeaturesB2BSection() {
  return (
    <section id="funciones" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Funcionalidades</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-6 text-balance">
            Todo lo que necesitás para gestionar tu club
          </h2>
          <p className="text-lg text-muted-foreground">
            Herramientas profesionales diseñadas para maximizar tus ingresos y simplificar la operación.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/30 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
