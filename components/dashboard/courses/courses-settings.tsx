"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Loader2, Settings } from "lucide-react"

interface CourseSettings {
  defaultSessionDurationMinutes: number
  defaultMaxCapacity: number
  defaultCurrency: string
  defaultEnrollmentMode: "open" | "manual" | "approval"
  defaultWaitlistEnabled: boolean
  defaultRefundable: boolean
  defaultCancellationPolicy: string
  defaultMakeUpPolicy: string
  allowOnlineEnrollment: boolean
  onlineEnrollmentUrl: string
  sendConfirmationEmail: boolean
  sendReminderEmail: boolean
  reminderHoursBefore: number
  showCoursesOnPublicPage: boolean
  moduleEnabled: boolean
}

const DEFAULTS: CourseSettings = {
  defaultSessionDurationMinutes: 60,
  defaultMaxCapacity: 12,
  defaultCurrency: "ARS",
  defaultEnrollmentMode: "manual",
  defaultWaitlistEnabled: true,
  defaultRefundable: false,
  defaultCancellationPolicy: "",
  defaultMakeUpPolicy: "",
  allowOnlineEnrollment: false,
  onlineEnrollmentUrl: "",
  sendConfirmationEmail: false,
  sendReminderEmail: false,
  reminderHoursBefore: 24,
  showCoursesOnPublicPage: true,
  moduleEnabled: true,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function CoursesSettings() {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || null
  const [settings, setSettings] = useState<CourseSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!resolvedId) return
    ;(async () => {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "config", "courses"))
        if (snap.exists()) setSettings({ ...DEFAULTS, ...snap.data() })
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [resolvedId])

  const handleSave = async () => {
    if (!resolvedId) return
    setSaving(true)
    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "config", "courses"), {
        ...settings, updatedAt: new Date().toISOString(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-violet-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configuración del módulo</h2>
          <p className="text-sm text-slate-500">Valores por defecto y opciones del sistema de cursos</p>
        </div>
      </div>

      {/* Module toggle */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Estado del módulo</h3>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <input type="checkbox" id="moduleEnabled" checked={settings.moduleEnabled}
            onChange={e => setSettings(s => ({ ...s, moduleEnabled: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <div>
            <label htmlFor="moduleEnabled" className="text-sm font-medium text-slate-700 cursor-pointer">Módulo de Cursos habilitado</label>
            <p className="text-xs text-slate-400">Si lo deshabilitás, el menú y las páginas quedarán ocultos.</p>
          </div>
        </div>
      </div>

      {/* Defaults */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Valores por defecto</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duración de sesión (min)">
            <Input type="number" min="15" step="15" value={settings.defaultSessionDurationMinutes}
              onChange={e => setSettings(s => ({ ...s, defaultSessionDurationMinutes: Number(e.target.value) }))} className="h-9 text-sm" />
          </Field>
          <Field label="Capacidad máxima">
            <Input type="number" min="1" value={settings.defaultMaxCapacity}
              onChange={e => setSettings(s => ({ ...s, defaultMaxCapacity: Number(e.target.value) }))} className="h-9 text-sm" />
          </Field>
          <Field label="Moneda">
            <Select value={settings.defaultCurrency} onValueChange={v => setSettings(s => ({ ...s, defaultCurrency: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ARS", "USD", "EUR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Modo de inscripción">
            <Select value={settings.defaultEnrollmentMode} onValueChange={v => setSettings(s => ({ ...s, defaultEnrollmentMode: v as any }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abierto (automático)</SelectItem>
                <SelectItem value="manual">Manual (el admin confirma)</SelectItem>
                <SelectItem value="approval">Con aprobación previa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {[
          { id: "waitlist", label: "Habilitar lista de espera por defecto", key: "defaultWaitlistEnabled" as const },
          { id: "refundable", label: "Pagos reembolsables por defecto", key: "defaultRefundable" as const },
        ].map(opt => (
          <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <input type="checkbox" id={opt.id} checked={settings[opt.key]}
              onChange={e => setSettings(s => ({ ...s, [opt.key]: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
            <label htmlFor={opt.id} className="text-sm font-medium text-slate-700 cursor-pointer">{opt.label}</label>
          </div>
        ))}
        <Field label="Política de cancelación por defecto">
          <textarea value={settings.defaultCancellationPolicy}
            onChange={e => setSettings(s => ({ ...s, defaultCancellationPolicy: e.target.value }))}
            rows={2} className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Ej: Se puede cancelar hasta 72hs antes del inicio con reembolso del 80%." />
        </Field>
        <Field label="Política de recupero por defecto">
          <textarea value={settings.defaultMakeUpPolicy}
            onChange={e => setSettings(s => ({ ...s, defaultMakeUpPolicy: e.target.value }))}
            rows={2} className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Ej: Se permite 1 recupero por mes coordinado con el coach." />
        </Field>
      </div>

      {/* Online enrollment */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Inscripción online</h3>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <input type="checkbox" id="onlineEnroll" checked={settings.allowOnlineEnrollment}
            onChange={e => setSettings(s => ({ ...s, allowOnlineEnrollment: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor="onlineEnroll" className="text-sm font-medium text-slate-700 cursor-pointer">Permitir inscripción online por los alumnos</label>
        </div>
        {settings.allowOnlineEnrollment && (
          <Field label="URL pública de inscripción" hint="Link donde los alumnos pueden ver y anotarse a los cursos">
            <Input value={settings.onlineEnrollmentUrl}
              onChange={e => setSettings(s => ({ ...s, onlineEnrollmentUrl: e.target.value }))}
              placeholder="https://tusitio.com/cursos" className="h-9 text-sm" />
          </Field>
        )}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <input type="checkbox" id="publicPage" checked={settings.showCoursesOnPublicPage}
            onChange={e => setSettings(s => ({ ...s, showCoursesOnPublicPage: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
          <label htmlFor="publicPage" className="text-sm font-medium text-slate-700 cursor-pointer">Mostrar cursos en página pública del club</label>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Notificaciones</h3>
        <p className="text-xs text-slate-400">Próximamente disponibles con integración de email.</p>
        {[
          { id: "confirmEmail", label: "Enviar email de confirmación al inscribirse", key: "sendConfirmationEmail" as const },
          { id: "reminderEmail", label: "Enviar recordatorio antes de la sesión", key: "sendReminderEmail" as const },
        ].map(opt => (
          <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 opacity-60">
            <input type="checkbox" id={opt.id} checked={settings[opt.key]} disabled
              onChange={e => setSettings(s => ({ ...s, [opt.key]: e.target.checked }))} className="h-4 w-4 accent-violet-600" />
            <label htmlFor={opt.id} className="text-sm font-medium text-slate-700">{opt.label}</label>
          </div>
        ))}
        {settings.sendReminderEmail && (
          <Field label="Horas antes del recordatorio">
            <Input type="number" min="1" max="72" value={settings.reminderHoursBefore}
              onChange={e => setSettings(s => ({ ...s, reminderHoursBefore: Number(e.target.value) }))} className="h-9 text-sm w-28" />
          </Field>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-36 gap-2">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> :
            saved ? <><Check className="h-4 w-4" />Guardado</> :
              "Guardar configuración"}
        </Button>
      </div>
    </div>
  )
}
