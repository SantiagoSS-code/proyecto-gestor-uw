"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn, formatCurrencyARS } from "@/lib/utils"
import type { CoursePayment, PaymentStatus, PaymentType, Enrollment, Course } from "@/lib/courses-types"
import { PAYMENT_STATUS_LABELS } from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check, DollarSign, Loader2, MoreVertical, Plus, Search, X } from "lucide-react"

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-50 text-slate-600 border-slate-200",
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  full: "Pago total", deposit: "Seña/depósito", installment: "Cuota", balance: "Saldo",
}

// ── Register payment dialog ───────────────────────────────────────────────────
function RegisterPaymentDialog({
  enrollments, courses, centerId, onClose, onSaved,
}: { enrollments: Enrollment[]; courses: Course[]; centerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    enrollmentId: "", amount: "", type: "full" as PaymentType, paymentMethod: "efectivo",
    reference: "", notes: "", dueDate: "",
  })
  const [saving, setSaving] = useState(false)

  const selectedEnrollment = enrollments.find(e => e.id === form.enrollmentId)

  const handleSave = async () => {
    if (!form.enrollmentId || !form.amount) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payment: Omit<CoursePayment, "id"> = {
        enrollmentId: form.enrollmentId,
        courseId: selectedEnrollment?.courseId || "",
        centerId,
        playerName: selectedEnrollment?.playerName || "",
        courseName: selectedEnrollment?.courseName || courses.find(c => c.id === selectedEnrollment?.courseId)?.name || "",
        amount: Number(form.amount),
        paidAt: now,
        paymentMethod: form.paymentMethod,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        dueDate: form.dueDate || undefined,
        status: "paid",
        type: form.type,
      }
      await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, centerId, "coursePayments"), payment as any)
      // Update enrollment paidAmount
      if (selectedEnrollment) {
        const newPaid = (selectedEnrollment.paidAmount || 0) + Number(form.amount)
        const newPending = Math.max(0, (selectedEnrollment.totalPrice || 0) - newPaid)
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, centerId, "enrollments", form.enrollmentId), {
          paidAmount: newPaid,
          pendingAmount: newPending,
          paymentStatus: newPending === 0 ? "paid" : newPaid > 0 ? "partial" : "pending",
          updatedAt: now,
        })
      }
      onSaved()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Registrar pago</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Alumno *</label>
            <Select value={form.enrollmentId} onValueChange={v => setForm(f => ({ ...f, enrollmentId: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Seleccionar inscripción" /></SelectTrigger>
              <SelectContent>
                {enrollments.filter(e => e.status === "confirmed" || e.status === "pending").map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.playerName} — {e.courseName || courses.find(c => c.id === e.courseId)?.name || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedEnrollment && (
            <div className="col-span-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-800">
              Pagado: {formatCurrencyARS(selectedEnrollment.paidAmount)} · Pendiente: {formatCurrencyARS(selectedEnrollment.pendingAmount)} · Total: {formatCurrencyARS(selectedEnrollment.totalPrice)}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-700">Monto *</label>
            <Input type="number" min="0" className="mt-1 h-9 text-sm" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Tipo de pago</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as PaymentType }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Método</label>
            <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["efectivo", "transferencia", "tarjeta", "QR", "otro"].map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Referencia</label>
            <Input className="mt-1 h-9 text-sm" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° transferencia" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Notas</label>
            <Input className="mt-1 h-9 text-sm" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.enrollmentId || !form.amount}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Guardando</> : <><Check className="h-3.5 w-3.5 mr-1" />Registrar</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CoursesPayments() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [payments, setPayments] = useState<CoursePayment[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [showAdd, setShowAdd] = useState(false)

  const fetchData = async () => {
    if (!resolvedId) return
    setLoading(true)
    try {
      const root = FIRESTORE_COLLECTIONS.centers
      const [paymentsSnap, enrollSnap, courseSnap] = await Promise.all([
        getDocs(collection(db, root, resolvedId, "coursePayments")),
        getDocs(collection(db, root, resolvedId, "enrollments")),
        getDocs(collection(db, root, resolvedId, "courses")),
      ])
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CoursePayment)).sort((a, b) => (b.paidAt || "").localeCompare(a.paidAt || "")))
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)))
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [resolvedId])

  const handleMarkRefunded = async (p: CoursePayment) => {
    if (!resolvedId) return
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "coursePayments", p.id), { status: "refunded", updatedAt: new Date().toISOString() })
    fetchData()
  }

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    if (q && !p.playerName?.toLowerCase().includes(q) && !p.courseName?.toLowerCase().includes(q)) return false
    if (filterStatus !== "all" && p.status !== filterStatus) return false
    if (filterCourse !== "all" && p.courseId !== filterCourse) return false
    return true
  })

  // KPIs
  const totalCollected = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0)
  const totalPending = enrollments.reduce((s, e) => s + (e.pendingAmount || 0), 0)
  const overdueCount = payments.filter(p => p.status === "overdue").length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Pagos</h2>
          <p className="text-sm text-slate-500">{payments.length} registros de pago</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />Registrar pago
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total recaudado", value: formatCurrencyARS(totalCollected), color: "text-emerald-700" },
          { label: "Pendiente de cobro", value: formatCurrencyARS(totalPending), color: "text-amber-700" },
          { label: "Pagos vencidos", value: overdueCount, color: overdueCount > 0 ? "text-red-700" : "text-slate-500" },
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar alumno o curso…" className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Todos los cursos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
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
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <DollarSign className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Sin pagos registrados</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Los pagos de inscripciones aparecerán aquí.</p>
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />Registrar primer pago
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Alumno / Curso</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden sm:table-cell">Tipo</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Monto</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden md:table-cell">Método</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4">Estado</th>
                <th className="text-left text-xs font-semibold text-slate-500 py-2.5 px-4 hidden md:table-cell">Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-900">{p.playerName}</p>
                    <p className="text-xs text-slate-400">{p.courseName}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-600">{PAYMENT_TYPE_LABELS[p.type]}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold text-slate-900">{formatCurrencyARS(p.amount)}</span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-sm text-slate-600 capitalize">{p.paymentMethod || "—"}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={cn("text-xs", PAYMENT_STATUS_COLORS[p.status])}>
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-slate-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-AR") : "—"}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.status === "paid" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleMarkRefunded(p)} className="text-amber-600">
                            Marcar reembolsado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && resolvedId && (
        <RegisterPaymentDialog
          enrollments={enrollments}
          courses={courses}
          centerId={resolvedId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchData() }}
        />
      )}
    </div>
  )
}
