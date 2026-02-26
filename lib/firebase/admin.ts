import "server-only"

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

let cachedApp: ReturnType<typeof getApp> | null = null

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

  const hasDefaultApp = getApps().some((existing) => existing.name === "[DEFAULT]")

  cachedApp = hasDefaultApp
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      })

  return cachedApp
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
