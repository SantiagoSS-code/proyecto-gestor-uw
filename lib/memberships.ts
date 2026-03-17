/**
 * memberships.ts
 *
 * Data-access layer for the Memberships module.
 * All Firestore reads/writes for plans, benefits, rules,
 * subscriptions, usage and events live here.
 *
 * IMPORTANT: This is a fully optional layer on top of bookings.
 * If a player has no active membership, the booking flow is unaffected.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { MEMBERSHIPS_COLLECTIONS } from "@/lib/firestorePaths"
import type {
  MembershipBenefitDoc,
  MembershipBenefitType,
  MembershipEventDoc,
  MembershipEventType,
  MembershipPlanDoc,
  MembershipRuleDoc,
  MembershipSubscriptionDoc,
  MembershipSubscriptionStatus,
  MembershipUsageDoc,
} from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = (name: string) => collection(db, name)

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlans(clubId: string): Promise<MembershipPlanDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.plans),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipPlanDoc))
}

export async function getPlanById(id: string): Promise<MembershipPlanDoc | null> {
  const snap = await getDoc(doc(db, MEMBERSHIPS_COLLECTIONS.plans, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as MembershipPlanDoc
}

export async function createPlan(
  data: Omit<MembershipPlanDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(MEMBERSHIPS_COLLECTIONS.plans), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePlan(id: string, data: Partial<MembershipPlanDoc>): Promise<void> {
  await updateDoc(doc(db, MEMBERSHIPS_COLLECTIONS.plans, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePlan(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERSHIPS_COLLECTIONS.plans, id))
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

export async function getBenefits(clubId: string): Promise<MembershipBenefitDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.benefits),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipBenefitDoc))
}

export async function getBenefitsByPlan(planId: string): Promise<MembershipBenefitDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.benefits),
    where("planId", "==", planId),
    where("status", "==", "active"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipBenefitDoc))
}

export async function createBenefit(
  data: Omit<MembershipBenefitDoc, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(col(MEMBERSHIPS_COLLECTIONS.benefits), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateBenefit(id: string, data: Partial<MembershipBenefitDoc>): Promise<void> {
  await updateDoc(doc(db, MEMBERSHIPS_COLLECTIONS.benefits, id), data)
}

export async function deleteBenefit(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERSHIPS_COLLECTIONS.benefits, id))
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export async function getRules(clubId: string): Promise<MembershipRuleDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.rules),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipRuleDoc))
}

export async function createRule(
  data: Omit<MembershipRuleDoc, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(col(MEMBERSHIPS_COLLECTIONS.rules), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRule(id: string, data: Partial<MembershipRuleDoc>): Promise<void> {
  await updateDoc(doc(db, MEMBERSHIPS_COLLECTIONS.rules, id), data)
}

export async function deleteRule(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERSHIPS_COLLECTIONS.rules, id))
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscriptions(clubId: string): Promise<MembershipSubscriptionDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.subscriptions),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipSubscriptionDoc))
}

export async function getSubscriptionById(id: string): Promise<MembershipSubscriptionDoc | null> {
  const snap = await getDoc(doc(db, MEMBERSHIPS_COLLECTIONS.subscriptions, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as MembershipSubscriptionDoc
}

/** Find the active subscription for a player at a specific club. Used during checkout. */
export async function getActiveSubscription(
  clubId: string,
  userId: string,
): Promise<MembershipSubscriptionDoc | null> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.subscriptions),
    where("clubId", "==", clubId),
    where("userId", "==", userId),
    where("status", "in", ["active", "trial"]),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as MembershipSubscriptionDoc
}

export async function createSubscription(
  data: Omit<MembershipSubscriptionDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(MEMBERSHIPS_COLLECTIONS.subscriptions), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSubscription(
  id: string,
  data: Partial<MembershipSubscriptionDoc>,
): Promise<void> {
  await updateDoc(doc(db, MEMBERSHIPS_COLLECTIONS.subscriptions, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Change subscription status and record an event */
export async function changeSubscriptionStatus(
  id: string,
  clubId: string,
  status: MembershipSubscriptionStatus,
  eventType: MembershipEventType,
  payload?: Record<string, any>,
): Promise<void> {
  const batch = writeBatch(db)

  const subRef = doc(db, MEMBERSHIPS_COLLECTIONS.subscriptions, id)
  const patch: Record<string, any> = { status, updatedAt: serverTimestamp() }
  if (status === "canceled") patch.canceledAt = serverTimestamp()

  batch.update(subRef, patch)

  const eventRef = doc(col(MEMBERSHIPS_COLLECTIONS.events))
  batch.set(eventRef, {
    clubId,
    subscriptionId: id,
    type: eventType,
    payload: payload ?? {},
    createdAt: serverTimestamp(),
  } satisfies Omit<MembershipEventDoc, "id">)

  await batch.commit()
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export async function getUsageForMonth(
  subscriptionId: string,
  monthKey: string,
): Promise<MembershipUsageDoc | null> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.usage),
    where("subscriptionId", "==", subscriptionId),
    where("monthKey", "==", monthKey),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as MembershipUsageDoc
}

export async function getUsageByClub(clubId: string): Promise<MembershipUsageDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.usage),
    where("clubId", "==", clubId),
    orderBy("updatedAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipUsageDoc))
}

/**
 * Increment usage counters for a subscription month.
 * Creates the document if it doesn't exist yet (upsert).
 */
export async function incrementUsage(params: {
  clubId: string
  subscriptionId: string
  userId: string
  monthKey: string
  reservations?: number
  classes?: number
  discounts?: number
  savings?: number
}): Promise<void> {
  const existing = await getUsageForMonth(params.subscriptionId, params.monthKey)

  if (existing?.id) {
    await updateDoc(doc(db, MEMBERSHIPS_COLLECTIONS.usage, existing.id), {
      reservationsUsed: (existing.reservationsUsed ?? 0) + (params.reservations ?? 0),
      classesUsed: (existing.classesUsed ?? 0) + (params.classes ?? 0),
      discountsUsed: (existing.discountsUsed ?? 0) + (params.discounts ?? 0),
      savingsAmount: (existing.savingsAmount ?? 0) + (params.savings ?? 0),
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(col(MEMBERSHIPS_COLLECTIONS.usage), {
      clubId: params.clubId,
      subscriptionId: params.subscriptionId,
      userId: params.userId,
      monthKey: params.monthKey,
      reservationsUsed: params.reservations ?? 0,
      classesUsed: params.classes ?? 0,
      discountsUsed: params.discounts ?? 0,
      savingsAmount: params.savings ?? 0,
      updatedAt: serverTimestamp(),
    } satisfies Omit<MembershipUsageDoc, "id">)
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEventsBySubscription(subscriptionId: string): Promise<MembershipEventDoc[]> {
  const q = query(
    col(MEMBERSHIPS_COLLECTIONS.events),
    where("subscriptionId", "==", subscriptionId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MembershipEventDoc))
}

// ─── Checkout integration ─────────────────────────────────────────────────────

export type MembershipBenefitApplicationResult =
  | {
      applied: false
      reason: string
    }
  | {
      applied: true
      subscriptionId: string
      planId: string
      benefitId: string
      benefitType: MembershipBenefitType
      discountAmount: number
      finalAmount: number
      reservationIsIncluded: boolean   // if true the booking price is $0
    }

/**
 * Resolve the best membership benefit for a booking context.
 * Pure function — does NOT write to Firestore.
 * Call recordMembershipUsage() after payment is confirmed.
 */
export async function resolveMembershipBenefit(params: {
  clubId: string
  userId: string
  sport: string
  courtId: string
  startTime: string   // "HH:MM"
  weekday: number     // 0 = Sunday
  originalAmount: number
}): Promise<MembershipBenefitApplicationResult> {
  const noBenefit = (reason: string): MembershipBenefitApplicationResult => ({
    applied: false,
    reason,
  })

  const sub = await getActiveSubscription(params.clubId, params.userId)
  if (!sub) return noBenefit("No tiene membresía activa.")

  const plan = await getPlanById(sub.planId)
  if (!plan || plan.status !== "active") return noBenefit("El plan no está activo.")

  // Check weekday restrictions
  if (plan.validWeekdays?.length && !plan.validWeekdays.includes(params.weekday)) {
    return noBenefit("La membresía no cubre este día de la semana.")
  }

  // Check sport restrictions
  if (plan.includedSports?.length && !plan.includedSports.includes(params.sport)) {
    return noBenefit("La membresía no cubre este deporte.")
  }

  // Check court restrictions
  if (plan.includedCourtIds?.length && !plan.includedCourtIds.includes(params.courtId)) {
    return noBenefit("La membresía no cubre esta cancha.")
  }

  // Check usage quota
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const usage = await getUsageForMonth(sub.id!, monthKey)
  const reservationsUsed = usage?.reservationsUsed ?? 0

  const included = plan.includedReservationsPerMonth

  if (included != null && reservationsUsed < included) {
    // Reservation is included → free booking
    return {
      applied: true,
      subscriptionId: sub.id!,
      planId: plan.id!,
      benefitId: "included_reservation",
      benefitType: "free_reservation",
      discountAmount: params.originalAmount,
      finalAmount: 0,
      reservationIsIncluded: true,
    }
  }

  // Otherwise check explicit benefits attached to the plan
  const benefits = await getBenefitsByPlan(sub.planId)
  const applicable = benefits.filter((b) => {
    if (b.appliesTo?.sports?.length && !b.appliesTo.sports.includes(params.sport)) return false
    if (b.appliesTo?.courtIds?.length && !b.appliesTo.courtIds.includes(params.courtId)) return false
    if (b.appliesTo?.weekdays?.length && !b.appliesTo.weekdays.includes(params.weekday)) return false
    if (b.appliesTo?.timeRanges?.length) {
      const match = b.appliesTo.timeRanges.some(
        (r) => params.startTime >= r.from && params.startTime < r.to,
      )
      if (!match) return false
    }
    return true
  })

  if (!applicable.length) return noBenefit("Ningún beneficio aplica a esta reserva.")

  // Pick the best discount benefit
  let bestDiscount = 0
  let bestBenefit: MembershipBenefitDoc | null = null
  for (const b of applicable) {
    let discount = 0
    if (b.type === "discount_percentage") {
      discount = Math.round((params.originalAmount * (b.value ?? 0)) / 100)
    } else if (b.type === "fixed_discount") {
      discount = Math.min(b.value ?? 0, params.originalAmount)
    } else if (b.type === "special_price") {
      discount = Math.max(0, params.originalAmount - (b.value ?? 0))
    } else if (b.type === "free_reservation") {
      discount = params.originalAmount
    }
    if (discount > bestDiscount) {
      bestDiscount = discount
      bestBenefit = b
    }
  }

  if (!bestBenefit || bestDiscount === 0) {
    return noBenefit("Los beneficios activos no generan descuento en esta reserva.")
  }

  return {
    applied: true,
    subscriptionId: sub.id!,
    planId: plan.id!,
    benefitId: bestBenefit.id!,
    benefitType: bestBenefit.type,
    discountAmount: bestDiscount,
    finalAmount: Math.max(0, params.originalAmount - bestDiscount),
    reservationIsIncluded: bestBenefit.type === "free_reservation",
  }
}

/**
 * Record membership usage after a booking is confirmed.
 * Call this AFTER payment succeeds — mirrors recordRedemption() in promotions.
 */
export async function recordMembershipUsage(params: {
  clubId: string
  subscriptionId: string
  userId: string
  discountAmount: number
  reservationIsIncluded: boolean
}): Promise<void> {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  await incrementUsage({
    clubId: params.clubId,
    subscriptionId: params.subscriptionId,
    userId: params.userId,
    monthKey,
    reservations: params.reservationIsIncluded ? 1 : 0,
    discounts: params.discountAmount > 0 ? 1 : 0,
    savings: params.discountAmount,
  })
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Compute MRR from active subscriptions + plan prices */
export function calcMRR(
  subscriptions: MembershipSubscriptionDoc[],
  plans: MembershipPlanDoc[],
): number {
  const planMap = new Map(plans.map((p) => [p.id!, p]))
  return subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      const plan = planMap.get(s.planId)
      if (!plan) return sum
      const monthly =
        plan.billingCycle === "monthly"
          ? plan.price
          : plan.billingCycle === "quarterly"
          ? plan.price / 3
          : plan.price / 12
      return sum + monthly
    }, 0)
}
