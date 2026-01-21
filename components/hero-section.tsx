"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, Clock, Search, Sparkles } from "lucide-react"

const backgroundImages = [
  "/images/padel-gestor.jpg",
  "/images/futbol-gestor.jpg",
]

export function HeroSection() {
  const [location, setLocation] = useState("")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length)
    }, 5000) // Change image every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-[100svh] md:min-h-[85vh] flex flex-col pt-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src || "/placeholder.svg"}
              alt={`Sports background ${index + 1}`}
              className="w-full h-full object-cover object-center md:object-center"
              style={{
                objectPosition: index === 0 ? "70% center" : "50% 60%",
              }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background md:from-background/80 md:via-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="inline-flex items-center gap-2 bg-secondary/90 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-6 md:mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Impulsado por IA</span>
        </div>

        <div className="text-center max-w-5xl mx-auto mb-8 md:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground leading-[1] md:leading-[0.95] tracking-tight">
            La nueva generacion
            <br />
            <span className="text-primary">de reservas.</span>
          </h1>
        </div>

        <div className="w-full max-w-3xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-2 shadow-2xl shadow-black/20">
            <div className="flex flex-col md:flex-row gap-2">
              {/* Location Field */}
              <div className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <input
                    type="text"
                    placeholder="¿Dónde quieres jugar?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 cursor-pointer group hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-muted-foreground text-sm">¿Cuándo?</span>
                </div>
              </div>

              {/* Time Field */}
              <div className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 cursor-pointer group hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-muted-foreground text-sm">¿A qué hora?</span>
                </div>
              </div>

              {/* Search Button */}
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 rounded-xl flex items-center gap-2">
                <Search className="w-5 h-5" />
                <span className="font-medium">Buscar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-16 mt-10 md:mt-16">
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">4M+</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Jugadores</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">10K+</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Centros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">98%</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Precision</p>
          </div>
        </div>
      </div>
    </section>
  )
}
