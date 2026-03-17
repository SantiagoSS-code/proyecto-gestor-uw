export const FIRESTORE_COLLECTIONS = {
  centers: "centers",
  legacyCenters: "padel_centers",
} as const

export const CENTER_SUBCOLLECTIONS = {
  courts: "courts",
  settings: "settings",
  bookings: "bookings",
  classes: "classes",
  availabilityRules: "availabilityRules",
  legacyAvailability: "availability",
  // Entrenadores module
  trainers: "trainers",
  classSessions: "classSessions",
  trainerSettlements: "trainerSettlements",
} as const

// ── Promotions module – top-level collections ──────────────────────────────
export const PROMOTIONS_COLLECTIONS = {
  discounts: "discounts",
  campaigns: "campaigns",
  segments: "segments",
  discountAssignments: "discount_assignments",
  discountRedemptions: "discount_redemptions",
  aiRecommendations: "ai_recommendations",
} as const

export const CENTER_SETTINGS_DOCS = {
  booking: "booking",
  operations: "operations",
} as const

export const LEGACY_AVAILABILITY_DOCS = {
  config: "config",
} as const
