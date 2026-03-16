"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  collection, getDocs, doc, addDoc, updateDoc, getDoc, setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { Trainer, WeeklyAvailability, TrainerDayKey } from "@/lib/trainers-types"
import {
  TRAINER_SPORTS, TRAINER_DAY_KEYS, TRAINER_DAY_LABELS, TRAINER_DAY_SHORT, CLASS_DURATIONS,
  SETTLEMENT_METHOD_LABELS,
} from "@/lib/trainers-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  User, Dumbbell, Clock, DollarSign, ChevronRight, ChevronLeft,
  Check, AlertCircle, Loader2, Save, ArrowLeft,
} from "lucide-react"
import Link from "next/link"

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { label: "Personal",     icon: User },
  { label: "Operativo",    icon: Dumbbell },
  { label: "Disponibilidad", icon: Clock },
  { label: "Finanzas",     icon: DollarSign },
]

// ─── Form State ───────────────────────────────────────────────────────────────

interface TrainerForm {
  firstName:     string
  lastName:      string
  email:         string
  phone:         string
  photoUrl:      string
  shortBio:      string
  specialty:     string
  sport:         string
  status:        string
  enabledCourtIds: string[]
  weeklyAvailability: WeeklyAvailability
  defaultClassDurationMinutes: string
  maxCapacityPerClass: string
  canTeachPrivate: boolean
  canTeachGroup:   boolean
  baseClassPrice:  string
  clubCommissionType:  string
  clubCommissionValue: string
  trainerPayoutType:   string
  trainerPayoutValue:  string
  settlementMethod:    string
  payoutAliasOrAccount: string
}

const DEFAULT_FORM: TrainerForm = {
  firstName: "", lastName: "", email: "", phone: "", photoUrl: "", shortBio: "",
  specialty: "", sport: "", status: "active",
  enabledCourtIds: [],
  weeklyAvailability: {},
  defaultClassDurationMinutes: "60",
  maxCapacityPerClass: "6",
  canTeachPrivate: true, canTeachGroup: true,
  baseClassPrice: "",
  clubCommissionType: "percentage", clubCommissionValue: "20",
  trainerPayoutType:  "percentage", trainerPayoutValue:  "80",
  settlementMethod: "bank_transfer", payoutAliasOrAccount: "",
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, hint, children, required,
}: {
  label: string; hint?: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Step 1 — Personal ────────────────────────────────────────────────────────

function Step1({ form, set }: { form: TrainerForm; set: (f: Partial<TrainerForm>) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre" required>
          <Input
            value={form.firstName}
            onChange={e => set({ firstName: e.target.value })}
            placeholder="Ej: Lucas"
          />
        </Field>
        <Field label="Apellido" required>
          <Input
            value={form.lastName}
            onChange={e => set({ lastName: e.target.value })}
            placeholder="Ej: García"
          />
        </Field>
      </div>
      <Field label="Email" required>
        <Input
          type="email"
          value={form.email}
          onChange={e => set({ email: e.target.value })}
          placeholder="lucas@example.com"
        />
      </Field>
      <Field label="Teléfono">
        <Input
          value={form.phone}
          onChange={e => set({ phone: e.target.value })}
          placeholder="+54 11 ..."
        />
      </Field>
      <Field label="URL de foto de perfil" hint="Enlace público a la imagen (JPG, PNG, WebP)">
        <Input
          value={form.photoUrl}
          onChange={e => set({ photoUrl: e.target.value })}
          placeholder="https://..."
        />
      </Field>
      <Field label="Deporte principal" required>
        <Select value={form.sport} onValueChange={v => set({ sport: v })}>
          <SelectTrigger><SelectValue placeholder="Seleccionar deporte" /></SelectTrigger>
          <SelectContent>
            {TRAINER_SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Especialidad / disciplina" hint="Ej: Pádel competitivo, Tenis infantil, Fitness">
        <Input
          value={form.specialty}
          onChange={e => set({ specialty: e.target.value })}
          placeholder="Ej: Pádel avanzado"
        />
      </Field>
      <Field label="Bio breve" hint="Descripción corta del perfil del entrenador">
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
          value={form.shortBio}
          onChange={e => set({ shortBio: e.target.value })}
          placeholder="Ej: Entrenador certificado con 10 años de experiencia..."
        />
      </Field>
      <Field label="Estado">
        <Select value={form.status} onValueChange={v => set({ status: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

// ─── Step 2 — Operational ─────────────────────────────────────────────────────

function Step2({
  form, set, courts,
}: {
  form: TrainerForm
  set: (f: Partial<TrainerForm>) => void
  courts: Array<{ id: string; name?: string; number?: string | number }>
}) {
  const toggleCourt = (id: string) => {
    const enabled = form.enabledCourtIds.includes(id)
    set({ enabledCourtIds: enabled
      ? form.enabledCourtIds.filter(c => c !== id)
      : [...form.enabledCourtIds, id]
    })
  }

  return (
    <div className="space-y-6">
      {/* Canchas habilitadas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Canchas habilitadas</label>
        <p className="text-xs text-slate-400">Seleccioná las canchas en las que puede dar clases</p>
        {courts.length === 0
          ? <p className="text-sm text-slate-400 py-4 text-center border rounded-md">No hay canchas registradas</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {courts.map(c => {
                const active = form.enabledCourtIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCourt(c.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left",
                      active
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/50"
                    )}
                  >
                    {c.name ?? `Cancha ${c.number}`}
                  </button>
                )
              })}
            </div>
          )
        }
      </div>

      {/* Duration + Capacity */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Duración por defecto (min)">
          <Select
            value={form.defaultClassDurationMinutes}
            onValueChange={v => set({ defaultClassDurationMinutes: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLASS_DURATIONS.map(d => (
                <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Capacidad máx. por clase">
          <Input
            type="number" min="1"
            value={form.maxCapacityPerClass}
            onChange={e => set({ maxCapacityPerClass: e.target.value })}
          />
        </Field>
      </div>

      {/* Class types */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Tipos de clase habilitados</label>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-slate-700">Clases privadas</p>
              <p className="text-xs text-slate-400">Sesiones individuales (1 alumno)</p>
            </div>
            <Switch
              checked={form.canTeachPrivate}
              onCheckedChange={v => set({ canTeachPrivate: v })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-slate-700">Clases grupales</p>
              <p className="text-xs text-slate-400">Sesiones con múltiples alumnos</p>
            </div>
            <Switch
              checked={form.canTeachGroup}
              onCheckedChange={v => set({ canTeachGroup: v })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3 — Availability ────────────────────────────────────────────────────

function Step3({ form, set }: { form: TrainerForm; set: (f: Partial<TrainerForm>) => void }) {
  const updateDay = (day: TrainerDayKey, field: "enabled" | "from" | "to", value: string | boolean) => {
    const current = form.weeklyAvailability[day] ?? { enabled: false, from: "09:00", to: "18:00" }
    set({
      weeklyAvailability: {
        ...form.weeklyAvailability,
        [day]: { ...current, [field]: value },
      },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Definí los horarios disponibles del entrenador para cada día de la semana.
      </p>
      <div className="space-y-2">
        {TRAINER_DAY_KEYS.map(day => {
          const avail = form.weeklyAvailability[day] ?? { enabled: false, from: "09:00", to: "18:00" }
          return (
            <div
              key={day}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                avail.enabled ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"
              )}
            >
              <Switch
                checked={avail.enabled}
                onCheckedChange={v => updateDay(day, "enabled", v)}
              />
              <span className={cn(
                "w-20 text-sm font-medium",
                avail.enabled ? "text-amber-800" : "text-slate-400"
              )}>
                {TRAINER_DAY_LABELS[day]}
              </span>
              {avail.enabled ? (
                <>
                  <Input
                    type="time"
                    value={avail.from}
                    onChange={e => updateDay(day, "from", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-slate-400 text-sm">a</span>
                  <Input
                    type="time"
                    value={avail.to}
                    onChange={e => updateDay(day, "to", e.target.value)}
                    className="w-32"
                  />
                </>
              ) : (
                <span className="text-xs text-slate-400">No disponible</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 4 — Finances ────────────────────────────────────────────────────────

function Step4({ form, set }: { form: TrainerForm; set: (f: Partial<TrainerForm>) => void }) {
  const basePrice = parseFloat(form.baseClassPrice) || 0

  const commissionPreview = form.clubCommissionType === "percentage"
    ? (basePrice * (parseFloat(form.clubCommissionValue) || 0)) / 100
    : parseFloat(form.clubCommissionValue) || 0

  const payoutPreview = form.trainerPayoutType === "percentage"
    ? (basePrice * (parseFloat(form.trainerPayoutValue) || 0)) / 100
    : parseFloat(form.trainerPayoutValue) || 0

  return (
    <div className="space-y-6">
      {/* Base price */}
      <Field label="Precio base por clase (ARS)" required
        hint="Precio estándar que se pre-carga al crear una clase"
      >
        <Input
          type="number" min="0" placeholder="0"
          value={form.baseClassPrice}
          onChange={e => set({ baseClassPrice: e.target.value })}
        />
      </Field>

      {/* Club commission */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Comisión del club</label>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={form.clubCommissionType}
            onValueChange={v => set({ clubCommissionType: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Porcentaje (%)</SelectItem>
              <SelectItem value="fixed">Monto fijo (ARS)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number" min="0"
            placeholder={form.clubCommissionType === "percentage" ? "20" : "1000"}
            value={form.clubCommissionValue}
            onChange={e => set({ clubCommissionValue: e.target.value })}
          />
        </div>
      </div>

      {/* Trainer payout */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Pago al entrenador</label>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={form.trainerPayoutType}
            onValueChange={v => set({ trainerPayoutType: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Porcentaje (%)</SelectItem>
              <SelectItem value="fixed">Monto fijo (ARS)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number" min="0"
            placeholder={form.trainerPayoutType === "percentage" ? "80" : "3000"}
            value={form.trainerPayoutValue}
            onChange={e => set({ trainerPayoutValue: e.target.value })}
          />
        </div>
      </div>

      {/* Preview */}
      {basePrice > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">Vista previa por clase</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <p className="text-slate-500">Precio bruto</p>
              <p className="font-bold text-slate-800 text-base mt-0.5">
                ${basePrice.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Club recibe</p>
              <p className="font-bold text-indigo-700 text-base mt-0.5">
                ${commissionPreview.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Entrenador recibe</p>
              <p className="font-bold text-emerald-700 text-base mt-0.5">
                ${payoutPreview.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settlement method */}
      <Field label="Método de pago / liquidación">
        <Select value={form.settlementMethod} onValueChange={v => set({ settlementMethod: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(SETTLEMENT_METHOD_LABELS) as [string, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Alias / CBU / cuenta de cobro" hint="Datos para procesar la liquidación">
        <Input
          placeholder="Ej: lucas.garcia.mp / 123456789"
          value={form.payoutAliasOrAccount}
          onChange={e => set({ payoutAliasOrAccount: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrainerForm({ trainerId }: { trainerId?: string }) {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""
  const router     = useRouter()

  const [step,     setStep]    = useState(0)
  const [form,     setFormRaw] = useState<TrainerForm>(DEFAULT_FORM)
  const [courts,   setCourts]  = useState<Array<{ id: string; name?: string; number?: string | number }>>([])
  const [loading,  setLoading] = useState(!!trainerId)
  const [saving,   setSaving]  = useState(false)
  const [saved,    setSaved]   = useState(false)
  const [error,    setError]   = useState("")

  const set = useCallback((patch: Partial<TrainerForm>) => {
    setFormRaw(f => ({ ...f, ...patch }))
  }, [])

  // Load courts
  useEffect(() => {
    if (!resolvedId) return
    getDocs(collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "courts"))
      .then(snap => setCourts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))))
  }, [resolvedId])

  // Load trainer in edit mode
  useEffect(() => {
    if (!trainerId || !resolvedId) return
    const load = async () => {
      const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers", trainerId))
      if (snap.exists()) {
        const data = snap.data() as Trainer
        setFormRaw({
          firstName:     data.firstName ?? "",
          lastName:      data.lastName ?? "",
          email:         data.email ?? "",
          phone:         data.phone ?? "",
          photoUrl:      data.photoUrl ?? "",
          shortBio:      data.shortBio ?? "",
          specialty:     data.specialty ?? "",
          sport:         data.sport ?? "",
          status:        data.status ?? "active",
          enabledCourtIds: data.enabledCourtIds ?? [],
          weeklyAvailability: data.weeklyAvailability ?? {},
          defaultClassDurationMinutes: String(data.defaultClassDurationMinutes ?? 60),
          maxCapacityPerClass: String(data.maxCapacityPerClass ?? 6),
          canTeachPrivate: data.canTeachPrivate ?? true,
          canTeachGroup:   data.canTeachGroup   ?? true,
          baseClassPrice:  String(data.baseClassPrice ?? ""),
          clubCommissionType:  data.clubCommissionType  ?? "percentage",
          clubCommissionValue: String(data.clubCommissionValue ?? "20"),
          trainerPayoutType:   data.trainerPayoutType   ?? "percentage",
          trainerPayoutValue:  String(data.trainerPayoutValue  ?? "80"),
          settlementMethod:    data.settlementMethod    ?? "bank_transfer",
          payoutAliasOrAccount: data.payoutAliasOrAccount ?? "",
        })
      }
      setLoading(false)
    }
    load()
  }, [trainerId, resolvedId])

  // Step validation
  const isStepValid = () => {
    if (step === 0) return form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.sport
    if (step === 3) return !!form.baseClassPrice && parseFloat(form.baseClassPrice) >= 0
    return true
  }

  const handleSave = async () => {
    if (!resolvedId) return
    setSaving(true)
    setError("")
    try {
      const now = new Date().toISOString()
      const payload: Omit<Trainer, "id"> = {
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        fullName:     `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:        form.email.trim(),
        phone:        form.phone.trim(),
        photoUrl:     form.photoUrl.trim(),
        shortBio:     form.shortBio.trim(),
        specialty:    form.specialty.trim(),
        sport:        form.sport,
        status:       form.status as Trainer["status"],
        enabledCourtIds: form.enabledCourtIds,
        weeklyAvailability: form.weeklyAvailability,
        defaultClassDurationMinutes: parseInt(form.defaultClassDurationMinutes) || 60,
        maxCapacityPerClass: parseInt(form.maxCapacityPerClass) || 6,
        canTeachPrivate: form.canTeachPrivate,
        canTeachGroup:   form.canTeachGroup,
        baseClassPrice:  parseFloat(form.baseClassPrice) || 0,
        clubCommissionType:  form.clubCommissionType  as Trainer["clubCommissionType"],
        clubCommissionValue: parseFloat(form.clubCommissionValue) || 0,
        trainerPayoutType:   form.trainerPayoutType   as Trainer["trainerPayoutType"],
        trainerPayoutValue:  parseFloat(form.trainerPayoutValue) || 0,
        settlementMethod:    form.settlementMethod as Trainer["settlementMethod"],
        payoutAliasOrAccount: form.payoutAliasOrAccount.trim(),
        clubId:    resolvedId,
        createdAt: trainerId ? "" : now,
        updatedAt: now,
      }

      if (trainerId) {
        const { createdAt, ...updates } = payload
        await updateDoc(
          doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers", trainerId),
          { ...updates, updatedAt: now },
        )
      } else {
        await addDoc(
          collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers"),
          payload,
        )
      }

      setSaved(true)
      setTimeout(() => router.push("/clubos/dashboard/trainers"), 800)
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-500 -ml-2">
        <Link href="/clubos/dashboard/trainers">
          <ArrowLeft className="h-4 w-4" />
          Volver a Entrenadores
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {trainerId ? "Editar entrenador" : "Nuevo entrenador"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {trainerId ? "Actualizá los datos del perfil y la configuración operativa." : "Completá los datos para registrar un nuevo entrenador."}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done    = i < step
          const current = i === step
          const StepIcon = s.icon
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                    done    ? "bg-amber-600 border-amber-600 text-white cursor-pointer"
                    : current ? "bg-white border-amber-600 text-amber-700"
                    : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                </button>
                <span className={cn(
                  "text-xs whitespace-nowrap hidden sm:block",
                  current ? "text-amber-700 font-medium" : done ? "text-slate-600" : "text-slate-400"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 mb-4",
                  i < step ? "bg-amber-600" : "bg-slate-200"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[step].icon
              return <StepIcon className="h-4 w-4 text-amber-600" />
            })()}
            {STEPS[step].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} courts={courts} />}
          {step === 2 && <Step3 form={form} set={set} />}
          {step === 3 && <Step4 form={form} set={set} />}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-rose-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />Anterior
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!isStepValid()}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            Siguiente<ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className={cn("gap-1.5", saved ? "bg-emerald-600" : "bg-amber-600 hover:bg-amber-700")}
          >
            {saved
              ? <><Check className="h-4 w-4" />Guardado</>
              : saving
                ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
                : <><Save className="h-4 w-4" />{trainerId ? "Guardar cambios" : "Crear entrenador"}</>
            }
          </Button>
        )}
      </div>
    </div>
  )
}
