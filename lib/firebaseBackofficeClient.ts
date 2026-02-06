import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
const emulatorProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

const firebaseBackofficeConfig = {
  apiKey: process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_AUTH_DOMAIN,
  projectId: useEmulators && emulatorProjectId ? emulatorProjectId : process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_BACKOFFICE_FIREBASE_APP_ID,
}

const BACKOFFICE_APP_NAME = "backoffice"

const existingApp = getApps().find((app) => app.name === BACKOFFICE_APP_NAME)
const app = existingApp ?? initializeApp(firebaseBackofficeConfig, BACKOFFICE_APP_NAME)

export const authBackoffice = getAuth(app)
export const dbBackoffice = getFirestore(app)

if (useEmulators) {
  try {
    const rawHost =
      process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ||
      (typeof window !== "undefined" ? window.location.hostname : "localhost")

    const host = rawHost === "localhost" ? "127.0.0.1" : rawHost

    connectAuthEmulator(authBackoffice, `http://${host}:9099`)
    connectFirestoreEmulator(dbBackoffice, host, 8080)
  } catch {
    console.log("Backoffice emulators already connected")
  }
}
