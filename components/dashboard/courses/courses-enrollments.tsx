"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { formatCurrencyARS } from "@/lib/utils"
import type { Enrollment, EnrollmentStatus, PaymentStatus, Course } from "@/lib/courses-types"
import { ENROLLMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Check, Loader2, MoreVertical, Plus, Search, UserPlus, Users, X,
} from "lucide-react"

const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  waitlist: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
}

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-50 text-slate-600 border-slate-200",
}

// ── Add enrollment dialog ─────────────────────────────────────────────────────
function AddEnrollmentDialog({
  courses, centerId, onClose, onSaved,
}: { courses: Course[]; centerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    courseId: courses[0]?.id || "", playerName: "", playerEmail: "", playerPhone: "",
    playerAge: "", notes: "", status: "confirmed" as EnrollmentStatus, paymentStatus: "pending" as PaymentStatus,
  })
  const [saving, setSaving] = useState(false)

  const selectedCourse = courses.find(c => c.id === form.courseId)

  const handleSave = async () => {
    if (!form.playerName.trim() || !form.courseId) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const enrollment: Omit<Enrollment, "id"> = {
        courseId: form.courseId,
        courseName: selectedCourse?.name || "",
        centerId,
        playerName: form.playerName.trim(),
        playerEmail: form.playerEmail.trim() || undefined,
        playerPhone: form.playerPhone.trim() || undefined,
        playerAge: form.playerAge ? Number(form.playerAge) : undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
        paymentStatus: form.paymentStatus,
        paidAmount: 0,
        pendingAmount: selectedCourse?.priceTotal || 0,
        totalPrice: selectedCourse?.priceTotal || 0,
        enrolledAt: now,
        confirmedAt: form.status === "confirmed" ? now : undefined,
      }
      await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, centerId, "enrollments"), enrollment as any)
      // Update course enrolledCount
      if (selectedCourse && form.status === "confirmed") {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, centerId, "courses", form.courseId), {
          enrolledCount: (selectedCourse.enrolledCount || 0) + 1,
          updatedAt: now,
        })
      }
      onSaved()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Nueva inscripción</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Curso *</label>
            <Select value={form.courseId} onValueChange={v => setForm(f => ({ ...f, courseId: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Seleccionar curso" /></SelectTrigger>
              <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {selectedCourse && (
            <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
              {selectedCourse.sport} · {selectedCourse.totalSessions} sesiones · {formatCurrencyARS(selectedCourse.priceTotal)}
              · {selectedCourse.enrolledCount || 0}/{selectedCourse.maximumCapacity} inscriptos
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Nombre del alumno *</label>
              <Input className="mt-1 h-9 text-sm" value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Email</label>
              <Input className="mt-1 h-9 text-sm" type="email" value={form.playerEmail} onChange={e => setForm(f => ({ ...f, playerEmail: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Teléfono</label>
              <Input className="mt-1 h-9 text-sm" type="tel" value={form.playerPhone} onChange={e => setForm(f => ({ ...f, playerPhone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Edad</label>
              <Input className="mt-1 h-9 text-sm" type="number" min="0" value={form.playerAge} onChange={e => setForm(f => ({ ...f, playerAge: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Estado pago</label>
              <Select value={form.paymentStatus} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v as PaymentStatus }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Estado inscripción</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as EnrollmentStatus }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className="mt-1 w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.playerName.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Guardando</> : <><UserPlus className="h-3.5 w-3.5 mr-1" />Inscribir</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CoursesEnrollments() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPayment, setFilterPayment] = useState("all")
  const [showAdd, setShowAdd] = useState(false)

  const fetchData = async () => {
    if (!resolvedId) return
    setLoading(true)
    try {
      const root = FIRESTORE_COLLECTIONS.centers
      const [coursesSnap, enrollSnap] = await Promise.all([
        getDocs(collection(db, root, resolvedId, "courses")),
        getDocs(collection(db, root, resolvedId, "enrollments")),
      ])
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)))
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [resolvedId])

  const handleStatusChange = async (e: Enrollment, status: EnrollmentStatus) => {
    if (!resolvedId) return
    const now = new Date().toISOString()
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "enrollments", e.id), {
      status, updatedAt: now, ...(status === "confirmed" ? { confirmedAt: now } : {}),
    })
    fetchData()
  }

  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase()
    if (q && !e.playerName.toLowerCase().includes(q) && !e.playerEmail?.toLowerCase().includes(q)) return false
    if (filterCourse !== "all" && e.courseId !== filterCourse) return false
    if (filterStatus !== "all" && e.status !== filterStatus) return false
    if (filterPayment !== "all" && e.paymentStatus !== filterPayment) return false
    return true
  })

  // KPIs
  const confirmed = enrollments.filter(e => e.status === "confirmed").length
  const pending = enrollments.filter(e => e.status === "pending").length
  const waitlist = enrollments.filter(e => e.status === "waitlist").length
  const totalRevenue = enrollments.filter(e => e.paymentStatus === "paid").reduce((s, e) => s + (e.paidAmount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Inscripciones</h2>
          <p className="text-sm text-slate-500">{enrollments.length} inscripciones en total</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />Nueva inscripción
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Confirmados", value: confirmed, color: "text-emerald-600" },
          { label: "Pendientes", value: pending, color: "text-amber-600" },
          { label: "Lista espera", value: waitlist, color: "text-blue-600" },
          { label: "Recaudado", value: formatCurrencyARS(totalRevenue), color: "text-violet-700" },
        ].map(k => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn("text-xl font-bold mt-1", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar alumno…" className="pl-9 h-9 text-sm" />
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
            {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Pago" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Sin inscripciones</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Agregá la primera inscripción manualmente o compartí el curso para recibir inscripciones online.</p>
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />Agregar inscripción
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Alumno</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden sm:table-cell">Curso</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Estado</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden md:table-cell">Pago</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden lg:table-cell">Asistencia</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden md:table-cell">Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-900">{e.playerName}</p>
                    <p className="text-xs text-slate-400">{e.playerEmail || e.playerPhone || "Sin contacto"}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <p className="text-sm text-slate-700">{e.courseName || courses.find(c => c.id === e.courseId)?.name || "—"}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={cn("text-xs", ENROLLMENT_STATUS_COLORS[e.status])}>
                      {ENROLLMENT_STATUS_LABELS[e.status]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="space-y-1">
                      <Badge variant="outline" className={cn("text-xs", PAYMENT_STATUS_COLORS[e.paymentStatus])}>
                        {PAYMENT_STATUS_LABELS[e.paymentStatus]}
                      </Badge>
                      <p className="text-xs text-slate-400">{formatCurrencyARS(e.paidAmount)} / {formatCurrencyARS(e.totalPrice)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {e.sessionsAttended !== undefined ? (
                      <p className="text-sm text-slate-600">{e.sessionsAttended}/{e.sessionsTotal} <span className="text-xs text-slate-400">({Math.round(((e.sessionsAttended || 0) / (e.sessionsTotal || 1)) * 100)}%)</span></p>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <p className="text-xs text-slate-400">{new Date(e.enrolledAt).toLocaleDateString("es-AR")}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {e.status === "pending" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(e, "confirmed")}>
                            <Check className="h-3.5 w-3.5 mr-2 text-emerald-600" />Confirmar
                          </DropdownMenuItem>
                        )}
                        {e.status !== "waitlist" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(e, "waitlist")}>
                            Mover a espera
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {e.status !== "cancelled" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(e, "cancelled")} className="text-red-600">
                            Cancelar inscripción
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && resolvedId && (
        <AddEnrollmentDialog
          courses={courses.filter(c => c.status === "published" || c.status === "in_progress")}
          centerId={resolvedId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchData() }}
        />
      )}
    </div>
  )
}
