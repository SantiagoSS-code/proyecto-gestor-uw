import { Button } from "@/components/ui/button"
import { Check, Sparkles } from "lucide-react"

export function AppPreviewSection() {
  const features = [
    "Recomendaciones de canchas con IA",
    "Matching instantáneo de jugadores",
    "Actualizaciones de disponibilidad en tiempo real",
    "División de pagos sin complicaciones",
    "Seguimiento de progreso e insights",
  ]

  return (
    <section className="py-24 md:py-32 bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Phone Mockup */}
          <div className="relative order-2 lg:order-1">
            <div className="relative mx-auto w-[280px]">
              {/* Glow effect */}
              <div className="absolute -inset-10 bg-primary/20 rounded-full blur-3xl" />
              {/* Phone frame */}
              <div className="relative bg-card rounded-[3rem] border border-border/50 p-3 shadow-2xl">
                <div className="w-full aspect-[9/19] bg-secondary/50 rounded-[2.5rem] overflow-hidden">
                  <img
                    src="/modern-sports-booking-app-dark-interface-ai.jpg"
                    alt="Vista previa de la app"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 order-1 lg:order-2">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">App Móvil</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight text-balance mb-6">
                Tu partido,
                <br />
                <span className="text-muted-foreground">en tu bolsillo.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Todo el poder de las reservas impulsadas por IA, donde sea que estés. Disponible en iOS y Android.
              </p>
            </div>

            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button className="bg-foreground text-background hover:bg-foreground/90 h-12 px-5 rounded-full">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </Button>
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-secondary h-12 px-5 rounded-full bg-transparent"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                Google Play
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
