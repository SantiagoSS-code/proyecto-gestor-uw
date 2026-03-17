/**
 * Player Retention Analytics — pure calculation engine.
 *
 * Derives every metric from an already-loaded bookings array
 * (the same one ReportsContent already fetches).
 * No extra Firestore reads are performed here.
 *
 * IMPORTANT: This file does NOT modify booking logic or checkout.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingRecord {
  id: string
  userId?: string
  customerEmail?: string
  email?: string
  phone?: string
  customer?: string
  customerName?: string
  date?: string | { toDate: () => Date }
  dateKey?: string | { toDate: () => Date }
  time?: string
  status?: string
  sport?: string
  courtSport?: string
  courtId?: string
  courtName?: string
  court?: string
  [key: string]: any
}

export interface PlayerStats {
  userId: string
  displayName: string
  firstBookingAt: Date
  lastBookingAt: Date
  bookingsCount: number
  daysSinceLastBooking: number
  status: "active" | "at_risk" | "churned"
}

export interface MonthlyRetentionPoint {
  /** e.g. "2026-01" */
  month: string
  /** Label e.g. "Ene 2026" */
  label: string
  totalPlayers: number
  returnedNextMonth: number
  retentionPct: number
}

export interface NewVsReturningPoint {
  month: string
  label: string
  newPlayers: number
  returningPlayers: number
}

export interface BookingDistBucket {
  range: string
  count: number
}

export interface RetentionMetrics {
  retention7d: number
  retention30d: number
  /** Average of per-month retention rates */
  monthlyRetentionAvg: number
  churnPlayers: number
  churnRate: number
  avgBookingFrequency: number
  totalPlayers: number
  newPlayers: number
  returningPlayers: number
  monthlyRetentionCurve: MonthlyRetentionPoint[]
  newVsReturning: NewVsReturningPoint[]
  bookingDistribution: BookingDistBucket[]
  playerTable: PlayerStats[]
}

/** Placeholder structure for future drill-downs — NOT computed yet. */
export interface RetentionPlaceholders {
  retentionBySport: null
  retentionByCourt: null
  retentionByWeekday: null
  retentionByMembershipPlan: null
  retentionByAcquisitionChannel: null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDate(b: BookingRecord): Date | null {
  const raw: any = b.date || b.dateKey
  if (!raw) return null
  if (typeof raw?.toDate === "function") return raw.toDate()
  if (raw instanceof Date) return raw
  const s = String(raw)
  if (s.includes("T")) { const d = new Date(s); return isNaN(d.getTime()) ? null : d }
  const d = new Date(`${s}T${String(b.time || "00:00")}:00`)
  return isNaN(d.getTime()) ? null : d
}

function normStatus(b: BookingRecord): "confirmed" | "cancelled" | "pending" {
  const s = String(b.status || "").toLowerCase()
  if (s === "confirmada" || s === "confirmed") return "confirmed"
  if (s === "cancelada" || s === "cancelled") return "cancelled"
  return "pending"
}

function playerKey(b: BookingRecord): string {
  return String(b.userId || b.customerEmail || b.email || b.phone || b.customer || "").trim().toLowerCase()
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_LABELS[m - 1]} ${y}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000)
}

function addDaysToDate(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

// ─── Core calculation ─────────────────────────────────────────────────────────

export function computeRetentionMetrics(allBookings: BookingRecord[], now: Date = new Date()): RetentionMetrics {
  // Filter out cancelled bookings and those without a player key
  const bookings = allBookings.filter(b => normStatus(b) !== "cancelled" && playerKey(b))

  // ── Build per-player profile ─────────────────────────────────────────────
  const playerMap = new Map<string, {
    key: string
    displayName: string
    dates: Date[]
  }>()

  for (const b of bookings) {
    const k = playerKey(b)
    const dt = extractDate(b)
    if (!dt) continue
    const entry = playerMap.get(k) || {
      key: k,
      displayName: String(b.customerName || b.customer || k),
      dates: [],
    }
    entry.dates.push(dt)
    playerMap.set(k, entry)
  }

  // Sort each player's dates ascending
  for (const entry of playerMap.values()) {
    entry.dates.sort((a, b) => a.getTime() - b.getTime())
  }

  const players = Array.from(playerMap.values())
  const totalPlayers = players.length

  // ── 1. Retention 7d & 30d ────────────────────────────────────────────────
  // Definition: among ALL players, how many made a 2nd booking within N days of their first.
  let retain7 = 0
  let retain30 = 0

  for (const p of players) {
    if (p.dates.length < 2) continue
    const first = p.dates[0]
    const second = p.dates[1]
    const gap = daysBetween(first, second)
    if (gap <= 7) retain7++
    if (gap <= 30) retain30++
  }

  const retention7d = totalPlayers > 0 ? (retain7 / totalPlayers) * 100 : 0
  const retention30d = totalPlayers > 0 ? (retain30 / totalPlayers) * 100 : 0

  // ── 2. Monthly retention curve ───────────────────────────────────────────
  // For each month: players who booked in that month AND also in the next month.
  const playerMonths = new Map<string, Set<string>>() // monthKey → set of playerKeys

  for (const p of players) {
    for (const dt of p.dates) {
      const mk = monthKey(dt)
      if (!playerMonths.has(mk)) playerMonths.set(mk, new Set())
      playerMonths.get(mk)!.add(p.key)
    }
  }

  const sortedMonths = Array.from(playerMonths.keys()).sort()
  const monthlyRetentionCurve: MonthlyRetentionPoint[] = []

  for (let i = 0; i < sortedMonths.length - 1; i++) {
    const curMonth = sortedMonths[i]
    const nextMonth = sortedMonths[i + 1]
    // Check they are truly consecutive months
    const [cy, cm] = curMonth.split("-").map(Number)
    const expectedNext = cm === 12
      ? `${cy + 1}-01`
      : `${cy}-${String(cm + 1).padStart(2, "0")}`

    if (nextMonth !== expectedNext) continue // Gap month, skip

    const curPlayers = playerMonths.get(curMonth)!
    const nextPlayers = playerMonths.get(nextMonth)!
    const returned = Array.from(curPlayers).filter(k => nextPlayers.has(k)).length
    const total = curPlayers.size

    monthlyRetentionCurve.push({
      month: curMonth,
      label: monthLabel(curMonth),
      totalPlayers: total,
      returnedNextMonth: returned,
      retentionPct: total > 0 ? (returned / total) * 100 : 0,
    })
  }

  const monthlyRetentionAvg = monthlyRetentionCurve.length > 0
    ? monthlyRetentionCurve.reduce((s, m) => s + m.retentionPct, 0) / monthlyRetentionCurve.length
    : 0

  // ── 3. New vs Returning per month ────────────────────────────────────────
  const firstBookingMonth = new Map<string, string>() // playerKey → first monthKey
  for (const p of players) {
    if (p.dates.length > 0) {
      firstBookingMonth.set(p.key, monthKey(p.dates[0]))
    }
  }

  const newVsReturning: NewVsReturningPoint[] = sortedMonths.map(mk => {
    const playersInMonth = playerMonths.get(mk)!
    let newCount = 0
    let retCount = 0
    for (const pk of playersInMonth) {
      if (firstBookingMonth.get(pk) === mk) newCount++
      else retCount++
    }
    return { month: mk, label: monthLabel(mk), newPlayers: newCount, returningPlayers: retCount }
  })

  // Current period new vs returning totals
  const newPlayers = players.filter(p => {
    const first = p.dates[0]
    return first && daysBetween(first, now) <= 30
  }).length
  const returningPlayers = totalPlayers - newPlayers

  // ── 4. Churn (no booking in last 60 days) ───────────────────────────────
  const churnThreshold = addDaysToDate(now, -60)
  const churnPlayers = players.filter(p => {
    const last = p.dates[p.dates.length - 1]
    return last && last < churnThreshold
  }).length
  const churnRate = totalPlayers > 0 ? (churnPlayers / totalPlayers) * 100 : 0

  // ── 5. Average booking frequency ─────────────────────────────────────────
  const totalBookingsCount = bookings.length
  const avgBookingFrequency = totalPlayers > 0 ? totalBookingsCount / totalPlayers : 0

  // ── 6. Booking distribution histogram ────────────────────────────────────
  const countBuckets: Record<string, number> = { "1": 0, "2–3": 0, "4–6": 0, "7–10": 0, "11+": 0 }
  for (const p of players) {
    const c = p.dates.length
    if (c === 1) countBuckets["1"]++
    else if (c <= 3) countBuckets["2–3"]++
    else if (c <= 6) countBuckets["4–6"]++
    else if (c <= 10) countBuckets["7–10"]++
    else countBuckets["11+"]++
  }
  const bookingDistribution: BookingDistBucket[] = Object.entries(countBuckets).map(([range, count]) => ({ range, count }))

  // ── 7. Player table ──────────────────────────────────────────────────────
  const playerTable: PlayerStats[] = players.map(p => {
    const first = p.dates[0]
    const last = p.dates[p.dates.length - 1]
    const daysSinceLast = daysBetween(last, now)
    let status: PlayerStats["status"] = "active"
    if (daysSinceLast > 60) status = "churned"
    else if (daysSinceLast > 30) status = "at_risk"

    return {
      userId: p.key,
      displayName: p.displayName,
      firstBookingAt: first,
      lastBookingAt: last,
      bookingsCount: p.dates.length,
      daysSinceLastBooking: daysSinceLast,
      status,
    }
  }).sort((a, b) => b.bookingsCount - a.bookingsCount)

  return {
    retention7d,
    retention30d,
    monthlyRetentionAvg,
    churnPlayers,
    churnRate,
    avgBookingFrequency,
    totalPlayers,
    newPlayers,
    returningPlayers,
    monthlyRetentionCurve,
    newVsReturning,
    bookingDistribution,
    playerTable,
  }
}

/** Placeholder — future drill-downs. Not computed yet. */
export function getRetentionPlaceholders(): RetentionPlaceholders {
  return {
    retentionBySport: null,
    retentionByCourt: null,
    retentionByWeekday: null,
    retentionByMembershipPlan: null,
    retentionByAcquisitionChannel: null,
  }
}
