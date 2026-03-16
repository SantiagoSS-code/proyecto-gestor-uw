"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Course } from "@/lib/courses-types"
import {
  COURSE_TYPE_LABELS, COURSE_LEVEL_LABELS, COURSE_STATUS_LABELS,
  courseFillRate, DAY_LABELS, formatScheduleDays, fmtDuration,
} from "@/lib/courses-types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  Plus, Search, MoreVertical, Pencil, Copy, Eye, EyeOff, Trash2,
  Users, Calendar, Clock, Star, GraduationCap, LayoutGrid, List,
  ArrowRight, CheckCircle2, XCircle, Filter,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  draft:       "bg-slate-50 text-slate-600 border-slate-200",
  published:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  full:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200",
  completed:   "bg-slate-100 text-slate-500 border-slate-200",
  cancelled:   "bg-rose-50 text-rose-700 border-rose-200",
}

const SPORT_ICONS: Record<string, string> = {
  "Pádel": "🎾", "Tenis": "🎾", "Squash": "🟡", "Fútbol": "⚽",
  "Pickleball": "🏓", "Básquet": "🏀", "Vóley": "🏐", "Natación": "🏊",
  "Multideporte": "🏟️",
}

function CourseCard({
  course, onPublish, onDuplicate, onDelete,
}: {
  course: Course
  onPublish: (c: Course) => void
  onDuplicate: (c: Course) => void
  onDelete: (c: Course) => void
}) {
  const fill = courseFillRate(course)
  const isPublished = course.status === "published" || course.status === "in_progress"
  const sportEmoji = SPORT_ICONS[course.sport] || "🏅"

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Cover / gradient */}
      <div className="relative h-28 bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 flex items-center justify-center">
        <span className="text-4xl opacity-70">{sportEmoji}</span>
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className={cn("text-xs border", STATUS_COLORS[course.status])}>
            {COURSE_STATUS_LABELS[course.status] ?? course.status}
          </Badge>
          {course.featured && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-0.5">
              <Star className="h-2.5 w-2.5" />Destacado
            </Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md bg-black/20 hover:bg-black/40 text-white transition-colors">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/clubos/dashboard/cursos/courses/${course.id}/edit`} className="gap-2">
                  <Pencil className="h-3.5 w-3.5" />Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(course)} className="gap-2">
                <Copy className="h-3.5 w-3.5" />Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/clubos/dashboard/cursos/enrollments?course=${course.id}`} className="gap-2">
                  <Users className="h-3.5 w-3.5" />Ver inscripciones
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onPublish(course)} className="gap-2">
                {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {isPublished ? "Despublicar" : "Publicar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(course)} className="gap-2 text-rose-600 focus:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{course.sport}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{COURSE_LEVEL_LABELS[course.level]}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{COURSE_TYPE_LABELS[course.type]}</Badge>
        </div>

        {/* Name */}
        <div>
          <h3 className="font-bold text-slate-900 leading-tight">{course.name}</h3>
          {course.subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{course.subtitle}</p>}
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-slate-500">
          {course.coachName && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400" />{course.coachName}
            </div>
          )}
          {course.startDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {new Date(course.startDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              {course.endDate && ` → ${new Date(course.endDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`}
            </div>
          )}
          {course.scheduleDays?.length && course.scheduleTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatScheduleDays(course.scheduleDays)} {course.scheduleTime}{course.scheduleEndTime ? `–${course.scheduleEndTime}` : ""}
            </div>
          )}
        </div>

        {/* Capacity */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />{course.enrolledCount || 0}/{course.maximumCapacity} cupos
            </span>
            <span className="text-xs font-medium text-slate-600">{fill}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", fill >= 90 ? "bg-rose-400" : fill >= 60 ? "bg-amber-400" : "bg-violet-400")}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div>
            <p className="font-bold text-slate-900">{formatCurrencyARS(course.priceTotal)}</p>
            {course.promotionalPrice && course.promotionalPrice < course.priceTotal && (
              <p className="text-xs text-slate-400 line-through">{formatCurrencyARS(course.priceTotal)}</p>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs h-8">
            <Link href={`/clubos/dashboard/cursos/courses/${course.id}/edit`}>
              <Pencil className="h-3 w-3" />Editar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseRow({
  course, onPublish, onDuplicate, onDelete,
}: {
  course: Course
  onPublish: (c: Course) => void
  onDuplicate: (c: Course) => void
  onDelete: (c: Course) => void
}) {
  const fill = courseFillRate(course)
  const isPublished = course.status === "published" || course.status === "in_progress"
  return (
    <tr className="border-b hover:bg-muted/40 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div>
          <p className="font-medium text-sm text-slate-900">{course.name}</p>
          <p className="text-xs text-slate-400">{course.sport} · {COURSE_LEVEL_LABELS[course.level]}</p>
        </div>
      </td>
      <td className="py-3 px-2 hidden md:table-cell">
        <Badge className={cn("text-xs border", STATUS_COLORS[course.status])}>
          {COURSE_STATUS_LABELS[course.status]}
        </Badge>
      </td>
      <td className="py-3 px-2 hidden lg:table-cell text-sm text-slate-500">{course.coachName || "—"}</td>
      <td className="py-3 px-2 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn("h-full rounded-full", fill >= 90 ? "bg-rose-400" : fill >= 60 ? "bg-amber-400" : "bg-violet-400")} style={{ width: `${fill}%` }} />
          </div>
          <span className="text-xs text-slate-500">{course.enrolledCount || 0}/{course.maximumCapacity}</span>
        </div>
      </td>
      <td className="py-3 px-2 text-sm font-semibold text-slate-900">{formatCurrencyARS(course.priceTotal)}</td>
      <td className="py-3 pl-2 pr-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded hover:bg-muted text-slate-500 hover:text-slate-800 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/clubos/dashboard/cursos/courses/${course.id}/edit`} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(course)} className="gap-2">
              <Copy className="h-3.5 w-3.5" />Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPublish(course)} className="gap-2">
              {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {isPublished ? "Despublicar" : "Publicar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(course)} className="gap-2 text-rose-600 focus:text-rose-600">
              <Trash2 className="h-3.5 w-3.5" />Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

export function CoursesList() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sportFilter, setSportFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (!resolvedId) return
    ;(async () => {
      setLoading(true)
      try {
        const load = async (root: string) => {
          try {
            const snap = await getDocs(collection(db, root, resolvedId, "courses"))
            return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Course[]
          } catch { return [] as Course[] }
        }
        const [f, l] = await Promise.all([load(FIRESTORE_COLLECTIONS.centers), load(FIRESTORE_COLLECTIONS.legacyCenters)])
        setCourses(f.length > 0 ? f : l)
      } finally { setLoading(false) }
    })()
  }, [resolvedId])

  const sports = useMemo(() => Array.from(new Set(courses.map(c => c.sport))).sort(), [courses])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return courses.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (sportFilter !== "all" && c.sport !== sportFilter) return false
      if (levelFilter !== "all" && c.level !== levelFilter) return false
      if (term && !c.name.toLowerCase().includes(term) && !c.subtitle?.toLowerCase().includes(term)) return false
      return true
    }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
  }, [courses, search, statusFilter, sportFilter, levelFilter])

  const handlePublish = async (c: Course) => {
    if (!resolvedId) return
    const newStatus = (c.status === "published" || c.status === "in_progress") ? "draft" : "published"
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", c.id), {
        status: newStatus, updatedAt: new Date().toISOString(),
      })
      setCourses(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x))
    } catch (e) { console.error(e) }
  }

  const handleDuplicate = async (c: Course) => {
    if (!resolvedId) return
    const { id, createdAt, updatedAt, publishedAt, ...rest } = c
    const now = new Date().toISOString()
    try {
      const newDoc = await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses"), {
        ...rest,
        name: `${c.name} (copia)`,
        status: "draft",
        enrolledCount: 0,
        waitlistCount: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        createdAt: now,
        updatedAt: now,
      })
      setCourses(prev => [...prev, { ...rest, id: newDoc.id, name: `${c.name} (copia)`, status: "draft", enrolledCount: 0, createdAt: now, updatedAt: now }])
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (c: Course) => {
    if (!resolvedId || !confirm(`¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", c.id))
      setCourses(prev => prev.filter(x => x.id !== c.id))
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cursos…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(COURSE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Deporte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los deportes</SelectItem>
            {sports.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {Object.entries(COURSE_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden h-9">
          <button onClick={() => setView("grid")} className={cn("px-3 py-2 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} className={cn("px-3 py-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button asChild size="sm" className="gap-1.5 h-9 ml-auto">
          <Link href="/clubos/dashboard/cursos/create"><Plus className="h-4 w-4" />Nuevo curso</Link>
        </Button>
      </div>

      {/* Results summary */}
      <p className="text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? "curso" : "cursos"}</p>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400 gap-3">
          <GraduationCap className="h-10 w-10 opacity-30" />
          <p className="text-sm">{courses.length === 0 ? "No hay cursos aún" : "No hay cursos que coincidan con los filtros"}</p>
          {courses.length === 0 && (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/clubos/dashboard/cursos/create"><Plus className="h-4 w-4 mr-1.5" />Crear primer curso</Link>
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <CourseCard key={c.id} course={c} onPublish={handlePublish} onDuplicate={handleDuplicate} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="py-2.5 pl-4 pr-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Curso</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Estado</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Coach</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Capacidad</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="py-2.5 pr-4 pl-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <CourseRow key={c.id} course={c} onPublish={handlePublish} onDuplicate={handleDuplicate} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
