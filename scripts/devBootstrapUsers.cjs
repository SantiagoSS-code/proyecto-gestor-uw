/* Dev utility: creates/updates known test users in the Firebase Auth + Firestore emulators.
   Safe to run multiple times.
*/

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099"
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080"

const admin = require("firebase-admin")

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "courtly-fc306"

if (!admin.apps.length) {
  admin.initializeApp({ projectId })
}

const auth = admin.auth()
const db = admin.firestore()
try {
  db.settings({ host: "127.0.0.1:8080", ssl: false })
} catch {}

function simpleSlugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

async function upsertUser({ email, password, role, centerName }) {
  const normalizedEmail = String(email).trim().toLowerCase()
  let user
  try {
    user = await auth.getUserByEmail(normalizedEmail)
  } catch {
    user = await auth.createUser({ email: normalizedEmail, password, emailVerified: true })
  }

  const now = new Date()

  if (role === "platform_admin") {
    await auth.setCustomUserClaims(user.uid, { platform_admin: true })
    await db.doc(`users/${user.uid}`).set(
      { role: "platform_admin", email: normalizedEmail, updatedAt: now, createdAt: now },
      { merge: true }
    )
  }

  if (role === "center_admin") {
    const name = String(centerName || normalizedEmail.split("@")[0] || "New Center")
    const slugBase = simpleSlugify(name)
    const slug = (slugBase || "club") + "-" + user.uid.slice(0, 6)

    await db.doc(`users/${user.uid}`).set(
      {
        role: "center_admin",
        legacyRole: "padel_center_admin",
        centerId: user.uid,
        email: normalizedEmail,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    )

    await db.doc(`centers/${user.uid}`).set(
      { name, email: normalizedEmail, slug, published: false, createdAt: now, updatedAt: now },
      { merge: true }
    )

    await db.doc(`padel_centers/${user.uid}`).set(
      {
        name,
        email: normalizedEmail,
        createdAt: now,
        plan: "starter",
        status: "active",
        onboardingCompleted: false,
      },
      { merge: true }
    )
  }

  return { uid: user.uid, email: normalizedEmail, role }
}

;(async () => {
  const results = []

  results.push(
    await upsertUser({
      email: "santiagonicsanchez@gmail.com",
      password: "Courtly123!",
      role: "platform_admin",
    })
  )

  results.push(
    await upsertUser({
      email: "santisanchez301@gmail.com",
      password: "Courtly123!",
      role: "center_admin",
      centerName: "Santi Test Center",
    })
  )

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, projectId, emulators: {
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
  }, results }, null, 2))
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("devBootstrapUsers failed:", e)
  process.exit(1)
})
