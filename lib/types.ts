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
  galleryImageUrls?: string[];
  slug?: string;
  published?: boolean;
  classesEnabled?: boolean;
  featuredRank?: number | null;
  topSearchedRank?: number | null;
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