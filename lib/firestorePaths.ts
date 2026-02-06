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
} as const

export const CENTER_SETTINGS_DOCS = {
  booking: "booking",
} as const

export const LEGACY_AVAILABILITY_DOCS = {
  config: "config",
} as const
