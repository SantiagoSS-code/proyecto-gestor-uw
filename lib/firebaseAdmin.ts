import * as admin from "firebase-admin"

const isDev = process.env.NODE_ENV === "development"
const isNextBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-export"

const useEmulators = process.env.USE_FIREBASE_EMULATOR === "true"

function getProjectId() {
  return process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}

function normalizePrivateKey(raw: string) {
  const normalized = raw.trim()
  const unquoted = normalized.replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1")
  const withEscaped = unquoted
    .replace(/\\\\n/g, "\n")
    .replace(/\\\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
  return withEscaped.replace(/\r\n/g, "\n").replace(/\r/g, "")
}

const hasDefaultApp = admin.apps.some((app) => app.name === "[DEFAULT]")

if (!hasDefaultApp) {
  // Use Firebase emulators only when explicitly enabled.
  if (useEmulators) {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
    }
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
    }

    admin.initializeApp({
      projectId: getProjectId(),
    })
  } else {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    const privateKey = privateKeyRaw ? normalizePrivateKey(privateKeyRaw) : undefined

    const placeholderEmail = clientEmail?.includes("your-service-account-email")
    const placeholderKey = privateKey?.includes("your-private-key")

    const missingCreds = !projectId || !clientEmail || !privateKey || placeholderEmail || placeholderKey
    if (missingCreds) {
      if (isDev) {
        console.warn(
          "[Firebase][main] Admin SDK credentials missing/placeholder. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local."
        )
      }
      if (!isNextBuildPhase) {
        throw new Error(
          "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
        )
      }

      // Allow `next build` to succeed without credentials.
      // Runtime API routes that require Admin SDK will still fail unless credentials are provided.
      admin.initializeApp({
        projectId: getProjectId(),
      })
    } else {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          databaseURL: `https://${projectId}.firebaseio.com`,
        })
      } catch (error) {
        if (isDev) {
          console.warn(`[Firebase][main] Admin init failed: ${(error as Error)?.message || error}`)
        }
        if (!isNextBuildPhase) {
          throw error
        }

        // Avoid failing the build when env vars exist but are not valid PEM in local env.
        admin.initializeApp({
          projectId: getProjectId(),
        })
      }
    }
  }
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()

if (useEmulators) {
  try {
    const host = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080"
    adminDb.settings({ host, ssl: false })
  } catch {
    // ignore if settings already applied (e.g. hot reload)
  }
}

if (isDev) {
  const projectId = getProjectId() || "unknown"
  console.log(`[Firebase][main] projectId=${projectId} emulator=${useEmulators ? "ON" : "OFF"}`)
}