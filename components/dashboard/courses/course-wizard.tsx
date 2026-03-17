"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, addDoc, updateDoc, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { Course, CourseType, CourseLevel, CourseStatus, CourseVisibility, CourseCoach } from "@/lib/courses-types"
import {
  COURSE_TYPE_LABELS, COURSE_LEVEL_LABELS, SPORTS_LIST, SCHEDULE_DAYS,
  generateCourseSessions, addMinutesToTime,
} from "@/lib/courses-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  Check, ChevronLeft, ChevronRight, GraduationCap, Calendar, Users,
  DollarSign, FileText, Image, Globe, Loader2, Plus, X,
} from "lucide-react"

// ── Form shape ─────────────────────────────────────────────────────────────────
interface WizardForm {
  // Step 1
  name: string; subtitle: string; description: string; objective: string
  sport: string; level: CourseLevel; type: CourseType
  minAge: string; maxAge: string; venueName: string; courtName: string
  coachId: string; coachName: string
  // Step 2
  durationWeeks: string; totalSessions: string; sessionsPerWeek: string
  sessionDurationMinutes: string; startDate: string; endDate: string; isFlexiblePack: boolean
  // Step 3
  scheduleDays: string[]; scheduleTime: string; scheduleEndTime: string
  autoGenerateSessions: boolean; allowMakeUp: boolean
  // Step 4
  minimumCapacity: string; maximumCapacity: string; waitlistEnabled: boolean
  enrollmentDeadline: string; requireApproval: boolean; autoCloseWhenFull: boolean; lateJoiningAllowed: boolean
  // Step 5
  priceTotal: string; promotionalPrice: string; depositAmount: string
  installmentsEnabled: boolean; installmentCount: string; earlyBirdDiscount: string
  currency: string; refundable: boolean
  // Step 6
  cancellationPolicy: string; refundPolicy: string; makeUpPolicy: string; transferable: boolean
  // Step 7
  coverImage: string; benefits: string[]; includes: string[]; excludes: string[]; requirements: string[]; tags: string[]; ctaText: string
  // Step 8
  status: CourseStatus; visibility: CourseVisibility; featured: boolean; publicOrder: string; autoHideAfterEnd: boolean
}

const DEFAULT_FORM: WizardForm = {
  name: "", subtitle: "", description: "", objective: "",
  sport: "Pádel", level: "beginner", type: "program",
  minAge: "", maxAge: "", venueName: "", courtName: "", coachId: "", coachName: "",
  durationWeeks: "8", totalSessions: "16", sessionsPerWeek: "2",
  sessionDurationMinutes: "60", startDate: "", endDate: "", isFlexiblePack: false,
  scheduleDays: [], scheduleTime: "18:00", scheduleEndTime: "19:00",
  autoGenerateSessions: true, allowMakeUp: false,
  minimumCapacity: "4", maximumCapacity: "12", waitlistEnabled: true,
  enrollmentDeadline: "", requireApproval: false, autoCloseWhenFull: true, lateJoiningAllowed: false,
  priceTotal: "", promotionalPrice: "", depositAmount: "", installmentsEnabled: false,
  installmentCount: "2", earlyBirdDiscount: "", currency: "ARS", refundable: false,
  cancellationPolicy: "", refundPolicy: "", makeUpPolicy: "", transferable: false,
  coverImage: "", benefits: [], includes: [], excludes: [], requirements: [], tags: [], ctaText: "Inscribirme",
  status: "draft", visibility: "public", featured: false, publicOrder: "", autoHideAfterEnd: true,
}

const STEPS = [
  { icon: GraduationCap, label: "General" },
  { icon: FileText, label: "Estructura" },
  { icon: Calendar, label: "Horario" },
  { icon: Users, label: "Capacidad" },
  { icon: DollarSign, label: "Precios" },
  { icon: FileText, label: "Políticas" },
  { icon: Image, label: "Contenido" },
  { icon: Globe, label: "Publicar" },
]

const TAGS_PRESET = ["Kids", "Nuevo", "Best seller", "Intensivo", "Premium", "Principiantes", "Competitivo", "Grupal"]

// ── Shared field wrapper ──────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Multi-value input helper ──────────────────────────────────────────────────
function TagsInput({
  value, onChange, placeholder, presets,
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; presets?: string[] }) {
  const [input, setInput] = useState("")
  const add = () => {
    const v = input.trim()
    if (v && !value.includes(v)) { onChange([...value, v]); setInput("") }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          className="h-8 text-sm flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 px-3">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {presets && (
        <div className="flex flex-wrap gap-1">
          {presets.filter(p => !value.includes(p)).map(p => (
            <button key={p} type="button" onClick={() => onChange([...value, p])}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors">
              +{p}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded-full border border-violet-200">
              {v}
              <button type="button" onClick={() => onChange(value.filter(x => x !== v))}><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function Step1({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Nombre del curso *">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Academia Kids Pádel 8 semanas" />
        </Field>
      </div>
      <Field label="Subtítulo">
        <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Una línea que describe el programa" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Deporte *">
          <Select value={form.sport} onValueChange={v => setForm(f => ({ ...f, sport: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{SPORTS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Nivel *">
          <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as CourseLevel }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(COURSE_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Tipo de curso *">
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CourseType }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(COURSE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Nombre del coach">
        <Input value={form.coachName} onChange={e => setForm(f => ({ ...f, coachName: e.target.value }))} placeholder="Ej: Jaume (Tato)" />
      </Field>
      <Field label="Sede / Lugar">
        <Input value={form.venueName} onChange={e => setForm(f => ({ ...f, venueName: e.target.value }))} placeholder="Nombre del club o sede" />
      </Field>
      <Field label="Cancha asignada (opcional)">
        <Input value={form.courtName} onChange={e => setForm(f => ({ ...f, courtName: e.target.value }))} placeholder="Ej: Cancha 3" />
      </Field>
      <Field label="Edad mínima">
        <Input type="number" min="0" value={form.minAge} onChange={e => setForm(f => ({ ...f, minAge: e.target.value }))} placeholder="5" />
      </Field>
      <Field label="Edad máxima">
        <Input type="number" min="0" value={form.maxAge} onChange={e => setForm(f => ({ ...f, maxAge: e.target.value }))} placeholder="12" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descripción">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describí el programa: qué aprenderán, para quién es, cómo está organizado…"
            rows={3} className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 placeholder:text-slate-400" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Objetivo del curso">
          <Input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Qué lograrán los alumnos al terminarlo" />
        </Field>
      </div>
    </div>
  )
}

function Step2({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
        <input type="checkbox" id="flexPack" checked={form.isFlexiblePack} onChange={e => setForm(f => ({ ...f, isFlexiblePack: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
        <label htmlFor="flexPack" className="text-sm font-medium text-slate-700 cursor-pointer">
          Pack flexible (sin horario fijo — se activa con "Pack de clases")
        </label>
      </div>
      <Field label="Semanas de duración">
        <Input type="number" min="1" value={form.durationWeeks} onChange={e => setForm(f => ({ ...f, durationWeeks: e.target.value }))} />
      </Field>
      <Field label="Total de sesiones *">
        <Input type="number" min="1" value={form.totalSessions} onChange={e => setForm(f => ({ ...f, totalSessions: e.target.value }))} />
      </Field>
      <Field label="Sesiones por semana">
        <Input type="number" min="1" value={form.sessionsPerWeek} onChange={e => setForm(f => ({ ...f, sessionsPerWeek: e.target.value }))} />
      </Field>
      <Field label="Duración por sesión (min) *">
        <Input type="number" min="15" step="15" value={form.sessionDurationMinutes} onChange={e => setForm(f => ({ ...f, sessionDurationMinutes: e.target.value }))} />
      </Field>
      <Field label="Fecha de inicio *">
        <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
      </Field>
      <Field label="Fecha de fin">
        <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
      </Field>
    </div>
  )
}

function Step3({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day) ? f.scheduleDays.filter(d => d !== day) : [...f.scheduleDays, day],
    }))
  }
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="col-span-2">
        <Field label="Días de la semana">
          <div className="flex flex-wrap gap-2 mt-1">
            {SCHEDULE_DAYS.map(d => (
              <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  form.scheduleDays.includes(d.value)
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-violet-300")}>
                {d.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Hora de inicio">
        <Input type="time" value={form.scheduleTime} onChange={e => {
          const v = e.target.value
          setForm(f => ({
            ...f,
            scheduleTime: v,
            scheduleEndTime: addMinutesToTime(v, Number(f.sessionDurationMinutes) || 60),
          }))
        }} />
      </Field>
      <Field label="Hora de fin">
        <Input type="time" value={form.scheduleEndTime} onChange={e => setForm(f => ({ ...f, scheduleEndTime: e.target.value }))} />
      </Field>
      <div className="col-span-2 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
          <input type="checkbox" id="autoGen" checked={form.autoGenerateSessions} onChange={e => setForm(f => ({ ...f, autoGenerateSessions: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor="autoGen" className="text-sm font-medium text-slate-700 cursor-pointer">
            Generar sesiones automáticamente al guardar
          </label>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
          <input type="checkbox" id="makeup" checked={form.allowMakeUp} onChange={e => setForm(f => ({ ...f, allowMakeUp: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor="makeup" className="text-sm font-medium text-slate-700 cursor-pointer">
            Permitir clases de recupero
          </label>
        </div>
      </div>
      {form.autoGenerateSessions && form.totalSessions && form.startDate && form.scheduleDays.length > 0 && (
        <div className="col-span-2 p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-800">
          ✅ Se generarán automáticamente <strong>{form.totalSessions}</strong> sesiones los días {form.scheduleDays.map(d => SCHEDULE_DAYS.find(x => x.value === d)?.label).join(", ")} a las {form.scheduleTime}, comenzando el {new Date(form.startDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}.
        </div>
      )}
    </div>
  )
}

function Step4({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Field label="Capacidad mínima">
        <Input type="number" min="0" value={form.minimumCapacity} onChange={e => setForm(f => ({ ...f, minimumCapacity: e.target.value }))} />
      </Field>
      <Field label="Capacidad máxima *">
        <Input type="number" min="1" value={form.maximumCapacity} onChange={e => setForm(f => ({ ...f, maximumCapacity: e.target.value }))} />
      </Field>
      <Field label="Fecha límite de inscripción">
        <Input type="date" value={form.enrollmentDeadline} onChange={e => setForm(f => ({ ...f, enrollmentDeadline: e.target.value }))} />
      </Field>
      <div />
      {[
        { id: "waitlist", label: "Habilitar lista de espera", key: "waitlistEnabled" as keyof WizardForm },
        { id: "approval", label: "Requiere aprobación manual", key: "requireApproval" as keyof WizardForm },
        { id: "autoClose", label: "Cerrar automáticamente al llenar", key: "autoCloseWhenFull" as keyof WizardForm },
        { id: "lateJoin", label: "Permitir inscripción tardía", key: "lateJoiningAllowed" as keyof WizardForm },
      ].map(opt => (
        <div key={opt.id} className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
          <input type="checkbox" id={opt.id} checked={form[opt.key] as boolean}
            onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor={opt.id} className="text-sm font-medium text-slate-700 cursor-pointer">{opt.label}</label>
        </div>
      ))}
    </div>
  )
}

function Step5({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Field label="Precio total *" hint="En ARS. Sin puntos ni comas.">
        <Input type="number" min="0" value={form.priceTotal} onChange={e => setForm(f => ({ ...f, priceTotal: e.target.value }))} placeholder="15000" />
      </Field>
      <Field label="Precio promocional" hint="Dejar vacío si no aplica">
        <Input type="number" min="0" value={form.promotionalPrice} onChange={e => setForm(f => ({ ...f, promotionalPrice: e.target.value }))} placeholder="12000" />
      </Field>
      <Field label="Depósito / pago inicial">
        <Input type="number" min="0" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="5000" />
      </Field>
      <Field label="Descuento early bird (%)">
        <Input type="number" min="0" max="100" value={form.earlyBirdDiscount} onChange={e => setForm(f => ({ ...f, earlyBirdDiscount: e.target.value }))} placeholder="10" />
      </Field>
      <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
        <input type="checkbox" id="installments" checked={form.installmentsEnabled} onChange={e => setForm(f => ({ ...f, installmentsEnabled: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
        <label htmlFor="installments" className="text-sm font-medium text-slate-700 cursor-pointer">Permitir pago en cuotas</label>
      </div>
      {form.installmentsEnabled && (
        <Field label="Cantidad de cuotas">
          <Input type="number" min="2" max="12" value={form.installmentCount} onChange={e => setForm(f => ({ ...f, installmentCount: e.target.value }))} />
        </Field>
      )}
      <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
        <input type="checkbox" id="refundable" checked={form.refundable} onChange={e => setForm(f => ({ ...f, refundable: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
        <label htmlFor="refundable" className="text-sm font-medium text-slate-700 cursor-pointer">Reembolsable (con condiciones)</label>
      </div>
    </div>
  )
}

function Step6({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-5">
      {[
        { key: "cancellationPolicy", label: "Política de cancelación", placeholder: "Ej: Se puede cancelar hasta 48hs antes del inicio con reembolso del 50%." },
        { key: "refundPolicy", label: "Política de reembolso", placeholder: "Ej: Reembolso total si se cancela antes del inicio del programa." },
        { key: "makeUpPolicy", label: "Política de recupero", placeholder: "Ej: Se permite 1 clase de recupero por mes, a coordinar con el coach." },
      ].map(({ key, label, placeholder }) => (
        <Field key={key} label={label}>
          <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} rows={2}
            className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 placeholder:text-slate-400" />
        </Field>
      ))}
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
        <input type="checkbox" id="transferable" checked={form.transferable} onChange={e => setForm(f => ({ ...f, transferable: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
        <label htmlFor="transferable" className="text-sm font-medium text-slate-700 cursor-pointer">Lugar transferible a otra persona</label>
      </div>
    </div>
  )
}

function Step7({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-5">
      <Field label="Imagen de portada (URL)" hint="Dejar vacío para usar el diseño por defecto">
        <Input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="https://..." />
      </Field>
      <Field label="Texto del botón CTA">
        <Input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="Inscribirme" />
      </Field>
      <Field label="Beneficios / highlights" hint="Presioná Enter o el + para agregar cada punto">
        <TagsInput value={form.benefits} onChange={v => setForm(f => ({ ...f, benefits: v }))} placeholder="Ej: Aprenderás los fundamentos del pádel" />
      </Field>
      <Field label="Qué incluye">
        <TagsInput value={form.includes} onChange={v => setForm(f => ({ ...f, includes: v }))} placeholder="Ej: Equipamiento incluido" />
      </Field>
      <Field label="Qué no incluye">
        <TagsInput value={form.excludes} onChange={v => setForm(f => ({ ...f, excludes: v }))} placeholder="Ej: Raqueta propia requerida" />
      </Field>
      <Field label="Requisitos">
        <TagsInput value={form.requirements} onChange={v => setForm(f => ({ ...f, requirements: v }))} placeholder="Ej: Nivel principiante o sin experiencia previa" />
      </Field>
      <Field label="Badges / etiquetas">
        <TagsInput value={form.tags} onChange={v => setForm(f => ({ ...f, tags: v }))} placeholder="Ej: Nuevo" presets={TAGS_PRESET} />
      </Field>
    </div>
  )
}

function Step8({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Field label="Estado">
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as CourseStatus }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Visibilidad">
        <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v as CourseVisibility }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Público</SelectItem>
            <SelectItem value="private">Privado</SelectItem>
            <SelectItem value="link_only">Solo con link</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Orden en la lista">
        <Input type="number" min="0" value={form.publicOrder} onChange={e => setForm(f => ({ ...f, publicOrder: e.target.value }))} placeholder="1" />
      </Field>
      <div />
      {[
        { id: "featured", label: "Marcar como destacado", key: "featured" as keyof WizardForm },
        { id: "autoHide", label: "Ocultar automáticamente al finalizar el programa", key: "autoHideAfterEnd" as keyof WizardForm },
      ].map(opt => (
        <div key={opt.id} className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
          <input type="checkbox" id={opt.id} checked={form[opt.key] as boolean}
            onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor={opt.id} className="text-sm font-medium text-slate-700 cursor-pointer">{opt.label}</label>
        </div>
      ))}
      {/* Summary */}
      <div className="col-span-2 p-4 rounded-xl bg-muted/40 border space-y-2 text-sm">
        <p className="font-semibold text-slate-800">Resumen del curso</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
          <span>Nombre:</span><span className="font-medium text-slate-900">{form.name || "—"}</span>
          <span>Deporte:</span><span>{form.sport}</span>
          <span>Nivel:</span><span>{COURSE_LEVEL_LABELS[form.level]}</span>
          <span>Sesiones:</span><span>{form.totalSessions} × {form.sessionDurationMinutes} min</span>
          <span>Inicio:</span><span>{form.startDate ? new Date(form.startDate + "T00:00:00").toLocaleDateString("es-AR") : "—"}</span>
          <span>Capacidad:</span><span>máx. {form.maximumCapacity} alumnos</span>
          <span>Precio:</span><span className="font-semibold">{form.priceTotal ? `$ ${Number(form.priceTotal).toLocaleString("es-AR")}` : "—"}</span>
        </div>
      </div>
    </div>
  )
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8]

function isStepValid(step: number, form: WizardForm): boolean {
  if (step === 0) return form.name.trim().length > 0 && form.sport.length > 0
  if (step === 1) return Number(form.totalSessions) > 0 && Number(form.sessionDurationMinutes) > 0 && form.startDate.length > 0
  if (step === 3) return Number(form.maximumCapacity) > 0
  if (step === 4) return Number(form.priceTotal) >= 0
  return true
}

// ── Main wizard ──────────────────────────────────────────────────────────────
export function CourseWizard({ courseId }: { courseId?: string }) {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!courseId)

  // Load existing course for edit mode
  useEffect(() => {
    if (!courseId || !resolvedId) { setLoadingEdit(false); return }
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses"))
        const data = snap.docs.find(d => d.id === courseId)?.data() as any
        if (data) {
          setForm({
            ...DEFAULT_FORM,
            ...data,
            minAge: String(data.minAge || ""),
            maxAge: String(data.maxAge || ""),
            durationWeeks: String(data.durationWeeks || ""),
            totalSessions: String(data.totalSessions || ""),
            sessionsPerWeek: String(data.sessionsPerWeek || ""),
            sessionDurationMinutes: String(data.sessionDurationMinutes || "60"),
            minimumCapacity: String(data.minimumCapacity || ""),
            maximumCapacity: String(data.maximumCapacity || ""),
            priceTotal: String(data.priceTotal || ""),
            promotionalPrice: String(data.promotionalPrice || ""),
            depositAmount: String(data.depositAmount || ""),
            installmentCount: String(data.installmentCount || "2"),
            earlyBirdDiscount: String(data.earlyBirdDiscount || ""),
            publicOrder: String(data.publicOrder || ""),
            scheduleDays: data.scheduleDays || [],
            benefits: data.benefits || [],
            includes: data.includes || [],
            excludes: data.excludes || [],
            requirements: data.requirements || [],
            tags: data.tags || [],
          })
        }
      } catch (e) { console.error(e) }
      setLoadingEdit(false)
    })()
  }, [courseId, resolvedId])

  const handleSave = useCallback(async () => {
    if (!resolvedId || saving) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payload: Omit<Course, "id"> = {
        centerId: resolvedId,
        type: form.type,
        name: form.name,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        objective: form.objective || undefined,
        sport: form.sport,
        level: form.level,
        minAge: form.minAge ? Number(form.minAge) : undefined,
        maxAge: form.maxAge ? Number(form.maxAge) : undefined,
        venueName: form.venueName || undefined,
        courtName: form.courtName || undefined,
        coachName: form.coachName || undefined,
        durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
        totalSessions: Number(form.totalSessions),
        sessionsPerWeek: form.sessionsPerWeek ? Number(form.sessionsPerWeek) : undefined,
        sessionDurationMinutes: Number(form.sessionDurationMinutes),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        scheduleDays: form.scheduleDays,
        scheduleTime: form.scheduleTime || undefined,
        scheduleEndTime: form.scheduleEndTime || undefined,
        isFlexiblePack: form.isFlexiblePack,
        allowMakeUp: form.allowMakeUp,
        minimumCapacity: form.minimumCapacity ? Number(form.minimumCapacity) : undefined,
        maximumCapacity: Number(form.maximumCapacity),
        waitlistEnabled: form.waitlistEnabled,
        enrollmentDeadline: form.enrollmentDeadline || undefined,
        requireApproval: form.requireApproval,
        autoCloseWhenFull: form.autoCloseWhenFull,
        lateJoiningAllowed: form.lateJoiningAllowed,
        priceTotal: Number(form.priceTotal),
        promotionalPrice: form.promotionalPrice ? Number(form.promotionalPrice) : undefined,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        installmentsEnabled: form.installmentsEnabled,
        installmentCount: form.installmentCount ? Number(form.installmentCount) : undefined,
        earlyBirdDiscount: form.earlyBirdDiscount ? Number(form.earlyBirdDiscount) : undefined,
        currency: form.currency,
        refundable: form.refundable,
        cancellationPolicy: form.cancellationPolicy || undefined,
        refundPolicy: form.refundPolicy || undefined,
        makeUpPolicy: form.makeUpPolicy || undefined,
        transferable: form.transferable,
        coverImage: form.coverImage || undefined,
        benefits: form.benefits.length ? form.benefits : undefined,
        includes: form.includes.length ? form.includes : undefined,
        excludes: form.excludes.length ? form.excludes : undefined,
        requirements: form.requirements.length ? form.requirements : undefined,
        tags: form.tags.length ? form.tags : undefined,
        ctaText: form.ctaText || undefined,
        status: form.status,
        visibility: form.visibility,
        featured: form.featured,
        publicOrder: form.publicOrder ? Number(form.publicOrder) : undefined,
        autoHideAfterEnd: form.autoHideAfterEnd,
        publishedAt: form.status === "published" ? now : undefined,
        enrolledCount: 0,
        waitlistCount: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        createdAt: courseId ? undefined as any : now,
        updatedAt: now,
      }

      // Firestore does not accept `undefined` values — strip them before writing
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      )

      let savedId = courseId
      if (courseId) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", courseId), cleanPayload as any)
      } else {
        const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses"), cleanPayload as any)
        savedId = ref.id
      }

      // Auto-generate sessions
      if (form.autoGenerateSessions && savedId && Number(form.totalSessions) > 0 && form.startDate) {
        const generatedSessions = generateCourseSessions(savedId, {
          name: form.name,
          totalSessions: Number(form.totalSessions),
          startDate: form.startDate,
          scheduleDays: form.scheduleDays,
          scheduleTime: form.scheduleTime,
          sessionDurationMinutes: Number(form.sessionDurationMinutes),
          coachName: form.coachName,
          isFlexiblePack: form.isFlexiblePack,
          centerId: resolvedId,
        })
        await Promise.all(generatedSessions.map(s =>
          addDoc(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courses", savedId!, "sessions"), s as any)
        ))
      }

      router.push("/clubos/dashboard/cursos/courses")
    } catch (e) {
      console.error("Error saving course", e)
    } finally {
      setSaving(false)
    }
  }, [form, resolvedId, courseId, router, saving])

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const StepComponent = STEP_COMPONENTS[step]
  const canProceed = isStepValid(step, form)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          return (
            <div key={i} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => done && setStep(i)}
                disabled={!done}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1 transition-all",
                  done ? "cursor-pointer opacity-70 hover:opacity-100" : current ? "" : "opacity-30 cursor-default"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                  done ? "bg-emerald-500" : current ? "bg-violet-600 ring-4 ring-violet-100" : "bg-slate-200"
                )}>
                  {done
                    ? <Check className="h-4 w-4 text-white" />
                    : <s.icon className={cn("h-4 w-4", current ? "text-white" : "text-slate-400")} />
                  }
                </div>
                <span className={cn("text-[10px] font-medium hidden sm:block", current ? "text-violet-700" : done ? "text-emerald-600" : "text-slate-400")}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-1 transition-all", i < step ? "bg-emerald-400" : "bg-slate-200")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step card */}
      <div className="rounded-2xl border bg-card shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Paso {step + 1}: {STEPS[step].label}</h2>
          <p className="text-sm text-slate-500">{[
            "Información básica del curso",
            "Cómo está estructurado el programa",
            "Días, horarios y generación de sesiones",
            "Cupos, lista de espera y reglas de inscripción",
            "Precio, cuotas y condiciones de pago",
            "Políticas para cancelaciones y recuperos",
            "Imágenes, beneficios y etiquetas públicas",
            "Estado de publicación y visibilidad",
          ][step]}</p>
        </div>
        <StepComponent form={form} setForm={setForm} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />Anterior
        </Button>
        <span className="text-sm text-slate-400">{step + 1} / {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed} className="gap-1.5">
            Siguiente<ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !form.name} className="gap-1.5 min-w-32">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Check className="h-4 w-4" />{courseId ? "Actualizar curso" : "Guardar curso"}</>}
          </Button>
        )}
      </div>
    </div>
  )
}
