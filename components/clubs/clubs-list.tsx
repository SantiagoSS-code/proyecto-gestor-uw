"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

type ClubCard = {
  id: string
  slug?: string
  name: string
  address?: string
  city?: string
  country?: string
  coverImageUrl?: string | null
  galleryImageUrls?: string[]
  featuredRank?: number | null
  topSearchedRank?: number | null
}

function sortClubs(a: ClubCard, b: ClubCard) {
  const ar = a.featuredRank ?? a.topSearchedRank
  const br = b.featuredRank ?? b.topSearchedRank
  if (typeof ar === "number" && typeof br === "number") return ar - br
  if (typeof ar === "number") return -1
  if (typeof br === "number") return 1
  return a.name.localeCompare(b.name)
}

function getCover(club: ClubCard) {
  return club.coverImageUrl || club.galleryImageUrls?.[0] || null
}

export function ClubsList() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [clubs, setClubs] = useState<ClubCard[]>([])
  const [loading, setLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, FIRESTORE_COLLECTIONS.centers), where("published", "==", true))
        const snap = await getDocs(q)
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ClubCard[]
        setClubs(data.sort(sortClubs))
      } catch (e) {
        console.error("Failed to load clubs:", e)
        setClubs([])
      } finally {
        setLoading(false)
        setTimeout(() => checkScroll(), 0)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = 360
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" })
    setTimeout(checkScroll, 250)
  }

  const dots = useMemo(() => {
    const el = scrollRef.current
    if (!el) return { active: 0, count: 1 }
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth))
    const active = Math.round(el.scrollLeft / el.clientWidth)
    return { active: Math.max(0, Math.min(active, pages - 1)), count: pages }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs.length, canScrollLeft, canScrollRight])

  return (
    <section className="pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight">
              Top searched clubs worldwide
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover centers and book your next match.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-11 h-11 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-11 h-11 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading clubs…</div>
        ) : clubs.length === 0 ? (
          <Card className="border border-border/50 p-8 text-center text-muted-foreground">
            No published clubs yet.
          </Card>
        ) : (
          <div>
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {clubs.map((club) => {
                const cover = getCover(club)
                const href = club.slug ? `/clubs/${club.slug}` : null

                const card = (
                  <div
                    className="group relative bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-300 flex-shrink-0 w-[320px] snap-start"
                  >
                    <div className="relative h-52 overflow-hidden bg-muted">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={club.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-1">{club.name}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">
                          {club.address ? club.address : [club.city, club.country].filter(Boolean).join(", ")}
                        </span>
                      </div>

                      <div className="mt-6">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-8 py-2 text-sm font-medium ${
                            href
                              ? "bg-blue-600 text-white group-hover:bg-blue-700"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          Reservar
                        </span>
                      </div>
                    </div>
                  </div>
                )

                return href ? (
                  <Link
                    key={club.id}
                    href={href}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 rounded-2xl"
                    aria-label={`Ir al club ${club.name}`}
                  >
                    {card}
                  </Link>
                ) : (
                  <div key={club.id}>
                    {card}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-3 mt-8">
              {Array.from({ length: dots.count }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${i === dots.active ? "bg-blue-600" : "bg-slate-200"}`}
                />
              ))}
            </div>

            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground">Admins: publish your club in the dashboard to appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
