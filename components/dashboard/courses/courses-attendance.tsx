"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { AttendanceRecord, AttendanceStatus, CourseSession, Enrollment, Course } from "@/lib/courses-types"
import { ATTENDANCE_STATUS_LABELS } from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Check, CheckSquare, ClipboardList, Loader2, X } from "lucide-react"

interface SessionRow extends CourseSession { courseName?: string }

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-700 border-emerald-300",
  absent: "bg-red-100 text-red-600 border-red-200",
  absent_notified: "bg-amber-100 text-amber-700 border-amber-200",
  makeup_pending: "bg-blue-100 text-blue-700 border-blue-200",
  excused: "bg-slate-100 text-slate-600 border-slate-200",
}

const STATUS_BTN: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500",
  absent: "bg-red-400 hover:bg-red-500 text-white border-red-400",
  absent_notified: "bg-amber-400 hover:bg-amber-500 text-white border-amber-400",
  makeup_pending: "bg-blue-400 hover:bg-blue-500 text-white border-blue-400",
  excused: "bg-slate-400 hover:bg-slate-500 text-white border-slate-400",
}

const STATUS_CYCLE: AttendanceStatus[] = ["present", "absent", "absent_notified", "excused"]

export function CoursesAttendance() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  const fetchData = async () => {
    if (!resolvedId) return
    setLoading(true)
    try {
      const root = FIRESTORE_COLLECTIONS.centers
      const coursesSnap = await getDocs(collection(db, root, resolvedId, "courses"))
      const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course))
      setCourses(coursesData)

      const allSessions: SessionRow[] = []
      await Promise.all(coursesData.map(async c => {
        const sessSnap = await getDocs(collection(db, root, resolvedId, "courses", c.id, "sessions"))
        sessSnap.docs.forEach(s => allSessions.push({ id: s.id, ...s.data(), courseName: c.name } as SessionRow))
      }))
      allSessions.sort((a, b) => b.date.localeCompare(a.date))
      setSessions(allSessions)

      const enrollSnap = await getDocs(collection(db, root, resolvedId, "enrollments"))
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)))

      const attSnap = await getDocs(collection(db, root, resolvedId, "attendance"))
      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [resolvedId])

  const filteredSessions = sessions.filter(s =>
    selectedCourse === "all" ? true : s.courseId === selectedCourse
  )

  const activeSess = selectedSession ? sessions.find(s => s.id === selectedSession) : filteredSessions[0]

  // Enrollments for the selected session's course
  const sessionEnrollments = enrollments.filter(e =>
    activeSess ? (e.courseId === activeSess.courseId && (e.status === "confirmed" || e.status === "completed")) : false
  )

  const getRecord = (enrollmentId: string): AttendanceRecord | undefined =>
    attendance.find(a => a.sessionId === activeSess?.id && a.enrollmentId === enrollmentId)

  const cycleStatus = async (enrollment: Enrollment) => {
    if (!resolvedId || !activeSess) return
    const existing = getRecord(enrollment.id)
    const currentStatus = existing?.status as AttendanceStatus | undefined
    const currentIdx = currentStatus ? STATUS_CYCLE.indexOf(currentStatus) : -1
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]

    setSaving(enrollment.id)
    try {
      const now = new Date().toISOString()
      if (existing?.id) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "attendance", existing.id), {
          status: nextStatus, markedAt: now, updatedAt: now,
        })
        setAttendance(prev => prev.map(a => a.id === existing.id ? { ...a, status: nextStatus, markedAt: now } : a))
      } else {
        const newRecord: Omit<AttendanceRecord, "id"> = {
          sessionId: activeSess.id,
          courseId: activeSess.courseId,
          centerId: resolvedId,
          enrollmentId: enrollment.id,
          playerName: enrollment.playerName,
          status: nextStatus,
          markedAt: now,
        }
        const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "attendance"), newRecord as any)
        setAttendance(prev => [...prev, { id: ref.id, ...newRecord }])
      }
    } catch (e) { console.error(e) } finally { setSaving(null) }
  }

  const markAll = async (status: AttendanceStatus) => {
    if (!resolvedId || !activeSess) return
    for (const enr of sessionEnrollments) {
      const existing = getRecord(enr.id)
      const now = new Date().toISOString()
      if (existing?.id) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "attendance", existing.id), { status, markedAt: now })
      } else {
        const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "attendance"), {
          sessionId: activeSess.id, courseId: activeSess.courseId, centerId: resolvedId,
          enrollmentId: enr.id, playerName: enr.playerName, status, markedAt: now,
        } as any)
        setAttendance(prev => [...prev, { id: ref.id, sessionId: activeSess.id, courseId: activeSess.courseId, centerId: resolvedId, enrollmentId: enr.id, playerName: enr.playerName, status, markedAt: now }])
      }
    }
    setAttendance(prev => [...prev]) // trigger re-render
    fetchData()
  }

  // Stats for active session
  const presentCount = sessionEnrollments.filter(e => getRecord(e.id)?.status === "present").length
  const absentCount = sessionEnrollments.filter(e => {
    const s = getRecord(e.id)?.status
    return s === "absent" || s === "absent_notified"
  }).length
  const unmarked = sessionEnrollments.filter(e => !getRecord(e.id)).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Asistencia</h2>
          <p className="text-sm text-slate-500">Marcá la asistencia de cada sesión</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedCourse} onValueChange={v => { setSelectedCourse(v); setSelectedSession(null) }}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Todos los cursos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSession || activeSess?.id || ""} onValueChange={v => setSelectedSession(v)}>
          <SelectTrigger className="w-64 h-9 text-sm"><SelectValue placeholder="Seleccionar sesión" /></SelectTrigger>
          <SelectContent>
            {filteredSessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })} · {s.startTime} · {s.courseName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : !activeSess ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Seleccioná una sesión</h3>
          <p className="text-sm text-slate-400 mt-1">Elegí un curso y una sesión para marcar asistencia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Session header */}
          <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{activeSess.courseName}</p>
              <p className="text-sm text-slate-500">
                {new Date(activeSess.date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · {activeSess.startTime}–{activeSess.endTime}
                {activeSess.coachName && ` · ${activeSess.coachName}`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-600 font-medium">✅ {presentCount}</span>
              <span className="text-red-500 font-medium">❌ {absentCount}</span>
              {unmarked > 0 && <span className="text-amber-500 font-medium">⬜ {unmarked} sin marcar</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll("present")} className="text-xs gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />Marcar todos presentes
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll("absent")} className="text-xs gap-1.5">
              <X className="h-3.5 w-3.5 text-red-500" />Marcar todos ausentes
            </Button>
          </div>

          {/* Attendance grid */}
          {sessionEnrollments.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 p-8 text-center">
              <p className="text-sm text-slate-500">No hay alumnos confirmados en este curso aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessionEnrollments.map(enr => {
                const record = getRecord(enr.id)
                const status = record?.status as AttendanceStatus | undefined
                return (
                  <div key={enr.id} className="bg-card border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-violet-700 font-bold text-sm">{enr.playerName[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{enr.playerName}</p>
                      {status ? (
                        <Badge variant="outline" className={cn("text-[10px] mt-0.5", STATUS_COLORS[status])}>
                          {ATTENDANCE_STATUS_LABELS[status]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Sin marcar</span>
                      )}
                    </div>
                    <button
                      onClick={() => cycleStatus(enr)}
                      disabled={saving === enr.id}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shrink-0",
                        saving === enr.id ? "opacity-50 cursor-wait" :
                          status ? STATUS_BTN[status] : "border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500"
                      )}
                      title="Toca para cambiar estado"
                    >
                      {saving === enr.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                        status === "present" ? "P" : status === "absent" ? "A" : status === "excused" ? "J" : status === "absent_notified" ? "AA" : "·"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-2">
            <p className="text-xs text-slate-500 font-medium">Tocá el botón para cambiar:</p>
            {STATUS_CYCLE.map(s => (
              <span key={s} className={cn("text-xs px-2 py-0.5 rounded-full border", STATUS_COLORS[s])}>
                {ATTENDANCE_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
