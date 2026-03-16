"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { Course, Enrollment } from "@/lib/courses-types"
import { COURSE_LEVEL_LABELS, COURSE_TYPE_LABELS, courseFillRate, fmtDuration, formatScheduleDays } from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft, BookOpen, Calendar, Check, Clock, Loader2, MapPin, Shield, Star, Users, X,
} from "lucide-react"
import Link from "next/link"

interface PlayerCourseDetailProps {
  courseId: string
}

export function PlayerCourseDetail({ courseId }: PlayerCourseDetailProps) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const centerId = searchParams.get("center") || ""
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrolled, setEnrolled] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [playerName, setPlayerName] = useState(user?.displayName || "")
  const [playerEmail, setPlayerEmail] = useState(user?.email || "")

  useEffect(() => {
    if (!centerId || !courseId) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, "centers", centerId, "courses", courseId))
        if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as Course)

        // Check if already enrolled
        if (user?.email) {
          const enrSnap = await getDocs(query(
            collection(db, "centers", centerId, "enrollments"),
            where("courseId", "==", courseId),
            where("playerEmail", "==", user.email),
          ))
          if (!enrSnap.empty) setEnrolled(true)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [centerId, courseId, user])

  const handleEnroll = async () => {
    if (!course || !centerId || !playerName.trim()) return
    setEnrolling(true)
    try {
      const now = new Date().toISOString()
      const enrollment: Omit<Enrollment, "id"> = {
        courseId: course.id,
        courseName: course.name,
        centerId,
        playerId: user?.uid,
        playerName: playerName.trim(),
        playerEmail: playerEmail.trim() || undefined,
        status: course.requireApproval ? "pending" : "confirmed",
        paymentStatus: "pending",
        paidAmount: 0,
        pendingAmount: course.priceTotal,
        totalPrice: course.priceTotal,
        enrolledAt: now,
        confirmedAt: !course.requireApproval ? now : undefined,
      }
      await addDoc(collection(db, "centers", centerId, "enrollments"), enrollment as any)
      setEnrolled(true)
      setShowConfirm(false)
    } catch (e) { console.error(e) } finally { setEnrolling(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  if (!course) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="font-semibold text-slate-700">Curso no encontrado</h3>
      <Link href="/players/cursos"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" />Volver</Button></Link>
    </div>
  )

  const fill = courseFillRate(course)
  const isFull = fill >= 100 && !course.waitlistEnabled

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/players/cursos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors">
        <ArrowLeft className="h-4 w-4" />Todos los cursos
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
        <div className="relative">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-white/20 text-white border-0">{COURSE_TYPE_LABELS[course.type]}</Badge>
            <Badge className="bg-white/20 text-white border-0">{COURSE_LEVEL_LABELS[course.level]}</Badge>
            {course.featured && <Badge className="bg-amber-400 text-amber-900 border-0">⭐ Destacado</Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{course.name}</h1>
          {course.subtitle && <p className="mt-1 text-white/80">{course.subtitle}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
            {course.coachName && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />Coach: {course.coachName}</span>}
            {course.venueName && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{course.venueName}</span>}
            {course.startDate && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Inicio: {new Date(course.startDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {course.description && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold text-slate-900 mb-2">Sobre el programa</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Detalles del curso</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BookOpen, label: "Deporte", value: course.sport },
                { icon: Star, label: "Nivel", value: COURSE_LEVEL_LABELS[course.level] },
                { icon: Clock, label: "Duración sesión", value: fmtDuration(course.sessionDurationMinutes) },
                { icon: Calendar, label: "Total sesiones", value: `${course.totalSessions} clases` },
                ...(course.scheduleDays?.length ? [{ icon: Calendar, label: "Días", value: formatScheduleDays(course.scheduleDays) }] : []),
                ...(course.scheduleTime ? [{ icon: Clock, label: "Horario", value: `${course.scheduleTime} – ${course.scheduleEndTime || ""}` }] : []),
                ...(course.minAge || course.maxAge ? [{ icon: Users, label: "Edad", value: `${course.minAge || ""}${course.minAge && course.maxAge ? "–" : ""}${course.maxAge || ""} años` }] : []),
                ...(course.venueName ? [{ icon: MapPin, label: "Sede", value: course.venueName }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          {course.benefits && course.benefits.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Lo que vas a aprender</h2>
              <ul className="space-y-2">
                {course.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Includes / excludes */}
          {((course.includes?.length || 0) + (course.excludes?.length || 0)) > 0 && (
            <div className="rounded-2xl border bg-card p-5 grid sm:grid-cols-2 gap-4">
              {course.includes?.length && (
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 mb-2">✅ Incluye</h3>
                  <ul className="space-y-1">{course.includes.map((x, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />{x}</li>)}</ul>
                </div>
              )}
              {course.excludes?.length && (
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 mb-2">❌ No incluye</h3>
                  <ul className="space-y-1">{course.excludes.map((x, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5"><X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />{x}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Policies */}
          {(course.cancellationPolicy || course.makeUpPolicy) && (
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Shield className="h-4 w-4 text-violet-500" />Políticas</h2>
              {course.cancellationPolicy && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Cancelación</p>
                  <p className="text-sm text-slate-700 mt-0.5">{course.cancellationPolicy}</p>
                </div>
              )}
              {course.makeUpPolicy && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Recupero</p>
                  <p className="text-sm text-slate-700 mt-0.5">{course.makeUpPolicy}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 sticky top-6 space-y-4">
            <div>
              <p className="text-3xl font-bold text-violet-700">${course.priceTotal.toLocaleString("es-AR")}</p>
              {course.promotionalPrice && (
                <p className="text-sm text-slate-400 line-through">${course.priceTotal.toLocaleString("es-AR")}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{course.currency} · Precio total del programa</p>
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{course.enrolledCount || 0}/{course.maximumCapacity} lugares</span>
                <span>{fill}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={cn("h-full rounded-full", fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${fill}%` }} />
              </div>
              {fill >= 80 && fill < 100 && <p className="text-xs text-amber-600 font-medium">⚡ Quedan pocos lugares</p>}
              {isFull && <p className="text-xs text-red-600 font-medium">🔴 Curso completo</p>}
            </div>

            {enrolled ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <Check className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-emerald-800">¡Ya estás inscripto!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Revisá tu email para los detalles</p>
              </div>
            ) : (
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                disabled={isFull && !course.waitlistEnabled}
                onClick={() => setShowConfirm(true)}
              >
                {isFull && course.waitlistEnabled ? "Anotarme a lista de espera" : isFull ? "Curso completo" : (course.ctaText || "Inscribirme")}
              </Button>
            )}

            {course.installmentsEnabled && course.installmentCount && (
              <p className="text-xs text-center text-slate-500">
                O hasta {course.installmentCount} cuotas de ${Math.round(course.priceTotal / course.installmentCount).toLocaleString("es-AR")}
              </p>
            )}

            {course.requirements?.length && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Requisitos:</p>
                <ul className="space-y-0.5">{course.requirements.map((r, i) => <li key={i} className="text-xs text-slate-500">• {r}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Confirmar inscripción</h3>
              <button onClick={() => setShowConfirm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600">Te vas a inscribir en <strong>{course.name}</strong>.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Tu nombre *</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Email</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  type="email" value={playerEmail} onChange={e => setPlayerEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-800">
              💳 Precio: <strong>${course.priceTotal.toLocaleString("es-AR")} {course.currency}</strong>
              {course.requireApproval && <p className="text-xs mt-1 text-violet-600">Tu inscripción quedará pendiente hasta que sea aprobada.</p>}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleEnroll} disabled={enrolling || !playerName.trim()} className="gap-1.5">
                {enrolling ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Inscribiendo…</> : <><Check className="h-3.5 w-3.5" />Confirmar inscripción</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
