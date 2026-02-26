"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, query as firestoreQuery, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

interface Center {
  id: string
  name: string
  slug?: string
  address?: string
  city?: string
  country?: string
  coverImageUrl?: string | null
  galleryImageUrls?: string[]
}

function getCover(center: Center) {
  return center.coverImageUrl || center.galleryImageUrls?.[0] || null
}

export default function CentersClient() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("query") || "")
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersRef = collection(db, FIRESTORE_COLLECTIONS.centers)
        const q = firestoreQuery(centersRef, where("published", "==", true))
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Center, "id">) }))
        setCenters(data)
      } catch (error) {
        console.error("Error loading centers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCenters()
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return centers
    return centers.filter((center) => {
      const haystack = `${center.name} ${center.address || ""} ${center.city || ""} ${center.country || ""}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [centers, query])

  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Buscar centros</h1>
          <p className="text-muted-foreground mt-2">Encuentra un centro y reserva tu cancha.</p>
        </div>

        <div className="mb-8">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, ciudad o país"
            className="max-w-lg"
          />
        </div>

        {loading ? (
          <div className="text-muted-foreground">Cargando centros...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No se encontraron centros.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((center) => (
              <Link
                key={center.id}
                href={`/clubs/${center.slug || center.id}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 rounded-2xl"
                aria-label={`Ir al club ${center.name}`}
              >
                <Card className="group relative bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {getCover(center) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getCover(center) as string}
                        alt={center.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{center.name}</h3>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span className="text-xs leading-relaxed">
                        {center.address || [center.city, center.country].filter(Boolean).join(", ") || "Dirección no disponible"}
                      </span>
                    </div>

                    <div className="mt-5 flex justify-center">
                      <span className="inline-flex items-center justify-center rounded-full px-8 py-2 text-sm font-medium bg-blue-600 text-white group-hover:bg-blue-700">
                        Reservar
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
