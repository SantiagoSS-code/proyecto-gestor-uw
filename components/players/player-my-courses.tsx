"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { Enrollment, Course, CourseSession } from "@/lib/courses-types"
import { ENROLLMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, fmtDuration, formatScheduleDays } from "@/lib/courses-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, Calendar, Check, ChevronRight, Clock, Loader2, Star } from "lucide-react"

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-50 text-slate-500 border-slate-200",
}

export function PlayerMyCourses() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<(Enrollment & { course?: Course; nextSession?: CourseSession })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      try {
        // Query enrollments by player email across all center collections
        // This is a simplified pattern — in production use a top-level user enrollments collection
        const today = new Date().toISOString().split("T")[0]
        const centersSnap = await getDocs(collection(db, "centers"))
        const allEnrollments: (Enrollment & { course?: Course; nextSession?: CourseSession })[] = []

        await Promise.all(centersSnap.docs.map(async centerDoc => {
          try {
            const enrSnap = await getDocs(query(
              collection(db, "centers", centerDoc.id, "enrollments"),
              where("playerEmail", "==", user.email),
            ))
            if (enrSnap.empty) return

            const centerEnrollments = enrSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment))

            await Promise.all(centerEnrollments.map(async enr => {
              let course: Course | undefined
              let nextSession: CourseSession | undefined
              try {
                const courseSnap = await getDocs(query(collection(db, "centers", centerDoc.id, "courses")))
                course = courseSnap.docs.find(d => d.id === enr.courseId) ? { id: enr.courseId, ...courseSnap.docs.find(d => d.id === enr.courseId)!.data() } as Course : undefined

                if (course) {
                  const sessSnap = await getDocs(collection(db, "centers", centerDoc.id, "courses", enr.courseId, "sessions"))
                  const upcoming = sessSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as CourseSession))
                    .filter(s => s.date >= today && s.status === "scheduled")
                    .sort((a, b) => a.date.localeCompare(b.date))
                  nextSession = upcoming[0]
                }
              } catch { /* skip */ }
              allEnrollments.push({ ...enr, course, nextSession })
            }))
          } catch { /* skip */ }
        }))

        allEnrollments.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
        setEnrollments(allEnrollments)
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="font-semibold text-slate-700">Iniciá sesión para ver tus cursos</h3>
      <Link href="/players/login">
        <Button className="mt-4 bg-violet-600 hover:bg-violet-700">Iniciar sesión</Button>
      </Link>
    </div>
  )

  const active = enrollments.filter(e => e.status === "confirmed" || e.status === "pending")
  const past = enrollments.filter(e => e.status === "completed" || e.status === "cancelled")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white p-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 opacity-80" />
          <span className="text-sm font-medium opacity-80">Mis cursos</span>
        </div>
        <h1 className="text-2xl font-bold">Tu academia</h1>
        <p className="mt-1 opacity-80">{active.length} programa{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""}</p>
      </div>

      {/* No enrollments */}
      {enrollments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Aún no te inscribiste en ningún curso</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Explorá los programas disponibles y comenzá tu academia.</p>
          <Link href="/players/cursos">
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
              <BookOpen className="h-4 w-4" />Ver cursos disponibles
            </Button>
          </Link>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-800">Activos</h2>
          {active.map(enr => {
            const attendanceRate = enr.sessionsTotal ? Math.round(((enr.sessionsAttended || 0) / enr.sessionsTotal) * 100) : null
            return (
              <div key={enr.id} className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{enr.course?.name || enr.courseName}</h3>
                      <Badge variant="outline" className={cn("text-xs", enr.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                        {ENROLLMENT_STATUS_LABELS[enr.status]}
                      </Badge>
                    </div>
                    {enr.course?.subtitle && <p className="text-sm text-slate-500 mt-0.5">{enr.course.subtitle}</p>}
                  </div>
                  <Badge variant="outline" className={cn("text-xs shrink-0", PAYMENT_STATUS_COLORS[enr.paymentStatus])}>
                    {PAYMENT_STATUS_LABELS[enr.paymentStatus]}
                  </Badge>
                </div>

                {/* Next session */}
                {enr.nextSession && (
                  <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex flex-col items-center justify-center text-center">
                      <span className="text-xs leading-none">{new Date(enr.nextSession.date + "T00:00:00").toLocaleDateString("es-AR", { month: "short" })}</span>
                      <span className="text-lg font-bold leading-none">{new Date(enr.nextSession.date + "T00:00:00").getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-violet-900">Próxima sesión</p>
                      <p className="text-xs text-violet-700">
                        {new Date(enr.nextSession.date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long" })} · {enr.nextSession.startTime}
                        {enr.nextSession.coachName && ` · ${enr.nextSession.coachName}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Clases asistidas", value: enr.sessionsAttended ?? "—" },
                    { label: "Asistencia", value: attendanceRate !== null ? `${attendanceRate}%` : "—" },
                    { label: "Saldo", value: enr.pendingAmount > 0 ? `$${enr.pendingAmount.toLocaleString("es-AR")}` : "✅ Al día" },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl bg-muted/50 p-2.5">
                      <p className="text-xs text-slate-400">{k.label}</p>
                      <p className="font-bold text-slate-900 mt-0.5">{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Course details snippet */}
                {enr.course && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {enr.course.scheduleDays?.length && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatScheduleDays(enr.course.scheduleDays)}</span>}
                    {enr.course.scheduleTime && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{enr.course.scheduleTime}</span>}
                    {enr.course.coachName && <span className="flex items-center gap-1">👨‍🏫 {enr.course.coachName}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-slate-500">Historial</h2>
          {past.map(enr => (
            <div key={enr.id} className="rounded-2xl border bg-card/60 p-4 flex items-center gap-3 opacity-70">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{enr.course?.name || enr.courseName}</p>
                <p className="text-xs text-slate-400">{new Date(enr.enrolledAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 shrink-0">
                {ENROLLMENT_STATUS_LABELS[enr.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Discover more */}
      <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/30 p-6 text-center">
        <Star className="h-8 w-8 text-violet-400 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-800">¿Buscás más programas?</h3>
        <p className="text-sm text-slate-500 mt-1 mb-3">Explorá nuevos cursos y seguí mejorando tu nivel.</p>
        <Link href="/players/cursos">
          <Button variant="outline" className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-100">
            Ver todos los cursos<ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
