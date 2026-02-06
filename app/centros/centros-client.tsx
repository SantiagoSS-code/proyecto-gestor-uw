"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, query as firestoreQuery, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Building2 } from "lucide-react"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

interface Center {
  id: string
  name: string
  slug?: string
  address?: string
  city?: string
  country?: string
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((center) => (
              <Card key={center.id} className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">{center.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{center.address || "Dirección no disponible"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Building2 className="w-4 h-4" />
                    <span>
                      {center.city || "Ciudad"}, {center.country || "País"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/clubs/${center.slug || center.id}`} className="w-full">
                      <Button variant="outline" className="w-full text-black">
                        Ver canchas
                      </Button>
                    </Link>
                    <Link href={`/clubs/${center.slug || center.id}`} className="w-full">
                      <Button className="w-full">Reservar</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
