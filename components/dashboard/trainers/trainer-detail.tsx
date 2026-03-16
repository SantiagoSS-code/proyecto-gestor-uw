"use client"

import { useEffect, useState, useMemo } from "react"
import {
  collection, getDocs, doc, getDoc, updateDoc, addDoc, orderBy, query,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { useAuth } from "@/lib/auth-context"
import { formatCurrencyARS, cn } from "@/lib/utils"
import type { Trainer, ClassSession } from "@/lib/trainers-types"
import {
  TRAINER_STATUS_LABELS, CLASS_STATUS_LABELS, CLASS_TYPE_LABELS,
  TRAINER_DAY_LABELS, TRAINER_DAY_KEYS,
  classStatusColor, classTypeBadgeColor, trainerInitials,
  calcClubCommission, calcTrainerPayout, isoDateStr,
} from "@/lib/trainers-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  Dumbbell, Users, Calendar, DollarSign, Pencil, Plus, Phone,
  Mail, Clock, ArrowLeft, Activity, TrendingUp, CheckCircle2,
  XCircle, Loader2, Star, ChevronRight, AlertCircle,
} from "lucide-react"

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{String(value)}</span>
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, accent = false,
}: {
  label: string; value: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <Card className={cn(
      "border-none shadow-sm text-center",
      accent ? "bg-gradient-to-br from-amber-50 to-orange-100/60" : "bg-slate-50"
    )}>
      <CardContent className="pt-5 pb-4">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2",
          accent ? "bg-amber-200/60" : "bg-slate-200/60"
        )}>
          <Icon className={cn("h-4 w-4", accent ? "text-amber-700" : "text-slate-500")} />
        </div>
        <p className={cn("text-2xl font-bold", accent ? "text-amber-700" : "text-slate-900")}>{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrainerDetail({ trainerId }: { trainerId: string }) {
  const { user, centerId } = useAuth()
  const resolvedId = centerId || user?.uid || ""

  const [trainer,  setTrainer]  = useState<Trainer | null>(null)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading,  setLoading]  = useState(true)

  const today = isoDateStr(new Date())
  const monthStart = today.slice(0, 7) + "-01"

  useEffect(() => {
    if (!resolvedId || !trainerId) return
    const load = async () => {
      try {
        const [trSnap, sesSnap] = await Promise.all([
          getDoc(doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "trainers", trainerId)),
          getDocs(query(
            collection(db, FIRESTORE_COLLECTIONS.centers, resolvedId, "classSessions"),
          )),
        ])
        if (trSnap.exists()) setTrainer({ id: trSnap.id, ...trSnap.data() } as Trainer)
        const all = sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession))
        setSessions(all.filter(s => s.trainerId === trainerId))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resolvedId, trainerId])

  // Stats
  const stats = useMemo(() => {
    if (!trainer) return null
    const completed   = sessions.filter(s => s.status === "completed")
    const upcoming    = sessions
      .filter(s => s.date >= today && s.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date))
    const thisMonth   = sessions.filter(s => s.date >= monthStart && s.status === "completed")
    const totalRev    = completed.reduce((acc, s) => acc + (s.price || 0), 0)
    const monthRev    = thisMonth.reduce((acc, s) => acc + (s.price || 0), 0)
    const allStudents = new Set(sessions.flatMap(s => s.customerNames ?? []))

    return { completed, upcoming, thisMonth, totalRev, monthRev, allStudents }
  }, [trainer, sessions, today, monthStart])

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }
  if (!trainer) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-slate-400">
        <AlertCircle className="h-10 w-10" />
        <p>Entrenador no encontrado</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/clubos/dashboard/trainers">Volver</Link>
        </Button>
      </div>
    )
  }

  const initials = trainerInitials(trainer)

  return (
    <div className="space-y-6">

      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-500 -ml-2">
        <Link href="/clubos/dashboard/trainers">
          <ArrowLeft className="h-4 w-4" />Entrenadores
        </Link>
      </Button>

      {/* Profile header */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
        <CardContent className="-mt-10 pb-6">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div className="flex items-end gap-4">
              {trainer.photoUrl ? (
                <img
                  src={trainer.photoUrl}
                  alt={trainer.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-100 border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-amber-700">
                  {initials}
                </div>
              )}
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{trainer.fullName}</h2>
                  <Badge className={cn("text-xs border",
                    trainer.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    {TRAINER_STATUS_LABELS[trainer.status]}
                  </Badge>
                </div>
                <p className="text-slate-500 text-sm">{trainer.sport} {trainer.specialty && `· ${trainer.specialty}`}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/clubos/dashboard/trainers/${trainerId}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />Editar
                </Link>
              </Button>
              <Button
                asChild size="sm"
                className="gap-1.5 bg-amber-600 hover:bg-amber-700"
              >
                <Link href={`/clubos/dashboard/trainers/classes?trainer=${trainerId}`}>
                  <Plus className="h-3.5 w-3.5" />Nueva clase
                </Link>
              </Button>
            </div>
          </div>

          {/* Bio */}
          {trainer.shortBio && (
            <p className="text-sm text-slate-600 mt-4 max-w-xl">{trainer.shortBio}</p>
          )}

          {/* Contact */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {trainer.email && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Mail className="h-3.5 w-3.5" />{trainer.email}
              </div>
            )}
            {trainer.phone && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Phone className="h-3.5 w-3.5" />{trainer.phone}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Clases completadas" value={String(stats?.completed.length ?? 0)} icon={CheckCircle2} />
        <StatCard label="Próximas clases"    value={String(stats?.upcoming.length ?? 0)} icon={Calendar} />
        <StatCard label="Alumnos únicos"     value={String(stats?.allStudents.size ?? 0)} icon={Users} />
        <StatCard label="Ingresos este mes"  value={formatCurrencyARS(stats?.monthRev ?? 0)} icon={DollarSign} accent />
      </div>

      {/* Body grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left column: Profile info */}
        <div className="space-y-4">

          {/* Operational info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-amber-600" />Configuración operativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Duración por defecto" value={`${trainer.defaultClassDurationMinutes} min`} />
              <InfoRow label="Capacidad máx. por clase" value={trainer.maxCapacityPerClass} />
              <InfoRow label="Clases privadas" value={trainer.canTeachPrivate ? "✅ Sí" : "❌ No"} />
              <InfoRow label="Clases grupales" value={trainer.canTeachGroup ? "✅ Sí" : "❌ No"} />
            </CardContent>
          </Card>

          {/* Financial info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-600" />Configuración financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Precio base" value={formatCurrencyARS(trainer.baseClassPrice)} />
              <InfoRow
                label="Comisión club"
                value={trainer.clubCommissionType === "percentage"
                  ? `${trainer.clubCommissionValue}%`
                  : formatCurrencyARS(trainer.clubCommissionValue)
                }
              />
              <InfoRow
                label="Pago entrenador"
                value={trainer.trainerPayoutType === "percentage"
                  ? `${trainer.trainerPayoutValue}%`
                  : formatCurrencyARS(trainer.trainerPayoutValue)
                }
              />
              <InfoRow label="Método de liquidación" value={trainer.settlementMethod} />
              {trainer.payoutAliasOrAccount && (
                <InfoRow label="Cuenta/alias" value={trainer.payoutAliasOrAccount} />
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />Disponibilidad semanal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {TRAINER_DAY_KEYS.map(day => {
                const avail = trainer.weeklyAvailability?.[day]
                return (
                  <div key={day} className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-500">{TRAINER_DAY_LABELS[day]}</span>
                    {avail?.enabled
                      ? <span className="text-xs font-medium text-slate-700">{avail.from} – {avail.to}</span>
                      : <span className="text-xs text-slate-300">—</span>
                    }
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right column: classes */}
        <div className="lg:col-span-2 space-y-4">

          {/* Upcoming classes */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />Próximas clases
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-amber-700">
                <Link href={`/clubos/dashboard/trainers/schedule?trainer=${trainerId}`}>
                  Ver agenda <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {(stats?.upcoming.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sin clases programadas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Hora</TableHead>
                      <TableHead className="text-xs">Cancha</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.upcoming.slice(0, 8) ?? []).map(s => (
                      <TableRow key={s.id} className="text-sm">
                        <TableCell className="font-medium">{s.date}</TableCell>
                        <TableCell className="text-slate-500">{s.startTime} – {s.endTime}</TableCell>
                        <TableCell>{s.courtName ?? s.courtId}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs border", classTypeBadgeColor(s.classType))}>
                            {CLASS_TYPE_LABELS[s.classType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs border", classStatusColor(s.status))}>
                            {CLASS_STATUS_LABELS[s.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Completed history */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-600" />Historial de clases
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(stats?.completed.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sin clases completadas aún</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Hora</TableHead>
                      <TableHead className="text-xs">Cancha</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Precio</TableHead>
                      <TableHead className="text-xs">Pago entrenador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.completed
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 10) ?? []).map(s => (
                      <TableRow key={s.id} className="text-sm">
                        <TableCell className="font-medium">{s.date}</TableCell>
                        <TableCell className="text-slate-500">{s.startTime}</TableCell>
                        <TableCell>{s.courtName ?? s.courtId}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs border", classTypeBadgeColor(s.classType))}>
                            {CLASS_TYPE_LABELS[s.classType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrencyARS(s.price)}</TableCell>
                        <TableCell className="text-emerald-700 font-medium">
                          {formatCurrencyARS(calcTrainerPayout(s.price, trainer))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Students */}
          {(stats?.allStudents.size ?? 0) > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />Alumnos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...(stats?.allStudents ?? [])].map(name => (
                    <Badge key={name} variant="outline" className="text-xs text-slate-600">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
