"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn, formatCurrencyARS } from "@/lib/utils"
import type { Course, Enrollment, AttendanceRecord, CourseSession } from "@/lib/courses-types"
import { courseFillRate } from "@/lib/courses-types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Loader2, TrendingUp } from "lucide-react"

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#6366f1"]

export function CoursesReports() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [sessions, setSessions] = useState<CourseSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resolvedId) return
    ;(async () => {
      setLoading(true)
      try {
        const root = FIRESTORE_COLLECTIONS.centers
        const [courseSnap, enrollSnap, attSnap] = await Promise.all([
          getDocs(collection(db, root, resolvedId, "courses")),
          getDocs(collection(db, root, resolvedId, "enrollments")),
          getDocs(collection(db, root, resolvedId, "attendance")),
        ])
        const coursesData = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course))
        setCourses(coursesData)
        setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)))
        setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))

        const allSessions: CourseSession[] = []
        await Promise.all(coursesData.map(async c => {
          const sSnap = await getDocs(collection(db, root, resolvedId, "courses", c.id, "sessions"))
          sSnap.docs.forEach(s => allSessions.push({ id: s.id, ...s.data() } as CourseSession))
        }))
        setSessions(allSessions)
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [resolvedId])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  // ── KPIs ──
  const activeCourses = courses.filter(c => c.status === "published" || c.status === "in_progress").length
  const totalEnrolled = enrollments.filter(e => e.status === "confirmed").length
  const totalRevenue = enrollments.filter(e => e.paymentStatus === "paid").reduce((s, e) => s + (e.paidAmount || 0), 0)
  const avgFillRate = courses.length ? Math.round(courses.reduce((s, c) => s + courseFillRate(c), 0) / courses.length) : 0
  const presentCount = attendance.filter(a => a.status === "present").length
  const avgAttendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0

  // ── Chart data ──
  // Enrollments per course
  const enrollmentsByCourse = courses.map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    inscriptos: enrollments.filter(e => e.courseId === c.id && e.status === "confirmed").length,
    capacidad: c.maximumCapacity,
  })).filter(d => d.inscriptos > 0).sort((a, b) => b.inscriptos - a.inscriptos).slice(0, 8)

  // Revenue per course
  const revenueByCourse = courses.map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    recaudado: enrollments.filter(e => e.courseId === c.id && e.paymentStatus === "paid").reduce((s, e) => s + (e.paidAmount || 0), 0),
  })).filter(d => d.recaudado > 0).sort((a, b) => b.recaudado - a.recaudado).slice(0, 8)

  // Enrollment status distribution
  const statusDist = [
    { name: "Confirmados", value: enrollments.filter(e => e.status === "confirmed").length },
    { name: "Pendientes", value: enrollments.filter(e => e.status === "pending").length },
    { name: "Lista espera", value: enrollments.filter(e => e.status === "waitlist").length },
    { name: "Cancelados", value: enrollments.filter(e => e.status === "cancelled").length },
  ].filter(d => d.value > 0)

  // Attendance by course
  const attendanceByCourse = courses.map(c => {
    const courseAtt = attendance.filter(a => a.courseId === c.id)
    const present = courseAtt.filter(a => a.status === "present").length
    const total = courseAtt.length
    return {
      name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
      tasa: total > 0 ? Math.round((present / total) * 100) : 0,
      total,
    }
  }).filter(d => d.total > 0).sort((a, b) => b.tasa - a.tasa).slice(0, 8)

  // Sessions per month
  const sessionsByMonth: Record<string, number> = {}
  sessions.forEach(s => {
    if (!s.date) return
    const month = s.date.slice(0, 7)
    sessionsByMonth[month] = (sessionsByMonth[month] || 0) + 1
  })
  const sessionsChart = Object.entries(sessionsByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([k, v]) => ({
    mes: k.slice(5) + "/" + k.slice(2, 4),
    sesiones: v,
  }))

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-500">Estadísticas generales del módulo de cursos</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Cursos activos", value: activeCourses, color: "text-violet-700" },
          { label: "Total inscriptos", value: totalEnrolled, color: "text-slate-900" },
          { label: "Ocupación promedio", value: `${avgFillRate}%`, color: avgFillRate >= 70 ? "text-emerald-700" : "text-amber-700" },
          { label: "Tasa asistencia", value: `${avgAttendanceRate}%`, color: avgAttendanceRate >= 80 ? "text-emerald-700" : "text-amber-700" },
          { label: "Recaudado", value: formatCurrencyARS(totalRevenue), color: "text-emerald-700" },
        ].map(k => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn("text-2xl font-bold mt-1", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollments per course */}
        {enrollmentsByCourse.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Inscriptos por curso</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={enrollmentsByCourse} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [v, "Inscriptos"]} />
                <Bar dataKey="inscriptos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacidad" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2 text-center">Violeta = inscriptos · Gris = capacidad máx.</p>
          </div>
        )}

        {/* Revenue per course */}
        {revenueByCourse.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Recaudación por curso</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByCourse} margin={{ left: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrencyARS(v), "Recaudado"]} />
                <Bar dataKey="recaudado" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Enrollment status pie */}
        {statusDist.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Estado de inscripciones</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attendance rate by course */}
        {attendanceByCourse.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Tasa de asistencia por curso</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceByCourse} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                <Bar dataKey="tasa" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sessions per month */}
        {sessionsChart.length > 0 && (
          <div className="bg-card border rounded-2xl p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-900 mb-4">Sesiones por mes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionsChart}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [v, "Sesiones"]} />
                <Bar dataKey="sesiones" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Sin datos aún</h3>
          <p className="text-sm text-slate-400 mt-1">Los reportes aparecerán una vez que tengas cursos e inscripciones.</p>
        </div>
      )}
    </div>
  )
}
