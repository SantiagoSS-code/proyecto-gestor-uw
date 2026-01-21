"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star, MapPin, ArrowUpRight } from "lucide-react"
import { useState, useRef } from "react"

const clubs = [
  {
    name: "Padel X Miami",
    location: "Miami, FL",
    rating: 4.9,
    courts: 8,
  },
  {
    name: "Paris Padel Club",
    location: "Paris, Francia",
    rating: 4.8,
    courts: 6,
  },
  {
    name: "PDL Zurich",
    location: "Zurich, Suiza",
    rating: 4.9,
    courts: 10,
  },
  {
    name: "Club Tennis Barcelona",
    location: "Barcelona, Espana",
    rating: 4.7,
    courts: 12,
  },
  {
    name: "Padel Indoor Madrid",
    location: "Madrid, Espana",
    rating: 4.8,
    courts: 8,
  },
  {
    name: "Centro Deportivo Roma",
    location: "Roma, Italia",
    rating: 4.6,
    courts: 6,
  },
  {
    name: "Amsterdam Sports Hub",
    location: "Amsterdam, Holanda",
    rating: 4.9,
    courts: 14,
  },
  {
    name: "London Padel Center",
    location: "Londres, UK",
    rating: 4.7,
    courts: 10,
  },
]

export function TopClubsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <section id="clubes" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">Centros</p>
            <h2 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight">
              Clubes de primer nivel
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-11 h-11 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-11 h-11 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {clubs.map((club, index) => (
            <div
              key={index}
              className="group relative bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-300 flex-shrink-0 w-[300px] md:w-[320px] snap-start"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/padel%20miami%201-fqWCHAANFkQcNoia342QEwMYzigvRw.webp"
                  alt={club.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="text-sm font-medium text-foreground">{club.rating}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-foreground mb-1">{club.name}</h3>
                <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-sm">{club.location}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <span className="text-sm text-muted-foreground">{club.courts} canchas</span>
                  <button className="flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
                    Reservar <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-secondary hover:text-foreground rounded-full px-6 bg-transparent"
          >
            Explorar todos los centros
          </Button>
        </div>
      </div>
    </section>
  )
}
