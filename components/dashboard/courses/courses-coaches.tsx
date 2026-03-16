"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import type { CourseCoach, Course } from "@/lib/courses-types"
import { SPORTS_LIST } from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit2, Loader2, MoreVertical, Plus, Star, Trash2, UserCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Coach form dialog ─────────────────────────────────────────────────────────
function CoachDialog({
  existing, centerId, onClose, onSaved,
}: { existing?: CourseCoach; centerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    bio: existing?.bio || "",
    photo: existing?.photo || "",
    specialties: existing?.specialties?.join(", ") || "",
    sports: existing?.sports || [] as string[],
    featured: existing?.featured || false,
    visible: existing?.visible !== false,
  })
  const [saving, setSaving] = useState(false)

  const toggleSport = (s: string) =>
    setForm(f => ({ ...f, sports: f.sports.includes(s) ? f.sports.filter(x => x !== s) : [...f.sports, s] }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payload: Omit<CourseCoach, "id"> = {
        centerId,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        photo: form.photo.trim() || undefined,
        specialties: form.specialties ? form.specialties.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        sports: form.sports.length ? form.sports : undefined,
        featured: form.featured,
        visible: form.visible,
      }
      if (existing?.id) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, centerId, "coaches", existing.id), { ...payload, updatedAt: now } as any)
      } else {
        await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, centerId, "coaches"), { ...payload, createdAt: now, updatedAt: now } as any)
      }
      onSaved()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{existing ? "Editar coach" : "Nuevo coach"}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Nombre completo *</label>
            <Input className="mt-1 h-9 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Email</label>
            <Input className="mt-1 h-9 text-sm" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Teléfono</label>
            <Input className="mt-1 h-9 text-sm" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Foto (URL)</label>
            <Input className="mt-1 h-9 text-sm" value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} className="mt-1 w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Especialidades (separadas por coma)</label>
            <Input className="mt-1 h-9 text-sm" value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} placeholder="Ej: Técnica, Kids, Alto rendimiento" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700">Deportes</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SPORTS_LIST.map(s => (
                <button key={s} type="button" onClick={() => toggleSport(s)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                    form.sports.includes(s) ? "bg-violet-600 text-white border-violet-600" : "text-slate-600 border-slate-200 hover:border-violet-300")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-4">
            {[
              { id: "featured", label: "Destacado", key: "featured" as const },
              { id: "visible", label: "Visible en el sitio", key: "visible" as const },
            ].map(opt => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id={opt.id} checked={form[opt.key]}
                  onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Guardando</> : existing ? "Actualizar" : "Crear coach"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CoursesCoaches() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [coaches, setCoaches] = useState<CourseCoach[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<CourseCoach | undefined>(undefined)

  const fetchData = async () => {
    if (!resolvedId) return
    setLoading(true)
    try {
      const root = FIRESTORE_COLLECTIONS.centers
      const [coachSnap, courseSnap] = await Promise.all([
        getDocs(collection(db, root, resolvedId, "coaches")),
        getDocs(collection(db, root, resolvedId, "courses")),
      ])
      setCoaches(coachSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseCoach)))
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [resolvedId])

  const handleDelete = async (c: CourseCoach) => {
    if (!resolvedId || !confirm(`¿Eliminar a ${c.name}?`)) return
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "coaches", c.id))
    fetchData()
  }

  const coachCourseCount = (coachName: string) =>
    courses.filter(c => c.coachName === coachName).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Coaches</h2>
          <p className="text-sm text-slate-500">{coaches.length} coaches registrados</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setShowDialog(true) }} className="gap-2">
          <Plus className="h-4 w-4" />Nuevo coach
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : coaches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCircle className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700">Sin coaches registrados</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Registrá tus coaches para asignarlos a los cursos.</p>
          <Button variant="outline" onClick={() => setShowDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />Agregar coach
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map(coach => (
            <div key={coach.id} className="bg-card border rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {coach.photo ? (
                  <img src={coach.photo} alt={coach.name} className="h-12 w-12 rounded-full object-cover border" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-violet-700 font-bold text-lg">{coach.name[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-900 truncate">{coach.name}</p>
                    {coach.featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />}
                  </div>
                  {coach.email && <p className="text-xs text-slate-400 truncate">{coach.email}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => { setEditing(coach); setShowDialog(true) }}>
                      <Edit2 className="h-3.5 w-3.5 mr-2" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(coach)} className="text-red-600">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {coach.bio && <p className="text-xs text-slate-500 line-clamp-2">{coach.bio}</p>}
              <div className="flex flex-wrap gap-1">
                {coach.sports?.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">{s}</Badge>
                ))}
                {coach.specialties?.slice(0, 2).map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] text-slate-500">{s}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t text-xs text-slate-500">
                <span>{coachCourseCount(coach.name)} cursos activos</span>
                {!coach.visible && <Badge variant="outline" className="text-[10px] text-slate-400">Oculto</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && resolvedId && (
        <CoachDialog
          existing={editing}
          centerId={resolvedId}
          onClose={() => { setShowDialog(false); setEditing(undefined) }}
          onSaved={() => { setShowDialog(false); setEditing(undefined); fetchData() }}
        />
      )}
    </div>
  )
}
