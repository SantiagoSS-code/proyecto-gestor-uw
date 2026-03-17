import * as admin from 'firebase-admin';

export interface PadelCenter {
  name: string;
  email: string;
  phone: string;
  street?: string;
  street_number?: string;
  province?: string;
  postalCode?: string;
  placeId?: string;
  location?: { lat: number; lng: number } | null;
  country: string;
  city: string;
  address: string;
  contacts?: {
    center?: ContactProfile;
    admin?: ContactProfile;
  };
  createdAt: admin.firestore.Timestamp | Date;
  plan: string;
  status: string;
  onboardingCompleted?: boolean;
  updatedAt?: admin.firestore.Timestamp | Date;
}

export interface User {
  role: 'padel_center_admin';
  centerId: string;
  createdAt: admin.firestore.Timestamp;
}

// Client-side version for React components
export interface PadelCenterClient {
  name: string;
  email: string;
  phone: string;
  street?: string;
  street_number?: string;
  province?: string;
  postalCode?: string;
  placeId?: string;
  location?: { lat: number; lng: number } | null;
  country: string;
  city: string;
  address: string;
  contacts?: {
    center?: ContactProfile;
    admin?: ContactProfile;
  };
  shortDescription?: string;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  amenities?: AmenityKey[];
  slug?: string;
  centerCode?: string;
  published?: boolean;
  publicationReady?: boolean;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  onboardingCompleted?: boolean;
}

export interface ContactProfile {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

export interface CenterAdmin {
  first_name: string;
  last_name: string;
  email: string;
}

// --- Firebase Clubs / Centers model (public + dashboard) ---

export type AmenityKey =
  | "bar"
  | "bathrooms"
  | "showers"
  | "gym"
  | "parking"
  | "lockers"
  | "wifi"
  | "shop"
  | "cafeteria";

export type SportKey = "padel" | "tennis" | "futbol" | "pickleball" | "squash";

export type LocationValue = { id: string; label: string }

export interface CenterLocation {
  country?: LocationValue | null
  province?: LocationValue | null
  city?: LocationValue | null
  locality?: LocationValue | null
  postalCode?: LocationValue | null
  fullAddress?: string
  lat?: number | null
  lng?: number | null
}

export interface CenterProfile {
  name: string;
  phone?: string;
  address?: string;
  street?: string;
  streetNumber?: string;
  province?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  placeId?: string;
  googlePlaceId?: string;
  location?: CenterLocation | null;
  description?: string;
  amenities?: AmenityKey[];
  sports?: SportKey[];
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  galleryImageUrls?: string[];
  slug?: string;
  centerCode?: string;
  published?: boolean;
  publicationReady?: boolean;
  classesEnabled?: boolean;
  featuredRank?: number | null;
  topSearchedRank?: number | null;
  rating?: number;
  reviewCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface CourtDoc {
  name: string;
  sport?: SportKey;
  indoor?: boolean;
  surfaceType?: string | null;
  pricePerHour?: number | null;
  currency?: string;
  published?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type OpeningHoursDay = { open: string; close: string; closed: boolean };

export interface BookingSettings {
  timezone?: string;
  slotDurationMinutes: number;
  // 0-6 (Sun-Sat)
  openingHours: Record<string, OpeningHoursDay>;
  updatedAt?: any;
}

export interface OperationSettings {
  // Reglas de turnos
  minSlotMinutes: number;       // e.g. 60
  maxSlotMinutes: number;       // e.g. 120
  slotStepMinutes: number;      // e.g. 30 (generates 60, 90, 120)
  bufferMinutes: number;        // gap between consecutive bookings
  minAdvanceHours: number;      // min anticipation to book
  maxAdvanceDays: number;       // max days in advance to book

  // Políticas de cancelación
  cancellationEnabled: boolean;
  freeCancelHours: number;      // free cancel if > N hours before start
  lateCancelFeePercent: number; // 0-100 %  
  noShowFeePercent: number;     // 0-100 %

  // Reglas por cancha/deporte (court-level overrides stored separately)
  peakHoursEnabled: boolean;
  peakHoursStart: string;       // "18:00"
  peakHoursEnd: string;         // "22:00"
  peakPriceMultiplier: number;  // e.g. 1.5
  weekendPriceMultiplier: number; // e.g. 1.25

  // Seña de reserva
  depositEnabled: boolean;
  depositPercent: number;       // 0-100
  remainingPaymentInstructions: string;

  // Feriados
  holidays: HolidayEntry[];

  updatedAt?: any;
}

export interface HolidayEntry {
  date: string;   // "YYYY-MM-DD"
  label: string;  // e.g. "Navidad"
  closed: boolean; // true = cerrado, false = horario especial
  openTime?: string;
  closeTime?: string;
}

// ─── Player-facing booking types ────────────────────────────────────────────
export type PlayerBookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired"
export type PaymentStatus = "pending" | "approved" | "failed"

export interface PlayerBookingDoc {
  clubId: string
  clubName: string
  courtId: string
  courtName: string
  sport: string
  userId: string
  userName: string
  userEmail: string
  date: string        // "YYYY-MM-DD"
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
  durationMinutes: number
  price: number | null
  currency: string
  bookingStatus: PlayerBookingStatus
  paymentStatus: PaymentStatus
  createdAt: any
  expiresAt: any
  updatedAt?: any
  source: "test_checkout" | "mercadopago"
}

// ─── Legacy center-subcollection booking ─────────────────────────────────────
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface BookingDoc {
  courtId: string;
  userId?: string | null;
  startAt: any;
  endAt: any;
  status: BookingStatus;
  createdAt?: any;
}

export type ClassScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ClassDoc {
  name: string;
  sport: SportKey;
  coachName?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  capacity: number;
  recurringSchedule: ClassScheduleSlot[];
  enabled: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// ─── Promotions module ────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed" | "special_price"
export type DiscountStatus = "draft" | "active" | "paused" | "expired"
export type AudienceType = "all" | "selected" | "segment"
export type CampaignObjective = "reactivation" | "loyalty" | "valley_hours" | "promotion"
export type CampaignStatus = "draft" | "active" | "paused" | "ended"

export interface DiscountAppliesTo {
  sports?: string[]          // [] means all
  courtIds?: string[]        // [] means all
  weekdays?: number[]        // 0=Sun … 6=Sat, [] means all
  timeFrom?: string          // "HH:MM" or undefined
  timeTo?: string            // "HH:MM" or undefined
  minBookingAmount?: number
  firstBookingOnly?: boolean
}

export interface DiscountDoc {
  id?: string
  clubId: string
  name: string
  code: string               // uppercase coupon code
  description?: string
  type: DiscountType
  value: number              // % or ARS depending on type
  appliesTo: DiscountAppliesTo
  usageLimitTotal?: number   // undefined = unlimited
  usageLimitPerUser?: number // undefined = unlimited
  usageCount?: number        // running total
  audienceType: AudienceType
  audienceSegmentId?: string // when audienceType === "segment"
  visibleInCheckout: boolean
  startAt: any               // Timestamp
  endAt?: any                // Timestamp or undefined = no expiry
  status: DiscountStatus
  createdAt?: any
  updatedAt?: any
}

export interface DiscountRedemptionDoc {
  id?: string
  discountId: string
  clubId: string
  userId: string
  bookingId: string
  originalAmount: number
  discountAmount: number
  finalAmount: number
  redeemedAt: any
}

export interface DiscountAssignmentDoc {
  id?: string
  discountId: string
  clubId: string
  userId: string
  assignedAt: any
  usedAt?: any
}

export interface CampaignDoc {
  id?: string
  clubId: string
  name: string
  objective: CampaignObjective
  discountId: string
  segmentId?: string
  startAt: any
  endAt?: any
  status: CampaignStatus
  messageTemplate?: string
  metrics?: {
    playersTargeted: number
    couponsClaimed: number
    bookingsGenerated: number
    revenueGenerated: number
  }
  createdAt?: any
  updatedAt?: any
}

export interface SegmentDoc {
  id?: string
  clubId: string
  name: string
  filters: SegmentFilters
  createdAt?: any
  updatedAt?: any
}

export interface SegmentFilters {
  inactivityDays?: number
  minBookings?: number
  favoriteSport?: string
  preferredTimeFrom?: string
  preferredTimeTo?: string
  spendingThreshold?: number
  firstTimeOnly?: boolean
}

export interface AiRecommendationDoc {
  id?: string
  clubId: string
  userId: string
  userName: string
  userEmail?: string
  reason: string
  recommendationType: "churn_risk" | "inactive" | "valley_hours" | "abandoned_checkout" | "loyal"
  suggestedDiscountId?: string
  probabilityScore: number   // 0–1
  status: "pending" | "acted" | "dismissed"
  createdAt?: any
}

/** Fields added to PlayerBookingDoc when a discount is applied (optional layer) */
export interface BookingDiscountMeta {
  discountId?: string
  couponCode?: string
  discountAmount?: number       // ARS off
  originalAmount?: number
}