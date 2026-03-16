"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Course } from "@/lib/courses-types"
import { COURSE_LEVEL_LABELS, COURSE_TYPE_LABELS, courseFillRate, fmtDuration, formatScheduleDays } from "@/lib/courses-types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Calendar, Clock, Loader2, MapPin, Search, Users } from "lucide-react"

const SPORT_EMOJIS: Record<string, string> = {
  "Pádel": "🎾", "Tenis": "🎾", "Squash": "🟩", "Fútbol": "⚽",
  "Pickleball": "🏓", "Básquet": "🏀", "Vóley": "🏐", "Natación": "🏊", "Multideporte": "⭐",
}

const GRADIENT_BG = [
  "from-violet-500 to-purple-700",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-violet-700",
]

interface PlayerCoursesDiscoveryProps {
  centerId?: string
}

export function PlayerCoursesDiscovery({ centerId }: PlayerCoursesDiscoveryProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterSport, setFilterSport] = useState("all")
  const [filterLevel, setFilterLevel] = useState("all")

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        // If centerId provided, fetch from that center; otherwise fetch across public courses
        // For now, fetch from all centers with public courses (simplified pattern)
        if (centerId) {
          const snap = await getDocs(query(
            collection(db, "centers", centerId, "courses"),
            where("status", "in", ["published", "in_progress"]),
            where("visibility", "==", "public")
          ))
          setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)))
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [centerId])

  const sports = [...new Set(courses.map(c => c.sport))].filter(Boolean)

  const filtered = courses.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name.toLowerCase().includes(q) && !c.sport.toLowerCase().includes(q) && !c.coachName?.toLowerCase().includes(q)) return false
    if (filterSport !== "all" && c.sport !== filterSport) return false
    if (filterLevel !== "all" && c.level !== filterLevel) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white p-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 opacity-80" />
          <span className="text-sm font-medium opacity-80">Academia</span>
        </div>
        <h1 className="text-2xl font-bold">Cursos & Programas</h1>
        <p className="mt-1 opacity-80">Encontrá el programa ideal para mejorar tu nivel</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cursos…" className="pl-9 h-10" />
        </div>
        {sports.length > 1 && (
          <Select value={filterSport} onValueChange={setFilterSport}>
            <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Deporte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sports.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {Object.entries(COURSE_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">No hay cursos disponibles</h3>
          <p className="text-sm text-slate-400 mt-1">Volvé pronto para ver los programas disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course, i) => {
            const fill = courseFillRate(course)
            const isFull = fill >= 100
            const baseHref = centerId ? `/players/cursos/${course.id}?center=${centerId}` : `/players/cursos/${course.id}`
            return (
              <Link key={course.id} href={baseHref} className="group block">
                <div className="rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                  {/* Cover */}
                  <div className={cn("h-36 relative flex items-center justify-center", course.coverImage ? "" : `bg-gradient-to-br ${GRADIENT_BG[i % GRADIENT_BG.length]}`)}>
                    {course.coverImage ? (
                      <img src={course.coverImage} alt={course.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-5xl">{SPORT_EMOJIS[course.sport] || "🏅"}</span>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      {course.featured && <Badge className="text-[10px] bg-amber-400 text-amber-900 border-0">⭐ Destacado</Badge>}
                      {course.tags?.slice(0, 1).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                    {isFull && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge className="bg-red-500 text-white border-0">Completo</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-2">{course.name}</h3>
                      </div>
                      {course.subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{course.subtitle}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{COURSE_LEVEL_LABELS[course.level]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{COURSE_TYPE_LABELS[course.type]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{course.sport}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500">
                      {course.scheduleTime && course.scheduleDays?.length && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatScheduleDays(course.scheduleDays)} · {course.scheduleTime}</span>
                        </div>
                      )}
                      {course.sessionDurationMinutes && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{course.totalSessions} sesiones de {fmtDuration(course.sessionDurationMinutes)}</span>
                        </div>
                      )}
                      {course.coachName && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>Coach: {course.coachName}</span>
                        </div>
                      )}
                    </div>
                    {/* Capacity bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{course.enrolledCount || 0}/{course.maximumCapacity} lugares</span>
                        <span>{fill}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${fill}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <p className="font-bold text-lg text-violet-700">
                        ${course.priceTotal.toLocaleString("es-AR")}
                        {course.currency !== "ARS" && <span className="text-xs font-normal text-slate-400 ml-1">{course.currency}</span>}
                      </p>
                      <Button size="sm" variant={isFull ? "outline" : "default"} className={cn("text-xs", !isFull && "bg-violet-600 hover:bg-violet-700")}>
                        {isFull ? "Lista espera" : "Ver más"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
