/**
 * booking-service.ts
 *
 * Single source of truth for all booking operations.
 * The `source` field tells you which payment provider was used.
 * To add Mercado Pago later: keep createPendingBooking(), add confirmBooking()
 * call inside the MP webhook handler. No other files need to change.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "./firebaseClient"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "./firestorePaths"
import type { PlayerBookingDoc } from "./types"

// ─── Path helpers ─────────────────────────────────────────────────────────────
// Bookings live at centers/{clubId}/bookings/{docId}
// The checkout URL uses a compound ID "clubId__docId" so we can find the doc
// without storing anything in a separate top-level collection.
function bookingsCol(clubId: string) {
  return collection(db, FIRESTORE_COLLECTIONS.centers, clubId, CENTER_SUBCOLLECTIONS.bookings)
}
function bookingDocRef(clubId: string, docId: string) {
  return doc(db, FIRESTORE_COLLECTIONS.centers, clubId, CENTER_SUBCOLLECTIONS.bookings, docId)
}
export function encodeBookingId(clubId: string, docId: string) {
  return `${clubId}__${docId}`
}
export function decodeBookingId(bookingId: string): { clubId: string; docId: string } | null {
  const idx = bookingId.indexOf("__")
  if (idx === -1) return null
  return { clubId: bookingId.slice(0, idx), docId: bookingId.slice(idx + 2) }
}

// How long a pending_payment booking holds the slot before it auto-expires
export const PENDING_TTL_MINUTES = 10

// ─── Slot info used by the public availability grid ───────────────────────────
export type BookingSlotInfo = {
  courtId: string
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
  bookingStatus: "confirmed" | "pending_payment"
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createPendingBooking(params: {
  clubId: string
  clubName: string
  courtId: string
  courtName: string
  sport: string
  userId: string
  userName: string
  userEmail: string
  date: string          // "YYYY-MM-DD"
  startTime: string     // "HH:MM"
  durationMinutes: number
  price: number | null
  currency: string
}): Promise<string> {
  const startDt = new Date(`${params.date}T${params.startTime}:00`)
  const endDt = new Date(startDt.getTime() + params.durationMinutes * 60_000)
  const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60_000)

  const endTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`

  const docData: Omit<PlayerBookingDoc, "updatedAt"> = {
    clubId: params.clubId,
    clubName: params.clubName,
    courtId: params.courtId,
    courtName: params.courtName,
    sport: params.sport,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    date: params.date,
    startTime: params.startTime,
    endTime,
    durationMinutes: params.durationMinutes,
    price: params.price,
    currency: params.currency,
    bookingStatus: "pending_payment",
    paymentStatus: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    source: "test_checkout",
  }

  const ref = await addDoc(bookingsCol(params.clubId), docData)
  return encodeBookingId(params.clubId, ref.id)
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function getBookingById(
  bookingId: string,
): Promise<(PlayerBookingDoc & { id: string }) | null> {
  const decoded = decodeBookingId(bookingId)
  if (!decoded) return null
  const snap = await getDoc(bookingDocRef(decoded.clubId, decoded.docId))
  if (!snap.exists()) return null
  return { id: bookingId, ...(snap.data() as PlayerBookingDoc) }
}

// ─── State transitions ────────────────────────────────────────────────────────
export async function confirmBooking(bookingId: string): Promise<void> {
  const decoded = decodeBookingId(bookingId)
  if (!decoded) throw new Error("Invalid bookingId")
  await updateDoc(bookingDocRef(decoded.clubId, decoded.docId), {
    bookingStatus: "confirmed",
    paymentStatus: "approved",
    updatedAt: serverTimestamp(),
  })
}

export async function failBooking(bookingId: string): Promise<void> {
  const decoded = decodeBookingId(bookingId)
  if (!decoded) throw new Error("Invalid bookingId")
  await updateDoc(bookingDocRef(decoded.clubId, decoded.docId), {
    bookingStatus: "cancelled",
    paymentStatus: "failed",
    updatedAt: serverTimestamp(),
  })
}

export async function expireBooking(bookingId: string): Promise<void> {
  const decoded = decodeBookingId(bookingId)
  if (!decoded) throw new Error("Invalid bookingId")
  await updateDoc(bookingDocRef(decoded.clubId, decoded.docId), {
    bookingStatus: "expired",
    paymentStatus: "pending",
    updatedAt: serverTimestamp(),
  })
}

// ─── Slot availability query (used by the public grid) ────────────────────────
/**
 * Returns only the slots that are actively blocking availability:
 *  - confirmed bookings always block
 *  - pending_payment bookings block until expiresAt
 *  - cancelled / expired / failed bookings are ignored
 */
export async function loadActiveBookingsForDate(
  clubId: string,
  date: string,
): Promise<BookingSlotInfo[]> {
  const q = query(
    bookingsCol(clubId),
    where("date", "==", date),
  )
  const snap = await getDocs(q)
  const now = Date.now()

  const results: BookingSlotInfo[] = []

  for (const d of snap.docs) {
    const data = d.data()

    // ── Player bookings (created via booking-service) ───────────────────
    if (data.bookingStatus) {
      const pData = data as PlayerBookingDoc

      if (pData.bookingStatus === "confirmed") {
        results.push({
          courtId: pData.courtId,
          startTime: pData.startTime,
          endTime: pData.endTime,
          bookingStatus: "confirmed",
        })
        continue
      }

      if (pData.bookingStatus === "pending_payment") {
        const expiryMs: number =
          typeof pData.expiresAt?.toDate === "function"
            ? pData.expiresAt.toDate().getTime()
            : Infinity
        if (expiryMs > now) {
          results.push({
            courtId: pData.courtId,
            startTime: pData.startTime,
            endTime: pData.endTime,
            bookingStatus: "pending_payment",
          })
        }
      }
      continue
    }

    // ── Manual bookings (created by the center from the dashboard) ──────
    // They use: court, time, duration (hours), status ("confirmada"/"pendiente")
    if (data.status && data.status !== "cancelada" && data.time && data.court) {
      const startTime: string = data.time
      const durationHours: number = Number(data.duration) || 1
      const [h, m] = startTime.split(":").map(Number)
      const endTotalMin = h * 60 + (m || 0) + Math.round(durationHours * 60)
      const endTime = `${String(Math.floor(endTotalMin / 60)).padStart(2, "0")}:${String(endTotalMin % 60).padStart(2, "0")}`

      results.push({
        courtId: data.court,
        startTime,
        endTime,
        bookingStatus: data.status === "confirmada" ? "confirmed" : "pending_payment",
      })
    }
  }

  return results
}
