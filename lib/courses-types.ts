// ─────────────────────────────────────────────────────────────────────────────
// Voyd — Structured Courses module — types & display maps
// ─────────────────────────────────────────────────────────────────────────────

export type CourseType =
  | "group"
  | "private"
  | "semi-private"
  | "intensive"
  | "pack"
  | "program"

export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "kids"
  | "competitive"

export type CourseStatus =
  | "draft"
  | "published"
  | "full"
  | "in_progress"
  | "completed"
  | "cancelled"

export type CourseVisibility = "public" | "private" | "link_only"
export type SessionStatus = "scheduled" | "completed" | "cancelled" | "rescheduled"
export type EnrollmentStatus = "pending" | "confirmed" | "waitlist" | "cancelled" | "completed"
export type PaymentStatus = "pending" | "partial" | "paid" | "overdue" | "refunded"
export type AttendanceStatus = "present" | "absent" | "absent_notified" | "makeup_pending" | "excused"
export type PaymentType = "full" | "deposit" | "installment" | "balance"

export interface Course {
  id: string
  centerId: string
  type: CourseType
  name: string
  subtitle?: string
  description?: string
  objective?: string
  sport: string
  level: CourseLevel
  category?: string
  minAge?: number
  maxAge?: number
  venueName?: string
  courtName?: string
  coachId?: string
  coachName?: string
  coachPhoto?: string
  coachBio?: string
  durationWeeks?: number
  totalSessions: number
  sessionsPerWeek?: number
  sessionDurationMinutes: number
  startDate: string
  endDate?: string
  scheduleDays?: string[]   // ["monday","wednesday"]
  scheduleTime?: string     // "18:00"
  scheduleEndTime?: string  // "19:00"
  isFlexiblePack?: boolean
  allowMakeUp?: boolean
  minimumCapacity?: number
  maximumCapacity: number
  waitlistEnabled?: boolean
  enrollmentDeadline?: string
  requireApproval?: boolean
  autoCloseWhenFull?: boolean
  lateJoiningAllowed?: boolean
  priceTotal: number
  promotionalPrice?: number
  depositAmount?: number
  installmentsEnabled?: boolean
  installmentCount?: number
  earlyBirdDiscount?: number
  currency: string
  refundable?: boolean
  cancellationPolicy?: string
  refundPolicy?: string
  makeUpPolicy?: string
  transferable?: boolean
  missedClassPolicy?: string
  coverImage?: string
  gallery?: string[]
  benefits?: string[]
  includes?: string[]
  excludes?: string[]
  requirements?: string[]
  tags?: string[]
  ctaText?: string
  status: CourseStatus
  visibility: CourseVisibility
  featured?: boolean
  publicOrder?: number
  autoPublishDate?: string
  autoHideAfterEnd?: boolean
  publishedAt?: string
  createdAt: string
  updatedAt: string
  // denormalized counters (updated by client or cloud functions)
  enrolledCount?: number
  waitlistCount?: number
  paidRevenue?: number
  pendingRevenue?: number
}

export interface CourseSession {
  id: string
  courseId: string
  courseName?: string
  date: string        // "yyyy-mm-dd"
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
  courtName?: string
  coachId?: string
  coachName?: string
  notes?: string
  status: SessionStatus
  sessionNumber?: number
  attendanceMarked?: boolean
  presentCount?: number
  absentCount?: number
  centerId?: string
}

export interface Enrollment {
  id: string
  courseId: string
  courseName?: string
  centerId?: string
  playerId?: string
  playerName: string
  playerEmail?: string
  playerPhone?: string
  playerAge?: number
  status: EnrollmentStatus
  paymentStatus: PaymentStatus
  paidAmount: number
  pendingAmount: number
  totalPrice: number
  attendanceRate?: number
  sessionsAttended?: number
  sessionsMissed?: number
  sessionsTotal?: number
  enrolledAt: string
  confirmedAt?: string
  notes?: string
}

export interface AttendanceRecord {
  id: string
  sessionId: string
  courseId: string
  centerId?: string
  enrollmentId?: string
  playerId?: string
  playerName: string
  status: AttendanceStatus
  note?: string
  markedAt?: string
}

export interface CoursePayment {
  id: string
  enrollmentId: string
  courseId: string
  centerId?: string
  playerId?: string
  playerName?: string
  courseName?: string
  amount: number
  dueDate?: string
  paidAt?: string
  paymentMethod?: string
  status: PaymentStatus
  reference?: string
  installmentNumber?: number
  type: PaymentType
  notes?: string
}

export interface CourseCoach {
  id: string
  centerId: string
  name: string
  email?: string
  phone?: string
  photo?: string
  bio?: string
  specialties?: string[]
  sports?: string[]
  activeCourses?: number
  totalStudents?: number
  rating?: number
  featured?: boolean
  visible?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Display maps
// ─────────────────────────────────────────────────────────────────────────────
export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  group: "Grupal",
  private: "Privado",
  "semi-private": "Semi-privado",
  intensive: "Intensivo",
  pack: "Pack de clases",
  program: "Programa",
}

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  kids: "Infantil",
  competitive: "Competitivo",
}

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  full: "Completo",
  in_progress: "En curso",
  completed: "Finalizado",
  cancelled: "Cancelado",
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  waitlist: "Lista de espera",
  cancelled: "Cancelado",
  completed: "Completado",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  partial: "Pago parcial",
  paid: "Pagado",
  overdue: "Vencido",
  refunded: "Reembolsado",
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
  absent_notified: "Ausente con aviso",
  makeup_pending: "Recupero pendiente",
  excused: "Justificado",
}

export const SPORTS_LIST = [
  "Pádel", "Tenis", "Squash", "Fútbol", "Pickleball",
  "Básquet", "Vóley", "Natación", "Multideporte", "Otro",
]

export const SCHEDULE_DAYS = [
  { value: "monday",    label: "Lunes" },
  { value: "tuesday",   label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday",  label: "Jueves" },
  { value: "friday",    label: "Viernes" },
  { value: "saturday",  label: "Sábado" },
  { value: "sunday",    label: "Domingo" },
]

export const DAY_LABELS: Record<string, string> = {
  monday: "Lun", tuesday: "Mar", wednesday: "Mié",
  thursday: "Jue", friday: "Vie", saturday: "Sáb", sunday: "Dom",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export function generateCourseSessions(
  courseId: string,
  form: {
    name: string
    totalSessions: number
    startDate: string
    scheduleDays?: string[]
    scheduleTime?: string
    sessionDurationMinutes: number
    coachName?: string
    isFlexiblePack?: boolean
    centerId?: string
  }
): Omit<CourseSession, "id">[] {
  const time = form.scheduleTime || "09:00"
  const endTime = addMinutesToTime(time, form.sessionDurationMinutes || 60)
  const base = {
    courseId,
    courseName: form.name,
    startTime: time,
    endTime,
    coachName: form.coachName || "",
    status: "scheduled" as SessionStatus,
    centerId: form.centerId || "",
  }

  if (form.isFlexiblePack || !form.scheduleDays?.length) {
    return Array.from({ length: form.totalSessions }, (_, i) => ({
      ...base,
      date: "",
      sessionNumber: i + 1,
    }))
  }

  const dayIndices: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  }

  const sessions: Omit<CourseSession, "id">[] = []
  const cursor = new Date(form.startDate + "T00:00:00")
  const maxDate = new Date(cursor)
  maxDate.setFullYear(maxDate.getFullYear() + 2)

  while (sessions.length < form.totalSessions && cursor <= maxDate) {
    const dayKey = Object.entries(dayIndices).find(([, idx]) => idx === cursor.getDay())?.[0]
    if (dayKey && form.scheduleDays!.includes(dayKey)) {
      sessions.push({
        ...base,
        date: cursor.toISOString().split("T")[0],
        sessionNumber: sessions.length + 1,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return sessions
}

export function formatScheduleDays(days: string[]): string {
  return days.map(d => DAY_LABELS[d] ?? d).join(" · ")
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function courseFillRate(course: Course): number {
  if (!course.maximumCapacity) return 0
  return Math.min(100, Math.round(((course.enrolledCount || 0) / course.maximumCapacity) * 100))
}
