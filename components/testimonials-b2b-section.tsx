import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Carlos Martínez",
    role: "Director de Club Padel Norte",
    quote: "Nuestras reservas aumentaron un 40% desde que usamos Courtly. La IA llena los horarios vacíos automáticamente y los pagos son instantáneos.",
    rating: 5,
    metric: "+40% reservas",
  },
  {
    name: "María Fernández",
    role: "Gerente de Complejo Deportivo Sur",
    quote: "Antes pasábamos horas gestionando reservas por teléfono. Ahora todo es automático y tenemos más tiempo para lo que importa: nuestros clientes.",
    rating: 5,
    metric: "-80% tiempo admin",
  },
  {
    name: "Roberto Sánchez",
    role: "Dueño de Fútbol 5 Central",
    quote: "El dashboard de analytics me permite tomar decisiones basadas en datos reales. Sé exactamente cuáles son mis horarios más rentables.",
    rating: 5,
    metric: "+25% ingresos",
  },
  {
    name: "Ana López",
    role: "Administradora de Tennis Club",
    quote: "La integración de pagos es excelente. Ya no perseguimos a nadie por cobros, todo queda registrado y automatizado.",
    rating: 5,
    metric: "100% cobros online",
  },
  {
    name: "Diego Rodríguez",
    role: "Propietario Padel Arena",
    quote: "El soporte es increíble. Cualquier duda la resuelven en minutos. Se nota que entienden el negocio deportivo.",
    rating: 5,
    metric: "Soporte 24/7",
  },
  {
    name: "Laura García",
    role: "Directora de MultiDeportes",
    quote: "Manejamos 3 sedes con Courtly sin problemas. La gestión multi-local es perfecta y tenemos visibilidad de todo desde un solo lugar.",
    rating: 5,
    metric: "3 sedes conectadas",
  },
]

export function TestimonialsB2BSection() {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Testimonios</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-6 text-balance">
            Clubes que ya confían en Courtly
          </h2>
          <p className="text-lg text-muted-foreground">
            Más de 500 clubes deportivos ya transformaron su gestión con nuestra plataforma.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border border-border/30 p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              
              <p className="text-foreground text-sm leading-relaxed mb-6">{`"${testimonial.quote}"`}</p>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
                <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                  {testimonial.metric}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
