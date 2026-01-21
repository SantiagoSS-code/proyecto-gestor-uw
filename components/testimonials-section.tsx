import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Miguel Ángel R.",
    role: "Jugador de Padel",
    avatar: "man professional headshot smiling",
    quote: "Las recomendaciones de la IA son increíbles. Sabe exactamente cuándo quiero jugar antes que yo.",
    rating: 5,
  },
  {
    name: "Sara García",
    role: "Entusiasta del Tenis",
    avatar: "woman professional headshot smiling",
    quote:
      "Por fin, una app de reservas que realmente entiende la programación. Un cambio total para profesionales ocupados.",
    rating: 5,
  },
  {
    name: "Carlos Martínez",
    role: "Director de Club",
    avatar: "young man professional headshot",
    quote:
      "Nuestras reservas aumentaron un 40% desde que nos asociamos con Courtly. La IA llena los huecos automáticamente.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Testimonios</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight text-balance">
            Los jugadores lo aman.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card/50 rounded-2xl border border-border/30 p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-6">{`"${testimonial.quote}"`}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50">
                  <img
                    src={`/.jpg?height=40&width=40&query=${testimonial.avatar}`}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
