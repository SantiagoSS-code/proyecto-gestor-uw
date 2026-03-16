"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Course, CourseSession } from "@/lib/courses-types"
import { courseFillRate } from "@/lib/courses-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  GraduationCap, Users, TrendingUp, DollarSign, AlertCircle,
  Calendar, Star, ChevronRight, Plus, Target, Activity,
  BookOpen, Zap, AlertTriangle,
} from "lucide-react"

function statusBadge(s: string) {
  const map: Record<string, string> = {
    published:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    in_progress: "bg-violet-50 text-violet-700 border-violet-200",
    full:        "bg-blue-50 text-blue-700 border-blue-200",
    draft:       "bg-slate-50 text-slate-700 border-slate-200",
    completed:   "bg-slate-100 text-slate-500 border-slate-200",
    cancelled:   "bg-rose-50 text-rose-700 border-rose-200",
  }
  const labels: Record<string, string> = {
    published: "Publicado", in_progress: "En curso", full: "Completo",
    draft: "Borrador", completed: "Finalizado", cancelled: "Cancelado",
  }
  return (
    <Badge className={cn("text-xs border", map[s] ?? "bg-slate-50 text-slate-600 border-slate-200")}>
      {labels[s] ?? s}
    </Badge>
  )
}

function KpiCard({
  label, value, desc, icon: Icon, accent = false, loading = false,
}: {
  label: string; value: string; desc?: string; icon: React.ElementType; accent?: boolean; loading?: boolean
}) {
  return (
    <Card className={cn("border-none shadow-sm", accent ? "bg-gradient-to-br from-violet-50 to-violet-100/60" : "bg-card/70")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">{label}</CardTitle>
        <div className={cn("p-1.5 rounded-md", accent ? "bg-violet-200/50" : "bg-slate-100")}>
          <Icon className={cn("h-4 w-4", accent ? "text-violet-700" : "text-slate-500")} />
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="h-7 w-20 rounded bg-slate-200 animate-pulse" />
          : <p className={cn("text-2xl font-bold", accent ? "text-violet-700" : "text-slate-900")}>{value}</p>}
        {desc && <p className="text-xs text-slate-400 mt-1">{desc}</p>}
      </CardContent>
    </Card>
  )
}

export function CoursesOverview() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<CourseSession[]>([])
  const [loading, setLoading] = useState(true)

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
        const [fresh, legacy] = await Promise.all([
          load(FIRESTORE_COLLECTIONS.centers),
          load(FIRESTORE_COLLECTIONS.legacyCenters),
        ])
        const coursesData = fresh.length > 0 ? fresh : legacy
        setCourses(coursesData)

        // fetch upcoming sessions for active courses (up to 5)
        const active = coursesData.filter(c => c.status === "published" || c.status === "in_progress").slice(0, 5)
        const todayStr = new Date().toISOString().split("T")[0]
        const allSessions: CourseSession[] = []
        await Promise.all(active.map(async (c) => {
          try {
            const snap = await getDocs(
              query(
                collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", c.id, "sessions"),
                where("date", ">=", todayStr),
                orderBy("date", "asc"),
                limit(3),
              )
            )
            snap.docs.forEach(d => allSessions.push({ id: d.id, ...(d.data() as any), courseName: c.name } as CourseSession))
          } catch { /* sessions not yet created */ }
        }))
        allSessions.sort((a, b) => a.date > b.date ? 1 : -1)
        setSessions(allSessions.slice(0, 8))
      } finally { setLoading(false) }
    })()
  }, [resolvedId])

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const activeCourses = useMemo(() => courses.filter(c => c.status === "published" || c.status === "in_progress"), [courses])
  const totalEnrolled = useMemo(() => courses.reduce((s, c) => s + (c.enrolledCount || 0), 0), [courses])
  const totalCapacity = useMemo(() => courses.reduce((s, c) => s + (c.maximumCapacity || 0), 0), [courses])
  const occupancyRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0
  const totalRevenue = useMemo(() => courses.reduce((s, c) => s + (c.paidRevenue || 0), 0), [courses])
  const pendingRevenue = useMemo(() => courses.reduce((s, c) => s + (c.pendingRevenue || 0), 0), [courses])
  const bestSelling = useMemo(() => [...courses].filter(c => (c.enrolledCount || 0) > 0).sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0)).slice(0, 5), [courses])
  const startingSoon = useMemo(() => courses.filter(c => {
    if (c.status !== "published") return false
    const diff = (new Date(c.startDate).getTime() - today.getTime()) / 86400000
    return diff > 0 && diff <= 14
  }), [courses, today])
  const almostFull = useMemo(() => courses.filter(c => c.status === "published" && courseFillRate(c) >= 80 && courseFillRate(c) < 100), [courses])
  const lowEnrollment = useMemo(() => courses.filter(c => c.status === "published" && courseFillRate(c) < 30 && c.startDate >= todayStr), [courses, todayStr])

  if (!loading && courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 rounded-2xl bg-violet-100 mb-5">
          <GraduationCap className="h-12 w-12 text-violet-700" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Empezá con Cursos</h2>
        <p className="text-slate-500 mb-6 max-w-md">
          Creá tu primer programa, pack de clases o academia. Gestioná inscripciones, sesiones, pagos y asistencia desde un solo lugar.
        </p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/clubos/dashboard/cursos/create">
            <Plus className="h-5 w-5" />Crear primer curso
          </Link>
        </Button>
        <div className="mt-12 grid gap-4 sm:grid-cols-3 text-left max-w-2xl">
          {[
            { icon: BookOpen, title: "Programas estructurados", desc: "8, 10 y 12 semanas con calendario automático" },
            { icon: Users, title: "Gestión de inscripciones", desc: "Confirmaciones, lista de espera y pagos online" },
            { icon: Activity, title: "Control de asistencia", desc: "Registro por sesión y seguimiento por alumno" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-xl border bg-card/70">
              <div className="p-2 rounded-lg bg-violet-50 w-fit mb-3">
                <Icon className="h-4 w-4 text-violet-600" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">{title}</p>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Cursos activos" value={String(activeCourses.length)} desc="publicados o en curso" icon={GraduationCap} accent loading={loading} />
        <KpiCard label="Inscriptos" value={String(totalEnrolled)} desc="alumnos totales" icon={Users} loading={loading} />
        <KpiCard label="Ocupación" value={`${occupancyRate}%`} desc="promedio de llenado" icon={Target} loading={loading} />
        <KpiCard label="Ingresos cursos" value={formatCurrencyARS(totalRevenue)} desc="pagos confirmados" icon={DollarSign} loading={loading} />
        <KpiCard label="Por cobrar" value={formatCurrencyARS(pendingRevenue)} desc="pagos pendientes" icon={AlertCircle} loading={loading} />
        <KpiCard label="Próx. sesiones" value={String(sessions.length)} desc="en los próximos días" icon={Calendar} loading={loading} />
      </div>

      {/* Alerts */}
      {(startingSoon.length > 0 || almostFull.length > 0 || lowEnrollment.length > 0) && (
        <div className="space-y-2">
          {startingSoon.slice(0, 2).map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <Zap className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span><strong>{c.name}</strong> empieza el {new Date(c.startDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</span>
              <Link href="/clubos/dashboard/cursos/enrollments" className="ml-auto text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap">Ver inscripciones →</Link>
            </div>
          ))}
          {almostFull.slice(0, 1).map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span><strong>{c.name}</strong> está casi completo — {courseFillRate(c)}% ocupado</span>
              <Link href={`/clubos/dashboard/cursos/courses/${c.id}/edit`} className="ml-auto text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap">Ver curso →</Link>
            </div>
          ))}
          {lowEnrollment.slice(0, 1).map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span><strong>{c.name}</strong> tiene baja inscripción — solo {c.enrolledCount || 0} alumnos</span>
              <Link href={`/clubos/dashboard/cursos/courses/${c.id}/edit`} className="ml-auto text-xs font-semibold text-rose-700 hover:underline whitespace-nowrap">Revisar →</Link>
            </div>
          ))}
        </div>
      )}

      {/* Main widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming sessions */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Próximas sesiones</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-slate-500">
                <Link href="/clubos/dashboard/cursos/sessions">Ver todas <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 text-sm gap-2">
                <Calendar className="h-8 w-8 opacity-30" />
                <p>No hay sesiones programadas próximamente</p>
                <Button variant="outline" size="sm" asChild className="mt-2"><Link href="/clubos/dashboard/cursos/sessions">Gestionar sesiones</Link></Button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s, i) => {
                  const d = new Date(s.date + "T00:00:00")
                  const isToday = s.date === todayStr
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isToday ? "bg-violet-50 border border-violet-200" : "bg-muted/40 hover:bg-muted"
                    )}>
                      <div className={cn("flex flex-col items-center justify-center rounded-lg h-12 w-12 flex-shrink-0", isToday ? "bg-violet-100" : "bg-white border")}>
                        <span className={cn("text-lg font-bold leading-none", isToday ? "text-violet-700" : "text-slate-800")}>{d.getDate()}</span>
                        <span className={cn("text-[10px] font-medium uppercase", isToday ? "text-violet-500" : "text-slate-400")}>{d.toLocaleDateString("es-AR", { month: "short" })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{s.courseName}</p>
                        <p className="text-xs text-slate-500">{s.startTime}–{s.endTime}{s.coachName ? ` · ${s.coachName}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isToday && <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">Hoy</Badge>}
                        {statusBadge(s.status)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best selling */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Más vendidos</CardTitle>
              <Star className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}</div>
            ) : bestSelling.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Sin inscripciones aún
              </div>
            ) : (
              <div className="space-y-3">
                {bestSelling.map((c, i) => (
                  <Link key={c.id} href={`/clubos/dashboard/cursos/courses/${c.id}/edit`} className="flex items-center gap-2 group">
                    <span className="text-sm font-bold text-slate-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-violet-700 transition-colors">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${courseFillRate(c)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">{c.enrolledCount}/{c.maximumCapacity}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick nav grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/clubos/dashboard/cursos/courses", icon: GraduationCap, label: "Ver todos los cursos", sub: `${courses.length} curso${courses.length !== 1 ? "s" : ""}` },
          { href: "/clubos/dashboard/cursos/enrollments", icon: Users, label: "Inscripciones", sub: `${totalEnrolled} alumno${totalEnrolled !== 1 ? "s" : ""}` },
          { href: "/clubos/dashboard/cursos/payments", icon: DollarSign, label: "Pagos", sub: formatCurrencyARS(totalRevenue) },
          { href: "/clubos/dashboard/cursos/reports", icon: TrendingUp, label: "Reportes", sub: "Métricas del módulo" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card/70 hover:bg-card shadow-sm transition-all hover:-translate-y-0.5 group">
            <div className="p-2 rounded-lg bg-violet-50 group-hover:bg-violet-100 transition-colors">
              <item.icon className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-400">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
