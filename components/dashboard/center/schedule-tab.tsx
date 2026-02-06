"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import type { BookingSettings, OpeningHoursDay } from "@/lib/types"
import { CENTER_SETTINGS_DOCS, CENTER_SUBCOLLECTIONS, FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { minutesToTime, timeToMinutes } from "@/lib/utils"

const SLOT_OPTIONS = [30, 60, 90, 120]

const WEEK_DAYS: Array<{ index: string; label: string }> = [
  { index: "1", label: "Lun" },
  { index: "2", label: "Mar" },
  { index: "3", label: "Mié" },
  { index: "4", label: "Jue" },
  { index: "5", label: "Vie" },
  { index: "6", label: "Sáb" },
  { index: "0", label: "Dom" },
]

const WEEKDAY_INDEXES = ["1", "2", "3", "4", "5"]
const WEEKEND_INDEXES = ["6", "0"]

const defaultOpeningHours: Record<string, OpeningHoursDay> = WEEK_DAYS.reduce((acc, day) => {
  acc[day.index] = { open: "07:00", close: "23:00", closed: false }
  return acc
}, {} as Record<string, OpeningHoursDay>)

export function ScheduleTab() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires")
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(60)
  const [openingHours, setOpeningHours] = useState<Record<string, OpeningHoursDay>>(defaultOpeningHours)
  const [selectedDay, setSelectedDay] = useState(WEEK_DAYS[0].index)

  const [bulkSelectedDays, setBulkSelectedDays] = useState<Set<string>>(new Set(WEEKDAY_INDEXES))
  const [bulkOpen, setBulkOpen] = useState("09:00")
  const [bulkClose, setBulkClose] = useState("23:00")
  const [bulkClosed, setBulkClosed] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const ref = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.booking)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data() as BookingSettings
          setTimezone(data.timezone || timezone)
          setSlotDurationMinutes(data.slotDurationMinutes || 60)
          setOpeningHours({ ...defaultOpeningHours, ...(data.openingHours || {}) })
        } else {
          await setDoc(
            ref,
            {
              timezone,
              slotDurationMinutes,
              openingHours: defaultOpeningHours,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }
      } catch (e) {
        console.error("Failed to load booking settings:", e)
        setMessage({ type: "error", text: "No se pudo cargar la configuración de horarios." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const updateDay = (dayIndex: string, field: keyof OpeningHoursDay, value: string | boolean) => {
    setOpeningHours((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }))
  }

  const applyToDays = (dayIndexes: string[], patch: Partial<OpeningHoursDay>) => {
    setOpeningHours((prev) => {
      const next = { ...prev }
      for (const idx of dayIndexes) {
        next[idx] = { ...(next[idx] || defaultOpeningHours[idx]), ...patch }
      }
      return next
    })
  }

  const toggleBulkDay = (dayIndex: string) => {
    setBulkSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }

  const previewSlots = useMemo(() => {
    const cfg = openingHours[selectedDay]
    if (!cfg || cfg.closed) return [] as string[]
    const start = timeToMinutes(cfg.open)
    const end = timeToMinutes(cfg.close)
    const result: string[] = []
    for (let t = start; t + slotDurationMinutes <= end; t += slotDurationMinutes) {
      result.push(minutesToTime(t))
    }
    return result
  }, [openingHours, selectedDay, slotDurationMinutes])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      const ref = doc(db, FIRESTORE_COLLECTIONS.centers, user.uid, CENTER_SUBCOLLECTIONS.settings, CENTER_SETTINGS_DOCS.booking)
      await setDoc(
        ref,
        {
          timezone,
          slotDurationMinutes,
          openingHours,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      setMessage({ type: "success", text: "Horario guardado." })
    } catch (e) {
      console.error("Failed to save schedule:", e)
      setMessage({ type: "error", text: "No se pudo guardar el horario." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-black">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando horario…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={`mb-2 ${message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">Horarios de apertura y duración de turnos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Zona horaria</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Argentina/Buenos_Aires" />
            </div>
            <div>
              <Label>Duración del turno</Label>
              <Select value={slotDurationMinutes.toString()} onValueChange={(v) => setSlotDurationMinutes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt.toString()}>
                      {opt} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => (
                <Button
                  key={d.index}
                  variant={selectedDay === d.index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(d.index)}
                  className={selectedDay === d.index ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {d.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-black">Copiar este día a:</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyToDays(Object.keys(openingHours), { ...openingHours[selectedDay] })}
              >
                Todos los días
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyToDays(WEEKDAY_INDEXES, { ...openingHours[selectedDay] })}
              >
                Días de semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyToDays(WEEKEND_INDEXES, { ...openingHours[selectedDay] })}
              >
                Fines de semana
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <Label>Apertura</Label>
                <Input type="time" value={openingHours[selectedDay]?.open} onChange={(e) => updateDay(selectedDay, "open", e.target.value)} disabled={openingHours[selectedDay]?.closed} />
              </div>
              <div>
                <Label>Cierre</Label>
                <Input type="time" value={openingHours[selectedDay]?.close} onChange={(e) => updateDay(selectedDay, "close", e.target.value)} disabled={openingHours[selectedDay]?.closed} />
              </div>
              <label className="flex items-center gap-2 text-sm text-black pb-2">
                <input type="checkbox" checked={!!openingHours[selectedDay]?.closed} onChange={(e) => updateDay(selectedDay, "closed", e.target.checked)} />
                Cerrado
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">Aplicación masiva</div>
                  <div className="text-xs text-black">Configura horarios una vez y aplícalos a varios días.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setBulkSelectedDays(new Set(Object.keys(defaultOpeningHours)))}>
                    Seleccionar todo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBulkSelectedDays(new Set(WEEKDAY_INDEXES))}>
                    Días de semana
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBulkSelectedDays(new Set(WEEKEND_INDEXES))}>
                    Fines de semana
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((d) => {
                  const active = bulkSelectedDays.has(d.index)
                  return (
                    <Button
                      key={d.index}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleBulkDay(d.index)}
                      className={active ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                      {d.label}
                    </Button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <Label>Apertura</Label>
                  <Input type="time" value={bulkOpen} onChange={(e) => setBulkOpen(e.target.value)} disabled={bulkClosed} />
                </div>
                <div>
                  <Label>Cierre</Label>
                  <Input type="time" value={bulkClose} onChange={(e) => setBulkClose(e.target.value)} disabled={bulkClosed} />
                </div>
                <label className="flex items-center gap-2 text-sm text-black pb-2">
                  <input type="checkbox" checked={bulkClosed} onChange={(e) => setBulkClosed(e.target.checked)} />
                  Cerrado
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setBulkOpen("09:00"); setBulkClose("23:00"); setBulkClosed(false) }}>
                    Preajuste 09:00–23:00
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setBulkOpen("08:00"); setBulkClose("22:00"); setBulkClosed(false) }}>
                    Preajuste 08:00–22:00
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setBulkOpen("00:00"); setBulkClose("23:59"); setBulkClosed(false) }}>
                    Preajuste 24h
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBulkClosed(true)}>
                    Preajuste cerrado
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={() => applyToDays(Array.from(bulkSelectedDays), { open: bulkOpen, close: bulkClose, closed: bulkClosed })}
                  disabled={bulkSelectedDays.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Aplicar a seleccionados
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900 mb-2">Vista previa de turnos</div>
            {openingHours[selectedDay]?.closed ? (
              <div className="text-sm text-black">Cerrado</div>
            ) : previewSlots.length ? (
              <div className="flex flex-wrap gap-2">
                {previewSlots.slice(0, 16).map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-900">
                    {t}
                  </span>
                ))}
                {previewSlots.length > 16 ? <span className="text-xs text-black self-center">+{previewSlots.length - 16} más</span> : null}
              </div>
            ) : (
              <div className="text-sm text-black">No hay turnos para este día.</div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Guardando…
                </>
              ) : (
                "Guardar horario"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
