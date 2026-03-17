/**
 * promotions.ts
 *
 * Data-access layer for the Promotions module.
 * All Firestore reads/writes for discounts, campaigns, segments,
 * redemptions and AI recommendations live here.
 *
 * IMPORTANT: This module is an optional layer on top of bookings.
 * If no promotion is applied, booking behaviour is unchanged.
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
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { PROMOTIONS_COLLECTIONS } from "@/lib/firestorePaths"
import type {
  AiRecommendationDoc,
  CampaignDoc,
  DiscountAppliesTo,
  DiscountDoc,
  DiscountRedemptionDoc,
  DiscountType,
  SegmentDoc,
} from "@/lib/types"

// ─── Collection references ────────────────────────────────────────────────────

const col = (name: string) => collection(db, name)

// ─── Discounts ────────────────────────────────────────────────────────────────

export async function getDiscounts(clubId: string): Promise<DiscountDoc[]> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.discounts),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiscountDoc))
}

export async function getDiscountById(id: string): Promise<DiscountDoc | null> {
  const snap = await getDoc(doc(db, PROMOTIONS_COLLECTIONS.discounts, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as DiscountDoc
}

/** Lookup a coupon by its code + clubId – used during checkout validation */
export async function getDiscountByCode(
  clubId: string,
  code: string,
): Promise<DiscountDoc | null> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.discounts),
    where("clubId", "==", clubId),
    where("code", "==", code.toUpperCase().trim()),
    where("status", "==", "active"),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as DiscountDoc
}

export async function createDiscount(
  data: Omit<DiscountDoc, "id" | "createdAt" | "updatedAt" | "usageCount">,
): Promise<string> {
  const ref = await addDoc(col(PROMOTIONS_COLLECTIONS.discounts), {
    ...data,
    code: data.code.toUpperCase().trim(),
    usageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateDiscount(
  id: string,
  data: Partial<DiscountDoc>,
): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COLLECTIONS.discounts, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDiscount(id: string): Promise<void> {
  await deleteDoc(doc(db, PROMOTIONS_COLLECTIONS.discounts, id))
}

// ─── Coupon validation ────────────────────────────────────────────────────────

export interface CouponValidationResult {
  valid: boolean
  discount: DiscountDoc | null
  error?: string
  discountAmount: number
  finalAmount: number
}

/**
 * Validate a coupon code for a given booking context and compute the discount.
 * Does NOT write anything to Firestore – call recordRedemption() after payment.
 */
export async function validateCoupon(params: {
  clubId: string
  code: string
  userId: string
  sport: string
  courtId: string
  startTime: string     // "HH:MM"
  weekday: number       // 0 = Sunday
  originalAmount: number
}): Promise<CouponValidationResult> {
  const none = (error: string) => ({
    valid: false,
    discount: null,
    error,
    discountAmount: 0,
    finalAmount: params.originalAmount,
  })

  const discount = await getDiscountByCode(params.clubId, params.code)
  if (!discount) return none("Cupón no válido o no está activo.")

  // --- Expiry ---
  const now = new Date()
  if (discount.startAt) {
    const startDate: Date =
      typeof discount.startAt.toDate === "function"
        ? discount.startAt.toDate()
        : new Date(discount.startAt)
    if (startDate > now) return none("Este cupón aún no está vigente.")
  }
  if (discount.endAt) {
    const endDate: Date =
      typeof discount.endAt.toDate === "function"
        ? discount.endAt.toDate()
        : new Date(discount.endAt)
    if (endDate < now) return none("Este cupón ya expiró.")
  }

  // --- Usage limits ---
  if (
    discount.usageLimitTotal != null &&
    (discount.usageCount ?? 0) >= discount.usageLimitTotal
  ) {
    return none("Este cupón ya alcanzó su límite de usos.")
  }

  if (discount.usageLimitPerUser != null) {
    const q = query(
      col(PROMOTIONS_COLLECTIONS.discountRedemptions),
      where("discountId", "==", discount.id),
      where("userId", "==", params.userId),
    )
    const used = (await getDocs(q)).size
    if (used >= discount.usageLimitPerUser) {
      return none("Ya usaste este cupón el máximo de veces permitido.")
    }
  }

  // --- AppliesTo rules ---
  const rules = discount.appliesTo ?? {}

  if (rules.sports?.length && !rules.sports.includes(params.sport)) {
    return none("Este cupón no aplica al deporte seleccionado.")
  }
  if (rules.courtIds?.length && !rules.courtIds.includes(params.courtId)) {
    return none("Este cupón no aplica a la cancha seleccionada.")
  }
  if (rules.weekdays?.length && !rules.weekdays.includes(params.weekday)) {
    return none("Este cupón no aplica al día de la semana seleccionado.")
  }
  if (rules.timeFrom && params.startTime < rules.timeFrom) {
    return none("Este cupón no aplica al horario seleccionado.")
  }
  if (rules.timeTo && params.startTime >= rules.timeTo) {
    return none("Este cupón no aplica al horario seleccionado.")
  }
  if (
    rules.minBookingAmount != null &&
    params.originalAmount < rules.minBookingAmount
  ) {
    return none(
      `El monto mínimo para este cupón es $${rules.minBookingAmount.toLocaleString("es-AR")}.`,
    )
  }

  // --- Compute discount ---
  let discountAmount = 0
  switch (discount.type) {
    case "percentage":
      discountAmount = Math.round((params.originalAmount * discount.value) / 100)
      break
    case "fixed":
      discountAmount = Math.min(discount.value, params.originalAmount)
      break
    case "special_price":
      discountAmount = Math.max(0, params.originalAmount - discount.value)
      break
  }

  const finalAmount = Math.max(0, params.originalAmount - discountAmount)

  return {
    valid: true,
    discount,
    discountAmount,
    finalAmount,
  }
}

/**
 * Record a successful redemption (call AFTER payment is confirmed).
 * Increments usageCount on the discount atomically via a batch write.
 */
export async function recordRedemption(params: {
  discountId: string
  clubId: string
  userId: string
  bookingId: string
  originalAmount: number
  discountAmount: number
  finalAmount: number
}): Promise<void> {
  const batch = writeBatch(db)

  // 1. Redemption record
  const redRef = doc(col(PROMOTIONS_COLLECTIONS.discountRedemptions))
  batch.set(redRef, {
    ...params,
    redeemedAt: serverTimestamp(),
  } satisfies Omit<DiscountRedemptionDoc, "id">)

  // 2. Increment usage counter on discount
  const discRef = doc(db, PROMOTIONS_COLLECTIONS.discounts, params.discountId)
  const snap = await getDoc(discRef)
  if (snap.exists()) {
    const current = (snap.data().usageCount as number) ?? 0
    batch.update(discRef, { usageCount: current + 1, updatedAt: serverTimestamp() })
  }

  await batch.commit()
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(clubId: string): Promise<CampaignDoc[]> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.campaigns),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CampaignDoc))
}

export async function createCampaign(
  data: Omit<CampaignDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(PROMOTIONS_COLLECTIONS.campaigns), {
    ...data,
    metrics: { playersTargeted: 0, couponsClaimed: 0, bookingsGenerated: 0, revenueGenerated: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCampaign(
  id: string,
  data: Partial<CampaignDoc>,
): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COLLECTIONS.campaigns, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, PROMOTIONS_COLLECTIONS.campaigns, id))
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export async function getSegments(clubId: string): Promise<SegmentDoc[]> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.segments),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SegmentDoc))
}

export async function createSegment(
  data: Omit<SegmentDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(PROMOTIONS_COLLECTIONS.segments), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSegment(
  id: string,
  data: Partial<SegmentDoc>,
): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COLLECTIONS.segments, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteSegment(id: string): Promise<void> {
  await deleteDoc(doc(db, PROMOTIONS_COLLECTIONS.segments, id))
}

// ─── Redemptions (read-only for analytics) ────────────────────────────────────

export async function getRedemptions(clubId: string): Promise<DiscountRedemptionDoc[]> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.discountRedemptions),
    where("clubId", "==", clubId),
    orderBy("redeemedAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiscountRedemptionDoc))
}

// ─── AI Recommendations (heuristics) ─────────────────────────────────────────

export async function getAiRecommendations(
  clubId: string,
): Promise<AiRecommendationDoc[]> {
  const q = query(
    col(PROMOTIONS_COLLECTIONS.aiRecommendations),
    where("clubId", "==", clubId),
    where("status", "==", "pending"),
    orderBy("probabilityScore", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AiRecommendationDoc))
}

export async function dismissRecommendation(id: string): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COLLECTIONS.aiRecommendations, id), {
    status: "dismissed",
  })
}

export async function actOnRecommendation(id: string): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COLLECTIONS.aiRecommendations, id), {
    status: "acted",
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcDiscountAmount(
  type: DiscountType,
  value: number,
  originalAmount: number,
): number {
  switch (type) {
    case "percentage":
      return Math.round((originalAmount * value) / 100)
    case "fixed":
      return Math.min(value, originalAmount)
    case "special_price":
      return Math.max(0, originalAmount - value)
    default:
      return 0
  }
}

export function formatDiscountLabel(type: DiscountType, value: number): string {
  if (type === "percentage") return `${value}% off`
  if (type === "fixed") return `-$${value.toLocaleString("es-AR")}`
  return `Precio especial $${value.toLocaleString("es-AR")}`
}
