// ─────────────────────────────────────────────────────────────────────────────
// Voyd — Entrenadores module — types & display maps
// ─────────────────────────────────────────────────────────────────────────────

export type TrainerStatus    = "active" | "inactive"
export type ClassType        = "private" | "group"
export type ClassStatus      = "scheduled" | "confirmed" | "cancelled" | "completed"
export type CommissionType   = "percentage" | "fixed"
export type SettlementStatus = "pending" | "paid"
export type SettlementMethod = "bank_transfer" | "cash" | "mercadopago" | "other"

export const TRAINER_DAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const
export type TrainerDayKey = typeof TRAINER_DAY_KEYS[number]

export const TRAINER_DAY_LABELS: Record<TrainerDayKey, string> = {
  monday:    "Lunes",
  tuesday:   "Martes",
  wednesday: "Miércoles",
  thursday:  "Jueves",
  friday:    "Viernes",
  saturday:  "Sábado",
  sunday:    "Domingo",
}

export const TRAINER_DAY_SHORT: Record<TrainerDayKey, string> = {
  monday:    "Lun",
  tuesday:   "Mar",
  wednesday: "Mié",
  thursday:  "Jue",
  friday:    "Vie",
  saturday:  "Sáb",
  sunday:    "Dom",
}

export interface DayAvailability {
  enabled: boolean
  from: string   // "HH:mm"
  to:   string   // "HH:mm"
}

export type WeeklyAvailability = Partial<Record<TrainerDayKey, DayAvailability>>

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Trainer {
  id: string
  // Personal
  firstName: string
  lastName:  string
  fullName:  string
  email:     string
  phone?:    string
  photoUrl?: string
  shortBio?: string
  specialty?: string
  sport:     string
  status:    TrainerStatus
  // Operational
  enabledCourtIds:              string[]
  weeklyAvailability:           WeeklyAvailability
  defaultClassDurationMinutes:  number
  maxCapacityPerClass:          number
  canTeachPrivate:              boolean
  canTeachGroup:                boolean
  // Financial
  baseClassPrice:          number
  clubCommissionType:      CommissionType
  clubCommissionValue:     number
  trainerPayoutType:       CommissionType
  trainerPayoutValue:      number
  settlementMethod?:       SettlementMethod
  payoutAliasOrAccount?:   string
  // Metadata
  clubId:     string
  createdAt:  string
  updatedAt:  string
}

export interface ClassSession {
  id:            string
  clubId:        string
  trainerId:     string
  trainerName?:  string
  courtId:       string
  courtName?:    string
  date:          string   // ISO yyyy-mm-dd
  startTime:     string   // "HH:mm"
  endTime:       string   // "HH:mm"
  durationMinutes: number
  classType:     ClassType
  maxCapacity:   number
  status:        ClassStatus
  price:         number
  notes?:        string
  customerIds:   string[]
  customerNames?: string[]
  reservationBlockId?: string
  createdAt:     string
  updatedAt:     string
}

export interface TrainerSettlement {
  id:                   string
  clubId:               string
  trainerId:            string
  trainerName?:         string
  periodStart:          string
  periodEnd:            string
  grossRevenue:         number
  clubCommissionAmount: number
  trainerNetAmount:     number
  sessionsCount:        number
  status:               SettlementStatus
  paidAt?:              string
  notes?:               string
  createdAt:            string
  updatedAt:            string
}

// ─── Display maps ─────────────────────────────────────────────────────────────

export const TRAINER_STATUS_LABELS: Record<TrainerStatus, string> = {
  active:   "Activo",
  inactive: "Inactivo",
}

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  private: "Privada",
  group:   "Grupal",
}

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
}

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: "Pendiente",
  paid:    "Pagada",
}

export const SETTLEMENT_METHOD_LABELS: Record<SettlementMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash:          "Efectivo",
  mercadopago:   "MercadoPago",
  other:         "Otro",
}

export const TRAINER_SPORTS: string[] = [
  "Pádel", "Tenis", "Fútbol", "Básquet", "Volleyball",
  "Golf", "Squash", "Pickleball", "Natación", "Atletismo",
  "Multideporte", "Otro",
]

export const CLASS_DURATIONS: number[] = [30, 45, 60, 75, 90, 120]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function trainerInitials(t: Pick<Trainer, "firstName" | "lastName">): string {
  return `${t.firstName?.[0] ?? ""}${t.lastName?.[0] ?? ""}`.toUpperCase()
}

export function calcClubCommission(
  price: number,
  t: Pick<Trainer, "clubCommissionType" | "clubCommissionValue">,
): number {
  if (t.clubCommissionType === "percentage") {
    return Math.round((price * t.clubCommissionValue) / 100 * 100) / 100
  }
  return t.clubCommissionValue
}

export function calcTrainerPayout(
  price: number,
  t: Pick<Trainer, "trainerPayoutType" | "trainerPayoutValue">,
): number {
  if (t.trainerPayoutType === "percentage") {
    return Math.round((price * t.trainerPayoutValue) / 100 * 100) / 100
  }
  return t.trainerPayoutValue
}

export function addMinutesToTimeStr(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const total  = h * 60 + m + minutes
  const nh     = Math.floor(total / 60) % 24
  const nm     = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

export function isoDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function classStatusColor(s: ClassStatus): string {
  const map: Record<ClassStatus, string> = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    completed: "bg-slate-50 text-slate-500 border-slate-200",
  }
  return map[s]
}

export function classTypeBadgeColor(t: ClassType): string {
  return t === "private"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-indigo-50 text-indigo-700 border-indigo-200"
}

/** Returns the Monday of the week containing `d` */
export function weekStart(d: Date): Date {
  const day = d.getDay() // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Returns 7 ISO date strings for the week starting at `monday` */
export function weekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return isoDateStr(d)
  })
}
