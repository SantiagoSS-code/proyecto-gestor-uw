"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { CourseSession, SessionStatus, Course } from "@/lib/courses-types"
const SESSION_STATUS_LABELS: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar, ChevronDown, Edit2, Loader2, MoreVertical, Search, Trash2, Users, X,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  rescheduled: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
}

interface SessionRow extends CourseSession { courseName?: string }

// ── Edit dialog ──────────────────────────────────────────────────────────────
function EditSessionDialog({
  session, centerId, onClose, onSaved,
}: { session: SessionRow; centerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    date: session.date, startTime: session.startTime, endTime: session.endTime,
    status: session.status, notes: session.notes || "",
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDoc(
        doc(db, FIRESTORE_COLLECTIONS.centers, centerId, "courses", session.courseId, "sessions", session.id),
        { ...form, updatedAt: new Date().toISOString() },
      )
      onSaved()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Editar sesión</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-500">{session.courseName} · Sesión #{session.sessionNumber}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Fecha</label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Estado</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as SessionStatus }))}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SESSION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Hora inicio</label>
            <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Hora fin</label>
            <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">Notas</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} className="mt-1 w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Guardando</> : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CoursesSessions() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [editing, setEditing] = useState<SessionRow | null>(null)

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
        sessSnap.docs.forEach(s => {
          allSessions.push({ id: s.id, ...s.data(), courseName: c.name } as SessionRow)
        })
      }))
      allSessions.sort((a, b) => a.date.localeCompare(b.date))
      setSessions(allSessions)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [resolvedId])

  const handleDelete = async (s: SessionRow) => {
    if (!resolvedId || !confirm("¿Eliminar esta sesión?")) return
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", s.courseId, "sessions", s.id))
    fetchData()
  }

  const handleStatusChange = async (s: SessionRow, status: SessionStatus) => {
    if (!resolvedId) return
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", s.courseId, "sessions", s.id), { status, updatedAt: new Date().toISOString() })
    fetchData()
  }

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase()
    if (q && !s.courseName?.toLowerCase().includes(q) && !s.date.includes(q)) return false
    if (filterCourse !== "all" && s.courseId !== filterCourse) return false
    if (filterStatus !== "all" && s.status !== filterStatus) return false
    return true
  })

  const today = new Date().toISOString().split("T")[0]
  const upcoming = filtered.filter(s => s.date >= today)
  const past = filtered.filter(s => s.date < today)

  const SessionRow = ({ s }: { s: SessionRow }) => (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", s.date === today ? "bg-amber-500" : s.date > today ? "bg-blue-500" : "bg-slate-300")} />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {new Date(s.date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <p className="text-xs text-slate-400">{s.startTime} – {s.endTime}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-700 font-medium">{s.courseName}</p>
        <p className="text-xs text-slate-400">Sesión #{s.sessionNumber}</p>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-slate-600">{s.coachName || "—"}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm text-slate-600">{s.presentCount ?? "—"}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[s.status as SessionStatus] || "")}>
          {SESSION_STATUS_LABELS[s.status as SessionStatus] || s.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditing(s)}>
              <Edit2 className="h-3.5 w-3.5 mr-2" />Editar sesión
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {s.status !== "completed" && (
              <DropdownMenuItem onClick={() => handleStatusChange(s, "completed")}>
                Marcar completada
              </DropdownMenuItem>
            )}
            {s.status !== "cancelled" && (
              <DropdownMenuItem onClick={() => handleStatusChange(s, "cancelled")} className="text-red-600">
                Cancelar sesión
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(s)} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Sesiones</h2>
          <p className="text-sm text-slate-500">{sessions.length} sesiones en total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar curso o fecha…" className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Todos los cursos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(SESSION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Sin sesiones aún</h3>
          <p className="text-sm text-slate-400 mt-1">Creá un curso con generación automática de sesiones para empezar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Próximas ({upcoming.length})</h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Fecha</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Curso</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Coach</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Asistencia</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(s => <SessionRow key={s.id} s={s} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Anteriores ({past.length})</h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Fecha</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Curso</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Coach</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Asistencia</th>
                      <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {past.map(s => <SessionRow key={s.id} s={s} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {editing && resolvedId && (
        <EditSessionDialog
          session={editing}
          centerId={resolvedId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchData() }}
        />
      )}
    </div>
  )
}
