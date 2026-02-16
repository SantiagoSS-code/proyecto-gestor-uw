import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getOrInitApp() {
  if (!getApps().length) return initializeApp(firebaseConfig)
  try {
    return getApp()
  } catch {
    return initializeApp(firebaseConfig)
  }
}

const app = getOrInitApp()
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connect to emulators only when explicitly enabled.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
const explicitEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
const shouldUseEmulators = useEmulators && (explicitEmulatorHost || isLocalhost)

if (shouldUseEmulators) {
  try {
    const rawHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost")
    const host = rawHost === "localhost" ? "127.0.0.1" : rawHost
    connectAuthEmulator(auth, `http://${host}:9099`)
    connectFirestoreEmulator(db, host, 8080)
  } catch {
    console.log("Emulators already connected")
  }
}

export default { auth, db }
// Minimal, single-definition Firebase client initializer.
// Ensures only one app instance is created and exports `auth` and `db`.

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getOrInitApp() {
  if (!getApps().length) return initializeApp(firebaseConfig)
  try {
    return getApp()
  } catch {
    return initializeApp(firebaseConfig)
  }
}

const app = getOrInitApp()
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connect to emulators only when explicitly enabled.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
const explicitEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
const shouldUseEmulators = useEmulators && (explicitEmulatorHost || isLocalhost)

if (shouldUseEmulators) {
  try {
    const rawHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost")
    const host = rawHost === "localhost" ? "127.0.0.1" : rawHost
    connectAuthEmulator(auth, `http://${host}:9099`)
    connectFirestoreEmulator(db, host, 8080)
  } catch {
    console.log("Emulators already connected")
  }
}

export default { auth, db }
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getOrInitApp() {
  if (!getApps().length) return initializeApp(firebaseConfig)
  try {
    return getApp()
  } catch {
    return initializeApp(firebaseConfig)
  }
}

const app = getOrInitApp()
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connect to emulators only when explicitly enabled.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
const explicitEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
const shouldUseEmulators = useEmulators && (explicitEmulatorHost || isLocalhost)

if (shouldUseEmulators) {
  try {
    const rawHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost")
    const host = rawHost === "localhost" ? "127.0.0.1" : rawHost
    connectAuthEmulator(auth, `http://${host}:9099`)
    connectFirestoreEmulator(db, host, 8080)
  } catch {
    console.log("Emulators already connected")
  }
}

export default { auth, db }
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function initApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig)
  } else {
    try {
      getApp()
    } catch {
      initializeApp(firebaseConfig)
    }
  }
}

initApp()

export const auth = getAuth()
export const db = getFirestore()

export default { auth, db }
import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators only when explicitly enabled.
// IMPORTANT: when viewing the app from a phone via LAN IP, "localhost" refers to the phone,
// so auto-connecting to emulators breaks login. Use USE_FIREBASE_EMULATOR=true
// (exposed as NEXT_PUBLIC_USE_FIREBASE_EMULATOR) and optionally NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=YOUR_MAC_LAN_IP.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
const explicitEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
const shouldUseEmulators = useEmulators && (explicitEmulatorHost || isLocalhost)

if (shouldUseEmulators) {
  try {
    const rawHost =
      process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ||
      (typeof window !== "undefined" ? window.location.hostname : "localhost")

    // Prefer explicit IPv4 loopback to avoid localhost/IPv6 mismatch.
    const host = rawHost === "localhost" ? "127.0.0.1" : rawHost

    connectAuthEmulator(auth, `http://${host}:9099`)
    connectFirestoreEmulator(db, host, 8080)
  } catch {
    console.log("Emulators already connected")
  }
}