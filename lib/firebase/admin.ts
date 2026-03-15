import "server-only"

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

let cachedApp: ReturnType<typeof getApp> | null = null
const MAIN_ADMIN_APP_NAME = "main-admin"

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

function getAdminApp() {
  if (cachedApp) return cachedApp

  const existing = getApps().find((app) => app.name === MAIN_ADMIN_APP_NAME)
  if (existing) {
    cachedApp = existing
    return cachedApp
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    )
  }

  const privateKey = normalizePrivateKey(privateKeyRaw)

  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error(
      "Firebase Admin private key is invalid. Ensure FIREBASE_PRIVATE_KEY is a single line with \\n escapes."
    )
  }

  cachedApp = initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    },
    MAIN_ADMIN_APP_NAME
  )

  return cachedApp
}

function normalizeBucketName(value?: string) {
  if (!value) return ""
  return value.trim().replace(/^gs:\/\//, "").replace(/\/$/, "")
}

function alternateBucketName(value: string) {
  if (value.endsWith(".appspot.com")) {
    return value.replace(/\.appspot\.com$/, ".firebasestorage.app")
  }
  if (value.endsWith(".firebasestorage.app")) {
    return value.replace(/\.firebasestorage\.app$/, ".appspot.com")
  }
  return ""
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function getAdminStorageBucketCandidates() {
  const app = getAdminApp()
  const configuredBucket = normalizeBucketName(
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  )
  const projectId = String(app.options.projectId || "")

  return unique([
    configuredBucket,
    alternateBucketName(configuredBucket),
    projectId ? `${projectId}.firebasestorage.app` : "",
    projectId ? `${projectId}.appspot.com` : "",
  ])
}

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    const auth = getAuth(getAdminApp()) as any
    const value = auth[prop]
    return typeof value === "function" ? value.bind(auth) : value
  },
})

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    const db = getFirestore(getAdminApp()) as any
    const value = db[prop]
    return typeof value === "function" ? value.bind(db) : value
  },
})

export function getAdminStorage() {
  return getStorage(getAdminApp())
}

export async function getAdminStorageBucket() {
  const storage = getAdminStorage()
  const candidates = getAdminStorageBucketCandidates()
  return candidates[0] ? storage.bucket(candidates[0]) : storage.bucket()
}
