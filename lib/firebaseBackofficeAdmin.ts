import * as admin from "firebase-admin"

const BACKOFFICE_APP_NAME = "backoffice-admin"
const isDev = process.env.NODE_ENV === "development"
const isNextBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-export"

const useEmulators = process.env.USE_FIREBASE_EMULATOR === "true"

let cachedApp: admin.app.App | null = null
let emulatorConfigured = false

function getProjectId() {
  if (useEmulators) {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID
  }
  return process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_PROJECT_ID
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

function getBackofficeAdminApp() {
  if (cachedApp) return cachedApp

  const existing = admin.apps.find((app) => app.name === BACKOFFICE_APP_NAME)
  if (existing) {
    cachedApp = existing
    return cachedApp
  }

  if (useEmulators) {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
    }
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
    }

    admin.initializeApp(
      {
        projectId: getProjectId(),
      },
      BACKOFFICE_APP_NAME
    )
    cachedApp = admin.app(BACKOFFICE_APP_NAME)
    return cachedApp
  }

  const projectId = process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.BACKOFFICE_FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKeyRaw = process.env.BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    if (!isNextBuildPhase) {
      throw new Error(
        "Backoffice Firebase Admin is not configured. Set BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID, BACKOFFICE_FIREBASE_ADMIN_CLIENT_EMAIL, and BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY."
      )
    }

    admin.initializeApp(
      {
        projectId: getProjectId(),
      },
      BACKOFFICE_APP_NAME
    )
    cachedApp = admin.app(BACKOFFICE_APP_NAME)
    return cachedApp
  }

  const privateKey = normalizePrivateKey(privateKeyRaw)
  const invalidKey = !privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")
  if (invalidKey) {
    if (!isNextBuildPhase) {
      throw new Error(
        "Backoffice Firebase Admin private key is invalid. Ensure BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY is a single line with \\n escapes."
      )
    }

    admin.initializeApp(
      {
        projectId: getProjectId(),
      },
      BACKOFFICE_APP_NAME
    )
    cachedApp = admin.app(BACKOFFICE_APP_NAME)
    return cachedApp
  }

  try {
    admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`,
      },
      BACKOFFICE_APP_NAME
    )
    cachedApp = admin.app(BACKOFFICE_APP_NAME)
    return cachedApp
  } catch (error) {
    if (isDev) {
      console.warn(`[Firebase][backoffice] Admin init failed: ${(error as Error)?.message || error}`)
    }
    if (!isNextBuildPhase) {
      throw error
    }

    admin.initializeApp(
      {
        projectId: getProjectId(),
      },
      BACKOFFICE_APP_NAME
    )
    cachedApp = admin.app(BACKOFFICE_APP_NAME)
    return cachedApp
  }
}

export const backofficeAdminAuth = new Proxy({} as ReturnType<admin.app.App["auth"]>, {
  get(_target, prop) {
    const auth = getBackofficeAdminApp().auth() as any
    const value = auth[prop]
    return typeof value === "function" ? value.bind(auth) : value
  },
})

export const backofficeAdminDb = new Proxy({} as ReturnType<admin.app.App["firestore"]>, {
  get(_target, prop) {
    const db = getBackofficeAdminApp().firestore() as any
    if (useEmulators && !emulatorConfigured) {
      try {
        const host = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080"
        db.settings({ host, ssl: false })
      } catch {
        // ignore if settings already applied
      }
      emulatorConfigured = true
    }
    const value = db[prop]
    return typeof value === "function" ? value.bind(db) : value
  },
})

if (isDev) {
  const projectId = getProjectId() || "unknown"
  console.log(`[Firebase][backoffice] projectId=${projectId} emulator=${useEmulators ? "ON" : "OFF"}`)
}
