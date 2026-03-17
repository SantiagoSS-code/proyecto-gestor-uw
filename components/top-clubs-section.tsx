"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star, MapPin, ArrowUpRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { collection, getDocs, query as firestoreQuery, where, collectionGroup } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

interface ClubCard {
  id: string
  name: string
  slug?: string
  city?: string
  country?: string
  rating?: number
  coverImageUrl?: string | null
  courtCount: number
}

const PLACEHOLDER_IMG =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/padel%20miami%201-fqWCHAANFkQcNoia342QEwMYzigvRw.webp"

export function TopClubsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [clubs, setClubs] = useState<ClubCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const centersRef = collection(db, FIRESTORE_COLLECTIONS.centers)
        const q = firestoreQuery(centersRef, where("published", "==", true))
        const snapshot = await getDocs(q)

        // Fetch court counts in parallel
        const results = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data()
            let courtCount = 0
            try {
              const courtsRef = collection(db, FIRESTORE_COLLECTIONS.centers, docSnap.id, "courts")
              const courtsSnap = await getDocs(courtsRef)
              courtCount = courtsSnap.size
            } catch {}
            return {
              id: docSnap.id,
              name: data.name || "Centro deportivo",
              slug: data.slug,
              city: data.city || data.location?.city?.label,
              country: data.country || data.location?.country?.label,
              rating: data.rating ?? null,
              coverImageUrl: data.coverImageUrl || data.galleryImageUrls?.[0] || null,
              courtCount,
            } as ClubCard
          })
        )

        setClubs(results)
      } catch (error) {
        console.error("Error fetching clubs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClubs()
  }, [])

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

  function getLocation(club: ClubCard) {
    const parts = [club.city, club.country].filter(Boolean)
    return parts.join(", ") || "—"
  }

  function getDetailHref(club: ClubCard) {
    return `/centros/${club.slug || club.id}`
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
          {clubs.length > 0 && (
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
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-5 pb-4 -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/30 overflow-hidden flex-shrink-0 w-[300px] md:w-[320px] animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-px bg-border/30 mt-4" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel Container */}
        {!loading && clubs.length > 0 && (
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {clubs.map((club) => (
              <div
                key={club.id}
                className="group relative bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-300 flex-shrink-0 w-[300px] md:w-[320px] snap-start"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={club.coverImageUrl || PLACEHOLDER_IMG}
                    alt={club.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  {club.rating != null && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-medium text-foreground">{club.rating}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{club.name}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-sm">{getLocation(club)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <span className="text-sm text-muted-foreground">
                      {club.courtCount} {club.courtCount === 1 ? "cancha" : "canchas"}
                    </span>
                    <Link
                      href={getDetailHref(club)}
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                    >
                      Reservar <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && clubs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay centros publicados aún.</p>
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/centros">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary hover:text-foreground rounded-full px-6 bg-transparent"
            >
              Explorar todos los centros
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
